"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CUSTOM_MAX, KIND_TAG, type FreqCandidate, type FreqCompare } from "@/lib/frequenciesShared";
import { CompareFigure } from "./CompareChart";

// "השוואה משלי": any words or roots, picked by the user, compared across the sections like the top 10.
// The list lives in localStorage (it comes back on the next visit) and in the URL (?items=, to share a link).

const STORAGE_KEY = "frequencies-custom";
const EVENT = "frequencies-custom-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}
const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};
const parse = (s: string) => s.split(",").filter(Boolean).slice(0, CUSTOM_MAX);

export default function CustomCompare({ initialIds }: { initialIds: string[] | null }) {
  const stored = useSyncExternalStore(subscribe, readStored, () => "");
  // A shared link (?items=) wins over the stored list until the user changes it
  const [fromLink, setFromLink] = useState<string[] | null>(initialIds);
  const ids = fromLink ?? parse(stored);

  function save(next: string[]) {
    setFromLink(null);
    try {
      localStorage.setItem(STORAGE_KEY, next.join(","));
    } catch {
      // private mode: the list still lives in the URL
    }
    window.dispatchEvent(new Event(EVENT));
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "custom");
    if (next.length) url.searchParams.set("items", next.join(","));
    else url.searchParams.delete("items");
    window.history.replaceState(null, "", url);
  }
  const add = (id: string) => !ids.includes(id) && ids.length < CUSTOM_MAX && save([...ids, id]);
  const remove = (id: string) => save(ids.filter((x) => x !== id));

  // The list's counts
  const url = `/api/frequencies/items?ids=${encodeURIComponent(ids.join(","))}`;
  const [state, setState] = useState<{ url: string; data: FreqCompare | null; error: boolean }>({ url: "", data: null, error: false });
  useEffect(() => {
    if (!ids.length) return;
    let live = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (data: FreqCompare) => live && setState({ url, data, error: false }),
        () => live && setState({ url, data: null, error: true })
      );
    return () => {
      live = false;
    };
  }, [url, ids.length]);
  const data = state.url === url ? state.data : null;

  return (
    <>
      <p className="text-sm text-stone-600 mb-4 leading-relaxed">
        הוסיפו כל מילה או שורש, גם כאלה שאינם ב־500 השכיחים, והשוו את השכיחות שלהם בתורה, בנביאים ובכתובים. אפשר לערבב
        מילים ושורשים (למשל השורש שׁוּב והמילה תְּשׁוּבָה). הרשימה נשמרת בדפדפן, ואפשר לשלוח את הקישור לדף.
      </p>
      <Search onAdd={add} chosen={ids} full={ids.length >= CUSTOM_MAX} />

      {ids.length === 0 ? (
        <p className="text-stone-400 text-sm text-center py-10">הרשימה ריקה. חפשו מילה או שורש והוסיפו אותם.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-4" aria-label="הרשימה שלי">
            {(data?.items ?? []).map((item) => (
              <span key={item.key} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full ps-3 pe-1 py-0.5 text-sm">
                <b className="text-stone-800">{item.label}</b>
                <span className="text-[11px] text-stone-500">{item.tag}</span>
                <button type="button" onClick={() => remove(item.key)} aria-label={`הסר את ${item.label}`} className="w-6 h-6 rounded-full text-stone-400 hover:bg-amber-100 hover:text-stone-700">
                  ✕
                </button>
              </span>
            ))}
            <button type="button" onClick={() => save([])} className="text-xs text-stone-400 hover:text-red-600 px-2">
              נקה הכול
            </button>
          </div>
          <CompareFigure title="ההשוואה שלי" data={data} error={state.url === url && state.error} />
        </>
      )}
    </>
  );
}

function Search({ onAdd, chosen, full }: { onAdd: (id: string) => void; chosen: string[]; full: boolean }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ q: string; candidates: FreqCandidate[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError(false);
    fetch(`/api/frequencies/search?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { candidates: FreqCandidate[] }) => setResult({ q: query, candidates: d.candidates }), () => setError(true))
      .finally(() => setLoading(false));
  }

  return (
    <div className="mb-5">
      <form onSubmit={search} className="flex flex-wrap items-center gap-3 mb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="מילה או שורש, למשל שלום, חסד, שוב"
          className="flex-1 min-w-48 border border-stone-300 rounded-xl px-4 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button type="submit" disabled={loading || !q.trim()} className="bg-amber-700 hover:bg-amber-800 disabled:bg-amber-100 disabled:text-amber-400 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
          {loading ? "מחפש..." : "חפש"}
        </button>
      </form>
      {error && <p className="text-red-500 text-sm">שגיאה בחיפוש</p>}
      {full && <p className="text-xs text-amber-700 mb-2">הרשימה מלאה ({CUSTOM_MAX}). הסירו פריט כדי להוסיף אחר.</p>}
      {result && (
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
          {result.candidates.length === 0 && <p className="text-sm text-stone-500 px-4 py-3">לא נמצאה מילה או שורש בשם ״{result.q}״.</p>}
          {result.candidates.map((c) => {
            const added = chosen.includes(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-stone-800">{c.label}</span>
                    <span className="text-[11px] rounded bg-stone-100 text-stone-600 px-1.5 py-0.5">{KIND_TAG[c.kind]}</span>
                    {c.pos && <span className="text-[11px] text-stone-500">{c.pos}</span>}
                    {c.sub && <span className="text-xs text-stone-400 truncate" dir="auto">{c.sub}</span>}
                  </div>
                  <p className="text-xs text-stone-500">
                    {c.counts.tanakh.toLocaleString("he-IL")} בתנ״ך · דירוג #{c.rank.toLocaleString("he-IL")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(c.id)}
                  disabled={added || full}
                  className="shrink-0 text-sm border border-amber-300 text-amber-800 rounded-lg px-3 py-1 hover:bg-amber-50 disabled:border-stone-200 disabled:text-stone-400 disabled:hover:bg-transparent"
                >
                  {added ? "נוסף ✓" : "+ הוסף"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
