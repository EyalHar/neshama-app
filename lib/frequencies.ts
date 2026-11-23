import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { getRootInfo, getVerbRootResolver } from "@/lib/rootLetters";
import { describeMorph } from "@/lib/wordAnalysis";
import { COMPARE_TOP, CUSTOM_MAX, KIND_TAG, OCCURRENCES_PAGE, itemId, type FreqCandidate, type FreqCompare, type FreqItem, type FreqKind, type FreqList, type FreqOccurrences, type FreqScope, type FreqSpellings, type FreqVerse } from "@/lib/frequenciesShared";

// Word and root frequencies over the Tanakh, from OSHB (one index per server process; restart after seeding).
// Three ways to count a word: its dictionary entry (Strong's number of the main word, prefixes and
// suffixes aside), its written form as it stands (with prefixes), and, for verbs, its root (the
// same roots as "שורשים לפי אותיות", via lib/rootLetters.ts). VerseText.text holds the same OSHB
// words, so word n of a verse is text.split(" ")[n - 1].

const SECTIONS: FreqScope[] = ["torah", "nevi", "ketuvim"];
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
// Letters only, finals folded: how typed words, dictionary forms and roots are compared
const fold = (s: string) => s.replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, (c) => FINALS[c]);
const SECTION_OF: Record<string, number> = { תורה: 0, נביאים: 1, כתובים: 2 };
const BOOK = new Map(TANAKH_BOOKS.map((b) => [b.id, b]));
// הָלַךְ: Strong's files its imperfect (וַיֵּלֶךְ) as יָלַךְ, H3212 (as in lib/leitwordSearch.ts)
const SAME_LEXEME: Record<string, string> = { "3212": "1980" };
// The Name written יהוה is H3068, but Strong's files some of it elsewhere: יֱהוִה after אֲדֹנָי (H3069, 306
// times) and names like ״יְהוָה נִסִּי״ (H3070–H3074). Counted by its letters it is the Name: 1,820
// times in the Torah and 6,828 in the Tanakh, the traditional counts.
const NAME_VARIANTS = new Set(["3069", "3070", "3071", "3072", "3073", "3074"]);
const THE_NAME = "3068";
const CONTENT_POS = new Set(["N", "V", "A"]);
const POS_HE: Record<string, string> = {
  N: "שם עצם",
  V: "פועל",
  A: "שם תואר",
  R: "מילת יחס",
  C: "מילת חיבור",
  D: "תואר הפועל",
  T: "מילית",
  P: "כינוי",
  S: "סיומת",
};

type Entry = {
  counts: number[];
  positions: number[];
  content: boolean;
  label: string;
  sub: string;
  pos: string;
  searchHref?: string;
  letters: string; // what a typed query is matched against: the dictionary form / written form / root, finals folded
};
type Verse = { ref: string; href: string; words: string[]; book: string };
// Rows of one written form that are the same word: same dictionary entry, prefixes and morph code
type SpellingGroup = { lemma: string; morph: string; num: string; forms: Map<string, number[]> };
type Index = {
  verseOf: Int32Array; // row → verse index
  wordAt: Int16Array; // row → word index in the verse
  sectionOf: Uint8Array; // row → 0 torah, 1 nevi, 2 ketuvim
  verses: Map<number, Verse>;
  totals: number[];
  kinds: Record<FreqKind, Map<string, Entry>>;
  formLexeme: Map<string, string>; // written form → the entry most of its occurrences belong to
  groups: Map<string, SpellingGroup>; // spelling-variant groups with more than one written form
  formGroups: Map<string, string[]>; // written form → its main groups (≥ MAIN_SHARE of its rows) that have other spellings
  pointings: Map<string, Map<string, number[]>>; // written form → its pointings (meteg aside) → rows
  meta: Map<string, { lemmaHe: string }>;
  rowGroup: (SpellingGroup | undefined)[]; // row → its word (entry + prefixes + morph), groups of one form included
};

