"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { collect } from "@/lib/notebook";
import type { Side, View, ViewKind } from "@/lib/doublets";
import type { ShownVerse } from "@/lib/middot";
import PassageText from "@/app/prayers-songs/PassageText";

type ShownSide = Side & { bookHe: string; ref: string; href: string; verseCount: number; names: { yhwh: number; elohim: number } | null };
export type ShownDoublet = {
  id: string;
  title: string;
  question: string;
  sides: ShownSide[];
  diffs: { aspect: string; cells: ShownVerse[][] }[];
  views: View[];
  parallelId: number | null;
};
type KindInfo = { kind: ViewKind; title: string; about: string };

const KIND_STYLE: Record<ViewKind, { badge: string; border: string; bg: string }> = {
  classic: { badge: "bg-amber-600 text-white", border: "border-amber-300", bg: "bg-amber-50/60" },
  modern: { badge: "bg-sky-600 text-white", border: "border-sky-300", bg: "bg-sky-50/60" },
  academic: { badge: "bg-violet-600 text-white", border: "border-violet-300", bg: "bg-violet-50/60" },
};
const SIDE_STYLE = ["border-amber-400", "border-sky-400", "border-emerald-400"];

const sefariaHref = (ref: string) => `https://www.sefaria.org/${encodeURIComponent(ref.replace(/ /g, "_"))}?lang=he`;

export default function DoubletsView({ doublets, kinds }: { doublets: ShownDoublet[]; kinds: KindInfo[] }) {
  return (
    <>
      <section className="grid md:grid-cols-3 gap-3 mb-8">
        {kinds.map((k) => (
          <div key={k.kind} className={`rounded-xl border ${KIND_STYLE[k.kind].border} ${KIND_STYLE[k.kind].bg} p-4`}>
            <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 mb-2 ${KIND_STYLE[k.kind].badge}`}>{k.title}</span>
            <p className="text-sm text-stone-700 leading-relaxed">{k.about}</p>
          </div>
        ))}
      </section>

      <nav className="flex flex-wrap gap-1.5 mb-8" aria-label="הסיפורים">
        {doublets.map((d) => (
          <a key={d.id} href={`#${d.id}`} className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-sm hover:bg-amber-100 hover:text-amber-900 transition-colors">
            {d.title}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-8">
        {doublets.map((d) => <DoubletCard key={d.id} d={d} kinds={kinds} />)}
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

function VerseLine({ v }: { v: ShownVerse }) {
  return (
    <div>
      <p data-collect-source={v.ref} data-collect-href={v.href} className="text-stone-800 leading-loose">
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

function DoubletCard({ d, kinds }: { d: ShownDoublet; kinds: KindInfo[] }) {
  const cols = d.sides.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2";
  return (
    <article id={d.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm scroll-mt-4">
      <h2 className="text-2xl font-bold text-stone-800 mb-1">{d.title}</h2>
      <p className="text-stone-500 mb-5">{d.question}</p>

      <div className={`grid gap-3 mb-6 ${cols}`}>
        {d.sides.map((s, i) => (
          <div key={s.label} className={`rounded-xl bg-stone-50 border-t-4 ${SIDE_STYLE[i]} p-4`}>
            <h3 className="font-bold text-stone-800">{s.label}</h3>
            <Link href={s.href} className="text-xs text-amber-700 hover:underline">{s.ref}</Link>
            <p className="text-sm text-stone-600 leading-relaxed my-2">{s.summary}</p>
            {s.names && (
              <p className="text-xs text-stone-500 mb-2">
                שם הוי״ה: <b className="text-stone-700">{s.names.yhwh}</b> · אלהים: <b className="text-stone-700">{s.names.elohim}</b>
              </p>
            )}
            {s.verseCount > 0 && <PassageText book={s.range.book} bookHe={s.bookHe} from={s.range.from} to={s.range.to} verseCount={s.verseCount} />}
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-stone-700 mb-3">ההבדלים</h3>
      <div className="flex flex-col gap-4 mb-3">
        {d.diffs.map((diff) => (
          <div key={diff.aspect}>
            <p className="text-sm font-semibold text-stone-500 mb-1.5">{diff.aspect}</p>
            <div className={`grid gap-3 ${cols}`}>
              {diff.cells.map((cell, i) => (
                <div key={i} className={`border-s-4 ${SIDE_STYLE[i]} ps-3`}>
                  <p className="text-xs text-stone-400 mb-0.5">{d.sides[i].label}</p>
                  {cell.length ? cell.map((v) => <VerseLine key={v.ref} v={v} />) : <p className="text-sm text-stone-400">אין מקבילה בנוסח הזה</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {d.parallelId !== null && (
        <Link href={`/parallels/${d.parallelId}`} className="inline-block text-sm text-amber-700 hover:underline mb-3">
          השוואה מלאה, מילה במילה, בדף ״נוסחים מקבילים״ ←
        </Link>
      )}

      <h3 className="text-lg font-semibold text-stone-700 mt-4 mb-3">איך מסבירים את ההבדלים</h3>
      <div className="flex flex-col gap-3">
        {kinds.map((k) => {
          const views = d.views.filter((v) => v.kind === k.kind);
          if (!views.length) return null;
          return (
            <div key={k.kind} className={`rounded-xl border ${KIND_STYLE[k.kind].border} ${KIND_STYLE[k.kind].bg} p-4`}>
              <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 mb-2 ${KIND_STYLE[k.kind].badge}`}>{k.title}</span>
              <div className="flex flex-col gap-4">
                {views.map((v) => <ViewBlock key={v.who + (v.source ?? "")} v={v} title={d.title} />)}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ViewBlock({ v, title }: { v: View; title: string }) {
  const sourceLine = v.source ? `${v.who}, ${v.source}` : v.who;
  return (
    <div>
      <p className="font-semibold text-stone-800">
        {v.who}
        {v.source &&
          (v.sefariaRef ? (
            <a href={sefariaHref(v.sefariaRef)} target="_blank" rel="noopener noreferrer" className="font-normal text-xs text-stone-500 hover:text-amber-700 hover:underline ms-2">
              {v.source} ↗
            </a>
          ) : (
            <span className="font-normal text-xs text-stone-500 ms-2">{v.source}</span>
          ))}
      </p>
      {v.quote && (
        <blockquote data-collect-source={sourceLine} className="border-s-2 border-stone-300 ps-3 my-1.5 text-stone-800 leading-relaxed">
          ״{v.quote}״
        </blockquote>
      )}
      <p className="text-stone-700 text-sm leading-relaxed">{v.text}</p>
      <AddToNotebook
        text={`${title}: ${v.who}\n\n${v.quote ? `״${v.quote}״\n\n` : ""}${v.text}`}
        source={sourceLine}
        href={v.sefariaRef ? sefariaHref(v.sefariaRef) : "/doublets"}
      />
    </div>
  );
}
