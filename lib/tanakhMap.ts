import parashotData from "./parashot.json";
import parashiyotData from "./parashiyot.json";
import descriptionsData from "@/data/tanakh-map/descriptions.json";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { compareRefs, type VerseRef } from "@/lib/divisions";

// "מפת התנ״ך": one row per parashiya (open/closed section) with a one-line description, narrowed by
// section → book → parasha (Torah) or chapter (elsewhere) → parashiya. Descriptions come from
// data/tanakh-map/descriptions.json (AI summaries of each section's own verses, built by
// scripts/build-tanakh-map.mjs and checked; data/tanakh-map/overrides.json holds corrections).
// A parashiya without a description shows its first words.

type ParashaRow = { id: string; he: string; book: string; start: VerseRef; end: VerseRef };
type ParashiyaRow = [number, number, number, number, "פ" | "ס" | "", string];
type Descriptions = { model: string | null; generatedAt: string | null; descriptions: Record<string, Record<string, string>> };

const PARASHOT = parashotData as ParashaRow[];
const PARASHIYOT = parashiyotData as unknown as Record<string, ParashiyaRow[]>;
const DESCRIPTIONS = descriptionsData as Descriptions;

export type SectionId = "torah" | "nevi" | "ketuvim";
export const SECTIONS: { id: SectionId; he: string }[] = [
  { id: "torah", he: "תורה" },
  { id: "nevi", he: "נביאים" },
  { id: "ketuvim", he: "כתובים" },
];
const SECTION_HE: Record<SectionId, string> = { torah: "תורה", nevi: "נביאים", ketuvim: "כתובים" };
export const booksOf = (s: SectionId) => TANAKH_BOOKS.filter((b) => b.section === SECTION_HE[s]);
export const sectionOfBook = (book: string): SectionId | null => SECTIONS.find((s) => booksOf(s.id).some((b) => b.id === book))?.id ?? null;

export type MapRow = {
  book: string;
  start: VerseRef;
  end: VerseRef;
  type: "פ" | "ס" | "";
  incipit: string;
  description: string | null;
  ref: string;
  href: string;
  unit: string; // the parasha id (Torah) or the chapter number it begins in (elsewhere)
};

const he = (book: string) => TANAKH_BOOKS.find((b) => b.id === book)?.he ?? book;
const n = toHebrewNumeral;

export function rangeRef(book: string, s: VerseRef, e: VerseRef): string {
  if (s[0] === e[0] && s[1] === e[1]) return `${he(book)} ${n(s[0])}, ${n(s[1])}`;
  if (s[0] === e[0]) return `${he(book)} ${n(s[0])}, ${n(s[1])}–${n(e[1])}`;
  return `${he(book)} ${n(s[0])}, ${n(s[1])} – ${n(e[0])}, ${n(e[1])}`;
}

export const isTorah = (book: string) => sectionOfBook(book) === "torah";

// The weekly parashot of a Torah book
export const parashotOf = (book: string) => PARASHOT.filter((p) => p.book === book);

function unitOf(book: string, start: VerseRef): string {
  if (!isTorah(book)) return String(start[0]);
  return parashotOf(book).find((p) => compareRefs(start, p.start) >= 0 && compareRefs(start, p.end) <= 0)?.id ?? "";
}

let rowsCache: Map<string, MapRow[]> | null = null;

// Every parashiya of a book, in order
export function rowsOf(book: string): MapRow[] {
  rowsCache ??= new Map();
  if (!rowsCache.has(book)) {
    const descriptions = DESCRIPTIONS.descriptions[book] ?? {};
    rowsCache.set(
      book,
      (PARASHIYOT[book] ?? []).map(([sc, sv, ec, ev, type, incipit]) => {
        const start: VerseRef = [sc, sv], end: VerseRef = [ec, ev];
        return {
          book,
          start,
          end,
          type,
          incipit,
          description: descriptions[`${sc}:${sv}`] ?? null,
          ref: rangeRef(book, start, end),
          href: `/tanakh?book=${encodeURIComponent(book)}&chapter=${sc}&verse=${sv}`,
          unit: unitOf(book, start),
        };
      })
    );
  }
  return rowsCache.get(book)!;
}

// The narrowing units of a book: its parashot (Torah) or its chapters that begin a parashiya (elsewhere)
export function unitsOf(book: string): { id: string; label: string; count: number }[] {
  const rows = rowsOf(book);
  const count = (id: string) => rows.filter((r) => r.unit === id).length;
  if (isTorah(book)) return parashotOf(book).map((p) => ({ id: p.id, label: p.he, count: count(p.id) }));
  const chapters = [...new Set(rows.map((r) => r.unit))];
  return chapters.map((c) => ({ id: c, label: `פרק ${n(Number(c))}`, count: count(c) }));
}

export const describedCount = () =>
  Object.values(DESCRIPTIONS.descriptions).reduce((s, b) => s + Object.keys(b).length, 0);
export const totalParashiyot = () => Object.values(PARASHIYOT).reduce((s, b) => s + b.length, 0);
export const descriptionsModel = () => DESCRIPTIONS.model;
