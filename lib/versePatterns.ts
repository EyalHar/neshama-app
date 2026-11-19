import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import type { ChiasmVerse, RepeatGroup, RepeatKind, VersePatterns } from "@/lib/versePatternsShared";

// Word-level patterns inside a verse, from OSHB lexemes (cached per server process; restart after seeding).
// VerseText.text holds the same OSHB words joined by spaces, so word n of a verse is text.split(" ")[n - 1].

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));
const ref = (book: string, chapter: number, verse: number) => `${BOOK_HE.get(book) ?? book} ${toHebrewNumeral(chapter)}, ${toHebrewNumeral(verse)}`;
const href = (book: string, chapter: number, verse: number) => `/tanakh?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`;

// Lexemes that are the same word for this purpose (as in lib/leitwordSearch.ts)
const SAME_LEXEME: Record<string, string> = { "3212": "1980" };
const CONTENT_POS = new Set(["N", "V", "A"]);
const MIN_PAIRS = 2;

type Word = { num: string | null; pos: string; proper: boolean; plain: string };

const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const fold = (s: string) => s.replace(/[ךםןףץ]/g, (c) => FINALS[c]);

// The longest mirror A B … B A among the verse's content words (nouns, verbs, adjectives), by lexeme,
// with at least two pairs of two different lexemes: שֹׁפֵךְ דַּם הָאָדָם בָּאָדָם דָּמוֹ יִשָּׁפֵךְ
function findChiasm(words: Word[]): { pairs: [number, number][]; center: number | null } | null {
  const items = words.flatMap((w, i) => (w.num && CONTENT_POS.has(w.pos) ? [{ i, num: w.num }] : []));
  const n = items.length;
  let best: { pairs: [number, number][]; center: number | null; width: number } | null = null;
  for (let c = 0; c < 2 * n - 1; c++) {
    let l = Math.floor(c / 2), r = Math.ceil(c / 2);
    const center = l === r ? items[l].i : null;
    if (l === r) {
      l--;
      r++;
    }
    const pairs: [number, number][] = [];
    while (l >= 0 && r < n && items[l].num === items[r].num) {
      pairs.push([items[l].i, items[r].i]);
      l--;
      r++;
    }
    // Two adjacent words of one name (מִבַּעַל שָׁלִשָׁה, one Strong's number) are a center, not a pair
    if (pairs.length && pairs[0][1] - pairs[0][0] === 1 && words[pairs[0][0]].proper) pairs.shift();
    if (pairs.length < MIN_PAIRS || new Set(pairs.map(([a]) => words[a].num)).size < MIN_PAIRS) continue;
    const width = pairs[pairs.length - 1][1] - pairs[pairs.length - 1][0];
    if (!best || pairs.length > best.pairs.length || (pairs.length === best.pairs.length && width < best.width))
      best = { pairs: pairs.reverse(), center, width };
  }
  return best && { pairs: best.pairs, center: best.center };
}

function repeatKind(w: Word): RepeatKind {
  if (w.proper) return "name";
  if (w.pos === "V") return "verb";
  if (w.pos === "N" || w.pos === "A") return "noun";
  return "other";
}

let cache: Promise<VersePatterns> | null = null;

async function build(): Promise<VersePatterns> {
  const [entries, texts] = await Promise.all([
    prisma.wordEntry.findMany({ select: { verseIndex: true, wordNum: true, lemma: true, morph: true, plain: true }, orderBy: [{ verseIndex: "asc" }, { wordNum: "asc" }] }),
    prisma.verseText.findMany({ select: { verseIndex: true, book: true, chapter: true, verse: true, text: true } }),
  ]);
  const verseOf = new Map(texts.map((t) => [t.verseIndex, t]));
  const byVerse = new Map<number, Word[]>();
  for (const e of entries) {
    const p = parseWord(e.lemma, e.morph);
    const num = p ? SAME_LEXEME[p.num] ?? p.num : null;
    if (!byVerse.has(e.verseIndex)) byVerse.set(e.verseIndex, []);
    byVerse.get(e.verseIndex)![e.wordNum - 1] = { num, pos: p?.pos ?? "", proper: p?.proper ?? false, plain: fold(e.plain) };
  }

  const chiasms: ChiasmVerse[] = [];
  const repeats = new Map<string, RepeatGroup>();
  for (const [vi, words] of byVerse) {
    const t = verseOf.get(vi);
    if (!t) continue;
    const pointed = t.text.replace(/ֽ/g, "").split(" ");
    if (pointed.length !== words.length) continue; // the shared-word invariant; skip rather than mis-mark
    const base = { book: t.book, chapter: t.chapter, verse: t.verse, ref: ref(t.book, t.chapter, t.verse), href: href(t.book, t.chapter, t.verse), words: pointed };

    const chiasm = findChiasm(words);
    if (chiasm) chiasms.push({ ...base, ...chiasm });

    // Same letters and same lexeme: אֶל אֵל (preposition, then the Name) is not a repeat
    const same = (a: Word, b: Word) => a.plain === b.plain && a.num === b.num;
    for (let i = 0; i + 1 < words.length; i++) {
      if (!same(words[i], words[i + 1]) || (i > 0 && same(words[i - 1], words[i]))) continue;
      let k = i + 1;
      while (k + 1 < words.length && same(words[k + 1], words[i])) k++;
      const times = k - i + 1;
      const key = `${words[i].plain}×${times}`;
      if (!repeats.has(key)) repeats.set(key, { word: pointed[i], times, kind: repeatKind(words[i]), hits: [] });
      repeats.get(key)!.hits.push({ ...base, at: [i, k] });
    }
  }
  chiasms.sort((a, b) => b.pairs.length - a.pairs.length || a.pairs[0][1] - a.pairs[0][0] - (b.pairs[0][1] - b.pairs[0][0]));
  return { chiasms, repeats: [...repeats.values()].sort((a, b) => b.times - a.times || b.hits.length - a.hits.length) };
}

export const getVersePatterns = () => (cache ??= build().catch((e) => ((cache = null), Promise.reject(e))));
