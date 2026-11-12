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
│   │   │   └── grammar/        ← Root/binyan quiz from morphology (no AI)
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
│   │   └── TempleIcon.tsx      ← SVG of Herod's Temple (Jerusalem names icon)
│   ├── admin/seed/page.tsx
│   ├── advanced/page.tsx
│   ├── notebook/               ← page.tsx (list), [id]/page.tsx, NotebookEditor (TipTap), SourceQuote, activeDoc
│   ├── community/              ← page.tsx (feed), ShareCard, CommentThread, format (dates/avatar)
│   ├── events/page.tsx
│   ├── favorites/page.tsx
│   ├── jerusalem-names/page.tsx
│   ├── letter-pairs/           ← page.tsx + LetterWheel (231-gate wheel of letter pairs)
│   ├── characters/             ← page.tsx + CharacterGraph (force-directed network)
│   ├── word-shifts/page.tsx    ← "גלגולי מילים": biblical vs modern meaning
│   ├── parallels/              ← page.tsx (list) + [id]/page.tsx (side-by-side diff of a passage told twice)
│   ├── loanwords/              ← page.tsx + LoanwordsBrowser
│   ├── letters/page.tsx
│   ├── login/page.tsx
│   ├── neshama/page.tsx
│   ├── quiz/                   ← page.tsx (tabs), VerseQuiz, GrammarQuiz, QuizActions, QuizStatus
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
│   ├── wordStats.ts            ← WordEntry parsing + Tanakh-wide frequency counts (cached)
│   ├── gematria.ts             ← Gematria methods (standard, gadol, katan, ordinal)
│   ├── jerusalemNames.ts       ← Static Jerusalem-names dataset
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
| `/` | Home — feature cards linking to all sections |
| `/tanakh` | Main Tanakh reader: chapter selector, verse marking, progress, confetti, notes, leitwords, commentaries |
| `/community` | Shared notes/insights from all users, with likes and threaded comments (signed-in only) |
| `/letters` | Redirects to `/advanced?tab=letters` (the letter search is now a search tab) |
| `/advanced` | Multi-tab search: basic, substring, root + binyan (direct/etymological), word family, first/last letter. `?tab=` opens a tab directly |
| `/quiz` | Two tabs: fill-in-the-blank verse quiz (AI) and grammar quiz (root/binyan, 3 levels) |
| `/neshama` | AI feature: describe emotional state → get matching Tanakh verses |
| `/unknown-roots` | Crowdsourced table to fill in missing Strong's roots |
| `/notebook` | "המחברת שלי": personal pages (TipTap editor) for a dvar Torah or summary, collecting verses, notes and commentary excerpts with their sources |
| `/favorites` | The user's favorite verses and chapters, grouped by book |
| `/events` | Enter a biblical event → all source verses that mention it |
| `/unique-words` | Hapax legomena — words occurring only once in the Tanakh |
| `/special-letters` | All large, small and suspended letters and inverted nuns, linked to the reader |
| `/jerusalem-names` | Names of Jerusalem with their source verses |
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
- `GET /api/tanakh?book=&chapter=` or `?book=&from=c:v&to=c:v` — Fetch a chapter or a verse range (parasha/parashiya) from Sefaria + user's read/favorite status, all keyed by chapter:verse; a range also returns `sections` (parashiyot with per-section leitwords) and `chapterVerseCounts`; also returns `specialLetters` (`{ verse, start, end, kind }[]` offsets of large/small/suspended letters and inverted nuns), `leitwords` (`{ strongs, lemmaHe, count, ratio, forms }[]`) and the user's `notes`
- `POST /api/tanakh` — Toggle single verse read
- `POST /api/tanakh/bulk` — Mark/clear a chapter, or a verse range (`completeRange` / `clearRange`)
- `GET /api/tanakh/units?book=` — Parashot (Torah) or parashiyot (other books) for division mode
- `GET /api/tanakh/weekly` — This week's parasha and haftarah (Israel), from Sefaria's calendar
- `DELETE /api/tanakh/reset` — Reset all user progress
- `GET /api/tanakh/stats` — Total completed chapters count

