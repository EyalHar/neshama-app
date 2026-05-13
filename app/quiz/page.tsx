"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface QuizQuestion {
  sefaria_ref: string;
  reference_he: string;
  book: string;
  chapter: number;
  verse: number;
  verse_with_blank: string;
  missing_word: string;
  options: string[];
  correct_index: number;
}

export default function QuizPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState<Set<number>>(new Set());
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [markAsRead, setMarkAsRead] = useState(true);
  const [marking, setMarking] = useState(false);

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setError("");
    setQuestion(null);
    setWrongAttempts(new Set());
    setAnsweredCorrectly(false);
    setMarkAsRead(true);
    try {
      const res = await fetch("/api/quiz", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestion(data);
    } catch {
      setError("שגיאה בטעינת השאלה, נסה שוב");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuestion(); }, [fetchQuestion]);

  function handleOptionSelect(index: number) {
    if (answeredCorrectly || !question || wrongAttempts.has(index)) return;
    if (index === question.correct_index) {
      setAnsweredCorrectly(true);
    } else {
      setWrongAttempts((prev) => new Set([...prev, index]));
    }
  }

  async function doMarkAsRead() {
    if (!question || !session || !markAsRead) return;
    setMarking(true);
    await fetch("/api/tanakh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book: question.book, chapter: question.chapter, verse: question.verse, totalVerses: 0 }),
    });
    setMarking(false);
    window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
  }

  async function handleNextQuestion() {
    await doMarkAsRead();
    fetchQuestion();
  }

  async function handleGoToVerse() {
    await doMarkAsRead();
    if (question) {
      localStorage.setItem("tanakh-position", JSON.stringify({ bookId: question.book, chapter: question.chapter }));
      router.push("/tanakh");
    }
  }

  function renderVerse() {
    if (!question) return null;
    const parts = question.verse_with_blank.split("_____");
    if (parts.length < 2) return <p className="text-2xl leading-relaxed text-stone-800 font-medium">{question.verse_with_blank}</p>;

    return (
      <p className="text-2xl leading-relaxed text-stone-800 font-medium text-center">
        {parts[0]}
        {answeredCorrectly ? (
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg mx-1 font-bold animate-modal-enter inline-block">
            {question.missing_word}
          </span>
        ) : (
          <span className="inline-block border-b-2 border-amber-500 min-w-[64px] mx-1 text-amber-400 text-center">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        )}
        {parts[1]}
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 mb-1">בחן את עצמך</h1>
          <p className="text-stone-500">השלם את המילה החסרה בפסוק</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg className="animate-spin h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-stone-400 text-sm">מכין שאלה...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={fetchQuestion} className="bg-amber-700 text-white px-6 py-3 rounded-xl hover:bg-amber-800 transition-colors">
              נסה שוב
            </button>
          </div>
        )}

        {/* Question card */}
        {question && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-7 animate-modal-enter">

            {/* Verse with blank */}
            <div className="mb-3 py-4 px-2">
              {renderVerse()}
            </div>

            {/* Reference */}
            <p className="text-center text-amber-600 text-sm font-medium mb-7">
              {question.reference_he}
            </p>

            {/* Options */}
            {!answeredCorrectly && (
              <div className="grid grid-cols-2 gap-3">
                {question.options.map((opt, i) => {
                  const isWrong = wrongAttempts.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => handleOptionSelect(i)}
                      disabled={isWrong}
                      className={`py-3 px-4 rounded-xl text-base font-medium transition-all border-2 ${
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

            {/* Success */}
            {answeredCorrectly && (
              <div className="mt-2">
                <div className="text-center mb-5">
                  <p className="text-green-600 font-bold text-xl">✓ כל הכבוד!</p>
                  {wrongAttempts.size === 0 && (
                    <p className="text-stone-400 text-sm mt-1">ענית נכון מהניסיון הראשון!</p>
                  )}
                </div>

                {session && (
                  <label className="flex items-center gap-2 justify-center mb-5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={markAsRead}
                      onChange={(e) => setMarkAsRead(e.target.checked)}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span className="text-stone-600 text-sm">סמן את הפסוק כנקרא</span>
                  </label>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleGoToVerse}
                    disabled={marking}
                    className="border-2 border-amber-600 text-amber-700 hover:bg-amber-50 font-medium py-3 rounded-xl transition-colors"
                  >
                    קח אותי לפסוק
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    disabled={marking}
                    className="bg-amber-700 hover:bg-amber-800 disabled:bg-amber-300 text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    שאלה נוספת
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!session && (
          <p className="text-center text-stone-400 text-sm mt-6">
            <a href="/login" className="text-amber-600 hover:underline">התחבר</a> כדי לסמן פסוקים שנקראו
          </p>
        )}
      </div>
    </div>
  );
}
