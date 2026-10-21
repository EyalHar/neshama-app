import { prisma } from "@/lib/prisma";
import { fetchStrongsMeta } from "@/lib/rootFamily";
import { getCorpusCounts, parseWord, type ParsedWord } from "@/lib/wordStats";
import { compareRefs, refKey, type VerseRef } from "@/lib/divisions";

// "Leitwort" (מילה מנחה) detection: words a passage (chapter, parasha or parashiya) repeats far
// more often than their usual frequency across the whole Tanakh. Scored with the log-likelihood
// ratio (G²) of the passage count against the Tanakh-wide rate, so common verbs don't surface
// merely for being common, while a rare word repeated a few times does.

export type Leitword = {
  strongs: string; // lead Strong's number of the group (no "H" prefix)
  lemmaHe: string;
  count: number;
  ratio: number; // observed / expected
  // Unpointed surface forms (WordEntry.plain) of the group's words, keyed "chapter:verse"
  forms: Record<string, string[]>;
};

const MIN_COUNT = 3;
const MIN_SCORE = 10.83; // G² critical value for p < 0.001 (1 d.f.)
// A very common word can pass MIN_SCORE on sheer count while barely above its usual rate
// (e.g. אמר ×18 in Gen 22 at 2.8×) — require a real concentration too.
const MIN_RATIO = 3;
const MAX_RESULTS = 5;
const MAX_SECTION_RESULTS = 3;
// Measured over the Torah's 667 parashiyot: under 4 verses only 38% yield anything, and it's
// mostly list structure (e.g. שָׁנֶה in a genealogy), not a leitwort; from 4 verses it's 89%.
export const MIN_SECTION_VERSES = 4;
const CONTENT_POS = new Set(["N", "V", "A"]); // noun, verb, adjective — no particles
// Very general words that pass the statistics in long passages without saying anything about
// the passage: כֹּל, הָיָה, עָשָׂה, אָמַר, דָּבַר (verb)
const STOPLIST = new Set(["3605", "1961", "6213", "559", "1696"]);

type Word = ParsedWord & { ref: VerseRef; plain: string };

function logLikelihood(k: number, n: number, K: number, N: number): number {
  const e1 = (n * K) / N;
  const e2 = ((N - n) * K) / N;
  const term = (o: number, e: number) => (o > 0 ? o * Math.log(o / e) : 0);
  return 2 * (term(k, e1) + term(K - k, e2));
}

function scoreWords(
  words: Word[],
  counts: Map<string, number>,
  total: number,
  parentOf: Map<string, string | null>,
  lemmaOf: Map<string, string>,
  max: number
): Leitword[] {
  const n = words.length;
  const candidates = words.filter((w) => CONTENT_POS.has(w.pos) && !w.proper && !STOPLIST.has(w.num));
  const present = new Set(candidates.map((w) => w.num));

  // Merge a word into its single direct parent when both appear in the passage
  // (e.g. בְּרָכָה H1293 into בָּרַךְ H1288), so one root isn't split into two weaker entries.
  const groups = new Map<string, { members: Set<string>; words: Word[] }>();
  for (const w of candidates) {
    const parent = parentOf.get(w.num);
    const key = parent && present.has(parent) ? parent : w.num;
    const g = groups.get(key) ?? { members: new Set(), words: [] };
    g.members.add(w.num);
    g.words.push(w);
    groups.set(key, g);
  }

  const scored: { leitword: Leitword; score: number }[] = [];
  for (const [key, g] of groups) {
    const k = g.words.length;
    if (k < MIN_COUNT) continue;
    const K = [...g.members].reduce((sum, m) => sum + (counts.get(m) ?? 0), 0);
    if (K < k) continue;
    const score = logLikelihood(k, n, K, total);
    const ratio = k / ((n * K) / total);
    if (score < MIN_SCORE || ratio < MIN_RATIO) continue;
    const forms: Record<string, string[]> = {};
    for (const w of g.words) (forms[refKey(...w.ref)] ??= []).push(w.plain);
    scored.push({
      leitword: { strongs: key, lemmaHe: lemmaOf.get(key) ?? key, count: k, ratio: Math.round(ratio * 10) / 10, forms },
      score,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, max).map((s) => s.leitword);
}

// Leitwords for a whole passage, plus for each sub-section (parashiya) of at least
// MIN_SECTION_VERSES verses — null for shorter sections.
export async function getPassageLeitwords(
  book: string,
  from: VerseRef,
  to: VerseRef,
  sections: { start: VerseRef; end: VerseRef }[] = []
): Promise<{ passage: Leitword[]; sections: (Leitword[] | null)[] }> {
  const rows = await prisma.wordEntry.findMany({
    where: { book, chapter: { gte: from[0], lte: to[0] } },
    select: { chapter: true, verse: true, lemma: true, morph: true, plain: true },
  });
  const words: Word[] = rows.flatMap((r) => {
    const ref: VerseRef = [r.chapter, r.verse];
    if (compareRefs(ref, from) < 0 || compareRefs(ref, to) > 0) return [];
    const w = parseWord(r.lemma, r.morph);
    return w ? [{ ...w, ref, plain: r.plain }] : [];
  });
  if (words.length === 0) return { passage: [], sections: sections.map(() => null) };

  const { counts, total } = await getCorpusCounts();
  const meta = await fetchStrongsMeta([...new Set(words.map((w) => `H${w.num}`))]);
  const parentOf = new Map<string, string | null>();
  const lemmaOf = new Map<string, string>();
  for (const [number, m] of meta) {
    const num = number.replace(/^H/, "");
    const parents = (m.derivedFrom ?? "").split(",").filter(Boolean);
    parentOf.set(num, parents.length === 1 ? parents[0].replace(/^H/, "") : null);
    lemmaOf.set(num, m.lemmaHe);
  }

  const passage = scoreWords(words, counts, total, parentOf, lemmaOf, MAX_RESULTS);
  const sectionResults = sections.map((s) => {
    const inSection = words.filter((w) => compareRefs(w.ref, s.start) >= 0 && compareRefs(w.ref, s.end) <= 0);
    const verseCount = new Set(inSection.map((w) => refKey(...w.ref))).size;
    return verseCount >= MIN_SECTION_VERSES ? scoreWords(inSection, counts, total, parentOf, lemmaOf, MAX_SECTION_RESULTS) : null;
  });
  return { passage, sections: sectionResults };
}
