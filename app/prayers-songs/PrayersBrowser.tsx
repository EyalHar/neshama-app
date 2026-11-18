"use client";

import { useState } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";
import type { PrayerKind, PrayerSong } from "@/lib/prayersSongs";
import { PSALM_ATTRIBUTIONS, PSALM_TAGS, type PsalmAttribution, type PsalmTag, type PsalmTitle } from "@/lib/psalmTitles";
import PassageText from "./PassageText";

export type PrayerEntry = PrayerSong & { bookHe: string; section: string; ref: string; opening: string; verseCount: number };
export type WrittenAsSongEntry = { title: string; book: string; bookHe: string; from: [number, number]; to: [number, number]; ref: string; verseCount: number };
export type PsalmEntry = PsalmTitle & { n: number; text: string; verseCount: number };

const KINDS: PrayerKind[] = ["שירה", "תפילה", "קינה", "ברכה"];
const KIND_STYLE: Record<PrayerKind, string> = {
  שירה: "bg-amber-100 text-amber-800",
  תפילה: "bg-sky-100 text-sky-800",
  קינה: "bg-stone-200 text-stone-700",
  ברכה: "bg-emerald-100 text-emerald-800",
};
const SECTIONS = ["תורה", "נביאים", "כתובים"];
const ATTRIBUTION_TITLE: Record<PsalmAttribution | "none", string> = {
  דוד: "לדוד",
  "בני קרח": "לבני קרח",
  אסף: "לאסף",
  שלמה: "לשלמה",
  משה: "למשה",
  הימן: "להימן",
  איתן: "לאיתן",
  none: "בלי ייחוס בכותרת",
};

const readerHref = (book: string, [chapter, verse]: [number, number]) =>
  `/tanakh?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`;

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

export default function PrayersBrowser({ entries, written, psalms }: { entries: PrayerEntry[]; written: WrittenAsSongEntry[]; psalms: PsalmEntry[] }) {
  const [kind, setKind] = useState<PrayerKind | null>(null);
  const [tag, setTag] = useState<PsalmTag | null>(null);
  const shown = kind ? entries.filter((e) => e.kind === kind) : entries;
  const shownPsalms = tag ? psalms.filter((p) => p.tags.includes(tag)) : psalms;
  const groups: (PsalmAttribution | "none")[] = [...PSALM_ATTRIBUTIONS, "none"];

  return (
    <>
      <nav className="flex gap-4 text-sm mb-6">
        <a href="#books" className="text-amber-700 hover:underline">בספרי התנ״ך ({entries.length})</a>
        <a href="#psalms" className="text-amber-700 hover:underline">ספר תהלים ({psalms.length})</a>
      </nav>

      <section id="books" className="mb-12 scroll-mt-4">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Chip active={!kind} onClick={() => setKind(null)}>הכול</Chip>
          {KINDS.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === "שירה" ? "שירות" : k === "תפילה" ? "תפילות" : k === "קינה" ? "קינות" : "ברכות"} ({entries.filter((e) => e.kind === k).length})
            </Chip>
          ))}
        </div>

        {SECTIONS.map((section) => {
          const list = shown.filter((e) => e.section === section);
          if (!list.length) return null;
          return (
            <div key={section} className="mb-8">
              <h2 className="text-lg font-semibold text-stone-700 mb-3">{section}</h2>
              <div className="flex flex-col gap-3">
                {list.map((e) => <EntryCard key={e.id} e={e} />)}
              </div>
            </div>
          );
        })}

        {!kind && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-600">
            <p className="mb-2">
              לא שירות, אבל נכתבות בספר כמו שירה, ״אריח על גבי אריח״: ״חוץ משירה זו ומלכי כנען שאריח על גבי אריח״ (מגילה טז, ב).
            </p>
            <ul className="flex flex-col gap-1">
              {written.map((w) => (
                <li key={w.title}>
                  <Link href={readerHref(w.book, w.from)} className="text-amber-700 hover:underline">{w.title}</Link>
                  <span className="text-stone-400"> · {w.ref}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section id="psalms" className="scroll-mt-4">
        <h2 className="text-2xl font-bold text-stone-800 mb-2">ספר תהלים</h2>
        <p className="text-stone-500 text-sm mb-4">
          המזמורים לפי הכותרת שבראשם: למי הם מיוחסים ואיך הם נקראים. הכותרת נקראת מהפסוק הראשון של כל מזמור.
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Chip active={!tag} onClick={() => setTag(null)}>הכול</Chip>
          {PSALM_TAGS.map((t) => (
            <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
              {t} ({psalms.filter((p) => p.tags.includes(t)).length})
            </Chip>
          ))}
        </div>

        {groups.map((g) => {
          const list = shownPsalms.filter((p) => (g === "none" ? p.attributions.length === 0 : p.attributions[0] === g));
          if (!list.length) return null;
          return (
            <div key={g} className="mb-8">
              <h3 className="text-lg font-semibold text-stone-700 mb-3">
                {ATTRIBUTION_TITLE[g]} <span className="text-stone-400 font-normal text-sm">({list.length})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {list.map((p) => <PsalmRow key={p.n} p={p} />)}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

function EntryCard({ e }: { e: PrayerEntry }) {
  return (
    <article className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-lg font-bold text-stone-800">{e.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${KIND_STYLE[e.kind]}`}>{e.kind}</span>
      </div>
      <p className="text-sm text-stone-500 mb-2">
        {e.who && <>{e.who} · </>}
        <Link href={readerHref(e.book, e.from)} className="text-amber-700 hover:underline">{e.ref}</Link>
      </p>
      {e.layout && <p className="text-xs text-stone-500 bg-amber-50/60 rounded-lg px-2.5 py-1.5 mb-2">📜 {e.layout}</p>}
      <p className="text-stone-700 leading-relaxed mb-2 line-clamp-2">{e.opening}</p>
      <PassageText book={e.book} bookHe={e.bookHe} from={e.from} to={e.to} verseCount={e.verseCount} />
    </article>
  );
}

function PsalmRow({ p }: { p: PsalmEntry }) {
  return (
    <article className="bg-white border border-stone-200 rounded-xl px-4 py-3">
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <Link href={readerHref("Psalms", [p.n, 1])} className="font-bold text-amber-800 hover:underline">
          מזמור {toHebrewNumeral(p.n)}
        </Link>
        {p.attributions.length > 1 && <span className="text-xs text-stone-500">({p.attributions.map((a) => ATTRIBUTION_TITLE[a]).join(", ")})</span>}
        {p.tags.map((t) => (
          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{t}</span>
        ))}
      </div>
      <p className="text-stone-700 leading-relaxed mb-1 line-clamp-1">{p.text}</p>
      <PassageText book="Psalms" bookHe="תהלים" from={[p.n, 1]} to={[p.n, p.verseCount]} verseCount={p.verseCount} />
    </article>
  );
}
