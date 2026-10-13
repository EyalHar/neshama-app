import Link from "next/link";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import {
  SPECIAL_LETTERS,
  SPECIAL_LETTER_KINDS,
  SPECIAL_LETTER_CLASS,
  type SpecialLetterEntry,
} from "@/lib/special-letters";

const BOOK_HE = Object.fromEntries(TANAKH_BOOKS.map((b) => [b.id, b.he]));

function StyledWord({ entry }: { entry: SpecialLetterEntry }) {
  if (entry.start === undefined || entry.end === undefined) {
    return <span className={SPECIAL_LETTER_CLASS[entry.kind]}>{entry.letter}</span>;
  }
  return (
    <>
      {entry.word.slice(0, entry.start)}
      <span className={SPECIAL_LETTER_CLASS[entry.kind]}>{entry.word.slice(entry.start, entry.end)}</span>
      {entry.word.slice(entry.end)}
    </>
  );
}

function LetterCard({ entry }: { entry: SpecialLetterEntry }) {
  return (
    <Link
      href={`/tanakh?book=${encodeURIComponent(entry.book)}&chapter=${entry.chapter}&verse=${entry.verse}`}
      className="group flex flex-col items-center gap-2 bg-white rounded-2xl border border-stone-200 shadow-sm px-4 py-5 hover:border-amber-300 hover:shadow-md transition-all"
    >
      <span className="text-3xl text-stone-800 h-12 flex items-end">
        <StyledWord entry={entry} />
      </span>
      <span className="text-xs text-stone-500">
        {BOOK_HE[entry.book]} {toHebrewNumeral(entry.chapter)}&lrm;:{toHebrewNumeral(entry.verse)}
      </span>
      <span className="text-xs text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity">
        קרא פרק ←
      </span>
    </Link>
  );
}

export default function SpecialLettersPage() {
  const groups = SPECIAL_LETTER_KINDS.map((k) => ({
    ...k,
    entries: SPECIAL_LETTERS.filter((e) => e.kind === k.kind),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">אותיות מיוחדות בתנ״ך</h1>
      <p className="text-stone-500 text-sm mb-1">
        אותיות רבתי, זעירות ותלויות ונוני״ן הפוכות, כפי שהן מסומנות בנוסח ״מקרא על פי המסורה״
      </p>
      <p className="text-stone-400 text-xs mb-6">
        לחיצה על כרטיס פותחת את הפרק בקורא. כדי לראות את האותיות בצורתן גם שם, סמן ״אותיות מיוחדות״
      </p>

      <nav className="flex gap-2 flex-wrap mb-8">
        {groups.map((g) => (
          <a
            key={g.kind}
            href={`#${g.kind}`}
            className="text-sm px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            {g.label} <span className="text-amber-600">({g.entries.length})</span>
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.kind} id={g.kind} className="scroll-mt-6">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-xl font-bold text-stone-700">{g.label}</h2>
              <span className="text-sm text-stone-400">{g.description}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {g.entries.map((e) => (
                <LetterCard key={`${e.book}-${e.chapter}-${e.verse}-${e.start ?? 0}`} entry={e} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
