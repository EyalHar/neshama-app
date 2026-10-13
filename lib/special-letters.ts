import data from "./special-letters.json";
import type { SpecialLetterKind } from "./tanakh";

// special-letters.json is a one-time snapshot of every <big>/<small>/<sup>/inverted-nun mark in
// Sefaria's "Miqra according to the Masorah" text, excluding marks inside Yemenite-variant footnotes.
export type SpecialLetterEntry = {
  book: string;
  chapter: number;
  verse: number;
  kind: SpecialLetterKind;
  letter: string;
  word: string;
  // Span of the special letter (with its nikud) inside `word`; absent for inverted nuns
  start?: number;
  end?: number;
};

export const SPECIAL_LETTERS = data as SpecialLetterEntry[];

export const SPECIAL_LETTER_KINDS: { kind: SpecialLetterKind; label: string; description: string }[] = [
  { kind: "large", label: "אותיות רבתי", description: "אותיות שנכתבות גדולות מהרגיל" },
  { kind: "small", label: "אותיות זעירות", description: "אותיות שנכתבות קטנות מהרגיל" },
  { kind: "suspended", label: "אותיות תלויות", description: "אותיות שנכתבות מעל השורה" },
  { kind: "inverted", label: "נוני״ן הפוכות", description: "סימני ׆ המקיפים קטעים מיוחדים" },
];

export const SPECIAL_LETTER_CLASS: Record<SpecialLetterKind, string> = {
  large: "text-[1.5em] leading-none font-semibold text-amber-700",
  small: "text-[0.65em] text-amber-700",
  suspended: "relative -top-[0.6em] text-[0.8em] text-amber-700",
  inverted: "font-semibold text-amber-700",
};
