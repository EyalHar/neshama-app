import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { getRootInfo, getVerbRootResolver } from "@/lib/rootLetters";
import { COMPARE_TOP, OCCURRENCES_PAGE, type FreqCompare, type FreqItem, type FreqKind, type FreqList, type FreqOccurrences, type FreqScope, type FreqVerse } from "@/lib/frequenciesShared";

// Word and root frequencies over the Tanakh, from OSHB (one index per server process; restart after seeding).
// Three ways to count a word: its dictionary entry (Strong's number of the main word, prefixes and
// suffixes aside), its written form as it stands (with prefixes), and, for verbs, its root (the
// same roots as "שורשים לפי אותיות", via lib/rootLetters.ts). VerseText.text holds the same OSHB
// words, so word n of a verse is text.split(" ")[n - 1].

const SECTIONS: FreqScope[] = ["torah", "nevi", "ketuvim"];
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

type Entry = { counts: number[]; positions: number[]; content: boolean; label: string; sub: string; pos: string; searchHref?: string };
type Verse = { ref: string; href: string; words: string[] };
type Index = {
  verseOf: Int32Array; // row → verse index
  wordAt: Int16Array; // row → word index in the verse
  sectionOf: Uint8Array; // row → 0 torah, 1 nevi, 2 ketuvim
  verses: Map<number, Verse>;
  totals: number[];
  kinds: Record<FreqKind, Map<string, Entry>>;
};

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
    prisma.strongsEntry.findMany({ select: { number: true, lemmaHe: true, definition: true } }),
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
        return { content, label: m?.lemmaHe ?? r.word, sub: m ? shortGloss(m.definition) : "", pos };
      });
    }
    add("form", r.plain, i, section, () => ({ content, label: r.plain, sub: num ? meta.get(num)?.lemmaHe ?? "" : "", pos }));
    const spellings = formSpellings.get(r.plain) ?? new Map<string, number>();
    const pointed = r.word.replace(/ֽ/g, "").replace(/\//g, "");
    spellings.set(pointed, (spellings.get(pointed) ?? 0) + 1);
    formSpellings.set(r.plain, spellings);
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
          };
        });
      }
    }
  });

  // A written form is shown with its most frequent pointing
  const mostFrequent = (m: Map<string, number> | undefined) => [...(m ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const [plain, e] of kinds.form) e.label = mostFrequent(formSpellings.get(plain)) ?? e.label;
  for (const [num, e] of kinds.lexeme) if (!e.content) e.label = mostFrequent(bareSpellings.get(num)) ?? e.label;
  return { verseOf, wordAt, sectionOf, verses, totals, kinds };
}

const getIndex = () => (indexPromise ??= build().catch((e) => ((indexPromise = null), Promise.reject(e))));

const sectionIndex = (scope: FreqScope) => SECTIONS.indexOf(scope); // -1 = the whole Tanakh
const countIn = (e: Entry, s: number) => (s < 0 ? e.counts[0] + e.counts[1] + e.counts[2] : e.counts[s]);

function verseAt(ix: Index, row: number): FreqVerse {
  const v = ix.verses.get(ix.verseOf[row])!;
  return { ...v, at: ix.wordAt[row] };
}

export async function getFrequencies(kind: FreqKind, scope: FreqScope, limit: number, contentOnly: boolean): Promise<FreqList> {
  const ix = await getIndex();
  const s = sectionIndex(scope);
  const entries = [...ix.kinds[kind]].filter(([, e]) => countIn(e, s) > 0 && (!contentOnly || e.content));
  entries.sort((a, b) => countIn(b[1], s) - countIn(a[1], s));
  const items: FreqItem[] = entries.slice(0, limit).map(([key, e]) => {
    const firstRow = s < 0 ? e.positions[0] : e.positions.find((p) => ix.sectionOf[p] === s)!;
    return { key, label: e.label, sub: e.sub, pos: e.pos, count: countIn(e, s), first: verseAt(ix, firstRow), searchHref: e.searchHref };
  });
  const totalWords = s < 0 ? ix.totals[0] + ix.totals[1] + ix.totals[2] : ix.totals[s];
  return { items, totalWords, distinct: entries.length };
}

export async function getOccurrences(kind: FreqKind, key: string, scope: FreqScope, offset: number): Promise<FreqOccurrences | null> {
  const ix = await getIndex();
  const e = ix.kinds[kind].get(key);
  if (!e) return null;
  const s = sectionIndex(scope);
  const rows = s < 0 ? e.positions : e.positions.filter((p) => ix.sectionOf[p] === s);
  const page = rows.slice(offset, offset + OCCURRENCES_PAGE);
  const next = offset + OCCURRENCES_PAGE < rows.length ? offset + OCCURRENCES_PAGE : null;
  return { verses: page.map((p) => verseAt(ix, p)), total: rows.length, next };
}

// The COMPARE_TOP most frequent words (or roots) of the whole Tanakh and their count in each section
export async function getComparison(kind: FreqKind, contentOnly: boolean): Promise<FreqCompare> {
  const ix = await getIndex();
  const byScope = (c: number[]): Record<FreqScope, number> => ({ tanakh: c[0] + c[1] + c[2], torah: c[0], nevi: c[1], ketuvim: c[2] });
  const items = [...ix.kinds[kind]]
    .filter(([, e]) => !contentOnly || e.content)
    .sort((a, b) => countIn(b[1], -1) - countIn(a[1], -1))
    .slice(0, COMPARE_TOP)
    .map(([key, e]) => ({ key, label: e.label, counts: byScope(e.counts) }));
  return { totals: byScope(ix.totals), items };
}
