"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";
import type { ChainLink, FormParse, LexemeAnalysis, WordAnalysisResult } from "@/lib/wordAnalysis";

const COLLAPSED = 3;
const REFS_SHOWN = 12;

type Props = {
  q: string;
  whole: boolean;
  scope: string;
  // Opens the root search for a root, with its whole word family
  onPickRoot: (root: string) => void;
  // In the search tabs the panel starts short; in the "מה השורש?" tab it shows everything
  compact?: boolean;
};

function ChainItem({ link }: { link: ChainLink }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span className="text-lg font-bold text-stone-800">{link.lemmaHe}</span>
      <span className="text-[11px] text-stone-400 max-w-40 text-center leading-tight" dir="ltr">{link.definition}</span>
    </span>
  );
}

function ParseRefs({ p }: { p: FormParse }) {
  const [all, setAll] = useState(false);
  const refs = all ? p.refs : p.refs.slice(0, REFS_SHOWN);
  const more = p.count - refs.length;
  return (
    <li className="py-2">
      <p className="text-sm text-stone-700 mb-1.5">
        {p.parse} <span className="text-xs text-stone-400">×{p.count}</span>
      </p>
      <div className="flex flex-wrap gap-1">
        {refs.map((r) => (
          <Link
            key={`${r.book}:${r.chapter}:${r.verse}`}
            href={`/tanakh?book=${encodeURIComponent(r.book)}&chapter=${r.chapter}&verse=${r.verse}`}
            className="text-xs text-amber-800 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-md px-1.5 py-0.5 transition-colors"
          >
            {r.bookHe} {toHebrewNumeral(r.chapter)}&lrm;:{toHebrewNumeral(r.verse)}
          </Link>
        ))}
        {more > 0 && (
          !all && p.refs.length > refs.length ? (
            <button type="button" onClick={() => setAll(true)} className="text-xs text-amber-700 hover:underline px-1">
              הצג עוד ({more})
            </button>
          ) : (
            <span className="text-xs text-stone-400 px-1">ועוד {more} מופעים</span>
          )
        )}
      </div>
    </li>
  );
}

function Lexeme({ l, onPickRoot }: { l: LexemeAnalysis; onPickRoot: (root: string) => void }) {
  const [selected, setSelected] = useState(0);
  const form = l.forms[selected];
  const root = l.chain[l.chain.length - 1];
  const derived = l.chain.length > 1;
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold text-stone-800">{l.lemmaHe}</span>
          <span className="text-xs bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">{l.pos}</span>
        </div>
        <span className="text-xs text-stone-400">{l.count.toLocaleString()} מופעים</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2" role="tablist" aria-label="צורות המילה">
        {l.forms.map((f, i) => (
          <button
            key={f.form}
            type="button"
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={`text-sm rounded-lg px-2 py-0.5 border transition-colors ${
              i === selected
                ? "bg-amber-700 border-amber-700 text-white"
                : "bg-amber-50 border-amber-100 text-stone-700 hover:border-amber-400"
            }`}
          >
            {f.form}
            <span className={`text-[11px] ms-1 ${i === selected ? "text-amber-100" : "text-stone-400"}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {form && (
        <div className="bg-amber-50/60 border border-amber-100 rounded-lg px-3 mb-3">
          <ul className="divide-y divide-amber-100">
            {form.parses.map((p) => <ParseRefs key={p.parse} p={p} />)}
          </ul>
        </div>
      )}

      <div className="border-t border-stone-100 pt-3">
        <p className="text-xs font-medium text-stone-500 mb-2">
          {derived ? "גזירה לפי Strong's" : l.primitiveRoot ? "שורש ראשוני לפי Strong's" : "מקור לפי Strong's"}
        </p>
        <div className="flex items-start gap-2 flex-wrap">
          {l.chain.map((link, i) => (
            <span key={link.number} className="inline-flex items-start gap-2">
              {i > 0 && <span className="text-stone-300 text-lg pt-0.5">←</span>}
              <ChainItem link={link} />
            </span>
          ))}
        </div>
        {l.candidates.length > 0 && (
          <p className="text-xs text-stone-500 mt-2">
            Strong&apos;s מפנה כאן לכמה ערכים, בלי לציין מה המקור:{" "}
            {l.candidates.map((c, i) => (
              <span key={c.number}>
                {i > 0 && "، "}
                <button type="button" onClick={() => onPickRoot(c.lemmaPlain)} className="font-bold text-amber-700 hover:underline">
                  {c.lemmaHe}
                </button>
              </span>
            ))}
          </p>
        )}
        {!derived && !l.primitiveRoot && l.candidates.length === 0 && (
          <p className="text-xs text-stone-400 mt-2">Strong&apos;s לא מציין שורש למילה הזו</p>
        )}
        {root && (derived || l.primitiveRoot) && (
          <button
            type="button"
            onClick={() => onPickRoot(root.lemmaPlain)}
            className="mt-3 text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            כל המשפחה של {root.lemmaPlain} ←
          </button>
        )}
      </div>
    </div>
  );
}

export default function WordAnalysis({ q, whole, scope, onPickRoot, compact = false }: Props) {
  const [data, setData] = useState<WordAnalysisResult | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q, scope, whole: whole ? "1" : "0" });
    fetch(`/api/verses/analyze?${params}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setError(true); });
    return () => controller.abort();
  }, [q, whole, scope]);

  if (error) return <p className="text-sm text-red-600 my-3">ניתוח המילים נכשל</p>;
  if (!data) return <p className="text-sm text-stone-400 my-3">מנתח את המילים…</p>;
  if (data.lexemes.length === 0) {
    return compact ? null : <p className="text-stone-500 text-center py-6">המילה לא נמצאה בתנ״ך. נסו לכתוב אותה בלי ניקוד, כפי שהיא מופיעה בפסוק.</p>;
  }

  const shown = expanded ? data.lexemes : data.lexemes.slice(0, COLLAPSED);
  const hidden = data.totalLexemes - shown.length;

  return (
    <section className={compact ? "bg-stone-50 border border-stone-200 rounded-2xl p-4 my-4" : ""}>
      {compact && (
        <h2 className="text-sm font-semibold text-stone-700 mb-3">
          ממה בנויות המילים שנמצאו?{" "}
          <span className="font-normal text-stone-400">
            {data.totalLexemes === 1 ? "ערך מילוני אחד" : `${data.totalLexemes} ערכים מילוניים`}
          </span>
        </h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shown.map((l) => <Lexeme key={l.number} l={l} onPickRoot={onPickRoot} />)}
      </div>
      {hidden > 0 && (
        expanded ? (
          <p className="text-xs text-stone-400 mt-3">ועוד {hidden} ערכים נדירים יותר</p>
        ) : (
          <button type="button" onClick={() => setExpanded(true)} className="text-sm text-amber-700 hover:underline mt-3">
            הצג עוד {Math.min(hidden, data.lexemes.length - shown.length)} ערכים
          </button>
        )
      )}
      <p className="text-[11px] text-stone-400 mt-3">
        הניתוח מתוך OSHB (מורפולוגיה) ו-Strong&apos;s (גזירה). השורש שמציין Strong&apos;s הוא הצעה של מילון מ-1894, לא הכרעה.
      </p>
    </section>
  );
}
