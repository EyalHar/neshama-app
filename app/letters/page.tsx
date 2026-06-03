"use client";

import { useState } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";

const ALPHABET = "אבגדהוזחטיכלמנסעפצקרשת".split("");

type Result = { book: string; bookHe: string; chapter: number; verse: number; text: string };

function LetterPicker({ label, value, onChange }: { label: string; value: string; onChange: (l: string) => void }) {
  return (
    <div>
      <p className="text-sm text-stone-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {ALPHABET.map((l) => (
          <button
            key={l}
            onClick={() => onChange(l === value ? "" : l)}
            className={`w-9 h-9 rounded-lg text-lg font-medium transition-colors ${
              value === l ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-700 hover:border-amber-400"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LettersPage() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notSeeded, setNotSeeded] = useState(false);

  async function handleSearch() {
    if (!first || !last) return;
    setLoading(true);
    setSearched(true);
    setNotSeeded(false);
    try {
      const res = await fetch(`/api/verses/letters?first=${encodeURIComponent(first)}&last=${encodeURIComponent(last)}`);
      const data = await res.json();
      if (data.results?.length === 0 && !data.seeded) setNotSeeded(true);
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">חיפוש פסוקים לפי אות</h1>
      <p className="text-stone-500 text-sm mb-1">מצא פסוקים שמתחילים ונגמרים באותיות שתבחר</p>
      <p className="text-stone-400 text-xs mb-6">Based on <a href="https://github.com/openscriptures/morphhb" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">Open Scriptures Hebrew Bible</a></p>

      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm mb-6 space-y-5">
        <LetterPicker label="מתחיל ב..." value={first} onChange={setFirst} />
        <LetterPicker label="נגמר ב..." value={last} onChange={setLast} />

        <button
          onClick={handleSearch}
          disabled={!first || !last || loading}
          className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
        >
          חפש
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {!loading && searched && (
        notSeeded ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-700 font-medium mb-1">הנתונים עוד לא נטענו</p>
            <p className="text-amber-600 text-sm mb-3">יש לבצע אכלוס חד-פעמי של מסד הנתונים</p>
            <Link href="/admin/seed" className="text-amber-700 underline text-sm">עבור לדף האכלוס</Link>
          </div>
        ) : results.length === 0 ? (
          <p className="text-stone-500 text-center py-6">לא נמצאו פסוקים שמתחילים ב-{first} ונגמרים ב-{last}</p>
        ) : (
          <>
            <p className="text-stone-500 text-sm mb-4">נמצאו {total} פסוקים</p>
            <div className="space-y-3">
              {results.map((r) => (
                <div key={`${r.book}-${r.chapter}-${r.verse}`} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-700 mb-1.5">
                        {r.bookHe} {toHebrewNumeral(r.chapter)}&lrm;:{toHebrewNumeral(r.verse)}
                      </p>
                      <p className="text-stone-700 leading-relaxed">
                        <span className="bg-amber-200 rounded px-0.5">{r.text[0]}</span>
                        {r.text.slice(1, -1)}
                        <span className="bg-amber-200 rounded px-0.5">{r.text[r.text.length - 1]}</span>
                      </p>
                    </div>
                    <Link
                      href={`/tanakh?book=${encodeURIComponent(r.book)}&chapter=${r.chapter}`}
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
