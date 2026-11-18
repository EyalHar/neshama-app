"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";
import type { LeitwordResult, LeitwordSearchResponse, LeitwordTerm, LeitwordUnitMode } from "@/lib/leitwordSearch";

// A color per typed word, used for its chip and its words in the verses
const TERM_COLORS = [
  "bg-amber-200 text-amber-950",
  "bg-sky-200 text-sky-950",
  "bg-emerald-200 text-emerald-950",
  "bg-rose-200 text-rose-950",
  "bg-violet-200 text-violet-950",
  "bg-lime-200 text-lime-950",
  "bg-orange-200 text-orange-950",
  "bg-teal-200 text-teal-950",
];

const UNIT_OPTIONS: { id: LeitwordUnitMode; label: string }[] = [
  { id: "chapters", label: "פרקים" },
  { id: "divisions", label: "פרשות ופרשיות" },
];

// The reader's own setting (chapters or parashot/parashiyot) is the default
const DIVISION_KEY = "tanakh-division";
const noSubscribe = () => () => {};
const readerUnit = (): LeitwordUnitMode => {
  try {
    return localStorage.getItem(DIVISION_KEY) === "units" ? "divisions" : "chapters";
  } catch {
    return "chapters";
  }
};

type Query = { q: string; unit: LeitwordUnitMode; scope: string; exclude: string[] };

