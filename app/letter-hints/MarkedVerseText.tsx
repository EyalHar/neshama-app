import Link from "next/link";
import { splitGraphemes } from "@/lib/hebrewLetters";
import type { MarkedVerse } from "@/lib/letterHintsShared";

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

const readerHref = (v: MarkedVerse) => `/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`;

export default function MarkedVerseText({ v }: { v: MarkedVerse }) {
  return (
    <div>
      <p data-collect-source={v.ref} data-collect-href={readerHref(v)} className="text-stone-800 text-lg leading-loose">
        <MarkedWords words={v.words} marks={v.marks} />
      </p>
      <Link href={readerHref(v)} className="text-xs text-amber-700 hover:underline">{v.ref} ←</Link>
    </div>
  );
}
