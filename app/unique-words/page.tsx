"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";

type Section = "תורה" | "נביאים" | "כתובים";
const SECTIONS: Section[] = ["תורה", "נביאים", "כתובים"];

type Result = { book: string; bookHe: string; chapter: number; verse: number; word: string; plain: string };

function NotSeeded() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mt-4">
      <p className="text-amber-700 font-medium mb-1">הנתונים עוד לא נטענו</p>
      <Link href="/admin/seed" className="text-amber-700 underline text-sm">עבור לדף האכלוס</Link>
    </div>
  );
}

export default function UniqueWordsPage() {
  const [section, setSection] = useState<Section>("תורה");
  const [mergeSpelling, setMergeSpelling] = useState(true);
  const [mergeDerived, setMergeDerived] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<Section, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  function applyResult(data: {
    results?: Result[]; total?: number; pages?: number;
    counts?: Record<Section, number>; seeded?: boolean;
  }, controller: AbortController) {
    if (abortRef.current !== controller) return; // superseded by a newer request
    setResults(data.results ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setCounts(data.counts ?? null);
    setSeeded(data.seeded ?? true);
    setLoading(false);
    abortRef.current = null;
  }

  // Initial load on mount — a plain fetch().then() chain (not a named async function
  // call), mirroring the fetch-in-effect pattern already used in letters/unknown-roots,
  // so setState only ever runs inside a promise callback, never synchronously in the
  // effect body itself.
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    fetch(`/api/hapax?section=${encodeURIComponent(section)}&page=1&mergeSpelling=${mergeSpelling ? 1 : 0}&mergeDerived=${mergeDerived ? 1 : 0}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => applyResult(data, controller))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load(sec: Section, p: number, ms: boolean, md: boolean) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    fetch(`/api/hapax?section=${encodeURIComponent(sec)}&page=${p}&mergeSpelling=${ms ? 1 : 0}&mergeDerived=${md ? 1 : 0}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => applyResult(data, controller))
      .catch((err) => {
        if (abortRef.current !== controller) return;
        if (!(err instanceof DOMException && err.name === "AbortError")) setLoading(false);
      });
  }

  function selectSection(s: Section) {
    if (s === section) return;
    setSection(s);
    setPage(1);
    load(s, 1, mergeSpelling, mergeDerived);
  }

  function toggleMergeSpelling(checked: boolean) {
    setMergeSpelling(checked);
    setPage(1);
    load(section, 1, checked, mergeDerived);
  }

  function toggleMergeDerived(checked: boolean) {
    setMergeDerived(checked);
    setPage(1);
    load(section, 1, mergeSpelling, checked);
  }

  function goToPage(p: number) {
    setPage(p);
    load(section, p, mergeSpelling, mergeDerived);
  }

  function cancelLoad() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">מילים יחידאיות בתנ״ך</h1>
      <p className="text-stone-500 text-sm mb-4">
        מילים שמופיעות פעם אחת בלבד בכל התנ״ך (hapax legomena), מחולקות לפי תורה, נביאים וכתובים
      </p>

      {/* Definition toggles */}
      <div className="flex flex-col gap-2 mb-6">
        <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mergeSpelling}
            onChange={(e) => toggleMergeSpelling(e.target.checked)}
            className="w-4 h-4 accent-emerald-700 cursor-pointer"
          />
          הסתר גם מילים שהכתיב שלהן חופף למילה אחרת בתנ״ך (גם אם המשמעות שונה, כמו שם עצם ושם מקום)
        </label>
        <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mergeDerived}
            onChange={(e) => toggleMergeDerived(e.target.checked)}
            className="w-4 h-4 accent-emerald-700 cursor-pointer"
          />
          הסתר גם מילים הנגזרות אטימולוגית ממילה נפוצה (כולל שמות אנשים/מקומות שמקורם בפועל שגור — למשל &quot;יובל&quot; שנגזר מ&quot;לזרום&quot;)
        </label>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => selectSection(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              section === s ? "bg-emerald-700 text-white" : "bg-white border border-stone-200 text-stone-700 hover:border-emerald-400"
            }`}
          >
            {s}
            {counts && ` · ${counts[s].toLocaleString()}`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <svg className="animate-spin h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <button
            type="button"
            onClick={cancelLoad}
            className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
          >
            בטל
          </button>
        </div>
      )}

      {!loading && !seeded && <NotSeeded />}

      {!loading && seeded && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <p className="text-stone-500 text-sm">
              נמצאו {total.toLocaleString()} מילים יחידאיות ב{section}
              {pages > 1 && ` · עמוד ${page} מתוך ${pages}`}
            </p>
            {pages > 1 && (
              <div className="flex gap-2">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                  → הקודם
                </button>
                <span className="px-4 py-2 text-stone-500 text-sm">{page} / {pages}</span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= pages}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                  הבא ←
                </button>
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <p className="text-stone-500 text-center py-6">לא נמצאו מילים יחידאיות ב{section}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((r) => (
                <div
                  key={`${r.book}-${r.chapter}-${r.verse}`}
                  className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-stone-800 mb-1 truncate">{r.word}</p>
                    <p className="text-xs font-medium text-emerald-700">
                      {r.bookHe} {toHebrewNumeral(r.chapter)}&lrm;:{toHebrewNumeral(r.verse)}
                    </p>
                  </div>
                  <Link
                    href={`/tanakh?book=${encodeURIComponent(r.book)}&chapter=${r.chapter}&verse=${r.verse}`}
                    className="shrink-0 text-xs text-emerald-700 hover:text-emerald-900 border border-emerald-300 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    קרא פרק ←
                  </Link>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex gap-2 justify-center mt-6">
              <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                → הקודם
              </button>
              <span className="px-4 py-2 text-stone-500 text-sm">{page} / {pages}</span>
              <button onClick={() => goToPage(page + 1)} disabled={page >= pages}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                הבא ←
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
