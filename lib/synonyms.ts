// "מילים נרדפות": a closed, checked list of synonym pairs and how each book chooses between them.
// Data: data/synonyms/synonyms.json, a snapshot built by `node scripts/build-synonyms.mjs` from OSHB
// (Hebrew words only). Client-safe. Data only, no claims from the literature (the user's decision).

import data from "@/data/synonyms/synonyms.json";

type Place = [chapter: number, verse: number, wordIndex: number];
export type SynonymBook = {
  book: string;
  a: number;
  b: number;
  lo: number; // Wilson 95% interval of word A's share
  hi: number;
  chapters: [chapter: number, a: number, b: number][];
  example: { a: Place; b: Place } | null; // the closest pair of verses in this book that use each word
};
export type VsChance = { v: number; chance: number; p: number }; // Cramér's V, its mean under shuffling, shuffle p
export type SynonymPair = {
  id: string;
  title: string;
  note?: string;
  a: { label: string; gloss: string };
  b: { label: string; gloss: string };
  total: [number, number];
  books: SynonymBook[];
  between: VsChance | null;
  within: (VsChance & { book: string })[];
  bigBooks: number;
  usesBoth: number;
};

export const SYNONYMS = data as unknown as { minBook: number; minWithin: number; runs: number; pairs: SynonymPair[] };

// A chapter-level clustering counts only below this shuffle p (several books are tested per pair)
export const WITHIN_P = 0.01;
// "Uses both": the rarer word is at least this share of the book's uses
export const BOTH_SHARE = 0.1;
