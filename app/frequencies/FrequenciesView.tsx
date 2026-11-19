"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Segmented from "@/app/quiz/Segmented";
import CompareChart from "./CompareChart";
import { FREQ_TOTAL, FREQ_PAGE, type FreqItem, type FreqKind, type FreqList, type FreqOccurrences, type FreqScope, type FreqVerse } from "@/lib/frequenciesShared";

type Tab = "words" | "roots";

const SCOPES: { id: FreqScope; label: string }[] = [
  { id: "tanakh", label: "כל התנ״ך" },
  { id: "torah", label: "תורה" },
  { id: "nevi", label: "נביאים" },
  { id: "ketuvim", label: "כתובים" },
];
const WORD_MODES: { id: FreqKind; label: string }[] = [
  { id: "lexeme", label: "לפי ערך מילוני" },
  { id: "form", label: "כפי שנכתבה" },
];
const WORD_MODE_NOTE: Record<string, string> = {
  lexeme: "כל הצורות של אותה מילה נספרות יחד, בלי תחיליות וסיומות: ״וַיֹּאמֶר״, ״אָמְרוּ״ ו״לֵאמֹר״ הן כולן אָמַר.",
  form: "כל צורה כתובה נספרת לבדה, כולל התחיליות: ״וַיֹּאמֶר״ ו״לֵאמֹר״ הן שתי שורות נפרדות.",
};

