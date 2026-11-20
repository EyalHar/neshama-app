"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { BOTH_SHARE, SYNONYMS, WITHIN_P, type SynonymBook, type SynonymPair } from "@/lib/synonyms";

// Word A is always blue and word B orange (the first two validated categorical slots), on every chart
const COLOR_A = "#2a78d6";
const COLOR_B = "#eb6834";
// Chapter cells: a diverging scale between the two words, gray in the middle (both about equally)
const SCALE = [
  { upTo: 0.2, color: COLOR_B, label: "בעיקר ב" },
  { upTo: 0.4, color: "#f5a582", label: "" },
  { upTo: 0.6, color: "#d6d3ca", label: "שתיהן" },
  { upTo: 0.8, color: "#86b6ef", label: "" },
  { upTo: 1.01, color: COLOR_A, label: "בעיקר א" },
];
const cellColor = (shareA: number) => SCALE.find((s) => shareA < s.upTo)!.color;
// The two saturated ends take white numbers; the pale steps take dark ones
const cellInk = (shareA: number) => (shareA < 0.2 || shareA >= 0.8 ? "text-white" : "text-stone-800");

const BOOK = new Map(TANAKH_BOOKS.map((b) => [b.id, b]));
const SECTIONS = ["תורה", "נביאים", "כתובים"] as const;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const sum = (b: SynonymBook) => b.a + b.b;

function defaultBook(pair: SynonymPair): string {
  const both = pair.books.filter((b) => b.a && b.b).sort((x, y) => sum(y) - sum(x));
  return (both[0] ?? [...pair.books].sort((x, y) => sum(y) - sum(x))[0]).book;
}

export default function SynonymsView({ initialPair, initialBook }: { initialPair: string; initialBook: string | null }) {
  const [pairId, setPairId] = useState(initialPair);
  const pair = SYNONYMS.pairs.find((p) => p.id === pairId)!;
  const [bookChoice, setBookChoice] = useState<{ pair: string; book: string } | null>(initialBook ? { pair: initialPair, book: initialBook } : null);
  const book = bookChoice?.pair === pairId && pair.books.some((b) => b.book === bookChoice.book) ? bookChoice.book : defaultBook(pair);

  function remember(p: string, b: string | null) {
    const url = new URL(window.location.href);
    url.searchParams.set("pair", p);
    if (b) url.searchParams.set("book", b);
    else url.searchParams.delete("book");
    window.history.replaceState(null, "", url);
  }
  const selectPair = (id: string) => {
    setPairId(id);
    setBookChoice(null);
    remember(id, null);
  };
  const selectBook = (b: string) => {
    setBookChoice({ pair: pairId, book: b });
    remember(pairId, b);
  };

  return (
    <>
      <nav className="flex flex-wrap gap-1.5 mb-6" aria-label="זוגות">
        {SYNONYMS.pairs.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPair(p.id)}
            aria-pressed={p.id === pairId}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${p.id === pairId ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-amber-100"}`}
          >
            {p.a.label} / {p.b.label}
          </button>
        ))}
      </nav>

      <Summary pair={pair} />
      <ByBook pair={pair} selected={book} onSelect={selectBook} />
      <ByChapter pair={pair} book={pair.books.find((b) => b.book === book)!} />
      <Examples key={pair.id + book} pair={pair} book={pair.books.find((b) => b.book === book)!} />

      <details className="text-xs text-stone-500 leading-relaxed mt-8">
        <summary className="cursor-pointer text-stone-600">איך זה חושב</summary>
        <ul className="list-disc ps-5 mt-2 flex flex-col gap-1">
          <li>הספירה לפי נתוני OSHB, מילים עבריות בלבד (הארמית בדניאל ובעזרא אינה נספרת). כל מילה מזוהה לפי הערך שלה במילון Strong&apos;s, בכל הצורות.</li>
          <li>החלק של כל מילה בספר מוצג עם טווח של 95% (Wilson): בספר עם מעט מופעים הטווח רחב. ספרים עם פחות מ־{SYNONYMS.minBook} מופעים מוצגים חיוורים.</li>
          <li>
            ״ההבדל בין הספרים״ נמדד ב־Cramér&apos;s V על טבלת הספרים, ומושווה לאותה טבלה כשהמילים מחולקות באקראי ({SYNONYMS.runs} ערבובים).
            כך מספרים קטנים אינם מנפחים את התוצאה.
          </li>
          <li>
            ״התקבצות בפרקים״ נבדקת באותה דרך על פרקי הספר, רק בספרים עם {SYNONYMS.minWithin} מופעים לפחות ושתי המילים, ומסומנת רק אם
            p &lt; {WITHIN_P}.
          </li>
        </ul>
      </details>
    </>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block w-3 h-3 rounded-sm align-middle" style={{ background: color }} aria-hidden />;
}

