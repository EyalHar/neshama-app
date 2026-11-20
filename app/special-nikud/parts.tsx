import Link from "next/link";
import type { ReactNode } from "react";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import {
  CLASS_LABEL,
  SOURCE_LABEL,
  splitUnits,
  verseOf,
  type NikudCase,
  type NikudGroup,
  type NikudSource,
} from "@/lib/specialNikud";

const BOOK_HE = Object.fromEntries(TANAKH_BOOKS.map((b) => [b.id, b.he]));

export const refOf = (c: { b: string; c: number; v: number }) =>
  `${BOOK_HE[c.b]} ${toHebrewNumeral(c.c)}:${toHebrewNumeral(c.v)}`;
export const readerHref = (c: { b: string; c: number; v: number }) =>
  `/tanakh?book=${encodeURIComponent(c.b)}&chapter=${c.c}&verse=${c.v}`;

const SOURCE_CLASS: Record<NikudSource, string> = {
  both: "bg-amber-50 text-amber-800 border-amber-200",
  mam: "bg-sky-50 text-sky-800 border-sky-200",
  len: "bg-rose-50 text-rose-800 border-rose-200",
};

export function SourceBadge({ st, count }: { st: NikudSource; count?: number }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-full px-2 py-0.5 whitespace-nowrap ${SOURCE_CLASS[st]}`}>
      {SOURCE_LABEL[st]}
      {count !== undefined && <span className="opacity-70">{count}</span>}
    </span>
  );
}

export function Tag({ children, tone = "stone" }: { children: ReactNode; tone?: "stone" | "amber" }) {
  const cls = tone === "amber" ? "bg-amber-600 text-white border-amber-600" : "bg-stone-100 text-stone-600 border-stone-200";
  return <span className={`inline-block text-[11px] font-medium border rounded-full px-2 py-0.5 whitespace-nowrap ${cls}`}>{children}</span>;
}

// A word with the letters at `at` highlighted: amber where this text has the mark, a grey box where
// it doesn't (the other text has it there)
export function Word({ word, at, has, className = "" }: { word: string | null; at: number[]; has: boolean; className?: string }) {
  if (!word) return <span className={`text-stone-300 ${className}`}>—</span>;
  const marked = new Set(at);
  let letter = -1;
  return (
    <span className={className}>
      {splitUnits(word).map((u, i) => {
        if (u[0] >= "א" && u[0] <= "ת") letter++;
        if (!marked.has(letter)) return <span key={i}>{u}</span>;
        return (
          <span key={i} className={has ? "text-amber-600 bg-amber-100/80 rounded-sm" : "text-stone-500 bg-stone-200/70 rounded-sm"}>
            {u}
          </span>
        );
      })}
    </span>
  );
}

// The letters to show in each form: its own marks, or, where it lacks the mark, the other form's
// position (dots over letters list only each form's own dotted letters)
function positions(c: NikudCase) {
  const mamHas = c.st !== "len", lenHas = c.st !== "mam";
  return {
    mamAt: c.am.length ? c.am : c.al,
    lenAt: c.al.length ? c.al : c.am,
    mamHas: c.p === "puncta" ? c.am.length > 0 : mamHas,
    lenHas: c.p === "puncta" ? c.al.length > 0 : lenHas,
  };
}

export function Forms({ c, size = "lg" }: { c: NikudCase; size?: "lg" | "md" }) {
  const { mamAt, lenAt, mamHas, lenHas } = positions(c);
  const text = size === "lg" ? "text-3xl" : "text-2xl";
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-center min-w-0">
        <p className="text-[11px] text-stone-400 mb-1">בקורא (MAM)</p>
        <Word word={c.mam} at={mamAt} has={mamHas} className={`${text} leading-[1.9] text-stone-800 break-words`} />
      </div>
      <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-center min-w-0">
        <p className="text-[11px] text-stone-400 mb-1">כתב יד לנינגרד</p>
        <Word word={c.len} at={lenAt} has={lenHas} className={`${text} leading-[1.9] text-stone-800 break-words`} />
      </div>
    </div>
  );
}

// The verse as the reader shows it, with the case's words marked
export function Verse({ c, ranges, className = "" }: { c: NikudCase; ranges?: [number, number][]; className?: string }) {
  const text = verseOf(c);
  const ref = refOf(c), href = readerHref(c);
  const cuts = (ranges ?? (c.r ? [c.r] : [])).slice().sort((a, b) => a[0] - b[0]);
  const parts: ReactNode[] = [];
  let pos = 0;
  cuts.forEach(([s, e], i) => {
    if (s < pos) return;
    parts.push(text.slice(pos, s));
    parts.push(<mark key={i} className="bg-amber-200/70 text-stone-900 rounded px-0.5">{text.slice(s, e)}</mark>);
    pos = e;
  });
  parts.push(text.slice(pos));
  return (
    <p className={`text-stone-700 leading-loose ${className}`} data-collect-source={ref} data-collect-href={href}>
      {parts}
    </p>
  );
}

export function RefLink({ c }: { c: NikudCase }) {
  return (
    <Link href={readerHref(c)} className="text-sm font-semibold text-amber-700 hover:underline whitespace-nowrap">
      {refOf(c)}
    </Link>
  );
}

// The word before a word-initial dagesh, then the word itself with its first letter marked
export function Pair({ c, className = "" }: { c: NikudCase; className?: string }) {
  const w = c.mam ?? c.len;
  return (
    <span className={className}>
      {c.prev && <span className="text-stone-400">{c.prev}{c.join === "maqaf" ? "\u05BE" : " "}</span>}
      <Word word={w} at={[0]} has={c.mam ? c.st !== "len" : true} />
    </span>
  );
}

export function CaseCard({ c, pair = false }: { c: NikudCase; pair?: boolean }) {
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RefLink c={c} />
        <div className="flex flex-wrap gap-1.5">
          {c.cls && <Tag tone={c.cls === "unclassified" ? "stone" : "amber"}>{CLASS_LABEL[c.cls]}</Tag>}
          <SourceBadge st={c.st} />
        </div>
      </div>
      {pair && c.prev && <p className="text-2xl text-center text-stone-800 leading-loose"><Pair c={c} /></p>}
      <Forms c={c} />
      <Verse c={c} className="text-base" />
    </article>
  );
}

function CaseRow({ c }: { c: NikudCase }) {
  return (
    <li className="py-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RefLink c={c} />
        <SourceBadge st={c.st} />
      </div>
      {c.st !== "both" && <Forms c={c} size="md" />}
      <Verse c={c} className="text-[15px]" />
    </li>
  );
}

function StatusSummary({ cases }: { cases: NikudCase[] }) {
  const counts = (["both", "mam", "len"] as NikudSource[])
    .map((st) => ({ st, n: cases.filter((c) => c.st === st).length }))
    .filter((x) => x.n > 0);
  if (counts.length === 1) return <SourceBadge st={counts[0].st} />;
  return <div className="flex flex-wrap gap-1.5">{counts.map(({ st, n }) => <SourceBadge key={st} st={st} count={n} />)}</div>;
}

// A word (or pair of words) that occurs several times: the most frequent form, the count, and the
// references; its verses are rendered only when the group is opened (`open`, from the URL), to keep
// the page light. A group of one shows its case in full.
export function GroupCard({ g, head, tags, open, toggleHref }: {
  g: NikudGroup;
  head: ReactNode;
  tags?: ReactNode;
  open: boolean;
  toggleHref: string;
}) {
  const one = g.cases.length === 1;
  const mixed = new Set(g.cases.map((c) => c.st)).size > 1;
  return (
    <article id={`g-${encodeURIComponent(g.key)}`} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm min-w-0 scroll-mt-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-3xl text-stone-800 leading-[1.9] break-words">{head}</span>
          {!one && <span className="text-sm font-semibold text-stone-400">×{g.cases.length}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags}
          <StatusSummary cases={g.cases} />
        </div>
      </div>
      {one ? (
        <div className="flex flex-col gap-3">
          <RefLink c={g.cases[0]} />
          <Forms c={g.cases[0]} size="md" />
          <Verse c={g.cases[0]} className="text-[15px]" />
        </div>
      ) : open ? (
        <>
          <ul className="divide-y divide-stone-100">
            {g.cases.map((c, i) => <CaseRow key={i} c={c} />)}
          </ul>
          <Link href={toggleHref} replace className="inline-block mt-2 text-sm text-amber-700 hover:text-amber-800">
            ▴ הסתר את הפסוקים
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-stone-400">
            {g.cases.map((c, i) => (
              <span key={i}>
                {i > 0 && " · "}
                <Link href={readerHref(c)} title={SOURCE_LABEL[c.st]} className={`hover:text-amber-700 hover:underline ${!mixed || c.st === "both" ? "text-stone-600" : c.st === "mam" ? "text-sky-700" : "text-rose-700"}`}>
                  {refOf(c)}
                </Link>
              </span>
            ))}
          </p>
          <Link href={toggleHref} replace className="inline-block mt-2 text-sm font-medium text-amber-700 hover:text-amber-800">
            ▾ הצג את {g.cases.length} הפסוקים
          </Link>
        </>
      )}
    </article>
  );
}

export function FilterChip({ href, active, children, count }: { href: string; active: boolean; children: ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      replace
      aria-current={active ? "true" : undefined}
      className={`text-sm rounded-full px-3 py-1 border transition-colors whitespace-nowrap ${active
        ? "bg-amber-600 text-white border-amber-600"
        : "bg-white text-stone-700 border-stone-200 hover:border-amber-400"}`}
    >
      {children}
      {count !== undefined && <span className={active ? "text-amber-100 ms-1" : "text-stone-400 ms-1"}>{count}</span>}
    </Link>
  );
}
