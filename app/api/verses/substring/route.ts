import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, scopeBookIds } from "@/lib/tanakh";


type VerseRow = { book: string; chapter: number; verse: number; text: string; plainText: string };
type CountRow = { total: number | bigint; occurrences: number | bigint | null };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 500;
  const offset = (page - 1) * pageSize;

  if (!q || q.length < 2) return NextResponse.json({ results: [], total: 0, occurrences: 0, page, pageSize });

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

  // Count not just matching verses but total occurrences of q within them, via the
  // standard SQL trick: (length of text - length with q removed) / length of q.
  // In "whole" mode, occurrences are space-padded so e.g. "משה" doesn't count "ומשה".
  const occurrencesExpr = whole
    ? `SUM((LENGTH(' ' || plainText || ' ') - LENGTH(REPLACE(' ' || plainText || ' ', ?, ''))) / LENGTH(?))`
    : `SUM((LENGTH(plainText) - LENGTH(REPLACE(plainText, ?, ''))) / LENGTH(?))`;
  const occurrencesArgs = whole ? [` ${q} `, ` ${q} `] : [q, q];

  const [countRows, rows] = await Promise.all([
    prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) as total, ${occurrencesExpr} as occurrences FROM "VerseText" WHERE ${matchClause} ${scopeFilter}`,
      ...occurrencesArgs, ...matchArgs, ...scopeArgs
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
  const occurrences = countRows[0]?.occurrences != null ? Number(countRows[0].occurrences) : null;

  const results = rows.map((r) => ({
    ...r,
    bookHe: TANAKH_BOOKS.find((b) => b.id === r.book)?.he ?? r.book,
  }));

  return NextResponse.json({ results, total, occurrences, page, pageSize, pages: Math.ceil(total / pageSize) });
}
