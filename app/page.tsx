"use client";

import { useState } from "react";

interface Verse {
  reference: string;
  text: string;
  why: string;
}

interface NeshamaResponse {
  emotional_need: string;
  emotion: string;
  verses: Verse[];
  personal_message: string;
}

type Theme = {
  bg: string;
  cardBorder: string;
  label: string;
  title: string;
  subtitle: string;
  needBg: string;
  needBorder: string;
  needLabel: string;
  needText: string;
  verseRef: string;
  verseBorder: string;
  msgBg: string;
  msgLabel: string;
  button: string;
  buttonHover: string;
  outlineButton: string;
  outlineButtonHover: string;
  spinner: string;
};

const THEMES: Record<string, Theme> = {
  sadness: {
    bg: "from-blue-50 to-indigo-100",
    cardBorder: "border-blue-100",
    label: "text-blue-800",
    title: "text-blue-900",
    subtitle: "text-blue-700",
    needBg: "bg-blue-100",
    needBorder: "border-blue-200",
    needLabel: "text-blue-700",
    needText: "text-blue-900",
    verseRef: "text-blue-500",
    verseBorder: "border-blue-300",
    msgBg: "from-blue-700 to-indigo-700",
    msgLabel: "text-blue-200",
    button: "bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300",
    buttonHover: "",
    outlineButton: "border-blue-700 text-blue-700",
    outlineButtonHover: "hover:bg-blue-50",
    spinner: "text-white",
  },
  fear: {
    bg: "from-violet-50 to-purple-100",
    cardBorder: "border-violet-100",
    label: "text-violet-800",
    title: "text-violet-900",
    subtitle: "text-violet-700",
    needBg: "bg-violet-100",
    needBorder: "border-violet-200",
    needLabel: "text-violet-700",
    needText: "text-violet-900",
    verseRef: "text-violet-500",
    verseBorder: "border-violet-300",
    msgBg: "from-violet-700 to-purple-700",
    msgLabel: "text-violet-200",
    button: "bg-violet-700 hover:bg-violet-800 disabled:bg-violet-300",
    buttonHover: "",
    outlineButton: "border-violet-700 text-violet-700",
    outlineButtonHover: "hover:bg-violet-50",
    spinner: "text-white",
  },
  loneliness: {
    bg: "from-slate-50 to-gray-100",
    cardBorder: "border-slate-200",
    label: "text-slate-700",
    title: "text-slate-800",
    subtitle: "text-slate-600",
    needBg: "bg-slate-100",
    needBorder: "border-slate-200",
    needLabel: "text-slate-600",
    needText: "text-slate-800",
    verseRef: "text-slate-500",
    verseBorder: "border-slate-300",
    msgBg: "from-slate-600 to-gray-700",
    msgLabel: "text-slate-300",
    button: "bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300",
    buttonHover: "",
    outlineButton: "border-slate-700 text-slate-700",
    outlineButtonHover: "hover:bg-slate-50",
    spinner: "text-white",
  },
  hope: {
    bg: "from-yellow-50 to-amber-100",
    cardBorder: "border-yellow-100",
    label: "text-yellow-800",
    title: "text-yellow-900",
    subtitle: "text-yellow-700",
    needBg: "bg-yellow-100",
    needBorder: "border-yellow-200",
    needLabel: "text-yellow-700",
    needText: "text-yellow-900",
    verseRef: "text-yellow-600",
    verseBorder: "border-yellow-400",
    msgBg: "from-yellow-600 to-amber-600",
    msgLabel: "text-yellow-200",
    button: "bg-yellow-700 hover:bg-yellow-800 disabled:bg-yellow-300",
    buttonHover: "",
    outlineButton: "border-yellow-700 text-yellow-700",
    outlineButtonHover: "hover:bg-yellow-50",
    spinner: "text-white",
  },
  loss: {
    bg: "from-gray-100 to-blue-gray-100",
    cardBorder: "border-gray-200",
    label: "text-gray-700",
    title: "text-gray-900",
    subtitle: "text-gray-600",
    needBg: "bg-gray-100",
    needBorder: "border-gray-300",
    needLabel: "text-gray-600",
    needText: "text-gray-800",
    verseRef: "text-gray-500",
    verseBorder: "border-gray-400",
    msgBg: "from-gray-700 to-gray-800",
    msgLabel: "text-gray-300",
    button: "bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300",
    buttonHover: "",
    outlineButton: "border-gray-700 text-gray-700",
    outlineButtonHover: "hover:bg-gray-50",
    spinner: "text-white",
  },
  anger: {
    bg: "from-red-50 to-orange-100",
    cardBorder: "border-red-100",
    label: "text-red-800",
    title: "text-red-900",
    subtitle: "text-red-700",
    needBg: "bg-red-100",
    needBorder: "border-red-200",
    needLabel: "text-red-700",
    needText: "text-red-900",
    verseRef: "text-red-500",
    verseBorder: "border-red-300",
    msgBg: "from-red-700 to-orange-700",
    msgLabel: "text-red-200",
    button: "bg-red-700 hover:bg-red-800 disabled:bg-red-300",
    buttonHover: "",
    outlineButton: "border-red-700 text-red-700",
    outlineButtonHover: "hover:bg-red-50",
    spinner: "text-white",
  },
  love: {
    bg: "from-rose-50 to-pink-100",
    cardBorder: "border-rose-100",
    label: "text-rose-800",
    title: "text-rose-900",
    subtitle: "text-rose-700",
    needBg: "bg-rose-100",
    needBorder: "border-rose-200",
    needLabel: "text-rose-700",
    needText: "text-rose-900",
    verseRef: "text-rose-500",
    verseBorder: "border-rose-300",
    msgBg: "from-rose-600 to-pink-700",
    msgLabel: "text-rose-200",
    button: "bg-rose-700 hover:bg-rose-800 disabled:bg-rose-300",
    buttonHover: "",
    outlineButton: "border-rose-700 text-rose-700",
    outlineButtonHover: "hover:bg-rose-50",
    spinner: "text-white",
  },
  illness: {
    bg: "from-teal-50 to-emerald-100",
    cardBorder: "border-teal-100",
    label: "text-teal-800",
    title: "text-teal-900",
    subtitle: "text-teal-700",
    needBg: "bg-teal-100",
    needBorder: "border-teal-200",
    needLabel: "text-teal-700",
    needText: "text-teal-900",
    verseRef: "text-teal-500",
    verseBorder: "border-teal-300",
    msgBg: "from-teal-700 to-emerald-700",
    msgLabel: "text-teal-200",
    button: "bg-teal-700 hover:bg-teal-800 disabled:bg-teal-300",
    buttonHover: "",
    outlineButton: "border-teal-700 text-teal-700",
    outlineButtonHover: "hover:bg-teal-50",
    spinner: "text-white",
  },
  default: {
    bg: "from-amber-50 to-orange-50",
    cardBorder: "border-amber-100",
    label: "text-amber-800",
    title: "text-amber-800",
    subtitle: "text-amber-700",
    needBg: "bg-amber-100",
    needBorder: "border-amber-200",
    needLabel: "text-amber-800",
    needText: "text-amber-900",
    verseRef: "text-amber-600",
    verseBorder: "border-amber-400",
    msgBg: "from-amber-700 to-orange-700",
    msgLabel: "text-amber-200",
    button: "bg-amber-700 hover:bg-amber-800 disabled:bg-amber-300",
    buttonHover: "",
    outlineButton: "border-amber-700 text-amber-700",
    outlineButtonHover: "hover:bg-amber-50",
    spinner: "text-white",
  },
};

