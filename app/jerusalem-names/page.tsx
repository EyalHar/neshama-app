"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";

type VerseResult = { book: string; bookHe: string; chapter: number; verse: number; text: string };
type NameResult = { id: string; name: string; source: "lemma" | "phrase" | "fixed"; verseCount: number; verses: VerseResult[] };

const PREVIEW_COUNT = 5;

// Hebrew points/cantillation block. If the query itself has no nikud, ignore nikud in
// the (fully-nikud) name when matching — otherwise typing "שלם" would never match "שָׁלֵם".
const hasNikud = (s: string) => /[֑-ׇ]/.test(s);
const stripNikud = (s: string) => s.replace(/[֑-ׇ]/g, "");

function NotSeeded() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mt-4">
      <p className="text-amber-700 font-medium mb-1">הנתונים עוד לא נטענו</p>
      <Link href="/admin/seed" className="text-amber-700 underline text-sm">עבור לדף האכלוס</Link>
    </div>
  );
}

function NameCard({ entry }: { entry: NameResult }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entry.verses : entry.verses.slice(0, PREVIEW_COUNT);
  const liveResolved = entry.source === "lemma" || entry.source === "phrase";

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h3 className="text-xl font-bold text-yellow-800">{entry.name}</h3>
        <span className="text-xs text-stone-500 bg-stone-100 rounded-full px-3 py-1">
          {entry.verseCount} {entry.verseCount === 1 ? "מקור" : "מקורות"}
          {liveResolved && " · כל המופעים בתנ״ך"}
        </span>
      </div>

      {entry.verses.length === 0 ? (
        <p className="text-stone-400 text-sm">לא נמצאו פסוקים (בדוק שהמסד אוכלס במלואו)</p>
      ) : (
        <>
          <div className="space-y-2">
            {shown.map((v) => (
              <div
                key={`${v.book}-${v.chapter}-${v.verse}`}
                className="flex items-start justify-between gap-3 bg-stone-50 rounded-xl p-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-yellow-800 mb-1">
                    {v.bookHe} {toHebrewNumeral(v.chapter)}&lrm;:{toHebrewNumeral(v.verse)}
                  </p>
                  <p className="text-stone-700 leading-relaxed text-sm">{v.text}</p>
                </div>
                <Link
                  href={`/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`}
                  className="shrink-0 text-xs text-yellow-800 hover:text-yellow-900 border border-yellow-300 hover:bg-yellow-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  קרא פרק ←
                </Link>
              </div>
            ))}
          </div>

          {entry.verses.length > PREVIEW_COUNT && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-3 text-sm text-yellow-800 hover:text-yellow-900 underline underline-offset-2 transition-colors"
            >
              {expanded ? "הצג פחות" : `הצג את כל ה-${entry.verseCount}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function JerusalemNamesPage() {
  const [names, setNames] = useState<NameResult[] | null>(null);
  const [seeded, setSeeded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    fetch("/api/jerusalem-names", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (abortRef.current !== controller) return;
        setNames(data.names ?? []);
        setSeeded(data.seeded ?? true);
        setLoading(false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const filtered = (names ?? []).filter((n) => {
    if (!query) return true;
    return hasNikud(query) ? n.name.includes(query) : stripNikud(n.name).includes(query);
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">שמות ירושלים בתנ״ך</h1>
      <p className="text-stone-500 text-sm mb-1">
        מבחר של 29 מתוך שבעים השמות שהמדרש (במדבר רבה יד, יב) מונה לירושלים — כל שם עם המקור
        או המקורות שלו בתנ״ך, מקושרים ישירות לקורא
      </p>
      <p className="text-stone-400 text-xs mb-6">
        זהו אוסף מצומצם ומאומת מול מסדי הנתונים של האתר — לא רשימה מלאה של כל 70/84 השמות המסורתיים
      </p>

      {!loading && seeded && (names?.length ?? 0) > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפש שם... (למשל ציון, שלם, עיר הקודש)"
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-stone-700 focus:outline-none focus:border-yellow-400"
          />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <svg className="animate-spin h-7 w-7 text-yellow-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!loading && !seeded && <NotSeeded />}

      {!loading && seeded && (
        <>
          {filtered.length === 0 ? (
            <p className="text-stone-500 text-center py-6">לא נמצאו שמות התואמים את החיפוש</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((entry) => (
                <NameCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
