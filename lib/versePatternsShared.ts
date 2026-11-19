// Client-safe types for "תבניות בפסוק" (lib/versePatterns.ts)

type VerseBase = { book: string; chapter: number; verse: number; ref: string; href: string; words: string[] };

// pairs: word indices from the outside in ([A, A'], [B, B'], …); center: the middle word of an odd mirror
export type ChiasmVerse = VerseBase & { pairs: [number, number][]; center: number | null };

export type RepeatKind = "name" | "verb" | "noun" | "other";
export type RepeatHit = VerseBase & { at: [number, number] }; // first and last word of the run
export type RepeatGroup = { word: string; times: number; kind: RepeatKind; hits: RepeatHit[] };

export type VersePatterns = { chiasms: ChiasmVerse[]; repeats: RepeatGroup[] };
