import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

function stripDiacritics(text: string): string {
  return text.replace(/[^א-ת]/g, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const root = stripDiacritics(searchParams.get("root")?.trim() ?? "");
  if (!root || root.length < 2) return NextResponse.json({ results: [] });

  // Step 1: find all Strong's lemma IDs associated with words matching the root
  const lemmaRows = await prisma.wordEntry.findMany({
    where: { plain: root },
    select: { lemma: true },
    distinct: ["lemma"],
  });

  if (lemmaRows.length === 0) return NextResponse.json({ results: [], total: 0 });

  const lemmas = lemmaRows.map((r) => r.lemma);

  // Step 2: find all verses that contain any word with those lemmas
  const wordRows = await prisma.wordEntry.findMany({
    where: { lemma: { in: lemmas } },
    select: { book: true, chapter: true, verse: true, word: true },
  });

  // Build a map of verse key → matched word forms
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

  // Step 3: fetch verse texts (batched to first 200)
  const top200 = verseKeys.slice(0, 200);
  const verseTexts = await prisma.verseText.findMany({
    where: {
      OR: top200.map((v) => ({ book: v.book, chapter: v.chapter, verse: v.verse })),
    },
    select: { book: true, chapter: true, verse: true, text: true },
  });

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
