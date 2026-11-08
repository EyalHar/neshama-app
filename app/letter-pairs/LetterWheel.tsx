"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ROOT_LETTERS, type RootListItem } from "@/lib/rootLetterPattern";

type Mode = "adjacent" | "any";

const SIZE = 420;
const C = SIZE / 2;
const LETTER_R = 182;
const CHORD_R = 162;

// Alphabet order around the circle, starting at the top and running right to left
function point(i: number, r: number) {
  const a = -Math.PI / 2 - (i * 2 * Math.PI) / ROOT_LETTERS.length;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

const POSITIONS: Record<Mode, [number, number][]> = {
  adjacent: [[0, 1], [1, 2]],
  any: [[0, 1], [1, 2], [0, 2]],
};

// The root positions where `first` comes before `second`, or null
function matchPositions(letters: string, first: string, second: string, mode: Mode): [number, number] | null {
  return POSITIONS[mode].find(([i, j]) => letters[i] === first && letters[j] === second) ?? null;
}

const pairKey = (a: string, b: string) => (ROOT_LETTERS.indexOf(a) < ROOT_LETTERS.indexOf(b) ? a + b : b + a);

function RootRow({ root, at }: { root: RootListItem; at: [number, number] }) {
  return (
    <li className="py-2 flex items-start gap-3">
      <Link
        href={`/advanced?tab=root&root=${encodeURIComponent(root.plain)}`}
        className="text-xl font-bold text-stone-800 hover:text-amber-700 shrink-0 w-14 tracking-wide"
        title="חיפוש השורש בתנ״ך"
      >
        {[...root.plain].map((ch, i) => (
          <span key={i} className={at.includes(i) ? "text-amber-700" : undefined}>{ch}</span>
        ))}
      </Link>
      <p className="flex-1 min-w-0 text-xs text-stone-500 text-left leading-snug pt-1" dir="ltr">{root.definition}</p>
      <span className="text-xs text-stone-400 shrink-0 pt-1">{root.count}</span>
    </li>
  );
}

function Direction({ title, roots }: { title: string; roots: { root: RootListItem; at: [number, number] }[] }) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-stone-700 mb-1">
        {title} <span className="text-stone-400 font-normal">· {roots.length}</span>
      </h3>
      {roots.length === 0 ? (
        <p className="text-sm text-stone-400 py-2">אין שורשים</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {roots.map((r) => <RootRow key={r.root.letters} root={r.root} at={r.at} />)}
        </ul>
      )}
    </div>
  );
}

