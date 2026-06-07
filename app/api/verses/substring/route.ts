import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, scopeBookIds } from "@/lib/tanakh";


type VerseRow = { book: string; chapter: number; verse: number; text: string; plainText: string };
type CountRow = { total: number | bigint };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 500;
  const offset = (page - 1) * pageSize;

  if (!q || q.length < 2) return NextResponse.json({ results: [], total: 0, page, pageSize });

  const scope = searchParams.get("scope") ?? "tanakh";
  const bookIds = scopeBookIds(scope);
  const scopeFilter = bookIds ? `AND book IN (${bookIds.map(() => "?").join(",")})` : "";
  const scopeArgs = bookIds ?? [];

  // "whole" mode matches q as a complete word/phrase (space-bounded in plainText),
  // so a search for "משה" doesn't match inside "חמשה". Plain mode matches any substring.
  const whole = searchParams.get("whole") === "1";
  const matchClause = whole
    ? `(plainText = ? OR plainText LIKE ? OR plainText LIKE ? OR plainText LIKE ?)`
    : `plainText LIKE ?`;
  const matchArgs = whole ? [q, `${q} %`, `% ${q}`, `% ${q} %`] : [`%${q}%`];

  const bookOrderCase = TANAKH_BOOKS.map((b, i) => `WHEN '${b.id}' THEN ${i}`).join(" ");

  const [countRows, rows] = await Promise.all([
    prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) as total FROM "VerseText" WHERE ${matchClause} ${scopeFilter}`, ...matchArgs, ...scopeArgs
    ),
    prisma.$queryRawUnsafe<VerseRow[]>(
      `SELECT book, chapter, verse, text, plainText FROM "VerseText"
       WHERE ${matchClause} ${scopeFilter}
       ORDER BY CASE book ${bookOrderCase} ELSE 999 END, chapter, verse
       LIMIT ? OFFSET ?`,
      ...matchArgs, ...scopeArgs, pageSize, offset
    ),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  const results = rows.map((r) => ({
    ...r,
    bookHe: TANAKH_BOOKS.find((b) => b.id === r.book)?.he ?? r.book,
  }));

  return NextResponse.json({ results, total, page, pageSize, pages: Math.ceil(total / pageSize) });
}
