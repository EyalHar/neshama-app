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
  variants?: number; // written forms: other spellings of the same word (plene / defective)
  pointings?: number; // written forms: how many different pointings these letters have
};
export type FreqList = { items: FreqItem[]; totalWords: number; distinct: number };
export type FreqOccurrences = { verses: FreqVerse[]; total: number; next: number | null };

// The top words / roots of the whole Tanakh, with their count in each section, to compare sections
export const COMPARE_TOP = 10;
// `tag` / `rank` are set for the user's own list: what kind of item it is, and its place in the Tanakh
export type CompareItem = { key: string; label: string; counts: Record<FreqScope, number>; tag?: string; rank?: number };
export type FreqCompare = { totals: Record<FreqScope, number>; items: CompareItem[] };

// "השוואה משלי": words / roots the user picks. An id is "kind:key" (lexeme:7965, form:שלום, root:שוב).
export const CUSTOM_MAX = 15;
export const KIND_TAG: Record<FreqKind, string> = { lexeme: "ערך מילוני", form: "כפי שנכתבה", root: "שורש" };
export const itemId = (kind: FreqKind, key: string) => `${kind}:${key}`;
export type FreqCandidate = { id: string; kind: FreqKind; label: string; sub: string; pos: string; counts: Record<FreqScope, number>; rank: number };

// "צורות כתיבה" of a written form: the same word spelled with or without ו / י (one group per
// dictionary entry + morph the form mostly belongs to), and the pointings of the same letters
export type SpellingForm = { plain: string; label: string; count: number; books: { book: string; count: number }[]; first: FreqVerse };
export type SpellingGroupInfo = { id: string; lexeme: string; parse: string; total: number; forms: SpellingForm[] };
export type PointingInfo = { pointed: string; label: string; count: number; first: FreqVerse; lexeme: string; parse: string };
export type FreqSpellings = { form: string; total: number; groups: SpellingGroupInfo[]; pointings: PointingInfo[] };
