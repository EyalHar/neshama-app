"use client";

import { useState } from "react";
import Link from "next/link";
import type { ShownVerse } from "@/lib/middot";
import type { Mood, MoodId } from "@/lib/uplifting";

export type ShownUplifting = ShownVerse & { mood: MoodId; note: string };

// One tint per mood (static class names, so Tailwind keeps them). The mood is always named in text
// beside its color.
const TINT: Record<MoodId, { chip: string; active: string; mark: string; bar: string; soft: string }> = {
  joy: { chip: "border-amber-200 text-amber-800", active: "bg-amber-500 border-amber-500 text-white", mark: "text-amber-700", bar: "bg-amber-400", soft: "from-amber-50" },
  happiness: { chip: "border-orange-200 text-orange-800", active: "bg-orange-500 border-orange-500 text-white", mark: "text-orange-700", bar: "bg-orange-400", soft: "from-orange-50" },
  hope: { chip: "border-sky-200 text-sky-800", active: "bg-sky-600 border-sky-600 text-white", mark: "text-sky-700", bar: "bg-sky-400", soft: "from-sky-50" },
  faith: { chip: "border-violet-200 text-violet-800", active: "bg-violet-600 border-violet-600 text-white", mark: "text-violet-700", bar: "bg-violet-400", soft: "from-violet-50" },
  inspiration: { chip: "border-emerald-200 text-emerald-800", active: "bg-emerald-600 border-emerald-600 text-white", mark: "text-emerald-700", bar: "bg-emerald-400", soft: "from-emerald-50" },
  awe: { chip: "border-indigo-200 text-indigo-800", active: "bg-indigo-600 border-indigo-600 text-white", mark: "text-indigo-700", bar: "bg-indigo-400", soft: "from-indigo-50" },
  wonder: { chip: "border-rose-200 text-rose-800", active: "bg-rose-500 border-rose-500 text-white", mark: "text-rose-700", bar: "bg-rose-400", soft: "from-rose-50" },
};

function Verse({ v, big = false }: { v: ShownUplifting; big?: boolean }) {
  const marked = new Set(v.marked);
  return (
    <p data-collect-source={v.ref} data-collect-href={v.href} className={`text-stone-800 ${big ? "text-2xl sm:text-3xl leading-[1.9]" : "text-xl leading-loose"}`}>
      {v.words.map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          {marked.has(i) ? <b className={`font-bold ${TINT[v.mood].mark}`}>{w}</b> : w}
        </span>
      ))}
    </p>
  );
}

export default function UpliftingView({ verses, moods, today }: { verses: ShownUplifting[]; moods: Mood[]; today: number }) {
  const [mood, setMood] = useState<MoodId | "all">("all");
  const [featured, setFeatured] = useState(today);
  const moodOf = (id: MoodId) => moods.find((m) => m.id === id)!;
  const shown = mood === "all" ? verses : verses.filter((v) => v.mood === mood);
  const hero = verses[featured];

  // Another verse, from the chosen mood when one is chosen, never the same one twice in a row
  function another() {
    const pool = verses.map((v, i) => ({ v, i })).filter(({ v, i }) => i !== featured && (mood === "all" || v.mood === mood));
    if (pool.length) setFeatured(pool[Math.floor(Math.random() * pool.length)].i);
  }

  return (
    <div className="flex flex-col gap-8">
      {hero && (
        <section className={`relative overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-bl ${TINT[hero.mood].soft} to-white p-6 sm:p-10 shadow-sm`} aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="text-sm text-stone-500">
              {featured === today ? "הפסוק של היום" : "פסוק אקראי"} · {moodOf(hero.mood).icon} {moodOf(hero.mood).label}
            </span>
            <button
              type="button"
              onClick={another}
              className="text-sm rounded-full border border-stone-300 bg-white/80 px-4 py-1.5 text-stone-700 hover:bg-white hover:border-stone-400 transition-colors"
            >
              עוד פסוק ↻
            </button>
          </div>
          <Verse v={hero} big />
          <p className="text-stone-600 mt-4">{hero.note}</p>
          <Link href={hero.href} className="inline-block mt-2 text-sm text-amber-700 hover:underline">
            {hero.ref} ←
          </Link>
        </section>
      )}

      <div>
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="סינון לפי תחושה">
          <button
            type="button"
            onClick={() => setMood("all")}
            aria-pressed={mood === "all"}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              mood === "all" ? "bg-stone-800 border-stone-800 text-white" : "border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            הכול <span className="opacity-70">{verses.length}</span>
          </button>
          {moods.map((m) => {
            const count = verses.filter((v) => v.mood === m.id).length;
            const active = mood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMood(m.id)}
                aria-pressed={active}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${active ? TINT[m.id].active : `${TINT[m.id].chip} bg-white hover:bg-stone-50`}`}
              >
                <span aria-hidden>{m.icon}</span> {m.label} <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        {mood !== "all" && <p className="text-stone-500 text-sm">{moodOf(mood).intro}</p>}
      </div>

      <ol className="grid gap-4 md:grid-cols-2">
        {shown.map((v) => (
          <li key={v.href} className="relative bg-white border border-stone-200 rounded-2xl p-5 pr-6 flex flex-col gap-2 shadow-sm">
            <span aria-hidden className={`absolute right-0 top-4 bottom-4 w-1 rounded-l-full ${TINT[v.mood].bar}`} />
            <span className="text-xs text-stone-500">
              {moodOf(v.mood).icon} {moodOf(v.mood).label}
            </span>
            <Verse v={v} />
            <p className="text-stone-600 text-sm leading-relaxed">{v.note}</p>
            <Link href={v.href} className="self-start text-sm text-amber-700 hover:underline">
              {v.ref} ←
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
