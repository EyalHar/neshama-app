import { prisma } from "@/lib/prisma";
import { fetchStrongsMeta } from "@/lib/rootFamily";
import { getCorpusCounts, parseWord } from "@/lib/wordStats";

// "Leitwort" (מילה מנחה) detection: words a chapter repeats far more often than their usual
// frequency across the whole Tanakh. Scored with the log-likelihood ratio (G²) of the chapter
// count against the Tanakh-wide rate, so common verbs like אמר don't surface merely for being
// common, while a rare word repeated a few times does.

export type Leitword = {
  strongs: string; // lead Strong's number of the group (no "H" prefix)
  lemmaHe: string;
  count: number;
  ratio: number; // observed / expected
  // Unpointed surface forms (WordEntry.plain) of the group's words in each verse, for highlighting
  forms: Record<number, string[]>;
};

const MIN_COUNT = 3;
const MIN_SCORE = 10.83; // G² critical value for p < 0.001 (1 d.f.)
// A very common word can pass MIN_SCORE on sheer count while barely above its usual rate
// (e.g. אמר ×18 in Gen 22 at 2.8×) — require a real concentration too.
const MIN_RATIO = 3;
const MAX_RESULTS = 5;
const CONTENT_POS = new Set(["N", "V", "A"]); // noun, verb, adjective — no particles

function logLikelihood(k: number, n: number, K: number, N: number): number {
  const e1 = (n * K) / N;
  const e2 = ((N - n) * K) / N;
  const term = (o: number, e: number) => (o > 0 ? o * Math.log(o / e) : 0);
  return 2 * (term(k, e1) + term(K - k, e2));
}

export async function getChapterLeitwords(book: string, chapter: number): Promise<Leitword[]> {
  const rows = await prisma.wordEntry.findMany({
    where: { book, chapter },
    select: { verse: true, lemma: true, morph: true, plain: true },
  });
  if (rows.length === 0) return [];

  const { counts, total } = await getCorpusCounts();
  const words = rows.flatMap((r) => {
    const w = parseWord(r.lemma, r.morph);
    return w ? [{ ...w, verse: r.verse, plain: r.plain }] : [];
  });
  const n = words.length;
  const candidates = words.filter((w) => CONTENT_POS.has(w.pos) && !w.proper);
  const nums = [...new Set(candidates.map((w) => w.num))];

  // Merge a word into its single direct parent when both appear in the chapter
  // (e.g. בְּרָכָה H1293 into בָּרַךְ H1288), so one root isn't split into two weaker entries.
  const meta = await fetchStrongsMeta(nums.map((x) => `H${x}`));
  const present = new Set(nums);
  const groupOf = new Map<string, string>();
  for (const num of nums) {
    const parents = (meta.get(`H${num}`)?.derivedFrom ?? "").split(",").filter(Boolean);
    const parent = parents.length === 1 ? parents[0].replace(/^H/, "") : null;
    groupOf.set(num, parent && present.has(parent) ? parent : num);
  }

  const groups = new Map<string, { members: Set<string>; words: typeof candidates }>();
  for (const w of candidates) {
    const key = groupOf.get(w.num)!;
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
    const forms: Record<number, string[]> = {};
    for (const w of g.words) (forms[w.verse] ??= []).push(w.plain);
    scored.push({
      leitword: {
        strongs: key,
        lemmaHe: meta.get(`H${key}`)?.lemmaHe ?? key,
        count: k,
        ratio: Math.round(ratio * 10) / 10,
        forms,
      },
      score,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.leitword);
}
