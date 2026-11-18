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
The root `body` is viewport-height with `overflow-hidden`, so the Sidebar can't grow past the screen. Its `nav` is the only scrolling part (`flex-1 min-h-0 overflow-y-auto`), while the title and the sign-in/out footer are `shrink-0`. The sidebar has 8 links in three groups (`NAV_GROUPS` in `app/components/nav.ts`): reading/search/"גלה", personal and community, experiences. The study tools are not in the sidebar: they are cards on `/discover`, grouped by topic in `app/discover/tools.tsx` (`TOOL_GROUPS`, also used by the home page), and "גלה" is active on any of their pages. Add a new study page there, not to the sidebar. There is no "ראשי" item: the site title links home. Keep the nav scroll anyway, so the footer with the "התחבר" link is never clipped on short screens.

### Page titles
Every page's title is `app/components/PageHeader.tsx`: the title and a thin gold rule across the page. Study tools also get a category line, "גלה · <group>", from the URL via `pageCategory()` in `nav.ts`, so a new tool gets it for free once it is in `TOOL_GROUPS`. Sidebar pages have none (the sidebar already marks them). `/neshama` keeps its own emotion-themed title.

### Home hero animation
`app/components/ScrollIntro.tsx` is CSS-only animation driven by one class on its root (`pending` = closed scroll before hydration, `play`, `done`); the base CSS rules are the end state, so reduced motion only has to switch animations off. Whether to play is decided once per page load (`sessionStorage` + a module variable), so returning to `/` in the same session shows the open scroll. The rising letters are golden copies placed over measured letters of the text (`[data-rise]`); the Torah text itself is never altered.

### Root search BFS
`GET /api/verses/root` resolves a Hebrew root to a Strong's number, then does a BFS through `StrongsEntry.derivedFrom` (comma-separated Strong's numbers) to build a family tree. "Direct" view shows only the queried root's verses; "etymological" view includes all descendants.

### Book IDs
Book IDs are English (`"Genesis"`, `"I Samuel"`, etc.) — they must match Sefaria's reference format exactly. The canonical list is `TANAKH_BOOKS` in `lib/tanakh.ts`. Never use Hebrew names as database keys.

### Seeding
The DB must be seeded before search features work. Use `/admin/seed` (UI) or `POST /api/admin/seed-oshb` + `POST /api/admin/seed-strongs`. Seeding is split into Torah/Nevi'im/Ketuvim sections for resumability and to avoid request timeouts.

OSHB word elements can contain markup such as `<seg type="x-large">ע</seg>` (enlarged letters). The seeder strips all tags from a word before deriving `text`/`plainText` — otherwise the tag's inner space splits the word (e.g. "שמ ע" in Deut 6:4) and phrase searches miss the verse.

### Special letters: two sources, one markup
Large/small/suspended letters and inverted nuns come from Sefaria's markup (`<big>`, `<small>`, bare `<sup>`, `<span class="mam-spi-invnun">`), in two places:
- **Reader (live):** `fetchChapterWithMarks()` in `lib/tanakh.ts` replaces those tags with private-use sentinel characters before `stripHtml()`, then walks the stripped text to compute `{ verse, start, end, kind }` offsets. `fetchChapter()` is a thin wrapper that drops the marks. `<small>` around a paseq (׀) and tags inside version notes are not counted.
- **`/special-letters` page (static):** `lib/special-letters.json` is a one-time snapshot built by scanning all 39 books via Sefaria API v3 with the same rules. If the rules change, regenerate it so the two stay consistent.

### Ketiv/qere
Sefaria marks a pair as `<span class="mam-kq">` holding `mam-kq-k` "(כתיב)" and `mam-kq-q` "[קרי]", in either order, separated by a space or a maqaf; a side can end in a maqaf or hold a paseq tag, and either side also stands alone (קרי ולא כתיב, כתיב ולא קרי). `applyKetivQere()` in `lib/tanakh.ts` rewrites the HTML for the reader's mode (`kq` on `GET /api/tanakh`) **before** special letters and version notes are marked, so their offsets match the text shown. It was checked on all 1,064 verses with ketiv/qere (no brackets, stray maqaf or merged words left); re-check them all after changing it.

