import data from "@/data/who-said/who-said.json";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";

// "מי אמר למי": a quote from the snapshot data/who-said/who-said.json (built and checked by hand
// with scripts/build-who-said.mjs), and four "X אל Y" options. Distractors get closer with the
// level: easy = pairs from anywhere, medium = pairs from the same work, hard = the reversed pair
// and pairs sharing a person with the answer.

export type WhoSaidLevel = "easy" | "medium" | "hard";

type Item = { book: string; chapter: number; verse: number; speaker: string; addressee: string; quote: string; level: WhoSaidLevel };
type Snapshot = { people: Record<string, string>; items: Item[] };

export type WhoSaidQuestion = {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  quote: string;
  verseText: string; // the whole verse, shown after answering
  options: string[];
  answerIndex: number;
};

const snapshot = data as Snapshot;

// Books that are one work, so "the same story" spans them
const WORK: Record<string, string> = {
  "I Samuel": "Samuel", "II Samuel": "Samuel", "I Kings": "Kings", "II Kings": "Kings",
  "I Chronicles": "Chronicles", "II Chronicles": "Chronicles",
};
const workOf = (book: string) => WORK[book] ?? book;
const DIVINE = "3068";

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Pair = [string, string];

function distractors(item: Item, items: Item[], level: WhoSaidLevel): Pair[] {
  const same = (p: Pair) => p[0] === item.speaker && p[1] === item.addressee;
  const work = items.filter((it) => workOf(it.book) === workOf(item.book));
  // ה׳ only joins made-up pairs when the answer is divine speech: "ה׳ אל חוּשַׁי" is no riddle
  const divine = item.speaker === DIVINE || item.addressee === DIVINE;
  const workPeople = [...new Set(work.flatMap((it) => [it.speaker, it.addressee]))].filter((p) => divine || p !== DIVINE);
  const pairsOf = (list: Item[]): Pair[] => list.map((it) => [it.speaker, it.addressee]);

  const sharing: Pair[] = workPeople.flatMap((p): Pair[] => [
    [item.speaker, p],
    [p, item.addressee],
  ]);
  const tiers: Pair[][] =
    level === "hard"
      ? [[[item.addressee, item.speaker]], shuffle(sharing), shuffle(pairsOf(work)), shuffle(pairsOf(items))]
      : level === "medium"
        ? [shuffle(pairsOf(work)), shuffle(sharing), shuffle(pairsOf(items))]
        : [shuffle(pairsOf(items.filter((it) => workOf(it.book) !== workOf(item.book))))];

  const chosen = new Map<string, Pair>();
  for (const tier of tiers) {
    for (const p of tier) {
      if (chosen.size === 3) break;
      if (p[0] === p[1] || same(p)) continue;
      chosen.set(p.join(">"), p);
    }
  }
  return [...chosen.values()];
}

export async function generateWhoSaidQuestion(level: WhoSaidLevel): Promise<WhoSaidQuestion | null> {
  const { people, items } = snapshot;
  const pool = items.filter((it) => it.level === level);
  if (!pool.length) return null;
  const item = pick(pool);

  const label = ([s, a]: Pair) => `${people[s]} אל ${people[a]}`;
  const answer = label([item.speaker, item.addressee]);
  const options = shuffle([answer, ...distractors(item, items, level).map(label)]);

  const verse = await prisma.verseText.findUnique({
    where: { book_chapter_verse: { book: item.book, chapter: item.chapter, verse: item.verse } },
    select: { text: true },
  });
  const bookHe = TANAKH_BOOKS.find((b) => b.id === item.book)?.he ?? item.book;

  return {
    book: item.book,
    chapter: item.chapter,
    verse: item.verse,
    reference: `${bookHe} ${toHebrewNumeral(item.chapter)}, ${toHebrewNumeral(item.verse)}`,
    quote: item.quote,
    // Meteg survives in VerseText.text; drop it for display
    verseText: verse?.text.replace(/ֽ/g, "") ?? "",
    options,
    answerIndex: options.indexOf(answer),
  };
}
