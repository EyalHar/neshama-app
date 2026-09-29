import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scopeBookIds } from "@/lib/tanakh";
import { getCurrentUserId, getFavoriteVerseKeySet } from "@/lib/favorites";
import {
  stripDiacritics,
  collectRootFamily,
  resolveUltimateRoots,
  fetchStrongsMeta,
  fetchWordRows,
  groupByVerse,
  filterToFavorites,
  resolveVerseGroup,
  PAGE_SIZE,
  type WordRow,
  type VerseGroup,
} from "@/lib/rootFamily";

// This route answers a different question from `/api/verses/root`: given ANY typed word
// (which may itself be a derived form, not a root), find every word in the Tanakh that
// shares its ultimate etymological root — including siblings/cousins the typed word is not
// a direct ancestor of. `/api/verses/root`'s BFS only walks DOWN (descendants of a typed
// root); this route first walks UP from the typed word to its ultimate root(s) via
// `resolveUltimateRoots()`, then reuses the same downward BFS (`collectRootFamily()`) from
// there. See lib/rootFamily.ts for the shared pieces.

type FamilyGroup = {
  key: string;
  seedNumbers: string[];
  rootNumbers: string[];
  verseMap: Map<string, VerseGroup>;
  occurrences: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = stripDiacritics(searchParams.get("word")?.trim() ?? "");
  const scope = searchParams.get("scope") ?? "tanakh";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const requestedGroup = searchParams.get("group") ?? null;

  if (word.length < 2) return NextResponse.json({ results: [], total: 0, pages: 1, page, pageSize: PAGE_SIZE, groups: [] });

  const bookIds = scopeBookIds(scope);

  // Favorites-only filter — restrict results to the signed-in user's favorited verses
  const favoritesOnly = searchParams.get("favoritesOnly") === "1";
  let favoriteKeys: Set<string> | null = null;
  if (favoritesOnly) {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ results: [], total: 0, pages: 1, page, pageSize: PAGE_SIZE, groups: [] });
    favoriteKeys = await getFavoriteVerseKeySet(userId);
  }

  // Step 1: resolve the typed word to seed Strong's number(s) — same lookup as /api/verses/root
  type SeedRow = { number: string; lemmaHe: string; definition: string };
  const seedRows = await prisma.$queryRawUnsafe<SeedRow[]>(
    `SELECT number, lemmaHe, definition FROM "StrongsEntry" WHERE lemmaPlain LIKE ?`,
    `%${word}%`
  );

  // Fallback: Strong's dictionary not seeded — degrade to a plain WordEntry.plain match with
  // no etymological expansion, same fallback /api/verses/root uses in this situation.
  if (seedRows.length === 0) {
    type OldLemmaRow = { lemma: string };
    const lemmaRows = await prisma.$queryRawUnsafe<OldLemmaRow[]>(
      `SELECT DISTINCT lemma FROM "WordEntry" WHERE plain = ?`, word
    );
    if (lemmaRows.length === 0) {
      return NextResponse.json({ results: [], total: 0, pages: 1, page, pageSize: PAGE_SIZE, groups: [] });
    }
    const nums = [...new Set(lemmaRows.map((r) => r.lemma.replace(/^[a-z/]+/, "").trim()).filter(Boolean))];
    const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
      `SELECT book, chapter, verse, word FROM "WordEntry" WHERE ${nums.map(() => `lemma LIKE ?`).join(" OR ")}`,
      ...nums.map((n) => `%${n}`)
    );
    const grouped = groupByVerse(wordRows, bookIds, new Set());
    const { map: verseMap, occurrences } = filterToFavorites(grouped.verseMap, grouped.occurrences, favoriteKeys);
    const { results, total, pages } = await resolveVerseGroup(verseMap, page);
    return NextResponse.json({ results, total, occurrences, pages, page, pageSize: PAGE_SIZE, groups: [], fallback: true });
  }

  // Step 2: walk UP from each seed to its ultimate root(s). Seeds that resolve to the same
  // root-signature are merged into one group; seeds landing on a different signature (true
  // homographs — same spelling, unrelated dictionary entries, e.g. a fruit vs. a place name)
  // become separate groups so they are never silently conflated.
  const rootsBySeed = new Map<string, string[]>();
  for (const seed of seedRows) {
    rootsBySeed.set(seed.number, await resolveUltimateRoots([seed.number]));
  }

  const groupsBySig = new Map<string, { rootNumbers: string[]; seedNumbers: string[] }>();
  for (const seed of seedRows) {
    const roots = rootsBySeed.get(seed.number)!;
    const sig = [...roots].sort().join(",");
    if (!groupsBySig.has(sig)) groupsBySig.set(sig, { rootNumbers: roots, seedNumbers: [] });
    groupsBySig.get(sig)!.seedNumbers.push(seed.number);
  }

  // Step 3 + 4: for each group, BFS back down from its ultimate root(s) and union with the
  // seed(s) themselves — the full etymological family for that word-sense.
  const groups: FamilyGroup[] = [];
  for (const [sig, g] of groupsBySig) {
    const family = new Set<string>([...(await collectRootFamily(g.rootNumbers)), ...g.seedNumbers]);
    const wordRows = await fetchWordRows([...family], null);
    const grouped = groupByVerse(wordRows, bookIds, new Set());
    const { map: verseMap, occurrences } = filterToFavorites(grouped.verseMap, grouped.occurrences, favoriteKeys);
    groups.push({ key: sig, seedNumbers: g.seedNumbers, rootNumbers: g.rootNumbers, verseMap, occurrences });
  }

  // Largest family first — the most likely "main" sense of the typed word.
  groups.sort((a, b) => b.verseMap.size - a.verseMap.size);

  const activeGroup = groups.find((g) => g.key === requestedGroup) ?? groups[0];

  // Fetch display metadata (Hebrew lemma + definition) for every seed and root number across
  // all groups in one batch, to label the group switcher.
  const allNumbers = groups.flatMap((g) => [...g.seedNumbers, ...g.rootNumbers]);
  const metaMap = await fetchStrongsMeta(allNumbers);

  function labelGroup(g: FamilyGroup) {
    const seedLemmas = [...new Set(g.seedNumbers.map((n) => metaMap.get(n)?.lemmaHe).filter(Boolean))];
    const rootLemmas = [...new Set(g.rootNumbers.map((n) => metaMap.get(n)?.lemmaHe).filter(Boolean))];
    const isOwnRoot = g.rootNumbers.length === g.seedNumbers.length &&
      g.rootNumbers.every((n) => g.seedNumbers.includes(n));
    const definition = metaMap.get(g.seedNumbers[0])?.definition ?? "";
    return {
      key: g.key,
      label: seedLemmas.join(" / ") || "?",
      rootLabel: isOwnRoot ? null : rootLemmas.join(" / "),
      definition,
      total: g.verseMap.size,
    };
  }

  const { results, total, pages } = await resolveVerseGroup(activeGroup.verseMap, page);

  return NextResponse.json({
    results,
    total,
    occurrences: activeGroup.occurrences,
    pages,
    page,
    pageSize: PAGE_SIZE,
    groups: groups.map(labelGroup),
    activeGroup: activeGroup.key,
  });
}
