// "ניקוד מיוחד": unusual nikud marks in the two texts the site uses, from the snapshot built by
// scripts/build-special-nikud.mjs: MAM (Sefaria's "Miqra according to the Masorah", shown in the
// reader) and the Leningrad Codex (OSHB, in VerseText). Each case is one place, with the word as
// written in each text and which of them has the mark.

import data from "@/data/special-nikud/special-nikud.json";
import { TANAKH_BOOKS, type Section } from "./tanakh";

export type NikudKind = "dagesh" | "puncta" | "hataf" | "initial";
export type NikudSource = "both" | "mam" | "len";
export type HatafKind = "qamats" | "segol" | "patah";
export type InitialClass = "dechik" | "atei" | "unclassified";
// Why a word-initial dagesh was left unclassified (see classifyInitial() in the build script)
export type UnclassifiedReason = "final" | "maqaf" | "other";

export type NikudCase = {
  p: NikudKind;
  b: string;
  c: number;
  v: number; // MAM's verse number when MAM has the word (the reader's numbering)
  mam: string | null; // the word in MAM, with accents
  len: string | null; // the word in the Leningrad Codex
  am: number[]; // letter indexes of the mark in `mam` (for dots: the dotted letters)
  al: number[]; // the same in `len`
  st: NikudSource;
  l: string; // the letter
  r?: [number, number]; // the word's offsets in the verse text
  sub?: string; // dagesh: "initial" | "inWord"; hataf: HatafKind
  other?: string; // hataf: Leningrad's hataf when it differs from MAM's
  strongs?: string | null;
  aram?: boolean;
  cls?: InitialClass;
  why?: UnclassifiedReason;
  prev?: string; // the word before, in MAM
  join?: "maqaf" | "space";
};

export type NikudNotes = {
  jerusalem: { total: number; plene: number; aramaic: number; mam: number; len: number; pleneRefs: [string, number, number][] };
  issachar: { total: number; mamBare: number; lenBare: number };
  yhwh: { total: number; mam: number; mamAfterAdonai: number; lenHiriqThere: number; len: number };
};

const snapshot = data as unknown as { notes: NikudNotes; cases: NikudCase[]; verses: Record<string, string> };
export const NIKUD_CASES = snapshot.cases;
export const NIKUD_NOTES = snapshot.notes;

export const verseOf = (c: NikudCase): string => snapshot.verses[`${c.b}|${c.c}|${c.v}`] ?? "";

const SECTION_OF: Record<string, Section> = Object.fromEntries(TANAKH_BOOKS.map((b) => [b.id, b.section]));
export const sectionOf = (book: string): Section => SECTION_OF[book];

export const NIKUD_KINDS: { id: NikudKind; title: string; short: string }[] = [
  { id: "dagesh", title: "דגש באותיות א ח ע ר", short: "דגש בא׳ ח׳ ע׳ ר׳" },
  { id: "puncta", title: "נקודות על האותיות", short: "נקודות על האותיות" },
  { id: "hataf", title: "חטף תחת אות שאינה גרונית", short: "חטפים" },
  { id: "initial", title: "דגש בתחילת מילה: דחיק ואתי מרחיק", short: "דחיק ואתי מרחיק" },
];

export const SOURCE_LABEL: Record<NikudSource, string> = {
  both: "בשני הנוסחים",
  mam: "רק בקורא (MAM)",
  len: "רק בכתב יד לנינגרד",
};

export const HATAF_LABEL: Record<HatafKind, string> = { qamats: "חטף קמץ", segol: "חטף סגול", patah: "חטף פתח" };

export const CLASS_LABEL: Record<InitialClass, string> = { dechik: "דחיק", atei: "אתי מרחיק", unclassified: "לא מסווג" };

export const REASON_LABEL: Record<UnclassifiedReason, string> = {
  final: "המילה הקודמת מוטעמת כאן בהברה האחרונה",
  maqaf: "המילה הקודמת מוקפת, ואין בנוסח עדות שהיא מוטעמת בסופה",
  other: "טעם מפסיק או טעם שמקומו קבוע, פסק, קרי וכתיב, תחילת פסוק או מילה קודמת שמסתיימת בעיצור",
};

const ACCENTS = /[\u0591-\u05AF\u05BD]/g;
// The word without cantillation and meteg, for grouping and labels
export const stripAccents = (w: string) => w.replace(ACCENTS, "");

// A word cut into letters, each with the marks that follow it
export function splitUnits(word: string): string[] {
  const units: string[] = [];
  for (const ch of word) {
    if (ch >= "א" && ch <= "ת") units.push(ch);
    else if (units.length) units[units.length - 1] += ch;
    else units.push(ch);
  }
  return units;
}

// Groups of cases with the same word (by Strong's number for hatafim) or the same pair of words
// (word-initial dagesh), largest first, then in Tanakh order
export type NikudGroup = { key: string; rep: NikudCase; cases: NikudCase[] };

// The form of a case in the text that has the mark (MAM when both do)
export const markedForm = (c: NikudCase) => (c.st === "len" ? c.len : c.mam ?? c.len) ?? "";

export function groupCases(cases: NikudCase[], keyOf: (c: NikudCase) => string): NikudGroup[] {
  const map = new Map<string, NikudCase[]>();
  for (const c of cases) {
    const k = keyOf(c);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(c);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      // The representative is a case with the group's most frequent form
      const forms = new Map<string, number>();
      for (const c of list) forms.set(stripAccents(markedForm(c)), (forms.get(stripAccents(markedForm(c))) ?? 0) + 1);
      const top = [...forms.entries()].sort((x, y) => y[1] - x[1])[0][0];
      return { key, rep: list.find((c) => stripAccents(markedForm(c)) === top)!, cases: list };
    })
    .sort((x, y) => y.cases.length - x.cases.length);
}

export const hatafKey = (c: NikudCase) => `${c.sub}|${c.strongs ?? stripAccents(c.mam ?? c.len ?? "")}`;
export const pairKey = (c: NikudCase) =>
  `${c.cls}|${stripAccents(c.prev ?? "")}${c.join === "maqaf" ? "\u05BE" : " "}${stripAccents(c.mam ?? c.len ?? "")}`;
