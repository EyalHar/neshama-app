"use client";

import { useEffect, useState } from "react";
import type { Commentary } from "@/lib/commentaries";

async function requestCommentaries(book: string, chapter: number, verse: number): Promise<Commentary[]> {
  const res = await fetch(`/api/commentaries?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error);
  return data.commentaries;
}

export function BookIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" />
      <path d="M12 6.5V19" />
    </svg>
  );
}

// Classic commentaries on one verse, one tab per commentator (texts from Sefaria; only
// public-domain / open-licensed editions are shown, others link out to Sefaria).
export default function Commentaries({
  book,
  chapter,
  verse,
  onClose,
}: {
  book: string;
  chapter: number;
  verse: number;
  onClose: () => void;
}) {
  const [commentaries, setCommentaries] = useState<Commentary[] | null>(null);
  const [error, setError] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    requestCommentaries(book, chapter, verse).then(setCommentaries, () => setError(true));
  }, [book, chapter, verse]);

  const active = commentaries?.find((c) => c.key === activeKey) ?? commentaries?.[0];

  return (
    <div onClick={(e) => e.stopPropagation()} className="bg-white border border-stone-200 rounded-xl shadow-sm cursor-default">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs font-bold text-stone-500">פרשנים</span>
        <button
          type="button"
          onClick={onClose}
          title="סגור"
          className="text-stone-400 hover:text-stone-600 w-6 h-6 rounded-full hover:bg-stone-100 transition-colors"
        >
          ✕
        </button>
      </div>

      {!commentaries && !error && <p className="px-4 py-6 text-center text-sm text-stone-400">טוען פרשנים...</p>}
      {error && <p className="px-4 py-6 text-center text-sm text-red-500">טעינת הפרשנים נכשלה, נסה שוב</p>}
      {commentaries?.length === 0 && <p className="px-4 py-6 text-center text-sm text-stone-400">לא נמצאו פרשנים לפסוק זה</p>}

      {commentaries && active && (
        <>
          <div className="flex gap-1 overflow-x-auto px-2 border-b border-stone-200" role="tablist">
            {commentaries.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={c.key === active.key}
                onClick={() => setActiveKey(c.key)}
                className={`shrink-0 px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
                  c.key === active.key
                    ? "border-amber-600 text-amber-800 font-medium"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {c.he}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 max-h-[50vh] overflow-y-auto" role="tabpanel">
            {active.status === "ok" ? (
              <>
                <div className="space-y-2 text-stone-700 leading-relaxed">
                  {active.segments.map((s, i) => (
                    // Server-sanitized: only <b>/<i>/<strong>/<em>/<br> without attributes remain
                    <p key={i} dangerouslySetInnerHTML={{ __html: s }} />
                  ))}
                </div>
                <p className="mt-3 pt-2 border-t border-stone-100 text-[11px] text-stone-400">
                  מקור: {active.versionTitle} · רישיון {active.license} ·{" "}
                  <a href={active.sefariaUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">
                    ספריא
                  </a>
                </p>
              </>
            ) : (
              <p className="text-sm text-stone-500 py-3 text-center">
                את הפירוש של {active.he} לפסוק זה אי אפשר להציג כאן.{" "}
                <a href={active.sefariaUrl} target="_blank" rel="noopener noreferrer" className="text-amber-700 underline">
                  לקריאה באתר ספריא ←
                </a>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
