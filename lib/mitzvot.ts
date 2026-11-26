import data from "@/data/mitzvot/chinukh.json";

// The 613 mitzvot of Sefer HaChinukh (data/mitzvot/chinukh.json, built by scripts/build-mitzvot.mjs)
// located in the reader's text: each mitzvah's verse, and inside it the words Sefer HaChinukh quotes.
// The words were checked against VerseText (OSHB); here they are found again in the Sefaria text the
// reader shows, by letters only, so nikud, accents and maqaf don't matter. When they can't be found
// (a ketiv/qere word, say), the whole verse is marked.

export type MitzvahType = "aseh" | "lav";
export type Mitzvah = {
  n: number;
  name: string;
  type: MitzvahType;
  rambam: number | null;
  semag: { type: MitzvahType; n: number } | null;
  ref: [string, number, number] | null;
  words: string | null;
};
export type MitzvahMark = { verse: number; start: number; end: number; n: number; name: string; type: MitzvahType };

const MITZVOT = (data as unknown as { mitzvot: Mitzvah[] }).mitzvot;

let index: Map<string, Mitzvah[]> | null = null;
function byVerse(): Map<string, Mitzvah[]> {
  if (index) return index;
  index = new Map();
  for (const m of MITZVOT) {
    if (!m.ref) continue;
    const k = m.ref.join("|");
    index.set(k, [...(index.get(k) ?? []), m]);
  }
  return index;
}

const FINAL: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const letters = (w: string) => w.replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, (c) => FINAL[c]);

// [start, end) of the run of words in `text` whose letters are `words`, else the whole verse
function wordsRange(text: string, words: string | null): [number, number] {
  const tokens = [...text.matchAll(/[^\s־׀]+/g)]
    // A word's end leaves out a trailing sof pasuq, so the underline stops at the letters
    .map((m) => ({ l: letters(m[0]), start: m.index, end: m.index + m[0].replace(/[׃\s]+$/, "").length }))
    .filter((t) => t.l);
  const want = (words ?? "").split(" ").map(letters).filter(Boolean);
  if (want.length) {
    for (let i = 0; i + want.length <= tokens.length; i++) {
      if (want.every((w, j) => tokens[i + j].l === w)) return [tokens[i].start, tokens[i + want.length - 1].end];
    }
  }
  return tokens.length ? [tokens[0].start, tokens[tokens.length - 1].end] : [0, text.length];
}

// The mitzvot of one chapter, given its verses exactly as the reader shows them
export function mitzvahMarks(book: string, chapter: number, verses: string[]): MitzvahMark[] {
  const marks: MitzvahMark[] = [];
  verses.forEach((text, i) => {
    for (const m of byVerse().get(`${book}|${chapter}|${i + 1}`) ?? []) {
      const [start, end] = wordsRange(text, m.words);
      marks.push({ verse: i + 1, start, end, n: m.n, name: m.name, type: m.type });
    }
  });
  return marks;
}
