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

---

## Directory Structure
```
neshama-app/
├── app/
│   ├── api/                    ← All API routes
│   │   ├── auth/[...nextauth]/ ← NextAuth handler
│   │   ├── neshama/            ← AI verse-by-emotion endpoint
│   │   ├── quiz/               ← AI quiz generation endpoint
│   │   ├── tanakh/             ← Reading progress CRUD + stats
│   │   │   ├── bulk/           ← Batch chapter complete/clear
│   │   │   ├── reset/          ← Delete all user progress
│   │   │   └── stats/          ← Completed chapters count
│   │   ├── verses/
│   │   │   ├── binyan/         ← Search by Hebrew verb stem
│   │   │   ├── letters/        ← Search by first/last letter
│   │   │   ├── root/           ← Search by Hebrew root (+ etymological)
│   │   │   └── substring/      ← Substring / basic word search
│   │   └── admin/
│   │       ├── seed-oshb/      ← Seed morphology data
│   │       └── seed-strongs/   ← Seed Strong's dictionary
│   ├── components/
│   │   ├── Sidebar.tsx         ← Main navigation (right side, RTL)
│   │   ├── SessionWrapper.tsx  ← NextAuth provider
│   │   └── Confetti.tsx        ← Milestone celebration animation
│   ├── admin/seed/page.tsx
│   ├── advanced/page.tsx
│   ├── letters/page.tsx
│   ├── login/page.tsx
│   ├── neshama/page.tsx
│   ├── quiz/page.tsx
│   ├── tanakh/page.tsx
│   ├── unknown-roots/page.tsx
│   ├── page.tsx                ← Home / landing page
│   └── layout.tsx              ← Root layout: RTL, Sidebar, SessionWrapper
├── lib/
│   ├── prisma.ts               ← Singleton PrismaClient
│   └── tanakh.ts               ← Book metadata, Hebrew numerals, Sefaria fetch helper
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
| `/tanakh` | Main Tanakh reader: chapter selector, verse marking, progress, confetti |
| `/letters` | Search verses by first and/or last Hebrew letter |
| `/advanced` | Multi-tab search: basic, substring, root (direct/etymological), binyan |
| `/quiz` | Fill-in-the-blank verse quiz with 4-choice answers |
| `/neshama` | AI feature: describe emotional state → get matching Tanakh verses |
| `/unknown-roots` | Crowdsourced table to fill in missing Strong's roots |
| `/login` | Google OAuth login |
| `/admin/seed` | Database seeding UI (OSHB morphology + Strong's dictionary) |

---

## Database Models (Prisma / SQLite)

| Model | Purpose |
|---|---|
| `User` | NextAuth user (cuid, email, name, image) |
| `Account` | OAuth account linking |
| `Session` | NextAuth sessions |
| `ReadVerse` | Individual verses marked read (userId, book, chapter, verse) |
| `CompletedChapter` | Entire chapters marked complete (userId, book, chapter) |
| `VerseText` | Full Tanakh with diacritics (`text`), plain text (`plainText`), first/last letter index |
| `WordEntry` | Morphological analysis per word (lemma, Strong's number, morph code) |
| `StrongsEntry` | Strong's Hebrew Dictionary (number, lemmaHe, lemmaPlain, xlit, definition, derivedFrom) |
| `UnknownRoot` | Strong's entries with no parent root; crowdsourced suggestions |
| `VerificationToken` | NextAuth email verification |

---

## API Routes Summary

### Tanakh Progress
- `GET /api/tanakh?book=&chapter=` — Fetch chapter from Sefaria + user's read status
- `POST /api/tanakh` — Toggle single verse read
- `POST /api/tanakh/bulk` — Mark/clear entire chapter
- `DELETE /api/tanakh/reset` — Reset all user progress
- `GET /api/tanakh/stats` — Total completed chapters count

### Verse Search
- `GET /api/verses/substring?q=&scope=&whole=&page=` — Word/substring search (500/page)
- `GET /api/verses/root?root=&scope=&view=direct|etymological&page=` — Root search via Strong's family tree (200/page)
- `GET /api/verses/binyan?stem=&scope=&page=` — Verb stem (binyan) filter
- `GET /api/verses/letters?first=&last=` — First/last Hebrew letter match

### AI
- `POST /api/neshama` — Groq: detect emotion → return 2–3 matching verses with message
- `POST /api/quiz` — Groq: generate fill-in-the-blank quiz from random Tanakh verse

---

## Key Features

### Tanakh Reader
- Verse-by-verse marking with persistent progress (Google account)
- Chapter/book/section/entire Tanakh completion milestones
- Celebration modals with confetti animations and Web Audio API sounds
- Resume from last position (localStorage + URL params)
- Random chapter/book/verse jump buttons

### Advanced Search
- **Basic / Substring** — Hebrew text search with pagination
- **Root Search** — Enter Hebrew root, maps to Strong's number, BFS expands to full family tree; toggle direct vs. etymological view; scope filter (All / Torah / Nevi'im / Ketuvim)
- **Binyan Search** — Filter by verb stem: Qal, Niphal, Piel, Pual, Hiphil, Hophal, Hithpael
- **Letter Search** — Verses starting and/or ending with chosen Hebrew letters

### Neshama (Soul)
- User writes their emotional state and optional wish in Hebrew
- Groq LLM detects emotion (9 categories: sadness, fear, loneliness, hope, loss, anger, love, illness, default)
- Returns 2–3 Tanakh verses with explanations and a personal encouragement message
- Page color theme changes dynamically by detected emotion

### Quiz
- AI selects a random verse, blanks one meaningful word, generates 4 options
- User answers, can mark verse as read, and link to full chapter

### Unknown Roots Crowdsourcing
- Table of Strong's entries with no `derivedFrom` parent
- Shows one sample verse per entry for context
- Users can propose a root; progress counter (X of Y filled)

---

## State Management
- **React hooks** (useState, useEffect) — all component state
- **localStorage** — reading position persisted as JSON key `tanakh-position`
- **Custom DOM events** — `tanakh-stats-update` dispatched on progress changes to refresh sidebar stats without prop drilling
- **NextAuth / React Context** — global auth session via `useSession()`
- **URL search params** — book/chapter passed between pages (e.g., `/tanakh?book=Genesis&chapter=1`)
- **No Redux / Zustand** — app is lightweight enough for component-level state

---

## Environment Variables
```
DATABASE_URL          # SQLite path (file:./dev.db)
NEXTAUTH_SECRET       # NextAuth signing key
NEXTAUTH_URL          # Base URL for OAuth callbacks
GOOGLE_ID             # Google OAuth client ID
GOOGLE_SECRET         # Google OAuth client secret
GROQ_API_KEY          # Groq LLM API key
ANTHROPIC_API_KEY     # Anthropic API key (installed, reserved for future use)
```

---

## Design
- Full RTL (`dir="rtl"`, `lang="he"`) set on root layout
- Sidebar on the **right** side (Hebrew convention)
- Color palette: stone/amber tones (Tailwind)
- Neshama page overrides palette dynamically by emotion
- Responsive — sidebar collapses to hamburger on mobile
- Geist font via Next.js font optimization