export default function LetterWheel() {
  const [roots, setRoots] = useState<RootListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<Mode>("adjacent");
  const [first, setFirst] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/letter-pairs")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRoots(d.roots))
      .catch(() => setError(true));
  }, []);

  // Number of distinct roots per gate (unordered pair), in the current mode
  const gateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of roots ?? []) {
      const gates = new Set<string>();
      for (const [i, j] of POSITIONS[mode]) {
        if (r.letters[i] !== r.letters[j]) gates.add(pairKey(r.letters[i], r.letters[j]));
      }
      for (const g of gates) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return counts;
  }, [roots, mode]);
  const maxCount = Math.max(1, ...gateCounts.values());
  const emptyGates = 231 - gateCounts.size;

  const sorted = useMemo(() => [...(roots ?? [])].sort((a, b) => b.count - a.count), [roots]);
  const inDirection = (a: string, b: string) =>
    sorted.flatMap((root) => {
      const at = matchPositions(root.letters, a, b, mode);
      return at ? [{ root, at }] : [];
    });

  function pick(letter: string) {
    if (letter === first) { setFirst(second); setSecond(null); return; }
    if (letter === second) { setSecond(null); return; }
    if (!first) setFirst(letter);
    else setSecond(letter);
  }

  function pickGate(a: string, b: string) {
    setFirst(a);
    setSecond(b);
  }

  const chords = [];
  for (let i = 0; i < ROOT_LETTERS.length; i++) {
    for (let j = i + 1; j < ROOT_LETTERS.length; j++) {
      const [a, b] = [ROOT_LETTERS[i], ROOT_LETTERS[j]];
      const count = gateCounts.get(a + b) ?? 0;
      if (!count) continue;
      const touches = first === a || first === b;
      const selected = touches && second !== null && (second === a || second === b);
      const dim = first !== null && !touches;
      const p1 = point(i, CHORD_R);
      const p2 = point(j, CHORD_R);
      const t = count / maxCount;
      chords.push(
        <line
          key={a + b}
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          strokeLinecap="round"
          className={selected ? "stroke-amber-600" : touches ? "stroke-amber-500" : "stroke-stone-500"}
          strokeWidth={selected ? 3.5 : 0.4 + t * 2.4}
          strokeOpacity={selected ? 1 : dim ? 0.04 : touches ? 0.35 + t * 0.65 : 0.08 + t * 0.5}
        />
      );
    }
  }

  const firstGates = first
    ? ROOT_LETTERS.filter((l) => l !== first)
        .map((l) => ({ letter: l, count: gateCounts.get(pairKey(first, l)) ?? 0 }))
        .sort((x, y) => y.count - x.count)
    : [];

  if (error) return <p className="text-red-600 text-sm">טעינת השורשים נכשלה</p>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="w-full lg:w-[420px] shrink-0">
        <div className="flex gap-2 mb-3">
          {([["adjacent", "אותיות צמודות בשורש"], ["any", "בכל מקום בשורש"]] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                mode === m ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-700 hover:border-amber-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[420px] mx-auto block select-none" role="img" aria-label="גלגל 22 האותיות וצירופיהן">
          <circle cx={C} cy={C} r={CHORD_R} className="fill-white stroke-stone-200" />
          {roots && chords}
          {ROOT_LETTERS.map((l, i) => {
            const p = point(i, LETTER_R);
            const active = l === first || l === second;
            const count = first && l !== first ? gateCounts.get(pairKey(first, l)) ?? 0 : null;
            return (
              <g key={l} onClick={() => pick(l)} className="cursor-pointer" role="button" aria-label={l}>
                <circle
                  cx={p.x} cy={p.y} r={16}
                  className={active ? "fill-amber-700 stroke-amber-800" : count === 0 ? "fill-stone-100 stroke-stone-200" : "fill-white stroke-stone-300 hover:fill-amber-50"}
                />
                <text
                  x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                  className={`text-[17px] font-bold pointer-events-none ${active ? "fill-white" : count === 0 ? "fill-stone-300" : "fill-stone-700"}`}
                >
                  {l}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="text-xs text-stone-500 text-center mt-2">
          {roots
            ? `${roots.length.toLocaleString()} שורשי פועל תלת-עיצוריים · ${231 - emptyGates} שערים בשימוש · ${emptyGates} שערים ריקים`
            : "טוען שורשים…"}
        </p>
      </div>

      <div className="flex-1 min-w-0 w-full">
        {!first && (
          <p className="text-stone-500 text-sm bg-white border border-stone-200 rounded-2xl p-5">
            בחרו אות בגלגל כדי לראות את כל השערים שלה, ואז אות שנייה כדי לראות את השורשים.
          </p>
        )}

        {first && !second && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-stone-800 mb-3">השערים של {first}</h2>
            <div className="flex flex-wrap gap-2">
              {firstGates.map(({ letter, count }) => (
                <button
                  key={letter}
                  type="button"
                  disabled={!count}
                  onClick={() => pickGate(first, letter)}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-sm hover:border-amber-400 disabled:opacity-40 disabled:hover:border-stone-200"
                >
                  <span className="font-bold text-stone-800">{first}{letter}</span>
                  <span className="text-stone-400 text-xs mr-1.5">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {first && second && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-stone-800">
                השער {first}–{second}
              </h2>
              <button type="button" onClick={() => setSecond(null)} className="text-xs text-stone-500 hover:text-amber-700">
                ← כל השערים של {first}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Direction title={`פנים: ${first}${second}`} roots={inDirection(first, second)} />
              <Direction title={`אחור: ${second}${first}`} roots={inDirection(second, first)} />
            </div>
            <p className="text-xs text-stone-400 mt-4">
              המספר ליד כל שורש הוא מספר המופעים שלו בתנ״ך. לחיצה על שורש פותחת את החיפוש לפי שורש.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
