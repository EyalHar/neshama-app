import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, scopeBookIds } from "@/lib/tanakh";

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

const PAGE_SIZE = 200;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stem = searchParams.get("stem");
  const scope = searchParams.get("scope") ?? "tanakh";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  if (!stem) return NextResponse.json({ results: [] });

  const bookIds = scopeBookIds(scope);
  const scopeFilter = bookIds ? `AND book IN (${bookIds.map(() => "?").join(",")})` : "";
  const scopeArgs = bookIds ?? [];

  const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
    `SELECT book, chapter, verse, word FROM "WordEntry" WHERE morph LIKE ? ${scopeFilter} LIMIT 5000`,
    `HV${stem}%`, ...scopeArgs
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

  const total = verseKeys.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const pageSlice = verseKeys.slice(offset, offset + PAGE_SIZE);
  if (pageSlice.length === 0) return NextResponse.json({ results: [], total, pages, page, pageSize: PAGE_SIZE });

  const verseTexts = await prisma.$queryRawUnsafe<VerseRow[]>(
    `SELECT book, chapter, verse, text FROM "VerseText" WHERE ${
      pageSlice.map(() => `(book = ? AND chapter = ? AND verse = ?)`).join(" OR ")
    }`,
    ...pageSlice.flatMap((v) => [v.book, v.chapter, v.verse])
  );

  const textMap = new Map(verseTexts.map((v) => [`${v.book}|${v.chapter}|${v.verse}`, v.text]));

  const results = pageSlice.map((v) => ({
    book: v.book,
    bookHe: TANAKH_BOOKS.find((b) => b.id === v.book)?.he ?? v.book,
    chapter: v.chapter,
    verse: v.verse,
    text: textMap.get(`${v.book}|${v.chapter}|${v.verse}`) ?? "",
    forms: [...v.forms],
  }));

  return NextResponse.json({ results, total, pages, page, pageSize: PAGE_SIZE });
}
