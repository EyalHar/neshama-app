import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import type { RootItem, RootScope } from "@/lib/rootLetterPattern";

// Browse roots by their letters ("שורשים לפי אותיות" in /advanced). A root here is the Strong's
// lemma of a Hebrew *verb*: for verbs the lemma is the root itself (ברך, שוב, נתן), which makes
// the list exact. Roots attested only in nouns are therefore not included.

const FINAL_TO_REGULAR: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
// Strong's files the imperfect forms of הלך (וַיֵּלֶךְ…) under a separate lemma, יָלַךְ (H3212);
// Hebrew dictionaries (e.g. BDB) list them under הלך, so count them there
const MERGE_INTO: Record<string, string> = { "3212": "1980" };

type RootRow = { letters: string; plain: string; lemmaHe: string; counts: Record<Exclude<RootScope, "tanakh">, number> };

const SECTION_SCOPE: Record<string, Exclude<RootScope, "tanakh">> = { "תורה": "torah", "נביאים": "nevi", "כתובים": "ketuvim" };
const scopeOfBook = new Map(TANAKH_BOOKS.map((b) => [b.id, SECTION_SCOPE[b.section]]));

let rootsPromise: Promise<RootRow[]> | null = null;

// Every three-letter verb root with its occurrence count per section — built once per server
// process (WordEntry only changes on re-seed, so restart the server after seeding)
function getRoots(): Promise<RootRow[]> {
  rootsPromise ??= (async () => {
    const [rows, strongs] = await Promise.all([
      prisma.$queryRawUnsafe<{ book: string; lemma: string; morph: string; c: bigint | number }[]>(
        `SELECT book, lemma, morph, COUNT(*) AS c FROM "WordEntry" WHERE morph LIKE 'H%' AND morph GLOB '*V*' GROUP BY book, lemma, morph`
      ),
      prisma.strongsEntry.findMany({ select: { number: true, lemmaPlain: true, lemmaHe: true } }),
    ]);
    const meta = new Map(strongs.map((s) => [s.number.replace(/^H/, ""), s]));

    // Homonymous Strong's entries (same letters, different meanings) are merged into one root
    const byLetters = new Map<string, RootRow & { best: number }>();
    const countsByNum = new Map<string, number>();
    for (const r of rows) {
      const w = parseWord(r.lemma, r.morph);
      const scope = scopeOfBook.get(r.book);
      if (w) w.num = MERGE_INTO[w.num] ?? w.num;
      const m = w && meta.get(w.num);
      if (!w || w.pos !== "V" || !scope || !m) continue;
      const letters = [...m.lemmaPlain].map((ch) => FINAL_TO_REGULAR[ch] ?? ch).join("");
      if (!/^[א-ת]{3}$/.test(letters)) continue;
      const c = Number(r.c);
      const row = byLetters.get(letters) ?? { letters, plain: m.lemmaPlain, lemmaHe: m.lemmaHe, counts: { torah: 0, nevi: 0, ketuvim: 0 }, best: 0 };
      row.counts[scope] += c;
      const numCount = (countsByNum.get(w.num) ?? 0) + c;
      countsByNum.set(w.num, numCount);
      // Display the most frequent homonym's spelling
      if (numCount > row.best) Object.assign(row, { plain: m.lemmaPlain, lemmaHe: m.lemmaHe, best: numCount });
      byLetters.set(letters, row);
    }
    return [...byLetters.values()].map(({ letters, plain, lemmaHe, counts }) => ({ letters, plain, lemmaHe, counts }));
  })();
  return rootsPromise;
}

// Roots whose 1st/2nd/3rd letters match the given ones ("" = any letter), with counts in `scope`
export async function findRootsByLetters(pattern: [string, string, string], scope: RootScope): Promise<RootItem[]> {
  const roots = await getRoots();
  return roots
    .filter((r) => pattern.every((l, i) => !l || r.letters[i] === l))
    .map((r) => ({
      letters: r.letters,
      plain: r.plain,
      lemmaHe: r.lemmaHe,
      count: scope === "tanakh" ? r.counts.torah + r.counts.nevi + r.counts.ketuvim : r.counts[scope],
    }))
    .filter((r) => r.count > 0);
}
