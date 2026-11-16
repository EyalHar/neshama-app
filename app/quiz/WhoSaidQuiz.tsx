"use client";

import { useState, useEffect, useCallback } from "react";
import QuizActions from "./QuizActions";
import Segmented from "./Segmented";
import { QuizSpinner, QuizError } from "./QuizStatus";
import type { WhoSaidLevel, WhoSaidQuestion } from "@/lib/whoSaid";

const LEVEL_OPTIONS: { id: WhoSaidLevel; label: string }[] = [
  { id: "easy", label: "קל" },
  { id: "medium", label: "בינוני" },
  { id: "hard", label: "קשה" },
];

async function requestQuestion(level: WhoSaidLevel): Promise<WhoSaidQuestion> {
  const res = await fetch(`/api/quiz/who-said?level=${level}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error);
  return data;
}

// "מי אמר למי": a quote and four "X אל Y" options (GET /api/quiz/who-said, no LLM)
export default function WhoSaidQuiz() {
  const [level, setLevel] = useState<WhoSaidLevel>("easy");
  const [question, setQuestion] = useState<WhoSaidQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState<Set<number>>(new Set());
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [streak, setStreak] = useState(0);

  const loadQuestion = useCallback((l: WhoSaidLevel) => {
    requestQuestion(l)
      .then(setQuestion, () => setError("שגיאה בטעינת השאלה, נסה שוב"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadQuestion("easy"), [loadQuestion]);

  function fetchQuestion(l: WhoSaidLevel) {
    setLoading(true);
    setError("");
    setQuestion(null);
    setWrongAttempts(new Set());
    setAnsweredCorrectly(false);
    loadQuestion(l);
  }

  function changeLevel(l: WhoSaidLevel) {
    setLevel(l);
    setStreak(0);
    fetchQuestion(l);
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

  return (
    <>
      <div className="flex justify-center mb-6">
        <Segmented options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />
      </div>

      {loading && <QuizSpinner />}
      {error && <QuizError message={error} onRetry={() => fetchQuestion(level)} />}

      {question && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-7 animate-modal-enter">
          {streak > 1 && (
            <p className="text-center text-xs text-amber-700 font-medium mb-2">🔥 רצף של {streak} תשובות נכונות</p>
          )}
          <p className="text-center text-stone-500 mb-4">מי אמר למי?</p>

          <blockquote className="relative bg-amber-50/60 border-r-4 border-amber-400 rounded-xl px-6 py-5 mb-6">
            <p className="text-2xl leading-relaxed text-stone-800 text-center">״{question.quote}״</p>
          </blockquote>

          {!answeredCorrectly && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <p className="text-green-600 font-bold text-xl">✓ {question.options[question.answerIndex]}</p>
                {wrongAttempts.size === 0 && <p className="text-stone-400 text-sm mt-1">ענית נכון מהניסיון הראשון!</p>}
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 mb-5 text-center">
                <p className="text-lg leading-loose text-stone-700">{question.verseText}</p>
                <p className="text-amber-600 text-sm font-medium mt-1">{question.reference}</p>
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
