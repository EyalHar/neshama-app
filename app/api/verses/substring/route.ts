import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, scopeBookIds } from "@/lib/tanakh";
import { getCurrentUserId } from "@/lib/favorites";


type VerseRow = { book: string; chapter: number; verse: number; text: string; plainText: string };
type CountRow = { total: number | bigint; occurrences: number | bigint | null };

// Same ta'amim (cantillation) ranges stripped at seed time when building VerseText.text
// (see stripCantillation() in app/api/admin/seed-oshb/route.ts) — kept consistent so a
// pasted query with trope marks still matches the stored, nikud-preserved text.
// Meteg (U+05BD) is a secondary-stress mark outside that cantillation range, so it survived
// into VerseText.text at seed time — but users think of it as a trope-like mark too, so it's
// ignored here at query time on both sides of the comparison (query text + stored column).
const METEG = "ֽ";
function stripTaamim(text: string): string {
  return text.replace(/[֑-֯׀׃׆]/g, "").split(METEG).join("").replace(/\//g, "").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQ = searchParams.get("q")?.trim();

  // Nikud-exact mode matches against VerseText.text (nikud kept, ta'amim stripped at seed
  // time) instead of VerseText.plainText (letters only). Strip any ta'amim/meteg from the
  // query itself first, so pasted trope marks are ignored while nikud differences still count.
  const nikudMode = searchParams.get("nikud") === "1";
  const q = nikudMode ? (rawQ ? stripTaamim(rawQ) : rawQ) : rawQ;
  // METEG is a fixed internal constant (not user input), so inlining it into the SQL
  // expression here is safe — REPLACE strips it from the stored column before matching,
  // without needing to touch already-seeded VerseText rows.
  const column = nikudMode ? `REPLACE(text, '${METEG}', '')` : "plainText";

  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = 500;
  const offset = (page - 1) * pageSize;

  if (!q || q.length < 2) return NextResponse.json({ results: [], total: 0, occurrences: 0, page, pageSize });

  const scope = searchParams.get("scope") ?? "tanakh";
  const bookIds = scopeBookIds(scope);
  const scopeFilter = bookIds ? `AND book IN (${bookIds.map(() => "?").join(",")})` : "";
  const scopeArgs = bookIds ?? [];

  // Favorites-only filter — restrict results to the signed-in user's favorited verses
  const favoritesOnly = searchParams.get("favoritesOnly") === "1";
  let favUserId: string | null = null;
  if (favoritesOnly) {
    favUserId = await getCurrentUserId();
    if (!favUserId) return NextResponse.json({ results: [], total: 0, occurrences: 0, page, pageSize, pages: 1 });
  }
  const favFilter = favUserId
    ? `AND EXISTS (SELECT 1 FROM "FavoriteVerse" fv WHERE fv.userId = ? AND fv.book = "VerseText".book AND fv.chapter = "VerseText".chapter AND fv.verse = "VerseText".verse)`
    : "";
  const favArgs = favUserId ? [favUserId] : [];

  // "whole" mode matches q as a complete word/phrase (space-bounded in the match column),
  // so a search for "משה" doesn't match inside "חמשה". Plain mode matches any substring.
  const whole = searchParams.get("whole") === "1";
  const matchClause = whole
    ? `(${column} = ? OR ${column} LIKE ? OR ${column} LIKE ? OR ${column} LIKE ?)`
    : `${column} LIKE ?`;
  const matchArgs = whole ? [q, `${q} %`, `% ${q}`, `% ${q} %`] : [`%${q}%`];

  const bookOrderCase = TANAKH_BOOKS.map((b, i) => `WHEN '${b.id}' THEN ${i}`).join(" ");

  // Count not just matching verses but total occurrences of q within them, via the
  // standard SQL trick: (length of text - length with q removed) / length of q.
  // In "whole" mode, occurrences are space-padded so e.g. "משה" doesn't count "ומשה".
  const occurrencesExpr = whole
    ? `SUM((LENGTH(' ' || ${column} || ' ') - LENGTH(REPLACE(' ' || ${column} || ' ', ?, ''))) / LENGTH(?))`
    : `SUM((LENGTH(${column}) - LENGTH(REPLACE(${column}, ?, ''))) / LENGTH(?))`;
  const occurrencesArgs = whole ? [` ${q} `, ` ${q} `] : [q, q];

  const [countRows, rows] = await Promise.all([
    prisma.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) as total, ${occurrencesExpr} as occurrences FROM "VerseText" WHERE ${matchClause} ${scopeFilter} ${favFilter}`,
      ...occurrencesArgs, ...matchArgs, ...scopeArgs, ...favArgs
    ),
    prisma.$queryRawUnsafe<VerseRow[]>(
      `SELECT book, chapter, verse, text, plainText FROM "VerseText"
       WHERE ${matchClause} ${scopeFilter} ${favFilter}
       ORDER BY CASE book ${bookOrderCase} ELSE 999 END, chapter, verse
       LIMIT ? OFFSET ?`,
      ...matchArgs, ...scopeArgs, ...favArgs, pageSize, offset
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
