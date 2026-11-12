import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { fetchStrongsMeta } from "@/lib/rootFamily";
import { parallelOf } from "@/lib/parallels";

// "מאין ההד": verses elsewhere in the Tanakh that echo a verse — they share a combination of
// words that is rare in the whole Tanakh. Two kinds of shared features, each weighted by its
// rarity, log(N / number of verses that have it):
// - a pair of content lexemes (nouns, verbs, adjectives; no proper names) anywhere in both verses
//   — וַיִּקַּח … הַמַּאֲכֶלֶת (Gen 22:10 / Judg 19:29)
// - two consecutive words in the same surface form, function words included, which catches
//   phrases built on one rare word plus a particle — הַכֶּר נָא (Gen 37:32 / 38:25)
// Only features found in at most MAX_DF verses count, and verses in the same chapter are skipped
// (repetition inside a story is not an echo). The index is built once per server process from
// WordEntry (restart after seeding).

const MAX_DF = 6;
const MIN_SCORE = 8;
const STRONG_SCORE = 15;
const MAX_ECHOES = 10;

type Word = { wordNum: number; num: string | null; content: boolean; form: string };
type VerseEntry = { book: string; chapter: number; verse: number; words: Word[]; lexemes: string[] };
type Index = {
  verses: Map<number, VerseEntry>;
  byRef: Map<string, number>;
  pairs: Map<string, number[]>;
  bigrams: Map<string, number[]>;
  total: number;
};

export type EchoVerse = { book: string; bookHe: string; chapter: number; verse: number; text: string; highlight: number[] };
export type Echo = EchoVerse & {
  score: number;
  strength: "strong" | "weak";
  // The two verses are a matched pair of a passage told twice (/parallels/[id])
  parallelId: number | null;
  shared: string[];
  phrases: string[];
  // Word numbers to highlight in the asked verse for this echo
  sourceHighlight: number[];
};
// `sourceText`: the asked verse as VerseText spells it, so `sourceHighlight` word numbers apply to it
export type EchoResult = { sourceText: string; echoes: Echo[] };

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));
const refKey = (book: string, chapter: number, verse: number) => `${book}:${chapter}:${verse}`;
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
// The conjunction ו doesn't change the phrase (לֶךְ לְךָ / וְלֶךְ לְךָ)
const surface = (plain: string) => plain.replace(/^ו(?=..)/, "");

function addTo(map: Map<string, number[]>, key: string, vi: number) {
  const list = map.get(key);
  if (list) list.push(vi);
  else map.set(key, [vi]);
}

let indexPromise: Promise<Index> | null = null;

function getIndex(): Promise<Index> {
  indexPromise ??= (async () => {
    const rows = await prisma.$queryRawUnsafe<
      { book: string; chapter: number; verse: number; verseIndex: number; wordNum: number; lemma: string; morph: string; plain: string }[]
    >(`SELECT book, chapter, verse, verseIndex, wordNum, lemma, morph, plain FROM "WordEntry" ORDER BY verseIndex, wordNum`);

    const verses = new Map<number, VerseEntry>();
    for (const r of rows) {
      const vi = Number(r.verseIndex);
      let v = verses.get(vi);
      if (!v) {
        v = { book: r.book, chapter: Number(r.chapter), verse: Number(r.verse), words: [], lexemes: [] };
        verses.set(vi, v);
      }
      const w = parseWord(r.lemma, r.morph);
      const content = !!w && ["N", "V", "A"].includes(w.pos) && !w.proper;
      v.words.push({ wordNum: Number(r.wordNum), num: w?.num ?? null, content, form: surface(r.plain) });
    }

    const pairs = new Map<string, number[]>();
    const bigrams = new Map<string, number[]>();
    const byRef = new Map<string, number>();
    for (const [vi, v] of verses) {
      byRef.set(refKey(v.book, v.chapter, v.verse), vi);
      v.lexemes = [...new Set(v.words.filter((w) => w.content).map((w) => w.num!))];
      for (let i = 0; i < v.lexemes.length; i++) {
        for (let j = i + 1; j < v.lexemes.length; j++) addTo(pairs, pairKey(v.lexemes[i], v.lexemes[j]), vi);
      }
      const seen = new Set<string>();
      for (let i = 0; i + 1 < v.words.length; i++) {
        const k = `${v.words[i].form} ${v.words[i + 1].form}`;
        if (!seen.has(k)) { seen.add(k); addTo(bigrams, k, vi); }
      }
    }
    // Only rare features are ever used: drop the rest to keep the index small
    for (const map of [pairs, bigrams]) for (const [k, list] of map) if (list.length > MAX_DF) map.delete(k);
    return { verses, byRef, pairs, bigrams, total: verses.size };
  })();
  return indexPromise;
}