export default function FrequenciesView({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [scope, setScope] = useState<FreqScope>("tanakh");
  const [mode, setMode] = useState<FreqKind>("lexeme");
  const [contentOnly, setContentOnly] = useState(false);
  const kind: FreqKind = tab === "roots" ? "root" : mode;
  const url = `/api/frequencies?kind=${kind}&scope=${scope}&limit=${FREQ_TOTAL}&content=${contentOnly && tab === "words" ? 1 : 0}`;
  const [state, setState] = useState<{ url: string; data: FreqList | null; error: boolean }>({ url: "", data: null, error: false });

  useEffect(() => {
    let live = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (data: FreqList) => live && setState({ url, data, error: false }),
        () => live && setState({ url, data: null, error: true })
      );
    return () => {
      live = false;
    };
  }, [url]);

  function selectTab(t: Tab) {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }

  const data = state.url === url ? state.data : null;
  const error = state.url === url && state.error;
  const scopeLabel = SCOPES.find((s) => s.id === scope)!.label;

  return (
    <>
      <div className="flex gap-1 sm:gap-2 mb-5 border-b border-stone-200 overflow-x-auto overflow-y-hidden" role="tablist">
        {(["words", "roots"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => selectTab(t)}
            className={`px-4 sm:px-6 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
              tab === t ? "border-amber-600 text-amber-700 bg-amber-50" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t === "words" ? "מילים" : "שורשים"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Segmented options={SCOPES} value={scope} onChange={setScope} />
      </div>
      {tab === "words" ? (
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Segmented options={WORD_MODES} value={mode} onChange={setMode} />
          <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer">
            <input type="checkbox" checked={contentOnly} onChange={(e) => setContentOnly(e.target.checked)} className="accent-amber-600" />
            רק שמות עצם, פעלים ותארים
          </label>
        </div>
      ) : null}
      <p className="text-xs text-stone-400 mb-5 leading-relaxed">
        {tab === "words"
          ? WORD_MODE_NOTE[mode]
          : "שורשי הפעלים: כל צורות הפועל של השורש בכל הבניינים נספרות יחד (כמו בלשונית ״שורשים לפי אותיות״). שמות עצם שנגזרו מהשורש אינם נספרים כאן."}
      </p>

      <CompareChart kind={kind} contentOnly={contentOnly && tab === "words"} what={tab === "roots" ? "השורשים השכיחים" : "המילים השכיחות"} />

      {error && <p className="text-red-500 text-sm">שגיאה בטעינה</p>}
      {!data && !error && <p className="text-stone-400 text-sm py-8 text-center">סופר את המילים...</p>}
      {data && (
        <>
          <p className="text-sm text-stone-600 mb-3">
            ב{scopeLabel}: <b>{data.totalWords.toLocaleString("he-IL")}</b> מילים,{" "}
            <b>{data.distinct.toLocaleString("he-IL")}</b> {tab === "roots" ? "שורשים" : mode === "lexeme" ? "ערכים מילוניים" : "צורות"} שונים
            {contentOnly && tab === "words" ? " (מילות תוכן בלבד)" : ""}.
          </p>
          <RankedList key={url} items={data.items} total={data.totalWords} kind={kind} scope={scope} />
        </>
      )}
    </>
  );
}

// The top FREQ_TOTAL, FREQ_PAGE at a time: the next page appears when the end of the list scrolls into view
function RankedList({ items, total, kind, scope }: { items: FreqItem[]; total: number; kind: FreqKind; scope: FreqScope }) {
  const [shown, setShown] = useState(FREQ_PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const more = shown < items.length;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setShown((n) => Math.min(n + FREQ_PAGE, items.length));
    }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [more, items.length]);

  return (
    <>
      <ol className="flex flex-col gap-1.5">
        {items.slice(0, shown).map((item, i) => (
          <FreqRow key={item.key} item={item} rank={i + 1} max={items[0].count} total={total} kind={kind} scope={scope} />
        ))}
      </ol>
      <div ref={sentinel} aria-hidden className="h-px" />
      <p className="text-center text-xs text-stone-400 mt-4">
        {more ? `מוצגים ${shown} מתוך ${items.length}. גללו למטה להמשך.` : `כל ${items.length} הראשונים מוצגים.`}
      </p>
    </>
  );
}

function VerseWithWord({ v }: { v: FreqVerse }) {
  return (
    <div>
      <p data-collect-source={v.ref} data-collect-href={v.href} className="text-stone-800 leading-loose">
        {v.words.map((w, i) => (
          <span key={i}>
            {i > 0 && " "}
            {i === v.at ? <mark className="bg-amber-200/80 text-stone-900 rounded px-0.5 font-semibold">{w}</mark> : w}
          </span>
        ))}
      </p>
      <Link href={v.href} className="text-xs text-amber-700 hover:underline">{v.ref} ←</Link>
    </div>
  );
}

function FreqRow({ item, rank, max, total, kind, scope }: { item: FreqItem; rank: number; max: number; total: number; kind: FreqKind; scope: FreqScope }) {
  const [open, setOpen] = useState(false);
  const share = (item.count / total) * 100;
  return (
    <li className="bg-white border border-stone-200 rounded-xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full text-start px-3 sm:px-4 py-2.5 hover:bg-stone-50 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-center text-sm text-stone-400 tabular-nums">{rank}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-bold text-stone-800">{item.label}</span>
              {item.pos && <span className="text-[11px] rounded bg-stone-100 text-stone-500 px-1.5 py-0.5">{item.pos}</span>}
              {item.sub && <span className="text-xs text-stone-400 truncate max-w-full" dir="auto">{item.sub}</span>}
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-end">
            <div className="font-semibold text-stone-800 tabular-nums">{item.count.toLocaleString("he-IL")}</div>
            <div className="text-[11px] text-stone-400 tabular-nums">{share >= 0.1 ? share.toFixed(1) : share.toFixed(2)}%</div>
          </div>
        </div>
        <p className="text-xs text-stone-500 mt-1 ms-11">לראשונה: {item.first.ref}</p>
      </button>
      {open && <Occurrences item={item} kind={kind} scope={scope} />}
    </li>
  );
}

// The first occurrence, then the rest ten at a time
function Occurrences({ item, kind, scope }: { item: FreqItem; kind: FreqKind; scope: FreqScope }) {
  const [verses, setVerses] = useState<FreqVerse[]>([]);
  const [next, setNext] = useState<number | null>(1);
  const [total, setTotal] = useState(item.count);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  function more() {
    if (next === null) return;
    setLoading(true);
    setError(false);
    fetch(`/api/frequencies/occurrences?kind=${kind}&key=${encodeURIComponent(item.key)}&scope=${scope}&offset=${next}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (page: FreqOccurrences) => {
          setVerses((v) => [...v, ...page.verses]);
          setNext(page.next);
          setTotal(page.total);
        },
        () => setError(true)
      )
      .finally(() => setLoading(false));
  }

  return (
    <div className="px-4 pb-3 border-t border-stone-100 pt-3 flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-amber-800 mb-0.5">הפעם הראשונה</p>
        <VerseWithWord v={item.first} />
      </div>
      {verses.map((v, i) => <VerseWithWord key={v.ref + i} v={v} />)}
      {error && <p className="text-red-500 text-sm">שגיאה בטעינה</p>}
      <div className="flex flex-wrap items-center gap-3">
        {next !== null && total > 1 && (
          <button type="button" onClick={more} disabled={loading} className="text-sm text-amber-700 border border-amber-300 rounded-lg px-3 py-1 hover:bg-amber-50 disabled:opacity-60">
            {loading ? "טוען..." : `${verses.length ? "עוד" : "מופעים נוספים"} (${(total - 1 - verses.length).toLocaleString("he-IL")} נותרו)`}
          </button>
        )}
        {item.searchHref && (
          <Link href={item.searchHref} className="text-sm text-amber-700 hover:underline">
            כל המופעים בחיפוש לפי שורש ←
          </Link>
        )}
      </div>
    </div>
  );
}
