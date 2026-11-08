import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, scopeBookIds } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { describeVerb } from "@/lib/grammarQuiz";
import { fetchStrongsMeta, stripDiacritics } from "@/lib/rootFamily";

// "What is this word?" — for typed words, the lexemes (Strong's entries) they are in the OSHB
// text, how each occurrence is built (prefixes, part of speech, suffix), and the chain of
// Strong's derivedFrom links up to its root: רְדִידִי → רָדִיד ← רָדַד.

export type ChainLink = { number: string; lemmaHe: string; lemmaPlain: string; definition: string };

export type VerseRef = { book: string; bookHe: string; chapter: number; verse: number };

// One way a form is built, with the verses it occurs in (the first MAX_REFS)
export type FormParse = { parse: string; count: number; refs: VerseRef[] };

export type FormAnalysis = { form: string; count: number; parses: FormParse[] };

export type LexemeAnalysis = {
  number: string;
  lemmaHe: string;
  definition: string;
  pos: string;
  count: number;
  forms: FormAnalysis[];
  // The lexeme first, then each parent up the derivedFrom chain
  chain: ChainLink[];
  // The last link is a primitive root in Strong's (not just a dead end)
  primitiveRoot: boolean;
  // When the last link refers to several entries, Strong's doesn't say which is the source (a
  // two-part name, or a cross-reference beside the real source, as סֵפֶר → אֲבֵדָה, סָפַר): all of them
  candidates: ChainLink[];
};

export type WordAnalysisResult = { lexemes: LexemeAnalysis[]; totalLexemes: number };

const MAX_TERMS = 5;
const MAX_LEXEMES = 15;
const MAX_CHAIN = 5;
const MAX_FORMS = 8;
const MAX_REFS = 50;
const METEG = "ֽ";
const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));

const GENDER: Record<string, string> = { m: "זכר", f: "נקבה", c: "זו״נ", b: "זו״נ" };
const NUMBER: Record<string, string> = { s: "יחיד", p: "רבים", d: "זוגי" };
const STATE: Record<string, string> = { c: "סמיכות" };

const PREFIX: Record<string, string> = {
  C: "ו׳ החיבור", R: "אות יחס", Rd: "אות יחס + ה׳ הידיעה", Td: "ה׳ הידיעה", Ti: "ה׳ השאלה", Tr: "ש׳ הזיקה",
};

const PRONOUN: Record<string, [string, string, string]> = {
  // [possessive, object, plain]
  "1cs": ["שלי", "אותי", "אני"], "2ms": ["שלך", "אותך", "אתה"], "2fs": ["שלך", "אותך", "את"],
  "3ms": ["שלו", "אותו", "הוא"], "3fs": ["שלה", "אותה", "היא"], "1cp": ["שלנו", "אותנו", "אנחנו"],
  "2mp": ["שלכם", "אתכם", "אתם"], "2fp": ["שלכן", "אתכן", "אתן"], "3mp": ["שלהם", "אותם", "הם"],
  "3fp": ["שלהן", "אותן", "הן"],
};

const PARTICLE: Record<string, string> = {
  Ta: "מילית חיוב", Te: "מילית בקשה", Ti: "מילית שאלה", Tj: "מילת קריאה", Tm: "מילית רמז",
  Tn: "מילת שלילה", To: "את (מושא)", Tr: "מילית זיקה",
};
const PRONOUN_KIND: Record<string, string> = {
  Pd: "כינוי רומז", Pf: "כינוי סתמי", Pi: "כינוי שאלה", Pp: "כינוי גוף", Pr: "כינוי זיקה",
};
const ADJ_KIND: Record<string, string> = { Aa: "שם תואר", Ac: "שם מספר", Ag: "שם עם", Ao: "מספר סודר" };
const NOUN_KIND: Record<string, string> = { Nc: "שם עצם", Ng: "שם עם", Np: "שם פרטי" };

function genderNumber(rest: string): string {
  const [g, n, s] = rest;
  return [NUMBER[n], GENDER[g], STATE[s]].filter(Boolean).join(" ");
}

// Part of speech of a main-word morph segment, in Hebrew
function partOfSpeech(seg: string, aramaic: boolean): string {
  const kind = seg.slice(0, 2);
  if (seg[0] === "V") return aramaic ? "פועל (ארמית)" : "פועל";
  if (seg[0] === "N") return NOUN_KIND[kind] ?? "שם עצם";
  if (seg[0] === "A") return ADJ_KIND[kind] ?? "שם תואר";
  if (seg[0] === "P") return PRONOUN_KIND[kind] ?? "כינוי";
  if (seg[0] === "T") return PARTICLE[kind] ?? "מילית";
  return { R: "מילת יחס", C: "מילת חיבור", D: "תואר הפועל" }[seg[0]] ?? "";
}

function describeMain(seg: string, aramaic: boolean): string {
  if (seg[0] === "V") return aramaic ? "פועל (ארמית)" : `פועל בבניין ${describeVerb(seg)}`;
  if (seg[0] === "N" || seg[0] === "A") {
    const detail = seg.startsWith("Np") ? "" : genderNumber(seg.slice(2));
    return [partOfSpeech(seg, aramaic), detail].filter(Boolean).join(" · ");
  }
  return partOfSpeech(seg, aramaic);
}

function describeSuffix(seg: string, mainPos: string): string | null {
  if (seg === "Sd") return "ה׳ המגמה";
  if (seg === "Sh" || seg === "Sn") return null; // paragogic letters, no meaning of their own
  const p = seg.startsWith("Sp") && PRONOUN[seg.slice(2, 5)];
  if (!p) return null;
  if (mainPos === "N" || mainPos === "A") return `כינוי שייכות (${p[0]})`;
  if (mainPos === "V") return `כינוי מושא (${p[1]})`;
  return `כינוי (${p[2]})`;
}

