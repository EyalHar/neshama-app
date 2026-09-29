import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { JERUSALEM_NAMES, VerseCitation } from "@/lib/jerusalemNames";

const bookOrder = new Map(TANAKH_BOOKS.map((b, i) => [b.id, i]));
const bookHe = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));

function verseKey(v: VerseCitation): string {
  return `${v.book}|${v.chapter}|${v.verse}`;
}

function sortVerses(a: VerseCitation, b: VerseCitation): number {
  const diff = (bookOrder.get(a.book) ?? 999) - (bookOrder.get(b.book) ?? 999);
  if (diff !== 0) return diff;
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  return a.verse - b.verse;
}

// WordEntry.lemma stores the bare Strong's number, optionally with morphological prefixes
// ("b/", "c/d/", ...) and/or a homonym suffix (" a", " b"). Mirrors extractStrongsNumber()
// in app/api/verses/root/route.ts — a plain substring match would wrongly match e.g. "740"
// against lemma "1740", so the number is extracted and compared exactly.
function extractStrongsNumber(lemma: string): string | null {
  const stripped = lemma.replace(/^([a-z]\/)+/, "");
  const m = stripped.match(/^(\d+)/);
  return m ? m[1] : null;
}

async function resolveLemma(number: string, exclude: VerseCitation[] = []): Promise<VerseCitation[]> {
  const rows = await prisma.$queryRawUnsafe<{ book: string; chapter: number; verse: number; lemma: string }[]>(
    `SELECT DISTINCT book, chapter, verse, lemma FROM "WordEntry" WHERE lemma LIKE ?`,
    `%${number}%`
  );
  const excludeSet = new Set(exclude.map(verseKey));
  const seen = new Set<string>();
  const result: VerseCitation[] = [];
  for (const r of rows) {
    if (extractStrongsNumber(r.lemma) !== number) continue;
    const key = `${r.book}|${r.chapter}|${r.verse}`;
    if (excludeSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push({ book: r.book, chapter: r.chapter, verse: r.verse });
  }
  return result;
}

// Letters-only phrase match against VerseText.plainText, mirroring the substring-search
// convention in app/api/verses/substring/route.ts.
async function resolvePhrase(phrase: string): Promise<VerseCitation[]> {
  return prisma.$queryRawUnsafe<VerseCitation[]>(
    `SELECT book, chapter, verse FROM "VerseText" WHERE plainText LIKE ?`,
    `%${phrase}%`
  );
}

export async function GET() {
  const seededCount = await prisma.verseText.count();
  if (seededCount === 0) {
    return NextResponse.json({ names: [], seeded: false });
  }

  const perName: { id: string; name: string; source: string; keys: VerseCitation[] }[] = [];
  const allKeys: VerseCitation[] = [];

  for (const entry of JERUSALEM_NAMES) {
    let keys: VerseCitation[] = [];
    if (entry.source === "lemma" && entry.strongsNumber) {
      keys = await resolveLemma(entry.strongsNumber, entry.exclude);
    } else if (entry.source === "phrase" && entry.phrase) {
      keys = await resolvePhrase(entry.phrase);
    } else if (entry.source === "fixed" && entry.citations) {
      keys = entry.citations;
    }
    keys = [...keys].sort(sortVerses);
    perName.push({ id: entry.id, name: entry.name, source: entry.source, keys });
    allKeys.push(...keys);
  }

  // Batch-fetch verse text for every distinct verse across all 29 names in one query.
  const uniqueKeys = [...new Map(allKeys.map((k) => [verseKey(k), k])).values()];
  const textRows = uniqueKeys.length
    ? await prisma.$queryRawUnsafe<{ book: string; chapter: number; verse: number; text: string }[]>(
        `SELECT book, chapter, verse, text FROM "VerseText" WHERE ${uniqueKeys
          .map(() => `(book = ? AND chapter = ? AND verse = ?)`)
          .join(" OR ")}`,
        ...uniqueKeys.flatMap((k) => [k.book, k.chapter, k.verse])
      )
    : [];
  const textMap = new Map(textRows.map((r) => [verseKey(r), r.text]));

  const names = perName.map((p) => ({
    id: p.id,
    name: p.name,
    source: p.source,
    verseCount: p.keys.length,
    verses: p.keys.map((k) => ({
      book: k.book,
      bookHe: bookHe.get(k.book) ?? k.book,
      chapter: k.chapter,
      verse: k.verse,
      text: textMap.get(verseKey(k)) ?? "",
    })),
  }));

  return NextResponse.json({ names, seeded: true });
}
