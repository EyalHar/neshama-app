import type { ReactNode } from "react";
import type { SpecialLetterMark } from "@/lib/tanakh";
import { SPECIAL_LETTER_CLASS, SPECIAL_LETTER_KINDS } from "@/lib/special-letters";

const LABEL = Object.fromEntries(SPECIAL_LETTER_KINDS.map((k) => [k.kind, k.label]));

export default function SpecialLetterText({ text, marks }: { text: string; marks: SpecialLetterMark[] }) {
  if (marks.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let pos = 0;
  [...marks].sort((a, b) => a.start - b.start).forEach((m, i) => {
    parts.push(text.slice(pos, m.start));
    parts.push(
      <span key={i} className={SPECIAL_LETTER_CLASS[m.kind]} title={LABEL[m.kind]}>
        {text.slice(m.start, m.end)}
      </span>
    );
    pos = m.end;
  });
  parts.push(text.slice(pos));
  return <>{parts}</>;
}
