// Client-safe types for "השכיחות בתנ״ך" (lib/frequencies.ts)

export type FreqKind = "lexeme" | "form" | "root";
export type FreqScope = "tanakh" | "torah" | "nevi" | "ketuvim";
// The page loads the top FREQ_TOTAL and shows them FREQ_PAGE at a time as the user scrolls
export const FREQ_TOTAL = 500;
export const FREQ_PAGE = 100;
export const OCCURRENCES_PAGE = 10;

// A verse with one word marked (index in its words)
export type FreqVerse = { ref: string; href: string; words: string[]; at: number };

export type FreqItem = {
  key: string;
  label: string; // the word as shown: dictionary form, the most common written form, or the root's letters
  sub: string; // a gloss / the dictionary entry
  pos: string; // part of speech in Hebrew ("" for roots)
  count: number;
  first: FreqVerse;
  searchHref?: string; // roots: the root search in /advanced
};
export type FreqList = { items: FreqItem[]; totalWords: number; distinct: number };
export type FreqOccurrences = { verses: FreqVerse[]; total: number; next: number | null };

// The top words / roots of the whole Tanakh, with their count in each section, to compare sections
export const COMPARE_TOP = 10;
export type CompareItem = { key: string; label: string; counts: Record<FreqScope, number> };
export type FreqCompare = { totals: Record<FreqScope, number>; items: CompareItem[] };
