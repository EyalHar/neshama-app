"use client";

import { useEffect, useState } from "react";
import { ANY_LETTER, ROOT_LETTERS, type RootItem, type RootPattern, type RootScope } from "@/lib/rootLetterPattern";

type Sort = "alpha" | "count";

const POSITIONS = ["אות ראשונה", "אות שנייה", "אות שלישית"];
const EMPTY: RootPattern = ["", "", "", ""];

async function requestRoots(pattern: RootPattern, scope: RootScope): Promise<RootItem[]> {
  const params = new URLSearchParams({ scope });
  pattern.forEach((l, i) => { if (l) params.set(`l${i + 1}`, l); });
  const res = await fetch(`/api/verses/roots?${params}`);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()).roots;
}

// "שורשים לפי אותיות" tab of /advanced: pick any of a root's three letters and see every verb
// root that matches. Clicking a root runs the regular root search for it.
export default function RootLetters({ scope, onPick }: { scope: RootScope; onPick: (root: string) => void }) {
  const [pattern, setPattern] = useState<RootPattern>(EMPTY);
  const [roots, setRoots] = useState<RootItem[] | null>(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<Sort>("alpha");
  const empty = pattern.every((l) => !l);

  // State is only set in the promise callbacks, so this is safe to start from an effect
  useEffect(() => {
    if (empty) return;
    let cancelled = false;
    requestRoots(pattern, scope).then(
      (r) => { if (!cancelled) { setRoots(r); setError(false); } },
      () => { if (!cancelled) setError(true); }
    );
    return () => { cancelled = true; };
  }, [pattern, scope, empty]);

  function setLetter(i: number, letter: string) {
    setPattern((prev) => prev.map((l, j) => (j === i ? letter : l)) as RootPattern);
  }

  const shown = empty || !roots ? [] : [...roots].sort((a, b) =>
    sort === "count" ? b.count - a.count || a.letters.localeCompare(b.letters, "he") : a.letters.localeCompare(b.letters, "he")
  );

  return (
    <div>
      <p className="text-stone-500 text-sm mb-4">
        בחר אות אחת או יותר במקומות המתאימים בשורש, ויוצגו כל השורשים שמתאימים. לחיצה על שורש מחפשת אותו בתנ״ך.
        לשורשים מרובעים, הנדירים בתנ״ך, בחר גם באות הרביעית.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        {POSITIONS.map((label, i) => (
          <label key={label} className="flex flex-col gap-1">
            <span className="text-xs text-stone-500">{label}</span>
            <select
              value={pattern[i]}
              onChange={(e) => setLetter(i, e.target.value)}
              className={`w-28 rounded-xl border px-3 py-2 text-lg text-center bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                pattern[i] ? "border-amber-400 text-amber-800 font-bold" : "border-stone-300 text-stone-500"
              }`}
            >
              <option value="">כל אות</option>
              {ROOT_LETTERS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">אות רביעית</span>
          <select
            value={pattern[3]}
            onChange={(e) => setLetter(3, e.target.value)}
            className={`w-36 rounded-xl border px-3 py-2 text-center bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${
              pattern[3] ? "border-amber-400 text-amber-800 font-bold text-lg" : "border-stone-300 text-stone-500 text-sm"
            }`}
          >
            <option value="">— (שורש בן 3)</option>
            <option value={ANY_LETTER}>כל אות (מרובע)</option>
            {ROOT_LETTERS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        {!empty && (
          <button
            type="button"
            onClick={() => { setPattern(EMPTY); setRoots(null); }}
            className="text-sm text-stone-500 hover:text-amber-700 px-2 py-2"
          >
            נקה
          </button>
        )}
      </div>

      {empty ? (
        <p className="text-stone-400 text-sm">בחר לפחות אות אחת כדי לראות שורשים</p>
      ) : error ? (
        <p className="text-red-500 text-sm">טעינת השורשים נכשלה, נסה שוב</p>
      ) : !roots ? (
        <p className="text-stone-400 text-sm">טוען שורשים...</p>
      ) : shown.length === 0 ? (
        <p className="text-stone-500 text-center py-6">לא נמצאו שורשים שמתאימים לאותיות שנבחרו</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <p className="text-stone-500 text-sm">
              נמצאו <span className="font-semibold text-stone-700">{shown.length}</span> שורשים
            </p>
            <div className="inline-flex bg-stone-100 rounded-lg p-0.5 text-sm">
              {([["alpha", "לפי א״ב"], ["count", "לפי שכיחות"]] as [Sort, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  aria-pressed={sort === id}
                  className={`px-3 py-1 rounded-md transition-colors ${sort === id ? "bg-white text-amber-800 font-medium shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {shown.map((r) => (
              <button
                key={r.letters}
                type="button"
                onClick={() => onPick(r.plain)}
                title={`${r.lemmaHe} — חפש את השורש בתנ״ך`}
                className="flex items-center justify-between gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                <span className="text-lg font-medium text-stone-800">{[...r.letters].join("־")}</span>
                <span className="text-xs text-stone-400">×{r.count.toLocaleString("he-IL")}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
