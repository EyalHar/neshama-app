"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";
import {
  LOANWORDS, ORIGIN_LABELS, CERTAINTY_LABELS,
  type LoanOrigin, type Loanword,
} from "@/lib/loanwords";

const ORIGINS: LoanOrigin[] = ["persian", "egyptian", "greek", "babylonian", "foreign"];

const ORIGIN_STYLE: Record<LoanOrigin, string> = {
  persian: "bg-violet-50 text-violet-800 border-violet-200",
  egyptian: "bg-orange-50 text-orange-800 border-orange-200",
  greek: "bg-sky-50 text-sky-800 border-sky-200",
  babylonian: "bg-rose-50 text-rose-800 border-rose-200",
  foreign: "bg-stone-100 text-stone-700 border-stone-200",
};

const NIKUD = /[֑-ׇ]/g;

type Verse = { book: string; bookHe: string; chapter: number; verse: number; wordNums: number[]; text: string };

function VerseLine({ v }: { v: Verse }) {
  const ref = `${v.bookHe} ${toHebrewNumeral(v.chapter)}:${toHebrewNumeral(v.verse)}`;
  const href = `/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`;
  const words = v.text.split(" ");
  return (
    <li className="py-2.5 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-amber-700 mb-0.5">{ref}</p>
        <p data-collect-source={ref} data-collect-href={href} className="text-stone-700 leading-relaxed">
          {words.map((w, i) => (
            <span key={i}>
              {i > 0 && " "}
              {v.wordNums.includes(i + 1) ? <mark className="bg-amber-200/70 text-stone-900 rounded px-0.5">{w}</mark> : w}
            </span>
          ))}
        </p>
      </div>
      <Link href={href} className="shrink-0 text-xs text-amber-700 hover:text-amber-900 mt-5 whitespace-nowrap">
        קרא פרק ←
      </Link>
    </li>
  );
}

function WordCard({ w }: { w: Loanword }) {
  const [open, setOpen] = useState(false);
  const [verses, setVerses] = useState<{ total: number; verses: Verse[] } | null>(null);
  const [error, setError] = useState(false);

  function toggle() {
    setOpen(!open);
    if (verses || open) return;
    setError(false);
    fetch(`/api/loanwords/verses?strongs=${w.strongs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setVerses)
      .catch(() => setError(true));
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-colors ${open ? "border-amber-300 sm:col-span-2" : "border-stone-200"}`}>
      <button type="button" onClick={toggle} className="w-full text-right p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className="text-2xl font-bold text-stone-800">{w.lemma}</span>
            <span className="text-xs text-stone-400" dir="ltr">{w.xlit}</span>
          </div>
          <p className="text-sm text-stone-600 mb-2 text-left" dir="ltr">{w.definition}</p>
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className={`border rounded-full px-2 py-0.5 ${ORIGIN_STYLE[w.origin]}`}>
              {CERTAINTY_LABELS[w.certainty] && `${CERTAINTY_LABELS[w.certainty]} `}{ORIGIN_LABELS[w.origin]}
            </span>
            {w.aramaic && <span className="border border-stone-200 rounded-full px-2 py-0.5 text-stone-500">בחלק הארמי</span>}
            {w.name && <span className="border border-stone-200 rounded-full px-2 py-0.5 text-stone-500">שם פרטי</span>}
          </div>
        </div>
        <div className="shrink-0 text-center">
          <p className="text-lg font-semibold text-amber-700 leading-none">{w.tokens}</p>
          <p className="text-[11px] text-stone-400 mt-1">{w.tokens === 1 ? "מופע" : "מופעים"}</p>
          <p className="text-stone-400 text-xs mt-2">{open ? "▲" : "▼"}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-4 pb-3">
          {error && <p className="text-sm text-red-600 py-3">טעינת הפסוקים נכשלה</p>}
          {!error && !verses && <p className="text-sm text-stone-400 py-3">טוען פסוקים…</p>}
          {verses && (
            <>
              <p className="text-[11px] text-stone-400 mt-2 text-left" dir="ltr" title="Strong's derivation">
                {w.strongs} · {w.derivation}
              </p>
              <ul className="divide-y divide-stone-100">
                {verses.verses.map((v) => <VerseLine key={`${v.book}:${v.chapter}:${v.verse}`} v={v} />)}
              </ul>
              {verses.total > verses.verses.length && (
                <p className="text-xs text-stone-400 pt-2">מוצגים {verses.verses.length} מתוך {verses.total} פסוקים</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function LoanwordsBrowser() {
  const [origin, setOrigin] = useState<LoanOrigin | "all">("all");
  const [showNames, setShowNames] = useState(false);
  const [sort, setSort] = useState<"tokens" | "alpha">("tokens");
  const [query, setQuery] = useState("");

  const pool = useMemo(() => LOANWORDS.filter((w) => showNames || !w.name), [showNames]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(ORIGINS.map((o) => [o, 0])) as Record<LoanOrigin, number>;
    for (const w of pool) c[w.origin]++;
    return c;
  }, [pool]);

  const shown = useMemo(() => {
    const q = query.replace(NIKUD, "").trim().toLowerCase();
    const list = pool.filter((w) =>
      (origin === "all" || w.origin === origin) &&
      (!q || w.lemma.replace(NIKUD, "").includes(q) || w.definition.toLowerCase().includes(q)));
    return sort === "tokens"
      ? list
      : [...list].sort((a, b) => a.lemma.replace(NIKUD, "").localeCompare(b.lemma.replace(NIKUD, ""), "he"));
  }, [pool, origin, query, sort]);

  const chip = (active: boolean) =>
    `px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${
      active ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-700 hover:border-amber-400"
    }`;

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        <button type="button" onClick={() => setOrigin("all")} className={chip(origin === "all")}>
          הכול · {pool.length}
        </button>
        {ORIGINS.filter((o) => counts[o] > 0).map((o) => (
          <button key={o} type="button" onClick={() => setOrigin(o)} className={chip(origin === o)}>
            {ORIGIN_LABELS[o]} · {counts[o]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-x-5 gap-y-3 flex-wrap mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש מילה או תרגום…"
          className="flex-1 min-w-48 px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-amber-400"
        />
        <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} className="w-4 h-4 accent-amber-700" />
          כולל שמות פרטיים
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "tokens" | "alpha")}
          className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-700"
        >
          <option value="tokens">לפי שכיחות</option>
          <option value="alpha">לפי א״ב</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="text-stone-500 text-center py-8">לא נמצאו מילים</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shown.map((w) => <WordCard key={w.strongs} w={w} />)}
        </div>
      )}
    </>
  );
}
