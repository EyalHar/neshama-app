"use client";

import { useEffect, useState } from "react";
import type { CompareItem, FreqCompare, FreqKind, FreqScope } from "@/lib/frequenciesShared";

// Rate per 1,000 words in each section of the Tanakh for its 10 most frequent words or roots.
// Sections differ in size (נביאים is almost twice the Torah), so raw counts would mislead.
// Colors: the first three categorical slots of the dataviz reference palette, validated all-pairs
// for color-vision deficiency; aqua is under 3:1 on the surface, so a legend and a table view ship too.

const SERIES: { scope: Exclude<FreqScope, "tanakh">; label: string; color: string }[] = [
  { scope: "torah", label: "תורה", color: "#2a78d6" },
  { scope: "nevi", label: "נביאים", color: "#eb6834" },
  { scope: "ketuvim", label: "כתובים", color: "#1baf7a" },
];

const rate = (item: CompareItem, totals: Record<FreqScope, number>, s: FreqScope) => (item.counts[s] / totals[s]) * 1000;
const fmt = (n: number) => n.toFixed(1);

// A "nice" axis maximum and its gridline step
function axis(max: number): { top: number; step: number } {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { top: Math.ceil(max / step) * step, step };
}

export default function CompareChart({ kind, contentOnly, what }: { kind: FreqKind; contentOnly: boolean; what: string }) {
  const url = `/api/frequencies/compare?kind=${kind}&content=${contentOnly ? 1 : 0}`;
  const [state, setState] = useState<{ url: string; data: FreqCompare | null; error: boolean }>({ url: "", data: null, error: false });
  const [asTable, setAsTable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
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
  }, [url]);

  const data = state.url === url ? state.data : null;

  return (
    <section className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-6" aria-label="השוואה בין חלקי התנ״ך">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-lg font-bold text-stone-800">השוואה בין חלקי התנ״ך: 10 {what}</h2>
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          aria-pressed={asTable}
          className="text-sm text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-0.5"
        >
          {asTable ? "הצג כגרף" : "הצג כטבלה"}
        </button>
      </div>
      <p className="text-xs text-stone-500 mb-4">מופעים לכל 1,000 מילים בכל חלק, כי החלקים שונים מאוד באורכם.</p>

      {state.url === url && state.error && <p className="text-red-500 text-sm">שגיאה בטעינה</p>}
      {!data && !(state.url === url && state.error) && <p className="text-stone-400 text-sm py-6 text-center">טוען...</p>}
      {data && (asTable ? <CompareTable data={data} /> : <Bars data={data} hover={hover} setHover={setHover} />)}
    </section>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-sm text-stone-700">
      {SERIES.map((s) => (
        <span key={s.scope} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} aria-hidden />
          {s.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-stone-500">
        <span className="w-0.5 h-3.5 bg-stone-500" aria-hidden />
        ממוצע התנ״ך
      </span>
    </div>
  );
}

function Bars({ data, hover, setHover }: { data: FreqCompare; hover: string | null; setHover: (k: string | null) => void }) {
  const max = Math.max(...data.items.flatMap((i) => SERIES.map((s) => rate(i, data.totals, s.scope))));
  const { top, step } = axis(max);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const pct = (v: number) => `${(v / top) * 100}%`;

  return (
    <>
      <Legend />
      <div className="grid grid-cols-[minmax(4.5rem,auto)_1fr] gap-x-3">
        {/* Axis labels over the plot column; the bars grow from the right, as Hebrew is read */}
        <div />
        <div className="relative h-5 text-[11px] text-stone-400 tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute" style={{ right: pct(t), transform: "translateX(50%)" }}>
              {t}
            </span>
          ))}
        </div>

        {data.items.map((item) => {
          const avg = rate(item, data.totals, "tanakh");
          const active = hover === item.key;
          return (
            <div key={item.key} className="contents">
              <div className={`flex items-center justify-end text-base font-semibold py-1.5 ${active ? "text-amber-800" : "text-stone-800"}`}>{item.label}</div>
              <div
                className={`relative py-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${active ? "bg-stone-50" : ""}`}
                tabIndex={0}
                aria-label={`${item.label}: ${SERIES.map((s) => `${s.label} ${fmt(rate(item, data.totals, s.scope))}`).join(", ")}, ממוצע התנ״ך ${fmt(avg)} לכל 1,000 מילים`}
                onPointerEnter={() => setHover(item.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(item.key)}
                onBlur={() => setHover(null)}
              >
                {ticks.map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-stone-100" style={{ right: pct(t) }} aria-hidden />
                ))}
                <div className="relative flex flex-col gap-[2px]">
                  {SERIES.map((s) => (
                    <div key={s.scope} className="h-[7px] rounded-l-[4px]" style={{ width: pct(rate(item, data.totals, s.scope)), background: s.color }} />
                  ))}
                </div>
                <span className="absolute inset-y-1 w-0.5 bg-stone-500" style={{ right: pct(avg) }} aria-hidden />
                {active && <Tooltip item={item} totals={data.totals} />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Tooltip({ item, totals }: { item: CompareItem; totals: Record<FreqScope, number> }) {
  return (
    <div className="absolute left-0 top-full z-10 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg px-3 py-2 text-sm min-w-48 pointer-events-none">
      <p className="font-bold text-stone-800 mb-1">{item.label}</p>
      {SERIES.map((s) => (
        <p key={s.scope} className="flex items-center gap-2 text-stone-700">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
          <b className="tabular-nums">{fmt(rate(item, totals, s.scope))}</b>
          <span className="text-stone-500">{s.label} · {item.counts[s.scope].toLocaleString("he-IL")} פעמים</span>
        </p>
      ))}
      <p className="text-stone-500 border-t border-stone-100 mt-1 pt-1">
        <b className="tabular-nums text-stone-700">{fmt(rate(item, totals, "tanakh"))}</b> בכל התנ״ך · {item.counts.tanakh.toLocaleString("he-IL")} פעמים
      </p>
    </div>
  );
}

function CompareTable({ data }: { data: FreqCompare }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-stone-500 border-b border-stone-200">
            <th className="text-start font-medium py-1.5 pe-3">מילה</th>
            {[...SERIES.map((s) => s.label), "כל התנ״ך"].map((l) => <th key={l} className="text-start font-medium py-1.5 px-2">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.key} className="border-b border-stone-100">
              <td className="py-1.5 pe-3 font-semibold text-stone-800">{item.label}</td>
              {(["torah", "nevi", "ketuvim", "tanakh"] as FreqScope[]).map((s) => (
                <td key={s} className="py-1.5 px-2 tabular-nums text-stone-700">
                  {fmt(rate(item, data.totals, s))}
                  <span className="block text-stone-400 text-xs">({item.counts[s].toLocaleString("he-IL")})</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-stone-400 mt-2">
        לכל 1,000 מילים, ובסוגריים מספר המופעים. מספר המילים: תורה {data.totals.torah.toLocaleString("he-IL")}, נביאים{" "}
        {data.totals.nevi.toLocaleString("he-IL")}, כתובים {data.totals.ketuvim.toLocaleString("he-IL")}.
      </p>
    </div>
  );
}
