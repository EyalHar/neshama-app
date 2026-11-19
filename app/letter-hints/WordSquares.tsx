"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WordSquare, WordSquaresResult } from "@/lib/letterHintsShared";
import { CollectButton } from "./common";

// Off-diagonal cells come in mirrored pairs; each pair gets its own color
const PAIR_STYLE: Record<string, string> = {
  "0-1": "bg-amber-100 text-amber-900",
  "0-2": "bg-sky-100 text-sky-900",
  "1-2": "bg-emerald-100 text-emerald-900",
};

// Sources that discuss a verse's pattern; every other square was found by the scan alone
const SOURCES: Record<string, string> = {
  "תהלים פה, יב": "״אמת הוא נוטריקון: א׳ – אמ״ת, מ״ם – מאר״ץ, תי״ו – תצמ״ח״ (זוהר חדש, בראשית). הזוהר מצביע על הטור הראשון; את הריבוע השלם לא מצאנו במקורות.",
};

export default function WordSquares() {
  const [data, setData] = useState<WordSquaresResult | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/letter-hints/squares")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData, () => setError(true));
  }, []);

  const strong = data?.squares.filter((s) => s.strong) ?? [];
  const others = data?.squares.filter((s) => !s.strong) ?? [];

  return (
    <div>
      <p className="text-stone-500 text-sm mb-4 leading-relaxed">
        שלוש מילים רצופות בפסוק שאפשר לסדר בריבוע, כך שהטורים נקראים כמו השורות: ״אמת מארץ תצמח״. המילה הראשונה מתפרקת
        לאותיות א־מ־ת, והן גם ראשי התיבות של שלוש המילים. כל תא מחוץ לאלכסון הוא אות אחת, ותא ותמונת הראי שלו צבועים
        באותו צבע. התאים שעל האלכסון, באפור, חופשיים.
      </p>

      {error && <p className="text-red-500 text-sm">שגיאה בטעינה</p>}
      {!data && !error && <p className="text-stone-400 text-sm py-6 text-center">סורק את התנ״ך...</p>}

      {data && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 leading-relaxed mb-6">
            בכל התנ״ך נמצאו {data.squares.length} ריבועים, ומתוכם {strong.length} שבהם המילה הראשונה היא ראשי התיבות. כשמערבבים את
            סדר המילים בכל פסוק (ממוצע של {data.baseline.runs} ערבובים) יוצאים כ־{Math.round(data.baseline.all)} ריבועים, ומהם כ־
            {Math.round(data.baseline.strong)} מהסוג הזה. כלומר, התבנית עצמה מופיעה בערך כמו במקרה. מה שמיוחד הוא הפסוק שבו היא
            נמצאת ומה שאפשר לדרוש בו.
          </div>

          <h3 className="text-lg font-semibold text-stone-700 mb-3">המילה הראשונה היא ראשי התיבות ({strong.length})</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {strong.map((s) => <SquareCard key={s.ref} s={s} large />)}
          </div>

          <h3 className="text-lg font-semibold text-stone-700 mb-1">שאר הריבועים ({others.length})</h3>
          <p className="text-stone-500 text-sm mb-3">כאן התא הראשון באלכסון ארוך מאות אחת, ולכן המילה הראשונה אינה רק ראשי תיבות.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {others.map((s) => <SquareCard key={s.ref + s.grid.join()} s={s} />)}
          </div>
          <p className="text-xs text-stone-400 mt-6 leading-relaxed">
            חוץ מהזוהר על ״אמת מארץ תצמח״, לא מצאנו מפרש שעוסק בריבועים האלה. הם נמצאו בסריקה של הטקסט.
          </p>
        </>
      )}
    </div>
  );
}

function SquareCard({ s, large }: { s: WordSquare; large?: boolean }) {
  const words = s.grid.map((row) => row.join(""));
  const source = SOURCES[s.ref];
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col">
      <table className={`mx-auto mb-3 border-separate ${large ? "border-spacing-1.5 text-2xl" : "border-spacing-1 text-lg"}`}>
        <tbody>
          {s.grid.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`text-center rounded-lg ${large ? "min-w-12 h-12 px-2" : "min-w-9 h-9 px-1.5"} ${
                    i === j ? "bg-stone-50 text-stone-500" : `font-bold ${PAIR_STYLE[`${Math.min(i, j)}-${Math.max(i, j)}`]}`
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`text-center font-bold text-stone-800 mb-1 ${large ? "text-xl" : ""}`}>{words.join(" ")}</p>
      {source && <p className="text-xs text-stone-600 bg-amber-50/70 rounded-lg px-2.5 py-1.5 my-2 leading-relaxed">📜 {source}</p>}
      {large && (
        <p data-collect-source={s.ref} data-collect-href={s.href} className="text-stone-600 text-sm leading-relaxed text-center mb-1">
          {s.verseText}
        </p>
      )}
      <div className="flex items-center justify-center gap-2 mt-auto">
        <Link href={s.href} className="text-xs text-amber-700 hover:underline">{s.ref} ←</Link>
        <CollectButton
          label="הוסף למחברת"
          title="הוסף את הריבוע והפסוק לדף במחברת, כדי לכתוב עליו פרשנות"
          text={`״${words.join(" ")}״: ריבוע מילים, שהטורים שלו נקראים כמו השורות (${s.grid.map((r) => r.join("·")).join(" / ")})\n\n${s.verseText} (${s.ref})`}
          source={s.ref}
          href={s.href}
        />
      </div>
    </article>
  );
}
