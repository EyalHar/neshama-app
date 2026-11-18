"use client";

import { useState } from "react";
import Link from "next/link";
import type { AcrosticLetterStatus, AcrosticLine, AcrosticView } from "@/lib/letterHintsShared";
import { MarkedWords } from "./MarkedVerseText";

const LETTER_STYLE: Record<AcrosticLetterStatus, string> = {
  ok: "bg-amber-600 text-white",
  order: "bg-sky-100 text-sky-800 ring-1 ring-sky-300",
  missing: "bg-stone-100 text-stone-300 line-through",
};
const LETTER_TITLE: Record<AcrosticLetterStatus, string> = {
  ok: "במקומה",
  order: "מופיעה, אבל לא בסדר האלף־בית",
  missing: "חסרה",
};
const LINE_BADGE: Record<AcrosticLine["status"], string> = {
  ok: "bg-amber-600 text-white",
  same: "bg-amber-100 text-amber-800",
  off: "bg-stone-100 text-stone-400",
};

export default function Acrostics({ items }: { items: AcrosticView[] }) {
  return (
    <div>
      <p className="text-stone-500 text-sm mb-4 leading-relaxed">
        פרקים ששורותיהם פותחות זו אחר זו באותיות האלף־בית. האותיות שבראשי השורות נקראות כאן מהטקסט עצמו, ולכן רואים גם
        אות שחסרה או שבאה שלא במקומה.
      </p>
      <div className="flex flex-wrap gap-4 text-xs text-stone-500 mb-6">
        {(Object.keys(LETTER_STYLE) as AcrosticLetterStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] ${LETTER_STYLE[s]}`}>א</span>
            {LETTER_TITLE[s]}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {items.map((a) => <AcrosticCard key={a.id} a={a} />)}
      </div>
      <p className="text-xs text-stone-400 mt-6 leading-relaxed">
        יש המוצאים שרידים של אקרוסטיכון חלקי גם בנחום א, אבל שם הוא שבור ושנוי במחלוקת, ולכן אינו ברשימה.
      </p>
    </div>
  );
}

function AcrosticCard({ a }: { a: AcrosticView }) {
  const [open, setOpen] = useState(false);
  const missing = a.alphabet.filter((l) => l.status === "missing").map((l) => l.letter);
  const order = a.alphabet.filter((l) => l.status === "order").map((l) => l.letter);
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-xl font-bold text-stone-800">{a.title}</h3>
        <span className="text-sm text-stone-400">{a.ref} · {a.lines.length} שורות</span>
      </div>
      <p className="text-stone-600 text-sm leading-relaxed mb-3">{a.about}</p>
      <div className="flex flex-wrap gap-1 mb-2" aria-label="האותיות בראשי השורות">
        {a.alphabet.map((l) => (
          <span key={l.letter} title={LETTER_TITLE[l.status]} className={`w-7 h-7 rounded-md flex items-center justify-center font-bold ${LETTER_STYLE[l.status]}`}>
            {l.letter}
          </span>
        ))}
      </div>
      {(missing.length > 0 || order.length > 0) && (
        <p className="text-xs text-stone-500 mb-2">
          {missing.length > 0 && <>חסרות: {missing.join(", ")}. </>}
          {order.length > 0 && <>שלא בסדר: {order.join(", ")}.</>}
        </p>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-sm text-amber-700 hover:underline">
        {open ? "הסתר את השורות" : "הצג את השורות"}
      </button>
      {open && (
        <ol className="mt-3 border-t border-stone-100 pt-3 flex flex-col gap-1.5">
          {a.lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`shrink-0 w-7 h-7 mt-1 rounded-md flex items-center justify-center font-bold text-sm ${LINE_BADGE[line.status]}`}>{line.letter}</span>
              <div className="min-w-0">
                <p data-collect-source={line.ref} data-collect-href={line.href} className="text-stone-800 text-lg leading-relaxed">
                  <MarkedWords words={line.words} marks={[[0, 0]]} />
                </p>
                <Link href={line.href} className="text-xs text-stone-400 hover:text-amber-700 hover:underline">{line.ref}</Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
