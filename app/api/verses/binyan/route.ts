import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

type WordRow = { book: string; chapter: number; verse: number; word: string };
type VerseRow = { book: string; chapter: number; verse: number; text: string };

export const BINYANIM = [
  { id: "q", he: "קַל",       en: "Qal" },
  { id: "N", he: "נִפְעַל",   en: "Niphal" },
  { id: "p", he: "פִּיעֵל",   en: "Piel" },
  { id: "P", he: "פֻּעַל",    en: "Pual" },
  { id: "h", he: "הִפְעִיל",  en: "Hiphil" },
  { id: "H", he: "הָפְעַל",   en: "Hophal" },
  { id: "t", he: "הִתְפַּעֵל", en: "Hitpael" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stem = searchParams.get("stem");
  if (!stem) return NextResponse.json({ results: [] });

  const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
    `SELECT book, chapter, verse, word FROM "WordEntry" WHERE morph LIKE ? LIMIT 5000`,
    `HV${stem}%`
  );

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
