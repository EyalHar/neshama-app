import { prisma } from "@/lib/prisma";
import { parseWord } from "@/lib/wordStats";
import { divisionKind, getUnits } from "@/lib/divisions";
import { TANAKH_BOOKS, scopeBookIds, toHebrewNumeral } from "@/lib/tanakh";

// "חיפוש מילים מנחות": passages (chapters, or parashot / parashiyot as in the reader's division
// mode) in which the typed words occur, not necessarily together. A typed word stands for its
// lexemes (Strong's numbers): every word in the text with that surface form (prefixes included:
// ויאמר) plus every dictionary entry spelled so (אמר), so all its forms count. Passages are ranked
// by how many of the words they contain, then by the smallest run of verses holding all of those
// found, then by how often they occur.
//
// A surface form can belong to unrelated lexemes through its prefixes (מים: מַיִם, but also מִ+יָּם), so
// a lexeme reached only through a surface form is kept when it makes up at least MIN_FORM_SHARE of
// that form's occurrences; a dictionary form spelled exactly as typed always counts (אור: אוֹר and
// אוּר). The client shows every lexeme and can exclude any of them (`exclude`).

export type LeitwordUnitMode = "chapters" | "divisions";

export type LeitwordTerm = { term: string; lexemes: { number: string; lemmaHe: string; excluded: boolean }[] };

// `marks`: per word of `words`, the index of the term it belongs to, or null
export type LeitwordVerse = { chapter: number; verse: number; words: string[]; marks: (number | null)[] };

export type LeitwordResult = {
  book: string;
  bookHe: string;
  label: string;
  range: string; // the passage's verses, for parashot and parashiyot ("" for a chapter)
  found: number[]; // indexes of the terms found in the passage
  span: number; // verses in the smallest run holding every found term
  windowRange: string;
  occurrences: number; // verses × terms
  link: { chapter: number; verse: number };
  verses: LeitwordVerse[]; // the run's verses that contain a term (up to MAX_VERSES)
  moreVerses: number;
};

export type LeitwordSearchResponse = { terms: LeitwordTerm[]; total: number; results: LeitwordResult[] };

export const LEITWORD_PAGE = 20;
const MAX_TERMS = 8;
const MAX_VERSES = 4;
const MIN_FORM_SHARE = 0.1;
// One word under two Strong's numbers: OSHB files the imperfect of הָלַךְ (וַיֵּלֶךְ) as יָלַךְ (H3212).
// (lib/rootLetters.ts merges more, but those are nouns folded into verb roots, not one lexeme.)
const SAME_LEXEME: Record<string, string> = { "3212": "1980" };
const lexemeOf = (lemma: string, morph: string) => {
  const num = parseWord(lemma, morph)?.num;
  return num && (SAME_LEXEME[num] ?? num);
};
const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

// Letters only, final forms as regular ones, so a typed word matches however it is written
const normalize = (s: string) => [...s.replace(/[^א-ת]/g, "")].map((c) => FINALS[c] ?? c).join("");

// A passage: a chapter, a parasha or a parashiya. `end` is null for a chapter (to its last verse).
type Unit = { book: string; start: [number, number]; end: [number, number] | null; label: string };

type Index = {
  verses: { book: string; chapter: number; verse: number }[]; // by verseIndex
  occurrences: Map<string, number[]>; // Strong's number → sorted distinct verseIndexes
  byForm: Map<string, Map<string, number>>; // normalized surface form → Strong's number → occurrences
  byLemma: Map<string, Set<string>>; // normalized dictionary form → Strong's numbers
  lemmaHe: Map<string, string>;
  units: Record<LeitwordUnitMode, { unitOf: Int32Array; units: Unit[] }>;
};

let index: Promise<Index> | null = null;

const ref = (c: number, v: number) => `${toHebrewNumeral(c)}, ${toHebrewNumeral(v)}`;
const rangeText = (book: string, s: [number, number], e: [number, number]) =>
  s[0] === e[0]
    ? `${BOOK_HE.get(book)} ${toHebrewNumeral(s[0])}, ${toHebrewNumeral(s[1])}–${toHebrewNumeral(e[1])}`
    : `${BOOK_HE.get(book)} ${ref(...s)} – ${ref(...e)}`;

