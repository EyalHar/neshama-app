"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { collect } from "@/lib/notebook";
import type { ChiasmVerse, RepeatGroup, RepeatKind, VersePatterns } from "@/lib/versePatternsShared";
import { PATTERN_TABS, type PatternTab } from "./tabs";

const LABELS: Record<PatternTab, string> = { chiasm: "מבנה הפוך (כיאזמוס)", repeats: "קריאה כפולה" };

export default function VersePatternsTabs({ initial }: { initial: PatternTab }) {
  const [tab, setTab] = useState(initial);
  const [data, setData] = useState<VersePatterns | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/verse-patterns")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData, () => setError(true));
  }, []);

  function select(t: PatternTab) {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }

  return (
    <>
      <div className="flex gap-1 sm:gap-2 mb-6 border-b border-stone-200 overflow-x-auto overflow-y-hidden" role="tablist">
        {PATTERN_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => select(t)}
            className={`px-3 sm:px-5 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
              tab === t ? "border-amber-600 text-amber-700 bg-amber-50" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm">שגיאה בטעינה</p>}
      {!data && !error && <p className="text-stone-400 text-sm py-6 text-center">סורק את התנ״ך...</p>}
      {data && tab === "chiasm" && <Chiasms items={data.chiasms} />}
      {data && tab === "repeats" && <Repeats groups={data.repeats} />}
    </>
  );
}

function AddToNotebook({ text, source, href }: { text: string; source: string; href: string }) {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <button
      type="button"
      title="הוסף לדף במחברת"
      onClick={() => collect({ text, source: { source, href, attribution: null } })}
      className="text-sm text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-0.5 transition-colors"
    >
      📝 הוסף למחברת
    </button>
  );
}

function Words({ words, styleOf }: { words: string[]; styleOf: (i: number) => string | null }) {
  return (
    <>
      {words.map((w, i) => {
        const s = styleOf(i);
        return (
          <span key={i}>
            {i > 0 && " "}
            {s ? <span className={`rounded px-0.5 ${s}`}>{w}</span> : w}
          </span>
        );
      })}
    </>
  );
}

// ---- Chiasm ----

const LEVEL_STYLE = ["bg-amber-200 text-amber-950", "bg-sky-200 text-sky-950", "bg-emerald-200 text-emerald-950", "bg-violet-200 text-violet-950"];
const LEVEL_NAME = ["א", "ב", "ג", "ד"];
const TWO_PAIR_STEP = 40;

function Chiasms({ items }: { items: ChiasmVerse[] }) {
  const strong = items.filter((c) => c.pairs.length >= 3);
  const two = items.filter((c) => c.pairs.length === 2);
  const [shown, setShown] = useState(TWO_PAIR_STEP);
  return (
    <div>
      <p className="text-stone-500 text-sm mb-3 leading-relaxed">
        פסוקים שבהם מילים חוזרות בסדר הפוך: א־ב־ג ואז ג־ב־א. כמו ״<b>שֹׁפֵךְ דַּם הָאָדָם</b> בָּאָדָם דָּמוֹ יִשָּׁפֵךְ״
        (בראשית ט, ו), שבו המעשה והעונש משקפים זה את זה. כל זוג צבוע בצבע משלו, מבחוץ פנימה.
      </p>
      <p className="text-xs text-stone-400 mb-6 leading-relaxed">
        נספרים רק שמות עצם, פעלים ותארים (מילות יחס וקישור מדולגות), והמילים חייבות לחזור בדיוק בסדר הפוך. מבנים הפוכים
        שאינם מושלמים, או שנפרשים על פני כמה פסוקים, לא נמצאים כאן.
      </p>
      <h3 className="text-lg font-semibold text-stone-700 mb-3">שלושה זוגות ({strong.length})</h3>
      <div className="flex flex-col gap-3 mb-10">
        {strong.map((c) => <ChiasmCard key={c.ref} c={c} />)}
      </div>
      <h3 className="text-lg font-semibold text-stone-700 mb-3">שני זוגות ({two.length})</h3>
      <div className="flex flex-col gap-3">
        {two.slice(0, shown).map((c) => <ChiasmCard key={c.ref} c={c} />)}
      </div>
      {shown < two.length && (
        <button type="button" onClick={() => setShown((s) => s + TWO_PAIR_STEP)} className="mt-4 w-full border-2 border-amber-600 text-amber-700 hover:bg-amber-50 font-medium py-2.5 rounded-xl transition-colors">
          הצג עוד ({two.length - shown})
        </button>
      )}
    </div>
  );
}

function ChiasmCard({ c }: { c: ChiasmVerse }) {
  const level = new Map<number, number>();
  c.pairs.forEach(([a, b], k) => {
    level.set(a, k);
    level.set(b, k);
  });
  const ladder = c.pairs.map(([a, b], k) => `${LEVEL_NAME[k]}: ${c.words[a]} ↔ ${c.words[b]}`).join(" · ");
  return (
    <article className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
      <p data-collect-source={c.ref} data-collect-href={c.href} className="text-stone-800 text-lg leading-loose">
        <Words words={c.words} styleOf={(i) => (level.has(i) ? LEVEL_STYLE[level.get(i)! % LEVEL_STYLE.length] : i === c.center ? "underline decoration-2 decoration-stone-400" : null)} />
      </p>
      <div className="flex flex-wrap gap-1.5 my-2">
        {c.pairs.map(([a, b], k) => (
          <span key={k} className={`text-xs rounded-md px-2 py-0.5 ${LEVEL_STYLE[k % LEVEL_STYLE.length]}`}>
            {LEVEL_NAME[k]}: {c.words[a]} ↔ {c.words[b]}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Link href={c.href} className="text-xs text-amber-700 hover:underline">{c.ref} ←</Link>
        <AddToNotebook text={`מבנה הפוך: ${ladder}\n\n${c.words.join(" ")} (${c.ref})`} source={c.ref} href={c.href} />
      </div>
    </article>
  );
}

// ---- Repeats ----

// The four calls from heaven that double a name; Rashi: "לשון חבה הוא, שכופל את שמו" (Gen 22:11)
const CALLS = ["Genesis 22:11", "Genesis 46:2", "Exodus 3:4", "I Samuel 3:10"];
const KINDS: { id: RepeatKind | "all"; label: string }[] = [
  { id: "all", label: "הכול" },
  { id: "name", label: "שמות" },
  { id: "noun", label: "שמות עצם ותארים" },
  { id: "verb", label: "פעלים" },
  { id: "other", label: "אחר" },
];

function Repeats({ groups }: { groups: RepeatGroup[] }) {
  const [kind, setKind] = useState<RepeatKind | "all">("all");
  const calls = groups.flatMap((g) => g.hits.filter((h) => CALLS.includes(`${h.book} ${h.chapter}:${h.verse}`)));
  const shown = kind === "all" ? groups : groups.filter((g) => g.kind === kind);
  return (
    <div>
      <p className="text-stone-500 text-sm mb-5 leading-relaxed">
        מילה שנאמרת פעמיים, או שלוש, ברצף: באותיות ובאותו שורש. ״קָדוֹשׁ קָדוֹשׁ קָדוֹשׁ״, ״סָבִיב סָבִיב״, ״מְאֹד מְאֹד״.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <h3 className="font-semibold text-amber-900 mb-1">קריאה בשם פעמיים</h3>
        <p className="text-sm text-amber-900/80 mb-3">
          ״אַבְרָהָם אַבְרָהָם – לשון חבה הוא, שכופל את שמו״ (רש״י, בראשית כב, יא).
        </p>
        <div className="flex flex-col gap-3">
          {calls.map((h) => (
            <div key={h.ref}>
              <p data-collect-source={h.ref} data-collect-href={h.href} className="text-stone-800 text-lg leading-loose">
                <Words words={h.words} styleOf={(i) => (i >= h.at[0] && i <= h.at[1] ? "bg-amber-200 text-amber-950 font-bold" : null)} />
              </p>
              <Link href={h.href} className="text-xs text-amber-700 hover:underline">{h.ref} ←</Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            aria-pressed={kind === k.id}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${kind === k.id ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
          >
            {k.label} ({k.id === "all" ? groups.length : groups.filter((g) => g.kind === k.id).length})
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {shown.map((g) => <RepeatRow key={g.word + g.times + g.kind} g={g} />)}
      </div>
    </div>
  );
}

function RepeatRow({ g }: { g: RepeatGroup }) {
  const [open, setOpen] = useState(false);
  const phrase = Array(g.times).fill(g.word).join(" ");
  return (
    <div className="bg-white border border-stone-200 rounded-xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start hover:bg-stone-50 rounded-xl">
        <span className="text-stone-800 text-lg font-semibold">{phrase}</span>
        <span className="text-sm text-stone-400">
          {g.hits.length === 1 ? g.hits[0].ref : `${g.hits.length} פסוקים`} {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-stone-100 pt-3 flex flex-col gap-3">
          {g.hits.map((h) => (
            <div key={h.ref + h.at[0]}>
              <p data-collect-source={h.ref} data-collect-href={h.href} className="text-stone-800 text-lg leading-loose">
                <Words words={h.words} styleOf={(i) => (i >= h.at[0] && i <= h.at[1] ? "bg-amber-200 text-amber-950 font-bold" : null)} />
              </p>
              <div className="flex items-center gap-2">
                <Link href={h.href} className="text-xs text-amber-700 hover:underline">{h.ref} ←</Link>
                <AddToNotebook text={`${h.words.join(" ")} (${h.ref})`} source={h.ref} href={h.href} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
