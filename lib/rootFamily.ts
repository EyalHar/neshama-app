import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

// Shared building blocks for Strong's-root-family search, used by both
// `/api/verses/root` (typed root -> descendants) and `/api/verses/etymology`
// (typed word -> full etymological family, walking up to the ultimate root(s)
// first). Extracted here so both routes stay in sync and neither drifts.

export const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

export function stripDiacritics(text: string): string {
  return text.replace(/[^א-ת]/g, "");
}

export type StrongsRow = { number: string; derivedFrom: string };
export type WordRow = { book: string; chapter: number; verse: number; word: string };
export type VerseGroup = { book: string; chapter: number; verse: number; forms: Set<string> };

// `derivedFrom` is a comma-separated list of Strong's numbers with no surrounding spaces
// (e.g. "H6817,H1234"). A plain `LIKE '%H249%'` substring match wrongly matches unrelated
// entries whose derivedFrom merely CONTAINS that text, e.g. seed "H249" spuriously matching
// "H1249" or "H2490"-"H2499" — this is especially damaging for BFS since it's short numbers
// (common for primitive/base roots) that trigger it, and the false family cascades further
// with every additional BFS level. Match each number as a whole comma-delimited token instead.
function derivedFromTokenClause(): string {
  return `(derivedFrom = ? OR derivedFrom LIKE ? OR derivedFrom LIKE ? OR derivedFrom LIKE ?)`;
}
function derivedFromTokenArgs(n: string): string[] {
  return [n, `${n},%`, `%,${n}`, `%,${n},%`];
}

