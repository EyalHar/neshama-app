"use client";

import { useState } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";

const BINYANIM = [
  { id: "q", label: "קַל (Qal)" },
  { id: "N", label: "נִפְעַל (Niphal)" },
  { id: "p", label: "פִּיעֵל (Piel)" },
  { id: "P", label: "פֻּעַל (Pual)" },
  { id: "h", label: "הִפְעִיל (Hiphil)" },
  { id: "H", label: "הָפְעַל (Hophal)" },
  { id: "t", label: "הִתְפַּעֵל (Hitpael)" },
];

type Result = {
  book: string; bookHe: string; chapter: number; verse: number;
  text: string; forms?: string[];
};

type Tab = "substring" | "root" | "binyan";

function ResultCard({ r, highlight }: { r: Result; highlight?: string }) {
  const text = r.text;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-700 mb-1.5">
            {r.bookHe} {toHebrewNumeral(r.chapter)}&lrm;:{toHebrewNumeral(r.verse)}
          </p>
          <p className="text-stone-700 leading-relaxed">{text}</p>
          {r.forms && r.forms.length > 0 && (
            <p className="text-xs text-stone-400 mt-1">
              צורות: {r.forms.join("، ")}
            </p>
          )}
        </div>
        <Link
          href={`/tanakh?book=${encodeURIComponent(r.book)}&chapter=${r.chapter}`}
          className="shrink-0 text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          קרא פרק ←
        </Link>
      </div>
    </div>
  );
}

function NotSeeded() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mt-4">
      <p className="text-amber-700 font-medium mb-1">הנתונים עוד לא נטענו</p>
      <Link href="/admin/seed" className="text-amber-700 underline text-sm">עבור לדף האכלוס</Link>
    </div>
  );
}

export default function AdvancedPage() {
  const [tab, setTab] = useState<Tab>("substring");
  const [substringQ, setSubstringQ] = useState("");
  const [rootQ, setRootQ] = useState("");
  const [binyanStem, setBinyanStem] = useState("q");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(url: string) {
    setLoading(true);
    setSearched(true);
    setResults([]);
    setTotal(null);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  function handleSubstring(e: React.FormEvent) {
    e.preventDefault();
    if (substringQ.trim().length < 2) return;
    search(`/api/verses/substring?q=${encodeURIComponent(substringQ.trim())}`);
  }

  function handleRoot(e: React.FormEvent) {
    e.preventDefault();
    if (!rootQ.trim()) return;
    search(`/api/verses/root?root=${encodeURIComponent(rootQ.trim())}`);
  }

  function handleBinyan() {
    search(`/api/verses/binyan?stem=${binyanStem}`);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "substring", label: "חיפוש תת-מחרוזת" },
    { id: "root", label: "חיפוש לפי שורש" },
    { id: "binyan", label: "חיפוש לפי בניין" },
  ];

  const isEmpty = searched && !loading && results.length === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">חיפוש מתקדם</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-stone-200 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearched(false); setResults([]); }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
              tab === t.id
                ? "border-amber-600 text-amber-700 bg-amber-50"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Substring */}
      {tab === "substring" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            מוצא כל פסוק שמכיל את הרצף המבוקש — ללא ניקוד
          </p>
          <form onSubmit={handleSubstring} className="flex gap-2 mb-4">
            <input
              type="text"
              value={substringQ}
              onChange={(e) => setSubstringQ(e.target.value)}
              placeholder="לדוגמה: ראשי"
              className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              autoFocus
            />
            <button
              type="submit"
              disabled={substringQ.trim().length < 2 || loading}
              className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              חפש
            </button>
          </form>
        </div>
      )}

      {/* Root */}
      {tab === "root" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            הקלד שורש (ללא ניקוד). המערכת מוצאת את מספר Strong's של השורש ומחזירה את כל צורותיו בתנ״ך.
          </p>
          <form onSubmit={handleRoot} className="flex gap-2 mb-4">
            <input
              type="text"
              value={rootQ}
              onChange={(e) => setRootQ(e.target.value)}
              placeholder="לדוגמה: ברא  אהב  שמר"
              className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              autoFocus
            />
            <button
              type="submit"
              disabled={!rootQ.trim() || loading}
              className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              חפש
            </button>
          </form>
        </div>
      )}

      {/* Binyan */}
      {tab === "binyan" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            מוצא את כל הפסוקים שמכילים פועל בבניין שנבחר.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {BINYANIM.map((b) => (
              <button
                key={b.id}
                onClick={() => setBinyanStem(b.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  binyanStem === b.id
                    ? "bg-amber-700 text-white"
                    : "bg-white border border-stone-200 text-stone-700 hover:border-amber-400"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleBinyan}
            disabled={loading}
            className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            חפש
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <svg className="animate-spin h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        isEmpty ? (
          total === 0 && results.length === 0 && !searched ? null : <NotSeeded />
        ) : (
          <>
            <p className="text-stone-500 text-sm my-4">
              נמצאו {total?.toLocaleString()} פסוקים
              {total !== null && total > results.length ? ` (מציג ${results.length})` : ""}
            </p>
            <div className="space-y-3">
              {results.map((r) => (
                <ResultCard key={`${r.book}-${r.chapter}-${r.verse}`} r={r} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
