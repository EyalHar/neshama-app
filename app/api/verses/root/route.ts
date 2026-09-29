import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scopeBookIds } from "@/lib/tanakh";
import { getCurrentUserId, getFavoriteVerseKeySet } from "@/lib/favorites";
import {
  stripDiacritics,
  collectRootFamily,
  fetchWordRows,
  fetchWordRowsByStem,
  groupByVerse,
  filterToFavorites,
  resolveVerseGroup,
  stemGlob,
  PAGE_SIZE,
  type WordRow,
} from "@/lib/rootFamily";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const root = stripDiacritics(searchParams.get("root")?.trim() ?? "");
  const stem = searchParams.get("stem")?.trim() || null;
  const scope = searchParams.get("scope") ?? "tanakh";
  const view = searchParams.get("view") === "etymological" ? "etymological" : "direct";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const hasRoot = root.length >= 2;
  if (!hasRoot && !stem) return NextResponse.json({ results: [] });

  const bookIds = scopeBookIds(scope);

  // Favorites-only filter — restrict results to the signed-in user's favorited verses
  const favoritesOnly = searchParams.get("favoritesOnly") === "1";
  let favoriteKeys: Set<string> | null = null;
  if (favoritesOnly) {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ results: [], total: 0, pages: 1, page, pageSize: PAGE_SIZE, directTotal: 0, etymologicalTotal: 0 });
    favoriteKeys = await getFavoriteVerseKeySet(userId);
  }

  // Binyan-only search: no root given, filter by verb stem alone — no root family, so no
  // etymological view is possible.
  if (!hasRoot) {
    const wordRows = await fetchWordRowsByStem(stem!);
    const grouped = groupByVerse(wordRows, bookIds, new Set());
    const { map: verseMap, occurrences } = filterToFavorites(grouped.verseMap, grouped.occurrences, favoriteKeys);
    const { results, total, pages } = await resolveVerseGroup(verseMap, page);
    return NextResponse.json({ results, total, occurrences, pages, page, pageSize: PAGE_SIZE, directTotal: total, etymologicalTotal: 0 });
  }

  // Step 1: find seed Strong's numbers by lemmaPlain match
  type LemmaRow = { number: string };
  const seedRows = await prisma.$queryRawUnsafe<LemmaRow[]>(
    `SELECT number FROM "StrongsEntry" WHERE lemmaPlain LIKE ?`,
    `%${root}%`
  );

  // Fallback: old method via WordEntry.plain if Strong's not seeded — direct match only, no etymological expansion
  if (seedRows.length === 0) {
    type OldLemmaRow = { lemma: string };
    const lemmaRows = await prisma.$queryRawUnsafe<OldLemmaRow[]>(
      `SELECT DISTINCT lemma FROM "WordEntry" WHERE plain = ?`, root
    );
    if (lemmaRows.length === 0) {
      return NextResponse.json({ results: [], total: 0, pages: 1, page, pageSize: PAGE_SIZE, directTotal: 0, etymologicalTotal: 0 });
    }

    const nums = [...new Set(lemmaRows.map((r) => r.lemma.replace(/^[a-z/]+/, "").trim()).filter(Boolean))];
    const stemFilter = stem ? ` AND morph GLOB ?` : "";
    const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
      `SELECT book, chapter, verse, word FROM "WordEntry" WHERE (${nums.map(() => `lemma LIKE ?`).join(" OR ")})${stemFilter}`,
      ...nums.map((n) => `%${n}`), ...(stem ? [stemGlob(stem)] : [])
    );
    const grouped = groupByVerse(wordRows, bookIds, new Set());
    const { map: verseMap, occurrences } = filterToFavorites(grouped.verseMap, grouped.occurrences, favoriteKeys);
    const { results, total, pages } = await resolveVerseGroup(verseMap, page);
    return NextResponse.json({ results, total, occurrences, pages, page, pageSize: PAGE_SIZE, directTotal: total, etymologicalTotal: 0 });
  }

  // Step 2: BFS to collect the full root family, keeping track of which numbers were directly
  // seeded by the search vs. reached only through the derivation-chain expansion
  const seedNumbers = seedRows.map((r) => r.number);
  const seedSet = new Set(seedNumbers);
  const family = await collectRootFamily(seedNumbers);
  const etymNumbers = family.filter((n) => !seedSet.has(n));

  // Step 3: fetch direct matches and etymologically-expanded matches separately
  const [directWordRows, etymWordRows] = await Promise.all([
    fetchWordRows(seedNumbers, stem),
    fetchWordRows(etymNumbers, stem),
  ]);

  const directGrouped = groupByVerse(directWordRows, bookIds, new Set());
  // A verse that already appears among the direct matches stays there — etymological list only
  // holds verses reached exclusively through the expanded (non-seed) family
  const etymGrouped = groupByVerse(etymWordRows, bookIds, new Set(directGrouped.verseMap.keys()));

  const { map: directVerseMap, occurrences: directOccurrences } = filterToFavorites(directGrouped.verseMap, directGrouped.occurrences, favoriteKeys);
  const { map: etymVerseMap, occurrences: etymOccurrences } = filterToFavorites(etymGrouped.verseMap, etymGrouped.occurrences, favoriteKeys);

  // Only resolve (fetch verse text + paginate) the view the client is currently displaying
  const activeMap = view === "etymological" ? etymVerseMap : directVerseMap;
  const activeOccurrences = view === "etymological" ? etymOccurrences : directOccurrences;
  const { results, total, pages } = await resolveVerseGroup(activeMap, page);

  return NextResponse.json({
    results,
    total,
    occurrences: activeOccurrences,
    pages,
    page,
    pageSize: PAGE_SIZE,
    directTotal: directVerseMap.size,
    etymologicalTotal: etymVerseMap.size,
  });
}
