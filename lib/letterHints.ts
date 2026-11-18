import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { splitGraphemes } from "@/lib/hebrewLetters";
import { ACROSTICS, type Acrostic } from "@/lib/acrostics";
import {
  ALEF_BET,
  ELS_LIMITS,
  normalizeLetters,
  type AcrosticLine,
  type AcrosticView,
  type ElsGrid,
  type ElsMatch,
  type ElsResult,
  type InitialsDir,
  type InitialsMatch,
  type InitialsMode,
  type InitialsResult,
  type MarkedVerse,
} from "@/lib/letterHintsShared";

// One in-memory copy of the Tanakh per server process (restart after seeding): words in order
// with their first/last letters, and every letter in order, each pointing back to its verse.

type Verse = { book: string; chapter: number; verse: number; section: string; words: string[]; plain: string[] };

type Corpus = {
  verses: Verse[];
  wordVerse: Int32Array;
  wordNum: Int32Array;
  firsts: string;
  lasts: string;
  letters: string; // normalized
  rawLetters: string; // as written (final forms kept), for display
  letterVerse: Int32Array;
  letterWord: Int32Array;
  letterInWord: Int32Array;
  positions: Map<string, Int32Array>;
  bookRange: Map<string, [number, number]>;
};

const BOOK = new Map(TANAKH_BOOKS.map((b) => [b.id, b]));

let corpusPromise: Promise<Corpus> | null = null;

async function buildCorpus(): Promise<Corpus> {
  const rows = await prisma.verseText.findMany({
    select: { book: true, chapter: true, verse: true, text: true, plainText: true },
    orderBy: { verseIndex: "asc" },
  });
  const verses: Verse[] = rows.map((r) => ({
    book: r.book,
    chapter: r.chapter,
    verse: r.verse,
    section: BOOK.get(r.book)?.section ?? "",
    words: r.text.replace(/ֽ/g, "").split(" "),
    plain: r.plainText.split(" "),
  }));

  const wv: number[] = [], wn: number[] = [];
  let firsts = "", lasts = "";
  const lv: number[] = [], lw: number[] = [], li: number[] = [];
  let letters = "", rawLetters = "";
  const bookRange = new Map<string, [number, number]>();
  verses.forEach((v, vi) => {
    const range = bookRange.get(v.book);
    if (range) range[1] = letters.length;
    else bookRange.set(v.book, [letters.length, letters.length]);
    v.plain.forEach((w, wi) => {
      const norm = normalizeLetters(w);
      if (!norm) return;
      wv.push(vi);
      wn.push(wi);
      firsts += norm[0];
      lasts += norm[norm.length - 1];
      [...w].forEach((c, k) => {
        lv.push(vi);
        lw.push(wi);
        li.push(k);
        rawLetters += c;
      });
      letters += norm;
    });
    bookRange.get(v.book)![1] = letters.length;
  });

  const lists = new Map<string, number[]>();
  for (let i = 0; i < letters.length; i++) {
    const c = letters[i];
    if (!lists.has(c)) lists.set(c, []);
    lists.get(c)!.push(i);
  }
  return {
    verses,
    wordVerse: Int32Array.from(wv),
    wordNum: Int32Array.from(wn),
    firsts,
    lasts,
    letters,
    rawLetters,
    letterVerse: Int32Array.from(lv),
    letterWord: Int32Array.from(lw),
    letterInWord: Int32Array.from(li),
    positions: new Map([...lists].map(([c, l]) => [c, Int32Array.from(l)])),
    bookRange,
  };
}

const getCorpus = () => (corpusPromise ??= buildCorpus().catch((e) => ((corpusPromise = null), Promise.reject(e))));

export const verseRef = (v: { book: string; chapter: number; verse: number }) =>
  `${BOOK.get(v.book)?.he ?? v.book} ${toHebrewNumeral(v.chapter)}, ${toHebrewNumeral(v.verse)}`;

export const verseHref = (v: { book: string; chapter: number; verse: number }) =>
  `/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`;

