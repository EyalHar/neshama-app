import type { ReactNode } from "react";
import type { SpecialLetterKind, SpecialLetterMark } from "@/lib/tanakh";
import { SPECIAL_LETTER_CLASS, SPECIAL_LETTER_KINDS } from "@/lib/special-letters";

const LABEL = Object.fromEntries(SPECIAL_LETTER_KINDS.map((k) => [k.kind, k.label]));
const HIGHLIGHT_CLASS = "bg-yellow-200/80 rounded-sm";
const WORD_CLASS = "rounded-sm transition-colors hover:bg-amber-200/70";
const WORD_RE = /[^\s־]+/g;

type Range = { start: number; end: number };

// Ranges of the words in `text` whose unpointed letters match one of `forms`.
// Words are split on spaces and maqaf, so "עַל־גָּחוֹן" yields two words.
export function findWordRanges(text: string, forms: Set<string>): Range[] {
  if (forms.size === 0) return [];
  const ranges: Range[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    if (forms.has(m[0].replace(/[^א-ת]/g, ""))) ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

// Renders a verse with special letters (letter-level spans) and highlighted words
// (word-level spans) layered together: the text is cut at every boundary of either.
// With `words`, each word (split like findWordRanges) is also wrapped in a `data-word`
// span, which the gematria overlay hovers over.
export default function VerseText({
  text,
  marks = [],
  highlights = [],
  words = false,
}: {
  text: string;
  marks?: SpecialLetterMark[];
  highlights?: Range[];
  words?: boolean;
}) {
  if (marks.length === 0 && highlights.length === 0 && !words) return <>{text}</>;

  const wordRanges = words
    ? [...text.matchAll(WORD_RE)].filter((m) => /[א-ת]/.test(m[0])).map((m) => ({ start: m.index, end: m.index + m[0].length }))
    : [];

  const cuts = new Set([0, text.length]);
  for (const r of [...marks, ...highlights, ...wordRanges]) { cuts.add(r.start); cuts.add(r.end); }
  const points = [...cuts].sort((a, b) => a - b);

  function pieces(from: number, to: number): ReactNode[] {
    const parts: ReactNode[] = [];
    const inside = points.filter((p) => p >= from && p <= to);
    for (let i = 0; i < inside.length - 1; i++) {
      const [start, end] = [inside[i], inside[i + 1]];
      const piece = text.slice(start, end);
      const kind: SpecialLetterKind | undefined = marks.find((m) => m.start <= start && end <= m.end)?.kind;
      const lit = highlights.some((h) => h.start <= start && end <= h.end);
      if (!kind && !lit) { parts.push(piece); continue; }
      parts.push(
        <span
          key={start}
          className={[kind && SPECIAL_LETTER_CLASS[kind], lit && HIGHLIGHT_CLASS].filter(Boolean).join(" ")}
          title={kind ? LABEL[kind] : undefined}
        >
          {piece}
        </span>
      );
    }
    return parts;
  }

  if (!words) return <>{pieces(0, text.length)}</>;

  const parts: ReactNode[] = [];
  let pos = 0;
  for (const w of wordRanges) {
    parts.push(...pieces(pos, w.start));
    parts.push(
      <span key={`w${w.start}`} data-word="" className={WORD_CLASS}>
        {pieces(w.start, w.end)}
      </span>
    );
    pos = w.end;
  }
  parts.push(...pieces(pos, text.length));
  return <>{parts}</>;
}
