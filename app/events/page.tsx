"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "events-search-state";

type Source = {
  reference_he: string;
  sefaria_ref: string;
  text: string;
  context: string;
  book: string;
  chapter: number;
  verse: number;
};

type EventResult = {
  event_title: string;
  event_summary: string;
  sources: Source[];
};

export default function EventsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [eventInput, setEventInput] = useState("");
  const [searchedEvent, setSearchedEvent] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMoreResults, setNoMoreResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EventResult | null>(null);
  const [markingSet, setMarkingSet] = useState<Set<number>>(new Set());
  const [markedSet, setMarkedSet] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Restore the last search when returning to this page (e.g. after following a
  // source link to /tanakh and coming back) — so it doesn't have to be re-run.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setEventInput(parsed.eventInput ?? "");
        setSearchedEvent(parsed.searchedEvent ?? "");
        setResult(parsed.result ?? null);
        setNoMoreResults(!!parsed.noMoreResults);
        setMarkedSet(new Set(parsed.marked ?? []));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist after restoring, so "חיפוש חדש" (which clears this same state) also
  // clears the saved copy — one reset button, no separate storage to manage.
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        eventInput, searchedEvent, result, noMoreResults, marked: [...markedSet],
      }));
    } catch {}
  }, [hydrated, eventInput, searchedEvent, result, noMoreResults, markedSet]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!eventInput.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMarkedSet(new Set());
    setNoMoreResults(false);
    setSearchedEvent(eventInput.trim());

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: eventInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setResult(data);
      if (!data.sources || data.sources.length === 0) setNoMoreResults(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה, נסה שוב");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (!result || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: searchedEvent, exclude: result.sources.map((s) => s.sefaria_ref) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      if (!data.sources || data.sources.length === 0) {
        setNoMoreResults(true);
      } else {
        setResult((prev) => prev && { ...prev, sources: [...prev.sources, ...data.sources] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה, נסה שוב");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setEventInput("");
    setSearchedEvent("");
    setNoMoreResults(false);
    setMarkedSet(new Set());
  }

  async function handleMarkPassage(source: Source, index: number) {
    if (markingSet.has(index) || markedSet.has(index)) return;
    setMarkingSet((prev) => new Set([...prev, index]));
    try {
      await fetch("/api/tanakh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: source.book, chapter: source.chapter, verse: source.verse, totalVerses: 0 }),
      });
      setMarkedSet((prev) => new Set([...prev, index]));
      window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
    } finally {
      setMarkingSet((prev) => { const s = new Set(prev); s.delete(index); return s; });
    }
  }

  function navigateToChapter(book: string, chapter: number, verse: number) {
    router.push(`/tanakh?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-rose-50" dir="rtl">
      <div className="max-w-2xl mx-auto px-6 py-14">
        {/* Header */}
        <div className="relative text-center mb-10">
          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="absolute left-0 top-1 text-xs text-stone-400 hover:text-rose-600 hover:underline transition-colors"
            >
              חיפוש חדש
            </button>
          )}
          <div className="text-5xl mb-4">📜</div>
          <h1 className="text-3xl font-bold text-stone-800 mb-3">אירועי התנ״ך</h1>
          <p className="text-stone-500 leading-relaxed">
            הזן שם של אירוע מהתנ״ך וקבל את כל המקורות בהם הוא מוזכר
          </p>
        </div>

        {/* Search form */}
        {!result && (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="bg-white border-2 border-rose-100 rounded-2xl p-6 shadow-sm">
              <label className="block text-sm font-medium text-stone-600 mb-2">
                שם האירוע
              </label>
              <textarea
                value={eventInput}
                onChange={(e) => setEventInput(e.target.value)}
                placeholder="לדוגמה: עליית אליהו השמיימה, מעמד מתן תורה, קריעת ים סוף..."
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-200 p-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-300 text-base leading-relaxed"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !eventInput.trim()}
              className="w-full bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  מחפש מקורות...
                </>
              ) : (
                "חפש מקורות"
              )}
            </button>
          </form>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Event title + summary */}
            <div className="bg-white border-2 border-rose-100 rounded-2xl p-6 shadow-sm text-center">
              <h2 className="text-2xl font-bold text-rose-800 mb-2">{result.event_title}</h2>
              <p className="text-stone-600 leading-relaxed">{result.event_summary}</p>
              <p className="text-stone-400 text-sm mt-3">
                נמצאו {result.sources.length} מקורות
              </p>
            </div>

            {/* Source cards */}
            <div className="space-y-4">
              {result.sources.map((source, i) => {
                const isMarking = markingSet.has(i);
                const isMarked = markedSet.has(i);
                const canMark = !!session && source.book && source.verse > 0;

                return (
                  <div
                    key={i}
                    className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm space-y-3"
                  >
                    {/* Reference */}
                    <div className="flex items-center justify-between">
                      <span className="text-rose-700 font-semibold text-base">
                        {source.reference_he}
                      </span>
                      <span className="text-stone-400 text-xs">מקור {i + 1}</span>
                    </div>

                    {/* Verse text */}
                    <p className="text-stone-800 text-lg leading-loose font-medium border-r-2 border-rose-200 pr-3">
                      {source.text}
                    </p>

                    {/* Context */}
                    <p className="text-stone-500 text-sm leading-relaxed">{source.context}</p>

                    {/* Action buttons */}
                    {source.book && source.chapter > 0 && (
                      <div className="flex gap-2 pt-1 flex-wrap">
                        {canMark && (
                          <button
                            onClick={() => handleMarkPassage(source, i)}
                            disabled={isMarking || isMarked}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              isMarked
                                ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                                : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50"
                            }`}
                          >
                            {isMarking ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : isMarked ? (
                              "✓ קטע סומן כהושלם"
                            ) : (
                              "סמן קטע זה כהושלם"
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => navigateToChapter(source.book, source.chapter, source.verse)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors"
                        >
                          עבור לפרק ←
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!session && (
              <p className="text-center text-stone-400 text-sm">
                <a href="/login" className="text-rose-600 hover:underline">התחבר</a> כדי לסמן קטעים שנקראו
              </p>
            )}

            {/* Load more */}
            {!noMoreResults && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-medium py-3 rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    מחפש עוד מקורות...
                  </>
                ) : (
                  "חפש עוד..."
                )}
              </button>
            )}

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full border border-stone-300 hover:border-rose-300 text-stone-600 hover:text-rose-700 font-medium py-3 rounded-xl transition-colors"
            >
              חיפוש חדש
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
