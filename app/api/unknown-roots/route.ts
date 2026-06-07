import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

type Row = {
  id: number; strongsNum: string; lemmaHe: string;
  suggestedRoot: string | null;
};

type VerseRef = { book: string; bookHe: string; chapter: number; verse: number; text: string };

// WordEntry.lemma stores the bare Strong's number, optionally with morphological prefixes
// ("b/", "c/b/", …) and/or a variant suffix (" a"–" f", "+"). Extract the exact number so
// e.g. seed "5" doesn't substring-match an unrelated lemma like "1005".
function extractStrongsNumber(lemma: string): string | null {
  const stripped = lemma.replace(/^([a-z]\/)+/, "");
  const m = stripped.match(/^(\d+)/);
  return m ? m[1] : null;
}

function compareVerseOrder(a: { book: string; chapter: number; verse: number }, b: { book: string; chapter: number; verse: number }) {
  const diff = (bookOrder[a.book] ?? 999) - (bookOrder[b.book] ?? 999);
  if (diff !== 0) return diff;
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  return a.verse - b.verse;
}

// For each unknown-root word, find one representative verse where it actually occurs.
// Rather than scanning WordEntry per row (slow substring search × 887 rows), inspect each
// distinct lemma once, build an exact-number → lemma-variants index, then batch-fetch.
async function attachSampleVerses(rows: Row[]): Promise<(Row & { verseRef: VerseRef | null })[]> {
  const distinctLemmas = await prisma.$queryRawUnsafe<{ lemma: string }[]>(`SELECT DISTINCT lemma FROM "WordEntry"`);
  const numToLemmas = new Map<string, string[]>();
  for (const { lemma } of distinctLemmas) {
    const num = extractStrongsNumber(lemma);
    if (num === null) continue;
    if (!numToLemmas.has(num)) numToLemmas.set(num, []);
    numToLemmas.get(num)!.push(lemma);
  }

  const candidateLemmas = new Set<string>();
  for (const row of rows) {
    for (const lemma of numToLemmas.get(row.strongsNum.replace(/^H/, "")) ?? []) candidateLemmas.add(lemma);
  }

  type WordRow = { lemma: string; book: string; chapter: number; verse: number };
  const lemmaArr = [...candidateLemmas];
  const wordRows = lemmaArr.length
    ? await prisma.$queryRawUnsafe<WordRow[]>(
        `SELECT lemma, book, chapter, verse FROM "WordEntry" WHERE lemma IN (${lemmaArr.map(() => "?").join(",")})`,
        ...lemmaArr
      )
    : [];

  // Earliest (canonical-order) occurrence per matching lemma string
  const firstByLemma = new Map<string, { book: string; chapter: number; verse: number }>();
  for (const w of wordRows) {
    const prev = firstByLemma.get(w.lemma);
    if (!prev || compareVerseOrder(w, prev) < 0) firstByLemma.set(w.lemma, { book: w.book, chapter: w.chapter, verse: w.verse });
  }

  const sampleByRowId = new Map<number, { book: string; chapter: number; verse: number }>();
  const neededVerses = new Map<string, { book: string; chapter: number; verse: number }>();
  for (const row of rows) {
    let best: { book: string; chapter: number; verse: number } | null = null;
    for (const lemma of numToLemmas.get(row.strongsNum.replace(/^H/, "")) ?? []) {
      const occ = firstByLemma.get(lemma);
      if (occ && (!best || compareVerseOrder(occ, best) < 0)) best = occ;
    }
    if (best) {
      sampleByRowId.set(row.id, best);
      neededVerses.set(`${best.book}|${best.chapter}|${best.verse}`, best);
    }
  }

  const verseList = [...neededVerses.values()];
  type TextRow = { book: string; chapter: number; verse: number; text: string };
  const verseTexts = verseList.length
    ? await prisma.$queryRawUnsafe<TextRow[]>(
        `SELECT book, chapter, verse, text FROM "VerseText" WHERE ${
          verseList.map(() => `(book = ? AND chapter = ? AND verse = ?)`).join(" OR ")
        }`,
        ...verseList.flatMap((v) => [v.book, v.chapter, v.verse])
      )
    : [];
  const textMap = new Map(verseTexts.map((v) => [`${v.book}|${v.chapter}|${v.verse}`, v.text]));

  return rows.map((row) => {
    const sample = sampleByRowId.get(row.id);
    if (!sample) return { ...row, verseRef: null };
    return {
      ...row,
      verseRef: {
        book: sample.book,
        bookHe: TANAKH_BOOKS.find((b) => b.id === sample.book)?.he ?? sample.book,
        chapter: sample.chapter,
        verse: sample.verse,
        text: textMap.get(`${sample.book}|${sample.chapter}|${sample.verse}`) ?? "",
      },
    };
  });
}

export async function GET() {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT id, strongsNum, lemmaHe, suggestedRoot
     FROM "UnknownRoot" ORDER BY issue, lemmaPlain`
  );
  return NextResponse.json({ rows: await attachSampleVerses(rows) });
}

export async function PATCH(req: NextRequest) {
  const { id, suggestedRoot } = await req.json();
  if (!id || typeof suggestedRoot !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await prisma.$executeRawUnsafe(
    `UPDATE "UnknownRoot" SET suggestedRoot = ?, suggestedAt = datetime('now') WHERE id = ?`,
    suggestedRoot.trim() || null, id
  );
  return NextResponse.json({ ok: true });
}