// Index in the pointed word of the plain word's k-th letter (the two hold the same letters)
function pointedLetterIndex(word: string, plainIndex: number, plainLength: number): number {
  const count = splitGraphemes(word).length;
  return count === plainLength ? plainIndex : Math.min(plainIndex, count - 1);
}

function markedVerse(v: Verse, marks: [number, number][]): MarkedVerse {
  return {
    book: v.book,
    chapter: v.chapter,
    verse: v.verse,
    ref: verseRef(v),
    words: v.words,
    marks: marks.map(([w, k]) => [w, pointedLetterIndex(v.words[w] ?? "", k, v.plain[w]?.length ?? 0)]),
  };
}

const SCOPE_SECTION: Record<string, string> = { torah: "תורה", nevi: "נביאים", ketuvim: "כתובים" };

function frequencies(s: string, from = 0, to = s.length): Map<string, number> {
  const f = new Map<string, number>();
  for (let i = from; i < to; i++) f.set(s[i], (f.get(s[i]) ?? 0) + 1);
  const n = to - from;
  for (const [c, k] of f) f.set(c, k / n);
  return f;
}

const MAX_SHOWN = 200;

// Places where the first (or last) letters of consecutive words spell `query`
export async function searchInitials(query: string, mode: InitialsMode, dir: InitialsDir, crossVerses: boolean, scope: string): Promise<InitialsResult> {
  const c = await getCorpus();
  const q = normalizeLetters(query);
  const n = q.length;
  const s = mode === "first" ? c.firsts : c.lasts;
  const section = SCOPE_SECTION[scope];
  const inScope = (wordIdx: number) => !section || c.verses[c.wordVerse[wordIdx]].section === section;
  const fits = (i: number) => inScope(i) && inScope(i + n - 1) && (crossVerses || c.wordVerse[i] === c.wordVerse[i + n - 1]);

  const reversed = [...q].reverse().join("");
  const patterns: { p: string; reversed: boolean }[] = [];
  if (dir !== "backward") patterns.push({ p: q, reversed: false });
  if (dir !== "forward" && (dir === "backward" || reversed !== q)) patterns.push({ p: reversed, reversed: true });

  const hits: { i: number; reversed: boolean }[] = [];
  for (const { p, reversed: rev } of patterns) {
    for (let i = s.indexOf(p); i >= 0; i = s.indexOf(p, i + 1)) if (fits(i)) hits.push({ i, reversed: rev });
  }
  hits.sort((a, b) => a.i - b.i);

  // Chance level: the same number of windows, each letter drawn by its frequency in the scope
  let windows = 0, lo = -1, hi = 0;
  for (let i = 0; i + n <= s.length; i++) {
    if (!fits(i)) continue;
    windows++;
    if (lo < 0) lo = i;
    hi = i + n;
  }
  const freq = frequencies(s, Math.max(lo, 0), hi);
  const chance = (p: string) => [...p].reduce((acc, ch) => acc * (freq.get(ch) ?? 0), 1);
  const expected = windows * patterns.reduce((acc, { p }) => acc + chance(p), 0);

  const matches: InitialsMatch[] = hits.slice(0, MAX_SHOWN).map(({ i, reversed: rev }) => {
    const byVerse = new Map<number, [number, number][]>();
    for (let k = i; k < i + n; k++) {
      const vi = c.wordVerse[k];
      const wi = c.wordNum[k];
      const plainLen = c.verses[vi].plain[wi].length;
      if (!byVerse.has(vi)) byVerse.set(vi, []);
      byVerse.get(vi)!.push([wi, mode === "first" ? 0 : plainLen - 1]);
    }
    return { reversed: rev, verses: [...byVerse].map(([vi, marks]) => markedVerse(c.verses[vi], marks)) };
  });
  return { query: q, total: hits.length, expected, matches };
}

function elsRange(c: Corpus, scope: string): [number, number] | null {
  if (scope === "tanakh") return [0, c.letters.length];
  if (scope === "torah") return [0, c.bookRange.get("Deuteronomy")![1]];
  return c.bookRange.get(scope) ?? null;
}

