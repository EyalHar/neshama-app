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

npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma migrate dev       # Apply new migration (creates migration file)
npx prisma migrate deploy    # Apply migrations in prod
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

### Root search BFS
`GET /api/verses/root` resolves a Hebrew root to a Strong's number, then does a BFS through `StrongsEntry.derivedFrom` (comma-separated Strong's numbers) to build a family tree. "Direct" view shows only the queried root's verses; "etymological" view includes all descendants.

### Book IDs
Book IDs are English (`"Genesis"`, `"I Samuel"`, etc.) — they must match Sefaria's reference format exactly. The canonical list is `TANAKH_BOOKS` in `lib/tanakh.ts`. Never use Hebrew names as database keys.

### Seeding
The DB must be seeded before search features work. Use `/admin/seed` (UI) or `POST /api/admin/seed-oshb` + `POST /api/admin/seed-strongs`. Seeding is split into Torah/Nevi'im/Ketuvim sections for resumability and to avoid request timeouts.
