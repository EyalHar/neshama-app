import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { PRAYERS_SONGS, WRITTEN_AS_SONG } from "@/lib/prayersSongs";
import { readPsalmTitle } from "@/lib/psalmTitles";
import PageHeader from "@/app/components/PageHeader";
import PrayersBrowser, { type PrayerEntry, type PsalmEntry, type WrittenAsSongEntry } from "./PrayersBrowser";

const BOOKS = new Map(TANAKH_BOOKS.map((b) => [b.id, b]));
const heNum = toHebrewNumeral;

function rangeRef(book: string, from: [number, number], to: [number, number]): string {
  const he = BOOKS.get(book)?.he ?? book;
  if (from[0] === to[0] && from[1] === to[1]) return `${he} ${heNum(from[0])}, ${heNum(from[1])}`;
  if (from[0] === to[0]) return `${he} ${heNum(from[0])}, ${heNum(from[1])}–${heNum(to[1])}`;
  return `${he} ${heNum(from[0])}, ${heNum(from[1])} – ${heNum(to[0])}, ${heNum(to[1])}`;
}

async function verseRow(book: string, [chapter, verse]: [number, number]) {
  return prisma.verseText.findUnique({
    where: { book_chapter_verse: { book, chapter, verse } },
    select: { text: true, verseIndex: true },
  });
}

const clean = (text: string) => text.replace(/ֽ/g, "");

export default async function PrayersSongsPage() {
  const [entries, written, psalmRows, psalmLengths] = await Promise.all([
    Promise.all(
      PRAYERS_SONGS.map(async (p): Promise<PrayerEntry> => {
        const [first, last] = await Promise.all([verseRow(p.book, p.from), verseRow(p.book, p.to)]);
        const book = BOOKS.get(p.book);
        return {
          ...p,
          bookHe: book?.he ?? p.book,
          section: book?.section ?? "תורה",
          ref: rangeRef(p.book, p.from, p.to),
          opening: first ? clean(first.text) : "",
          verseCount: first && last ? last.verseIndex - first.verseIndex + 1 : 0,
        };
      })
    ),
    Promise.all(
      WRITTEN_AS_SONG.map(async (w): Promise<WrittenAsSongEntry> => {
        const [first, last] = await Promise.all([verseRow(w.book, w.from), verseRow(w.book, w.to)]);
        return { ...w, bookHe: BOOKS.get(w.book)?.he ?? w.book, ref: rangeRef(w.book, w.from, w.to), verseCount: first && last ? last.verseIndex - first.verseIndex + 1 : 0 };
      })
    ),
    prisma.verseText.findMany({ where: { book: "Psalms", verse: 1 }, select: { chapter: true, text: true, plainText: true }, orderBy: { chapter: "asc" } }),
    prisma.verseText.groupBy({ by: ["chapter"], where: { book: "Psalms" }, _count: { _all: true } }),
  ]);

  const lengthOf = new Map(psalmLengths.map((r) => [r.chapter, r._count._all]));
  const psalms: PsalmEntry[] = psalmRows.map((r) => ({
    n: r.chapter,
    ...readPsalmTitle(r.plainText),
    text: clean(r.text),
    verseCount: lengthOf.get(r.chapter) ?? 0,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="תפילות ושירות בתנ״ך" />
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        השירות, התפילות, הקינות והברכות שבתוך סיפורי התנ״ך ונבואותיו, מאז ישיר משה ועד תפילת יונה, וכל מזמורי ספר
        תהלים לפי הכותרות שלהם. כל אחת מהן נפתחת כאן במלואה, עם קישור לקורא.
      </p>
      <PrayersBrowser entries={entries} written={written} psalms={psalms} />
    </div>
  );
}
