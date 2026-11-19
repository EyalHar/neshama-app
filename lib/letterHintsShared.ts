// Client-safe types and helpers for "רמזים באותיות" (initials/finals, acrostics, letter skips)

export const ALEF_BET = [..."אבגדהוזחטיכלמנסעפצקרשת"];

const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

// Letters only, final forms folded into regular ones: "יְהוָה אֱלֹהִים" → "יהוהאלהימ"
export const normalizeLetters = (s: string) =>
  [...s.replace(/[֑-ׇ]/g, "")].filter((c) => c >= "א" && c <= "ת").map((c) => FINALS[c] ?? c).join("");

// A verse with some of its letters marked: `marks` are [word index, letter index in the word]
export type MarkedVerse = { book: string; chapter: number; verse: number; ref: string; words: string[]; marks: [number, number][] };

export type InitialsMode = "first" | "last";
export type InitialsDir = "forward" | "backward" | "both";
export type InitialsMatch = { reversed: boolean; verses: MarkedVerse[] };
export type InitialsResult = { query: string; total: number; expected: number; matches: InitialsMatch[] };

export type ElsScope = "torah" | "tanakh" | string;
export type ElsMatch = { start: number; skip: number; from: string; to: string };
export type ElsResult = { query: string; total: number; expected: number; letters: number; matches: ElsMatch[] };
export type ElsGridCell = { letter: string; hit: boolean; verse: number };
export type ElsGrid = { width: number; rows: ElsGridCell[][]; verses: { id: number; ref: string; href: string }[] };

export type AcrosticLine = { ref: string; href: string; words: string[]; letter: string; status: "ok" | "same" | "off" };
export type AcrosticLetterStatus = "ok" | "order" | "missing";
export type AcrosticView = {
  id: string;
  title: string;
  ref: string;
  about: string;
  lines: AcrosticLine[];
  alphabet: { letter: string; status: AcrosticLetterStatus }[];
};

export const ELS_LIMITS = { minLength: 3, maxLength: 12, maxSkip: 10000 };

// Three consecutive words that read the same across and down: cell [i][j] of the grid is part j of
// word i, and [i][j] === [j][i] off the diagonal. `strong`: the first word is single letters, i.e.
// it is also the three words' initials (אמת מארץ תצמח).
export type WordSquare = { book: string; chapter: number; verse: number; ref: string; href: string; verseText: string; grid: string[][]; strong: boolean };
export type WordSquaresResult = { squares: WordSquare[]; baseline: { runs: number; all: number; strong: number } };

// Atbash: א↔ת, ב↔ש, … (finals folded first)
export const atbash = (w: string) => [...normalizeLetters(w)].map((c) => ALEF_BET[21 - ALEF_BET.indexOf(c)]).join("");
export const reverseLetters = (w: string) => [...normalizeLetters(w)].reverse().join("");

export type PairHit = { a: string; b: string; verse: MarkedVerse };
export type AtbashSearch = { query: string; atbash: string; queryCount: number; atbashCount: number; verses: MarkedVerse[]; sameVerse: PairHit[] };
export type PalindromeWord = { word: string; count: number; example: MarkedVerse };
export type MirrorResult = { reversed: PairHit[]; words: PalindromeWord[]; phrases: MarkedVerse[] };
export type FirstLetter = { letter: string; position: number; word: string; verse: MarkedVerse };
