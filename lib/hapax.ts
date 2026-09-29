import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, Section } from "@/lib/tanakh";

export type HapaxEntry = {
  book: string;
  bookHe: string;
  section: Section;
  chapter: number;
  verse: number;
  word: string;
  plain: string;
};

// WordEntry.lemma is an OSHB-style compound id: inseparable prefixes (conjunction,
// article, prepositions) each get their own "/"-separated segment, with the real
// lexeme id always last (e.g. "d/776", "c/d/776", "776" all mean the same lexeme
// 776). A homonym suffix like "1254 a" is part of the lexeme id and must NOT be
// touched. Grouping by the raw column would fragment real words across many
// distinct strings and make them look like false hapax legomena.
function normalizeLemma(lemma: string): string {
  const idx = lemma.lastIndexOf("/");
  return idx === -1 ? lemma : lemma.slice(idx + 1);
}

// Strong's-style ids sometimes carry a homonym letter suffix (e.g. "1254 a" — a
// genuinely distinct word from "1254 b"), but the seeded StrongsEntry dictionary only
// ever has the bare number ("H1254", no lettered variant) — so derivedFrom lookups
// must drop the letter to find a match. This loses homonym precision but there is no
// finer-grained dictionary row to look up instead.
function strongsKey(lexeme: string): string {
  return "H" + lexeme.split(" ")[0];
}

export type HapaxOptions = {
  // Exclude a lexeme-unique word if its exact `plain` letters also occur under a
  // DIFFERENT lexeme anywhere in the Tanakh — e.g. "תַּפּוּחַ" the fruit (H8598) vs the
  // place-name lexemes (H8599/H1054/H5887) that happen to print identically. Without
  // this, homographs across unrelated dictionary entries look like false hapax hits.
  mergeSpelling?: boolean;
  // Exclude a lexeme-unique word if its Strong's entry derives from exactly one OTHER
  // lexeme that itself is common (occurs more than once) — e.g. "חֶרְמוֹנִים" (Hermons/
  // its peaks, H2769) derived from "חֶרְמוֹן" (Hermon, H2768). Cast a much wider net than
  // "mergeSpelling": most matches are proper nouns etymologically derived from an
  // unrelated common root (e.g. "יוּבָל", a person's name, derived from a verb meaning
  // "to flow") — not the same word or even the same kind of thing. Off by default.
  mergeDerived?: boolean;
};

function cacheKey(opts: HapaxOptions): string {
  return `${opts.mergeSpelling ? 1 : 0}:${opts.mergeDerived ? 1 : 0}`;
}

// In-memory cache per option combination: the underlying tables only change via
// re-seeding, so it's safe to compute each combination once per server process.
const cache = new Map<string, HapaxEntry[]>();

export async function getHapaxWords(opts: HapaxOptions = {}): Promise<HapaxEntry[]> {
  const key = cacheKey(opts);
  const cached = cache.get(key);
  if (cached) return cached;

  const [rows, strongsRows] = await Promise.all([
    prisma.wordEntry.findMany({
      select: { book: true, chapter: true, verse: true, word: true, plain: true, lemma: true },
    }),
    opts.mergeDerived
      ? prisma.strongsEntry.findMany({ select: { number: true, derivedFrom: true } })
      : Promise.resolve([]),
  ]);

  const lexemeCounts = new Map<string, number>();
  const firstRowByLexeme = new Map<string, (typeof rows)[number]>();
  const plainCounts = new Map<string, number>();

  for (const r of rows) {
    const lex = normalizeLemma(r.lemma);
    lexemeCounts.set(lex, (lexemeCounts.get(lex) ?? 0) + 1);
    if (!firstRowByLexeme.has(lex)) firstRowByLexeme.set(lex, r);
    plainCounts.set(r.plain, (plainCounts.get(r.plain) ?? 0) + 1);
  }

  const derivedFromByNumber = new Map(strongsRows.map((s) => [s.number, s.derivedFrom]));

  const bookMeta = new Map(TANAKH_BOOKS.map((b) => [b.id, b]));
  const bookOrder = new Map(TANAKH_BOOKS.map((b, i) => [b.id, i]));

  const result: HapaxEntry[] = [];
  for (const [lex, count] of lexemeCounts) {
    if (count !== 1) continue;
    const r = firstRowByLexeme.get(lex)!;

    if (opts.mergeSpelling && (plainCounts.get(r.plain) ?? 0) !== 1) continue;

    if (opts.mergeDerived) {
      const derivedFrom = derivedFromByNumber.get(strongsKey(lex));
      const parents = derivedFrom ? derivedFrom.split(",").map((s) => s.trim()).filter(Boolean) : [];
      if (parents.length === 1) {
        const parentLex = parents[0].replace(/^H/, "");
        const parentCount = lexemeCounts.get(parentLex) ?? 0;
        if (parentCount > 1) continue; // derived from a lexeme that's itself common
      }
    }

    const meta = bookMeta.get(r.book);
    if (!meta) continue; // unrecognized book id — skip defensively
    result.push({
      book: r.book,
      bookHe: meta.he,
      section: meta.section,
      chapter: r.chapter,
      verse: r.verse,
      word: r.word,
      plain: r.plain,
    });
  }

  result.sort((a, b) => {
    const diff = (bookOrder.get(a.book) ?? 999) - (bookOrder.get(b.book) ?? 999);
    if (diff !== 0) return diff;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  cache.set(key, result);
  return result;
}
