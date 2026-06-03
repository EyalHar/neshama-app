import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

function stripDiacritics(text: string): string {
  return text.replace(/[^א-ת]/g, "");
}

type StrongsRow = { number: string; derivedFrom: string };
type WordRow = { book: string; chapter: number; verse: number; word: string };

// BFS: collect all Strong's numbers in the same root family
async function collectRootFamily(seedNumbers: string[]): Promise<string[]> {
  const family = new Set<string>(seedNumbers);
  const queue = [...seedNumbers];

  while (queue.length > 0) {
    const current = queue.splice(0, 50);

    const children = await prisma.$queryRawUnsafe<StrongsRow[]>(
      `SELECT number, derivedFrom FROM "StrongsEntry"
       WHERE ${current.map(() => `derivedFrom LIKE ?`).join(" OR ")}`,
      ...current.map((n) => `%${n}%`)
    );

    for (const child of children) {
      if (!family.has(child.number)) {
        family.add(child.number);
        queue.push(child.number);
      }
    }
  }

  return [...family];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const root = stripDiacritics(searchParams.get("root")?.trim() ?? "");
  if (!root || root.length < 2) return NextResponse.json({ results: [] });

  // Step 1: find seed Strong's numbers by lemmaPlain match
  type LemmaRow = { number: string };
  const seedRows = await prisma.$queryRawUnsafe<LemmaRow[]>(
    `SELECT number FROM "StrongsEntry" WHERE lemmaPlain LIKE ?`,
    `%${root}%`
  );

  // Fallback: old method via WordEntry.plain if Strong's not seeded
  if (seedRows.length === 0) {
    type OldLemmaRow = { lemma: string };
    const lemmaRows = await prisma.$queryRawUnsafe<OldLemmaRow[]>(
      `SELECT DISTINCT lemma FROM "WordEntry" WHERE plain = ?`, root
    );
    if (lemmaRows.length === 0) return NextResponse.json({ results: [], total: 0 });

    const nums = [...new Set(lemmaRows.map((r) => r.lemma.replace(/^[a-z/]+/, "").trim()).filter(Boolean))];
    const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
      `SELECT book, chapter, verse, word FROM "WordEntry" WHERE ${nums.map(() => `lemma LIKE ?`).join(" OR ")}`,
      ...nums.map((n) => `%${n}`)
    );
    return buildResponse(wordRows);
  }

  // Step 2: BFS to collect full root family
  const seedNumbers = seedRows.map((r) => r.number);
  const family = await collectRootFamily(seedNumbers);

  // Step 3: find all words with any family lemma
  const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
    `SELECT book, chapter, verse, word FROM "WordEntry"
     WHERE ${family.map(() => `lemma LIKE ?`).join(" OR ")}`,
    ...family.map((n) => `%${n.replace("H", "")}%`)
  );

  return buildResponse(wordRows);
}

function buildResponse(wordRows: WordRow[]) {
  const verseMap = new Map<string, { book: string; chapter: number; verse: number; forms: Set<string> }>();
  for (const w of wordRows) {
    const key = `${w.book}|${w.chapter}|${w.verse}`;
    if (!verseMap.has(key)) verseMap.set(key, { book: w.book, chapter: w.chapter, verse: w.verse, forms: new Set() });
    verseMap.get(key)!.forms.add(w.word);
  }

  const verseKeys = [...verseMap.values()].sort((a, b) => {
    const diff = (bookOrder[a.book] ?? 999) - (bookOrder[b.book] ?? 999);
    if (diff !== 0) return diff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  const top200 = verseKeys.slice(0, 200);
  if (top200.length === 0) return NextResponse.json({ results: [], total: 0 });

  return prisma.$queryRawUnsafe<{ book: string; chapter: number; verse: number; text: string }[]>(
    `SELECT book, chapter, verse, text FROM "VerseText" WHERE ${
      top200.map(() => `(book = ? AND chapter = ? AND verse = ?)`).join(" OR ")
    }`,
    ...top200.flatMap((v) => [v.book, v.chapter, v.verse])
  ).then((verseTexts) => {
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
  });
}
