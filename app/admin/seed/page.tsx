"use client";

import { useState } from "react";

type BookStatus = { book: string; status: "downloading" | "parsing" | "done" | "error"; verses?: number; msg?: string };

export default function SeedPage() {
  const [running, setRunning] = useState(false);
  const [books, setBooks] = useState<BookStatus[]>([]);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<{ totalVerses: number; totalWords: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [strongsRunning, setStrongsRunning] = useState(false);
  const [strongsDone, setStrongsDone] = useState(false);
  const [strongsMsg, setStrongsMsg] = useState<string | null>(null);
  const [strongsCount, setStrongsCount] = useState<number | null>(null);

  function startStrongsSeed() {
    setStrongsRunning(true);
    setStrongsDone(false);
    setStrongsMsg("מוריד...");
    setStrongsCount(null);

    const es = new EventSource("/api/admin/seed-strongs");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "progress") setStrongsMsg(data.msg);
      else if (data.type === "complete") {
        setStrongsCount(data.count);
        setStrongsDone(true);
        setStrongsRunning(false);
        es.close();
      } else if (data.type === "error") {
        setStrongsMsg(`שגיאה: ${data.msg}`);
        setStrongsRunning(false);
        es.close();
      }
    };
    es.onerror = () => { setStrongsRunning(false); setStrongsMsg("החיבור נותק"); es.close(); };
  }

  function startSeed() {
    setRunning(true);
    setBooks([]);
    setDone(false);
    setSummary(null);

    const es = new EventSource("/api/admin/seed-oshb");

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "progress") {
        setBooks((prev) => {
          const existing = prev.findIndex((b) => b.book === data.book);
          const updated = { book: data.book, status: data.status, verses: data.verses };
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = updated;
            return next;
          }
          return [...prev, updated];
        });
      } else if (data.type === "complete") {
        setSummary({ totalVerses: data.totalVerses, totalWords: data.totalWords });
        setDone(true);
        setRunning(false);
        es.close();
      } else if (data.type === "error") {
        setErrorMsg(data.msg ?? "שגיאה לא ידועה");
        setRunning(false);
        es.close();
      }
    };

    es.onerror = () => {
      setErrorMsg("החיבור נותק — ודא שהשרת פועל ונסה שוב");
      setRunning(false);
      es.close();
    };
  }

  const doneCount = books.filter((b) => b.status === "done").length;
  const total = 39;
  const progress = Math.round((doneCount / total) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">אכלוס DB מ-OSHB</h1>
      <p className="text-stone-500 text-sm mb-6">
        מוריד ומעבד את כל {total} ספרי התנ״ך מ-Open Scriptures Hebrew Bible ושומר פסוקים ומילים ל-DB.
        פעולה חד-פעמית — אורכת כ-5–10 דקות.
      </p>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 font-medium mb-1">שגיאה</p>
          <p className="text-red-600 text-sm font-mono">{errorMsg}</p>
        </div>
      )}

      {!running && !done && (
        <button
          onClick={() => { setErrorMsg(null); startSeed(); }}
          className="bg-amber-700 hover:bg-amber-800 text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          התחל אכלוס
        </button>
      )}

      {(running || done) && (
        <>
          <div className="w-full bg-stone-200 rounded-full h-3 mb-4">
            <div
              className="bg-amber-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-stone-500 text-sm mb-4">{doneCount} / {total} ספרים</p>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {books.map((b) => (
              <div key={b.book} className="flex items-center justify-between bg-white border border-stone-200 rounded-lg px-4 py-2 text-sm">
                <span className="text-stone-700">{b.book}</span>
                <span className={
                  b.status === "done" ? "text-green-600" :
                  b.status === "error" ? "text-red-500" :
                  "text-amber-600"
                }>
                  {b.status === "done" ? `✓ ${b.verses} פסוקים` :
                   b.status === "error" ? `✗ ${b.msg}` :
                   b.status === "parsing" ? "מעבד..." : "מוריד..."}
                </span>
              </div>
            ))}
          </div>

          {done && summary && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-700 font-medium">הושלם בהצלחה!</p>
              <p className="text-green-600 text-sm mt-1">
                {summary.totalVerses.toLocaleString()} פסוקים, {summary.totalWords.toLocaleString()} מילים
              </p>
            </div>
          )}
        </>
      )}

      {/* Strong's seed section */}
      <div className="mt-10 pt-8 border-t border-stone-200">
        <h2 className="text-lg font-bold text-stone-800 mb-1">אכלוס מילון Strong's</h2>
        <p className="text-stone-500 text-sm mb-4">
          מוריד את מילון Strong's Hebrew (8,674 ערכים) ושומר קישורי שורש-נגזרת. פעולה חד-פעמית — כ-2 דקות.
        </p>

        {!strongsRunning && !strongsDone && (
          <button
            onClick={startStrongsSeed}
            className="bg-violet-700 hover:bg-violet-800 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            אכלס מילון Strong's
          </button>
        )}

        {(strongsRunning || strongsDone) && (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            {strongsDone ? (
              <p className="text-green-700 font-medium">✓ הושלם — {strongsCount?.toLocaleString()} ערכים נשמרו</p>
            ) : (
              <p className="text-amber-600 text-sm">{strongsMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