// "HRd/Ncmsa" → "אות יחס + ה׳ הידיעה + שם עצם · זכר יחיד"
export function describeMorph(lemma: string, morph: string): string {
  const aramaic = morph[0] === "A";
  const segs = morph.slice(1).split("/");
  const mainIndex = lemma.split("/").findIndex((s) => /^\d/.test(s.trim()));
  const main = segs[mainIndex] ?? "";
  const parts = segs.flatMap((seg, i) => {
    if (i < mainIndex) return [PREFIX[seg] ?? PREFIX[seg[0]] ?? []].flat();
    if (i === mainIndex) return [describeMain(seg, aramaic)];
    return [describeSuffix(seg, main[0]) ?? []].flat();
  });
  return parts.join(" + ");
}

const toLink = (m: ChainLink): ChainLink =>
  ({ number: m.number, lemmaHe: m.lemmaHe, lemmaPlain: m.lemmaPlain, definition: m.definition });

async function chainOf(number: string): Promise<{ chain: ChainLink[]; primitiveRoot: boolean; candidates: ChainLink[] }> {
  const chain: ChainLink[] = [];
  let current: string | null = number;
  let primitiveRoot = false;
  let candidates: ChainLink[] = [];
  while (current && chain.length < MAX_CHAIN && !chain.some((c) => c.number === current)) {
    const meta = (await fetchStrongsMeta([current])).get(current);
    if (!meta) break;
    chain.push(toLink(meta));
    const parents: string[] = meta.derivedFrom.split(",").map((s) => s.trim()).filter(Boolean);
    primitiveRoot = Boolean(meta.isPrimitive);
    // Several parents: stop, as resolveUltimateRoots() does, and list them as candidates
    current = !meta.isPrimitive && parents.length === 1 ? parents[0] : null;
    if (!meta.isPrimitive && parents.length > 1) {
      const metas = await fetchStrongsMeta(parents);
      candidates = parents.flatMap((n) => (metas.has(n) ? [toLink(metas.get(n)!)] : []));
    }
  }
  return { chain, primitiveRoot, candidates };
}

// Analyze the words of `q`: each typed word as a whole OSHB word (with its prefixes, e.g. בעיר),
// or — when `whole` is false — every OSHB word containing it
export async function analyzeWords(q: string, whole: boolean, scope: string): Promise<WordAnalysisResult> {
  const terms = [...new Set(q.split(/[\s־]+/).map(stripDiacritics).filter((t) => t.length >= 2))].slice(0, MAX_TERMS);
  if (terms.length === 0) return { lexemes: [], totalLexemes: 0 };

  const bookIds = scopeBookIds(scope);
  const match = whole
    ? `plain IN (${terms.map(() => "?").join(",")})`
    : `(${terms.map(() => "plain LIKE ?").join(" OR ")})`;
  const args = whole ? terms : terms.map((t) => `%${t}%`);
  const scopeFilter = bookIds ? `AND book IN (${bookIds.map(() => "?").join(",")})` : "";

  const rows = await prisma.$queryRawUnsafe<{ book: string; chapter: number; verse: number; lemma: string; morph: string; word: string }[]>(
    `SELECT book, chapter, verse, lemma, morph, word FROM "WordEntry" WHERE ${match} ${scopeFilter} ORDER BY verseIndex, wordNum`,
    ...args, ...(bookIds ?? [])
  );

  type FormAcc = { form: string; count: number; parses: Map<string, FormParse> };
  type Acc = { count: number; pos: Map<string, number>; forms: Map<string, FormAcc> };
  const byNumber = new Map<string, Acc>();
  for (const r of rows) {
    const w = parseWord(r.lemma, r.morph);
    if (!w) continue;
    const acc = byNumber.get(w.num) ?? { count: 0, pos: new Map(), forms: new Map() };
    acc.count++;
    const pos = partOfSpeech(w.seg, r.morph[0] === "A");
    acc.pos.set(pos, (acc.pos.get(pos) ?? 0) + 1);
    // A meteg (secondary stress) doesn't make a different form
    const form = r.word.split(METEG).join("");
    const f = acc.forms.get(form) ?? { form, count: 0, parses: new Map() };
    f.count++;
    const parse = describeMorph(r.lemma, r.morph);
    const fp = f.parses.get(parse) ?? { parse, count: 0, refs: [] };
    fp.count++;
    const last = fp.refs[fp.refs.length - 1];
    const sameVerse = last && last.book === r.book && last.chapter === r.chapter && last.verse === r.verse;
    if (fp.refs.length < MAX_REFS && !sameVerse) {
      fp.refs.push({ book: r.book, bookHe: BOOK_HE.get(r.book) ?? r.book, chapter: r.chapter, verse: r.verse });
    }
    f.parses.set(parse, fp);
    acc.forms.set(form, f);
    byNumber.set(w.num, acc);
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
  const ranked = [...byNumber].sort((a, b) => b[1].count - a[1].count);
  const lexemes = await Promise.all(
    ranked.slice(0, MAX_LEXEMES).map(async ([num, acc]) => {
      const { chain, primitiveRoot, candidates } = await chainOf(`H${num}`);
      return {
        number: `H${num}`,
        lemmaHe: chain[0]?.lemmaHe ?? "",
        definition: chain[0]?.definition ?? "",
        pos: [...acc.pos].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
        count: acc.count,
        forms: [...acc.forms.values()].sort(byCount).slice(0, MAX_FORMS)
          .map((f) => ({ form: f.form, count: f.count, parses: [...f.parses.values()].sort(byCount) })),
        chain,
        primitiveRoot,
        candidates,
      };
    })
  );
  return { lexemes, totalLexemes: byNumber.size };
}
