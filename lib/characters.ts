import { prisma } from "@/lib/prisma";
import { parseWord } from "@/lib/wordStats";

// Who appears with whom: the people named in a book (OSHB proper nouns, Np) and the chapters they
// share. A name counts as a person when its Strong's definition starts with the name (not "a lot",
// פּוּר) and its main sense, before "also", isn't a place or a month ("Laban, a Mesopotamian; also a
// place in the Desert" → a person; "Gibah; the name of three places" → a place). Strong's
// often files several people under one entry ("Jonathan, the name of ten Israelites"), so a node
// can merge namesakes. Divine names are left out: they would connect to everyone.

const MAX_PEOPLE = 30;
const DIVINE = new Set(["3068", "3069", "3050"]);
// One person under two Strong's entries: אַבְרָם → אַבְרָהָם, שָׂרַי → שָׂרָה, יוֹנָתָן → יְהוֹנָתָן
const SAME_PERSON: Record<string, string> = { "87": "85", "8297": "8283", "3129": "3083" };
const personOf = (num: string) => SAME_PERSON[num] ?? num;
const NOT_PERSON = /\b(month|a place|places|city|cities|town|region|river|mount|valley|country|district|brook|desert|wilderness|hill|spring|fountain|pool|sea|island|stream|plain|forest|province|territory|Egypt|Babylon|Palestine)\b/i;

// A chapter with the verse a link should open: where the person first appears in it, or for a pair,
// the first verse naming both (when there is none, the first verse by which both have appeared)
export type ChapterRef = { chapter: number; verse: number };
export type CharacterNode = { id: string; name: string; definition: string; count: number; chapters: ChapterRef[] };
export type CharacterEdge = { a: string; b: string; chapters: ChapterRef[] };
export type CharacterNetwork = { nodes: CharacterNode[]; edges: CharacterEdge[] };

// book → Strong's → chapter → the verses naming the person, one entry per mention
type Occurrences = Map<string, Map<string, Map<number, number[]>>>;

let occurrencesPromise: Promise<{ occ: Occurrences; meta: Map<string, { name: string; definition: string }> }> | null = null;

// All person-name occurrences in the Tanakh, per book and chapter — once per server process
function getOccurrences() {
  occurrencesPromise ??= (async () => {
    const rows = await prisma.$queryRawUnsafe<{ book: string; chapter: number; verse: number; lemma: string; morph: string }[]>(
      `SELECT book, chapter, verse, lemma, morph FROM "WordEntry" WHERE morph GLOB '*Np*' ORDER BY verseIndex`
    );
    const nums = new Set<string>();
    for (const r of rows) {
      const w = parseWord(r.lemma, r.morph);
      if (w?.proper && !DIVINE.has(w.num)) nums.add(personOf(w.num));
    }
    const entries = await prisma.strongsEntry.findMany({
      where: { number: { in: [...nums].map((n) => `H${n}`) } },
      select: { number: true, lemmaHe: true, definition: true },
    });
    const meta = new Map<string, { name: string; definition: string }>();
    for (const e of entries) {
      const mainSense = e.definition.split(/[;,]\s*also\b/)[0];
      if (/^[A-Z]/.test(e.definition) && !NOT_PERSON.test(mainSense)) meta.set(e.number.slice(1), { name: e.lemmaHe, definition: e.definition });
    }

    const occ: Occurrences = new Map();
    for (const r of rows) {
      const w = parseWord(r.lemma, r.morph);
      const num = w?.proper ? personOf(w.num) : null;
      if (!num || !meta.has(num)) continue;
      const byNum = occ.get(r.book) ?? new Map();
      const byChapter = byNum.get(num) ?? new Map<number, number[]>();
      const ch = Number(r.chapter);
      byChapter.set(ch, [...(byChapter.get(ch) ?? []), Number(r.verse)]);
      byNum.set(num, byChapter);
      occ.set(r.book, byNum);
    }
    return { occ, meta };
  })();
  return occurrencesPromise;
}

// The most-named people of a book and, for each pair of them, the chapters they share
export async function getCharacterNetwork(book: string): Promise<CharacterNetwork> {
  const { occ, meta } = await getOccurrences();
  const byNum = occ.get(book);
  if (!byNum) return { nodes: [], edges: [] };

  const top = [...byNum]
    .map(([num, chapters]) => ({ num, chapters, count: [...chapters.values()].reduce((a, v) => a + v.length, 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_PEOPLE);

  const nodes: CharacterNode[] = top.map(({ num, chapters, count }) => ({
    id: `H${num}`,
    name: meta.get(num)!.name,
    definition: meta.get(num)!.definition,
    count,
    chapters: [...chapters].map(([chapter, verses]) => ({ chapter, verse: Math.min(...verses) })).sort((a, b) => a.chapter - b.chapter),
  }));

  const edges: CharacterEdge[] = [];
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const shared: ChapterRef[] = [];
      for (const [chapter, versesA] of top[i].chapters) {
        const versesB = top[j].chapters.get(chapter);
        if (!versesB) continue;
        const inB = new Set(versesB);
        const together = versesA.filter((v) => inB.has(v));
        shared.push({ chapter, verse: together.length > 0 ? Math.min(...together) : Math.max(Math.min(...versesA), Math.min(...versesB)) });
      }
      if (shared.length > 0) edges.push({ a: nodes[i].id, b: nodes[j].id, chapters: shared.sort((a, b) => a.chapter - b.chapter) });
    }
  }
  return { nodes, edges };
}
