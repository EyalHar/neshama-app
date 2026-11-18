"use client";

import { useState } from "react";
import { toHebrewNumeral } from "@/lib/tanakh";

type Verse = { chapter: number; verse: number; text: string };

// "Show the whole text" for a song or prayer: loads the range from /api/passage-text on first open
export default function PassageText({
  book,
  bookHe,
  from,
  to,
  verseCount,
}: {
  book: string;
  bookHe: string;
  from: [number, number];
  to: [number, number];
  verseCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [error, setError] = useState(false);
  const multiChapter = from[0] !== to[0];

  function toggle() {
    setOpen((o) => !o);
    if (verses || open) return;
    const params = new URLSearchParams({ book, from: from.join(":"), to: to.join(":") });
    fetch(`/api/passage-text?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { verses: Verse[] }) => setVerses(d.verses), () => setError(true));
  }

  return (
    <div>
      <button type="button" onClick={toggle} aria-expanded={open} className="text-sm text-amber-700 hover:underline">
        {open ? "הסתר את הטקסט" : verseCount === 1 ? "הצג את הפסוק" : `הצג את כל הטקסט (${verseCount} פסוקים)`}
      </button>
      {open && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          {error && <p className="text-red-500 text-sm">שגיאה בטעינת הטקסט</p>}
          {!verses && !error && <p className="text-stone-400 text-sm">טוען...</p>}
          {verses?.map((v) => (
            <p
              key={`${v.chapter}:${v.verse}`}
              data-collect-source={`${bookHe} ${toHebrewNumeral(v.chapter)}, ${toHebrewNumeral(v.verse)}`}
              data-collect-href={`/tanakh?book=${encodeURIComponent(book)}&chapter=${v.chapter}&verse=${v.verse}`}
              className="text-stone-800 text-lg leading-loose mb-1"
            >
              <span data-collect-skip className="text-amber-600 text-xs font-medium ms-1">
                {multiChapter ? `${toHebrewNumeral(v.chapter)}:` : ""}
                {toHebrewNumeral(v.verse)}
              </span>{" "}
              {v.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
