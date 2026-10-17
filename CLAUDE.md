# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@PROJECT.md

---

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check

npx prisma db push           # Apply schema.prisma to the DB (there is no prisma/migrations folder)
npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma studio            # Open DB browser UI
```

No test suite exists in this project.

---

## Next.js Version Warning

This project uses **Next.js 16** (App Router). APIs, conventions, and file structure may differ from training data. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.

---

## Auth Pattern

- **Server components / API routes**: call `auth()` from `@/auth` directly — it reads the session from headers with no extra config.
- **Client components**: use `useSession()` from `next-auth/react` (wrapped by `SessionWrapper` in layout).
- Auth is Google OAuth only. There is no email/password login.

---

## Non-obvious Architecture

### Data flow: verse text
Verse text (with nikud/ta'amim) is fetched live from **Sefaria.org** at request time via `fetchChapter()` in `lib/tanakh.ts`. The `VerseText` table in SQLite stores a pre-processed plain-text copy for **search** — the two sources must stay in sync. Sefaria results are cached with `next: { revalidate: 86400 }` (24h).

### Milestone cascade
When a verse is toggled read, `POST /api/tanakh` checks verse → chapter → book → section → full Tanakh completion in sequence. The response includes flags (`chapterJustCompleted`, `bookJustCompleted`, etc.) that the client uses to trigger confetti and sound. `getCompletionEvents()` in `app/api/tanakh/route.ts` owns this logic.

### Stats sidebar without prop drilling
Progress updates dispatch a custom DOM event `tanakh-stats-update` on `window`. The Sidebar listens for it and refetches `/api/tanakh/stats`. Do not replace this with context — the Sidebar is rendered in the root layout outside the page tree.

### Sidebar layout
The root `body` is viewport-height with `overflow-hidden`, so the Sidebar can't grow past the screen. Its `nav` is the only scrolling part (`flex-1 min-h-0 overflow-y-auto`), while the title and the sign-in/out footer are `shrink-0`. Keep it that way when adding `NAV_ITEMS`: with 14 items the list already exceeds a laptop screen, and without the nav scroll the footer, including the "התחבר" link, gets clipped off-screen.

### Root search BFS
`GET /api/verses/root` resolves a Hebrew root to a Strong's number, then does a BFS through `StrongsEntry.derivedFrom` (comma-separated Strong's numbers) to build a family tree. "Direct" view shows only the queried root's verses; "etymological" view includes all descendants.

### Book IDs
Book IDs are English (`"Genesis"`, `"I Samuel"`, etc.) — they must match Sefaria's reference format exactly. The canonical list is `TANAKH_BOOKS` in `lib/tanakh.ts`. Never use Hebrew names as database keys.

### Seeding
The DB must be seeded before search features work. Use `/admin/seed` (UI) or `POST /api/admin/seed-oshb` + `POST /api/admin/seed-strongs`. Seeding is split into Torah/Nevi'im/Ketuvim sections for resumability and to avoid request timeouts.

OSHB word elements can contain markup such as `<seg type="x-large">ע</seg>` (enlarged letters). The seeder strips all tags from a word before deriving `text`/`plainText` — otherwise the tag's inner space splits the word (e.g. "שמ ע" in Deut 6:4) and phrase searches miss the verse.

### Special letters: two sources, one markup
Large/small/suspended letters and inverted nuns come from Sefaria's markup (`<big>`, `<small>`, bare `<sup>`, `<span class="mam-spi-invnun">`), in two places:
- **Reader (live):** `fetchChapterWithMarks()` in `lib/tanakh.ts` replaces those tags with private-use sentinel characters before `stripHtml()`, then walks the stripped text to compute `{ verse, start, end, kind }` offsets. `fetchChapter()` is a thin wrapper that drops the marks. `<small>` around a paseq (׀) and tags inside Yemenite-variant footnotes are not counted.
- **`/special-letters` page (static):** `lib/special-letters.json` is a one-time snapshot built by scanning all 39 books via Sefaria API v3 with the same rules. If the rules change, regenerate it so the two stay consistent.

### Leitwords: OSHB words matched onto Sefaria text
`lib/leitwords.ts` scores each chapter's content words (nouns/verbs/adjectives, no proper names) against Tanakh-wide frequency with log-likelihood (G²), merging a word into its single `derivedFrom` parent when both appear in the chapter.

### WordEntry parsing and in-memory caches (`lib/wordStats.ts`)
`lemma` and `morph` are parallel `/`-separated chains (prefixes + main word), e.g. `c/7200` ↔ `HC/Vqw3ms`. The segment of `lemma` that starts with a digit is the Strong's number, and the `morph` segment at the same index (after the leading language letter `H`/`A`) describes that word: part of speech, then for verbs binyan, tense, person, gender, number (`Vqw3ms`). `parseWord()` does this; use it rather than re-parsing.

Tanakh-wide counts per Strong's number (`getCorpusCounts()`, one `GROUP BY lemma, morph` query) and the grammar quiz's verb pool (`lib/grammarQuiz.ts`) are cached in module-level promises for the life of the server process. They only change on re-seed, so restart the server after seeding.

### Grammar quiz: word position via VerseText
The quiz shows the verse from `VerseText.text` (not Sefaria) because its words are exactly the OSHB words joined by single spaces, so `text.split(" ")[wordNum - 1]` is the asked word (verified on 400 random verses). Keep that invariant in the seeder. The quiz has no LLM: answers come straight from `morph`/`StrongsEntry`. Difficulty = root frequency bands plus, for root questions, how similar the same-length distractor roots look.

There is no word-level mapping between the reader's Sefaria text and OSHB's words, so highlighting is done by form: the API returns each verse's unpointed surface forms (`WordEntry.plain`), and `findWordRanges()` in `app/components/VerseText.tsx` matches them against the verse's words split on spaces and maqaf, with nikud stripped. Measured at 99.7% of occurrences found; the misses are mostly ketiv/qere. `VerseText` renders special letters and highlights together by cutting the text at every boundary of either.

### Verse notes are always on favorites
`VerseNote` is keyed by `(userId, book, chapter, verse)`, not by `FavoriteVerse.id`, but the API maintains the invariant that every verse with notes is a favorite: `POST /api/notes` upserts the `FavoriteVerse` in the same transaction, and unfavoriting via `POST /api/favorites/verse` deletes the verse's notes. The client confirms with the user before unfavoriting a verse that has notes. Because of this, `/favorites` is the single place that lists all of a user's notes. The reader gets a chapter's notes from `GET /api/tanakh` (`notes`), and `/favorites` gets them per verse from `GET /api/favorites`. Both pages render the shared `app/components/VerseNotes.tsx` panel.

### Commentaries: license-gated third-party text
`GET /api/commentaries` shows only commentators on the fixed `COMMENTATORS` list (`lib/commentaries.ts`), and only when the Sefaria Hebrew edition's license is in `ALLOWED_LICENSES` (Public Domain, CC0, CC-BY, CC-BY-SA). The check runs on every fetch. Anything else, including Sefaria's `"unknown"`, comes back as `status: "unavailable"` with a Sefaria link and no text. Sefaria also hosts copyrighted modern commentaries (Steinsaltz, Kehot, …), so do not widen the list or the license set without checking. Commentary HTML is sanitized server-side to `b/strong/i/em/br` with no attributes before the client renders it with `dangerouslySetInnerHTML`.

### Community sharing: identity and lifecycle
- **Identity:** shared content exposes only `User.displayName`, chosen on the first share or comment. Until it is set, `POST /api/shares` and `POST /api/shares/[id]/comments` answer 409 `needDisplayName`. Build author objects with `toAuthor()` in `lib/shares.ts`, never from `user.name`/`email`/`image`. The UI also shows an initial-letter avatar instead of the Google photo.
- **Lifecycle:** a `Share` of type `"note"` points at a `VerseNote` (`noteId`, unique, cascade). The feed always renders the note's current text, flagged "נערך" when `note.updatedAt` is after `share.createdAt`. Deleting the note, including via unfavoriting, deletes the share with its likes and comments.
- **Comments:** comments form a tree via `parentId` with no depth limit. The API returns them flat, and `app/community/CommentThread.tsx` builds the tree, indenting up to 4 levels. Deleting a comment that has replies soft-deletes it (`deleted = true`, text cleared). Deleting a leaf removes it and walks up, removing soft-deleted ancestors left without replies.
- **Permissions:** checked server-side via `getViewer()`. Admins are the emails listed in `ADMIN_EMAILS`.

### Route handler params
Dynamic route handlers (e.g. `app/api/notes/[id]/route.ts`) receive `params` as a **Promise** in Next.js 16, so they must `await ctx.params`. They type the context explicitly (`{ params: Promise<{ id: string }> }`) rather than with the generated `RouteContext<...>` helper, which only type-checks after `next dev`/`next build` has generated route types.
