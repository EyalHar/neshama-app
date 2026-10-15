import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { getCorpusCounts, parseWord } from "@/lib/wordStats";

// Grammar quiz built entirely from OSHB data (WordEntry + StrongsEntry) — no LLM, so the
// correct answer is always right. Questions ask for the root or the binyan of a verb in
// context. Difficulty comes from root frequency, and for root questions also from how
// similar the distractor roots look.

export type QuizType = "root" | "binyan";
export type QuizLevel = "easy" | "medium" | "hard";

export type GrammarQuestion = {
  type: QuizType;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  words: string[]; // verse words (nikud, no ta'amim), aligned with WordEntry.wordNum
  wordIndex: number;
  options: string[];
  answerIndex: number;
  explanation: { root: string; binyan: string; form: string };
};

export const BINYANIM: Record<string, string> = {
  q: "קל", N: "נפעל", p: "פיעל", P: "פועל", h: "הפעיל", H: "הופעל", t: "התפעל",
};

const TENSE: Record<string, string> = {
  p: "עבר", q: "עבר (וי״ו ההיפוך)", i: "עתיד", w: "עתיד (וי״ו ההיפוך)", h: "עתיד (מוארך)",
  j: "עתיד (מקוצר)", v: "ציווי", r: "בינוני", s: "בינוני פעול", a: "מקור מוחלט", c: "מקור נטוי",
};
const PERSON: Record<string, string> = { "1": "מדבר", "2": "נוכח", "3": "נסתר" };
const GENDER: Record<string, string> = { m: "זכר", f: "נקבה", c: "זכר ונקבה" };
const NUMBER: Record<string, string> = { s: "יחיד", p: "רבים", d: "זוגי" };

// "Vqw3ms" → "קל · עתיד (וי״ו ההיפוך) · נסתר יחיד זכר"
function describeVerb(seg: string): string {
  const [, stem, tense, ...rest] = seg;
  const parts = [BINYANIM[stem], TENSE[tense]];
  const hasPerson = /[123]/.test(rest[0] ?? "");
  const [person, gender, number] = hasPerson ? rest : [undefined, ...rest];
  const pgn = [person && PERSON[person], number && NUMBER[number], gender && GENDER[gender]].filter(Boolean).join(" ");
  if (pgn) parts.push(pgn);
  return parts.filter(Boolean).join(" · ");
}

const FINAL_TO_REGULAR: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

// "ברך" → "ב.ר.כ" — the conventional way of writing a root (regular, not final, letters)
function formatRoot(plain: string): string {
  return [...plain].map((c) => FINAL_TO_REGULAR[c] ?? c).join(".");
}

type VerbWord = { book: string; chapter: number; verse: number; wordNum: number; root: string; stem: string; seg: string };

const LEVEL_OF = (freq: number): QuizLevel | null =>
  freq >= 300 ? "easy" : freq >= 50 ? "medium" : freq >= 5 ? "hard" : null;

type Pool = {
  byLevel: Record<QuizLevel, VerbWord[]>;
  byLevelStem: Record<QuizLevel, Record<string, VerbWord[]>>;
  roots: string[]; // every distinct root with ≥5 occurrences, for distractors
};

let pool: Promise<Pool> | null = null;

