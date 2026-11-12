import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { parseWord } from "@/lib/wordStats";
import { WORD_SHIFTS, type WordShift } from "@/lib/wordShifts";

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));

type Shown = WordShift & {
  lemmaHe: string;
  count: number;
  verse: { book: string; chapter: number; verse: number; text: string; wordNums: number[] } | null;
};

async function load(entry: WordShift): Promise<Shown> {
  const num = entry.strongs.slice(1);
  const [strongs, candidates] = await Promise.all([
    prisma.strongsEntry.findUnique({ where: { number: entry.strongs }, select: { lemmaHe: true } }),
    prisma.wordEntry.findMany({
      where: { lemma: { contains: num } },
      select: { book: true, chapter: true, verse: true, wordNum: true, lemma: true, morph: true },
      orderBy: [{ verseIndex: "asc" }, { wordNum: "asc" }],
    }),
  ]);
  const hits = candidates.filter((w) => parseWord(w.lemma, w.morph)?.num === num);
  const [rb, rc, rv] = entry.ref ?? [];
  const inRef = hits.filter((h) => h.book === rb && h.chapter === rc && h.verse === rv);
  const chosen = inRef.length > 0 ? inRef : hits.slice(0, 1).flatMap((f) => hits.filter((h) => h.book === f.book && h.chapter === f.chapter && h.verse === f.verse));
  const first = chosen[0];
  const text = first
    ? (await prisma.verseText.findUnique({ where: { book_chapter_verse: { book: first.book, chapter: first.chapter, verse: first.verse } }, select: { text: true } }))?.text
    : undefined;
  return {
    ...entry,
    lemmaHe: strongs?.lemmaHe ?? "",
    count: hits.length,
    verse: first && text ? { book: first.book, chapter: first.chapter, verse: first.verse, text, wordNums: chosen.map((c) => c.wordNum) } : null,
  };
}

function ShiftCard({ s }: { s: Shown }) {
  const ref = s.verse && `${BOOK_HE.get(s.verse.book)} ${toHebrewNumeral(s.verse.chapter)}:${toHebrewNumeral(s.verse.verse)}`;
  const href = s.verse && `/tanakh?book=${encodeURIComponent(s.verse.book)}&chapter=${s.verse.chapter}&verse=${s.verse.verse}`;
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex flex-col">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-3xl font-bold text-stone-800">{s.lemmaHe}</h2>
        <span className="text-xs text-stone-400">{s.count} {s.count === 1 ? "מופע" : "מופעים"} בתנ״ך</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm mb-4">
        <dt className="font-semibold text-amber-700">במקרא</dt>
        <dd className="text-stone-700">{s.then}</dd>
        <dt className="font-semibold text-sky-700">היום</dt>
        <dd className="text-stone-700">{s.now}</dd>
      </dl>
      {s.verse && ref && href && (
        <div className="mt-auto bg-stone-50 rounded-xl px-3 py-2">
          <p data-collect-source={ref} data-collect-href={href} className="text-stone-700 leading-relaxed">
            {s.verse.text.split(" ").map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                {s.verse!.wordNums.includes(i + 1) ? <mark className="bg-amber-200/70 text-stone-900 rounded px-0.5">{w}</mark> : w}
              </span>
            ))}
          </p>
          <Link href={href} className="text-xs text-amber-700 hover:underline mt-1 inline-block">{ref} ←</Link>
        </div>
      )}
    </article>
  );
}

export default async function WordShiftsPage() {
  const shifts = await Promise.all(WORD_SHIFTS.map(load));
  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">גלגולי מילים: אז והיום</h1>
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        מילים מקראיות שהמשמעות שלהן בעברית של היום שונה מהמשמעות בתנ״ך. כשהעברית חזרה להיות שפה מדוברת, מילים רבות
        קיבלו תפקיד חדש: החשמל של יחזקאל, המכונות של המקדש והאקדח שהיה אבן חן. זו רשימה נבחרת. המשמעות המקראית מבוססת
        על מילון Strong&apos;s ועל הפסוקים.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((s) => <ShiftCard key={s.strongs} s={s} />)}
      </div>
    </div>
  );
}