const lowerBound = (a: Int32Array, x: number) => {
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const ELS_KEEP = 5000;

// Equidistant letter sequences: `query` spelled by letters `skip` apart, in either direction
export async function searchEls(query: string, minSkip: number, maxSkip: number, scope: string): Promise<ElsResult | null> {
  const c = await getCorpus();
  const range = elsRange(c, scope);
  if (!range) return null;
  const [from, to] = range;
  const q = normalizeLetters(query);
  const n = q.length;
  const p0 = c.positions.get(q[0]) ?? new Int32Array();
  const p1 = c.positions.get(q[1]) ?? new Int32Array();

  const found: { start: number; skip: number }[] = [];
  let total = 0;
  const tryAt = (p: number, d: number) => {
    const end = p + (n - 1) * d;
    if (end < from || end >= to) return;
    for (let k = 2; k < n; k++) if (c.letters[p + k * d] !== q[k]) return;
    total++;
    if (found.length < ELS_KEEP) found.push({ start: p, skip: d });
  };
  for (let a = lowerBound(p0, from); a < p0.length && p0[a] < to; a++) {
    const p = p0[a];
    for (let b = lowerBound(p1, p + minSkip); b < p1.length && p1[b] <= p + maxSkip; b++) tryAt(p, p1[b] - p);
    for (let b = lowerBound(p1, p - maxSkip); b < p1.length && p1[b] <= p - minSkip; b++) tryAt(p, p1[b] - p);
  }
  found.sort((x, y) => Math.abs(x.skip) - Math.abs(y.skip) || x.start - y.start);

  const freq = frequencies(c.letters, from, to);
  const chance = [...q].reduce((acc, ch) => acc * (freq.get(ch) ?? 0), 1);
  let windows = 0;
  for (let d = minSkip; d <= maxSkip; d++) windows += 2 * Math.max(0, to - from - (n - 1) * d);

  const refAt = (i: number) => verseRef(c.verses[c.letterVerse[i]]);
  const matches: ElsMatch[] = found.slice(0, MAX_SHOWN).map(({ start, skip }) => ({
    start,
    skip,
    from: refAt(start),
    to: refAt(start + (n - 1) * skip),
  }));
  return { query: q, total, expected: windows * chance, letters: to - from, matches };
}

const GRID_HALF = 12;
const GRID_MARGIN = 2;

// The text laid out in rows of |skip| letters, so the sequence stands in one column
export async function elsGrid(start: number, skip: number, length: number): Promise<ElsGrid | null> {
  const c = await getCorpus();
  const d = Math.abs(skip);
  if (!d || length < 2 || length > ELS_LIMITS.maxLength) return null;
  const top = Math.min(start, start + (length - 1) * skip);
  if (top < 0 || top + (length - 1) * d >= c.letters.length) return null;
  const hits = new Set(Array.from({ length }, (_, k) => start + k * skip));
  const left = Math.min(GRID_HALF, Math.floor((d - 1) / 2));
  const right = Math.min(GRID_HALF, d - 1 - Math.floor((d - 1) / 2));
  const rows: ElsGrid["rows"] = [];
  const verseIds = new Set<number>();
  for (let r = -GRID_MARGIN; r < length + GRID_MARGIN; r++) {
    const row: ElsGrid["rows"][number] = [];
    for (let col = -left; col <= right; col++) {
      const i = top + r * d + col;
      if (i < 0 || i >= c.letters.length) {
        row.push({ letter: "", hit: false, verse: -1 });
        continue;
      }
      const vi = c.letterVerse[i];
      if (hits.has(i)) verseIds.add(vi);
      row.push({ letter: c.rawLetters[i], hit: hits.has(i), verse: vi });
    }
    rows.push(row);
  }
  const verses = [...verseIds].sort((a, b) => a - b).map((vi) => ({ id: vi, ref: verseRef(c.verses[vi]), href: verseHref(c.verses[vi]) }));
  return { width: d, rows, verses };
}

// The verses holding the sequence's letters, each with its letters marked
export async function elsVerses(start: number, skip: number, length: number): Promise<MarkedVerse[]> {
  const c = await getCorpus();
  const byVerse = new Map<number, [number, number][]>();
  for (let k = 0; k < length; k++) {
    const i = start + k * skip;
    if (i < 0 || i >= c.letters.length) return [];
    const vi = c.letterVerse[i];
    if (!byVerse.has(vi)) byVerse.set(vi, []);
    byVerse.get(vi)!.push([c.letterWord[i], c.letterInWord[i]]);
  }
  return [...byVerse].sort((a, b) => a[0] - b[0]).map(([vi, marks]) => markedVerse(c.verses[vi], marks));
}

// Longest common subsequence of the lines' letters and the alphabet: which line stands for which letter
function alignToAlphabet(letters: string[]): (number | null)[] {
  const n = letters.length, m = ALEF_BET.length;
  const t = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      t[i][j] = letters[i] === ALEF_BET[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: (number | null)[] = Array(n).fill(null);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (letters[i] === ALEF_BET[j] && t[i][j] === t[i + 1][j + 1] + 1) out[i++] = j++;
    else if (t[i + 1][j] >= t[i][j + 1]) i++;
    else j++;
  }
  return out;
}

const inRange = (v: Verse, a: Acrostic) =>
  v.book === a.book &&
  (v.chapter > a.from[0] || (v.chapter === a.from[0] && v.verse >= a.from[1])) &&
  (v.chapter < a.to[0] || (v.chapter === a.to[0] && v.verse <= a.to[1]));

function acrosticLines(a: Acrostic, verses: Verse[]): { v: Verse; start: number; end: number }[] {
  if (!a.starts) return verses.map((v) => ({ v, start: a.skip?.[`${v.chapter}:${v.verse}`] ?? 0, end: v.words.length }));
  const starts = a.starts.map((s) => {
    const [num, word] = s.split(" ");
    const v = verses.find((x) => x.verse === Number(num));
    const start = v ? v.plain.indexOf(word) : -1;
    if (!v || start < 0) throw new Error(`Acrostic ${a.id}: "${s}" not found`);
    return { v, start };
  });
  return starts.map((s, i) => {
    const next = starts[i + 1];
    return { ...s, end: next && next.v === s.v ? next.start : s.v.words.length };
  });
}

export async function getAcrostics(): Promise<AcrosticView[]> {
  const c = await getCorpus();
  return ACROSTICS.map((a) => {
    const lines = acrosticLines(a, c.verses.filter((v) => inRange(v, a)));
    const letters = lines.map(({ v, start }) => normalizeLetters(v.plain[start] ?? "")[0] ?? "");
    const matched = alignToAlphabet(letters);
    let current: string | null = null;
    const shown: AcrosticLine[] = lines.map(({ v, start, end }, i) => {
      const status = matched[i] !== null ? "ok" : letters[i] === current ? "same" : "off";
      if (matched[i] !== null) current = letters[i];
      return { ref: verseRef(v), href: verseHref(v), words: v.words.slice(start, end), letter: letters[i], status };
    });
    const matchedLetters = new Set(matched.filter((j) => j !== null).map((j) => ALEF_BET[j!]));
    const present = new Set(letters);
    const { book, from, to } = a;
    const he = BOOK.get(book)?.he ?? book;
    const ref = from[0] === to[0]
      ? `${he} ${toHebrewNumeral(from[0])}, ${toHebrewNumeral(from[1])}–${toHebrewNumeral(to[1])}`
      : `${he} ${toHebrewNumeral(from[0])}, ${toHebrewNumeral(from[1])} – ${toHebrewNumeral(to[0])}, ${toHebrewNumeral(to[1])}`;
    return {
      id: a.id,
      title: a.title,
      ref,
      about: a.about,
      lines: shown,
      alphabet: ALEF_BET.map((letter) => ({
        letter,
        status: matchedLetters.has(letter) ? "ok" : present.has(letter) ? "order" : "missing",
      })),
    };
  });
}
