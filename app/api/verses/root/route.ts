import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

function stripDiacritics(text: string): string {
  return text.replace(/[^א-ת]/g, "");
}

type WordRow = { book: string; chapter: number; verse: number; word: string };
type VerseRow = { book: string; chapter: number; verse: number; text: string };
type LemmaRow = { lemma: string };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const root = stripDiacritics(searchParams.get("root")?.trim() ?? "");
  if (!root || root.length < 2) return NextResponse.json({ results: [] });

  // Step 1: find Strong's numbers for words whose plain form matches the root
  const lemmaRows = await prisma.$queryRawUnsafe<LemmaRow[]>(
    `SELECT DISTINCT lemma FROM "WordEntry" WHERE plain = ?`, root
  );

  if (lemmaRows.length === 0) return NextResponse.json({ results: [], total: 0 });

  // Strip prefixes (e.g. "c/2029" → "2029") and deduplicate
  const strongsNumbers = [...new Set(
    lemmaRows.map((r) => r.lemma.replace(/^[a-z/]+/, "").trim()).filter(Boolean)
  )];

  if (strongsNumbers.length === 0) return NextResponse.json({ results: [], total: 0 });

  // Step 2: find all words whose lemma contains these Strong's numbers (handles "c/2029" etc.)
  const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
    `SELECT book, chapter, verse, word FROM "WordEntry" WHERE ${
      strongsNumbers.map(() => `lemma LIKE ?`).join(" OR ")
    }`,
    ...strongsNumbers.map((n) => `%${n}`)
  );

  // Build verse map
  const verseMap = new Map<string, { book: string; chapter: number; verse: number; forms: Set<string> }>();
  for (const w of wordRows) {
    const key = `${w.book}|${w.chapter}|${w.verse}`;
    if (!verseMap.has(key)) verseMap.set(key, { book: w.book, chapter: w.chapter, verse: w.verse, forms: new Set() });
    verseMap.get(key)!.forms.add(w.word);
  }

  const verseKeys = [...verseMap.values()];
  verseKeys.sort((a, b) => {
    const diff = (bookOrder[a.book] ?? 999) - (bookOrder[b.book] ?? 999);
    if (diff !== 0) return diff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  // Step 3: fetch verse texts for top 200
  const top200 = verseKeys.slice(0, 200);
  if (top200.length === 0) return NextResponse.json({ results: [], total: 0 });

  const verseTexts = await prisma.$queryRawUnsafe<VerseRow[]>(
    `SELECT book, chapter, verse, text FROM "VerseText" WHERE ${
      top200.map(() => `(book = ? AND chapter = ? AND verse = ?)`).join(" OR ")
    }`,
    ...top200.flatMap((v) => [v.book, v.chapter, v.verse])
  );

  const textMap = new Map(verseTexts.map((v) => [`${v.book}|${v.chapter}|${v.verse}`, v.text]));

  const results = top200.map((v) => ({
    book: v.book,
    bookHe: TANAKH_BOOKS.find((b) => b.id === v.book)?.he ?? v.book,
    chapter: v.chapter,
    verse: v.verse,
    text: textMap.get(`${v.book}|${v.chapter}|${v.verse}`) ?? "",
    forms: [...v.forms],
  }));

  return NextResponse.json({ results, total: verseMap.size });
}
