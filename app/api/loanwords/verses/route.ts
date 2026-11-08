import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { LOANWORDS } from "@/lib/loanwords";

const MAX_VERSES = 100;
const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));

// GET /api/loanwords/verses?strongs=H646 — the verses a loanword occurs in, with the word's
// position in VerseText.text (its words are the OSHB words joined by single spaces)
export async function GET(request: NextRequest) {
  const strongs = request.nextUrl.searchParams.get("strongs") ?? "";
  if (!LOANWORDS.some((w) => w.strongs === strongs)) {
    return NextResponse.json({ error: "Unknown loanword" }, { status: 400 });
  }
  const num = strongs.replace(/^H/, "");

  const candidates = await prisma.wordEntry.findMany({
    where: { lemma: { contains: num } },
    select: { book: true, chapter: true, verse: true, verseIndex: true, wordNum: true, lemma: true, morph: true },
    orderBy: [{ verseIndex: "asc" }, { wordNum: "asc" }],
  });
  const hits = candidates.filter((w) => parseWord(w.lemma, w.morph)?.num === num);

  const byVerse = new Map<string, { book: string; chapter: number; verse: number; wordNums: number[] }>();
  for (const h of hits) {
    const key = `${h.book}:${h.chapter}:${h.verse}`;
    const v = byVerse.get(key) ?? { book: h.book, chapter: h.chapter, verse: h.verse, wordNums: [] };
    v.wordNums.push(h.wordNum);
    byVerse.set(key, v);
  }
  const verses = [...byVerse.values()].slice(0, MAX_VERSES);

  const texts = await prisma.verseText.findMany({
    where: { OR: verses.map(({ book, chapter, verse }) => ({ book, chapter, verse })) },
    select: { book: true, chapter: true, verse: true, text: true },
  });
  const textOf = new Map(texts.map((t) => [`${t.book}:${t.chapter}:${t.verse}`, t.text]));

  return NextResponse.json({
    total: byVerse.size,
    verses: verses.map((v) => ({
      ...v,
      bookHe: BOOK_HE.get(v.book) ?? v.book,
      text: textOf.get(`${v.book}:${v.chapter}:${v.verse}`) ?? "",
    })),
  });
}
