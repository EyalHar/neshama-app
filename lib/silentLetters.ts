// Silent letters whose silence is not obvious to a reader: written, not heard, and not a mater
// lectionis. The everyday quiescent alef (רֹאשׁ, לֹא, וַיֹּאמֶר) is left alone on purpose. Found from the
// pointed MAM text the reader shows; anything the rules can't decide is left alone. Client-safe.
//
// A word is cut into letters, each with the marks that follow it. A letter is "bare" when it has no
// vowel, sheva, hataf, dagesh, shin/sin dot or rafe (accents, meteg and dots over letters don't count).
// Words with no pointing at all are ketiv and are skipped.
//
// 1. "prefixAlef" — the alef that opens a word's stem after a prefix (ו ב כ ל מ ה ש) which took its
//    vowel: וֵאלֹהֵי, לֵאלֹהִים, לֵאמֹר, לַאדֹנָי, בֵּאדַיִן. The prefix reads as if the alef were not there.
//    Not when the alef carries a vowel or comes before a holam/shuruk vav (לְאֵל, לָאוֹר).
// 2. "bare" — a bare letter inside a pointed word that is none of א ה ו י and is not followed by
//    a וֹ / וּ (whose vowel it carries). In MAM this is only the second ש of יִשָּׂשכָר.

export type SilentRule = "prefixAlef" | "bare";
export type SilentRange = { start: number; end: number; rule: SilentRule };

const isLetter = (ch: string) => ch >= "א" && ch <= "ת";
const POINT = /[ְ-ׇּֿׁׂ]/;
const SHEVA = "ְ";
const TSERE = "ֵ";
const PATACH = "ַ";
const DAGESH = "ּ";
const PREFIX = "ובכלמהש";
const SEPARATOR = /[\s־׀׃()[\]|]/;

type Unit = { l: string; m: string; start: number; end: number };

const bare = (u: Unit) => !POINT.test(u.m);
const VOWEL_OR_SHEVA = /[ְ-ׇֻ]/;
// A holam vav (וֹ) or a shuruk (וּ: a dagesh and no vowel of its own)
const materVav = (u: Unit | undefined) =>
  !!u && u.l === "ו" && (u.m.includes("ֹ") || (u.m.includes(DAGESH) && !VOWEL_OR_SHEVA.test(u.m)));

function wordRanges(units: Unit[]): SilentRange[] {
  if (!units.some((u) => POINT.test(u.m))) return [];
  const out: SilentRange[] = [];
  const last = units.length - 1;
  units.forEach((u, i) => {
    if (i === 0 || i === last || !bare(u)) return;
    const prev = units[i - 1];
    const next = units[i + 1];
    let rule: SilentRule | null = null;
    if (u.l === "א") {
      // The prefix before the alef takes tsere (לֵאמֹר, וֵאלֹהֵי) or, before אדנ, patach (לַאדֹנָי); a
      // second prefix before it has sheva or is a shuruk (וְלֵאמֹר). Other vowels are mostly a root
      // letter, not a prefix (מְלָאכָה, מָאתַיִם, הֵבֵאתִי), whose silent alef is the ordinary kind.
      const prefixes = units.slice(0, i).every((p) => PREFIX.includes(p.l));
      const firstOk = i === 1 || units[0].m.includes(SHEVA) || materVav(units[0]);
      const vowelOk = prev.m.includes(TSERE) || (prev.m.includes(PATACH) && next?.l === "ד" && units[i + 2]?.l === "נ");
      if (i <= 2 && prefixes && firstOk && vowelOk && !materVav(next)) rule = "prefixAlef";
    } else if (!"הוי".includes(u.l) && !materVav(next)) {
      rule = "bare";
    }
    if (rule) out.push({ start: u.start, end: u.end, rule });
  });
  return out;
}

// The silent letters of a verse, each as the range of the letter with its marks
export function silentLetterRanges(text: string): SilentRange[] {
  const out: SilentRange[] = [];
  let units: Unit[] = [];
  const flush = () => { if (units.length) out.push(...wordRanges(units)); units = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (SEPARATOR.test(ch)) { flush(); continue; }
    if (isLetter(ch)) units.push({ l: ch, m: "", start: i, end: i + 1 });
    else if (units.length) { units[units.length - 1].m += ch; units[units.length - 1].end = i + 1; }
  }
  flush();
  return out;
}
