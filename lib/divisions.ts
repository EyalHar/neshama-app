import parashotData from "./parashot.json";
import parashiyotData from "./parashiyot.json";

// Traditional divisions of the text, as an alternative to the (13th-century, Christian) chapters:
// - parashot: the 54 weekly Torah portions (Sefaria's "Parasha" alt structure)
// - parashiyot: open (פ) / closed (ס) sections, from the {פ}/{ס} markers in Sefaria's
//   "Miqra according to the Masorah" text. Both files are one-time snapshots.

export type VerseRef = [number, number]; // [chapter, verse]

// `clipped`: the range cut into this parashiya, so `title` (its original first words) doesn't
// match its first verse here. `origin` is its unclipped first verse, which identifies it.
export type Parashiya = { start: VerseRef; end: VerseRef; origin: VerseRef; type: "פ" | "ס" | ""; title: string; clipped?: boolean };

// A reading unit in division mode: a parasha (Torah) or a parashiya (Nevi'im/Ketuvim)
export type DivisionUnit = { id: string; label: string; title: string; start: VerseRef; end: VerseRef };

export type DivisionKind = "parashot" | "parashiyot";

type ParashaRow = { id: string; he: string; book: string; start: VerseRef; end: VerseRef };
type ParashiyaRow = [number, number, number, number, "פ" | "ס" | "", string];

const PARASHOT = parashotData as ParashaRow[];
const PARASHIYOT = parashiyotData as unknown as Record<string, ParashiyaRow[]>;

export const compareRefs = (a: VerseRef, b: VerseRef) => a[0] - b[0] || a[1] - b[1];
export const refKey = (chapter: number, verse: number) => `${chapter}:${verse}`;

export function parseRef(s: string | null): VerseRef | null {
  const m = s?.match(/^(\d+):(\d+)$/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

// Torah books read by parasha; the rest by parashiya; Psalms keeps chapters (they are the psalms)
export function divisionKind(book: string): DivisionKind | null {
  if (book === "Psalms") return null;
  return PARASHOT.some((p) => p.book === book) ? "parashot" : PARASHIYOT[book] ? "parashiyot" : null;
}

const toParashiya = (r: ParashiyaRow): Parashiya => ({ start: [r[0], r[1]], end: [r[2], r[3]], origin: [r[0], r[1]], type: r[4], title: r[5] });

// The parashiya starting at `start`, or undefined if none does
export function getParashiyaAt(book: string, start: VerseRef): Parashiya | undefined {
  const row = PARASHIYOT[book]?.find((r) => r[0] === start[0] && r[1] === start[1]);
  return row && toParashiya(row);
}

export function getUnits(book: string): DivisionUnit[] {
  const kind = divisionKind(book);
  if (kind === "parashot") {
    return PARASHOT.filter((p) => p.book === book).map((p) => {
      const first = PARASHIYOT[book].find((r) => compareRefs([r[0], r[1]], p.start) <= 0 && compareRefs(p.start, [r[2], r[3]]) <= 0);
      return { id: p.id, label: p.he, title: first ? first[5] : "", start: p.start, end: p.end };
    });
  }
  if (kind === "parashiyot") {
    return PARASHIYOT[book].map((r, i) => ({ id: String(i + 1), label: String(i + 1), title: r[5], start: [r[0], r[1]], end: [r[2], r[3]] }));
  }
  return [];
}

// Parashiyot overlapping [from, to], clipped to it (a parasha can start mid-parashiya — e.g. Vayechi)
export function getParashiyot(book: string, from: VerseRef, to: VerseRef): Parashiya[] {
  return (PARASHIYOT[book] ?? [])
    .map(toParashiya)
    .filter((p) => compareRefs(p.end, from) >= 0 && compareRefs(p.start, to) <= 0)
    .map((p) => ({
      ...p,
      start: compareRefs(p.start, from) < 0 ? from : p.start,
      end: compareRefs(p.end, to) > 0 ? to : p.end,
      clipped: compareRefs(p.start, from) < 0,
    }));
}
