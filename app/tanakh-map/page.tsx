import Link from "next/link";
import PageHeader from "@/app/components/PageHeader";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { TIMELINE, relLabel, type TimelineEvent } from "@/lib/timeline";
import TimelineView, { type ShownEvent } from "./TimelineView";
import {
  SECTIONS,
  booksOf,
  describedCount,
  isTorah,
  rowsOf,
  sectionOfBook,
  rangeRef,
  totalParashiyot,
  unitsOf,
  type MapRow,
  type SectionId,
} from "@/lib/tanakhMap";

// Server-rendered: every narrowing is a link (?section=&book=&unit=&p=), so the 3,482 rows never ship to the browser
type Params = { section?: string; book?: string; unit?: string; p?: string; view?: string; mode?: string };

const PREVIEW = 4; // rows per book when a whole section (or the Tanakh) is shown

function href(q: Params): string {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]);
  const qs = s.toString();
  return qs ? `/tanakh-map?${qs}` : "/tanakh-map";
}

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));

// Timeline events by each parashiya they cover ("Genesis|7:11" → events), for the year chip on a row
const EVENTS_AT = new Map<string, TimelineEvent[]>();
for (const e of TIMELINE.events) {
  const at = (r: [number, number]) => r[0] * 1000 + r[1];
  for (const r of rowsOf(e.book)) {
    const inside = at(r.start) >= at(e.from) && at(r.start) <= at(e.to);
    if (!inside && `${r.start[0]}:${r.start[1]}` !== e.parashiya) continue;
    const k = `${e.book}|${r.start[0]}:${r.start[1]}`;
    EVENTS_AT.set(k, [...(EVENTS_AT.get(k) ?? []), e]);
  }
}
const yearChip = (e: TimelineEvent) =>
  e.axis === "exodus" && e.rel ? relLabel(e.rel.from) : e.am.to !== undefined && e.am.to !== e.am.from ? `שנים ${e.am.from}–${e.am.to}` : `שנת ${e.am.from}`;

function TimelinePage({ mode }: { mode: "text" | "tradition" }) {
  const events: ShownEvent[] = TIMELINE.events.map((e) => ({
    ...e,
    ref: rangeRef(e.book, e.from, e.to),
    mapHref: href({ book: e.book, p: e.parashiya }),
    readerHref: `/tanakh?book=${encodeURIComponent(e.book)}&chapter=${e.from[0]}&verse=${e.from[1]}`,
  }));
  return <TimelineView events={events} exodusAm={TIMELINE.exodusAm} initialMode={mode} />;
}

