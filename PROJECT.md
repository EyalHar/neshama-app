# Project Specification — Neshama App

## Overview
A Hebrew Bible (Tanakh) reading companion for Hebrew-speaking users. Features verse-by-verse progress tracking, AI-powered emotional verse matching, advanced Hebrew search, and a quiz game. Full RTL layout, Google OAuth authentication, and gamified milestone celebrations.

---

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript 5, Server Components)
- **Styling:** Tailwind CSS 4
- **Auth:** NextAuth 5 (beta) with Google OAuth + Prisma adapter
- **Database:** SQLite via Prisma ORM
- **AI/LLM:** Groq (llama-3.3-70b-versatile) — primary; Anthropic, OpenAI, Google Gemini SDKs also installed but not actively used
- **External API:** Sefaria.org (Hebrew verse text with nikud and ta'amim)
- **Rich text editor:** TipTap 3 (MIT, core + StarterKit only — no paid/cloud features) for notebook pages

---

## Directory Structure
```
neshama-app/
├── app/
│   ├── api/                    ← All API routes
│   │   ├── auth/[...nextauth]/ ← NextAuth handler
│   │   ├── neshama/            ← AI verse-by-emotion endpoint
│   │   ├── quiz/               ← AI quiz generation endpoint
│   │   │   ├── grammar/        ← Root/binyan quiz from morphology (no AI)
│   │   │   ├── letters/        ← Missing-letters quiz (no AI)
│   │   │   └── who-said/       ← "Who said to whom" quiz from data/who-said (no AI)
│   │   ├── events/             ← AI biblical-event → source verses
│   │   ├── favorites/          ← Favorite verses/chapters (list, verse/, chapter/ toggles)
│   │   ├── notes/              ← Verse notes (POST; [id]/ PATCH + DELETE)
│   │   ├── notebook/           ← Notebook pages (list/create; [id]/ get, autosave, delete, append/)
│   │   ├── shares/             ← Community feed + share (GET/POST); [id]/ DELETE, like/, comments/
│   │   ├── comments/[id]/      ← Delete a comment (soft if it has replies)
│   │   ├── profile/            ← Public display name (GET/PATCH)
│   │   ├── commentaries/       ← Classic commentaries on a verse (from Sefaria, license-filtered)
│   │   ├── echoes/             ← Verses that share a rare word combination with a verse
│   │   ├── characters/         ← People of a book and the chapters each pair shares
│   │   ├── hapax/              ← Words occurring once in the Tanakh
│   │   ├── jerusalem-names/    ← Names of Jerusalem with source verses
│   │   ├── passage-text/       ← A verse range's text with nikud from VerseText (opens a song/prayer in place)
│   │   ├── letter-pairs/       ← All triliteral verb roots + meanings, for the letter-pairs wheel
│   │   ├── loanwords/verses/   ← Verses a loanword occurs in
│   │   ├── unknown-roots/      ← Crowdsourced missing Strong's roots
│   │   ├── tanakh/             ← Reading progress CRUD + stats
│   │   │   ├── bulk/           ← Batch complete/clear (chapter or verse range)
│   │   │   ├── units/          ← A book's parashot / parashiyot
│   │   │   ├── reset/          ← Delete all user progress
│   │   │   └── stats/          ← Completed chapters count
│   │   ├── verses/
│   │   │   ├── analyze/        ← Word analysis: lexeme, morphology, Strong's chain to the root
│   │   │   ├── etymology/      ← Word-family (etymological) search
│   │   │   ├── letters/        ← Search by first/last letter
│   │   │   ├── leitwords/      ← Passages holding several typed words, ranked by how many and how close
│   │   │   ├── root/           ← Search by Hebrew root and/or verb stem (+ etymological)
│   │   │   ├── roots/          ← Verb roots matching a letter pattern (roots-by-letters tab)
│   │   │   ├── mishkal/        ← Nouns/adjectives by mishkal (Gesenius), from data/noun-patterns
│   │   │   └── substring/      ← Substring / basic word search
│   │   └── admin/
│   │       ├── seed-oshb/      ← Seed morphology data
│   │       └── seed-strongs/   ← Seed Strong's dictionary
│   ├── components/
│   │   ├── Sidebar.tsx         ← Main navigation (right side, RTL)
│   │   ├── SessionWrapper.tsx  ← NextAuth provider
│   │   ├── Confetti.tsx        ← Milestone celebration animation
│   │   ├── HeartIcon.tsx       ← Favorite toggle icon
│   │   ├── NoteIcon.tsx        ← Verse-notes icon
│   │   ├── VerseNotes.tsx      ← Notes panel (list, add, edit, delete, share) for a verse
│   │   ├── DisplayNameForm.tsx ← Choose public display name before first share/comment
│   │   ├── Commentaries.tsx    ← Per-verse commentators panel with tabs (+ BookIcon)
│   │   ├── Echoes.tsx          ← Per-verse echoes panel (+ EchoIcon)
│   │   ├── VerseStructure.tsx  ← Per-verse accent tree panel (+ TreeIcon)
│   │   ├── NotebookCollector.tsx ← Global: collect selected text / verses / notes into the active notebook page
│   │   ├── VerseText.tsx       ← Renders a verse with special letters + highlighted words
│   │   ├── ScrollIntro.tsx     ← Home hero: animated Torah scroll whose letters rise into the title (+ .module.css)
│   │   └── TempleIcon.tsx      ← SVG of Herod's Temple (Jerusalem names icon)
│   ├── admin/seed/page.tsx
│   ├── advanced/page.tsx
│   ├── notebook/               ← page.tsx (list), [id]/page.tsx, NotebookEditor (TipTap), SourceQuote, activeDoc
│   ├── community/              ← page.tsx (feed), ShareCard, CommentThread, format (dates/avatar)
│   ├── events/page.tsx
│   ├── favorites/page.tsx
│   ├── jerusalem-names/page.tsx
│   ├── prayers-songs/          ← page.tsx (server) + PrayersBrowser (filters) + PassageText (open in place)
│   ├── letter-hints/           ← page.tsx (server, acrostics) + LetterHintsTabs, InitialsSearch, Acrostics, ElsSearch, MarkedVerseText
│   ├── verse-patterns/         ← page.tsx + VersePatternsTabs (chiasm, repeats), tabs.ts
│   ├── frequencies/            ← page.tsx + FrequenciesView (words / roots tabs, occurrences on demand)
│   ├── doublets/               ← page.tsx (server: verses, name counts, parallels link) + DoubletsView
│   ├── middot/                 ← page.tsx (server: examples' verses) + MiddotView (Sefaria sources on demand)
│   ├── divine-names/page.tsx   ← Names and titles of God with key verses and counts (server component)
│   ├── letter-pairs/           ← page.tsx + LetterWheel (231-gate wheel of letter pairs)
│   ├── characters/             ← page.tsx + CharacterGraph (force-directed network)
│   ├── word-shifts/page.tsx    ← "גלגולי מילים": biblical vs modern meaning
│   ├── parallels/              ← page.tsx (list) + [id]/page.tsx (side-by-side diff of a passage told twice)
│   ├── loanwords/              ← page.tsx + LoanwordsBrowser
│   ├── letters/page.tsx
│   ├── login/page.tsx
│   ├── neshama/page.tsx
│   ├── quiz/                   ← page.tsx (tabs), VerseQuiz, GrammarQuiz, LettersQuiz, WhoSaidQuiz, QuizActions, QuizStatus, Segmented
│   ├── special-letters/page.tsx
│   ├── tanakh/page.tsx
│   ├── unique-words/page.tsx
│   ├── unknown-roots/page.tsx
│   ├── page.tsx                ← Home / landing page
│   └── layout.tsx              ← Root layout: RTL, Sidebar, SessionWrapper
├── lib/
│   ├── prisma.ts               ← Singleton PrismaClient
│   ├── tanakh.ts               ← Book metadata, Hebrew numerals, Sefaria fetch + special-letter marks
│   ├── favorites.ts            ← Current user + favorite-verse helpers
│   ├── notes.ts                ← Verse-note type and helpers
│   ├── notebook.ts             ← Notebook types, sourced-quote node, text export, collect()
│   ├── shares.ts               ← Viewer/admin, author display, feed + comment types
│   ├── commentaries.ts         ← Commentator list + allowed licenses
│   ├── hapax.ts                ← Hapax legomena computation
│   ├── wordAnalysis.ts         ← "מה השורש?": OSHB morph → Hebrew description + derivedFrom chain
│   ├── loanwords.ts            ← Loanword types, labels + data/loanwords snapshot (client-safe)
│   ├── leitwords.ts            ← Leitwort (מילה מנחה) detection per passage and per parashiya
│   ├── leitwordSearch.ts       ← "מילים מנחות" search: lexemes → chapters / parashot / parashiyot, ranked (cached index)
│   ├── echoes.ts               ← "מאין ההד": rare shared lexeme pairs / phrases between verses (cached index)
│   ├── parallels.ts            ← Parallel passages snapshot (data/parallels) + labels, parallelOf()
│   ├── taamim.ts               ← Verse structure by disjunctive accents (client-safe parser)
│   ├── characters.ts           ← Person names (OSHB Np + Strong's) per book/chapter, network (cached)
│   ├── wordShifts.ts           ← Hand-picked list of words whose meaning changed (by Strong's number)
│   ├── textDiff.ts             ← Word-level diff of two verse versions (same / spelling / only)
│   ├── divisions.ts            ← Parashot / parashiyot: units, sections in a range
│   ├── parashot.json           ← 54 Torah portions (snapshot from Sefaria)
│   ├── parashiyot.json         ← 3,482 open/closed sections in the Tanakh (from MAM {פ}/{ס})
│   ├── passage.ts              ← Reader passage response types
│   ├── progress.ts             ← Book/section/Tanakh completion events
│   ├── grammarQuiz.ts          ← Grammar quiz question generator
│   ├── lettersQuiz.ts          ← Missing-letters quiz generator
│   ├── hebrewLetters.ts        ← Client-safe letter helpers (letter+nikud split, final forms)
│   ├── whoSaid.ts              ← "Who said to whom" question generator (data/who-said snapshot)
│   ├── wordStats.ts            ← WordEntry parsing + Tanakh-wide frequency counts (cached)
│   ├── gematria.ts             ← Gematria methods (standard, gadol, katan, ordinal)
│   ├── jerusalemNames.ts       ← Static Jerusalem-names dataset
│   ├── prayersSongs.ts         ← Curated songs/prayers/laments/blessings outside Psalms (checked against the text)
│   ├── psalmTitles.ts          ← Reads a psalm's superscription (attribution + tags) from its first verse
│   ├── letterHints.ts          ← Initials/finals search, ELS search + grid, acrostic alignment (cached letter index)
│   ├── letterHintsShared.ts    ← Client-safe types, normalizeLetters(), ALEF_BET, ELS limits
│   ├── acrostics.ts            ← Curated acrostic ranges / line starts (letters are read from the text)
│   ├── versePatterns.ts        ← Chiasm (mirrored lexemes) + repeated words per verse (cached; types in versePatternsShared.ts)
│   ├── frequencies.ts          ← Word (lexeme / written form) and verb-root frequencies per section, occurrences (cached index)
│   ├── doublets.ts             ← Curated doublets: sides, cited differences (checked), views by approach (client-safe)
│   ├── middot.ts               ← The 13 middot: baraita wording, explanations, checked examples, search phrases (client-safe)
│   ├── middotVerses.ts         ← Loads an example verse with its phrase marked
│   ├── middotSources.ts        ← Sefaria search for passages naming a middah; license-gated snippet + linked verses
│   ├── divineNames.ts          ← Curated names/titles of God, key verses, findMatch() (client-safe)
│   ├── rootFamily.ts           ← Strong's family-tree helpers
│   ├── special-letters.ts      ← Special-letter types, labels, styles
│   └── special-letters.json    ← Snapshot of all special letters in the Tanakh (from Sefaria)
├── prisma/
│   ├── schema.prisma
│   └── dev.db
└── auth.ts                     ← NextAuth config
```

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Home — an animated Torah scroll hero (opens, Genesis 1:1–5 is written, letters rise and kindle the title; once per session, click to skip, static with reduced motion), then feature cards linking to all sections |
| `/discover` | "גלה": the study tools as cards in three topic groups (words and letters, text and structure, people/places/events), from `app/discover/tools.tsx` |
| `/tanakh` | Main Tanakh reader: chapter selector, verse marking, progress, confetti, notes, leitwords, commentaries |
| `/community` | Shared notes/insights from all users, with likes and threaded comments (signed-in only) |
| `/letters` | Redirects to `/advanced?tab=letters` (the letter search is now a search tab) |
| `/advanced` | Multi-tab search: basic, substring, leitwords (passages holding several words), root + binyan (direct/etymological), word family, first/last letter. `?tab=` opens a tab directly |
| `/quiz` | Four tabs: fill-in-the-blank verse quiz (AI), grammar quiz (root/binyan), missing letters (letter bank or full keyboard) and who said to whom; the last three in 3 levels |
| `/neshama` | AI feature: describe emotional state → get matching Tanakh verses |
| `/unknown-roots` | Crowdsourced table to fill in missing Strong's roots |
| `/notebook` | "המחברת שלי": personal pages (TipTap editor) for a dvar Torah or summary, collecting verses, notes and commentary excerpts with their sources |
| `/favorites` | The user's favorite verses and chapters, grouped by book |
| `/events` | Enter a biblical event → all source verses that mention it |
| `/frequencies` | "המילים והשורשים השכיחים": the top 500 words (shown 100 at a time, more on scroll) (by dictionary entry or written form, optionally content words only) and verb roots, per section or the whole Tanakh, with counts, share, first occurrence and all occurrences on demand |
| `/unique-words` | Hapax legomena — words occurring only once in the Tanakh |
| `/special-letters` | All large, small and suspended letters and inverted nuns, linked to the reader |
| `/version-notes` | "חילופי נוסח": the 31 version notes of Sefaria's MAM text (Sephardi/Ashkenazi, Yemenite, Aleppo Codex), each with its verse and word, from `data/version-notes/` |
| `/jerusalem-names` | Names of Jerusalem with their source verses |
| `/prayers-songs` | "תפילות ושירות": 57 songs, prayers, laments and blessings in the narrative and prophetic books (filter by kind, each opens in full), and all 150 psalms grouped by their superscription's attribution, filterable by title word |
| `/letter-hints` | "רמזים באותיות": seven tabs — words spelled by the first/last letters of consecutive words (forward/reversed), the 13 alphabetic acrostics with missing/out-of-order letters read from the text, word squares (אמת מארץ תצמח), the first appearance of each letter, and equidistant letter sequences (ELS) with a grid view; searches show the count expected by chance |
| `/verse-patterns` | "תבניות בפסוק": verses whose content words repeat in mirrored order (chiasm, by lexeme), and words said twice in a row (with the four double calls by name) |
| `/doublets` | (hidden for now: 404, no card) "סיפורים כפולים בתורה": 10 stories told twice or three times (Creation, the Flood, wife-sister ×3, Hagar, names given twice, Joseph's sale, water from the rock, the spies, the judges, the Decalogue): each telling, the differences highlighted in the verses, and three approaches side by side (classic commentators, modern religious thinkers, academic source criticism) |
| `/middot` | "י״ג מידות": the 13 middot of R. Yishmael's baraita, each with its wording, an explanation, the baraita's own example (verses highlighted), checked extra examples, and further sources found by Sefaria's search (text only from openly licensed editions) |
| `/divine-names` | "שמות ה׳": 33 names and titles of God in three groups (the names, titles, names given to a place/altar/city), each with key verses (name highlighted) and its verse count |
| `/letter-pairs` | "צירופי אותיות": Sefer Yetzirah's wheel of 231 letter pairs; pick two letters → the verb roots containing them, in both orders |
| `/parallels` | "נוסחים מקבילים": 102 passages told twice (Samuel–Kings / Chronicles, II Sam 22 / Ps 18, Decalogue…), each side by side with word differences marked |
| `/characters` | "רשת הדמויות": the 30 most-named people of a book as a network; edge = chapters they share |
| `/word-shifts` | "גלגולי מילים": biblical words with a different meaning today (חַשְׁמַל, אֶקְדָּח, מְדִינָה…), each with a verse |
| `/loanwords` | Words borrowed from Persian, Egyptian, Greek etc., per Strong's, with their verses |
| `/login` | Google OAuth login |
| `/admin/seed` | Database seeding UI (OSHB morphology + Strong's dictionary) |

---

## Database Models (Prisma / SQLite)

| Model | Purpose |
|---|---|
| `User` | NextAuth user (cuid, email, name, image) + `displayName` shown on shared content |
| `Account` | OAuth account linking |
| `Session` | NextAuth sessions |
| `ReadVerse` | Individual verses marked read (userId, book, chapter, verse) |
| `CompletedChapter` | Entire chapters marked complete (userId, book, chapter) |
| `FavoriteVerse` | Verses marked favorite (userId, book, chapter, verse, optional `listId` → FavoriteList, SetNull on delete) |
| `FavoriteChapter` | Chapters marked favorite (userId, book, chapter) |
| `FavoriteParashiya` | Parashiyot marked favorite, keyed by their first verse (userId, book, chapter, verse) |
| `FavoriteList` | Named sub-list of favorite verses, shown as its own tab (userId, name unique per user) |
| `StudyDoc` | Notebook page (userId, title, content = TipTap JSON) |
| `VerseNote` | Personal notes on a verse (userId, book, chapter, verse, text); every noted verse is also a favorite |
| `Share` | A published item on /community (userId, type="note", noteId → VerseNote, cascade) |
| `ShareLike` | One like per user per share |
| `ShareComment` | Threaded comment (shareId, userId, parentId self-relation, text, deleted for soft delete) |
| `VerseText` | Full Tanakh with diacritics (`text`), plain text (`plainText`), first/last letter index |
| `WordEntry` | Morphological analysis per word (lemma, Strong's number, morph code) |
| `StrongsEntry` | Strong's Hebrew Dictionary (number, lemmaHe, lemmaPlain, xlit, definition, derivedFrom) |
| `UnknownRoot` | Strong's entries with no parent root; crowdsourced suggestions |
| `VerificationToken` | NextAuth email verification |

---

## API Routes Summary

### Tanakh Progress
- `GET /api/tanakh?book=&chapter=` or `?book=&from=c:v&to=c:v` (`&kq=qere|ketiv` shows only one side of ketiv/qere) — Fetch a chapter or a verse range (parasha/parashiya) from Sefaria + user's read/favorite status, all keyed by chapter:verse; a range also returns `sections` (parashiyot with per-section leitwords) and `chapterVerseCounts`; also returns `specialLetters` (`{ verse, start, end, kind }[]` offsets of large/small/suspended letters and inverted nuns), `versionNotes` (`{ chapter, verse, at, text }[]`, Sefaria's version notes taken out of the verse text), `leitwords` (`{ strongs, lemmaHe, count, ratio, forms }[]`) and the user's `notes`
- `POST /api/tanakh` — Toggle single verse read
- `POST /api/tanakh/bulk` — Mark/clear a chapter, or a verse range (`completeRange` / `clearRange`)
- `GET /api/tanakh/units?book=` — Parashot (Torah) or parashiyot (other books) for division mode
- `GET /api/tanakh/weekly?custom=ashkenazi|sephardi` — This week's parasha and haftarah (Israel) by custom, from Sefaria's calendar
- `DELETE /api/tanakh/reset` — Reset all user progress
- `GET /api/tanakh/stats` — Total completed chapters count

### Verse Search
- `GET /api/verses/substring?q=&scope=&whole=&page=` — Word/substring search (500/page)
- `GET /api/verses/root?root=&stem=&form=&scope=&view=direct|etymological&page=` — Root search via Strong's family tree, optionally intersected with a verb stem (binyan) and/or verb form filter (`form`: perfect, imperfect, imperative, participle, infinitive, infAbsolute — see `VERB_FORMS` in `lib/rootFamily.ts`); `root`, `stem` and `form` are each optional but at least one is required (200/page)
- `GET /api/verses/mishkal?mishkal=&kind=noun|adjective&root=&scope=&page=` — Verses containing nouns/adjectives of a mishkal (per Gesenius §84–86), from the `data/noun-patterns/` snapshots; without `mishkal`, the list of mishkalim with counts (200/page)
- `GET /api/verses/roots?l1=&l2=&l3=&l4=&scope=` — Verb roots whose letters match (empty = any; `l4` empty = triliteral, `*`/letter = quadriliteral; at least one required), with occurrence counts in the scope
- `GET /api/verses/root-hint?root=` — For a typed 4+ letter root (e.g. כלכל), the triliteral roots its verb forms are filed under (כול)
- `GET /api/verses/letters?first=&last=` — First/last Hebrew letter match
- `GET /api/verses/leitwords?q=&unit=chapters|divisions&scope=&offset=&exclude=` — Chapters, or parashot (Torah) / parashiyot (elsewhere; Psalms by chapter), holding the typed words in any of their forms (each word → its Strong's lexemes; `exclude` drops lexemes). Ranked by words found, then the smallest run of verses holding them, then occurrences; 20 per page, each with that run's verses and the matched words marked
- `GET /api/verses/etymology?word=&scope=&group=&page=` — Etymological word-family search
- `GET /api/verses/analyze?q=&whole=1&scope=` — For each typed word (with prefixes/suffixes, no nikud needed): its lexemes, forms, per form a Hebrew parse per occurrence pattern (`describeMorph()`) with up to 50 verse refs, and the Strong's `derivedFrom` chain to the root (several parents → `candidates`). `whole=0` analyzes every word containing the text
- `substring`, `root` and `etymology` accept `favoritesOnly=1` to restrict results to the user's favorites

### Favorites
- `GET /api/favorites` — All favorite chapters, parashiyot and verses (verse text live from Sefaria)
- `POST /api/favorites/verse` — Toggle a favorite verse (unfavoriting also deletes its notes)
- `POST /api/favorites/chapter` — Toggle a favorite chapter
- `POST /api/favorites/parashiya` — Toggle a favorite parashiya `{ book, chapter, verse }` (its first verse)
- `POST /api/favorites/lists` — Create a named list `{ name }` (409 if the name exists)
- `PATCH` / `DELETE /api/favorites/lists/[id]` — Rename / delete a list (its verses return to the general tab)
- `PATCH /api/favorites/verse/list` — Move a favorite verse into a list `{ book, chapter, verse, listId | null }`

### Notebook
- `GET` / `POST /api/notebook` — List pages / create `{ title }`
- `GET` / `PATCH` / `DELETE /api/notebook/[id]` — Read / autosave `{ title?, content? }` / delete (owner only)
- `POST /api/notebook/[id]/append` — Append a sourced quote `{ text, source: { source, href, attribution } }`

### Notes
- `POST /api/notes` — Add a note `{ book, chapter, verse, text }`; also favorites the verse
- `PATCH /api/notes/[id]` / `DELETE /api/notes/[id]` — Edit / delete one of the user's notes
- Notes for a chapter come back from `GET /api/tanakh` (`notes`), and per verse from `GET /api/favorites`

### Content Pages
- `GET /api/hapax?section=&page=&mergeSpelling=&mergeDerived=` — Hapax legomena
- `GET /api/jerusalem-names` — Names of Jerusalem with source verses
- `GET /api/passage-text?book=&from=c:v&to=c:v` — A range's verses with nikud (no ta'amim) from VerseText, up to 400
- `GET /api/letter-pairs` — Every triliteral verb root (`lib/rootLetters.ts`) with its count and Strong's meaning
- `GET /api/loanwords/verses?strongs=` — Verses a loanword occurs in (up to 100), with the word's position in `VerseText.text`
- `GET /api/unknown-roots` / `PATCH /api/unknown-roots` — List / suggest missing roots

### Community
- `GET /api/shares?filter=all|mine|liked&book=&cursor=` — Feed, newest first (20/page)
- `POST /api/shares` — Share a note `{ noteId, displayName? }`; 409 `needDisplayName` until a display name is set
- `DELETE /api/shares/[id]` — Unshare (author) or remove (admin)
- `POST /api/shares/[id]/like` — Toggle like
- `GET` / `POST /api/shares/[id]/comments` — List (flat; tree built client-side) / add `{ text, parentId? }`
- `DELETE /api/comments/[id]` — Comment author, share author or admin; soft delete when it has replies
- `GET` / `PATCH /api/profile` — Display name

### Letter hints
- `GET /api/letter-hints/initials?q=&mode=first|last&dir=forward|backward|both&cross=1&scope=` — Consecutive words whose first (or last) letters spell `q` (3–20 letters), up to 200 shown, with `total` and `expected` (count by chance at the scope's letter frequencies)
- `GET /api/letter-hints/els?q=&min=&max=&scope=torah|tanakh|<book id>` — Equidistant letter sequences (3–12 letters, skip 2–10,000, both directions), 200 shortest skips shown, with `total` and `expected`
- `GET /api/letter-hints/squares` — Every run of three words that reads the same across and down (one-letter cells off the diagonal), `strong` when the first word is also their initials (אמת מארץ תצמח), and the average count with each verse's words shuffled (5 runs); cached
- `GET /api/letter-hints/atbash` — Same-verse atbash pairs (3+ letters); `?q=` a word's (or words') atbash, its counts and up to 60 verses
- `GET /api/letter-hints/mirror` — Same-verse reversed-word pairs, palindromic words (3+ letters) and phrases (7+ letters)
- `GET /api/letter-hints/first-letters?book=` — Where each of the 27 letter forms is first written in a book
- `GET /api/verse-patterns` — Chiasms (mirrored content lexemes, 2+ pairs) and back-to-back repeated words, Tanakh-wide (cached)
- `GET /api/middot/sources?id=&from=` — Passages of the Bavli and halakhic midrashim naming a middah, via Sefaria's search, 5 per page; text only from editions in `ALLOWED_LICENSES`, verses from Sefaria links
- `GET /api/frequencies?kind=lexeme|form|root&scope=&limit=1..500&content=1` — Most frequent words / verb roots with counts and first occurrence (cached index)
- `GET /api/frequencies/compare?kind=lexeme|form|root&content=1` — The Tanakh's 10 most frequent words / roots with their count in each section and the section sizes (the page charts them per 1,000 words)
- `GET /api/frequencies/occurrences?kind=&key=&scope=&offset=` — A word's or root's verses, 10 at a time, the word marked
- `GET /api/letter-hints/els/grid?start=&skip=&length=` — The text in rows of |skip| letters around one sequence, and its verses with the letters marked

### Characters
- `GET /api/characters?book=` — `{ nodes: { id, name, definition, count, chapters }[], edges: { a, b, chapters }[] }` for the 30 most-named people of the book

### Echoes
- `GET /api/echoes?book=&chapter=&verse=` — Up to 10 verses elsewhere that share a rare lexeme pair or a rare two-word phrase with the verse, scored by rarity; each with `strength` (strong/weak), shared lexemes and phrases, word numbers to highlight in both verses, and `parallelId` when the two are part of a parallel passage

### Commentaries
- `GET /api/commentaries?book=&chapter=&verse=` — Classic commentators on a verse from Sefaria; only Public Domain / CC0 / CC-BY / CC-BY-SA editions are returned with text, others as a Sefaria link

### AI
- `POST /api/neshama` — Groq: detect emotion → return 2–3 matching verses with message
- `POST /api/quiz` — Groq: generate fill-in-the-blank quiz from random Tanakh verse
- `GET /api/quiz/grammar?type=root|binyan|mixed&level=easy|medium|hard` — Root/binyan question generated from OSHB morphology (no AI)
- `GET /api/quiz/letters?level=easy|medium|hard` — A verse with letters blanked out: `{ words, blanks: { word, letter, answer, marks }[], distractors }` (no AI)
- `GET /api/quiz/who-said?level=easy|medium|hard` — A quote and four "X אל Y" options, from `data/who-said/` (no AI)
- `POST /api/events` — Groq: find the source verses of a biblical event

---

## Key Features

### Tanakh Reader
- Verse-by-verse marking with persistent progress (Google account)
- Chapter/book/section/entire Tanakh completion milestones
- Celebration modals with confetti animations and Web Audio API sounds
- Resume from last position (localStorage + URL params)
- Random chapter/book/verse jump buttons
- Division toggle: chapters ↔ parashot with parashiyot (Torah) or parashiyot (Nevi'im/Ketuvim; Psalms stays by chapter). Parashiyot shown with פ/ס breaks, per-parashiya leitwords (≥4 verses), a small toast + chime on finishing a parashiya, and a confetti modal for a finished parasha
- Favorite verses and chapters (heart icons)
- "Show special letters" checkbox — renders large (רבתי), small (זעירות) and suspended (תלויות) letters and inverted nuns in their traditional form across all chapters
- "קרי וכתיב" setting — both (Sefaria's "(כתיב) [קרי]", the default), only the qere, or only the ketiv, without brackets. Lone קרי ולא כתיב / כתיב ולא קרי words appear only in their own mode
- "סמן קמץ קטן" checkbox — colors every letter carrying a qamats qatan (U+05C7 in Sefaria's text, which most fonts draw like a regular qamats), so כׇּל reads differently from כָּל
- "חישוב גימטריה" checkbox — hovering a word (tapping, on touch screens) shows its gematria; selecting letters, even across verses, shows their sum while selecting. A settings popover picks the methods shown: standard, gadol (final letters 500–900), katan, ordinal (`lib/gematria.ts`). Words joined by maqaf count separately; verse numbers in a selection are ignored
- Leitwords (מילים מנחות) — up to 5 roots the chapter repeats far above their Tanakh-wide rate (log-likelihood vs. corpus frequency); clicking one highlights all its occurrences in the chapter

### Advanced Search
- **Basic / Substring** — Hebrew text search with pagination
- **Root + Binyan Search** — Enter a Hebrew root and/or filter by verb stem (Qal, Niphal, Piel, Pual, Hiphil, Hophal, Hithpael) and/or verb form (perfect, imperfect, imperative, participle, infinitive construct, infinitive absolute); when several are set, results are intersected (word must match the root family *and* the chosen binyan). Root alone maps to a Strong's number and BFS-expands to the full family tree with a direct vs. etymological view toggle; binyan alone (no root) is a plain morph-code filter with no etymological view. Scope filter (All / Torah / Nevi'im / Ketuvim)
- **Roots by Letters** — Three letter selectors (one per root position, each "any" or one of 22 letters) list every matching verb root with its count in the chosen scope; clicking a root runs the root search
- **What is the root? (`?tab=analyze`)** — Type a word as it appears in a verse (רדידי) → its dictionary entry (רָדִיד), how it is built (noun, construct + possessive "שלי"), and Strong's chain to the root (← רָדַד), with a button opening the root's whole family. The same analysis appears above the substring search results (not the basic search, to keep it light)
- **First/Last Letter in Verse** — Verses starting and/or ending with chosen Hebrew letters
- **Leitwords (`?tab=leitwords`)** — Several words ("שה עולה ירא") → the chapters, or parashot/parashiyot (default: the reader's setting), holding them, not necessarily together: more of the words first, then the shortest run of verses holding them (בראשית כב, ח for the example). Each word counts in all its forms (Strong's lexemes; הלך includes OSHB's יָלַךְ), shown as chips that can be switched off. Each result shows the run's verses with the words in the word's color and links to the reader

### Neshama (Soul)
- User writes their emotional state and optional wish in Hebrew
- Groq LLM detects emotion (9 categories: sadness, fear, loneliness, hope, loss, anger, love, illness, default)
- Returns 2–3 Tanakh verses with explanations and a personal encouragement message
- Page color theme changes dynamically by detected emotion

### Quiz
- **Verse tab:** AI selects a random verse, blanks one meaningful word, generates 4 options
- **Grammar tab:** identify the root or binyan of a highlighted verb in its verse; mixed/root/binyan × easy/medium/hard. Built from OSHB data only (no AI). Harder levels use rarer roots and look-alike distractor roots. After a correct answer, shows the word's full parse (binyan, tense, person/gender/number) and a first-try streak
- **Missing letters tab:** a verse with letters blanked out (easy: 3 in the Torah, nikud as a hint; medium: 6 in Torah/Nevi'im, vowels only; hard: 10 anywhere, no nikud). Answer from a letter bank padded with look-/sound-alike letters, or from the full alphabet (the physical keyboard works too, on any layout). Blanks favor the letters of the word's Strong's lemma; prefix letters and ketiv words are never blanked
- **Who said to whom tab:** a quote, and four "X אל Y" options; after answering, the whole verse. 197 quotes (82 people) from `data/who-said/who-said.json`, built by `node scripts/build-who-said.mjs` from the speech formula (וַיֹּאמֶר X אֶל Y) and checked by hand. Level = how often the less-known of the two is named; harder levels add the reversed pair and pairs sharing a person
- In all of them: mark the verse as read and jump to it in the reader

### Unknown Roots Crowdsourcing
- Table of Strong's entries with no `derivedFrom` parent
- Shows one sample verse per entry for context
- Filter (all / missing / filled) and sort (alphabetical / Tanakh order)
- Users can propose a root; progress counter (X of Y filled)

### Favorites
- Heart icons on verses and chapters in the reader (signed-in users)
- `/favorites` page with verse/chapter tabs plus one tab per user-named list; verses grouped under collapsible book headings. Right-click (or ⋮) on a verse moves it to a list or creates a new one
- Personal notes on verses: a floating panel under the verse in the reader, and inline under each verse on `/favorites`. Adding a note favorites the verse; unfavoriting a verse with notes asks for confirmation and deletes them
- "Favorites only" filter on all search tabs

### Biblical Events
- Enter an event name → Groq returns up to 10 source verses with explanations; verse text is fetched from Sefaria and unresolvable references are dropped
- "Search more" fetches additional sources, excluding ones already shown
- Sources can be marked read and opened in the reader

### Community (`/community`)
- Share any of your notes; the first share/comment asks for a public display name (defaults to the Google name). Only the display name is shown — never the Google name, email or photo
- Feed with filters (all / mine / liked, by book), likes, and comments threaded to any depth (indent capped at 4 levels, then "בתגובה ל…"); comments with replies are soft-deleted
- A share always shows its note's current text ("נערך" when edited) and is deleted with the note

### Notebook (`/notebook`)
- Personal pages with a TipTap editor (headings, bold/italic, lists, quotes, add-a-verse), autosave, copy as text, print/PDF
- Collect into the "active page": select text in a verse, commentary, note, favorite, search result or share → "הוסף לדף"; or the 📝 button on a verse / note. Each item becomes a quote with its source (and edition + license for commentaries)

### Echoes (מאין ההד)
- An echo icon on every verse in the reader opens the verses elsewhere in the Tanakh that share a rare combination of words with it — וַיִּקַּח אֶת הַמַּאֲכֶלֶת (Gen 22:10 / Judg 19:29), הַכֶּר נָא (Gen 37:32 / 38:25), תֹהוּ וָבֹהוּ (Gen 1:2 / Jer 4:23). The shared words are highlighted in both verses; weak echoes are behind a toggle; an echo inside a parallel passage links to its comparison

### Verse Structure (accent tree)
- A tree icon on every verse in the reader shows the verse divided by its disjunctive accents as nested boxes: halves by אתנחתא, then זקף/סגולתא/טפחא, then רביע/פשטא/תביר, then גרש/פזר/לגרמיה. Parsed client-side from the Sefaria text (`lib/taamim.ts`). Prose system only: Psalms, Proverbs and Job 3:2–42:6 (טעמי אמ״ת) show a notice

### Characters (`/characters`)
- Per book, the 30 most-named people as a force-directed graph (node size = mentions, edge width = shared chapters). Clicking a person lists who they appear with and the shared chapters, linked to the reader; a person can be hidden (tribes named after a patriarch, merged namesakes). Divine names, places and months are left out

### Word Shifts (`/word-shifts`)
- 26 hand-picked words, each tied to its Strong's number: the biblical sense, today's sense, the occurrence count and a verse with the word highlighted

### Parallel Passages (`/parallels`)
- 102 passages the Tanakh tells twice, found from the data by `node scripts/build-parallels.mjs` (snapshot `data/parallels/parallels.json`). The view aligns the two versions verse by verse and marks words found in only one version and plene/defective spelling differences; verses told in only one version stand alone

### Commentaries
- "הצג פרשנים" button on every verse in the reader opens a tabbed panel of classic commentators (Rashi, Ramban, Ibn Ezra, …); edition, license and a Sefaria link are shown under each

### Hapax Legomena (`/unique-words`)
- Words whose lexeme occurs exactly once in the whole Tanakh, tabbed by Torah / Nevi'im / Ketuvim

### Special Letters (`/special-letters`)
- All 63 large, small and suspended letters and inverted nuns (per Sefaria's MAM text), each shown in its word and linked to the verse
- Data is a static snapshot in `lib/special-letters.json`; the reader computes the same marks live per chapter

### Letter Pairs (`/letter-pairs`)
- The 22 letters on a circle with a chord per pair (231 "gates", Sefer Yetzirah 2:4); chord weight = number of roots containing the pair
- Modes: letters adjacent in the root, or anywhere in it. A pair lists its roots in both orders ("פנים" / "אחור"), with Strong's meaning; a root links to `/advanced?tab=root&root=`
- Presented as shared letters, not proven relations in meaning

### Loanwords (`/loanwords`)
- 229 Tanakh words Strong's (1894) marks as of Persian / Egyptian / Greek / Babylonian / foreign origin, with its "probably" / "perhaps" hedges; proper names hidden by default
- Snapshot `data/loanwords/loanwords.json`, built by `node scripts/build-loanwords.mjs`. Strong's misses loans identified later (Akkadian הֵיכָל, כִּסֵּא); the page says so

### Prayers and Songs (`/prayers-songs`)
- 57 songs, prayers, laments and blessings outside Psalms (`lib/prayersSongs.ts`), from שירת למך to תפילת יהושפט, each with who said it, its range, its opening verse and a button that loads the whole text in place. Filters by kind (שירה / תפילה / קינה / ברכה). Notes how a scroll writes the songs (אריח על גבי לבנה; האזינו in two columns) and the two lists written אריח על גבי אריח (Megillah 16b)
- All 150 psalms grouped by attribution (לדוד 73, לבני קרח, לאסף…, without attribution), read from each psalm's first verse by `readPsalmTitle()`, with title-word filters (מזמור, שיר המעלות, תפילה, משכיל…)

### Letter Hints (`/letter-hints`)
- **Initials / finals:** a word spelled by the first or last letters of consecutive words (יבוא המלך והמן היום, Esther 5:4; reversed זה איננו שוה לי, Esther 5:13), within a verse or across verses, letters marked in the pointed text
- **Acrostics:** Psalms 9–10, 25, 34, 37, 111, 112, 119, 145, Proverbs 31:10–31, Lamentations 1–4. Each line's letter is read from the text and aligned to the alphabet, so missing letters (נ in Ps 145) and order changes (פ before ע in Lam 2–4) show up
- **Word squares:** three consecutive words whose columns read like their rows (אמת מארץ תצמח: א|מ|ת / מ|אר|ץ / ת|צ|מח) — 37 in the Tanakh, 6 where the first word is the initials; shown against a shuffled-words baseline, with "add to notebook" to write commentary
- **Letter skips (ELS):** with a grid placing the word in one column; framed as "occurrences", with the count expected by chance shown beside every result, never as hidden messages

### Names of God (`/divine-names`)
- 33 names and titles (`lib/divineNames.ts`), written in full with nikud: the names (with the seven that may not be erased, per Rambam), titles (אֵל עֶלְיוֹן, קְדוֹשׁ יִשְׂרָאֵל…), and names given to a place, altar or city (יְהוָה נִסִּי…). Each with key verses, the name highlighted (prefixes allowed), and its verse count: by Strong's number, or by the exact phrase

### Names of Jerusalem (`/jerusalem-names`)
- 29 traditional names of Jerusalem with their source verses — some resolved live from the DB, others fixed citations

---

## State Management
- **React hooks** (useState, useEffect) — all component state
- **localStorage** — reading position persisted as JSON key `tanakh-position`; special-letters toggle as `tanakh-show-special-letters`; qamats-qatan toggle as `tanakh-show-qamats-qatan`; ketiv/qere mode as `tanakh-ketiv-qere`; custom (Ashkenazi/Sephardi: weekly haftarah and accent names in the accent tree, `lib/custom.ts`) as `tanakh-custom`; division mode as `tanakh-division`; gematria toggle and methods as `tanakh-show-gematria` / `tanakh-gematria-methods`
- **Custom DOM events** — `tanakh-stats-update` dispatched on progress changes to refresh sidebar stats without prop drilling
- **NextAuth / React Context** — global auth session via `useSession()`
- **URL search params** — book/chapter passed between pages (e.g., `/tanakh?book=Genesis&chapter=1`)
- **No Redux / Zustand** — app is lightweight enough for component-level state

---

## Environment Variables
```
DATABASE_URL          # SQLite path (file:./dev.db)
AUTH_SECRET           # Auth.js (NextAuth 5) signing key
AUTH_GOOGLE_ID        # Google OAuth client ID (read automatically by the Google provider)
AUTH_GOOGLE_SECRET    # Google OAuth client secret
GROQ_API_KEY          # Groq LLM API key
ANTHROPIC_API_KEY     # Anthropic API key (installed, reserved for future use)
ADMIN_EMAILS          # Comma-separated emails allowed to delete any share/comment on /community
```

---

## Design
- Full RTL (`dir="rtl"`, `lang="he"`) set on root layout
- Sidebar on the **right** side (Hebrew convention)
- Color palette: stone/amber tones (Tailwind)
- Neshama page overrides palette dynamically by emotion
- Responsive — sidebar collapses to hamburger on mobile
- Geist font via Next.js font optimization
