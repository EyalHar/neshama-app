import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseRef } from "@/lib/divisions";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const MAX_VERSES = 400;

// GET /api/passage-text?book=Exodus&from=15:1&to=15:18 — a range's verses with nikud (no ta'amim),
// from the local VerseText table. Used to open a song or prayer in place.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const book = searchParams.get("book") ?? "";
  const from = parseRef(searchParams.get("from"));
  const to = parseRef(searchParams.get("to"));
  if (!TANAKH_BOOKS.some((b) => b.id === book) || !from || !to) {
    return NextResponse.json({ error: "Missing book or range" }, { status: 400 });
  }

  const [first, last] = await Promise.all(
    [from, to].map(([chapter, verse]) =>
      prisma.verseText.findUnique({ where: { book_chapter_verse: { book, chapter, verse } }, select: { verseIndex: true } })
    )
  );
  if (!first || !last || last.verseIndex < first.verseIndex || last.verseIndex - first.verseIndex >= MAX_VERSES) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const verses = await prisma.verseText.findMany({
    where: { verseIndex: { gte: first.verseIndex, lte: last.verseIndex } },
    select: { chapter: true, verse: true, text: true },
    orderBy: { verseIndex: "asc" },
  });
  // Meteg survives in VerseText.text; drop it for display
  return NextResponse.json({ verses: verses.map((v) => ({ ...v, text: v.text.replace(/ֽ/g, "") })) });
}
