"use client";

import { useState } from "react";
import Link from "next/link";
import { relLabel, sefariaUrl, type TimelineEvent } from "@/lib/timeline";

export type ShownEvent = TimelineEvent & { ref: string; mapHref: string; readerHref: string };
type Mode = "text" | "tradition";
type Range = { lo: number; hi: number; label: string };

const MODES: { id: Mode; label: string; title: string }[] = [
  { id: "text", label: "לפי הכתוב בלבד", title: "רק שנים שהפסוקים עצמם נותנים: שני צירים נפרדים" },
  { id: "tradition", label: "בצירוף המסורת", title: "ציר אחד: הפער בין יוסף ליציאת מצרים נסגר לפי רש״י וסדר עולם" },
];

const CREATION_RANGES: Range[] = [
  { lo: 0, hi: 2320, label: "הכול" },
  { lo: 0, hi: 1660, label: "מאדם עד המבול" },
  { lo: 1650, hi: 2130, label: "מנח עד אברהם" },
  { lo: 1940, hi: 2320, label: "האבות ויוסף" },
];
const EXODUS_RANGES: Range[] = [
  { lo: -84, hi: 41, label: "הכול" },
  { lo: -1, hi: 41, label: "שנות המדבר" },
];
const TRADITION_RANGES: Range[] = [
  { lo: 0, hi: 2490, label: "הכול" },
  ...CREATION_RANGES.slice(1),
  { lo: 2360, hi: 2490, label: "משה ושנות המדבר" },
];

const span = (e: ShownEvent, axis: "am" | "rel") => {
  const v = axis === "am" ? e.am : e.rel!;
  return { from: v.from, to: v.to ?? v.from };
};

