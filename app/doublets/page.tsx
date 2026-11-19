import { notFound } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { parallelOf } from "@/lib/parallels";
import { DOUBLETS, VIEW_KINDS, type Range } from "@/lib/doublets";
import type { ShownVerse } from "@/lib/middot";
import { loadVerse } from "@/lib/middotVerses";
import DoubletsView, { type ShownDoublet } from "./DoubletsView";

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));
const NAME_STRONGS = { yhwh: "3068", elohim: "430" };

function rangeRef({ book, from, to }: Range): string {
  const he = BOOK_HE.get(book) ?? book;
  if (from[0] === to[0]) return `${he} ${toHebrewNumeral(from[0])}, ${toHebrewNumeral(from[1])}–${toHebrewNumeral(to[1])}`;
  return `${he} ${toHebrewNumeral(from[0])}, ${toHebrewNumeral(from[1])} – ${toHebrewNumeral(to[0])}, ${toHebrewNumeral(to[1])}`;
}

async function verseIndexOf(book: string, [chapter, verse]: [number, number]) {
  const row = await prisma.verseText.findUnique({ where: { book_chapter_verse: { book, chapter, verse } }, select: { verseIndex: true } });
  return row?.verseIndex ?? null;
}

// How many times each name of God (by Strong's number) occurs in the range
async function nameCounts(range: Range, first: number, last: number) {
  const rows = await prisma.wordEntry.findMany({
    where: { book: range.book, verseIndex: { gte: first, lte: last } },
    select: { lemma: true, morph: true },
  });
  let yhwh = 0, elohim = 0;
  for (const r of rows) {
    const num = parseWord(r.lemma, r.morph)?.num;
    if (num === NAME_STRONGS.yhwh) yhwh++;
    else if (num === NAME_STRONGS.elohim) elohim++;
  }
  return { yhwh, elohim };
}

// Built but hidden for now, at the user's request: no card in /discover, and the URL answers 404
const PUBLISHED = false;

export default async function DoubletsPage() {
  if (!PUBLISHED) notFound();
  const doublets: ShownDoublet[] = await Promise.all(
    DOUBLETS.map(async (d) => {
      const sides = await Promise.all(
        d.sides.map(async (s) => {
          const [first, last] = await Promise.all([verseIndexOf(s.range.book, s.range.from), verseIndexOf(s.range.book, s.range.to)]);
          const verseCount = first !== null && last !== null ? last - first + 1 : 0;
          return {
            ...s,
            bookHe: BOOK_HE.get(s.range.book) ?? s.range.book,
            ref: rangeRef(s.range),
            href: `/tanakh?book=${encodeURIComponent(s.range.book)}&chapter=${s.range.from[0]}&verse=${s.range.from[1]}`,
            verseCount,
            names: d.countNames && first !== null && last !== null ? await nameCounts(s.range, first, last) : null,
          };
        })
      );
      const diffs = await Promise.all(
        d.diffs.map(async (diff) => ({
          aspect: diff.aspect,
          cells: await Promise.all(
            diff.cells.map(async (cell) => (await Promise.all(cell.map((c) => loadVerse(c)))).filter((v): v is ShownVerse => v !== null))
          ),
        }))
      );
      // A word-by-word comparison on /parallels, when one of the cited verse pairs is part of a parallel passage
      let parallelId: number | null = null;
      if (d.sides.length === 2)
        for (const diff of d.diffs) {
          const [a, b] = [diff.cells[0][0], diff.cells[1][0]];
          if (a && b) parallelId ??= parallelOf(a.book, a.chapter, a.verse, b.book, b.chapter, b.verse);
        }
      return { id: d.id, title: d.title, question: d.question, sides, diffs, views: d.views, parallelId };
    })
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="סיפורים כפולים בתורה" />
      <p className="text-stone-600 leading-relaxed mb-4 max-w-3xl">
        יש סיפורים שהתורה מספרת פעמיים, ובכל פעם אחרת: סדר אחר, פרטים אחרים, לפעמים שם אחר לה׳. כאן כל סיפור מוצג בשני
        נוסחיו (או שלושה), ההבדלים ביניהם מודגשים בפסוקים עצמם, ואחריהם האופן שבו גישות שונות מסבירות אותם.
      </p>
      <p className="text-stone-500 text-sm leading-relaxed mb-6 max-w-3xl">
        הדף מציג את הגישות זו לצד זו ואינו מכריע ביניהן. דברי המפרשים מובאים מתוך המקור (בספריא), והפסוקים מתוך הטקסט.
      </p>
      <DoubletsView doublets={doublets} kinds={VIEW_KINDS} />
    </div>
  );
}
