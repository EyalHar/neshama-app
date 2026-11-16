"use client";

import { useState, useEffect, useCallback, useSyncExternalStore, type ReactNode } from "react";
import QuizActions from "./QuizActions";
import Segmented from "./Segmented";
import { QuizSpinner, QuizError } from "./QuizStatus";
import { HEBREW_LETTERS, splitGraphemes, toRegular } from "@/lib/hebrewLetters";
import type { LettersLevel, LettersQuestion } from "@/lib/lettersQuiz";

type InputMode = "bank" | "keyboard";

const LEVEL_OPTIONS: { id: LettersLevel; label: string }[] = [
  { id: "easy", label: "קל" },
  { id: "medium", label: "בינוני" },
  { id: "hard", label: "קשה" },
];
const INPUT_OPTIONS: { id: InputMode; label: string }[] = [
  { id: "bank", label: "בחירה מהאותיות" },
  { id: "keyboard", label: "כל האותיות" },
];
const INPUT_KEY = "quiz-letters-input";

// Physical keys on a non-Hebrew layout → the letter at that position on the Hebrew (SI-1452) layout
const CODE_TO_LETTER: Record<string, string> = {
  KeyE: "ק", KeyR: "ר", KeyT: "א", KeyY: "ט", KeyU: "ו", KeyI: "ן", KeyO: "ם", KeyP: "פ",
  KeyA: "ש", KeyS: "ד", KeyD: "ג", KeyF: "כ", KeyG: "ע", KeyH: "י", KeyJ: "ח", KeyK: "ל", KeyL: "ך", Semicolon: "ף",
  KeyZ: "ז", KeyX: "ס", KeyC: "ב", KeyV: "ה", KeyB: "נ", KeyN: "מ", KeyM: "צ", Comma: "ת", Period: "ץ",
};

type Slot = { letter: string; tile?: number } | null;

type Tile = { letter: string; id: number };