async function request(query: Query, offset: number): Promise<LeitwordSearchResponse> {
  const params = new URLSearchParams({ q: query.q, unit: query.unit, scope: query.scope, offset: String(offset) });
  if (query.exclude.length) params.set("exclude", query.exclude.join(","));
  const res = await fetch(`/api/verses/leitwords?${params}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// "מילים מנחות" tab of /advanced: chapters or parashot/parashiyot where the typed words occur, the
// ones holding more of them, closer together, first
export default function LeitwordSearch({ scope }: { scope: string }) {
  const unitPref = useSyncExternalStore(noSubscribe, readerUnit, (): LeitwordUnitMode => "chapters");
  const [unitChoice, setUnitChoice] = useState<LeitwordUnitMode | null>(null);
  const unit = unitChoice ?? unitPref;
  const [q, setQ] = useState("");
  const [query, setQuery] = useState<Query | null>(null);
  const [terms, setTerms] = useState<LeitwordTerm[]>([]);
  const [results, setResults] = useState<LeitwordResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  function run(next: Query, offset = 0) {
    setLoading(true);
    setError(false);
    request(next, offset)
      .then((data) => {
        setQuery(next);
        setTerms(data.terms);
        setTotal(data.total);
        setResults((prev) => (offset ? [...prev, ...data.results] : data.results));
      }, () => setError(true))
      .finally(() => setLoading(false));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) run({ q: q.trim(), unit, scope, exclude: [] });
  }

  function changeUnit(u: LeitwordUnitMode) {
    setUnitChoice(u);
    if (query) run({ ...query, unit: u });
  }

  function toggleLexeme(number: string) {
    if (!query) return;
    const exclude = query.exclude.includes(number) ? query.exclude.filter((n) => n !== number) : [...query.exclude, number];
    run({ ...query, exclude });
  }

  const searchedTerms = terms.length;
  const stale = query && query.scope !== scope;

  return (
    <div>
      <p className="text-stone-500 text-sm mb-4">
        כתבו כמה מילים, ויוצגו הפרקים או הפרשיות שבהם הן מופיעות, לא בהכרח ברצף. קודם יופיעו המקומות שבהם נמצאו יותר
        מהמילים, ובטווח קצר יותר של פסוקים. כל מילה נחפשת בכל צורותיה (״הלך״ מוצא גם וַיֵּלֶךְ ולָלֶכֶת).
      </p>

      <form onSubmit={submit} className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="למשל: שה עולה ירא"
          className="flex-1 min-w-56 border border-stone-300 rounded-xl px-4 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          dir="rtl"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          חפש
        </button>
      </form>

      <div className="flex items-center gap-2 mb-5 text-sm text-stone-500">
        חלוקה לפי:
        <div className="flex rounded-lg border border-stone-200 overflow-hidden" role="radiogroup" aria-label="חלוקה">
          {UNIT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={unit === o.id}
              onClick={() => changeUnit(o.id)}
              className={`px-3 py-1 transition-colors ${unit === o.id ? "bg-amber-600 text-white" : "bg-white hover:bg-stone-100"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {unit === "divisions" && <span className="text-xs text-stone-400">פרשות בתורה, פרשיות פתוחות וסתומות בשאר הספרים</span>}
      </div>

      {terms.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5">
          {terms.map((t, i) => (
            <div key={t.term} className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md font-medium ${TERM_COLORS[i % TERM_COLORS.length]}`}>{t.term}</span>
              {t.lexemes.length === 0 && <span className="text-xs text-red-500">לא נמצאה בתנ״ך</span>}
              {t.lexemes.map((l) => (
                <button
                  key={l.number}
                  type="button"
                  onClick={() => toggleLexeme(l.number)}
                  title={l.excluded ? "לחצו כדי לכלול את המילה הזו" : "לחצו כדי לא לחפש את המילה הזו"}
                  className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                    l.excluded ? "border-stone-200 text-stone-300 line-through" : "border-stone-300 text-stone-600 hover:border-stone-400"
                  }`}
                >
                  {l.lemmaHe}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">שגיאה בחיפוש, נסו שוב</p>}
      {stale && <p className="text-amber-700 text-xs mb-3">טווח החיפוש השתנה. לחצו ״חפש״ כדי לעדכן את התוצאות.</p>}

      {query && !loading && results.length === 0 && !error && (
        <p className="text-stone-500 text-center py-8">
          {searchedTerms > 1 ? "לא נמצא מקום שבו מופיעות לפחות שתיים מהמילים" : "לא נמצאו תוצאות"}
        </p>
      )}

      {results.length > 0 && (
        <p className="text-stone-500 text-sm mb-3">
          {total.toLocaleString("he-IL")} {query?.unit === "divisions" ? "פרשות ופרשיות" : "פרקים"}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {results.map((r) => (
          <ResultCard key={`${r.book}|${r.label}|${r.range}`} result={r} termCount={searchedTerms} terms={terms} />
        ))}
      </div>

      {results.length < total && (
        <button
          type="button"
          onClick={() => query && run(query, results.length)}
          disabled={loading}
          className="mt-4 w-full border-2 border-amber-600 text-amber-700 hover:bg-amber-50 font-medium py-2.5 rounded-xl transition-colors"
        >
          {loading ? "טוען..." : `הצג עוד (${(total - results.length).toLocaleString("he-IL")})`}
        </button>
      )}
    </div>
  );
}

function ResultCard({ result: r, termCount, terms }: { result: LeitwordResult; termCount: number; terms: LeitwordTerm[] }) {
  const href = `/tanakh?book=${encodeURIComponent(r.book)}&chapter=${r.link.chapter}&verse=${r.link.verse}`;
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <Link href={href} className="font-semibold text-amber-800 hover:underline">
          {r.label}
          {r.range && <span className="text-stone-400 font-normal text-sm"> · {r.range}</span>}
        </Link>
        <div className="flex items-center gap-1">
          {terms.map((t, i) => (
            <span
              key={t.term}
              title={t.term}
              className={`w-2.5 h-2.5 rounded-full ${r.found.includes(i) ? TERM_COLORS[i % TERM_COLORS.length].split(" ")[0] : "bg-stone-200"}`}
            />
          ))}
          <span className="text-xs text-stone-500 ms-1">
            {r.found.length} מתוך {termCount}
          </span>
        </div>
      </div>

      <p className="text-xs text-stone-500 mb-2">
        {r.span === 1 ? "בפסוק אחד" : `בטווח של ${r.span} פסוקים`}: {r.windowRange}
        <span className="text-stone-300"> · </span>
        {r.occurrences} מופעים בסך הכול
      </p>

      <div className="flex flex-col gap-1.5">
        {r.verses.map((v) => (
          <p
            key={`${v.chapter}:${v.verse}`}
            data-collect-source={`${r.bookHe} ${toHebrewNumeral(v.chapter)}, ${toHebrewNumeral(v.verse)}`}
            data-collect-href={`/tanakh?book=${encodeURIComponent(r.book)}&chapter=${v.chapter}&verse=${v.verse}`}
            className="text-stone-700 leading-loose"
          >
            <span data-collect-skip className="text-amber-600 text-xs font-medium ms-1">
              {toHebrewNumeral(v.chapter)}:{toHebrewNumeral(v.verse)}
            </span>{" "}
            {v.words.map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                {v.marks[i] === null ? w : <mark className={`rounded px-0.5 ${TERM_COLORS[v.marks[i]! % TERM_COLORS.length]}`}>{w}</mark>}
              </span>
            ))}
          </p>
        ))}
        {r.moreVerses > 0 && <p className="text-xs text-stone-400">ועוד {r.moreVerses} פסוקים בטווח</p>}
      </div>

      <Link href={href} className="inline-block mt-2 text-sm text-amber-700 hover:underline">
        פתח בקורא ←
      </Link>
    </div>
  );
}