// BFS: collect all Strong's numbers in the same root family (descendants of the seeds).
export async function collectRootFamily(seedNumbers: string[]): Promise<string[]> {
  const family = new Set<string>(seedNumbers);
  const queue = [...seedNumbers];

  while (queue.length > 0) {
    const current = queue.splice(0, 50);

    const children = await prisma.$queryRawUnsafe<StrongsRow[]>(
      `SELECT number, derivedFrom FROM "StrongsEntry"
       WHERE ${current.map(() => derivedFromTokenClause()).join(" OR ")}`,
      ...current.flatMap((n) => derivedFromTokenArgs(n))
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
export function extractStrongsNumber(lemma: string): string | null {
  const stripped = lemma.replace(/^([a-z]\/)+/, "");
  const m = stripped.match(/^(\d+)/);
  return m ? m[1] : null;
}

// Binyan is encoded as "V{stem}" inside the verb's morph segment (e.g. "Vtq1cs"), but that
// segment isn't always at the start of the field — a prefixed word (conjunction/article/
// preposition) pushes it after a "/" (e.g. "HC/Vtq1cs" for a vav-consecutive form), so the
// match must not be anchored to the start. GLOB (not LIKE) is required because SQLite's LIKE
// is case-insensitive by default, which would conflate Piel/Pual ("p"/"P") and Hiphil/Hophal
// ("h"/"H").
export function stemGlob(stem: string): string {
  return `*V${stem}*`;
}

export async function fetchWordRows(numbers: string[], stem: string | null): Promise<WordRow[]> {
  if (numbers.length === 0) return [];
  const plain = numbers.map((n) => n.replace(/^H/, ""));
  const stemFilter = stem ? ` AND morph GLOB ?` : "";
  const rows = await prisma.$queryRawUnsafe<(WordRow & { lemma: string })[]>(
    `SELECT book, chapter, verse, word, lemma FROM "WordEntry"
     WHERE (${plain.map(() => `lemma LIKE ?`).join(" OR ")})${stemFilter}`,
    ...plain.map((n) => `%${n}%`), ...(stem ? [stemGlob(stem)] : [])
  );
  const numSet = new Set(plain);
  return rows.filter((r) => {
    const num = extractStrongsNumber(r.lemma);
    return num !== null && numSet.has(num);
  });
}

// Binyan-only search (no root given) — filters WordEntry by morph alone.
export async function fetchWordRowsByStem(stem: string): Promise<WordRow[]> {
  return prisma.$queryRawUnsafe<WordRow[]>(
    `SELECT book, chapter, verse, word FROM "WordEntry" WHERE morph GLOB ?`,
    stemGlob(stem)
  );
}

// Groups word rows into verses, applying scope filtering and excluding verses already claimed
// elsewhere. Also counts total word-level occurrences (a verse can contain the same root more
// than once), which can exceed the verse count returned alongside it.
export function groupByVerse(wordRows: WordRow[], bookIds: string[] | null, exclude: Set<string>): { verseMap: Map<string, VerseGroup>; occurrences: number } {
  const verseMap = new Map<string, VerseGroup>();
  let occurrences = 0;
  for (const w of wordRows) {
    if (bookIds && !bookIds.includes(w.book)) continue;
    const key = `${w.book}|${w.chapter}|${w.verse}`;
    if (exclude.has(key)) continue;
    if (!verseMap.has(key)) verseMap.set(key, { book: w.book, chapter: w.chapter, verse: w.verse, forms: new Set() });
    verseMap.get(key)!.forms.add(w.word);
    occurrences++;
  }
  return { verseMap, occurrences };
}

// Restricts a verse map to only the keys present in the favorites set (no-op when inactive).
// When it does filter, the occurrence count is re-approximated from the remaining forms,
// since the original word-level count no longer applies to the reduced verse set.
export function filterToFavorites(map: Map<string, VerseGroup>, occurrences: number, favoriteKeys: Set<string> | null): { map: Map<string, VerseGroup>; occurrences: number } {
  if (!favoriteKeys) return { map, occurrences };
  const filtered = new Map<string, VerseGroup>();
  let filteredOccurrences = 0;
  for (const [key, value] of map) {
    if (favoriteKeys.has(key)) {
      filtered.set(key, value);
      filteredOccurrences += value.forms.size;
    }
  }
  return { map: filtered, occurrences: filteredOccurrences };
}

export const PAGE_SIZE = 200;

export async function resolveVerseGroup(verseMap: Map<string, VerseGroup>, page: number) {
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

export type StrongsMeta = { number: string; lemmaHe: string; lemmaPlain: string; definition: string; derivedFrom: string; isPrimitive: boolean };

export async function fetchStrongsMeta(numbers: string[]): Promise<Map<string, StrongsMeta>> {
  if (numbers.length === 0) return new Map();
  const unique = [...new Set(numbers)];
  const rows = await prisma.$queryRawUnsafe<StrongsMeta[]>(
    `SELECT number, lemmaHe, lemmaPlain, definition, derivedFrom, isPrimitive FROM "StrongsEntry"
     WHERE ${unique.map(() => `number = ?`).join(" OR ")}`,
    ...unique
  );
  return new Map(rows.map((r) => [r.number, r]));
}

// Walk UP from each seed to its ultimate root(s) — the mirror image of collectRootFamily().
// Follows the SEED'S OWN `derivedFrom` chain recursively (not "what derives from this seed",
// but "what did this seed itself derive from"), until hitting an entry with `isPrimitive =
// true` or a dead end (no `derivedFrom` / entry not found) — both treated as "this number is
// itself a root". A `visited` set guards against cycles. A word that is already a root
// degenerates to returning just itself.
//
// Compound entries (derivedFrom lists MORE THAN ONE parent — almost always a two-part proper
// name, e.g. "בֵּית תַּפּוּחַ" from בַּיִת+תַּפּוּחַ, or "אֱלִימֶלֶךְ" from אֵל+מֶלֶךְ) are deliberately
// NOT decomposed further — the entry itself is treated as its own root and the walk stops
// there. Decomposing them would branch into each parent's ENTIRE separate downstream family
// and union both into one group; in practice one of the two parents is often a very common
// generic word (e.g. "to build", "to be", "god/mighty"), so that family swamps the result with
// thousands of verses that have nothing to do with the word the user actually typed. Confirmed
// live: without this guard, searching "מלך" surfaced "אֱלִימֶלֶךְ" (7,460 verses, mostly about
// "אוּל") ahead of the actually-relevant מלך/מלכים group (2,565) — the same failure mode this
// module's own comment already documents for hapax-style "derived from a common word" filters.
export async function resolveUltimateRoots(seedNumbers: string[]): Promise<string[]> {
  const roots = new Set<string>();
  const visited = new Set<string>();
  let frontier = [...new Set(seedNumbers)];

  while (frontier.length > 0) {
    const metaMap = await fetchStrongsMeta(frontier);
    const nextFrontier: string[] = [];

    for (const num of frontier) {
      if (visited.has(num)) continue;
      visited.add(num);
      const meta = metaMap.get(num);
      const parents = meta && !meta.isPrimitive
        ? meta.derivedFrom.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      if (!meta || meta.isPrimitive || parents.length !== 1) {
        roots.add(num); // primitive, dead end, or an unresolved compound — treat as its own root
        continue;
      }

      const [parent] = parents;
      if (!visited.has(parent)) nextFrontier.push(parent);
    }
    frontier = [...new Set(nextFrontier)];
  }

  return [...roots];
}
