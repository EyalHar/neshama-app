"use client";

import { useState } from "react";
import Segmented from "@/app/quiz/Segmented";
import type { InitialsDir, InitialsMode, InitialsResult } from "@/lib/letterHintsShared";
import MarkedVerseText from "./MarkedVerseText";
import { ChanceNote, SCOPES } from "./common";

const MODES: { id: InitialsMode; label: string }[] = [
  { id: "first", label: "ראשי תיבות" },
  { id: "last", label: "סופי תיבות" },
];
const DIRS: { id: InitialsDir; label: string }[] = [
  { id: "forward", label: "בסדר הקריאה" },
  { id: "backward", label: "בהיפוך" },
  { id: "both", label: "בשני הכיוונים" },
];
const EXAMPLES: { q: string; mode: InitialsMode; dir: InitialsDir; label: string }[] = [
  { q: "יהוה", mode: "first", dir: "forward", label: "יהוה בראשי תיבות" },
  { q: "יהוה", mode: "last", dir: "backward", label: "יהוה בסופי תיבות, בהיפוך" },
  { q: "אמת", mode: "last", dir: "forward", label: "אמת בסופי תיבות" },
];

export default function InitialsSearch() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<InitialsMode>("first");
  const [dir, setDir] = useState<InitialsDir>("forward");
  const [cross, setCross] = useState(false);
  const [scope, setScope] = useState("tanakh");
  const [result, setResult] = useState<InitialsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function run(next: Partial<{ q: string; mode: InitialsMode; dir: InitialsDir }> = {}) {
    const query = next.q ?? q;
    const params = new URLSearchParams({ q: query, mode: next.mode ?? mode, dir: next.dir ?? dir, scope, cross: cross ? "1" : "0" });
    setLoading(true);
    setError("");
    fetch(`/api/letter-hints/initials?${params}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json()).error)))
      .then(setResult, (e) => {
        setResult(null);
        setError(typeof e === "string" && e.includes("3–20") ? "הקלידו מילה של 3 עד 20 אותיות" : "שגיאה בחיפוש, נסו שוב");
      })
      .finally(() => setLoading(false));
  }

  function example(e: (typeof EXAMPLES)[number]) {
    setQ(e.q);
    setMode(e.mode);
    setDir(e.dir);
    run(e);
  }

  return (
    <div>
      <p className="text-stone-500 text-sm mb-4 leading-relaxed">
        מילה שנוצרת מהאות הראשונה, או האחרונה, של מילים רצופות בפסוק. כך דרשו פרשנים את ״<b>י</b>בוא <b>ה</b>מלך{" "}
        <b>ו</b>המן <b>ה</b>יום״ (אסתר ה, ד), ובסופי תיבות, בהיפוך, את ״ז<b>ה</b> איננ<b>ו</b> שו<b>ה</b> ל<b>י</b>״ (אסתר ה, יג).
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
          placeholder="מילה, למשל יהוה"
          className="flex-1 min-w-48 border border-stone-300 rounded-xl px-4 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button type="submit" disabled={loading || !q.trim()} className="bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
          {loading ? "מחפש..." : "חפש"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Segmented options={MODES} value={mode} onChange={setMode} />
        <Segmented options={DIRS} value={dir} onChange={setDir} />
      </div>
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-stone-600">
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="border border-stone-300 rounded-lg px-2 py-1 bg-white">
          {SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={cross} onChange={(e) => setCross(e.target.checked)} className="accent-amber-600" />
          גם מעבר לסוף פסוק
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
        <span className="text-stone-400">דוגמאות:</span>
        {EXAMPLES.map((e) => (
          <button key={e.label} type="button" onClick={() => example(e)} className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-800 transition-colors">
            {e.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {result && (
        <>
          <ChanceNote found={result.total} expected={result.expected} />
          {result.total > result.matches.length && (
            <p className="text-stone-400 text-xs mb-3">מוצגים {result.matches.length} הראשונים, לפי סדר התנ״ך.</p>
          )}
          <div className="flex flex-col gap-3">
            {result.matches.map((m, i) => (
              <article key={i} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                {m.reversed && <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 mb-1 inline-block">בהיפוך</span>}
                <div className="flex flex-col gap-2">
                  {m.verses.map((v) => <MarkedVerseText key={v.ref} v={v} />)}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
