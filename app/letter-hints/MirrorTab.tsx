"use client";

import { useState } from "react";
import type { MirrorResult } from "@/lib/letterHintsShared";
import MarkedVerseText, { PairGroups } from "./MarkedVerseText";
import { Loading, useJson } from "./common";

const WORDS_SHOWN = 40;

export default function MirrorTab() {
  const { data, error } = useJson<MirrorResult>("/api/letter-hints/mirror");
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [allWords, setAllWords] = useState(false);
  if (!data) return <Loading error={error} />;
  const words = allWords ? data.words : data.words.slice(0, WORDS_SHOWN);
  const open = data.words.find((w) => w.word === openWord);

  return (
    <div>
      <section className="mb-10">
        <h3 className="text-lg font-semibold text-stone-700 mb-1">מילים הפוכות באותו פסוק ({data.reversed.length})</h3>
        <p className="text-stone-500 text-sm mb-3 leading-relaxed">
          מילה, וגם המילה שנקראת כמוה מהסוף להתחלה, באותו פסוק: ״אֶת <b>הַשֵּׁם</b>… אֶל <b>מֹשֶׁה</b>״ (ויקרא כד, יא). כמו ״ענג״
          ו״נגע״ בספר יצירה: ״אין בטובה למעלה מענג, ואין ברעה למטה מנגע״.
        </p>
        <PairGroups pairs={data.reversed} sign="⇄" />
      </section>

      <section className="mb-10">
        <h3 className="text-lg font-semibold text-stone-700 mb-1">מילים פלינדרומיות ({data.words.length})</h3>
        <p className="text-stone-500 text-sm mb-3">מילים בנות שלוש אותיות ומעלה שנקראות זהה משני הכיוונים, מהארוכה לקצרה. לחצו על מילה לפסוק לדוגמה.</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {words.map((w) => (
            <button
              key={w.word}
              type="button"
              onClick={() => setOpenWord(openWord === w.word ? null : w.word)}
              aria-pressed={openWord === w.word}
              className={`px-2.5 py-1 rounded-full text-sm transition-colors ${openWord === w.word ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-700 hover:bg-amber-100"}`}
            >
              {w.word} <span className="opacity-60 text-xs">{w.count}</span>
            </button>
          ))}
          {!allWords && data.words.length > WORDS_SHOWN && (
            <button type="button" onClick={() => setAllWords(true)} className="px-2.5 py-1 text-sm text-amber-700 hover:underline">
              הצג את כל {data.words.length}
            </button>
          )}
        </div>
        {open && (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <MarkedVerseText v={open.example} />
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-semibold text-stone-700 mb-1">צירופים פלינדרומיים ({data.phrases.length})</h3>
        <p className="text-stone-500 text-sm mb-3">
          שתיים עד שש מילים רצופות שאותיותיהן, יחד, נקראות זהה משני הכיוונים (שבע אותיות ומעלה), מהארוך לקצר.
        </p>
        <div className="grid gap-3">
          {data.phrases.map((v, i) => (
            <div key={v.ref + i} className="bg-white border border-stone-200 rounded-xl p-4"><MarkedVerseText v={v} /></div>
          ))}
        </div>
      </section>
    </div>
  );
}