// Spelling variants (כתיב מלא / חסר). Two written forms are the same word spelled differently when
// they have the same Strong's number, the same prefixes and the same morph code, and the same letters
// once ו and י are dropped inside the word (not its first or last letter, which are part of the word:
// יָפֶה and פִיָּה stay apart) and a final א is read as ה (לוא / לא, כסא / כסה). Dropping a final ה
// too was tried and rejected: it merges real forms (וַיַּעַן / וַיַּעֲנֶה, בְּלֵיל / בַּלַּיְלָה).
const MAIN_SHARE = 0.1;
function spellingSkeleton(plain: string, prefixes: number): string {
  const s = plain.replace(/[ךםןףץ]/g, (c) => FINALS[c]);
  if (s.length <= prefixes + 1) return s;
  const head = s.slice(0, prefixes + 1);
  const last = s[s.length - 1] === "א" ? "ה" : s[s.length - 1];
  return head + s.slice(prefixes + 1, -1).replace(/[וי]/g, "") + last;
}
// A pointing as compared: meteg, accents and a dagesh in the first letter dropped (it depends on the
// word before: דָּוִד / דָוִד), marks in canonical order. Not in ו, where it is a shuruk (וּ).
const normPointing = (word: string) =>
  word
    .replace(/[\u0591-\u05AF\u05BD/]/g, "")
    .replace(/^([א-הז-ת])([\u05B0-\u05C7]*)/, (_, l: string, marks: string) => l + marks.replace("\u05BC", ""))
    .normalize("NFC");

let indexPromise: Promise<Index> | null = null;

function shortGloss(definition: string): string {
  const first = definition.split(/[;:]/)[0].replace(/\s+/g, " ").trim();
  return first.length > 70 ? first.slice(0, 67) + "…" : first;
}

