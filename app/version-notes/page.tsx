import Link from "next/link";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { TRADITIONS, VERSION_NOTES, noteRange, type VersionNoteEntry } from "@/lib/versionNotes";
import PageHeader from "@/app/components/PageHeader";

const BOOK_HE = Object.fromEntries(TANAKH_BOOKS.map((b) => [b.id, b.he]));
// A word with nikud in a note is the variant reading it quotes; the rest of the note is unpointed
const POINTED = /[֑-ׇ]/;

function NoteCard({ n }: { n: VersionNoteEntry }) {
  const ref = `${BOOK_HE[n.book]} ${toHebrewNumeral(n.chapter)}:${toHebrewNumeral(n.verse)}`;
  const href = `/tanakh?book=${encodeURIComponent(n.book)}&chapter=${n.chapter}&verse=${n.verse}`;
  const { start, end } = noteRange(n);
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <Link href={href} className="text-sm font-semibold text-amber-700 hover:underline">{ref}</Link>
        {/פרשה/.test(n.note) && <span className="text-[11px] text-stone-500 bg-stone-100 rounded-full px-2 py-0.5">חלוקת פרשות</span>}
      </div>
      <p className="text-lg text-stone-800 leading-loose mb-2" data-collect-source={ref} data-collect-href={href}>
        {n.text.slice(0, start)}
        <mark className="bg-amber-200/70 text-stone-900 rounded px-0.5">{n.text.slice(start, end)}</mark>
        {n.text.slice(end)}
      </p>
      <p className="text-sm text-stone-600 border-s-2 border-sky-300 ps-3">
        {n.note.split(/(\s+)/).map((w, i) =>
          POINTED.test(w) ? <strong key={i} className="text-base font-bold text-sky-800">{w}</strong> : w
        )}
      </p>
    </article>
  );
}

export default function VersionNotesPage() {
  const groups = TRADITIONS.map((t) => ({ ...t, notes: VERSION_NOTES.filter((n) => n.tradition === t.id) })).filter((g) => g.notes.length > 0);
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="חילופי נוסח" />
      <p className="text-stone-500 text-sm leading-relaxed mb-4 max-w-3xl">
        הטקסט באתר הוא מהדורת &quot;מקרא על פי המסורה&quot;, המבוססת על כתר ארם צובא ועל כתבי יד קרובים לו. המהדורה מציינת{" "}
        {VERSION_NOTES.length} מקומות שבהם קהילות או כתבי יד כתובים אחרת. בקורא הם מסומנים בכוכבית כחולה אחרי המילה.
      </p>
      <nav className="flex flex-wrap gap-2 mb-8" aria-label="מסורות">
        {groups.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="text-sm bg-white border border-stone-200 hover:border-amber-400 rounded-full px-3 py-1 text-stone-700">
            {g.title} <span className="text-stone-400">({g.notes.length})</span>
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.id} id={g.id} className="scroll-mt-6">
            <div className="mb-4 pb-2 border-b border-stone-200">
              <h2 className="text-xl font-bold text-stone-700">{g.title}</h2>
              <p className="text-sm text-stone-500 mt-0.5">{g.intro}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {g.notes.map((n, i) => <NoteCard key={i} n={n} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
