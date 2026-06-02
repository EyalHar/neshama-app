"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";

type SearchResult = {
  ref: string;
  bookId: string;
  chapter: number;
  verse: number;
  highlight: string;
};

const SCOPES = [
  { id: "tanakh", label: "כל התנ״ך" },
  { id: "torah", label: "תורה" },
  { id: "nevi", label: "נביאים" },
  { id: "ketuvim", label: "כתובים" },
] as const;

function getBookHe(bookId: string) {
  return TANAKH_BOOKS.find((b) => b.id === bookId)?.he ?? bookId;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("tanakh");
  const [partial, setPartial] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (searched && query.trim()) handleSearch();
  }, [partial]);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&scope=${scope}&partial=${partial}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">חיפוש בתנ״ך</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש מילה או ביטוי..."
          className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          חפש
        </button>
      </form>

      <label className="flex items-center gap-2 mb-4 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={partial}
          onChange={(e) => setPartial(e.target.checked)}
          className="w-4 h-4 accent-amber-600"
        />
        <span className="text-sm text-stone-600">חפש כחלק ממילה</span>
      </label>

      <div className="flex gap-2 mb-6">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              scope === s.id ? "bg-amber-700 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!loading && searched && (
        results.length === 0 ? (
          <p className="text-stone-500 text-center py-8">לא נמצאו תוצאות</p>
        ) : (
          <>
            <p className="text-stone-500 text-sm mb-4">
              נמצאו {total !== null ? total.toLocaleString() : results.length} תוצאות
              {total !== null && total > results.length ? ` (מציג ${results.length})` : ""}
            </p>
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.ref} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-700 mb-1.5">
                        {getBookHe(r.bookId)} {toHebrewNumeral(r.chapter)}&lrm;:{toHebrewNumeral(r.verse)}
                      </p>
                      <p
                        className="text-stone-700 leading-relaxed [&_em]:bg-amber-200 [&_em]:not-italic [&_em]:rounded [&_em]:px-0.5"
                        dangerouslySetInnerHTML={{ __html: r.highlight }}
                      />
                    </div>
                    <Link
                      href={`/tanakh?book=${encodeURIComponent(r.bookId)}&chapter=${r.chapter}`}
                      className="shrink-0 text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      קרא פרק ←
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
