"use client";

import { useState } from "react";

type BookStatus = { book: string; status: "downloading" | "parsing" | "done" | "error"; verses?: number; msg?: string };
type SectionState = { running: boolean; done: boolean; books: BookStatus[]; summary: { totalVerses: number; totalWords: number } | null; error: string | null };

const EMPTY_SECTION: SectionState = { running: false, done: false, books: [], summary: null, error: null };

const SECTIONS = [
  { id: "torah", label: "תורה", books: 5, color: "amber" },
  { id: "nevi", label: "נביאים", books: 21, color: "blue" },
  { id: "ketuvim", label: "כתובים", books: 13, color: "violet" },
] as const;

export default function SeedPage() {
  const [sections, setSections] = useState<Record<string, SectionState>>({
    torah: { ...EMPTY_SECTION }, nevi: { ...EMPTY_SECTION }, ketuvim: { ...EMPTY_SECTION },
  });

  const [strongsRunning, setStrongsRunning] = useState(false);
  const [strongsDone, setStrongsDone] = useState(false);
  const [strongsMsg, setStrongsMsg] = useState<string | null>(null);
  const [strongsCount, setStrongsCount] = useState<number | null>(null);

  function updateSection(id: string, patch: Partial<SectionState>) {
    setSections((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function startSeed(scope: string) {
    updateSection(scope, { running: true, done: false, books: [], summary: null, error: null });

    const es = new EventSource(`/api/admin/seed-oshb?scope=${scope}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "progress") {
        setSections((prev) => {
          const sec = prev[scope];
          const existing = sec.books.findIndex((b) => b.book === data.book);
          const updated = { book: data.book, status: data.status, verses: data.verses };
          const books = existing >= 0
            ? sec.books.map((b, i) => i === existing ? updated : b)
            : [...sec.books, updated];
          return { ...prev, [scope]: { ...sec, books } };
        });
      } else if (data.type === "complete") {
        updateSection(scope, { running: false, done: true, summary: { totalVerses: data.totalVerses, totalWords: data.totalWords } });
        es.close();
      } else if (data.type === "error") {
        updateSection(scope, { running: false, error: data.msg ?? "שגיאה" });
        es.close();
      }
    };
    es.onerror = () => { updateSection(scope, { running: false, error: "החיבור נותק" }); es.close(); };
  }

  function startStrongsSeed() {
    setStrongsRunning(true); setStrongsDone(false); setStrongsMsg("מוריד..."); setStrongsCount(null);
    const es = new EventSource("/api/admin/seed-strongs");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "progress") setStrongsMsg(data.msg);
      else if (data.type === "complete") { setStrongsCount(data.count); setStrongsDone(true); setStrongsRunning(false); es.close(); }
      else if (data.type === "error") { setStrongsMsg(`שגיאה: ${data.msg}`); setStrongsRunning(false); es.close(); }
    };
    es.onerror = () => { setStrongsRunning(false); setStrongsMsg("החיבור נותק"); es.close(); };
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">אכלוס DB מ-OSHB</h1>
      <p className="text-stone-500 text-sm mb-8">
        כל חלק ניתן לאכלוס בנפרד ובסדר כלשהו. אם תפסיק באמצע — הנתונים שנשמרו נשארים ואפשר להמשיך מאותה נקודה.
      </p>

      <div className="space-y-6">
        {SECTIONS.map(({ id, label, books: total }) => {
          const sec = sections[id];
          const doneCount = sec.books.filter((b) => b.status === "done").length;
          const progress = Math.round((doneCount / total) * 100);

          return (
            <div key={id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-stone-800">{label}</h2>
                {!sec.running && !sec.done && (
                  <button
                    onClick={() => startSeed(id)}
                    className="bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                  >
                    התחל אכלוס {label}
                  </button>
                )}
                {sec.done && <span className="text-green-600 font-medium text-sm">✓ הושלם</span>}
              </div>

              {sec.error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2 mb-2 font-mono">{sec.error}</p>
              )}

              {(sec.running || sec.done) && (
                <>
                  <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
                    <div className="bg-amber-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-stone-400 text-xs mb-3">{doneCount} / {total} ספרים</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {sec.books.map((b) => (
                      <div key={b.book} className="flex items-center justify-between text-xs px-3 py-1.5 bg-stone-50 rounded-lg">
                        <span className="text-stone-600">{b.book}</span>
                        <span className={b.status === "done" ? "text-green-600" : b.status === "error" ? "text-red-500" : "text-amber-600"}>
                          {b.status === "done" ? `✓ ${b.verses} פסוקים` : b.status === "error" ? `✗ ${b.msg}` : b.status === "parsing" ? "מעבד..." : "מוריד..."}
                        </span>
                      </div>
                    ))}
                  </div>
                  {sec.done && sec.summary && (
                    <p className="text-green-600 text-xs mt-2">
                      {sec.summary.totalVerses.toLocaleString()} פסוקים, {sec.summary.totalWords.toLocaleString()} מילים
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Strong's section */}
      <div className="mt-8 pt-6 border-t border-stone-200">
        <h2 className="text-lg font-bold text-stone-800 mb-1">מילון Strong's</h2>
        <p className="text-stone-500 text-sm mb-4">8,674 ערכים + זיהוי מילים ללא שורש ידוע. ~2 דקות.</p>
        {!strongsRunning && !strongsDone && (
          <button onClick={startStrongsSeed} className="bg-violet-700 hover:bg-violet-800 text-white font-medium px-5 py-2.5 rounded-xl transition-colors">
            אכלס מילון Strong's
          </button>
        )}
        {(strongsRunning || strongsDone) && (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            {strongsDone
              ? <p className="text-green-700 font-medium">✓ הושלם — {strongsCount?.toLocaleString()} ערכים</p>
              : <p className="text-amber-600 text-sm">{strongsMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
