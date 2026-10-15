"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Shown after a correct answer in either quiz: optionally mark the verse read, then go to
// the verse or to the next question.
export default function QuizActions({
  book,
  chapter,
  verse,
  onNext,
}: {
  book: string;
  chapter: number;
  verse: number;
  onNext: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [markAsRead, setMarkAsRead] = useState(true);
  const [marking, setMarking] = useState(false);

  async function doMarkAsRead() {
    if (!session || !markAsRead) return;
    setMarking(true);
    await fetch("/api/tanakh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, chapter, verse, totalVerses: 0 }),
    });
    setMarking(false);
    window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
  }

  async function handleNext() {
    await doMarkAsRead();
    onNext();
  }

  async function handleGoToVerse() {
    await doMarkAsRead();
    router.push(`/tanakh?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`);
  }

  return (
    <>
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
          onClick={handleNext}
          disabled={marking}
          className="bg-amber-700 hover:bg-amber-800 disabled:bg-amber-300 text-white font-medium py-3 rounded-xl transition-colors"
        >
          שאלה נוספת
        </button>
      </div>
    </>
  );
}
