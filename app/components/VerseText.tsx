import type { ReactNode } from "react";
import type { SpecialLetterKind, SpecialLetterMark } from "@/lib/tanakh";
import { SPECIAL_LETTER_CLASS, SPECIAL_LETTER_KINDS } from "@/lib/special-letters";

const LABEL = Object.fromEntries(SPECIAL_LETTER_KINDS.map((k) => [k.kind, k.label]));
const HIGHLIGHT_CLASS = "bg-yellow-200/80 rounded-sm";

type Range = { start: number; end: number };

// Ranges of the words in `text` whose unpointed letters match one of `forms`.
// Words are split on spaces and maqaf, so "עַל־גָּחוֹן" yields two words.
export function findWordRanges(text: string, forms: Set<string>): Range[] {
  if (forms.size === 0) return [];
  const ranges: Range[] = [];
  for (const m of text.matchAll(/[^\s־]+/g)) {
    if (forms.has(m[0].replace(/[^א-ת]/g, ""))) ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

// Renders a verse with special letters (letter-level spans) and highlighted words
// (word-level spans) layered together: the text is cut at every boundary of either.
export default function VerseText({
  text,
  marks = [],
  highlights = [],
}: {
  text: string;
  marks?: SpecialLetterMark[];
  highlights?: Range[];
}) {
  if (marks.length === 0 && highlights.length === 0) return <>{text}</>;

  const cuts = new Set([0, text.length]);
  for (const r of [...marks, ...highlights]) { cuts.add(r.start); cuts.add(r.end); }
  const points = [...cuts].sort((a, b) => a - b);

  const parts: ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [start, end] = [points[i], points[i + 1]];
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
  return <>{parts}</>;
}