async function build(): Promise<Index> {
  const [rows, texts, strongs, rootOf, rootInfo] = await Promise.all([
    prisma.wordEntry.findMany({
      select: { verseIndex: true, book: true, wordNum: true, lemma: true, morph: true, plain: true, word: true },
      orderBy: [{ verseIndex: "asc" }, { wordNum: "asc" }],
    }),
    prisma.verseText.findMany({ select: { verseIndex: true, book: true, chapter: true, verse: true, text: true } }),
    prisma.strongsEntry.findMany({ select: { number: true, lemmaHe: true, lemmaPlain: true, definition: true } }),
    getVerbRootResolver(),
    getRootInfo(),
  ]);
  const meta = new Map(strongs.map((s) => [s.number.replace(/^H/, ""), s]));
  const verses = new Map<number, Verse>(
    texts.map((t) => [
      t.verseIndex,
      {
        ref: `${BOOK.get(t.book)?.he ?? t.book} ${toHebrewNumeral(t.chapter)}, ${toHebrewNumeral(t.verse)}`,
        href: `/tanakh?book=${encodeURIComponent(t.book)}&chapter=${t.chapter}&verse=${t.verse}`,
        words: t.text.replace(/ֽ/g, "").split(" "),
        book: BOOK.get(t.book)?.he ?? t.book,
      },
    ])
  );

  const n = rows.length;
  const verseOf = new Int32Array(n), wordAt = new Int16Array(n), sectionOf = new Uint8Array(n);
  const totals = [0, 0, 0];
  const kinds: Record<FreqKind, Map<string, Entry>> = { lexeme: new Map(), form: new Map(), root: new Map() };
  const formSpellings = new Map<string, Map<string, number>>();
  // Function words are shown as written (אֶל, not Strong's אֵל): their most frequent prefix-less spelling
  const bareSpellings = new Map<string, Map<string, number>>();
  const formNums = new Map<string, Map<string, number>>();
  const allGroups = new Map<string, SpellingGroup>();
  const pointings = new Map<string, Map<string, number[]>>();
  const rowGroup: (SpellingGroup | undefined)[] = new Array(rows.length);

  const add = (kind: FreqKind, key: string, row: number, section: number, init: () => Omit<Entry, "counts" | "positions">) => {
    let e = kinds[kind].get(key);
    if (!e) kinds[kind].set(key, (e = { counts: [0, 0, 0], positions: [], ...init() }));
    e.counts[section]++;
    e.positions.push(row);
  };

  rows.forEach((r, i) => {
    const section = SECTION_OF[BOOK.get(r.book)?.section ?? ""] ?? 0;
    verseOf[i] = r.verseIndex;
    wordAt[i] = r.wordNum - 1;
    sectionOf[i] = section;
    totals[section]++;
    const w = parseWord(r.lemma, r.morph);
    const num = !w ? null : NAME_VARIANTS.has(w.num) && /יהוה$/.test(r.plain) ? THE_NAME : SAME_LEXEME[w.num] ?? w.num;
    const content = !!w && CONTENT_POS.has(w.pos);
    const pos = w ? (w.proper ? "שם פרטי" : POS_HE[w.pos] ?? "") : "";

    if (num) {
      add("lexeme", num, i, section, () => {
        const m = meta.get(num);
        return { content, label: m?.lemmaHe ?? r.word, sub: m ? shortGloss(m.definition) : "", pos, letters: fold(m?.lemmaPlain ?? r.plain) };
      });
    }
    add("form", r.plain, i, section, () => ({ content, label: r.plain, sub: num ? meta.get(num)?.lemmaHe ?? "" : "", pos, letters: fold(r.plain) }));
    if (num) {
      const nums = formNums.get(r.plain) ?? new Map<string, number>();
      nums.set(num, (nums.get(num) ?? 0) + 1);
      formNums.set(r.plain, nums);
    }
    const spellings = formSpellings.get(r.plain) ?? new Map<string, number>();
    const pointed = r.word.replace(/ֽ/g, "").replace(/\//g, "");
    spellings.set(pointed, (spellings.get(pointed) ?? 0) + 1);
    formSpellings.set(r.plain, spellings);
    const norm = normPointing(r.word);
    const byPointing = pointings.get(r.plain) ?? new Map<string, number[]>();
    byPointing.set(norm, [...(byPointing.get(norm) ?? []), i]);
    pointings.set(r.plain, byPointing);
    if (num) {
      const parts = r.lemma.split("/").map((p) => p.trim());
      const at = parts.findIndex((p) => /^\d/.test(p));
      const chain = parts.map((p, j) => (j === at ? num : p)).join("/");
      const key = `${chain}|${r.morph}|${spellingSkeleton(r.plain, at)}`;
      let g = allGroups.get(key);
      if (!g) allGroups.set(key, (g = { lemma: r.lemma, morph: r.morph, num, forms: new Map() }));
      rowGroup[i] = g;
      const rowsOf = g.forms.get(r.plain);
      if (rowsOf) rowsOf.push(i);
      else g.forms.set(r.plain, [i]);
    }
    if (num && !content && !r.lemma.includes("/")) {
      const bare = bareSpellings.get(num) ?? new Map<string, number>();
      bare.set(pointed, (bare.get(pointed) ?? 0) + 1);
      bareSpellings.set(num, bare);
    }

    // Hebrew verbs only, as in the roots list (Aramaic verbs have their own Strong's entries)
    if (w?.pos === "V" && num && r.morph.startsWith("H")) {
      const root = rootOf(num);
      if (root) {
        add("root", root, i, section, () => {
          const info = rootInfo.get(root);
          return {
            content: true,
            label: info?.lemmaHe ?? root,
            sub: info ? shortGloss(info.definition) : "",
            pos: "",
            searchHref: `/advanced?tab=root&root=${encodeURIComponent(info?.plain ?? root)}`,
            letters: root,
          };
        });
      }
    }
  });

  // A written form is shown with its most frequent pointing
  const mostFrequent = (m: Map<string, number> | undefined) => [...(m ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const [plain, e] of kinds.form) e.label = mostFrequent(formSpellings.get(plain)) ?? e.label;
  for (const [num, e] of kinds.lexeme) if (!e.content) e.label = mostFrequent(bareSpellings.get(num)) ?? e.label;
  const formLexeme = new Map([...formNums].map(([form, nums]) => [form, mostFrequent(nums)!]));

  const groups = new Map([...allGroups].filter(([, g]) => g.forms.size > 1));
  const formGroups = new Map<string, string[]>();
  for (const [key, g] of groups) {
    for (const [plain, rowsOf] of g.forms) {
      const e = kinds.form.get(plain)!;
      if (rowsOf.length < MAIN_SHARE * e.positions.length) continue;
      formGroups.set(plain, [...(formGroups.get(plain) ?? []), key]);
    }
  }
  for (const keys of formGroups.values()) keys.sort((a, b) => groups.get(b)!.forms.size - groups.get(a)!.forms.size);
  return { verseOf, wordAt, sectionOf, verses, totals, kinds, formLexeme, groups, formGroups, pointings, meta, rowGroup };
}

const getIndex = () => (indexPromise ??= build().catch((e) => ((indexPromise = null), Promise.reject(e))));

const sectionIndex = (scope: FreqScope) => SECTIONS.indexOf(scope); // -1 = the whole Tanakh
const countIn = (e: Entry, s: number) => (s < 0 ? e.counts[0] + e.counts[1] + e.counts[2] : e.counts[s]);

function verseAt(ix: Index, row: number): FreqVerse {
  const v = ix.verses.get(ix.verseOf[row])!;
  return { ...v, at: ix.wordAt[row] };
}

// Other written forms of the same word (spelling variants), for a written form
function variantCount(ix: Index, plain: string): number {
  const others = new Set<string>();
  for (const key of ix.formGroups.get(plain) ?? []) for (const f of ix.groups.get(key)!.forms.keys()) if (f !== plain) others.add(f);
  return others.size;
}

export async function getFrequencies(kind: FreqKind, scope: FreqScope, limit: number, contentOnly: boolean, multiOnly = false): Promise<FreqList> {
  const ix = await getIndex();
  const s = sectionIndex(scope);
  const multi = kind === "form" && multiOnly;
  const entries = [...ix.kinds[kind]].filter(
    ([key, e]) => countIn(e, s) > 0 && (!contentOnly || e.content) && (!multi || ix.formGroups.has(key))
  );
  entries.sort((a, b) => countIn(b[1], s) - countIn(a[1], s));
  const items: FreqItem[] = entries.slice(0, limit).map(([key, e]) => {
    const firstRow = s < 0 ? e.positions[0] : e.positions.find((p) => ix.sectionOf[p] === s)!;
    const item: FreqItem = { key, label: e.label, sub: e.sub, pos: e.pos, count: countIn(e, s), first: verseAt(ix, firstRow), searchHref: e.searchHref };
    if (kind === "form") {
      item.variants = variantCount(ix, key);
      item.pointings = ix.pointings.get(key)?.size ?? 1;
    }
    return item;
  });
  const totalWords = s < 0 ? ix.totals[0] + ix.totals[1] + ix.totals[2] : ix.totals[s];
  return { items, totalWords, distinct: entries.length };
}

// `part` narrows a written form to the rows of one spelling group or one pointing (see getSpellings)
export type OccurrencePart = { group: string } | { pointed: string };

export async function getOccurrences(kind: FreqKind, key: string, scope: FreqScope, offset: number, part?: OccurrencePart): Promise<FreqOccurrences | null> {
  const ix = await getIndex();
  const e = ix.kinds[kind].get(key);
  if (!e) return null;
  let positions = e.positions;
  if (part) {
    if (kind !== "form") return null;
    const sub = "group" in part ? ix.groups.get(part.group)?.forms.get(key) : ix.pointings.get(key)?.get(part.pointed);
    if (!sub) return null;
    positions = sub;
  }
  const s = sectionIndex(scope);
  const rows = s < 0 ? positions : positions.filter((p) => ix.sectionOf[p] === s);
  const page = rows.slice(offset, offset + OCCURRENCES_PAGE);
  const next = offset + OCCURRENCES_PAGE < rows.length ? offset + OCCURRENCES_PAGE : null;
  return { verses: page.map((p) => verseAt(ix, p)), total: rows.length, next };
}

// The COMPARE_TOP most frequent words (or roots) of the whole Tanakh and their count in each section
export async function getComparison(kind: FreqKind, contentOnly: boolean): Promise<FreqCompare> {
  const ix = await getIndex();
  const items = [...ix.kinds[kind]]
    .filter(([, e]) => !contentOnly || e.content)
    .sort((a, b) => countIn(b[1], -1) - countIn(a[1], -1))
    .slice(0, COMPARE_TOP)
    .map(([key, e]) => ({ key, label: e.label, counts: byScope(e.counts) }));
  return { totals: byScope(ix.totals), items };
}

// ---- "השוואה משלי": search for any word or root, and fetch a list of them ----

const byScope = (c: number[]): Record<FreqScope, number> => ({ tanakh: c[0] + c[1] + c[2], torah: c[0], nevi: c[1], ketuvim: c[2] });

const rankCache = new Map<FreqKind, Map<string, number>>();
async function rankOf(kind: FreqKind, key: string): Promise<number> {
  if (!rankCache.has(kind)) {
    const ix = await getIndex();
    const sorted = [...ix.kinds[kind]].sort((a, b) => countIn(b[1], -1) - countIn(a[1], -1));
    rankCache.set(kind, new Map(sorted.map(([k], i) => [k, i + 1])));
  }
  return rankCache.get(kind)!.get(key) ?? 0;
}

const SEARCH_MAX = 8;

// Everything a typed word can mean: dictionary entries spelled so (homonyms apart), the written form
// itself, the entry most of that form's occurrences belong to, and a verb root of those letters
export async function searchFrequencyItems(query: string): Promise<FreqCandidate[]> {
  const ix = await getIndex();
  const q = fold(query);
  if (!q) return [];
  const found: [FreqKind, string][] = [];
  const push = (kind: FreqKind, key: string) => {
    if (ix.kinds[kind].has(key) && !found.some(([k, x]) => k === kind && x === key)) found.push([kind, key]);
  };
  for (const [key, e] of ix.kinds.lexeme) if (e.letters === q) push("lexeme", key);
  for (const [key, e] of ix.kinds.form) {
    if (e.letters !== q) continue;
    push("form", key);
    const main = ix.formLexeme.get(key);
    if (main) push("lexeme", main);
  }
  push("root", q);
  const candidates = await Promise.all(
    found.map(async ([kind, key]) => {
      const e = ix.kinds[kind].get(key)!;
      return { id: itemId(kind, key), kind, label: e.label, sub: e.sub, pos: e.pos, counts: byScope(e.counts), rank: await rankOf(kind, key) };
    })
  );
  return candidates.sort((a, b) => b.counts.tanakh - a.counts.tanakh).slice(0, SEARCH_MAX);
}

// The user's list, in its own order, with each item's count per section
export async function getFrequencyItems(ids: string[]): Promise<FreqCompare> {
  const ix = await getIndex();
  const items = [];
  for (const id of ids.slice(0, CUSTOM_MAX)) {
    const i = id.indexOf(":");
    const kind = id.slice(0, i) as FreqKind;
    const key = id.slice(i + 1);
    const e = ix.kinds[kind]?.get(key);
    if (!e) continue;
    items.push({ key: id, label: e.label, counts: byScope(e.counts), tag: KIND_TAG[kind], rank: await rankOf(kind, key) });
  }
  return { totals: byScope(ix.totals), items };
}

// ---- "צורות כתיבה": how a written form's word is spelled and pointed elsewhere ----

function booksOf(ix: Index, rows: number[]): { book: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const book = ix.verses.get(ix.verseOf[r])!.book;
    counts.set(book, (counts.get(book) ?? 0) + 1);
  }
  return [...counts].map(([book, count]) => ({ book, count })); // rows are in Tanakh order, so books are too
}

// The most frequent of a value over rows
function commonest<T>(rows: number[], of: (row: number) => T): T {
  const counts = new Map<T, number>();
  for (const r of rows) counts.set(of(r), (counts.get(of(r)) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}
const pointedAt = (ix: Index, row: number) => (ix.verses.get(ix.verseOf[row])!.words[ix.wordAt[row]] ?? "").replace(/־$/, "");
// describeMorph() gives a personal pronoun no person: הוּא and הִיא are both "כינוי גוף"
const PERSON: Record<string, string> = { "1": "מדבר", "2": "נוכח", "3": "נסתר" };
const NUMBER: Record<string, string> = { s: "יחיד", p: "רבים" };
const GENDER: Record<string, string> = { m: "זכר", f: "נקבה", c: "" };
function describeGroup(ix: Index, g: SpellingGroup) {
  const seg = parseWord(g.lemma, g.morph)?.seg ?? "";
  const pronoun = /^Pp([123])([mfc])([sp])/.exec(seg);
  const person = pronoun ? ` · ${[PERSON[pronoun[1]], NUMBER[pronoun[3]], GENDER[pronoun[2]]].filter(Boolean).join(" ")}` : "";
  return { lexeme: ix.meta.get(g.num)?.lemmaHe ?? "", parse: describeMorph(g.lemma, g.morph) + person };
}

export async function getSpellings(plain: string): Promise<FreqSpellings | null> {
  const ix = await getIndex();
  const e = ix.kinds.form.get(plain);
  if (!e) return null;
  const groups = (ix.formGroups.get(plain) ?? []).map((id) => {
    const g = ix.groups.get(id)!;
    const forms = [...g.forms]
      .map(([form, rows]) => ({
        plain: form,
        label: commonest(rows, (r) => pointedAt(ix, r)),
        count: rows.length,
        books: booksOf(ix, rows),
        first: verseAt(ix, rows[0]),
      }))
      .sort((a, b) => b.count - a.count);
    return {
      id,
      ...describeGroup(ix, g),
      total: forms.reduce((n, f) => n + f.count, 0),
      forms,
    };
  });
  const byPointing = ix.pointings.get(plain) ?? new Map<string, number[]>();
  const pointings = [...byPointing]
    .map(([pointed, rows]) => {
      const g = commonest(rows, (r) => ix.rowGroup[r]);
      return { pointed, label: commonest(rows, (r) => pointedAt(ix, r)), count: rows.length, first: verseAt(ix, rows[0]), ...(g ? describeGroup(ix, g) : { lexeme: "", parse: "" }) };
    })
    .sort((a, b) => b.count - a.count);
  return { form: plain, total: e.positions.length, groups, pointings: pointings.length > 1 ? pointings : [] };
}
