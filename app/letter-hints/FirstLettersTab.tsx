"use client";

import { useState } from "react";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import type { FirstLetter } from "@/lib/letterHintsShared";
import MarkedVerseText from "./MarkedVerseText";
import { Loading, useJson } from "./common";

// What the sages say about a letter's first appearance in Genesis (checked against the text)
const GENESIS_NOTES: Record<string, string> = {
  ט: "״הרואה טי״ת בחלומו – סימן יפה לו… הואיל ופתח בו הכתוב לטובה תחילה, שמבראשית עד וירא אלהים את האור לא כתיב טי״ת״ (רבי יהושע, בבא קמא נה, א). הטי״ת הראשונה היא של ״כִּי טוֹב״.",
  ס: "בבראשית רבה (יז, ו) נאמר שעד ״ויסגר בשר תחתנה״ (ב, כא) אין סמ״ך, ״ואם יאמר לך אדם: הוא הסובב, תאמר לו: בנהרות הכתוב מדבר״. בטקסט הסמ״ך הראשונה אכן ב״הַסֹּבֵב״ (ב, יא), והמדרש עצמו מעיר על כך.",
};

export default function FirstLettersTab() {
  const [book, setBook] = useState("Genesis");
  const { data, error } = useJson<{ letters: FirstLetter[] }>(`/api/letter-hints/first-letters?book=${encodeURIComponent(book)}`);
  const notes = book === "Genesis" ? GENESIS_NOTES : {};
  const [open, setOpen] = useState<string | null>("ס");

  return (
    <div>
      <p className="text-stone-500 text-sm mb-4 leading-relaxed">
        מתי כל אות נכתבת לראשונה, כולל האותיות הסופיות. בבראשית אותיות ״בראשית״ באות ראשונות, ובפסוק הראשון כבר 12 מתוך
        27 צורות האותיות. בשתי אותיות יש לחז״ל מה לומר על המקום הראשון שלהן.
      </p>
      <label className="flex items-center gap-2 text-sm text-stone-600 mb-5">
        בספר:
        <select value={book} onChange={(e) => setBook(e.target.value)} className="border border-stone-300 rounded-lg px-2 py-1 bg-white">
          {TANAKH_BOOKS.map((b) => <option key={b.id} value={b.id}>{b.he}</option>)}
        </select>
      </label>

      {!data ? (
        <Loading error={error} />
      ) : (
        <>
          <ol className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2 mb-5">
            {data.letters.map((l, i) => (
              <li key={l.letter}>
                <button
                  type="button"
                  onClick={() => setOpen(open === l.letter ? null : l.letter)}
                  aria-pressed={open === l.letter}
                  className={`w-full rounded-xl border px-2 py-2 text-center transition-colors ${
                    open === l.letter ? "border-amber-500 bg-amber-50" : notes[l.letter] ? "border-amber-300 bg-white" : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <span className="block text-3xl font-bold text-stone-800 leading-tight">{l.letter}</span>
                  <span className="block text-xs text-stone-500 truncate">{l.word}</span>
                  <span className="block text-[11px] text-stone-400">{i + 1} · אות {l.position.toLocaleString("he-IL")}</span>
                </button>
              </li>
            ))}
          </ol>
          {data.letters.length < 27 && <p className="text-xs text-stone-400 mb-4">בספר הזה לא מופיעות כל 27 צורות האותיות.</p>}
          {(() => {
            const l = data.letters.find((x) => x.letter === open);
            if (!l) return null;
            return (
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <p className="font-semibold text-stone-700 mb-1">
                  {l.letter} מופיעה לראשונה ב״{l.word}״, האות ה־{l.position.toLocaleString("he-IL")} בספר
                </p>
                {notes[l.letter] && <p className="text-sm text-stone-600 bg-amber-50/70 rounded-lg px-3 py-2 my-2 leading-relaxed">📜 {notes[l.letter]}</p>}
                <MarkedVerseText v={l.verse} />
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
