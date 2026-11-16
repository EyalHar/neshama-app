import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { HEBREW_LETTERS, splitGraphemes, stripNikud, toRegular } from "@/lib/hebrewLetters";

// "אותיות חסרות": a verse with some letters blanked out. Built from VerseText + WordEntry
// (no LLM). Blanks are weighted toward the letters of the word's Strong's lemma (mostly the
// root), so the quiz tests the text rather than guessing ו/י. Prefix letters and ketiv
// words (unpointed in VerseText) are never blanked.

export type LettersLevel = "easy" | "medium" | "hard";

export type LetterBlank = {
  word: number; // index in `words`
  letter: number; // grapheme index in the word (see splitGraphemes)
  answer: string; // the letter as written (may be a final form)
  marks: string; // nikud shown on the blank as a hint ("" on hard)
};

export type LettersQuestion = {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  words: string[];
  blanks: LetterBlank[];
  distractors: string[]; // extra letters for the letter bank (regular forms)
};

type LevelSpec = {
  sections: string[];
  minWords: number;
  maxWords: number;
  blanks: number;
  perWord: number;
  distractors: number;
  hint: (marks: string) => string;
};

const NO_DOTS = (m: string) => m.replace(/[ֽׁׂ]/g, ""); // meteg, shin/sin dots
const VOWELS_ONLY = (m: string) => m.replace(/[^ְ-ׇֻ]/g, "");

const LEVELS: Record<LettersLevel, LevelSpec> = {
  easy: { sections: ["תורה"], minWords: 6, maxWords: 14, blanks: 3, perWord: 1, distractors: 2, hint: NO_DOTS },
  medium: { sections: ["תורה", "נביאים"], minWords: 7, maxWords: 18, blanks: 6, perWord: 1, distractors: 4, hint: VOWELS_ONLY },
  hard: { sections: ["תורה", "נביאים", "כתובים"], minWords: 10, maxWords: 30, blanks: 10, perWord: 2, distractors: 6, hint: () => "" },
};