function buildUnits(mode: LeitwordUnitMode, verses: Index["verses"]): Index["units"][LeitwordUnitMode] {
  const units: Unit[] = [];
  const firstOfBook = new Map<string, number>();
  for (const book of TANAKH_BOOKS) {
    firstOfBook.set(book.id, units.length);
    const kind = mode === "divisions" ? divisionKind(book.id) : null;
    if (kind) {
      for (const u of getUnits(book.id)) {
        units.push({ book: book.id, start: u.start, end: u.end, label: kind === "parashot" ? `פרשת ${u.label}` : `${book.he}: ${u.title}` });
      }
    } else {
      for (let c = 1; c <= book.chapters; c++) units.push({ book: book.id, start: [c, 1], end: null, label: `${book.he} ${toHebrewNumeral(c)}` });
    }
  }
  // Verses and units are both in canonical order, so a pointer walks the units of each book
  const unitOf = new Int32Array(verses.length).fill(-1);
  let u = -1;
  let book = "";
  verses.forEach((v, vi) => {
    if (!v) return;
    if (v.book !== book) {
      book = v.book;
      u = firstOfBook.get(book)!;
    }
    const before = (x: Unit) =>
      x.end ? x.end[0] < v.chapter || (x.end[0] === v.chapter && x.end[1] < v.verse) : x.start[0] < v.chapter;
    while (u + 1 < units.length && units[u + 1].book === book && before(units[u])) u++;
    unitOf[vi] = u;
  });
  return { unitOf, units };
}

// Built once per server process (restart after seeding), like the other WordEntry indexes
function getIndex(): Promise<Index> {
  index ??= (async () => {
    const [verseRows, wordRows, strongs] = await Promise.all([
      prisma.verseText.findMany({ select: { verseIndex: true, book: true, chapter: true, verse: true } }),
      prisma.$queryRawUnsafe<{ verseIndex: number; plain: string; lemma: string; morph: string }[]>(
        `SELECT verseIndex, plain, lemma, morph FROM "WordEntry" ORDER BY verseIndex`
      ),
      prisma.strongsEntry.findMany({ select: { number: true, lemmaHe: true, lemmaPlain: true } }),
    ]);

    const verses: Index["verses"] = [];
    for (const v of verseRows) verses[v.verseIndex] = { book: v.book, chapter: v.chapter, verse: v.verse };

    const occurrences = new Map<string, number[]>();
    const byForm = new Map<string, Map<string, number>>();
    const byLemma = new Map<string, Set<string>>();
    for (const w of wordRows) {
      const num = lexemeOf(w.lemma, w.morph);
      if (!num) continue;
      const list = occurrences.get(num) ?? [];
      if (list[list.length - 1] !== w.verseIndex) list.push(w.verseIndex);
      occurrences.set(num, list);
      const key = normalize(w.plain);
      const counts = byForm.get(key) ?? new Map<string, number>();
      counts.set(num, (counts.get(num) ?? 0) + 1);
      byForm.set(key, counts);
    }
    const lemmaHe = new Map<string, string>();
    for (const s of strongs) {
      const num = s.number.replace(/^H/, "");
      if (!occurrences.has(num)) continue;
      lemmaHe.set(num, s.lemmaHe);
      const key = normalize(s.lemmaPlain);
      byLemma.set(key, (byLemma.get(key) ?? new Set<string>()).add(num));
    }

    return {
      verses,
      occurrences,
      byForm,
      byLemma,
      lemmaHe,
      units: { chapters: buildUnits("chapters", verses), divisions: buildUnits("divisions", verses) },
    };
  })();
  return index;
}

// The smallest [first, last] verseIndex run containing all `need` terms of `hits`
// (`hits`: [verseIndex, term] pairs sorted by verseIndex)
function smallestWindow(hits: [number, number][], need: number): [number, number] {
  const count = new Map<number, number>();
  let best: [number, number] = [hits[0][0], hits[hits.length - 1][0]];
  let left = 0;
  for (const [vi, term] of hits) {
    count.set(term, (count.get(term) ?? 0) + 1);
    while (count.size === need) {
      if (vi - hits[left][0] < best[1] - best[0]) best = [hits[left][0], vi];
      const t = hits[left][1];
      const c = count.get(t)! - 1;
      if (c === 0) count.delete(t);
      else count.set(t, c);
      left++;
    }
  }
  return best;
}

// The lexemes a typed word stands for, most frequent first
function lexemesFor(idx: Index, key: string): string[] {
  const counts = idx.byForm.get(key) ?? new Map<string, number>();
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const common = [...counts].filter(([, c]) => c / total >= MIN_FORM_SHARE).map(([n]) => n);
  const kept = new Set([...(idx.byLemma.get(key) ?? []), ...common]);
  return [...kept].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
}

