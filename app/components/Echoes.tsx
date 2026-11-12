"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { collect } from "@/lib/notebook";
import type { Echo, EchoResult } from "@/lib/echoes";

export function EchoIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <path d="M10 8.5a5 5 0 0 1 0 7" />
      <path d="M13.5 5.5a9 9 0 0 1 0 13" />
      <path d="M17 2.8a13 13 0 0 1 0 18.4" />
    </svg>
  );
}

function Highlighted({ text, marks }: { text: string; marks: number[] }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          {marks.includes(i + 1) ? <mark className="bg-violet-100 text-violet-950 rounded px-0.5">{w}</mark> : w}
        </span>
      ))}
    </>
  );
}

function EchoCard({ e, selected, onSelect, signedIn }: { e: Echo; selected: boolean; onSelect: () => void; signedIn: boolean }) {
  const ref = `${e.bookHe} ${toHebrewNumeral(e.chapter)}:${toHebrewNumeral(e.verse)}`;
  const href = `/tanakh?book=${encodeURIComponent(e.book)}&chapter=${e.chapter}&verse=${e.verse}`;
  return (
    <li
      onClick={onSelect}
      className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
        selected ? "border-violet-300 bg-violet-50/60" : "border-stone-200 hover:border-violet-200"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <Link href={href} onClick={(ev) => ev.stopPropagation()} className="text-sm font-semibold text-violet-800 hover:underline">
          {ref}
        </Link>
        {e.parallelId !== null && (
          <Link
            href={`/parallels/${e.parallelId}`}
            onClick={(ev) => ev.stopPropagation()}
            className="text-[11px] bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 hover:bg-amber-200"
          >
            נוסח מקביל · השווה ←
          </Link>
        )}
        {signedIn && (
          <button
            type="button"
            title="הוסף פסוק לדף במחברת"
            onClick={(ev) => { ev.stopPropagation(); collect({ text: e.text, source: { source: ref, href, attribution: null } }); }}
            className="ms-auto text-[15px] leading-none p-0.5 rounded-full hover:bg-stone-200"
          >
            📝
          </button>
        )}
      </div>
      <p data-collect-source={ref} data-collect-href={href} className="text-stone-700 leading-relaxed">
        <Highlighted text={e.text} marks={e.highlight} />
      </p>
      <p className="text-xs text-stone-500 mt-1.5">
        משותף:{" "}
        {[...e.phrases.map((ph) => `״${ph}״`), ...e.shared].join(" · ")}
      </p>
    </li>
  );
}

// Verses elsewhere in the Tanakh that echo this one: they share a combination of words that is
// rare in the whole Tanakh (lib/echoes.ts). Strong echoes first; weak ones behind a toggle.
export default function Echoes({ book, chapter, verse, onClose }: { book: string; chapter: number; verse: number; onClose: () => void }) {
  const { data: session } = useSession();
  const [data, setData] = useState<EchoResult | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(0);
  const [showWeak, setShowWeak] = useState(false);

  useEffect(() => {
    fetch(`/api/echoes?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [book, chapter, verse]);

  const echoes = data?.echoes ?? [];
  const strong = echoes.filter((e) => e.strength === "strong");
  const weak = echoes.filter((e) => e.strength === "weak");
  const shown = strong.length === 0 || showWeak ? echoes : strong;
  const current = echoes[selected];
  const bookHe = TANAKH_BOOKS.find((b) => b.id === book)?.he ?? book;

  return (
    <div onClick={(e) => e.stopPropagation()} className="bg-white border border-stone-200 rounded-xl shadow-sm cursor-default">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs font-bold text-stone-500">הדים: פסוקים שחולקים צירוף מילים נדיר</span>
        <button type="button" onClick={onClose} title="סגור" className="text-stone-400 hover:text-stone-600 w-6 h-6 rounded-full hover:bg-stone-100 transition-colors">
          ✕
        </button>
      </div>

      <div className="px-3 pb-3 pt-1 max-h-[60vh] overflow-y-auto">
        {!data && !error && <p className="py-6 text-center text-sm text-stone-400">מחפש הדים בכל התנ״ך…</p>}
        {error && <p className="py-6 text-center text-sm text-red-500">החיפוש נכשל, נסו שוב</p>}
        {data && echoes.length === 0 && (
          <p className="py-6 text-center text-sm text-stone-400">לא נמצאו הדים: הפסוק לא חולק צירוף מילים נדיר עם פסוק אחר</p>
        )}

        {current && (
          <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs text-stone-400 me-1">{bookHe} {toHebrewNumeral(chapter)}:{toHebrewNumeral(verse)}:</span>
            <Highlighted text={data!.sourceText} marks={current.sourceHighlight} />
          </p>
        )}

        {echoes.length > 0 && (
          <ul className="space-y-2">
            {shown.map((e) => {
              const i = echoes.indexOf(e);
              return <EchoCard key={`${e.book}:${e.chapter}:${e.verse}`} e={e} selected={i === selected} onSelect={() => setSelected(i)} signedIn={!!session} />;
            })}
          </ul>
        )}

        {strong.length > 0 && weak.length > 0 && (
          <button type="button" onClick={() => setShowWeak(!showWeak)} className="text-xs text-violet-700 hover:underline mt-2">
            {showWeak ? "הסתר הדים חלשים" : `הצג עוד ${weak.length} הדים חלשים`}
          </button>
        )}
        {echoes.length > 0 && (
          <p className="text-[11px] text-stone-400 mt-3">
            הד הוא דמיון בשפה, לא בהכרח רמז מכוון. {strong.length === 0 && "כל ההדים כאן חלשים: צירוף אחד, בין מילים נפוצות יחסית."}
          </p>
        )}
      </div>
    </div>
  );
}