// Letters that sound or look alike: the best distractors
const CONFUSABLE: [string, string][] = [
  ["א", "ע"], ["א", "ה"], ["ב", "ו"], ["ב", "כ"], ["ד", "ר"], ["ה", "ח"], ["ה", "ת"], ["ו", "ז"],
  ["ו", "י"], ["ח", "כ"], ["ט", "ת"], ["כ", "ק"], ["ס", "ש"], ["ס", "מ"], ["ג", "נ"], ["צ", "ע"],
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type VerseRef = { book: string; chapter: number; verse: number; words: number };

let versePool: Promise<VerseRef[]> | null = null;

function getVersePool(): Promise<VerseRef[]> {
  versePool ??= prisma.verseText
    .findMany({ select: { book: true, chapter: true, verse: true, text: true } })
    .then((rows) => rows.map((r) => ({ book: r.book, chapter: r.chapter, verse: r.verse, words: r.text.split(" ").length })));
  return versePool;
}

const sectionOf = new Map(TANAKH_BOOKS.map((b) => [b.id, b.section as string]));

type Candidate = { word: number; letter: number; answer: string; marks: string; weight: number };

async function candidatesFor(ref: VerseRef, words: string[]): Promise<Candidate[]> {
  const entries = await prisma.wordEntry.findMany({
    where: { book: ref.book, chapter: ref.chapter, verse: ref.verse },
    select: { wordNum: true, lemma: true, morph: true, plain: true },
  });
  const parsed = entries.map((e) => ({ e, w: parseWord(e.lemma, e.morph) }));
  const lemmas = await prisma.strongsEntry.findMany({
    where: { number: { in: parsed.flatMap(({ w }) => (w ? [`H${w.num}`] : [])) } },
    select: { number: true, lemmaPlain: true },
  });
  const lemmaOf = new Map(lemmas.map((l) => [l.number.replace(/^H/, ""), [...l.lemmaPlain].map(toRegular)]));

  const out: Candidate[] = [];
  for (const { e, w } of parsed) {
    const text = words[e.wordNum - 1];
    if (!text || !/[ְ-ּ]/.test(text)) continue; // ketiv: no nikud
    const graphemes = splitGraphemes(text);
    if (graphemes.map((g) => g.letter).join("") !== e.plain) continue;
    const prefixes = e.lemma.split("/").findIndex((s) => /^\d/.test(s.trim()));
    const lemmaLetters = w ? lemmaOf.get(w.num) ?? [] : [];
    graphemes.forEach((g, i) => {
      if (i < Math.max(prefixes, 0)) return;
      // ו as holam male / shuruk carries no vowel of its own: a blank there gives nothing to read
      if (g.letter === "ו" && /^[ֹּ]$/.test(g.marks.replace(/ֽ/g, ""))) return;
      out.push({
        word: e.wordNum - 1,
        letter: i,
        answer: g.letter,
        marks: g.marks,
        weight: lemmaLetters.includes(toRegular(g.letter)) ? 3 : 1,
      });
    });
  }
  return out;
}

// Weighted sampling without replacement, at most `perWord` blanks per word and never two
// adjacent letters (a run of blanks is a guess, not a reading)
function chooseBlanks(cands: Candidate[], spec: LevelSpec): Candidate[] {
  const chosen: Candidate[] = [];
  let pool = [...cands];
  while (chosen.length < spec.blanks && pool.length) {
    const total = pool.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    const c = pool.find((x) => (r -= x.weight) < 0) ?? pool[pool.length - 1];
    chosen.push(c);
    const inWord = chosen.filter((x) => x.word === c.word).length;
    pool = pool.filter(
      (x) => x !== c && !(x.word === c.word && (inWord >= spec.perWord || Math.abs(x.letter - c.letter) < 2))
    );
  }
  return chosen.sort((a, b) => a.word - b.word || a.letter - b.letter);
}

function distractorsFor(answers: string[], count: number): string[] {
  const taken = new Set(answers.map(toRegular));
  const near = shuffle(
    CONFUSABLE.flatMap(([a, b]) => (taken.has(a) ? [b] : taken.has(b) ? [a] : [])).filter((l) => !taken.has(l))
  );
  const out = new Set<string>();
  for (const l of [...near, ...shuffle(HEBREW_LETTERS.filter((l) => !taken.has(l)))]) {
    if (out.size === count) break;
    out.add(l);
  }
  return [...out];
}

export async function generateLettersQuestion(level: LettersLevel): Promise<LettersQuestion | null> {
  const spec = LEVELS[level];
  const verses = (await getVersePool()).filter(
    (v) => spec.sections.includes(sectionOf.get(v.book) ?? "") && v.words >= spec.minWords && v.words <= spec.maxWords
  );
  if (!verses.length) return null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const ref = pick(verses);
    const row = await prisma.verseText.findUnique({
      where: { book_chapter_verse: { book: ref.book, chapter: ref.chapter, verse: ref.verse } },
      select: { text: true },
    });
    if (!row) continue;
    // Meteg survives in VerseText.text; drop it for display
    const words = row.text.replace(/ֽ/g, "").split(" ");
    const blanks = chooseBlanks(await candidatesFor(ref, words), spec);
    if (blanks.length < spec.blanks) continue;

    const bookHe = TANAKH_BOOKS.find((b) => b.id === ref.book)?.he ?? ref.book;
    return {
      book: ref.book,
      chapter: ref.chapter,
      verse: ref.verse,
      reference: `${bookHe} ${toHebrewNumeral(ref.chapter)}, ${toHebrewNumeral(ref.verse)}`,
      words: level === "hard" ? words.map(stripNikud) : words,
      blanks: blanks.map((b) => ({ word: b.word, letter: b.letter, answer: b.answer, marks: spec.hint(b.marks) })),
      distractors: distractorsFor(
        blanks.map((b) => b.answer),
        spec.distractors
      ),
    };
  }
  return null;
}