// All Hebrew verbs in the seven main binyanim, bucketed by root frequency — built once per process
function getPool(): Promise<Pool> {
  pool ??= (async () => {
    const [{ counts }, rows, strongs] = await Promise.all([
      getCorpusCounts(),
      prisma.$queryRawUnsafe<{ book: string; chapter: number; verse: number; wordNum: number; lemma: string; morph: string }[]>(
        `SELECT book, chapter, verse, wordNum, lemma, morph FROM "WordEntry" WHERE morph LIKE 'H%' AND morph GLOB '*V*'`
      ),
      prisma.strongsEntry.findMany({ select: { number: true, lemmaPlain: true } }),
    ]);
    const rootOf = new Map(strongs.map((s) => [s.number.replace(/^H/, ""), formatRoot(s.lemmaPlain)]));

    const byLevel: Pool["byLevel"] = { easy: [], medium: [], hard: [] };
    const byLevelStem: Pool["byLevelStem"] = { easy: {}, medium: {}, hard: {} };
    const roots = new Set<string>();
    for (const r of rows) {
      const w = parseWord(r.lemma, r.morph);
      if (!w || w.pos !== "V" || !BINYANIM[w.seg[1]]) continue;
      const root = rootOf.get(w.num);
      const level = LEVEL_OF(counts.get(w.num) ?? 0);
      if (!root || !level) continue;
      const word = { book: r.book, chapter: r.chapter, verse: r.verse, wordNum: r.wordNum, root, stem: w.seg[1], seg: w.seg };
      byLevel[level].push(word);
      (byLevelStem[level][word.stem] ??= []).push(word);
      roots.add(root);
    }
    return { byLevel, byLevelStem, roots: [...roots] };
  })();
  return pool;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distractors for a root question. Hard: roots differing in one letter (same position);
// medium: roots sharing two letters anywhere; easy: random roots of the same length (a
// two-letter option among three-letter roots would give the answer away). Falls back to
// the next looser tier when a tier runs short.
function rootDistractors(answer: string, all: string[], level: QuizLevel): string[] {
  const a = answer.split(".");
  const positional = (r: string[]) => r.filter((c, i) => c === a[i]).length;
  const shared = (r: string[]) => r.filter((c) => a.includes(c)).length;
  const others = all.filter((r) => r !== answer).map((r) => ({ r, l: r.split(".") }));
  const sameLen = others.filter((o) => o.l.length === a.length);
  const tiers = [
    sameLen.filter((o) => positional(o.l) === a.length - 1).map((o) => o.r),
    sameLen.filter((o) => shared(o.l) >= 2).map((o) => o.r),
    sameLen.map((o) => o.r),
    others.map((o) => o.r),
  ];
  const order = level === "hard" ? [0, 1, 2, 3] : level === "medium" ? [1, 0, 2, 3] : [2, 3];
  const chosen = new Set<string>();
  for (const t of order) {
    for (const r of shuffle(tiers[t])) {
      if (chosen.size === 3) break;
      chosen.add(r);
    }
  }
  return [...chosen];
}

export async function generateGrammarQuestion(type: QuizType, level: QuizLevel): Promise<GrammarQuestion | null> {
  const { byLevel, byLevelStem, roots } = await getPool();
  // Binyan questions draw the binyan first, so Qal (~70% of verbs) doesn't dominate
  const candidates = type === "binyan" ? byLevelStem[level][pick(Object.keys(byLevelStem[level]))] : byLevel[level];
  if (!candidates?.length) return null;
  const w = pick(candidates);

  const verse = await prisma.verseText.findFirst({
    where: { book: w.book, chapter: w.chapter, verse: w.verse },
    select: { text: true },
  });
  if (!verse) return null;

  const answer = type === "root" ? w.root : BINYANIM[w.stem];
  const distractors =
    type === "root"
      ? rootDistractors(w.root, roots, level)
      : shuffle(Object.values(BINYANIM).filter((b) => b !== answer)).slice(0, 3);
  const options = shuffle([answer, ...distractors]);
  const bookHe = TANAKH_BOOKS.find((b) => b.id === w.book)?.he ?? w.book;

  return {
    type,
    book: w.book,
    chapter: w.chapter,
    verse: w.verse,
    reference: `${bookHe} ${toHebrewNumeral(w.chapter)}, ${toHebrewNumeral(w.verse)}`,
    // Meteg survives in VerseText.text (see stripTaamim in the substring route); drop it for display
    words: verse.text.replace(/ֽ/g, "").split(" "),
    wordIndex: w.wordNum - 1,
    options,
    answerIndex: options.indexOf(answer),
    explanation: { root: w.root, binyan: BINYANIM[w.stem], form: describeVerb(w.seg) },
  };
}
