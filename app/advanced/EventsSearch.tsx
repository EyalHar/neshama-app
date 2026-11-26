"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import SignInNotice from "@/app/components/SignInNotice";

// "חיפוש לפי אירוע (AI)": a biblical event → its source verses, from POST /api/events (Groq).
// Unlike the other tabs the answer is suggested by a language model, so the tab says so; every
// verse it returns was resolved on Sefaria, and unresolvable references were dropped by the API.

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

type EventResult = { event_title: string; event_summary: string; sources: Source[] };

const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

export default function EventsSearch() {
  const { data: session, status } = useSession();
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

  // Restore the last search when coming back (e.g. from a verse opened in the reader), so it
  // doesn't have to be run again
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

  // Saved only after restoring, so "חיפוש חדש" (which clears this state) clears the copy too
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ eventInput, searchedEvent, result, noMoreResults, marked: [...markedSet] })
      );
    } catch {}
  }, [hydrated, eventInput, searchedEvent, result, noMoreResults, markedSet]);

  async function ask(event: string, exclude?: string[]): Promise<EventResult> {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exclude ? { event, exclude } : { event }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "שגיאה");
    return data;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const event = eventInput.trim();
    if (!event) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setMarkedSet(new Set());
    setNoMoreResults(false);
    setSearchedEvent(event);
    try {
      const data = await ask(event);
      setResult(data);
      if (!data.sources?.length) setNoMoreResults(true);
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
      const data = await ask(searchedEvent, result.sources.map((s) => s.sefaria_ref));
      if (!data.sources?.length) setNoMoreResults(true);
      else setResult((prev) => prev && { ...prev, sources: [...prev.sources, ...data.sources] });
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
      setMarkingSet((prev) => {
        const s = new Set(prev);
        s.delete(index);
        return s;
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 leading-relaxed">
        <span aria-hidden className="text-base leading-5">✦</span>
        <p>
          כאן התוצאות מוצעות על ידי בינה מלאכותית, לא נמצאות בחיפוש מדויק בטקסט כמו בשאר הלשוניות. כל פסוק נבדק שהוא
          קיים, אבל ייתכן שחסרים מקורות או שהקשר של פסוק לאירוע רופף: כדאי לבדוק בפסוקים עצמם.
        </p>
      </div>

      {!result && (
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <label htmlFor="event-input" className="text-sm font-medium text-stone-600">
            שם האירוע
          </label>
          <textarea
            id="event-input"
            value={eventInput}
            onChange={(e) => setEventInput(e.target.value)}
            placeholder="לדוגמה: עליית אליהו השמיימה, מעמד מתן תורה, קריעת ים סוף..."
            rows={2}
            className="w-full resize-none rounded-xl border border-stone-300 bg-white p-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 text-base leading-relaxed"
          />
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
          {status === "unauthenticated" ? (
            <SignInNotice what="חיפוש לפי אירוע" />
          ) : (
            <button
              type="submit"
              disabled={loading || !eventInput.trim()}
              className="self-start bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner /> מחפש מקורות...
                </>
              ) : (
                "חפש מקורות"
              )}
            </button>
          )}
        </form>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3 bg-white border border-stone-200 rounded-2xl p-5">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-stone-800">{result.event_title}</h2>
              <p className="text-stone-600 leading-relaxed mt-1">{result.event_summary}</p>
              <p className="text-stone-400 text-sm mt-2">נמצאו {result.sources.length} מקורות</p>
            </div>
            <button type="button" onClick={handleReset} className="text-sm text-amber-700 hover:underline shrink-0">
              חיפוש חדש
            </button>
          </div>

          <ol className="flex flex-col gap-3">
            {result.sources.map((source, i) => {
              const isMarking = markingSet.has(i);
              const isMarked = markedSet.has(i);
              const canMark = !!session && !!source.book && source.verse > 0;
              const href = `/tanakh?book=${encodeURIComponent(source.book)}&chapter=${source.chapter}&verse=${source.verse}`;
              return (
                <li key={source.sefaria_ref + i} className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-amber-800 font-semibold">{source.reference_he}</span>
                    <span className="text-stone-400 text-xs">מקור {i + 1}</span>
                  </div>
                  <p
                    data-collect-source={source.reference_he}
                    data-collect-href={source.book ? href : undefined}
                    className="text-stone-800 text-lg leading-loose border-r-2 border-amber-200 pr-3"
                  >
                    {source.text}
                  </p>
                  <p className="text-stone-500 text-sm leading-relaxed">{source.context}</p>
                  {source.book && source.chapter > 0 && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {canMark && (
                        <button
                          type="button"
                          onClick={() => handleMarkPassage(source, i)}
                          disabled={isMarking || isMarked}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isMarked
                              ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                              : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 disabled:opacity-50"
                          }`}
                        >
                          {isMarking ? <Spinner /> : isMarked ? "✓ סומן כנקרא" : "סמן כנקרא"}
                        </button>
                      )}
                      <Link href={href} className="px-3 py-1.5 rounded-lg text-sm bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors">
                        לקורא ←
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

          {!noMoreResults && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="self-center text-sm text-amber-700 border border-amber-300 rounded-lg px-4 py-2 hover:bg-amber-50 disabled:opacity-60 flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Spinner /> מחפש עוד מקורות...
                </>
              ) : (
                "חפש עוד מקורות"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
