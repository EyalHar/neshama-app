import type { Leitword } from "./leitwords";
import type { Parashiya, VerseRef } from "./divisions";
import type { SpecialLetterMark } from "./tanakh";

// Shapes returned by GET /api/tanakh for a chapter or a verse range (parasha / parashiya)

export type PassageVerse = { chapter: number; verse: number; text: string };
export type PassageMark = SpecialLetterMark & { chapter: number };
export type PassageSection = Parashiya & { leitwords: Leitword[] | null };

export type PassageResponse = {
  verses: PassageVerse[];
  chapterVerseCounts: Record<number, number>;
  specialLetters: PassageMark[];
  leitwords: Leitword[];
  sections: PassageSection[];
  readVerses: string[]; // "chapter:verse"
  favoriteVerses: string[];
  completedChapters: number[];
  partialChapters: number[];
  completedBooks: string[];
  partialBooks: string[];
  favoriteChapters: number[];
  notes: import("./notes").VerseNoteItem[];
};

export const inRef = (ref: VerseRef, start: VerseRef, end: VerseRef) =>
  (ref[0] > start[0] || (ref[0] === start[0] && ref[1] >= start[1])) &&
  (ref[0] < end[0] || (ref[0] === end[0] && ref[1] <= end[1]));