export default function Home() {
  const [story, setStory] = useState("");
  const [wish, setWish] = useState("");
  const [result, setResult] = useState<NeshamaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const theme = THEMES[result?.emotion ?? "default"] ?? THEMES.default;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!story.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/neshama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, wish }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setStory("");
    setWish("");
    setError("");
  }

  return (
    <main
      className={`min-h-screen bg-gradient-to-b ${theme.bg} transition-all duration-700`}
      dir="rtl"
    >
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className={`text-4xl font-bold ${theme.title} mb-2`}>נשמה</h1>
          <p className={`${theme.subtitle} text-lg`}>
            שתף מה עובר עליך — ונמצא יחד את הפסוק שמדבר לליבך
          </p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`bg-white rounded-2xl shadow-sm border ${theme.cardBorder} p-6`}>
              <label className={`block ${theme.label} font-medium mb-3 text-lg`}>
                מה עובר עליך?
              </label>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="שתף בחופשיות... אין שיפוט כאן, רק נוכחות"
                rows={5}
                className="w-full resize-none text-gray-700 placeholder-gray-400 focus:outline-none text-base leading-relaxed"
                required
              />
            </div>

            <div className={`bg-white rounded-2xl shadow-sm border ${theme.cardBorder} p-6`}>
              <label className={`block ${theme.label} font-medium mb-3 text-lg`}>
                מה משאלתך?{" "}
                <span className="text-gray-400 font-normal text-sm">(רשות)</span>
              </label>
              <textarea
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="מה היית רוצה שיקרה? מה אתה מבקש?"
                rows={3}
                className="w-full resize-none text-gray-700 placeholder-gray-400 focus:outline-none text-base leading-relaxed"
              />
            </div>

            {error && (
              <p className="text-red-600 text-center bg-red-50 rounded-xl p-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !story.trim()}
              className={`w-full ${theme.button} text-white font-medium text-lg py-4 rounded-2xl transition-colors duration-200`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  מחפש את הפסוקים שלך...
                </span>
              ) : (
                "שלח"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className={`${theme.needBg} rounded-2xl p-5 border ${theme.needBorder}`}>
              <p className={`${theme.needLabel} text-sm font-medium mb-1`}>זיהינו שאתה צריך</p>
              <p className={`${theme.needText} font-semibold text-lg`}>{result.emotional_need}</p>
            </div>

            <div className="space-y-4">
              {result.verses.map((verse, i) => (
                <div key={i} className={`bg-white rounded-2xl shadow-sm border ${theme.cardBorder} p-6`}>
                  <p className={`${theme.verseRef} text-sm font-medium mb-3`}>{verse.reference}</p>
                  <blockquote className={`text-gray-800 text-xl font-medium leading-relaxed mb-4 border-r-4 ${theme.verseBorder} pr-4`}>
                    {verse.text}
                  </blockquote>
                  <p className="text-gray-500 text-sm">{verse.why}</p>
                </div>
              ))}
            </div>

            <div className={`bg-gradient-to-br ${theme.msgBg} rounded-2xl p-6 text-white`}>
              <p className={`${theme.msgLabel} text-sm font-medium mb-2`}>מסר אישי</p>
              <p className="text-white text-lg leading-relaxed">{result.personal_message}</p>
            </div>

            <button
              onClick={handleReset}
              className={`w-full border-2 ${theme.outlineButton} ${theme.outlineButtonHover} font-medium text-lg py-4 rounded-2xl transition-colors duration-200`}
            >
              שתף מצב חדש
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