### Verse Search
- `GET /api/verses/substring?q=&scope=&whole=&page=` — Word/substring search (500/page)
- `GET /api/verses/root?root=&stem=&form=&scope=&view=direct|etymological&page=` — Root search via Strong's family tree, optionally intersected with a verb stem (binyan) and/or verb form filter (`form`: perfect, imperfect, imperative, participle, infinitive, infAbsolute — see `VERB_FORMS` in `lib/rootFamily.ts`); `root`, `stem` and `form` are each optional but at least one is required (200/page)
- `GET /api/verses/mishkal?mishkal=&kind=noun|adjective&root=&scope=&page=` — Verses containing nouns/adjectives of a mishkal (per Gesenius §84–86), from the `data/noun-patterns/` snapshots; without `mishkal`, the list of mishkalim with counts (200/page)
- `GET /api/verses/roots?l1=&l2=&l3=&l4=&scope=` — Verb roots whose letters match (empty = any; `l4` empty = triliteral, `*`/letter = quadriliteral; at least one required), with occurrence counts in the scope
- `GET /api/verses/root-hint?root=` — For a typed 4+ letter root (e.g. כלכל), the triliteral roots its verb forms are filed under (כול)
- `GET /api/verses/letters?first=&last=` — First/last Hebrew letter match
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
- "סמן קמץ קטן" checkbox — colors every letter carrying a qamats qatan (U+05C7 in Sefaria's text, which most fonts draw like a regular qamats), so כׇּל reads differently from כָּל
- "חישוב גימטריה" checkbox — hovering a word (tapping, on touch screens) shows its gematria; selecting letters, even across verses, shows their sum while selecting. A settings popover picks the methods shown: standard, gadol (final letters 500–900), katan, ordinal (`lib/gematria.ts`). Words joined by maqaf count separately; verse numbers in a selection are ignored
- Leitwords (מילים מנחות) — up to 5 roots the chapter repeats far above their Tanakh-wide rate (log-likelihood vs. corpus frequency); clicking one highlights all its occurrences in the chapter

### Advanced Search
- **Basic / Substring** — Hebrew text search with pagination
- **Root + Binyan Search** — Enter a Hebrew root and/or filter by verb stem (Qal, Niphal, Piel, Pual, Hiphil, Hophal, Hithpael) and/or verb form (perfect, imperfect, imperative, participle, infinitive construct, infinitive absolute); when several are set, results are intersected (word must match the root family *and* the chosen binyan). Root alone maps to a Strong's number and BFS-expands to the full family tree with a direct vs. etymological view toggle; binyan alone (no root) is a plain morph-code filter with no etymological view. Scope filter (All / Torah / Nevi'im / Ketuvim)
- **Roots by Letters** — Three letter selectors (one per root position, each "any" or one of 22 letters) list every matching verb root with its count in the chosen scope; clicking a root runs the root search
- **What is the root? (`?tab=analyze`)** — Type a word as it appears in a verse (רדידי) → its dictionary entry (רָדִיד), how it is built (noun, construct + possessive "שלי"), and Strong's chain to the root (← רָדַד), with a button opening the root's whole family. The same analysis appears above the substring search results (not the basic search, to keep it light)
- **First/Last Letter in Verse** — Verses starting and/or ending with chosen Hebrew letters

### Neshama (Soul)
- User writes their emotional state and optional wish in Hebrew
- Groq LLM detects emotion (9 categories: sadness, fear, loneliness, hope, loss, anger, love, illness, default)
- Returns 2–3 Tanakh verses with explanations and a personal encouragement message
- Page color theme changes dynamically by detected emotion

### Quiz
- **Verse tab:** AI selects a random verse, blanks one meaningful word, generates 4 options
- **Grammar tab:** identify the root or binyan of a highlighted verb in its verse; mixed/root/binyan × easy/medium/hard. Built from OSHB data only (no AI). Harder levels use rarer roots and look-alike distractor roots. After a correct answer, shows the word's full parse (binyan, tense, person/gender/number) and a first-try streak
- In both: mark the verse as read and jump to it in the reader

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

### Names of Jerusalem (`/jerusalem-names`)
- 29 traditional names of Jerusalem with their source verses — some resolved live from the DB, others fixed citations

---

## State Management
- **React hooks** (useState, useEffect) — all component state
- **localStorage** — reading position persisted as JSON key `tanakh-position`; special-letters toggle as `tanakh-show-special-letters`; qamats-qatan toggle as `tanakh-show-qamats-qatan`; division mode as `tanakh-division`; gematria toggle and methods as `tanakh-show-gematria` / `tanakh-gematria-methods`
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
