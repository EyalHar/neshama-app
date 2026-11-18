import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { DIVINE_NAME_GROUPS, DIVINE_NAMES, findMatch, type DivineName } from "@/lib/divineNames";
import PageHeader from "@/app/components/PageHeader";

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));

type ShownVerse = { book: string; chapter: number; verse: number; words: string[]; marked: number[] };
type Shown = DivineName & { shownVerses: ShownVerse[]; total: number | null };

// Verses whose words contain the phrase (prefixes allowed), counted over the whole Tanakh
async function phraseCounter() {
  const rows = await prisma.verseText.findMany({ select: { plainText: true } });
  const words = rows.map((r) => r.plainText.split(" "));
  return (phrase: string) => words.filter((w) => findMatch(w, phrase).length > 0).length;
}

// Distinct verses holding a word of one of these Strong's numbers
async function strongsCount(numbers: string[]): Promise<number> {
  const verses = new Set<number>();
  for (const s of numbers) {
    const num = s.replace(/^H/, "");
    const rows = await prisma.wordEntry.findMany({ where: { lemma: { contains: num } }, select: { verseIndex: true, lemma: true, morph: true } });
    for (const r of rows) if (parseWord(r.lemma, r.morph)?.num === num) verses.add(r.verseIndex);
  }
  return verses.size;
}

async function load(name: DivineName, countPhrase: (p: string) => number): Promise<Shown> {
  const shownVerses = await Promise.all(
    name.verses.map(async (v): Promise<ShownVerse> => {
      const row = await prisma.verseText.findUnique({
        where: { book_chapter_verse: { book: v.book, chapter: v.chapter, verse: v.verse } },
        select: { text: true, plainText: true },
      });
      const words = row ? row.text.replace(/ֽ/g, "").split(" ") : [];
      const plain = row ? row.plainText.split(" ") : [];
      // The two are the same OSHB words; if they ever differ, show the verse without marks
      const marked = plain.length === words.length ? findMatch(plain, v.match ?? name.match) : [];
      return { book: v.book, chapter: v.chapter, verse: v.verse, words, marked };
    })
  );
  const total = !name.count ? null : "phrase" in name.count ? countPhrase(name.count.phrase) : await strongsCount(name.count.strongs);
  return { ...name, shownVerses, total };
}

function NameCard({ n }: { n: Shown }) {
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h3 className="text-3xl font-bold text-stone-800">{n.name}</h3>
        <div className="flex items-center gap-2">
          {n.seven && (
            <span
              title="״שבעה שמות הן״, שאסור למחוק אותם (רמב״ם, הלכות יסודי התורה ו, ב)"
              className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
            >
              משבעת השמות שאינם נמחקים
            </span>
          )}
          {n.total !== null && (
            <span className="text-xs text-stone-400" title={n.count && "strongs" in n.count ? n.count.note : undefined}>
              ב-{n.total.toLocaleString("he-IL")} {n.total === 1 ? "פסוק" : "פסוקים"}
              {n.count && "strongs" in n.count && n.count.note ? "*" : ""}
            </span>
          )}
        </div>
      </div>
      <p className="text-stone-600 text-sm leading-relaxed mb-3">{n.about}</p>
      <div className="flex flex-col gap-2">
        {n.shownVerses.map((v) => {
          const ref = `${BOOK_HE.get(v.book)} ${toHebrewNumeral(v.chapter)}, ${toHebrewNumeral(v.verse)}`;
          const href = `/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`;
          return (
            <div key={ref} className="bg-stone-50 rounded-xl px-3 py-2">
              <p data-collect-source={ref} data-collect-href={href} className="text-stone-700 leading-relaxed">
                {v.words.map((w, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    {v.marked.includes(i) ? <mark className="bg-amber-200/70 text-stone-900 rounded px-0.5">{w}</mark> : w}
                  </span>
                ))}
              </p>
              <Link href={href} className="text-xs text-amber-700 hover:underline mt-1 inline-block">{ref} ←</Link>
            </div>
          );
        })}
      </div>
      {n.count && "strongs" in n.count && n.count.note && <p className="text-xs text-stone-400 mt-2">* {n.count.note}</p>}
    </article>
  );
}

export default async function DivineNamesPage() {
  const countPhrase = await phraseCounter();
  const names = await Promise.all(DIVINE_NAMES.map((n) => load(n, countPhrase)));
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="שמות ה׳ בתנ״ך" />
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        השמות והכינויים שבהם התנ״ך קורא לה׳, כל אחד עם הפסוקים שבהם הוא נאמר לראשונה או במקום מרכזי, ומספר הפסוקים שבהם
        הוא מופיע. המספרים מחושבים מהטקסט עצמו: לפי הערך במילון Strong&apos;s, או לפי הצירוף המדויק.
      </p>
      {DIVINE_NAME_GROUPS.map((g) => (
        <section key={g.id} className="mb-10">
          <h2 className="text-xl font-bold text-stone-800 mb-1">{g.title}</h2>
          <p className="text-stone-500 text-sm mb-4">{g.intro}</p>
          <div className="flex flex-col gap-4">
            {names.filter((n) => n.group === g.id).map((n) => <NameCard key={n.id} n={n} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