export default async function TanakhMapPage({ searchParams }: { searchParams: Promise<Params> }) {
  const q = await searchParams;
  const timeline = q.view === "timeline";
  // Validate the path from the top down; anything that doesn't fit stops the narrowing there
  const book = q.book && BOOK_HE.has(q.book) ? q.book : undefined;
  const section: SectionId | undefined = book ? sectionOfBook(book)! : SECTIONS.find((s) => s.id === q.section)?.id;
  const unit = book && q.unit && unitsOf(book).some((u) => u.id === q.unit) ? q.unit : undefined;
  const pRow = book && q.p ? rowsOf(book).find((r) => `${r.start[0]}:${r.start[1]}` === q.p && (!unit || r.unit === unit)) : undefined;
  const unitLabel = book && unit ? unitsOf(book).find((u) => u.id === unit)?.label : undefined;

  const described = describedCount(), total = totalParashiyot();
  const crumbs = [
    { label: "כל התנ״ך", to: href({}) },
    ...(section ? [{ label: SECTIONS.find((s) => s.id === section)!.he, to: href({ section }) }] : []),
    ...(book ? [{ label: BOOK_HE.get(book)!, to: href({ section, book }) }] : []),
    ...(unit ? [{ label: unitLabel!, to: href({ section, book, unit }) }] : []),
    ...(pRow ? [{ label: pRow.ref, to: "" }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="מפת התנ״ך" />
      <ViewTabs timeline={timeline} />
      {timeline ? (
        <>
          <p className="text-stone-600 leading-relaxed mb-1 max-w-3xl">
            הסיפורים שבתורה על ציר הזמן. פרשייה מופיעה רק כשהשנה שלה ידועה: מחושבת מהפסוקים (גילים, שנות חיים ותאריכים
            שהכתוב נותן, וכל מספר נבדק מול לשון הפסוק), או נאמרת במקור מסורתי שנבדק בספריא. פרשייה בלי שנה ידועה לא מופיעה,
            ואין כאן ניחושים.
          </p>
          <p className="text-xs text-stone-400 mb-6">
            הסדר בציר הוא סדר הזמנים, ולא תמיד סדר הכתובים: ברית בין הבתרים, למשל, מסופרת אחרי יציאת אברם מחרן אך קדמה לה לפי
            המסורת.
          </p>
          <TimelinePage mode={q.mode === "tradition" ? "tradition" : "text"} />
        </>
      ) : (
      <>
      <p className="text-stone-600 leading-relaxed mb-1 max-w-3xl">
        שורה אחת לכל פרשה פתוחה או סתומה בתנ״ך, עם תיאור קצר של מה שמסופר בה. בצד אפשר לצמצם: חלק, ספר, פרשת השבוע או
        פרק, ופרשייה. לחיצה על שורה פותחת את הפסוקים בקורא.
      </p>
      <p className="text-xs text-stone-400 mb-6">
        {described < total
          ? `התיאורים בהכנה (${described.toLocaleString("he-IL")} מתוך ${total.toLocaleString("he-IL")} נכתבו). בינתיים, כשאין תיאור, מוצגות מילות הפתיחה של הפרשייה.`
          : "התיאורים נכתבו בעזרת בינה מלאכותית מתוך פסוקי הפרשייה עצמה, ונבדקו במדגם. לחיצה על שורה פותחת את הפסוקים, כדי לבדוק במקור."}
      </p>

      <div className="grid md:grid-cols-[16rem_1fr] gap-6 items-start">
        <Narrow section={section} book={book} unit={unit} p={pRow ? q.p : undefined} here={crumbs.map((c) => c.label).join(" › ")} />

        <main className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-sm mb-4" aria-label="מיקום">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-stone-300">›</span>}
                {c.to && i < crumbs.length - 1 ? (
                  <Link href={c.to} className="text-amber-700 hover:underline">{c.label}</Link>
                ) : (
                  <span className="font-semibold text-stone-800">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <Rows section={section} book={book} unit={unit} pRow={pRow} />
        </main>
      </div>
      </>
      )}
    </div>
  );
}

function ViewTabs({ timeline }: { timeline: boolean }) {
  const tab = (active: boolean, to: string, label: string) => (
    <Link
      href={to}
      aria-current={active ? "page" : undefined}
      className={`px-4 sm:px-6 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
        active ? "border-amber-600 text-amber-700 bg-amber-50" : "border-transparent text-stone-500 hover:text-stone-700"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex gap-1 sm:gap-2 mb-5 border-b border-stone-200 overflow-x-auto overflow-y-hidden" aria-label="תצוגה">
      {tab(!timeline, "/tanakh-map", "פרשיות")}
      {tab(timeline, "/tanakh-map?view=timeline", "ציר הזמן (תורה)")}
    </nav>
  );
}

// The narrowing panel: the chosen path, each level open below its choice
function Narrow({ section, book, unit, p, here }: { section?: SectionId; book?: string; unit?: string; p?: string; here: string }) {
  const item = (active: boolean, to: string, label: string, count: number | null, depth: number) => (
    <Link
      key={to}
      href={to}
      aria-current={active ? "true" : undefined}
      className={`flex items-baseline justify-between gap-2 rounded-lg px-2 py-1 text-sm transition-colors ${
        active ? "bg-amber-100 text-amber-900 font-semibold" : "text-stone-700 hover:bg-stone-100"
      }`}
      style={{ paddingInlineStart: `${0.5 + depth * 0.9}rem` }}
    >
      <span className="truncate">{label}</span>
      {count !== null && <span className="text-[11px] text-stone-400 tabular-nums shrink-0">{count}</span>}
    </Link>
  );
  const sectionCount = (s: SectionId) => booksOf(s).reduce((sum, b) => sum + rowsOf(b.id).length, 0);
  const panel = (
    <div className="flex flex-col gap-0.5">
      {item(!section, href({}), "כל התנ״ך", totalParashiyot(), 0)}
      {SECTIONS.map((s) => (
        <div key={s.id} className="flex flex-col gap-0.5">
          {item(section === s.id && !book, href({ section: s.id }), s.he, sectionCount(s.id), 1)}
          {section === s.id &&
            booksOf(s.id).map((b) => (
              <div key={b.id} className="flex flex-col gap-0.5">
                {item(book === b.id && !unit, href({ section: s.id, book: b.id }), b.he, rowsOf(b.id).length, 2)}
                {book === b.id &&
                  unitsOf(b.id).map((u) => (
                    <div key={u.id} className="flex flex-col gap-0.5">
                      {item(unit === u.id && !p, href({ section: s.id, book: b.id, unit: u.id }), u.label, u.count, 3)}
                      {unit === u.id &&
                        rowsOf(b.id)
                          .filter((r) => r.unit === u.id)
                          .map((r) => {
                            const key = `${r.start[0]}:${r.start[1]}`;
                            return item(p === key, href({ section: s.id, book: b.id, unit: u.id, p: key }), r.description ?? r.incipit, null, 4);
                          })}
                    </div>
                  ))}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
  // Desktop: always open beside the list. Phone: folded above it, showing where you are
  return (
    <>
      <aside className="hidden md:block md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto bg-white border border-stone-200 rounded-2xl p-2 shadow-sm">
        <p className="text-xs font-semibold text-stone-400 px-2 pt-1 pb-2">צמצום</p>
        {panel}
      </aside>
      <details className="md:hidden bg-white border border-stone-200 rounded-2xl shadow-sm">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-stone-400">צמצום</span>
            <span className="block text-sm text-stone-800 truncate">{here}</span>
          </span>
          <span className="text-amber-700 text-sm shrink-0">שנה ▾</span>
        </summary>
        <div className="max-h-[60vh] overflow-y-auto p-2 border-t border-stone-100">{panel}</div>
      </details>
    </>
  );
}

function Rows({ section, book, unit, pRow }: { section?: SectionId; book?: string; unit?: string; pRow?: MapRow }) {
  if (pRow) return <RowList rows={[pRow]} />;
  if (book) {
    const rows = rowsOf(book).filter((r) => !unit || r.unit === unit);
    const units = unitsOf(book).filter((u) => !unit || u.id === unit);
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-stone-500">{rows.length.toLocaleString("he-IL")} פרשיות</p>
        {units.map((u) => (
          <section key={u.id}>
            <h2 className="text-base font-bold text-stone-700 mb-2">
              {isTorah(book) ? `פרשת ${u.label}` : u.label}
            </h2>
            <RowList rows={rows.filter((r) => r.unit === u.id)} />
          </section>
        ))}
      </div>
    );
  }
  // A section or the whole Tanakh: each book with its first rows and a link to the rest
  const books = section ? booksOf(section) : TANAKH_BOOKS;
  return (
    <div className="flex flex-col gap-6">
      {books.map((b) => {
        const rows = rowsOf(b.id);
        return (
          <section key={b.id}>
            <h2 className="flex items-baseline justify-between gap-2 mb-2">
              <Link href={href({ section: sectionOfBook(b.id)!, book: b.id })} className="text-lg font-bold text-stone-800 hover:text-amber-800">{b.he}</Link>
              <span className="text-xs text-stone-400">{rows.length} פרשיות</span>
            </h2>
            <RowList rows={rows.slice(0, PREVIEW)} />
            {rows.length > PREVIEW && (
              <Link href={href({ section: sectionOfBook(b.id)!, book: b.id })} className="inline-block text-sm text-amber-700 hover:underline mt-1.5">
                כל {rows.length} הפרשיות בספר {b.he} ←
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}

function RowList({ rows }: { rows: MapRow[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={`${r.start[0]}:${r.start[1]}`}>
          <Link
            href={r.href}
            className="group flex items-start gap-3 bg-white border border-stone-200 rounded-xl px-3 py-2.5 hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
          >
            <span
              title={r.type === "פ" ? "פרשה פתוחה" : r.type === "ס" ? "פרשה סתומה" : ""}
              className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-stone-100 text-stone-500 text-xs font-bold flex items-center justify-center"
            >
              {r.type || "·"}
            </span>
            <span className="flex-1 min-w-0">
              <span className={`block leading-snug ${r.description ? "text-stone-800 font-medium" : "text-stone-500 italic"}`}>
                {r.description ?? r.incipit}
              </span>
              <span className="block text-xs text-stone-400 mt-0.5">
                {EVENTS_AT.get(`${r.book}|${r.start[0]}:${r.start[1]}`)?.slice(0, 1).map((e) => (
                  <span key={e.id} title={e.basis} className={`inline-block me-1.5 rounded px-1.5 py-px text-[11px] ${e.source === "tradition" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-800"}`}>
                    {yearChip(e)}
                  </span>
                ))}
                {r.ref}
                {r.description && <span className="text-stone-300"> · {r.incipit}…</span>}
              </span>
            </span>
            <span className="shrink-0 self-center text-amber-700 text-sm opacity-0 group-hover:opacity-100 transition-opacity">לקורא ←</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

