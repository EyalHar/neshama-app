import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const first = searchParams.get("first")?.trim();
  const last = searchParams.get("last")?.trim();

  if (!first || !last) return NextResponse.json({ results: [] });

  const rows = await prisma.verseText.findMany({
    where: { firstLetter: first, lastLetter: last },
    select: { book: true, chapter: true, verse: true, text: true },
    take: 200,
  });

  rows.sort((a, b) => {
    const diff = (bookOrder[a.book] ?? 999) - (bookOrder[b.book] ?? 999);
    if (diff !== 0) return diff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  const results = rows.map((r) => ({
    ...r,
    bookHe: TANAKH_BOOKS.find((b) => b.id === r.book)?.he ?? r.book,
  }));

  return NextResponse.json({ results, total: results.length });
}
