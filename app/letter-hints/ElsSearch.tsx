"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { ELS_LIMITS, type ElsGrid, type ElsMatch, type ElsResult, type MarkedVerse } from "@/lib/letterHintsShared";
import MarkedVerseText, { markedWords, versesText, withFinal } from "./MarkedVerseText";
import { ChanceNote, CollectButton } from "./common";

export default function ElsSearch() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("torah");
  const [min, setMin] = useState(2);
  const [max, setMax] = useState(1000);
  const [result, setResult] = useState<ElsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  function run(o: { q?: string; scope?: string; min?: number; max?: number } = {}) {
    const params = new URLSearchParams({ q: o.q ?? q, scope: o.scope ?? scope, min: String(o.min ?? min), max: String(o.max ?? max) });
    setLoading(true);
    setError("");
    setOpenKey(null);
    fetch(`/api/letter-hints/els?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setResult, () => {
        setResult(null);
        setError(`הקלידו מילה של ${ELS_LIMITS.minLength} עד ${ELS_LIMITS.maxLength} אותיות, ודילוג בין 2 ל־${ELS_LIMITS.maxSkip.toLocaleString("he-IL")}`);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 leading-relaxed mb-5">
        דילוג אותיות (״צופן התורה״) מוצא מילה שאותיותיה עומדות במרחק קבוע זו מזו. בטקסט באורך כזה מילים קצרות נמצאות
        בדילוג גם במקרה, ובדיקות הראו ״צפנים״ דומים גם בספרים אחרים, כמו ״מלחמה ושלום״. לכן ליד כל חיפוש מוצג כמה
        מופעים היו צפויים בטקסט אקראי. מופע של מילה אינו הוכחה למסר.
      </div>
      <p className="text-stone-500 text-sm mb-4 leading-relaxed">
        הדוגמה הידועה: מהתי״ו של ״בראשית״, בדילוג של 50 אותיות, נוצרת המילה תורה. האותיות נספרות ברצף, בלי רווחים,
        ואותיות סופיות נחשבות כרגילות.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex flex-wrap items-center gap-3 mb-3"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="מילה, למשל תורה"
          className="flex-1 min-w-48 border border-stone-300 rounded-xl px-4 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button type="submit" disabled={loading || !q.trim()} className="bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
          {loading ? "מחפש..." : "חפש"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm text-stone-600">
        <label className="flex items-center gap-1.5">
          היכן:
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="border border-stone-300 rounded-lg px-2 py-1 bg-white">
            <option value="torah">התורה</option>
            <option value="tanakh">כל התנ״ך</option>
            {TANAKH_BOOKS.map((b) => <option key={b.id} value={b.id}>{b.he}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          דילוג בין
          <input type="number" min={2} max={ELS_LIMITS.maxSkip} value={min} onChange={(e) => setMin(Number(e.target.value))} className="w-20 border border-stone-300 rounded-lg px-2 py-1" />
          ל־
          <input type="number" min={2} max={ELS_LIMITS.maxSkip} value={max} onChange={(e) => setMax(Number(e.target.value))} className="w-24 border border-stone-300 rounded-lg px-2 py-1" />
        </label>
        <button type="button" onClick={() => { setQ("תורה"); setScope("torah"); setMin(50); setMax(50); run({ q: "תורה", scope: "torah", min: 50, max: 50 }); }} className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-800 transition-colors">
          דוגמה: תורה בדילוג 50
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <>
          <ChanceNote found={result.total} expected={result.expected} />
          <p className="text-stone-400 text-xs mb-3">
            {result.letters.toLocaleString("he-IL")} אותיות בטווח.
            {result.total > result.matches.length && <> מוצגים {result.matches.length} המופעים בדילוג הקצר ביותר.</>}
          </p>
          <ul className="flex flex-col gap-2">
            {result.matches.map((m) => {
              const key = `${m.start}:${m.skip}`;
              return (
                <ElsRow key={key} m={m} query={result.query} open={openKey === key} onToggle={() => setOpenKey(openKey === key ? null : key)} />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function ElsRow({ m, query, open, onToggle }: { m: ElsMatch; query: string; open: boolean; onToggle: () => void }) {
  return (
    <li className="bg-white border border-stone-200 rounded-xl">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start hover:bg-stone-50 rounded-xl">
        <span className="text-stone-700">
          <b className="text-amber-800">דילוג {Math.abs(m.skip).toLocaleString("he-IL")}</b>
          {m.skip < 0 && <span className="text-xs text-sky-700 ms-1.5">(לאחור)</span>}
          <span className="text-stone-500 text-sm ms-2">{m.from === m.to ? m.from : `${m.from} – ${m.to}`}</span>
        </span>
        <span className="text-stone-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <ElsDetail m={m} query={query} />}
    </li>
  );
}

function ElsDetail({ m, query }: { m: ElsMatch; query: string }) {
  const length = query.length;
  const [data, setData] = useState<{ grid: ElsGrid; verses: MarkedVerse[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams({ start: String(m.start), skip: String(m.skip), length: String(length) });
    fetch(`/api/letter-hints/els/grid?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData, () => setError(true));
  }, [m.start, m.skip, length]);
  if (error) return <p className="text-red-500 text-sm px-4 pb-3">שגיאה בטעינה</p>;
  if (!data) return <p className="text-stone-400 text-sm px-4 pb-3">טוען...</p>;
  return (
    <div className="px-4 pb-4 border-t border-stone-100 pt-3">
      <p className="text-xs text-stone-500 mb-2">
        הטקסט בשורות של {data.grid.width.toLocaleString("he-IL")} אותיות, כך שהמילה עומדת בטור
        {m.skip < 0 ? " (נקראת מלמטה למעלה)" : ""}. ריחוף על אות מראה את הפסוק שלה.
      </p>
      <div className="overflow-x-auto mb-4">
        <table className="mx-auto border-collapse">
          <tbody>
            {data.grid.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    title={data.grid.verses.find((v) => v.id === cell.verse)?.ref}
                    className={`w-7 min-w-7 h-7 text-center text-lg leading-none ${cell.hit ? "bg-amber-500 text-white font-bold rounded-md" : "text-stone-500"}`}
                  >
                    {cell.letter}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mb-2">
        <CollectButton
          label="הוסף את הדילוג למחברת"
          title="הוסף את הדילוג, האותיות והפסוקים לדף במחברת"
          text={elsQuote(m, query, data.verses)}
          source={m.from === m.to ? m.from : `${m.from} – ${m.to}`}
          href={data.grid.verses[0].href}
        />
      </div>
      <div className="flex flex-col gap-3">
        {data.verses.map((v) => <MarkedVerseText key={v.ref} v={v} />)}
      </div>
      {data.verses.length > 4 && (
        <p className="text-xs text-stone-400 mt-2">
          האותיות פזורות על פני {data.verses.length} פסוקים. <Link href={data.grid.verses[0].href} className="text-amber-700 hover:underline">לפסוק הראשון ←</Link>
        </p>
      )}
    </div>
  );
}

function elsQuote(m: ElsMatch, query: string, verses: MarkedVerse[]): string {
  const letters = markedWords(verses);
  if (m.skip < 0) letters.reverse();
  const where = m.from === m.to ? `ב${m.from}` : `מ${m.from} עד ${m.to}`;
  const head = `״${withFinal(query)}״ בדילוג של ${Math.abs(m.skip).toLocaleString("he-IL")} אותיות${m.skip < 0 ? " לאחור" : ""}, ${where}.`;
  const list = `האותיות: ${letters.map((x) => `${x.letter} (${x.word})`).join(" · ")}`;
  return `${head}\n\n${list}\n\n${versesText(verses)}`;
}
