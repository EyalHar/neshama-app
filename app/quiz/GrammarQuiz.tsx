"use client";

import { useState, useEffect, useCallback } from "react";
import QuizActions from "./QuizActions";
import { QuizSpinner, QuizError } from "./QuizStatus";
import type { GrammarQuestion, QuizLevel, QuizType } from "@/lib/grammarQuiz";

type TypeChoice = QuizType | "mixed";

const TYPE_OPTIONS: { id: TypeChoice; label: string }[] = [
  { id: "mixed", label: "מעורב" },
  { id: "root", label: "שורש" },
  { id: "binyan", label: "בניין" },
];
const LEVEL_OPTIONS: { id: QuizLevel; label: string }[] = [
  { id: "easy", label: "קל" },
  { id: "medium", label: "בינוני" },
  { id: "hard", label: "קשה" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex bg-stone-100 rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            value === o.id ? "bg-white text-amber-800 font-medium shadow-sm" : "text-stone-500 hover:text-stone-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

async function requestQuestion(t: TypeChoice, l: QuizLevel): Promise<GrammarQuestion> {
  const res = await fetch(`/api/quiz/grammar?type=${t}&level=${l}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error);
  return data;
}

// Root/binyan quiz built from OSHB morphology (GET /api/quiz/grammar) — no LLM involved
export default function GrammarQuiz() {
  const [type, setType] = useState<TypeChoice>("mixed");
  const [level, setLevel] = useState<QuizLevel>("easy");
  const [question, setQuestion] = useState<GrammarQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState<Set<number>>(new Set());
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [streak, setStreak] = useState(0);

  // State is only set in the promise callbacks, so this is safe to start from an effect
  const loadQuestion = useCallback((t: TypeChoice, l: QuizLevel) => {
    requestQuestion(t, l)
      .then(setQuestion, () => setError("שגיאה בטעינת השאלה, נסה שוב"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadQuestion("mixed", "easy"), [loadQuestion]);

  function fetchQuestion(t: TypeChoice, l: QuizLevel) {
    setLoading(true);
    setError("");
    setQuestion(null);
    setWrongAttempts(new Set());
    setAnsweredCorrectly(false);
    loadQuestion(t, l);
  }

  function changeType(t: TypeChoice) {
    setType(t);
    setStreak(0);
    fetchQuestion(t, level);
  }

  function changeLevel(l: QuizLevel) {
    setLevel(l);
    setStreak(0);
    fetchQuestion(type, l);
  }

  function handleOptionSelect(index: number) {
    if (answeredCorrectly || !question || wrongAttempts.has(index)) return;
    if (index === question.answerIndex) {
      setAnsweredCorrectly(true);
      setStreak((s) => (wrongAttempts.size === 0 ? s + 1 : 0));
    } else {
      setWrongAttempts((prev) => new Set([...prev, index]));
    }
  }

  const word = question?.words[question.wordIndex];

  return (
    <>
      <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
        <Segmented options={TYPE_OPTIONS} value={type} onChange={changeType} />
        <Segmented options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />
      </div>

      {loading && <QuizSpinner />}
      {error && <QuizError message={error} onRetry={() => fetchQuestion(type, level)} />}

      {question && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-7 animate-modal-enter">
          {streak > 1 && (
            <p className="text-center text-xs text-amber-700 font-medium mb-2">🔥 רצף של {streak} תשובות נכונות</p>
          )}

          <p className="text-center text-stone-500 mb-1">
            {question.type === "root" ? "מהו השורש של המילה" : "באיזה בניין המילה"}
          </p>
          <p className="text-center text-4xl font-bold text-amber-800 mb-5">{word}</p>

          <p className="text-xl leading-loose text-stone-700 text-center mb-2">
            {question.words.map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                {i === question.wordIndex ? <mark className="bg-amber-100 text-amber-900 rounded px-1">{w}</mark> : w}
              </span>
            ))}
          </p>
          <p className="text-center text-amber-600 text-sm font-medium mb-7">{question.reference}</p>

          {!answeredCorrectly && (
            <div className="grid grid-cols-2 gap-3">
              {question.options.map((opt, i) => {
                const isWrong = wrongAttempts.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(i)}
                    disabled={isWrong}
                    className={`py-3 px-4 rounded-xl text-lg font-medium transition-all border-2 ${
                      isWrong
                        ? "border-red-200 bg-red-50 text-red-300 line-through cursor-not-allowed"
                        : "border-stone-200 hover:border-amber-400 hover:bg-amber-50 text-stone-700 cursor-pointer"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {answeredCorrectly && (
            <div className="mt-2">
              <div className="text-center mb-5">
                <p className="text-green-600 font-bold text-xl">✓ כל הכבוד!</p>
                {wrongAttempts.size === 0 && <p className="text-stone-400 text-sm mt-1">ענית נכון מהניסיון הראשון!</p>}
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 mb-5 text-center">
                <p className="text-sm text-stone-500 mb-1">ניתוח המילה {word}</p>
                <p className="text-stone-700">
                  <span className="font-medium">שורש {question.explanation.root}</span>
                  <span className="text-stone-400"> · </span>
                  {question.explanation.form}
                </p>
              </div>
              <QuizActions
                book={question.book}
                chapter={question.chapter}
                verse={question.verse}
                onNext={() => fetchQuestion(type, level)}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
