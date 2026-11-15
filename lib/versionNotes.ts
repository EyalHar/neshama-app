// "חילופי נוסח": the version notes in Sefaria's MAM text, from the snapshot built by
// scripts/build-version-notes.mjs (the reader shows the same notes live, see fetchChapterWithMarks()).

import data from "@/data/version-notes/version-notes.json";

export type Tradition = "sephardi-ashkenazi" | "ashkenazi" | "yemenite" | "aleppo" | "other";

export type VersionNoteEntry = {
  book: string;
  chapter: number;
  verse: number;
  word: string; // the word the note follows
  wordEnd: number; // its end offset in `text`
  note: string;
  tradition: Tradition;
  text: string; // the verse, without notes
};

export const VERSION_NOTES = data as VersionNoteEntry[];

export const TRADITIONS: { id: Tradition; title: string; intro: string }[] = [
  {
    id: "sephardi-ashkenazi",
    title: "ספרי ספרד ואשכנז",
    intro: "מקומות שבהם ספרי התורה של ספרד ואשכנז כתובים אחרת מהנוסח שכאן, בכתיב מלא או חסר, באות זעירה או בחלוקת הפרשות.",
  },
  {
    id: "ashkenazi",
    title: "מגילות אשכנז",
    intro: "שני מקומות במגילת אסתר שבהם המגילות של אשכנז כתובות אחרת.",
  },
  {
    id: "yemenite",
    title: "ספרי תימן",
    intro: "ספרי התורה של תימן קרובים מאוד לנוסח שכאן. ההבדלים הם בעיקר באותיות גדולות, במילים שנכתבות בתיבה אחת ובחלוקת הפרשות.",
  },
  {
    id: "aleppo",
    title: "כתר ארם צובא",
    intro: "מקומות שבהם בכתר עצמו היה כתוב אחרת מהנוסח שבמהדורה, או שחלוקת הפרשה בו מוטלת בספק.",
  },
  {
    id: "other",
    title: "ספרים אחרים",
    intro: "חילוף שמופיע בספרים ובמגילות אחרים.",
  },
];

const letters = (s: string) => s.replace(/[^א-ת]/g, "");

// The span to highlight: the verse word the note quotes when there is one (Deut 22:6 quotes קַן,
// which comes after the note's position), otherwise the word the note follows
export function noteRange(n: VersionNoteEntry): { start: number; end: number } {
  const quoted = n.note.split(/\s+/).filter((w) => /[֑-ׇ]/.test(w)).map(letters).filter(Boolean);
  for (const m of n.text.matchAll(/[^\s־]+/g)) {
    const w = letters(m[0]);
    if (w && quoted.includes(w) && w !== letters(n.word)) return { start: m.index, end: m.index + m[0].length };
  }
  const start = Math.max(n.text.lastIndexOf(" ", n.wordEnd - 1), n.text.lastIndexOf("־", n.wordEnd - 1)) + 1;
  return { start, end: n.text[n.wordEnd - 1] === "׃" ? n.wordEnd - 1 : n.wordEnd };
}
