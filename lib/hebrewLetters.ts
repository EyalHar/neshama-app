// Client-safe Hebrew letter helpers (no Prisma), shared by the letters quiz server and client.

export const HEBREW_LETTERS = [..."אבגדהוזחטיכלמנסעפצקרשת"];

const FINAL_TO_REGULAR: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

export const toRegular = (letter: string) => FINAL_TO_REGULAR[letter] ?? letter;

export const isLetter = (c: string) => c >= "א" && c <= "ת";

// "בָּשָׂר" → [{ letter: "ב", marks: "ָּ" }, …]: each letter with the nikud that follows it
export function splitGraphemes(word: string): { letter: string; marks: string }[] {
  const out: { letter: string; marks: string }[] = [];
  for (const c of word) {
    if (isLetter(c)) out.push({ letter: c, marks: "" });
    else if (out.length) out[out.length - 1].marks += c;
  }
  return out;
}

export const stripNikud = (s: string) => s.replace(/[֑-ׇ]/g, "");
