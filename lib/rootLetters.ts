import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { ANY_LETTER, type RootItem, type RootPattern, type RootScope } from "@/lib/rootLetterPattern";

// Browse roots by their letters ("שורשים לפי אותיות" in /advanced). A root here is the Strong's
// lemma of a Hebrew *verb*: for verbs the lemma is the root itself (ברך, שוב, נתן), which makes
// the list exact. Roots attested only in nouns are therefore not included.
//
// Pilpel verbs (כִּלְכֵּל, גִּלְגֵּל, שִׁעֲשַׁע, חֳמַרְמַר) are tagged in OSHB under their triliteral root
// (כול, גלל, שעע, חמר), so they are counted there, as in traditional grammar.

const FINAL_TO_REGULAR: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
// Verb forms OSHB tags with a lemma that isn't their root, folded into the root:
// - יָלַךְ (H3212): Strong's files the imperfect of הלך (וַיֵּלֶךְ…) separately; Hebrew dictionaries
//   (e.g. BDB) list it under הלך (H1980)
// - two-letter adjective/noun lemmas on geminate (ע״ע) verbs, mapped to the root Strong's itself
//   derives them from: רַב/רֹב → רבב, צַר → צרר, מַר → מרר, תֹּם → תמם, רַע → רעע, חַת → חתת,
//   חֹם → חמם, חַי → חיה
const MERGE_INTO: Record<string, string> = {
  "3212": "1980",
  "7227": "7231", "7230": "7231", "6862": "6887", "4751": "4843", "8537": "8552",
  "7451": "7489", "2844": "2865", "2527": "2552", "2416": "2421",
};
// A noun mis-tagged as a verb (עֵת, "time", Ps 105:19) — not a root at all
const NOT_A_VERB = new Set(["6256"]);
// The Tanakh's genuine quadriliteral verbs. A curated list, because most four-letter "verb"
// lemmas in the data are mis-tagged nouns/participles (קִרְאָה, אַהֲבָה…): כִּרְסֵם, כִּרְבֵּל, פַּרְשֵׁז,
// חִסְפֵּס, רֻטֲפַשׁ, and the denominative הִשְׂמְאִיל (from שְׂמֹאל, "to go left")
const QUADRILITERALS = new Set(["3765", "3736", "6576", "2636", "7375", "8041"]);

type RootRow = { letters: string; plain: string; lemmaHe: string; counts: Record<Exclude<RootScope, "tanakh">, number> };

const SECTION_SCOPE: Record<string, Exclude<RootScope, "tanakh">> = { "תורה": "torah", "נביאים": "nevi", "כתובים": "ketuvim" };
const scopeOfBook = new Map(TANAKH_BOOKS.map((b) => [b.id, SECTION_SCOPE[b.section]]));

let rootsPromise: Promise<RootRow[]> | null = null;

// Every three-letter (and curated four-letter) verb root with its occurrence count per section — built once per server
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
      if (!w || w.pos !== "V" || !scope || !m || NOT_A_VERB.has(w.num)) continue;
      const letters = [...m.lemmaPlain].map((ch) => FINAL_TO_REGULAR[ch] ?? ch).join("");
      if (!/^[א-ת]{3}$/.test(letters) && !(QUADRILITERALS.has(w.num) && /^[א-ת]{4}$/.test(letters))) continue;
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

// Roots matching the pattern, with counts in `scope`. Positions 1–3: a letter, or "" for any.
// Position 4: "" for triliteral roots only, ANY_LETTER or a letter for quadriliteral roots.
export async function findRootsByLetters(pattern: RootPattern, scope: RootScope): Promise<RootItem[]> {
  const roots = await getRoots();
  const quad = pattern[3] !== "";
  return roots
    .filter((r) => r.letters.length === (quad ? 4 : 3))
    .filter((r) => pattern.every((l, i) => !l || l === ANY_LETTER || r.letters[i] === l))
    .map((r) => ({
      letters: r.letters,
      plain: r.plain,
      lemmaHe: r.lemmaHe,
      count: scope === "tanakh" ? r.counts.torah + r.counts.nevi + r.counts.ketuvim : r.counts[scope],
    }))
    .filter((r) => r.count > 0);
}

// For a typed "root" longer than three letters (כלכל, חמרמר…): the verb roots whose forms contain
// it. Pilpel verbs are filed under their triliteral root, so typing the reduplicated form finds
// the noun/name of that spelling (כַּלְכֹּל) instead of the verb — this points to the real root.
export async function findRootsContaining(typed: string): Promise<RootItem[]> {
  const letters = [...typed].map((ch) => FINAL_TO_REGULAR[ch] ?? ch).join("");
  if (!/^[א-ת]{4,}$/.test(letters)) return [];
  const normalizedPlain = Object.entries(FINAL_TO_REGULAR).reduce((sql, [f, r]) => `REPLACE(${sql}, '${f}', '${r}')`, "plain");
  const [rows, roots] = await Promise.all([
    prisma.$queryRawUnsafe<{ lemma: string; morph: string; c: bigint | number }[]>(
      `SELECT lemma, morph, COUNT(*) AS c FROM "WordEntry"
       WHERE morph LIKE 'H%' AND morph GLOB '*V*' AND ${normalizedPlain} LIKE ?
       GROUP BY lemma, morph`,
      `%${letters}%`
    ),
    getRoots(),
  ]);
  const strongs = await prisma.strongsEntry.findMany({
    where: { number: { in: [...new Set(rows.map((r) => `H${parseWord(r.lemma, r.morph)?.num}`))] } },
    select: { number: true, lemmaPlain: true },
  });
  const plainOf = new Map(strongs.map((s) => [s.number.replace(/^H/, ""), s.lemmaPlain]));

  const counts = new Map<string, number>();
  for (const r of rows) {
    const w = parseWord(r.lemma, r.morph);
    if (!w || w.pos !== "V") continue;
    const plain = plainOf.get(MERGE_INTO[w.num] ?? w.num);
    const rootLetters = plain && [...plain].map((ch) => FINAL_TO_REGULAR[ch] ?? ch).join("");
    if (!rootLetters || rootLetters === letters) continue;
    counts.set(rootLetters, (counts.get(rootLetters) ?? 0) + Number(r.c));
  }
  return roots
    .filter((r) => counts.has(r.letters))
    .map((r) => ({ letters: r.letters, plain: r.plain, lemmaHe: r.lemmaHe, count: counts.get(r.letters)! }))
    .sort((a, b) => b.count - a.count);
}
