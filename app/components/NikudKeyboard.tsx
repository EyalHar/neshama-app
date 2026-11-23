"use client";

import { useState, type RefObject } from "react";

type Kind = "vowel" | "dagesh" | "shinDot";

type Mark = { char: string; name: string; base: string; kind: Kind };

const MARKS: Mark[] = [
  { char: "ְ", name: "שווא", base: "ב", kind: "vowel" },
  { char: "ֱ", name: "חטף סגול", base: "א", kind: "vowel" },
  { char: "ֲ", name: "חטף פתח", base: "א", kind: "vowel" },
  { char: "ֳ", name: "חטף קמץ", base: "א", kind: "vowel" },
  { char: "ִ", name: "חיריק", base: "ב", kind: "vowel" },
  { char: "ֵ", name: "צירה", base: "ב", kind: "vowel" },
  { char: "ֶ", name: "סגול", base: "ב", kind: "vowel" },
  { char: "ַ", name: "פתח", base: "ב", kind: "vowel" },
  { char: "ָ", name: "קמץ", base: "ב", kind: "vowel" },
  { char: "ׇ", name: "קמץ קטן", base: "כ", kind: "vowel" },
  { char: "ֹ", name: "חולם", base: "ב", kind: "vowel" },
  { char: "ֺ", name: "חולם חסר (על ו)", base: "ו", kind: "vowel" },
  { char: "ֻ", name: "קובוץ", base: "ב", kind: "vowel" },
  { char: "ּ", name: "דגש / שורוק", base: "ב", kind: "dagesh" },
  { char: "ׁ", name: "שי״ן ימנית", base: "ש", kind: "shinDot" },
  { char: "ׂ", name: "שי״ן שמאלית", base: "ש", kind: "shinDot" },
];

const KIND_OF = new Map(MARKS.map((m) => [m.char, m.kind]));
const isLetter = (c: string) => c >= "א" && c <= "ת";
// Points and accents that sit on a letter (not maqaf, paseq, sof pasuq or inverted nun)
const MARK_CLASS = "[\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7]";
const MARK = new RegExp(MARK_CLASS);
const MARK_RUN = new RegExp(`${MARK_CLASS}+`, "g");
const isMark = (c: string) => MARK.test(c);
// Order within a letter as in the Tanakh text: shin/sin dot, dagesh, then the vowel
const RANK: Record<Kind, number> = { shinDot: 0, dagesh: 1, vowel: 2 };
const rank = (c: string) => {
  const kind = KIND_OF.get(c);
  return kind ? RANK[kind] : 3;
};
const byRank = (a: string, b: string) => rank(a) - rank(b);

// Puts every letter's marks in the text's order, whatever order they were typed in, so an
// exact-nikud comparison doesn't fail on בְּ typed as ב + sheva + dagesh
export function sortMarks(s: string): string {
  return s.replace(MARK_RUN, (run) => [...run].sort(byRank).join(""));
}

// The letter the caret is on: the one before it, also when the caret sits between a letter and its marks
function clusterAt(value: string, caret: number) {
  let end = caret;
  while (end < value.length && isMark(value[end])) end++;
  let start = end;
  while (start > 0 && isMark(value[start - 1])) start--;
  if (start === 0 || !isLetter(value[start - 1])) return null;
  return { letter: start - 1, start, end };
}

function addMark(letter: string, marks: string[], mark: Mark): string[] | null {
  if (mark.kind === "shinDot" && letter !== "ש") return null;
  if (marks.includes(mark.char)) return marks;
  const kept = mark.kind === "dagesh" ? marks : marks.filter((c) => KIND_OF.get(c) !== mark.kind);
  return [...kept, mark.char].sort(byRank);
}

export function NikudToggle({ open, onToggle, controls }: { open: boolean; onToggle: () => void; controls: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      title="מקלדת ניקוד"
      className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
        open
          ? "border-amber-500 bg-amber-50 text-amber-800"
          : "border-stone-300 bg-white text-stone-600 hover:border-amber-400 hover:text-amber-800"
      }`}
    >
      <span aria-hidden="true">⌨</span> ניקוד
    </button>
  );
}

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

// Nikud buttons that write into `inputRef` at its caret, on the letter before it
export default function NikudKeyboard({ inputRef, value, onChange, id }: Props) {
  const [hint, setHint] = useState("");

  function edit(e: React.MouseEvent, change: (letter: string, marks: string[]) => string[] | null, noLetterHint: string) {
    const el = inputRef.current;
    if (!el) return;
    const cluster = clusterAt(value, el.selectionEnd ?? value.length);
    if (!cluster) {
      setHint(noLetterHint);
      return;
    }
    const marks = change(value[cluster.letter], [...value.slice(cluster.start, cluster.end)]);
    if (!marks) {
      setHint("שי״ן ימנית ושמאלית רק על האות ש");
      return;
    }
    setHint("");
    const added = marks.join("");
    const nextCaret = cluster.start + added.length;
    // Keyboard users stay on the button; a click or tap returns to the input
    const fromPointer = e.detail !== 0;
    onChange(value.slice(0, cluster.start) + added + value.slice(cluster.end));
    // After React writes the new value, which moves the caret to the end
    requestAnimationFrame(() => {
      if (fromPointer) el.focus({ preventScroll: true });
      el.setSelectionRange(nextCaret, nextCaret);
    });
  }

  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div id={id} role="group" aria-label="מקלדת ניקוד" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5">
        {MARKS.map((m) => (
          <button
            key={m.char}
            type="button"
            onMouseDown={keepFocus}
            onClick={(e) => edit(e, (letter, marks) => addMark(letter, marks, m), "הציבו את הסמן אחרי אות")}
            title={m.name}
            aria-label={`הוסף ${m.name}`}
            className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white px-1 pt-1 pb-1.5 text-stone-800 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-50 active:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <span aria-hidden="true" className="font-serif text-2xl leading-9">{m.base + m.char}</span>
            <span aria-hidden="true" className="text-[10px] leading-tight text-stone-500 text-center">{m.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={(e) => edit(e, (_, marks) => marks.slice(0, -1), "הציבו את הסמן אחרי אות מנוקדת")}
          aria-label="הסר את הסימן האחרון מהאות שלפני הסמן"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition-colors hover:border-amber-400 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <span aria-hidden="true">⌫</span> הסר סימן אחרון
        </button>
        <p className="text-xs text-stone-500" aria-live="polite">
          {hint || "הסימן נכנס לאות שלפני הסמן. תנועה חדשה מחליפה את הקודמת, ודגש נוסף עליה"}
        </p>
      </div>
    </div>
  );
}
