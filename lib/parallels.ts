import data from "@/data/parallels/parallels.json";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";

// Passages the Tanakh tells twice — a one-time snapshot built from the data by
// scripts/build-parallels.mjs (verse pairs sharing most of their lexemes, chained into passages).

export type ParallelSide = { book: string; start: [number, number]; end: [number, number] };
// [chapter:verse on side a, chapter:verse on side b, Jaccard similarity of their lexemes]
export type ParallelPair = [string, string, number];
export type Parallel = { id: number; a: ParallelSide; b: ParallelSide; pairs: ParallelPair[] };

export const PARALLELS = data as unknown as Parallel[];

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));
const WORK_HE: Record<string, string> = {
  "I Samuel": "שמואל", "II Samuel": "שמואל", "I Kings": "מלכים", "II Kings": "מלכים",
  "I Chronicles": "דברי הימים", "II Chronicles": "דברי הימים",
};

export const bookHe = (book: string) => BOOK_HE.get(book) ?? book;
export const workHe = (book: string) => WORK_HE[book] ?? bookHe(book);

// "שמואל ב כב:א–נא" / "מלכים א ז:מ – ח:מט"
export function sideLabel(s: ParallelSide): string {
  const [sc, sv] = s.start, [ec, ev] = s.end;
  const end = sc === ec ? toHebrewNumeral(ev) : `${toHebrewNumeral(ec)}:${toHebrewNumeral(ev)}`;
  return `${bookHe(s.book)} ${toHebrewNumeral(sc)}:${toHebrewNumeral(sv)}–${end}`;
}

const within = (s: ParallelSide, chapter: number, verse: number) =>
  (chapter > s.start[0] || (chapter === s.start[0] && verse >= s.start[1]))
  && (chapter < s.end[0] || (chapter === s.end[0] && verse <= s.end[1]));

// The parallel passage that has one verse on one side and the other on the other side, if any.
// By range rather than by matched pair: verse numbers can shift between the versions (Psalm 18's
// heading makes II Samuel 22:2 match Psalm 18:2–3).
export function parallelOf(book: string, chapter: number, verse: number, otherBook: string, otherChapter: number, otherVerse: number): number | null {
  const found = PARALLELS.find((p) =>
    (p.a.book === book && p.b.book === otherBook && within(p.a, chapter, verse) && within(p.b, otherChapter, otherVerse))
    || (p.b.book === book && p.a.book === otherBook && within(p.b, chapter, verse) && within(p.a, otherChapter, otherVerse)));
  return found?.id ?? null;
}
