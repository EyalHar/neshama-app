"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import VerseQuiz from "./VerseQuiz";
import GrammarQuiz from "./GrammarQuiz";
import LettersQuiz from "./LettersQuiz";
import WhoSaidQuiz from "./WhoSaidQuiz";
import PageHeader from "@/app/components/PageHeader";

type Mode = "verse" | "grammar" | "letters" | "who-said";

const MODES: { id: Mode; label: string; subtitle: string }[] = [
  { id: "verse", label: "השלמת פסוק", subtitle: "השלם את המילה החסרה בפסוק" },
  { id: "grammar", label: "דקדוק", subtitle: "זהה את השורש והבניין של מילה מהפסוק" },
  { id: "letters", label: "אותיות חסרות", subtitle: "השלם את האותיות שנשמטו מהפסוק" },
  { id: "who-said", label: "מי אמר למי", subtitle: "זהה מי אמר את הדברים, ולמי" },
];

export default function QuizPage() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>("verse");
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-6">
          <PageHeader title="בחן את עצמך" center />
          <p className="text-stone-500">{current.subtitle}</p>
        </div>

        <div className="flex justify-center gap-1 sm:gap-2 mb-6 border-b border-stone-200 overflow-x-auto">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3 sm:px-5 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors -mb-px border-b-2 ${
                mode === m.id ? "border-amber-600 text-amber-700 bg-amber-50" : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "verse" && <VerseQuiz />}
        {mode === "grammar" && <GrammarQuiz />}
        {mode === "letters" && <LettersQuiz />}
        {mode === "who-said" && <WhoSaidQuiz />}

        {!session && (
          <p className="text-center text-stone-400 text-sm mt-6">
            <a href="/login" className="text-amber-600 hover:underline">התחבר</a> כדי לסמן פסוקים שנקראו
          </p>
        )}
      </div>
    </div>
  );
}