export async function searchLeitwords(
  q: string,
  mode: LeitwordUnitMode,
  scope: string,
  offset: number,
  exclude: Set<string> = new Set()
): Promise<LeitwordSearchResponse> {
  const idx = await getIndex();
  const seen = new Set<string>();
  const typed = q
    .split(/[\s,־]+/)
    .map((raw) => ({ raw: raw.replace(/[^א-ת]/g, ""), key: normalize(raw) }))
    .filter((t) => t.key.length >= 2 && !seen.has(t.key) && !!seen.add(t.key))
    .slice(0, MAX_TERMS);
  const allOf = typed.map((t) => lexemesFor(idx, t.key));
  const terms: LeitwordTerm[] = typed.map((t, i) => ({
    term: t.raw,
    lexemes: allOf[i].map((n) => ({ number: `H${n}`, lemmaHe: idx.lemmaHe.get(n) ?? "", excluded: exclude.has(`H${n}`) })),
  }));
  const lexemesOf = allOf.map((nums) => nums.filter((n) => !exclude.has(`H${n}`)));
  const active = typed.map((_, i) => i).filter((i) => lexemesOf[i].length > 0);
  if (active.length === 0) return { terms, total: 0, results: [] };

  const books = scopeBookIds(scope);
  const inScope = books ? new Set(books) : null;
  const { unitOf, units } = idx.units[mode];

  // passage → [verseIndex, term] pairs, a verse counted once per term
  const hitsByUnit = new Map<number, [number, number][]>();
  for (const t of active) {
    const verseSet = new Set<number>();
    for (const n of lexemesOf[t]) for (const vi of idx.occurrences.get(n) ?? []) verseSet.add(vi);
    for (const vi of verseSet) {
      const u = unitOf[vi];
      if (u < 0 || (inScope && !inScope.has(units[u].book))) continue;
      const list = hitsByUnit.get(u) ?? [];
      list.push([vi, t]);
      hitsByUnit.set(u, list);
    }
  }

  // With several words, a passage with only one of them is not a match
  const minFound = Math.min(2, active.length);
  const ranked = [...hitsByUnit]
    .map(([u, hits]) => {
      hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const found = [...new Set(hits.map((h) => h[1]))].sort((a, b) => a - b);
      const window = smallestWindow(hits, found.length);
      const inWindow = [...new Set(hits.filter((h) => h[0] >= window[0] && h[0] <= window[1]).map((h) => h[0]))];
      return { u, hits, found, window, inWindow, span: window[1] - window[0] + 1 };
    })
    .filter((r) => r.found.length >= minFound)
    .sort((a, b) => b.found.length - a.found.length || a.span - b.span || b.hits.length - a.hits.length || a.u - b.u);

  const page = ranked.slice(offset, offset + LEITWORD_PAGE);
  const shown = page.flatMap((r) => r.inWindow.slice(0, MAX_VERSES));
  const [texts, words] = await Promise.all([
    prisma.verseText.findMany({ where: { verseIndex: { in: shown } }, select: { verseIndex: true, text: true } }),
    prisma.wordEntry.findMany({ where: { verseIndex: { in: shown } }, select: { verseIndex: true, wordNum: true, lemma: true, morph: true } }),
  ]);
  // VerseText.text is the OSHB words joined by single spaces, so word n is wordNum n + 1
  const textOf = new Map(texts.map((t) => [t.verseIndex, t.text.replace(/ֽ/g, "").split(" ")]));
  const termOfNum = new Map<string, number>();
  for (const t of active) for (const n of lexemesOf[t]) if (!termOfNum.has(n)) termOfNum.set(n, t);
  const marksOf = new Map<number, Map<number, number>>();
  for (const w of words) {
    const t = termOfNum.get(lexemeOf(w.lemma, w.morph) ?? "");
    if (t === undefined) continue;
    const m = marksOf.get(w.verseIndex) ?? new Map<number, number>();
    m.set(w.wordNum - 1, t);
    marksOf.set(w.verseIndex, m);
  }

  const results = page.map((r): LeitwordResult => {
    const unit = units[r.u];
    const first = idx.verses[r.window[0]];
    const last = idx.verses[r.window[1]];
    return {
      book: unit.book,
      bookHe: BOOK_HE.get(unit.book) ?? unit.book,
      label: unit.label,
      range: unit.end ? rangeText(unit.book, unit.start, unit.end) : "",
      found: r.found,
      span: r.span,
      windowRange:
        r.span === 1
          ? `${BOOK_HE.get(first.book)} ${ref(first.chapter, first.verse)}`
          : rangeText(first.book, [first.chapter, first.verse], [last.chapter, last.verse]),
      occurrences: r.hits.length,
      link: { chapter: first.chapter, verse: first.verse },
      verses: r.inWindow.slice(0, MAX_VERSES).map((vi) => {
        const ws = textOf.get(vi) ?? [];
        const m = marksOf.get(vi);
        return { chapter: idx.verses[vi].chapter, verse: idx.verses[vi].verse, words: ws, marks: ws.map((_, i) => m?.get(i) ?? null) };
      }),
      moreVerses: Math.max(0, r.inWindow.length - MAX_VERSES),
    };
  });

  return { terms, total: ranked.length, results };
}
