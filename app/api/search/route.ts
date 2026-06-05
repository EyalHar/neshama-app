import { NextRequest, NextResponse } from "next/server";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const SCOPE_FILTERS: Record<string, string> = {
  tanakh: "Tanakh",
  torah: "Tanakh/Torah",
  nevi: "Tanakh/Prophets",
  ketuvim: "Tanakh/Writings",
};

function stripDiacritics(text: string): string {
  return text.replace(/[֑-ׇ]/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const scope = searchParams.get("scope") ?? "tanakh";

  if (!query) return NextResponse.json({ results: [], total: 0 });

  const filter = SCOPE_FILTERS[scope] ?? "Tanakh";
  const cleanQuery = stripDiacritics(query);

  const body = { query: cleanQuery, filters: [filter], filter_fields: ["path"], size: 800, start: 0 };
  const res = await fetch("https://www.sefaria.org/api/search-wrapper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return NextResponse.json({ error: "Search failed" }, { status: 500 });

  const data = await res.json();
  const hits: Record<string, unknown>[] = data.hits?.hits ?? [];

  const seen = new Set<string>();
  const results = hits.flatMap((hit) => {
    const id: string = (hit._id as string) ?? "";

    // Filter out non-Hebrew results (e.g. English translations)
    if (!id.includes("[he]")) return [];

    const highlightArr = (hit.highlight as Record<string, string[]> | undefined)?.["exact"];
    const rawHighlight: string = highlightArr?.[0] ?? "";

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

  const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));
  results.sort((a, b) => {
    const bookDiff = (bookOrder[a.bookId] ?? 999) - (bookOrder[b.bookId] ?? 999);
    if (bookDiff !== 0) return bookDiff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  return NextResponse.json({ results, total: results.length });
}
