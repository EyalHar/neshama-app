"use client";

import { useState } from "react";
import Link from "next/link";
import type { Idiom, IdiomType } from "@/lib/idioms";
import type { ShownVerse } from "@/lib/middot";

export type ShownIdiom = Idiom & { section: string; shown: ShownVerse[] };

const TYPE_LABEL: Record<IdiomType, string> = { verbatim: "לשון הפסוק", adapted: "מעובד מפסוק", later: "נבנה על סיפור" };
const TYPE_STYLE: Record<IdiomType, string> = {
  verbatim: "bg-amber-100 text-amber-900",
  adapted: "bg-sky-100 text-sky-900",
  later: "bg-violet-100 text-violet-900",
};
const SECTIONS = ["תורה", "נביאים", "כתובים"];

const plain = (s: string) => s.replace(/[֑-ׇ]/g, "").replace(/[״׳"']/g, "");

const sefariaHref = (ref: string) => `https://www.sefaria.org/${encodeURIComponent(ref.replace(/ /g, "_"))}?lang=he`;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 rounded-full text-sm transition-colors ${active ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
    >
      {children}
    </button>
  );
}

export default function IdiomsBrowser({ idioms }: { idioms: ShownIdiom[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<IdiomType | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [changedOnly, setChangedOnly] = useState(false);

  const query = plain(q.trim());
  const shown = idioms.filter(
    (i) =>
      (!type || i.type === type) &&
      (!section || i.section === section) &&
      (!changedOnly || i.changed) &&
      (!query || [i.saying, i.meaning, i.context, ...i.shown.map((v) => v.words.join(" "))].some((t) => plain(t).includes(query)))
  );
  const count = (pred: (i: ShownIdiom) => boolean) => idioms.filter(pred).length;

  return (
    <>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש: ביטוי, מילה או משמעות"
        className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-lg mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Chip active={!type} onClick={() => setType(null)}>הכול ({idioms.length})</Chip>
        {(Object.keys(TYPE_LABEL) as IdiomType[]).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
            {TYPE_LABEL[t]} ({count((i) => i.type === t)})
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {SECTIONS.map((s) => (
          <Chip key={s} active={section === s} onClick={() => setSection(section === s ? null : s)}>
            {s} ({count((i) => i.section === s)})
          </Chip>
        ))}
        <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer ms-2">
          <input type="checkbox" checked={changedOnly} onChange={(e) => setChangedOnly(e.target.checked)} className="accent-amber-600" />
          רק כאלה שמשמעותם השתנתה ({count((i) => i.changed)})
        </label>
      </div>

      <p className="text-sm text-stone-500 mb-3" aria-live="polite">{shown.length} ביטויים</p>
      <div className="flex flex-col gap-4">
        {shown.map((i) => <IdiomCard key={i.id} i={i} />)}
      </div>
      {shown.length === 0 && <p className="text-stone-400 text-center py-10">לא נמצאו ביטויים.</p>}
    </>
  );
}

function IdiomCard({ i }: { i: ShownIdiom }) {
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-2xl font-bold text-stone-800">״{i.saying}״</h2>
        <div className="flex items-center gap-1.5">
          {i.changed && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-800">המשמעות השתנתה</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLE[i.type]}`}>{TYPE_LABEL[i.type]}</span>
        </div>
      </div>
      <p className="text-stone-700 mb-3">{i.meaning}</p>

      <div className="flex flex-col gap-2 mb-2">
        {i.shown.map((v) => (
          <div key={v.ref} className="bg-stone-50 rounded-xl px-4 py-3">
            <p data-collect-source={v.ref} data-collect-href={v.href} className="text-stone-800 text-lg leading-loose">
              {v.words.map((w, k) => (
                <span key={k}>
                  {k > 0 && " "}
                  {v.marked.includes(k) ? <mark className="bg-amber-200/80 text-stone-900 rounded px-0.5">{w}</mark> : w}
                </span>
              ))}
            </p>
            <Link href={v.href} className="text-xs text-amber-700 hover:underline">{v.ref} ←</Link>
          </div>
        ))}
      </div>
      <p className="text-sm text-stone-600 leading-relaxed">
        <b className="text-stone-700">בפסוק:</b> {i.context}
      </p>
      {i.later && (
        <p className="text-sm text-stone-600 mt-1">
          <b className="text-stone-700">נוסח הביטוי מופיע לראשונה:</b>{" "}
          <a href={sefariaHref(i.later.sefariaRef)} target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">
            {i.later.source} ↗
          </a>
        </p>
      )}
    </article>
  );
}