async function requestQuestion(level: LettersLevel): Promise<LettersQuestion> {
  const res = await fetch(`/api/quiz/letters?level=${level}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error);
  return data;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const makeTiles = (q: LettersQuestion): Tile[] =>
  shuffle([...q.blanks.map((b) => toRegular(b.answer)), ...q.distractors]).map((letter, id) => ({ letter, id }));

const INPUT_EVENT = "quiz-letters-input-change";

function subscribeInputMode(onChange: () => void) {
  window.addEventListener(INPUT_EVENT, onChange);
  return () => window.removeEventListener(INPUT_EVENT, onChange);
}

function readInputMode(): InputMode {
  try {
    return localStorage.getItem(INPUT_KEY) === "keyboard" ? "keyboard" : "bank";
  } catch {
    return "bank";
  }
}

// "אותיות חסרות": fill in the letters missing from a verse (GET /api/quiz/letters, no LLM)
export default function LettersQuiz() {
  const [level, setLevel] = useState<LettersLevel>("easy");
  const inputMode = useSyncExternalStore(subscribeInputMode, readInputMode, () => "bank" as const);
  const [question, setQuestion] = useState<LettersQuestion | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [active, setActive] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streak, setStreak] = useState(0);

  const loadQuestion = useCallback((l: LettersLevel) => {
    requestQuestion(l)
      .then(
        (q) => {
          setQuestion(q);
          setTiles(makeTiles(q));
          setSlots(q.blanks.map(() => null));
        },
        () => setError("שגיאה בטעינת השאלה, נסה שוב")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadQuestion("easy"), [loadQuestion]);

  function fetchQuestion(l: LettersLevel) {
    setLoading(true);
    setError("");
    setQuestion(null);
    setLocked(new Set());
    setWrong(new Set());
    setActive(0);
    setMistakes(0);
    loadQuestion(l);
  }

  function changeLevel(l: LettersLevel) {
    setLevel(l);
    setStreak(0);
    fetchQuestion(l);
  }

  function changeInputMode(m: InputMode) {
    try {
      localStorage.setItem(INPUT_KEY, m);
    } catch {}
    window.dispatchEvent(new Event(INPUT_EVENT));
    // Letters placed from the bank refer to tiles; start the open blanks over
    setSlots((s) => s.map((slot, i) => (locked.has(i) ? slot : null)));
    setWrong(new Set());
  }

  const solved = !!question && locked.size === question.blanks.length;
  const open = (i: number) => !locked.has(i);

  function nextOpen(from: number, filled: Slot[]): number {
    const n = filled.length;
    for (let k = 1; k <= n; k++) {
      const i = (from + k) % n;
      if (open(i) && !filled[i]) return i;
    }
    return from;
  }

  function place(letter: string, tile?: number) {
    if (solved || !open(active)) return;
    const next = slots.map((s, i) => (i === active ? { letter, tile } : s));
    setSlots(next);
    setWrong((w) => new Set([...w].filter((i) => i !== active)));
    setActive(nextOpen(active, next));
  }

  function clearSlot(i: number) {
    setSlots((s) => s.map((slot, j) => (j === i ? null : slot)));
    setWrong((w) => new Set([...w].filter((j) => j !== i)));
  }

  function selectBlank(i: number) {
    if (solved || !open(i)) return;
    setActive(i);
    if (slots[i]) clearSlot(i);
  }

  function backspace() {
    if (solved) return;
    if (slots[active] && open(active)) return clearSlot(active);
    for (let k = active - 1; k >= 0; k--) {
      if (open(k) && slots[k]) {
        setActive(k);
        return clearSlot(k);
      }
    }
  }

  function check() {
    if (!question) return;
    const nowLocked = new Set(locked);
    const nowWrong = new Set<number>();
    question.blanks.forEach((b, i) => {
      if (!open(i)) return;
      if (toRegular(slots[i]!.letter) === toRegular(b.answer)) nowLocked.add(i);
      else nowWrong.add(i);
    });
    setLocked(nowLocked);
    setWrong(nowWrong);
    if (nowWrong.size) {
      setMistakes((m) => m + nowWrong.size);
      setActive(Math.min(...nowWrong));
    } else {
      setStreak((s) => (mistakes === 0 ? s + 1 : 0));
    }
  }

  const allFilled = slots.length > 0 && slots.every((s, i) => !open(i) || s);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question || solved || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        return backspace();
      }
      if (e.key === "Enter" && allFilled) return check();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // RTL: left goes forward in the verse
        const step = e.key === "ArrowLeft" ? 1 : -1;
        const n = question.blanks.length;
        for (let k = 1; k < n; k++) {
          const i = (active + step * k + n * k) % n;
          if (open(i)) return setActive(i);
        }
        return;
      }
      const letter = e.key >= "א" && e.key <= "ת" ? e.key : CODE_TO_LETTER[e.code];
      if (!letter) return;
      e.preventDefault();
      if (inputMode === "keyboard") return place(letter);
      const used = new Set(slots.map((s) => s?.tile));
      const tile = tiles.find((t) => t.letter === toRegular(letter) && !used.has(t.id));
      if (tile) place(tile.letter, tile.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const usedTiles = new Set(slots.map((s) => s?.tile));

  function renderWord(word: string, wi: number): ReactNode {
    const graphemes = splitGraphemes(word);
    const parts: ReactNode[] = [];
    let run = "";
    graphemes.forEach((g, gi) => {
      const bi = question!.blanks.findIndex((b) => b.word === wi && b.letter === gi);
      if (bi < 0) {
        run += g.letter + g.marks;
        return;
      }
      if (run) parts.push(run);
      run = "";
      parts.push(
        <Blank
          key={gi}
          slot={slots[bi]}
          answer={question!.blanks[bi].answer}
          marks={question!.blanks[bi].marks}
          state={locked.has(bi) ? "right" : wrong.has(bi) ? "wrong" : bi === active && !solved ? "active" : "idle"}
          onClick={() => selectBlank(bi)}
        />
      );
    });
    if (run) parts.push(run);
    return parts;
  }

  return (
    <>
      <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
        <Segmented options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />
        <Segmented options={INPUT_OPTIONS} value={inputMode} onChange={changeInputMode} />
      </div>

      {loading && <QuizSpinner />}
      {error && <QuizError message={error} onRetry={() => fetchQuestion(level)} />}

      {question && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-7 animate-modal-enter">
          {streak > 1 && (
            <p className="text-center text-xs text-amber-700 font-medium mb-2">🔥 רצף של {streak} פסוקים בלי טעויות</p>
          )}
          <p className="text-center text-stone-500 mb-4">
            {solved ? "הפסוק המלא" : `השלם ${question.blanks.length} אותיות חסרות`}
          </p>

          <p className="text-2xl leading-[2.4] text-stone-800 text-center mb-2">
            {question.words.map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                {renderWord(w, i)}
              </span>
            ))}
          </p>
          <p className="text-center text-amber-600 text-sm font-medium mb-6">{question.reference}</p>

          {!solved && (
            <>
              {inputMode === "bank" ? (
                <div className="flex flex-wrap justify-center gap-2 mb-5">
                  {tiles.map((t) => (
                    <LetterKey key={t.id} letter={t.letter} disabled={usedTiles.has(t.id)} onClick={() => place(t.letter, t.id)} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-8 sm:grid-cols-11 gap-1.5 mb-5" dir="rtl">
                  {HEBREW_LETTERS.map((l) => (
                    <LetterKey key={l} letter={l} onClick={() => place(l)} />
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={backspace}
                  className="px-4 py-3 rounded-xl border-2 border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
                  aria-label="מחק אות"
                >
                  ⌫
                </button>
                <button
                  type="button"
                  onClick={check}
                  disabled={!allFilled}
                  className="flex-1 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  בדוק
                </button>
              </div>
              {wrong.size > 0 && (
                <p className="text-center text-red-500 text-sm mt-3">
                  {wrong.size === 1 ? "אות אחת לא נכונה" : `${wrong.size} אותיות לא נכונות`} — נסה שוב
                </p>
              )}
            </>
          )}

          {solved && (
            <div className="mt-2">
              <div className="text-center mb-5">
                <p className="text-green-600 font-bold text-xl">✓ כל הכבוד!</p>
                <p className="text-stone-400 text-sm mt-1">
                  {mistakes === 0 ? "בלי אף טעות!" : `${mistakes} ${mistakes === 1 ? "טעות" : "טעויות"} בדרך`}
                </p>
              </div>
              <QuizActions
                book={question.book}
                chapter={question.chapter}
                verse={question.verse}
                onNext={() => fetchQuestion(level)}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

const BLANK_STYLES = {
  idle: "bg-stone-100 border-stone-300 text-stone-700",
  active: "bg-amber-50 border-amber-500 ring-2 ring-amber-300 text-amber-900",
  wrong: "bg-red-50 border-red-400 text-red-600",
  right: "bg-green-50 border-green-400 text-green-700",
};

function Blank({
  slot,
  answer,
  marks,
  state,
  onClick,
}: {
  slot: Slot;
  answer: string;
  marks: string;
  state: keyof typeof BLANK_STYLES;
  onClick: () => void;
}) {
  // Dotted circle is the standard carrier for showing nikud without a letter
  const shown = state === "right" ? answer : slot?.letter ?? "◌";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "right"}
      className={`inline-block min-w-[1.4em] px-0.5 mx-px leading-[1.5] align-baseline rounded-md border-b-2 transition-colors ${BLANK_STYLES[state]} ${
        slot || state === "right" ? "" : "text-stone-400"
      }`}
    >
      {shown}
      {marks}
    </button>
  );
}

function LetterKey({ letter, disabled, onClick }: { letter: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-w-11 h-11 text-xl font-medium rounded-xl border-2 border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50 disabled:opacity-25 disabled:hover:border-stone-200 disabled:hover:bg-white transition-colors"
    >
      {letter}
    </button>
  );
}