### Version notes (חילופי נוסח)
Sefaria's MAM text puts 31 version notes inline after a word (`<sup class="footnote-marker">*</sup><i class="footnote">(בספרי ספרד ואשכנז …)</i>`): readings of Sephardi/Ashkenazi or Yemenite books, or the Aleppo Codex. They are not verse text. `fetchChapterWithMarks()` takes them out with a sentinel pass like the special letters and returns them as `notes` (`{ verse, at, text }`, `at` = offset right after the word); the reader shows a `*` marker (`app/components/VersionNoteMark.tsx`) there, outside the gematria word spans. Any other Sefaria verse fetch must go through `stripVerseHtml()`, or the note text ends up inside the verse.

The `/version-notes` page lists them from a snapshot, `data/version-notes/version-notes.json`, built by `node scripts/build-version-notes.mjs` with the same extraction (rebuild it if that changes). Each note is classified by its opening words (`tradition`: ספרד ואשכנז, אשכנז, תימן, כתר ארם צובא, other). The page highlights the word the note quotes when it is in the verse, else the word it follows (`noteRange()` in `lib/versionNotes.ts`).

### Reader passages: chapter or verse range
The reader (`app/tanakh/page.tsx`) shows a *passage*: either a chapter or, in division mode, a verse range (a parasha in the Torah, a parashiya elsewhere; Psalms has no division mode). Everything per-verse — read status, favorites, notes, special-letter marks, leitword forms, DOM ids — is keyed by chapter **and** verse (`"c:v"`), because a parasha spans chapters. Position is stored as a book + anchor verse: chapter mode shows the anchor's chapter, division mode the unit containing it, so switching modes or following a verse link keeps the place.

`?book=&chapter=&verse=` is a one-time jump, not the reader's state: the reader reads it with `useSearchParams()` (so a link from the reader to another verse, such as an echo, works without a remount), then clears the URL to `/tanakh`; the position itself lives in localStorage. That is also why the page is wrapped in `Suspense`.

Chapter completion stays chapter-based: the client sends each verse's own chapter length (`chapterVerseCounts`) with `POST /api/tanakh`, and `completeRange` completes every chapter the range covers to its end. Parasha and parashiya completion are detected client-side from the read set. Division data is static (`lib/parashot.json`, `lib/parashiyot.json`, built once from Sefaria); `lib/divisions.ts` clips parashiyot to a range (a parasha can start mid-parashiya — Vayechi).

### Mishkal search: snapshot files, built by scripts
The "חיפוש לפי משקל" tab (`/api/verses/mishkal`, `lib/mishkal.ts`) reads `data/noun-patterns/noun-patterns.json` and `noun-adjective-patterns-extended.json`. They are one-time snapshots built by `node scripts/build-noun-patterns.mjs` and then `node scripts/build-noun-patterns-extended.mjs` (shared code in `scripts/lib/mishkal.mjs`), classifying nouns and adjectives by Gesenius §84–86. The second file only adds words the first leaves without a mishkal, so they never overlap. `lib/mishkal.ts` caches both files and the matching `WordEntry` rows per server process: restart the server after regenerating.

### Leitwords: OSHB words matched onto Sefaria text
`lib/leitwords.ts` (`getPassageLeitwords()`) scores a passage's content words (nouns/verbs/adjectives, no proper names, minus a small `STOPLIST` of very general words) against Tanakh-wide frequency with log-likelihood (G²), merging a word into its single `derivedFrom` parent when both appear in the passage. It also scores each parashiya of at least `MIN_SECTION_VERSES` (4) verses — below that, measured over the Torah, results are mostly list structure rather than leitwords.

