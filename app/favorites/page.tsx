"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toHebrewNumeral } from "@/lib/tanakh";
import HeartIcon from "@/app/components/HeartIcon";

type FavoriteChapterItem = { book: string; bookHe: string; chapter: number };
type FavoriteVerseItem = { book: string; bookHe: string; chapter: number; verse: number; text: string };

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const [chapters, setChapters] = useState<FavoriteChapterItem[]>([]);
  const [verses, setVerses] = useState<FavoriteVerseItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const loading = status === "loading" || (!!session && fetching);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => {
        setChapters(d.chapters ?? []);
        setVerses(d.verses ?? []);
      })
      .finally(() => setFetching(false));
  }, [session]);

  async function removeChapter(item: FavoriteChapterItem) {
    setChapters((prev) => prev.filter((c) => !(c.book === item.book && c.chapter === item.chapter)));
    await fetch("/api/favorites/chapter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book: item.book, chapter: item.chapter }),
    });
  }

  async function removeVerse(item: FavoriteVerseItem) {
    setVerses((prev) => prev.filter((v) => !(v.book === item.book && v.chapter === item.chapter && v.verse === item.verse)));
    await fetch("/api/favorites/verse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book: item.book, chapter: item.chapter, verse: item.verse }),
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center gap-2 mb-1">
        <HeartIcon filled size={24} />
        <h1 className="text-2xl font-bold text-stone-800">המועדפים שלי</h1>
      </div>
      <p className="text-stone-400 text-sm mb-6">פרקים ופסוקים ששמרת — כל המועדפים שלך במקום אחד</p>

      {status !== "loading" && !session && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <p className="text-stone-600 mb-2">כדי לשמור ולצפות במועדפים יש להתחבר</p>
          <a href="/login" className="text-amber-600 hover:underline">התחבר</a>
        </div>
      )}

      {session && loading && (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {session && !loading && (
        <div className="space-y-10">
          {/* Favorite chapters */}
          <section>
            <h2 className="text-lg font-bold text-stone-700 mb-3">פרקים מועדפים</h2>
            {chapters.length === 0 ? (
              <p className="text-stone-400 text-sm">
                עדיין אין לך פרקים מועדפים — לחץ על סמל הלב ליד כותרת הפרק בדף{" "}
                <Link href="/tanakh" className="text-amber-600 hover:underline">קריאת תנ״ך</Link> כדי להוסיף.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {chapters.map((c) => (
                  <div
                    key={`${c.book}-${c.chapter}`}
                    className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl pr-3 pl-1.5 py-1.5 shadow-sm"
                  >
                    <Link
                      href={`/tanakh?book=${encodeURIComponent(c.book)}&chapter=${c.chapter}`}
                      className="text-sm font-medium text-stone-700 hover:text-amber-700 transition-colors"
                    >
                      {c.bookHe} פרק {toHebrewNumeral(c.chapter)}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeChapter(c)}
                      title="הסר מהמועדפים"
                      className="p-1 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <HeartIcon filled size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Favorite verses */}
          <section>
            <h2 className="text-lg font-bold text-stone-700 mb-3">פסוקים מועדפים</h2>
            {verses.length === 0 ? (
              <p className="text-stone-400 text-sm">
                עדיין אין לך פסוקים מועדפים — עבור עם העכבר על פסוק בדף{" "}
                <Link href="/tanakh" className="text-amber-600 hover:underline">קריאת תנ״ך</Link> ולחץ על סמל הלב כדי להוסיף.
              </p>
            ) : (
              <div className="space-y-3">
                {verses.map((v) => (
                  <div key={`${v.book}-${v.chapter}-${v.verse}`} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-700 mb-1.5">
                          {v.bookHe} {toHebrewNumeral(v.chapter)}&lrm;:{toHebrewNumeral(v.verse)}
                        </p>
                        <p className="text-stone-700 leading-relaxed">{v.text}</p>
                      </div>
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => removeVerse(v)}
                          title="הסר מהמועדפים"
                          className="p-1 rounded-full hover:bg-red-50 transition-colors"
                        >
                          <HeartIcon filled size={18} />
                        </button>
                        <Link
                          href={`/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}`}
                          className="text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          קרא פרק ←
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
