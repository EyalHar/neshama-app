"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import type { FeedItem } from "@/lib/shares";
import ShareCard from "./ShareCard";

type Filter = "all" | "mine" | "liked";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "כל השיתופים" },
  { id: "mine", label: "השיתופים שלי" },
  { id: "liked", label: "מה שאהבתי" },
];

async function requestFeed(filter: Filter, book: string, cursor: string | null) {
  const params = new URLSearchParams({ filter });
  if (book) params.set("book", book);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/shares?${params}`);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as { items: FeedItem[]; nextCursor: string | null };
}

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [book, setBook] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // State is only set in the promise callbacks, so this is safe to start from an effect
  const load = useCallback((f: Filter, b: string) => {
    requestFeed(f, b, null)
      .then((d) => { setItems(d.items); setNextCursor(d.nextCursor); }, () => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session) load("all", "");
  }, [session, load]);

  function changeView(f: Filter, b: string) {
    setFilter(f);
    setBook(b);
    setLoading(true);
    setError(false);
    load(f, b);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const d = await requestFeed(filter, book, nextCursor);
      setItems((prev) => [...prev, ...d.items]);
      setNextCursor(d.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">שיתופים</h1>
      <p className="text-stone-500 text-sm mb-6">הערות וחידושים על פסוקים, ששיתפו משתמשי האתר</p>

      {status !== "loading" && !session && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <p className="text-stone-600 mb-2">דף השיתופים פתוח למשתמשים מחוברים</p>
          <Link href="/login" className="text-amber-600 hover:underline">התחבר</Link>
        </div>
      )}

      {session && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
            <div className="inline-flex bg-stone-100 rounded-xl p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => changeView(f.id, book)}
                  aria-pressed={filter === f.id}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filter === f.id ? "bg-white text-amber-800 font-medium shadow-sm" : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={book}
              onChange={(e) => changeView(filter, e.target.value)}
              className="text-sm rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-stone-600 focus:outline-none focus:border-amber-400"
              aria-label="סינון לפי ספר"
            >
              <option value="">כל הספרים</option>
              {TANAKH_BOOKS.map((b) => (
                <option key={b.id} value={b.id}>{b.he}</option>
              ))}
            </select>
          </div>

          {loading && <p className="text-center text-stone-400 py-16">טוען שיתופים...</p>}
          {error && <p className="text-center text-red-500 py-6">טעינת השיתופים נכשלה, נסה לרענן את הדף</p>}

          {!loading && !error && items.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-500">
              {filter === "mine" ? (
                <>
                  עוד לא שיתפת. כדי לשתף, כתוב הערה או חידוש על פסוק ב
                  <Link href="/tanakh" className="text-amber-600 hover:underline">קורא</Link> ולחץ &quot;שתף&quot;.
                </>
              ) : filter === "liked" ? (
                "עוד לא סימנת לייק על שיתוף"
              ) : (
                "אין עדיין שיתופים כאן"
              )}
            </div>
          )}

          <div className="space-y-4">
            {items.map((item) => (
              <ShareCard key={item.id} item={item} onRemoved={(id) => setItems((prev) => prev.filter((i) => i.id !== id))} />
            ))}
          </div>

          {nextCursor && !loading && (
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-amber-700 border border-amber-300 hover:bg-amber-50 disabled:opacity-50 px-5 py-2 rounded-lg transition-colors"
              >
                {loadingMore ? "טוען..." : "טען עוד"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