export default function TimelineView({ events, exodusAm, initialMode }: { events: ShownEvent[]; exodusAm: number; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  function choose(m: Mode) {
    setMode(m);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", m);
    window.history.replaceState(null, "", url);
  }
  const textOnly = events.filter((e) => e.source === "text");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-stone-200 overflow-hidden text-sm" role="radiogroup" aria-label="מקור השנים">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              title={m.title}
              onClick={() => choose(m.id)}
              className={`px-3 py-1.5 transition-colors ${mode === m.id ? "bg-amber-600 text-white" : "bg-white text-stone-600 hover:bg-stone-100"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <Legend tradition={mode === "tradition"} />
      </div>

      {mode === "text" ? (
        <>
          <Panel
            title="מבריאת העולם ועד מות יוסף"
            caption="השנה לבריאת העולם, לפי גיל האב בהולדת בנו ושנות החיים שבפסוקים"
            events={textOnly.filter((e) => e.axis === "creation")}
            axis="am"
            ranges={CREATION_RANGES}
          />
          <Gap />
          <Panel
            title="מיציאת מצרים ועד מות משה"
            caption="שנים מיציאת מצרים (0 = שנת היציאה), לפי התאריכים שבפסוקים"
            events={textOnly.filter((e) => e.axis === "exodus")}
            axis="rel"
            ranges={EXODUS_RANGES}
          />
        </>
      ) : (
        <Panel
          title="מבריאת העולם ועד מות משה"
          caption={`השנה לבריאת העולם. יציאת מצרים בשנת ${exodusAm}, לפי רש״י (שמות יב, מ) וסדר עולם: ארבע מאות שנה מהולדת יצחק`}
          events={events}
          axis="am"
          ranges={TRADITION_RANGES}
        />
      )}
    </div>
  );
}

function Legend({ tradition }: { tradition: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-6 h-2.5 rounded-full bg-amber-500" />
        מן הכתוב
      </span>
      {tradition && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-2.5 rounded-full bg-violet-200 border border-dashed border-violet-600" />
          לפי המסורת
        </span>
      )}
    </div>
  );
}

function Gap() {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600 leading-relaxed">
      <p className="font-semibold text-stone-700 mb-1">פער: ממות יוסף עד יציאת מצרים</p>
      הכתוב אינו נותן כאן מספר אחד. ״ועבדום וענו אתם ארבע מאות שנה״ (בראשית טו, יג), אבל ״ומושב בני ישראל אשר ישבו במצרים
      שלשים שנה וארבע מאות שנה״ (שמות יב, מ). שנות לוי, קהת ועמרם (137, 133, 137; שמות ו) מראות שהישיבה במצרים עצמה
      קצרה מזה, ולכן אין לחבר בין שני הצירים בלי פירוש. במצב ״בצירוף המסורת״ הפער נסגר לפי{" "}
      <a href={sefariaUrl("Rashi_on_Exodus.12.40")} target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">רש״י</a>
      : ארבע מאות שנה מהולדת יצחק, כלומר 210 שנה במצרים.
    </div>
  );
}

function niceStep(width: number): number {
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]) if (width / s <= 10) return s;
  return 1000;
}

function Panel({ title, caption, events, axis, ranges }: { title: string; caption: string; events: ShownEvent[]; axis: "am" | "rel"; ranges: Range[] }) {
  const [range, setRange] = useState(0);
  const { lo, hi } = ranges[range];
  // Time runs right to left, as the page reads
  const pos = (y: number) => ((Math.min(Math.max(y, lo), hi) - lo) / (hi - lo)) * 100;
  const step = niceStep(hi - lo);
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  const tickLabel = (t: number) => (axis === "rel" ? (t === 0 ? "היציאה" : String(t)) : String(t));

  const shown = events
    .filter((e) => {
      const s = span(e, axis);
      return s.to >= lo && s.from <= hi;
    })
    .sort((a, b) => span(a, axis).from - span(b, axis).from || span(a, axis).to - span(b, axis).to);

  const scale = (
    <div className="relative h-5 text-[11px] text-stone-400 tabular-nums" aria-hidden>
      {ticks.map((t) => (
        <span key={t} className="absolute translate-x-1/2 whitespace-nowrap" style={{ right: `${pos(t)}%` }} dir="ltr">
          {tickLabel(t)}
        </span>
      ))}
    </div>
  );

  return (
    <section className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-4 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold text-stone-800">{title}</h2>
        <span className="text-xs text-stone-400">{shown.length} קטעים</span>
      </div>
      <p className="text-xs text-stone-500 mb-3">{caption}</p>
      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="טווח">
        {ranges.map((r, i) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(i)}
            aria-pressed={range === i}
            className={`text-xs rounded-full px-3 py-1 border transition-colors ${
              range === i ? "bg-amber-100 border-amber-300 text-amber-900 font-semibold" : "border-stone-200 text-stone-600 hover:bg-stone-100"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="md:grid md:grid-cols-[minmax(14rem,22rem)_1fr] md:gap-x-4">
        <div className="hidden md:block" />
        <div className="hidden md:block">{scale}</div>
        <ol className="contents">
          {shown.map((e) => (
            <Row key={e.id} e={e} axis={axis} pos={pos} ticks={ticks} />
          ))}
        </ol>
        <div className="hidden md:block" />
        <div className="hidden md:block">{scale}</div>
      </div>
    </section>
  );
}

function Row({ e, axis, pos, ticks }: { e: ShownEvent; axis: "am" | "rel"; pos: (y: number) => number; ticks: number[] }) {
  const s = span(e, axis);
  const tradition = e.source === "tradition";
  const years = axis === "rel" ? relLabel(s.from) + (s.to !== s.from ? ` – ${relLabel(s.to)}` : "") : s.to !== s.from ? `${s.from}–${s.to}` : `שנת ${s.from}`;
  const right = pos(s.from), left = pos(s.to);
  const point = left - right < 0.8;
  const [open, setOpen] = useState(false);
  return (
    <li className="contents">
      <div className="pt-2 md:py-1 border-t border-stone-100 md:border-t-0">
        <Link href={e.mapHref} className="block text-sm font-medium text-stone-800 leading-snug hover:text-amber-800">
          {e.title}
        </Link>
        <span className="block text-[11px] text-stone-500 mt-0.5">
          <span className="tabular-nums">{years}</span>
          {axis === "am" && e.rel && <span className="text-stone-400"> · {relLabel(e.rel.from)}</span>}
          {e.date && <span> · {e.date}</span>}
          {" · "}
          <Link href={e.readerHref} className="text-amber-700 hover:underline">{e.ref}</Link>
          {" · "}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={`hover:underline ${tradition ? "text-violet-700 font-medium" : "text-stone-400"}`}
          >
            {tradition ? "לפי המסורת: המקור" : "איך יודעים?"}
          </button>
        </span>
        {open && (
          <div className="text-[11px] text-stone-600 mt-1 mb-1 leading-relaxed bg-stone-50 rounded-lg px-2 py-1.5">
            <p>
              {e.basis}
              {e.sefariaRef && (
                <>
                  {" "}
                  <a href={sefariaUrl(e.sefariaRef)} target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">
                    ({e.sefariaRef.startsWith("Seder_Olam_Rabbah") ? `סדר עולם רבה, פרק ${e.sefariaRef.split(".")[1]}` : e.sefariaRef})
                  </a>
                </>
              )}
            </p>
            {e.note && <p className="mt-0.5 text-violet-700">{e.note}</p>}
          </div>
        )}
      </div>
      <div className="relative h-6 md:h-auto md:min-h-[2.25rem] mb-1 md:mb-0">
        {ticks.map((t) => (
          <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-stone-100" style={{ right: `${pos(t)}%` }} />
        ))}
        <span
          title={`${e.title} · ${years}`}
          className={`absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full ${
            tradition ? "bg-violet-200 border border-dashed border-violet-600" : "bg-amber-500"
          } ${point ? "w-2.5 translate-x-1/2" : ""}`}
          style={point ? { right: `${right}%` } : { right: `${right}%`, width: `${left - right}%`, minWidth: "0.625rem" }}
        />
      </div>
    </li>
  );
}
