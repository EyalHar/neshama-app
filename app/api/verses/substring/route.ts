import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

type VerseRow = { book: string; chapter: number; verse: number; text: string; plainText: string };
type CountRow = { total: number | bigint };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 500;
  const offset = (page - 1) * pageSize;

  if (!q || q.length < 2) return NextResponse.json({ results: [], total: 0, page, pageSize });

  const [countRows, rows] = await Promise.all([
    prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) as total FROM "VerseText" WHERE plainText LIKE ?`, `%${q}%`
    ),
    prisma.$queryRawUnsafe<VerseRow[]>(
      `SELECT book, chapter, verse, text, plainText FROM "VerseText"
       WHERE plainText LIKE ?
       ORDER BY (SELECT idx FROM (
         SELECT book as b, MIN(verseIndex) as idx FROM "VerseText" GROUP BY book
       ) WHERE b = book) + chapter * 1000 + verse
       LIMIT ? OFFSET ?`,
      `%${q}%`, pageSize, offset
    ).catch(() =>
      // fallback without subquery if it fails
      prisma.$queryRawUnsafe<VerseRow[]>(
        `SELECT book, chapter, verse, text, plainText FROM "VerseText" WHERE plainText LIKE ? LIMIT ? OFFSET ?`,
        `%${q}%`, pageSize, offset
      )
    ),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

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

  return NextResponse.json({ results, total, page, pageSize, pages: Math.ceil(total / pageSize) });
}