### Leitword search
`lib/leitwordSearch.ts` keeps one index per server process (about 2 s to build; restart after seeding): each lexeme's verses, each surface form's lexemes with counts, and every verse's chapter / division unit (`getUnits()`, as in the reader). A typed word maps to the lexemes of that surface form (prefixes included), keeping only those with at least 10% of the form's occurrences, plus dictionary forms spelled exactly so; this drops prefix accidents (מים → מִ+יָּם). `SAME_LEXEME` folds יָלַךְ (H3212) into הָלַךְ. Ranking: terms found, then `smallestWindow()` over verseIndex (contiguous across chapters), then occurrences. Matched words are marked by `wordNum` in `VerseText.text` (same invariant as the grammar quiz).

### WordEntry parsing and in-memory caches (`lib/wordStats.ts`)
`lemma` and `morph` are parallel `/`-separated chains (prefixes + main word), e.g. `c/7200` ↔ `HC/Vqw3ms`. The segment of `lemma` that starts with a digit is the Strong's number, and the `morph` segment at the same index (after the leading language letter `H`/`A`) describes that word: part of speech, then for verbs binyan, tense, person, gender, number (`Vqw3ms`). `parseWord()` does this; use it rather than re-parsing.

Tanakh-wide counts per Strong's number (`getCorpusCounts()`, one `GROUP BY lemma, morph` query) and the grammar quiz's verb pool (`lib/grammarQuiz.ts`) are cached in module-level promises for the life of the server process. They only change on re-seed, so restart the server after seeding.

### Roots by letters
`lib/rootLetters.ts` builds the list of three-letter verb roots (Strong's lemma of Hebrew verbs, finals normalized, homonyms merged) with per-section counts in one cached `GROUP BY` — restart the server after seeding. `MERGE_INTO` folds lemmas that aren't the verb's root into it: Strong's יָלַךְ (H3212, the imperfect of הלך) into הלך (H1980), and two-letter adjective/noun lemmas on geminate verbs (רַב, צַר, מַר…) into the ע״ע root Strong's derives them from. Quadriliterals come from a curated `QUADRILITERALS` list (most four-letter "verb" lemmas are mis-tags). Pilpel/reduplicated verbs (כִּלְכֵּל) are tagged under their triliteral root, so `findRootsContaining()` (`/api/verses/root-hint`) maps a typed 4+ letter form back to it. The client imports constants/types only from `lib/rootLetterPattern.ts`, since `lib/rootLetters.ts` pulls in Prisma.

### Word analysis ("מה השורש?")
`lib/wordAnalysis.ts` matches typed words against `WordEntry.plain` (which includes prefixes), groups by Strong's number via `parseWord()`, turns each morph chain into Hebrew with `describeMorph()` (verbs reuse `describeVerb()` from `lib/grammarQuiz.ts`), and walks `derivedFrom` up while there is a single parent. Many entries list several parents, often a verse cross-reference beside the real source (סֵפֶר: H9, H5608), so they are shown as `candidates` rather than guessed. Aramaic verbs get no binyan (OSHB's Aramaic stem codes differ).

### Echoes and parallel passages
`lib/echoes.ts` builds one in-memory index per server process from all of `WordEntry` (about 3 s on first request; restart after seeding): content-lexeme pairs and two-word surface phrases (leading ו stripped), keeping only those found in at most 6 verses. A verse's echoes are the verses sharing those features, scored by Σ log(N / df), same chapter excluded. Below 8 nothing is shown; 15+ is "strong". The weights were tuned on known echoes (Gen 22:10 / Judg 19:29, Gen 37:32 / 38:25, Gen 1:2 / Jer 4:23, I Kings 19:4 / Jonah 4:8): re-check them when changing anything.

`/parallels` reads `data/parallels/parallels.json`, built from the data by `node scripts/build-parallels.mjs` (verse pairs with Jaccard ≥ 0.6 over lexemes chained into passages, then gaps filled at ≥ 0.3 so differently told verses like זָכוֹר / שָׁמוֹר are aligned). Passage ids are positions in that file, so they change when it is rebuilt. `lib/textDiff.ts` diffs a verse pair by LCS over letter skeletons without ו/י, so plene/defective spellings count as the same word, marked "spelling".