function Summary({ pair }: { pair: SynonymPair }) {
  const ratio = pair.between ? pair.between.v / pair.between.chance : 0;
  const betweenText =
    !pair.between ? "אין מספיק נתונים כדי להשוות בין ספרים." : ratio >= 2 ? "הספרים נבדלים זה מזה מאוד בבחירה בין המילים." : ratio >= 1.3 ? "הספרים נבדלים זה מזה בבחירה בין המילים." : "ההבדלים בין הספרים קרובים למה שהיה יוצא במקרה.";
  const clustered = pair.within.filter((w) => w.p < WITHIN_P).map((w) => BOOK.get(w.book)?.he ?? w.book);
  return (
    <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm mb-6">
      <h2 className="text-2xl font-bold text-stone-800 mb-1 flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5"><Swatch color={COLOR_A} />{pair.a.label}</span>
        <span className="text-stone-300 font-normal">/</span>
        <span className="flex items-center gap-1.5"><Swatch color={COLOR_B} />{pair.b.label}</span>
      </h2>
      <p className="text-sm text-stone-500 mb-3">
        {pair.a.label}: <b className="text-stone-700">{pair.total[0].toLocaleString("he-IL")}</b> פעמים · {pair.b.label}:{" "}
        <b className="text-stone-700">{pair.total[1].toLocaleString("he-IL")}</b> פעמים
        {pair.note && <span className="block mt-1">{pair.note}</span>}
      </p>
      <ul className="flex flex-col gap-2 text-stone-700">
        <li>
          <b>בין ספרים:</b> {betweenText}
          {pair.between && (
            <span className="text-xs text-stone-400"> (מדד {pair.between.v.toFixed(2)}, ובחלוקה אקראית {pair.between.chance.toFixed(2)})</span>
          )}
        </li>
        <li>
          <b>שתי המילים באותו ספר:</b> {pair.usesBoth} מתוך {pair.bigBooks} הספרים שבהם הזוג מופיע {SYNONYMS.minBook} פעמים לפחות משתמשים בשתיהן
          (המילה הנדירה בהם {pct(BOTH_SHARE)} לפחות).
        </li>
        <li>
          <b>בתוך ספר:</b>{" "}
          {clustered.length ? <>המילים מתקבצות בפרקים מסוימים ב{clustered.join(", ")}.</> : <>לא נמצאה התקבצות בפרקים באף ספר שנבדק.</>}
        </li>
      </ul>
    </section>
  );
}

