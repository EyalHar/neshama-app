"use client";

import { useState } from "react";
import { ALEF_BET, atbash, type AtbashSearch, type PairHit } from "@/lib/letterHintsShared";
import MarkedVerseText, { PairGroups, withFinal } from "./MarkedVerseText";
import { Loading, useJson } from "./common";

const SWAPS = ALEF_BET.slice(0, 11).map((c) => [c, ALEF_BET[21 - ALEF_BET.indexOf(c)]]);

const IN_THE_TEXT: { code: string; plain: string; where: string }[] = [
  { code: "שֵׁשַׁךְ", plain: "בבל", where: "ירמיהו כה, כו; נא, מא (שם שתיהן באותו פסוק)" },
  { code: "לֵב קָמָי", plain: "כשדים", where: "ירמיהו נא, א" },
];

export default function AtbashTab() {
  const { data, error } = useJson<{ pairs: PairHit[] }>("/api/letter-hints/atbash");
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AtbashSearch | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [loading, setLoading] = useState(false);

  function search(query = q) {
    setLoading(true);
    setSearchError(false);
    fetch(`/api/letter-hints/atbash?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setResult, () => {
        setResult(null);
        setSearchError(true);
      })
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <p className="text-stone-500 text-sm mb-3 leading-relaxed">
        אתב״ש מחליף כל אות באות שעומדת מולה כשמקפלים את האלף־בית: הראשונה באחרונה, השנייה בלפני האחרונה, וכן הלאה.
        האותיות הסופיות נחשבות כרגילות.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-5" dir="rtl">
        {SWAPS.map(([a, b]) => (
          <span key={a} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold">{a}↔{b}</span>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 leading-relaxed mb-6">
        <p className="font-semibold mb-1">בתוך המקרא עצמו</p>
        <ul className="flex flex-col gap-1">
          {IN_THE_TEXT.map((x) => (
            <li key={x.code}>
              <button type="button" onClick={() => { setQ(x.code); search(x.code); }} className="font-bold hover:underline">{x.code}</button>
              {" "}= {x.plain} <span className="text-amber-700/80">({x.where})</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex flex-wrap items-center gap-3 mb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="מילה, למשל ששך"
          className="flex-1 min-w-48 border border-stone-300 rounded-xl px-4 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button type="submit" disabled={loading || !q.trim()} className="bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
          {loading ? "מחפש..." : "המר וחפש"}
        </button>
      </form>
      {q.trim() && <p className="text-sm text-stone-500 mb-4">באתב״ש: <b className="text-stone-800">{withFinal(atbash(q))}</b></p>}
      {searchError && <p className="text-red-500 text-sm mb-4">הקלידו מילה של 2 עד 15 אותיות</p>}

      {result && (
        <div className="mb-8">
          <p className="text-sm text-stone-600 mb-3">
            ״{q.trim()}״ מופיעה {result.queryCount.toLocaleString("he-IL")} פעמים בתנ״ך. ההמרה שלה, ״{withFinal(result.atbash)}״,{" "}
            {result.atbashCount ? <>מופיעה כמילה {result.atbashCount.toLocaleString("he-IL")} פעמים.</> : <>אינה מופיעה כמילה בתנ״ך.</>}
            {result.sameVerse.length > 0 && <> שתיהן יחד בפסוק אחד: {result.sameVerse.map((p) => p.verse.ref).join(", ")}.</>}
          </p>
          {result.verses.length > 0 && (
            <div className="flex flex-col gap-3">
              {result.verses.map((v) => (
                <div key={v.ref} className="bg-white border border-stone-200 rounded-xl p-4"><MarkedVerseText v={v} /></div>
              ))}
              {result.atbashCount > result.verses.length && <p className="text-xs text-stone-400">מוצגים {result.verses.length} הפסוקים הראשונים.</p>}
            </div>
          )}
        </div>
      )}

      <h3 className="text-lg font-semibold text-stone-700 mb-1">צמדים באותו פסוק</h3>
      <p className="text-stone-500 text-sm mb-3">
        פסוקים שיש בהם מילה וגם ההמרה שלה באתב״ש (מילים של שלוש אותיות ומעלה; בקצרות יותר הצמדים מקריים, כמו כל/לך).
      </p>
      {!data ? (
        <Loading error={error} />
      ) : (
        <PairGroups pairs={data.pairs} sign="↔" />
      )}
    </div>
  );
}
