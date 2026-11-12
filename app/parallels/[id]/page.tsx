import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toHebrewNumeral } from "@/lib/tanakh";
import { PARALLELS, bookHe, sideLabel, type ParallelSide } from "@/lib/parallels";
import { diffWords, type DiffWord } from "@/lib/textDiff";

type Verse = { chapter: number; verse: number; text: string };
type Cell = { verse: Verse; words: DiffWord[] } | null;

const cmp = (c1: number, v1: number, c2: number, v2: number) => c1 - c2 || v1 - v2;

async function sideVerses(s: ParallelSide): Promise<Verse[]> {
  const rows = await prisma.verseText.findMany({
    where: { book: s.book, chapter: { gte: s.start[0], lte: s.end[0] } },
    select: { chapter: true, verse: true, text: true },
    orderBy: [{ chapter: "asc" }, { verse: "asc" }],
  });
  return rows.filter((r) => cmp(r.chapter, r.verse, ...s.start) >= 0 && cmp(r.chapter, r.verse, ...s.end) <= 0);
}

const plainCell = (v: Verse): Cell => ({ verse: v, words: v.text.split(" ").map((word) => ({ word, kind: "only" })) });

// Rows of the side-by-side view: matched verses together, a verse with no counterpart alone
function alignRows(a: Verse[], b: Verse[], pairs: [string, string, number][]): [Cell, Cell][] {
  const idx = (vs: Verse[], cv: string) => vs.findIndex((v) => `${v.chapter}:${v.verse}` === cv);
  const rows: [Cell, Cell][] = [];
  let i = 0, j = 0;
  for (const [x, y] of pairs) {
    const ai = idx(a, x), bj = idx(b, y);
    if (ai < i || bj < j) continue;
    for (; i < ai; i++) rows.push([plainCell(a[i]), null]);
    for (; j < bj; j++) rows.push([null, plainCell(b[j])]);
    const d = diffWords(a[ai].text, b[bj].text);
    rows.push([{ verse: a[ai], words: d.a }, { verse: b[bj], words: d.b }]);
    i = ai + 1; j = bj + 1;
  }
  for (; i < a.length; i++) rows.push([plainCell(a[i]), null]);
  for (; j < b.length; j++) rows.push([null, plainCell(b[j])]);
  return rows;
}

const WORD_CLASS: Record<DiffWord["kind"], string> = {
  same: "",
  spelling: "underline decoration-dotted decoration-amber-500 underline-offset-4",
  only: "bg-amber-200/70 rounded px-0.5",
};

function VerseCell({ cell, book }: { cell: Cell; book: string }) {
  if (!cell) return <div className="hidden md:block rounded-xl border border-dashed border-stone-200 bg-stone-50/50" />;
  const { verse, words } = cell;
  const ref = `${bookHe(book)} ${toHebrewNumeral(verse.chapter)}:${toHebrewNumeral(verse.verse)}`;
  const href = `/tanakh?book=${encodeURIComponent(book)}&chapter=${verse.chapter}&verse=${verse.verse}`;
  const unmatched = words.every((w) => w.kind === "only");
  return (
    <div className={`rounded-xl border px-4 py-3 ${unmatched ? "border-dashed border-stone-300 bg-stone-50" : "border-stone-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <Link href={href} className="text-xs font-medium text-amber-700 hover:underline">{ref}</Link>
        {unmatched && <span className="text-[11px] text-stone-400">אין לו מקבילה בנוסח השני</span>}
      </div>
      <p data-collect-source={ref} data-collect-href={href} className={`leading-loose ${unmatched ? "text-stone-500" : "text-stone-800"} text-lg`}>
        {words.map((w, i) => (
          <span key={i}>
            {i > 0 && " "}
            <span className={unmatched ? "" : WORD_CLASS[w.kind]}>{w.word}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

// Links to read each chapter of a side in the reader, the first one opening at the passage's start
function ReadLinks({ side }: { side: ParallelSide }) {
  const chapters = Array.from({ length: side.end[0] - side.start[0] + 1 }, (_, i) => side.start[0] + i);
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-sm">
      <span className="text-stone-500">לקריאה ב{bookHe(side.book)}:</span>
      {chapters.map((c) => (
        <Link
          key={c}
          href={`/tanakh?book=${encodeURIComponent(side.book)}&chapter=${c}&verse=${c === side.start[0] ? side.start[1] : 1}`}
          className="bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg px-2 py-0.5 text-amber-800 transition-colors"
        >
          פרק {toHebrewNumeral(c)}
        </Link>
      ))}
    </div>
  );
}

export default async function ParallelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = PARALLELS.find((x) => x.id === Number(id));
  if (!p) notFound();

  const [a, b] = await Promise.all([sideVerses(p.a), sideVerses(p.b)]);
  const rows = alignRows(a, b, p.pairs);
  const pos = PARALLELS.indexOf(p);
  const prev = PARALLELS[pos - 1], next = PARALLELS[pos + 1];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" dir="rtl">
      <Link href="/parallels" className="text-sm text-stone-500 hover:text-amber-700">→ כל הנוסחים המקבילים</Link>
      <h1 className="text-2xl font-bold text-stone-800 mt-2 mb-3">
        {sideLabel(p.a)} <span className="text-stone-400 font-normal">↔</span> {sideLabel(p.b)}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        <ReadLinks side={p.a} />
        <ReadLinks side={p.b} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-stone-600 mb-6">
        <span><span className="bg-amber-200/70 rounded px-1">מילה</span> שאין בנוסח השני</span>
        <span><span className="underline decoration-dotted decoration-amber-500 underline-offset-4">מילה</span> כתיב שונה (מלא/חסר)</span>
        <span><span className="border border-dashed border-stone-300 rounded px-1 bg-stone-50">פסוק</span> שמופיע רק בנוסח אחד</span>
      </div>

      <div className="hidden md:grid grid-cols-2 gap-3 mb-2 text-sm font-bold text-stone-500">
        <span>{sideLabel(p.a)}</span>
        <span>{sideLabel(p.b)}</span>
      </div>
      <div className="space-y-3">
        {rows.map(([ca, cb], i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <VerseCell cell={ca} book={p.a.book} />
            <VerseCell cell={cb} book={p.b.book} />
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-3 mt-10 text-sm">
        {prev ? <Link href={`/parallels/${prev.id}`} className="text-amber-700 hover:underline">→ {sideLabel(prev.a)}</Link> : <span />}
        {next ? <Link href={`/parallels/${next.id}`} className="text-amber-700 hover:underline">{sideLabel(next.a)} ←</Link> : <span />}
      </div>
    </div>
  );
}