### Accent tree, characters, word shifts
- `lib/taamim.ts` parses the reader's Sefaria text (accents are kept there, stripped in `VerseText`). Disjunctives get a rank (1 אתנחתא, 2 kings incl. טפחא, 3 dukes, 4 counts; the last word is סוף פסוק); a segment is split after every inner word of the highest rank found in it. שלשלת and מונח count as disjunctive only with a following paseq (לגרמיה). Prose system only.
- `lib/characters.ts` keeps OSHB `Np` words whose Strong's definition starts with a capital and whose main sense (before "also") isn't a place or month; `SAME_PERSON` merges renamed people (אברם→אברהם, שרי→שרה, יונתן→יהונתן). Cached per server process.
- `lib/wordShifts.ts` is a curated list: add a word only after checking its Strong's definition and verses in the data, not from memory.

### Loanwords and letter pairs
`/loanwords` reads `data/loanwords/loanwords.json`, a snapshot built by `node scripts/build-loanwords.mjs` from Strong's `derivation` field (the seeder doesn't store it). Strong's is from 1894 and misses many loans known today, which the page states; don't present the list as complete. `/letter-pairs` uses `listTriliteralRoots()` from the cached root list in `lib/rootLetters.ts` (restart after seeding). It shows roots that share letters, not related meanings: keep that framing.

### Grammar quiz: word position via VerseText
The quiz shows the verse from `VerseText.text` (not Sefaria) because its words are exactly the OSHB words joined by single spaces, so `text.split(" ")[wordNum - 1]` is the asked word (verified on 400 random verses). Keep that invariant in the seeder. The quiz has no LLM: answers come straight from `morph`/`StrongsEntry`. Difficulty = root frequency bands plus, for root questions, how similar the same-length distractor roots look.

The missing-letters quiz (`lib/lettersQuiz.ts`) relies on the same invariant, plus `WordEntry.plain` equalling the word's letters: it splits the word into letter+nikud units (`splitGraphemes()` in `lib/hebrewLetters.ts`, client-safe) and skips the first N letters, where N is the number of prefix segments in `lemma`. Unpointed words are ketiv and are never blanked.

### Who said to whom: a hand-checked snapshot
`/api/quiz/who-said` (`lib/whoSaid.ts`) reads `data/who-said/who-said.json`, built by `node scripts/build-who-said.mjs` from OSHB: a speech verb, a name, then אֶל/לְ + name, the quote being the rest of the verse up to the next 3rd-person wayyiqtol. The automatic rules are not enough on their own ("אמר אל" can mean "said about"; a narrator's remark can sit inside the verse), so every item was read: `EXCLUDE` and `TRIM` in the script hold the decisions. After changing the rules, run it with `--review` and read the new items before keeping the file. Divine speech is capped per pair, so "ה׳ אל משה" (86 matches) doesn't take over.

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

### Notebook: collecting from anywhere
`app/components/NotebookCollector.tsx` (mounted in the root layout) turns a text selection inside any element with `data-collect-source` (plus optional `data-collect-href`, `data-collect-attribution`) into a "הוסף לדף" button. Inside the selection, `button` and `[data-collect-skip]` elements are dropped, so mark verse numbers, ✓ marks and labels with `data-collect-skip`. Explicit buttons call `collect()` from `lib/notebook.ts`. Quotes go to the active page (localStorage, `app/notebook/activeDoc.ts`) via `POST /api/notebook/[id]/append`, as a `sourceQuote` node (`app/notebook/SourceQuote.tsx`). Quote links are restricted to same-site paths (not `//`) and Sefaria, on both server and client. After an append, a `BroadcastChannel` message lets an editor open in another tab insert the same node, so its autosave doesn't overwrite it. The editor uses `immediatelyRender: false` (required for SSR).

### Route handler params
Dynamic route handlers (e.g. `app/api/notes/[id]/route.ts`) receive `params` as a **Promise** in Next.js 16, so they must `await ctx.params`. They type the context explicitly (`{ params: Promise<{ id: string }> }`) rather than with the generated `RouteContext<...>` helper, which only type-checks after `next dev`/`next build` has generated route types.
