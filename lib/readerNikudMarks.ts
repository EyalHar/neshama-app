// Special nikud (the /special-nikud snapshot) located in the reader's text. The reader shows MAM,
// so only cases MAM has (`st` "both" or "mam") are marked; Leningrad-only ones are not in this text.
// A case gives its word's offsets `r` in the snapshot's verse text, which is the reader's text in
// "both" ketiv/qere mode. In the other modes offsets shift, so the word is looked up by its exact
// pointed form: the occurrence with the same rank among equal words in the verse, else the one
// nearest the snapshot offset. A word that is not shown in this mode (a qere in ketiv mode) is
// simply not found. The marked letters are counted inside the word (`am`).

import data from "@/data/special-nikud/special-nikud.json";
import { CLASS_LABEL, HATAF_LABEL, type NikudCase, type NikudKind } from "./specialNikud";

export type ReaderNikudMark = { verse: number; start: number; end: number; kind: NikudKind; label: string; href: string };

const snapshot = data as unknown as { cases: NikudCase[]; verses: Record<string, string> };
const isLetter = (ch: string) => ch >= "א" && ch <= "ת";

let index: Map<string, NikudCase[]> | null = null;
function casesByVerse(): Map<string, NikudCase[]> {
  if (index) return index;
  index = new Map();
  for (const c of snapshot.cases) {
    if (c.st === "len" || !c.mam || !c.r) continue;
    const k = `${c.b}|${c.c}|${c.v}`;
    if (!index.has(k)) index.set(k, []);
    index.get(k)!.push(c);
  }
  return index;
}

const LETTER_NAME: Record<string, string> = { "א": "א׳", "ח": "ח׳", "ע": "ע׳", "ר": "ר׳" };

function labelOf(c: NikudCase): string {
  switch (c.p) {
    case "dagesh": return `דגש באות ${LETTER_NAME[c.l] ?? c.l}`;
    case "puncta": return "נקודות על האותיות";
    case "hataf": return `${HATAF_LABEL[c.sub as keyof typeof HATAF_LABEL] ?? "חטף"} תחת אות שאינה גרונית`;
    case "initial": return c.cls && c.cls !== "unclassified"
      ? `דגש בתחילת מילה: ${CLASS_LABEL[c.cls]}`
      : "דגש בתחילת מילה (דחיק או אתי מרחיק, לא מסווג)";
  }
}

const hrefOf = (p: NikudKind) => (p === "dagesh" ? "/special-nikud" : `/special-nikud?tab=${p}`);

// Offsets of `word` in `text` where it stands as a whole word (no letter or mark touching it)
function occurrences(text: string, word: string): number[] {
  const out: number[] = [];
  const glued = (ch: string | undefined) => !!ch && (isLetter(ch) || (ch >= "֑" && ch <= "ׇ" && ch !== "־" && ch !== "׀" && ch !== "׃"));
  for (let i = text.indexOf(word); i >= 0; i = text.indexOf(word, i + 1)) {
    if (!glued(text[i - 1]) && !glued(text[i + word.length])) out.push(i);
  }
  return out;
}

// [start, end) of the n-th letter of the word at `at`, with the marks that follow it
function letterRange(text: string, at: number, end: number, n: number): [number, number] | null {
  let count = -1;
  for (let i = at; i < end; i++) {
    if (!isLetter(text[i])) continue;
    if (++count === n) {
      let j = i + 1;
      while (j < end && !isLetter(text[j])) j++;
      return [i, j];
    }
  }
  return null;
}

// The special-nikud marks of one chapter, given the verses exactly as the reader shows them
export function readerNikudMarks(book: string, chapter: number, verses: string[]): ReaderNikudMark[] {
  const marks: ReaderNikudMark[] = [];
  verses.forEach((text, i) => {
    const verse = i + 1;
    const cases = casesByVerse().get(`${book}|${chapter}|${verse}`);
    if (!cases) return;
    const source = snapshot.verses[`${book}|${chapter}|${verse}`] ?? "";
    for (const c of cases) {
      const word = source.slice(c.r![0], c.r![1]);
      if (!word) continue;
      const here = occurrences(text, word);
      if (here.length === 0) continue;
      const there = occurrences(source, word);
      const rank = there.indexOf(c.r![0]);
      const at = here.length === there.length && rank >= 0
        ? here[rank]
        : here.reduce((best, o) => (Math.abs(o - c.r![0]) < Math.abs(best - c.r![0]) ? o : best));
      for (const n of c.am) {
        const r = letterRange(text, at, at + word.length, n);
        if (r) marks.push({ verse, start: r[0], end: r[1], kind: c.p, label: labelOf(c), href: hrefOf(c.p) });
      }
    }
  });
  return marks;
}
