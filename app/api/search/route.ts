import { NextRequest, NextResponse } from "next/server";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const SCOPE_FILTERS: Record<string, string> = {
  tanakh: "Tanakh",
  torah: "Tanakh/Torah",
  nevi: "Tanakh/Prophets",
  ketuvim: "Tanakh/Writings",
};

// Single-letter and common double-letter Hebrew prefixes
const HE_PREFIXES = ["ב", "כ", "ל", "ו", "ה", "מ", "ש", "וב", "ול", "וכ", "ומ", "וה", "וש"];

function stripDiacritics(text: string): string {
  return text.replace(/[֑-ׇ]/g, "");
}

async function searchSefaria(
  query: string,
  filter: string,
  size: number
): Promise<Record<string, unknown>[]> {
  const body = { query, filters: [filter], filter_fields: ["path"], size, start: 0 };
  const res = await fetch("https://www.sefaria.org/api/search-wrapper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.hits?.hits ?? [];
}

function parseHits(
  hits: Record<string, unknown>[],
  seen: Set<string>
) {
  return hits.flatMap((hit) => {
    const id: string = (hit._id as string) ?? "";
    const highlightArr = (hit.highlight as Record<string, string[]> | undefined)?.["exact"];
    const rawHighlight: string = highlightArr?.[0] ?? "";

    // Parse ref from _id: "Genesis 1:1 (version info [lang])" → "Genesis 1:1"
    const refMatch = id.match(/^(.+?)\s+\([^)]+\)\s*$/);
    if (!refMatch) return [];
    const ref = refMatch[1].trim();

    if (seen.has(ref)) return [];
    seen.add(ref);

    const parts = ref.match(/^(.+)\s+(\d+):(\d+)$/);
    if (!parts) return [];
    const [, bookId, chapterStr, verseStr] = parts;

    const highlight = rawHighlight
      .replace(/<b>/g, "<em>")
      .replace(/<\/b>/g, "</em>")
      .replace(/<(?!\/?em\b)[^>]*>/g, "");

    return [{
      ref,
      bookId: bookId.trim(),
      chapter: parseInt(chapterStr),
      verse: parseInt(verseStr),
      highlight: highlight || stripDiacritics(ref),
    }];
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const scope = searchParams.get("scope") ?? "tanakh";
  const partial = searchParams.get("partial") === "true";

  if (!query) return NextResponse.json({ results: [], total: 0 });

  const filter = SCOPE_FILTERS[scope] ?? "Tanakh";
  const cleanQuery = stripDiacritics(query);

  let allHits: Record<string, unknown>[];

  if (partial) {
    // Search base word + all prefix variants in parallel
    const variants = [cleanQuery, ...HE_PREFIXES.map((p) => p + cleanQuery)];
    const allResults = await Promise.all(
      variants.map((v) => searchSefaria(v, filter, 100))
    );
    allHits = allResults.flat();
  } else {
    allHits = await searchSefaria(cleanQuery, filter, 200);
  }

  const seen = new Set<string>();
  const results = parseHits(allHits, seen);

  const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));
  results.sort((a, b) => {
    const bookDiff = (bookOrder[a.bookId] ?? 999) - (bookOrder[b.bookId] ?? 999);
    if (bookDiff !== 0) return bookDiff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  return NextResponse.json({ results, total: results.length });
}
