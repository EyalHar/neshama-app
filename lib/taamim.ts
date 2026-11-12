// The structure of a verse by its disjunctive accents (טעמים מפסיקים). Each disjunctive ends a
// segment and has a rank: the verse ends with סוף פסוק, אתנחתא divides it, the "kings" (זקף,
// סגולתא, טפחא…) divide each half, and so on down. A segment is divided at every word inside it
// carrying the highest-ranking disjunctive found there (not counting its own last word), which
// gives the traditional tree. Client-safe: works on the reader's Sefaria text, which keeps the
// accents.
//
// Prose system only: Psalms, Proverbs and the poetic body of Job (3:2–42:6) use the other system
// (טעמי אמ״ת), with different accents and rules.

export type Accent = { name: string; level: number };

const DISJUNCTIVES: Record<number, Accent> = {
  0x0591: { name: "אתנחתא", level: 1 },
  0x0592: { name: "סגולתא", level: 2 },
  0x0594: { name: "זקף קטן", level: 2 },
  0x0595: { name: "זקף גדול", level: 2 },
  0x0596: { name: "טפחא", level: 2 },
  0x0597: { name: "רביע", level: 3 },
  0x0599: { name: "פשטא", level: 3 },
  0x059A: { name: "יתיב", level: 3 },
  0x059B: { name: "תביר", level: 3 },
  0x05AE: { name: "זרקא", level: 3 },
  0x059C: { name: "גרש", level: 4 },
  0x059D: { name: "גרש", level: 4 },
  0x059E: { name: "גרשיים", level: 4 },
  0x059F: { name: "קרני פרה", level: 4 },
  0x05A0: { name: "תלישא גדולה", level: 4 },
  0x05A1: { name: "פזר", level: 4 },
};
const SHALSHELET = 0x0593;
const MUNACH = 0x05A3;
const PASEQ = "׀";

export const LEVEL_NAMES = ["קיסר", "קיסר", "מלך", "משנה", "שליש"];
const CONJUNCTIVE = 9;

export type AccentWord = { text: string; accent: Accent | null };
export type Segment = { accent: Accent | null; words: AccentWord[]; children: Segment[] };

export function usesProseAccents(book: string, chapter: number, verse: number): boolean {
  if (book === "Psalms" || book === "Proverbs") return false;
  if (book !== "Job") return true;
  const afterStart = chapter > 3 || (chapter === 3 && verse >= 2);
  const beforeEnd = chapter < 42 || (chapter === 42 && verse <= 6);
  return !(afterStart && beforeEnd);
}

// One word (maqaf-joined words are one accent unit) → its disjunctive accent, if any
function accentOf(word: string, paseqAfter: boolean, last: boolean): Accent | null {
  if (last) return { name: "סוף פסוק", level: 0 };
  let best: Accent | null = null;
  for (const ch of word) {
    const cp = ch.codePointAt(0)!;
    const a = DISJUNCTIVES[cp]
      ?? (cp === SHALSHELET && paseqAfter ? { name: "שלשלת", level: 2 } : undefined)
      ?? (cp === MUNACH && paseqAfter ? { name: "לגרמיה", level: 4 } : undefined);
    if (a && (!best || a.level < best.level)) best = a;
  }
  return best;
}

const levelOf = (w: AccentWord) => w.accent?.level ?? CONJUNCTIVE;

function divide(words: AccentWord[]): Segment {
  const accent = words[words.length - 1].accent;
  const inner = words.slice(0, -1).map(levelOf);
  const top = Math.min(CONJUNCTIVE, ...inner);
  if (top === CONJUNCTIVE) return { accent, words, children: [] };
  const children: Segment[] = [];
  let start = 0;
  inner.forEach((level, i) => {
    if (level === top) {
      children.push(divide(words.slice(start, i + 1)));
      start = i + 1;
    }
  });
  children.push(divide(words.slice(start)));
  return { accent, words, children };
}

export function parseVerse(text: string): Segment | null {
  const tokens = text.replace(/[׃]/g, "").split(/\s+/).filter(Boolean);
  const units: { text: string; paseq: boolean }[] = [];
  for (const t of tokens) {
    if (t === PASEQ) { if (units.length) units[units.length - 1].paseq = true; }
    else units.push({ text: t, paseq: false });
  }
  if (units.length === 0) return null;
  const words = units.map((u, i) => ({
    text: u.paseq ? `${u.text} ${PASEQ}` : u.text,
    accent: accentOf(u.text, u.paseq, i === units.length - 1),
  }));
  return divide(words);
}
