"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { collect } from "@/lib/notebook";
import type { ShownVerse, SourceItem, SourcesPage } from "@/lib/middot";

export type ShownExample = { title: string; source: string; sefariaRef: string; explain: string; verses: ShownVerse[] };
export type ShownMiddah = { n: number; id: string; name: string; baraita: string; explain: string; examples: ShownExample[]; more: ShownExample[] };

const sefariaHref = (ref: string) => `https://www.sefaria.org/${encodeURIComponent(ref.replace(/ /g, "_"))}?lang=he`;

export default function MiddotView({ middot }: { middot: ShownMiddah[] }) {
  return (
    <>
      <nav className="flex flex-wrap gap-1.5 mb-8" aria-label="המידות">
        {middot.map((m) => (
          <a key={m.id} href={`#${m.id}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-sm hover:bg-amber-100 hover:text-amber-900 transition-colors">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">{m.n}</span>
            {m.name}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-6">
        {middot.map((m) => <MiddahCard key={m.id} m={m} />)}
      </div>
    </>
  );
}

function AddToNotebook({ text, source, href }: { text: string; source: string; href: string }) {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <button
      type="button"
      title="הוסף לדף במחברת"
      onClick={() => collect({ text, source: { source, href, attribution: null } })}
      className="text-sm text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-0.5 transition-colors"
    >
      📝 הוסף למחברת
    </button>
  );
}

function VerseBlock({ v }: { v: ShownVerse }) {
  return (
    <div>
      <p data-collect-source={v.ref} data-collect-href={v.href} className="text-stone-800 text-lg leading-loose">
        {v.words.map((w, i) => (
          <span key={i}>
            {i > 0 && " "}
            {v.marked.includes(i) ? <mark className="bg-amber-200/80 text-stone-900 rounded px-0.5">{w}</mark> : w}
          </span>
        ))}
      </p>
      <Link href={v.href} className="text-xs text-amber-700 hover:underline">{v.ref} ←</Link>
    </div>
  );
}

function ExampleCard({ e, middah }: { e: ShownExample; middah: string }) {
  const versesText = e.verses.map((v) => `${v.words.join(" ")} (${v.ref})`).join("\n\n");
  return (
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <h4 className="font-semibold text-stone-800">{e.title}</h4>
        <a href={sefariaHref(e.sefariaRef)} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-amber-700 hover:underline">
          {e.source}
        </a>
      </div>
      <p className="text-stone-600 text-sm leading-relaxed mb-3">{e.explain}</p>
      <div className="flex flex-col gap-2">
        {e.verses.map((v) => <VerseBlock key={v.ref} v={v} />)}
      </div>
      <div className="mt-2">
        <AddToNotebook
          text={`${middah}: ${e.title}\n\n${e.explain}${versesText ? `\n\n${versesText}` : ""}`}
          source={e.verses.length === 1 ? e.verses[0].ref : e.source}
          href={e.verses[0]?.href ?? sefariaHref(e.sefariaRef)}
        />
      </div>
    </div>
  );
}

function MiddahCard({ m }: { m: ShownMiddah }) {
  const [showMore, setShowMore] = useState(false);
  return (
    <section id={m.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm scroll-mt-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="shrink-0 w-10 h-10 rounded-full bg-amber-600 text-white text-lg font-bold flex items-center justify-center">{m.n}</span>
        <h2 className="text-2xl font-bold text-stone-800">{m.name}</h2>
      </div>
      <blockquote className="border-s-4 border-amber-300 bg-amber-50/60 rounded-e-lg px-4 py-2 text-stone-800 leading-relaxed mb-3">
        ״{m.baraita}״
      </blockquote>
      <p className="text-stone-600 leading-relaxed mb-4">{m.explain}</p>

      <h3 className="text-sm font-semibold text-stone-500 mb-2">{m.examples.length > 1 ? "הדוגמאות בברייתא" : "הדוגמה בברייתא"}</h3>
      <div className="flex flex-col gap-3">
        {m.examples.map((e) => <ExampleCard key={e.title} e={e} middah={m.name} />)}
      </div>

      <button
        type="button"
        onClick={() => setShowMore((s) => !s)}
        aria-expanded={showMore}
        className="mt-4 text-amber-700 font-medium hover:underline"
      >
        {showMore ? "הסתר דוגמאות נוספות" : m.more.length ? `עוד דוגמאות (${m.more.length})` : "עוד דוגמאות"}
      </button>
      {showMore && (
        <div className="mt-3 flex flex-col gap-3">
          {m.more.map((e, i) => <ExampleCard key={e.title + i} e={e} middah={m.name} />)}
          <SefariaSources id={m.id} name={m.name} />
        </div>
      )}
    </section>
  );
}

// Passages that name the middah, from Sefaria's search, five at a time
function SefariaSources({ id, name }: { id: string; name: string }) {
  const [items, setItems] = useState<SourceItem[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  function load() {
    if (next === null) return;
    setLoading(true);
    setError(false);
    fetch(`/api/middot/sources?id=${id}&from=${next}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (page: SourcesPage) => {
          setItems((x) => [...x, ...page.items]);
          setNext(page.next);
          setTotal(page.total);
        },
        () => setError(true)
      )
      .finally(() => setLoading(false));
  }

  return (
    <div className="border-t border-stone-100 pt-3">
      <p className="text-sm text-stone-500 mb-3 leading-relaxed">
        מקורות מהתלמוד הבבלי וממדרשי ההלכה שבהם ״{name}״ נזכרת בשמה, לפי החיפוש של ספריא. טקסט המקור מוצג רק ממהדורה
        ברישיון פתוח, עם שם המהדורה; אחרת מוצג קישור.
      </p>
      {total !== null && <p className="text-xs text-stone-400 mb-2">נמצאו {total} מקורות.</p>}
      <div className="flex flex-col gap-3">
        {items.map((s) => <SourceCard key={s.ref} s={s} />)}
      </div>
      {error && <p className="text-red-500 text-sm mt-2">ספריא אינה זמינה כרגע. נסו שוב.</p>}
      {next !== null && (
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="mt-3 w-full border-2 border-amber-600 text-amber-700 hover:bg-amber-50 disabled:opacity-60 font-medium py-2 rounded-xl transition-colors"
        >
          {loading ? "מחפש בספריא..." : items.length ? "עוד מקורות" : "חפש מקורות בספריא"}
        </button>
      )}
      {next === null && total !== null && items.length === 0 && <p className="text-sm text-stone-400">לא נמצאו מקורות נוספים.</p>}
    </div>
  );
}

function SourceCard({ s }: { s: SourceItem }) {
  const parts: { text: string; mark: boolean }[] = [];
  if (s.text) {
    let pos = 0;
    for (const [a, b] of s.marks) {
      if (a < pos) continue;
      parts.push({ text: s.text.slice(pos, a), mark: false }, { text: s.text.slice(a, b), mark: true });
      pos = b;
    }
    parts.push({ text: s.text.slice(pos), mark: false });
  }
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-800 hover:underline">{s.heRef}</a>
      {s.text ? (
        <>
          <p className="text-stone-700 leading-relaxed my-2">
            {parts.map((p, i) => (p.mark ? <mark key={i} className="bg-amber-200/80 text-stone-900 rounded px-0.5">{p.text}</mark> : <span key={i}>{p.text}</span>))}
          </p>
          <p className="text-[11px] text-stone-400 mb-2">ספריא · {s.version} · {s.license}</p>
        </>
      ) : (
        <p className="text-sm text-stone-400 my-2">הטקסט אינו מוצג כאן בגלל רישיון המהדורה. לחצו כדי לקרוא בספריא.</p>
      )}
      {s.verses.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-stone-100 pt-2">
          {s.verses.map((v) => <VerseBlock key={v.ref} v={v} />)}
        </div>
      )}
    </div>
  );
}
