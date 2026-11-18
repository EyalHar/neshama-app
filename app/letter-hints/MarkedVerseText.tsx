"use client";

import Link from "next/link";
import { splitGraphemes } from "@/lib/hebrewLetters";
import type { MarkedVerse } from "@/lib/letterHintsShared";
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
