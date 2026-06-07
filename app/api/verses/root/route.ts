import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, scopeBookIds } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

function stripDiacritics(text: string): string {
  return text.replace(/[^א-ת]/g, "");
}

type StrongsRow = { number: string; derivedFrom: string };
type WordRow = { book: string; chapter: number; verse: number; word: string };
type VerseGroup = { book: string; chapter: number; verse: number; forms: Set<string> };

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

// WordEntry.lemma stores the bare Strong's number, optionally with morphological prefixes
// ("b/", "c/b/", "b/d/l/" …) and/or a variant suffix (" a", " b", "+"). A plain substring
// LIKE match would wrongly match e.g. seed "877" against lemma "1877" — extract the actual
// number and require an exact match to avoid such false positives.
function extractStrongsNumber(lemma: string): string | null {
  const stripped = lemma.replace(/^([a-z]\/)+/, "");
  const m = stripped.match(/^(\d+)/);
  return m ? m[1] : null;
}

async function fetchWordRows(numbers: string[]): Promise<WordRow[]> {
  if (numbers.length === 0) return [];
  const plain = numbers.map((n) => n.replace(/^H/, ""));
  const rows = await prisma.$queryRawUnsafe<(WordRow & { lemma: string })[]>(
    `SELECT book, chapter, verse, word, lemma FROM "WordEntry"
     WHERE ${plain.map(() => `lemma LIKE ?`).join(" OR ")}`,
    ...plain.map((n) => `%${n}%`)
  );
  const numSet = new Set(plain);
  return rows.filter((r) => {
    const num = extractStrongsNumber(r.lemma);
    return num !== null && numSet.has(num);
  });
}

// Groups word rows into verses, applying scope filtering and excluding verses already claimed elsewhere
function groupByVerse(wordRows: WordRow[], bookIds: string[] | null, exclude: Set<string>): Map<string, VerseGroup> {
  const verseMap = new Map<string, VerseGroup>();
  for (const w of wordRows) {
    if (bookIds && !bookIds.includes(w.book)) continue;
    const key = `${w.book}|${w.chapter}|${w.verse}`;
    if (exclude.has(key)) continue;
    if (!verseMap.has(key)) verseMap.set(key, { book: w.book, chapter: w.chapter, verse: w.verse, forms: new Set() });
    verseMap.get(key)!.forms.add(w.word);
  }
  return verseMap;
}

const PAGE_SIZE = 200;

async function resolveVerseGroup(verseMap: Map<string, VerseGroup>, page: number) {
  const verseKeys = [...verseMap.values()].sort((a, b) => {
    const diff = (bookOrder[a.book] ?? 999) - (bookOrder[b.book] ?? 999);
    if (diff !== 0) return diff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  const total = verseKeys.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;
  const pageSlice = verseKeys.slice(offset, offset + PAGE_SIZE);
  if (pageSlice.length === 0) return { results: [], total, pages };

  const verseTexts = await prisma.$queryRawUnsafe<{ book: string; chapter: number; verse: number; text: string }[]>(
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

  return { results, total, pages };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const root = stripDiacritics(searchParams.get("root")?.trim() ?? "");
  const scope = searchParams.get("scope") ?? "tanakh";
  const view = searchParams.get("view") === "etymological" ? "etymological" : "direct";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  if (!root || root.length < 2) return NextResponse.json({ results: [] });

  const bookIds = scopeBookIds(scope);

  // Step 1: find seed Strong's numbers by lemmaPlain match
  type LemmaRow = { number: string };
  const seedRows = await prisma.$queryRawUnsafe<LemmaRow[]>(
    `SELECT number FROM "StrongsEntry" WHERE lemmaPlain LIKE ?`,
    `%${root}%`
  );

  // Fallback: old method via WordEntry.plain if Strong's not seeded — direct match only, no etymological expansion
  if (seedRows.length === 0) {
    type OldLemmaRow = { lemma: string };
    const lemmaRows = await prisma.$queryRawUnsafe<OldLemmaRow[]>(
      `SELECT DISTINCT lemma FROM "WordEntry" WHERE plain = ?`, root
    );
    if (lemmaRows.length === 0) {
      return NextResponse.json({ results: [], total: 0, pages: 1, page, pageSize: PAGE_SIZE, directTotal: 0, etymologicalTotal: 0 });
    }

    const nums = [...new Set(lemmaRows.map((r) => r.lemma.replace(/^[a-z/]+/, "").trim()).filter(Boolean))];
    const wordRows = await prisma.$queryRawUnsafe<WordRow[]>(
      `SELECT book, chapter, verse, word FROM "WordEntry" WHERE ${nums.map(() => `lemma LIKE ?`).join(" OR ")}`,
      ...nums.map((n) => `%${n}`)
    );
    const { results, total, pages } = await resolveVerseGroup(groupByVerse(wordRows, bookIds, new Set()), page);
    return NextResponse.json({ results, total, pages, page, pageSize: PAGE_SIZE, directTotal: total, etymologicalTotal: 0 });
  }

  // Step 2: BFS to collect the full root family, keeping track of which numbers were directly
  // seeded by the search vs. reached only through the derivation-chain expansion
  const seedNumbers = seedRows.map((r) => r.number);
  const seedSet = new Set(seedNumbers);
  const family = await collectRootFamily(seedNumbers);
  const etymNumbers = family.filter((n) => !seedSet.has(n));

  // Step 3: fetch direct matches and etymologically-expanded matches separately
  const [directWordRows, etymWordRows] = await Promise.all([
    fetchWordRows(seedNumbers),
    fetchWordRows(etymNumbers),
  ]);

  const directVerseMap = groupByVerse(directWordRows, bookIds, new Set());
  // A verse that already appears among the direct matches stays there — etymological list only
  // holds verses reached exclusively through the expanded (non-seed) family
  const etymVerseMap = groupByVerse(etymWordRows, bookIds, new Set(directVerseMap.keys()));

  // Only resolve (fetch verse text + paginate) the view the client is currently displaying
  const activeMap = view === "etymological" ? etymVerseMap : directVerseMap;
  const { results, total, pages } = await resolveVerseGroup(activeMap, page);

  return NextResponse.json({
    results,
    total,
    pages,
    page,
    pageSize: PAGE_SIZE,
    directTotal: directVerseMap.size,
    etymologicalTotal: etymVerseMap.size,
  });
}