// One 100% bar per book: word A from the right, word B after a 2px gap, the 95% range of A's share as a whisker
function ByBook({ pair, selected, onSelect }: { pair: SynonymPair; selected: string; onSelect: (book: string) => void }) {
  const [asTable, setAsTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  return (
    <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-6" aria-label="לפי ספר">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-lg font-bold text-stone-800">לפי ספר</h3>
        <button type="button" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable} className="text-sm text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-0.5">
          {asTable ? "הצג כגרף" : "הצג כטבלה"}
        </button>
      </div>
      <p className="text-xs text-stone-500 mb-3">החלק של כל מילה בכל ספר. לחצו על ספר כדי לראות אותו פרק אחר פרק.</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm text-stone-700">
        <span className="flex items-center gap-1.5"><Swatch color={COLOR_A} />{pair.a.label}</span>
        <span className="flex items-center gap-1.5"><Swatch color={COLOR_B} />{pair.b.label}</span>
        <span className="flex items-center gap-1.5 text-stone-500"><span className="w-4 h-0.5 bg-stone-800" aria-hidden />טווח 95%</span>
        <span className="text-stone-400 text-xs">חיוור: פחות מ־{SYNONYMS.minBook} מופעים</span>
      </div>

      {asTable ? (
        <BookTable pair={pair} />
      ) : (
        SECTIONS.map((section) => {
          const rows = pair.books.filter((b) => BOOK.get(b.book)?.section === section);
          if (!rows.length) return null;
          return (
            <div key={section} className="mb-3">
              <p className="text-xs font-semibold text-stone-400 mb-1">{section}</p>
              <ul className="flex flex-col">
                {rows.map((b) => {
                  const n = sum(b), share = b.a / n, small = n < SYNONYMS.minBook, active = b.book === selected;
                  return (
                    <li key={b.book}>
                      <button
                        type="button"
                        onClick={() => onSelect(b.book)}
                        onPointerEnter={() => setHover(b.book)}
                        onPointerLeave={() => setHover(null)}
                        onFocus={() => setHover(b.book)}
                        onBlur={() => setHover(null)}
                        aria-pressed={active}
                        aria-label={`${BOOK.get(b.book)?.he}: ${pair.a.label} ${b.a}, ${pair.b.label} ${b.b}`}
                        className={`relative w-full grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-2 px-1.5 py-1 rounded-md text-start ${active ? "bg-amber-50 ring-1 ring-amber-300" : "hover:bg-stone-50"}`}
                      >
                        <span className={`text-sm truncate ${active ? "font-bold text-amber-900" : "text-stone-700"}`}>{BOOK.get(b.book)?.he}</span>
                        <span className={`relative h-3 flex gap-[2px] ${small ? "opacity-35" : ""}`}>
                          {b.a > 0 && <span className="h-full rounded-s-[3px]" style={{ width: `${share * 100}%`, background: COLOR_A }} />}
                          {b.b > 0 && <span className="h-full rounded-e-[3px] flex-1" style={{ background: COLOR_B }} />}
                          {!small && (
                            <span className="absolute top-1/2 h-0.5 bg-stone-800/80 -translate-y-1/2" style={{ right: `${b.lo * 100}%`, width: `${(b.hi - b.lo) * 100}%` }} aria-hidden />
                          )}
                        </span>
                        <span className="flex items-center justify-end gap-1.5 text-[11px] text-stone-600 tabular-nums">
                          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm" style={{ background: COLOR_A }} aria-hidden />{b.a}</span>
                          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm" style={{ background: COLOR_B }} aria-hidden />{b.b}</span>
                        </span>
                        {hover === b.book && (
                          <span className="absolute left-0 top-full z-10 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg px-3 py-2 text-sm min-w-52 pointer-events-none">
                            <b className="block text-stone-800">{BOOK.get(b.book)?.he}</b>
                            <span className="flex items-center gap-1.5 text-stone-700"><Swatch color={COLOR_A} /><b className="tabular-nums">{pct(share)}</b>{pair.a.label} · {b.a} פעמים</span>
                            <span className="flex items-center gap-1.5 text-stone-700"><Swatch color={COLOR_B} /><b className="tabular-nums">{pct(1 - share)}</b>{pair.b.label} · {b.b} פעמים</span>
                            <span className="block text-xs text-stone-500 mt-0.5">טווח 95% ל{pair.a.label}: <span dir="ltr">{pct(b.lo)}–{pct(b.hi)}</span></span>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

function BookTable({ pair }: { pair: SynonymPair }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-stone-500 border-b border-stone-200">
            <th className="text-start font-medium py-1.5 pe-3">ספר</th>
            <th className="text-start font-medium py-1.5 px-2">{pair.a.label}</th>
            <th className="text-start font-medium py-1.5 px-2">{pair.b.label}</th>
            <th className="text-start font-medium py-1.5 px-2">% {pair.a.label}</th>
            <th className="text-start font-medium py-1.5 px-2">טווח 95%</th>
          </tr>
        </thead>
        <tbody>
          {pair.books.map((b) => (
            <tr key={b.book} className={`border-b border-stone-100 ${sum(b) < SYNONYMS.minBook ? "text-stone-400" : "text-stone-700"}`}>
              <td className="py-1 pe-3">{BOOK.get(b.book)?.he}</td>
              <td className="py-1 px-2 tabular-nums">{b.a}</td>
              <td className="py-1 px-2 tabular-nums">{b.b}</td>
              <td className="py-1 px-2 tabular-nums">{pct(b.a / sum(b))}</td>
              <td className="py-1 px-2 tabular-nums"><span dir="ltr">{pct(b.lo)}–{pct(b.hi)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Every chapter of the chosen book as a cell, colored by which word it uses
function ByChapter({ pair, book }: { pair: SynonymPair; book: SynonymBook }) {
  const info = BOOK.get(book.book);
  const counts = new Map(book.chapters.map(([c, a, b]) => [c, [a, b] as const]));
  const within = pair.within.find((w) => w.book === book.book);
  const [hover, setHover] = useState<number | null>(null);
  const verdict = !within
    ? `לא נבדק: בספר הזה פחות מ־${SYNONYMS.minWithin} מופעים, או רק אחת המילים.`
    : within.p < WITHIN_P
      ? "המילים מתקבצות בפרקים: יש פרקים של מילה אחת ופרקים של האחרת, יותר ממה שהיה יוצא במקרה."
      : "לא נמצאה התקבצות בפרקים: בספר הזה שתי המילים מעורבבות לאורך הפרקים.";
  return (
    <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-6" aria-label="פרק אחר פרק">
      <h3 className="text-lg font-bold text-stone-800 mb-1">פרק אחר פרק: {info?.he}</h3>
      <p className="text-sm text-stone-600 mb-3">{verdict}</p>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-stone-600">
        <span>{pair.b.label}</span>
        {SCALE.map((s) => <span key={s.color} className="w-5 h-3 rounded-sm" style={{ background: s.color }} aria-hidden />)}
        <span>{pair.a.label}</span>
        <span className="flex items-center gap-1 ms-3"><span className="w-3 h-3 rounded-sm border border-dashed border-stone-300" aria-hidden />בלי אף אחת</span>
      </div>
      <div className="relative flex flex-wrap gap-1" dir="rtl">
        {Array.from({ length: info?.chapters ?? 0 }, (_, i) => i + 1).map((c) => {
          const v = counts.get(c);
          const label = v ? `פרק ${toHebrewNumeral(c)}: ${pair.a.label} ${v[0]}, ${pair.b.label} ${v[1]}` : `פרק ${toHebrewNumeral(c)}: אין`;
          return (
            <span
              key={c}
              tabIndex={v ? 0 : -1}
              aria-label={label}
              onPointerEnter={() => setHover(c)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(c)}
              onBlur={() => setHover(null)}
              className={`relative w-7 h-7 rounded-[4px] text-[10px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                v ? cellInk(v[0] / (v[0] + v[1])) : "border border-dashed border-stone-200 text-stone-300"
              }`}
              style={v ? { background: cellColor(v[0] / (v[0] + v[1])) } : undefined}
            >
              {toHebrewNumeral(c)}
              {hover === c && v && (
                <span className="absolute left-0 top-full z-10 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg px-2.5 py-1.5 text-xs whitespace-nowrap text-stone-700 pointer-events-none">
                  {label}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}

type Verse = { chapter: number; verse: number; text: string };

// The same book, both words: the closest pair of verses where each one is used
function Examples({ pair, book }: { pair: SynonymPair; book: SynonymBook }) {
  const ex = book.example;
  const [verses, setVerses] = useState<{ a: Verse; b: Verse } | null>(null);
  useEffect(() => {
    if (!ex) return;
    const one = ([c, v]: number[]) =>
      fetch(`/api/passage-text?book=${encodeURIComponent(book.book)}&from=${c}:${v}&to=${c}:${v}`)
        .then((r) => r.json())
        .then((d: { verses: Verse[] }) => d.verses[0]);
    Promise.all([one(ex.a), one(ex.b)]).then(([a, b]) => setVerses({ a, b }), () => setVerses(null));
  }, [ex, book.book]);
  if (!ex) return null;
  const he = BOOK.get(book.book)?.he ?? book.book;
  return (
    <section className="mb-6" aria-label="אותו ספר, שתי המילים">
      <h3 className="text-lg font-bold text-stone-800 mb-3">אותו ספר, שתי המילים</h3>
      <div className="grid md:grid-cols-2 gap-3">
        {([["a", ex.a, COLOR_A], ["b", ex.b, COLOR_B]] as const).map(([side, place, color]) => {
          const v = verses?.[side];
          const ref = `${he} ${toHebrewNumeral(place[0])}, ${toHebrewNumeral(place[1])}`;
          const href = `/tanakh?book=${encodeURIComponent(book.book)}&chapter=${place[0]}&verse=${place[1]}`;
          return (
            <div key={side} className="bg-white border border-stone-200 rounded-xl p-4 border-t-4" style={{ borderTopColor: color }}>
              <p className="text-sm font-semibold mb-1" style={{ color }}>{side === "a" ? pair.a.label : pair.b.label}</p>
              <p data-collect-source={ref} data-collect-href={href} className="text-stone-800 text-lg leading-loose">
                {!v ? (
                  <span className="text-stone-400 text-sm">טוען...</span>
                ) : (
                  v.text.split(" ").map((w, i) => (
                    <span key={i}>
                      {i > 0 && " "}
                      {i === place[2] ? <mark className="rounded px-0.5 text-stone-900" style={{ background: `${color}33`, boxShadow: `inset 0 -2px 0 ${color}` }}>{w}</mark> : w}
                    </span>
                  ))
                )}
              </p>
              <Link href={href} className="text-xs text-amber-700 hover:underline">{ref} ←</Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