type Match = { score: number; lexemes: Set<string>; phrases: Set<string> };

export async function findEchoes(book: string, chapter: number, verse: number): Promise<EchoResult | null> {
  const index = await getIndex();
  const vi = index.byRef.get(refKey(book, chapter, verse));
  if (vi === undefined) return null;
  const source = index.verses.get(vi)!;

  const matches = new Map<number, Match>();
  const credit = (list: number[] | undefined, apply: (m: Match) => void) => {
    if (!list) return;
    const weight = Math.log(index.total / list.length);
    for (const other of list) {
      const o = index.verses.get(other)!;
      if (other === vi || (o.book === source.book && o.chapter === source.chapter)) continue;
      const m = matches.get(other) ?? { score: 0, lexemes: new Set(), phrases: new Set() };
      m.score += weight;
      apply(m);
      matches.set(other, m);
    }
  };

  const lx = source.lexemes;
  for (let i = 0; i < lx.length; i++) {
    for (let j = i + 1; j < lx.length; j++) {
      credit(index.pairs.get(pairKey(lx[i], lx[j])), (m) => { m.lexemes.add(lx[i]); m.lexemes.add(lx[j]); });
    }
  }
  const seen = new Set<string>();
  for (let i = 0; i + 1 < source.words.length; i++) {
    const k = `${source.words[i].form} ${source.words[i + 1].form}`;
    if (seen.has(k)) continue;
    seen.add(k);
    credit(index.bigrams.get(k), (m) => m.phrases.add(k));
  }

  const top = [...matches]
    .filter(([, m]) => m.score >= MIN_SCORE)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_ECHOES);
  if (top.length === 0) return { sourceText: "", echoes: [] };

  const allLexemes = new Set(top.flatMap(([, m]) => [...m.lexemes]));
  const [meta, texts] = await Promise.all([
    fetchStrongsMeta([...allLexemes].map((n) => `H${n}`)),
    prisma.verseText.findMany({
      where: { OR: [source, ...top.map(([o]) => index.verses.get(o)!)].map((v) => ({ book: v.book, chapter: v.chapter, verse: v.verse })) },
      select: { book: true, chapter: true, verse: true, text: true },
    }),
  ]);
  const textOf = new Map(texts.map((t) => [refKey(t.book, t.chapter, t.verse), t.text]));

  // Words of a verse that carry a shared lexeme or are part of a shared phrase
  const highlightIn = (v: VerseEntry, m: Match) => {
    const marked = new Set<number>();
    v.words.forEach((w, i) => {
      if (w.content && m.lexemes.has(w.num!)) marked.add(w.wordNum);
      const next = v.words[i + 1];
      if (next && m.phrases.has(`${w.form} ${next.form}`)) { marked.add(w.wordNum); marked.add(next.wordNum); }
    });
    return [...marked].sort((a, b) => a - b);
  };
  const words = (v: VerseEntry) => (textOf.get(refKey(v.book, v.chapter, v.verse)) ?? "").split(" ");
  const sourceWords = words(source);

  return {
    sourceText: sourceWords.join(" "),
    echoes: top.map(([other, m]) => {
      const o = index.verses.get(other)!;
      // Phrases shown as the asked verse spells them, with nikud
      const phrases = source.words.flatMap((w, i) => {
        const next = source.words[i + 1];
        return next && m.phrases.has(`${w.form} ${next.form}`)
          ? [`${sourceWords[w.wordNum - 1] ?? w.form} ${sourceWords[next.wordNum - 1] ?? next.form}`]
          : [];
      });
      return {
        book: o.book,
        bookHe: BOOK_HE.get(o.book) ?? o.book,
        chapter: o.chapter,
        verse: o.verse,
        text: textOf.get(refKey(o.book, o.chapter, o.verse)) ?? "",
        highlight: highlightIn(o, m),
        sourceHighlight: highlightIn(source, m),
        score: Math.round(m.score * 10) / 10,
        strength: m.score >= STRONG_SCORE ? "strong" : "weak",
        parallelId: parallelOf(source.book, source.chapter, source.verse, o.book, o.chapter, o.verse),
        shared: [...m.lexemes].map((n) => meta.get(`H${n}`)?.lemmaHe ?? n),
        phrases: [...new Set(phrases)],
      };
    }),
  };
}
