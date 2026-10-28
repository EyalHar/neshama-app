import { NextRequest, NextResponse } from "next/server";
import { scopeBookIds } from "@/lib/tanakh";
import { getCurrentUserId, getFavoriteVerseKeySet } from "@/lib/favorites";
import { stripDiacritics, groupByVerse, filterToFavorites, resolveVerseGroup, PAGE_SIZE } from "@/lib/rootFamily";
import { getMishkalSummaries, getMishkalWords, getWordRowsByNumber } from "@/lib/mishkal";

// Without `mishkal`: the list of mishkalim with word counts. With it: the verses containing any
// noun/adjective of that mishkal, optionally narrowed to one kind and/or root.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mishkal = searchParams.get("mishkal");
  if (!mishkal) return NextResponse.json({ mishkalim: getMishkalSummaries() });

  const kind = searchParams.get("kind");
  const root = stripDiacritics(searchParams.get("root") ?? "");
  const scope = searchParams.get("scope") ?? "tanakh";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);

  const words = getMishkalWords()
    .filter((w) => w.mishkal === mishkal)
    .filter((w) => kind !== "noun" && kind !== "adjective" ? true : w.kind === kind)
    .filter((w) => !root || w.root === root)
    .sort((a, b) => b.tokens - a.tokens);

  let favoriteKeys: Set<string> | null = null;
  if (searchParams.get("favoritesOnly") === "1") {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ results: [], total: 0, pages: 1, page, pageSize: PAGE_SIZE, words });
    favoriteKeys = await getFavoriteVerseKeySet(userId);
  }

  const rowsByNumber = await getWordRowsByNumber();
  const wordRows = words.flatMap((w) => rowsByNumber.get(w.strongs) ?? []);
  const grouped = groupByVerse(wordRows, scopeBookIds(scope), new Set());
  const { map, occurrences } = filterToFavorites(grouped.verseMap, grouped.occurrences, favoriteKeys);
  const { results, total, pages } = await resolveVerseGroup(map, page);

  return NextResponse.json({ results, total, occurrences, pages, page, pageSize: PAGE_SIZE, words });
}
