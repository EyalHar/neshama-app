"use client";

import { useState } from "react";
import Link from "next/link";
import { splitGraphemes } from "@/lib/hebrewLetters";
import type { MarkedVerse, PairHit } from "@/lib/letterHintsShared";
import { CollectButton } from "./common";

const FINAL: Record<string, string> = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" };

// A normalized query shown as a word again: "שלומ" → "שלום"
export const withFinal = (s: string) => s.slice(0, -1) + (FINAL[s.at(-1) ?? ""] ?? s.slice(-1));

// The marked words of the verses, in text order, and each marked letter with its word
export function markedWords(verses: MarkedVerse[]): { word: string; letter: string }[] {
  return verses.flatMap((v) =>
    [...v.marks]
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .map(([w, k]) => ({ word: v.words[w], letter: splitGraphemes(v.words[w])[k]?.letter ?? "" }))
  );
}

export const versesText = (verses: MarkedVerse[]) => verses.map((v) => `${v.words.join(" ")} (${v.ref})`).join("\n\n");

export function MarkedWords({ words, marks }: { words: string[]; marks: [number, number][] }) {
  const byWord = new Map<number, Set<number>>();
  for (const [w, k] of marks) {
    if (!byWord.has(w)) byWord.set(w, new Set());
    byWord.get(w)!.add(k);
  }
  return (
    <>
      {words.map((word, i) => {
        const marked = byWord.get(i);
        return (
          <span key={i}>
            {i > 0 && " "}
            {!marked
              ? word
              : splitGraphemes(word).map((g, k) =>
                  marked.has(k) ? (
                    <span key={k} className="text-amber-700 font-bold bg-amber-100 rounded-sm">{g.letter + g.marks}</span>
                  ) : (
                    <span key={k}>{g.letter + g.marks}</span>
                  )
                )}
          </span>
        );
      })}
    </>
  );
}

export const readerHref = (v: MarkedVerse) => `/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`;

export default function MarkedVerseText({ v }: { v: MarkedVerse }) {
  return (
    <div>
      <p data-collect-source={v.ref} data-collect-href={readerHref(v)} className="text-stone-800 text-lg leading-loose">
        <MarkedWords words={v.words} marks={v.marks} />
      </p>
      <div className="flex items-center gap-2">
        <Link href={readerHref(v)} className="text-xs text-amber-700 hover:underline">{v.ref} ←</Link>
        <CollectButton text={v.words.join(" ")} source={v.ref} href={readerHref(v)} title="הוסף פסוק לדף במחברת" />
      </div>
    </div>
  );
}

// Two words that mirror each other (atbash, reversed letters), with every verse holding both:
// one card per pair, rarest pairs first (the frequent ones, אביו/ויבא, are mostly grammar)
export function PairGroups({ pairs, sign }: { pairs: PairHit[]; sign: string }) {
  const groups = new Map<string, PairHit[]>();
  for (const p of pairs) {
    const key = `${p.a}|${p.b}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const sorted = [...groups.values()].sort((x, y) => x.length - y.length);
  return (
    <div className="grid gap-3">
      {sorted.map((g) => <PairGroup key={g[0].a + g[0].b} hits={g} sign={sign} />)}
    </div>
  );
}

function PairGroup({ hits, sign }: { hits: PairHit[]; sign: string }) {
  const [open, setOpen] = useState(false);
  const shown = open ? hits : hits.slice(0, 1);
  return (
    <article className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
      <p className="font-bold text-amber-800 mb-1 text-lg">
        {hits[0].a} <span className="text-stone-400 font-normal">{sign}</span> {hits[0].b}
        {hits.length > 1 && <span className="text-xs font-normal text-stone-400 ms-2">{hits.length} פסוקים</span>}
      </p>
      <div className="flex flex-col gap-3">
        {shown.map((p) => <MarkedVerseText key={p.verse.ref} v={p.verse} />)}
      </div>
      {hits.length > 1 && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm text-amber-700 hover:underline mt-2">
          {open ? "הסתר" : `ועוד ${hits.length - 1} פסוקים`}
        </button>
      )}
    </article>
  );
}
