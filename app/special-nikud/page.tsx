import type { ReactNode } from "react";
import PageHeader from "@/app/components/PageHeader";
import {
  CLASS_LABEL,
  HATAF_LABEL,
  NIKUD_CASES,
  NIKUD_KINDS,
  NIKUD_NOTES,
  REASON_LABEL,
  SOURCE_LABEL,
  groupCases,
  hatafKey,
  markedForm,
  pairKey,
  sectionOf,
  type HatafKind,
  type InitialClass,
  type NikudCase,
  type NikudKind,
  type NikudSource,
  type UnclassifiedReason,
} from "@/lib/specialNikud";
import type { Section } from "@/lib/tanakh";
import { CaseCard, FilterChip, GroupCard, Pair, RefLink, SourceBadge, Tag, Verse, Word, refOf } from "./parts";

type Tab = NikudKind | "notes";
type Params = { tab?: string; src?: string; sec?: string; letter?: string; kind?: string; page?: string; open?: string };

const TABS: Tab[] = ["dagesh", "puncta", "hataf", "initial", "notes"];
const SECTIONS: { id: string; he: Section }[] = [
  { id: "torah", he: "תורה" },
  { id: "neviim", he: "נביאים" },
  { id: "ketuvim", he: "כתובים" },
];
const SOURCES: NikudSource[] = ["both", "mam", "len"];
const HATAF_ORDER: HatafKind[] = ["qamats", "segol", "patah"];
const CLASS_ORDER: InitialClass[] = ["dechik", "atei", "unclassified"];
const GROUPS_PER_PAGE = 24;
const LETTER_NAME: Record<string, string> = { "א": "אל״ף", "ח": "חי״ת", "ע": "עי״ן", "ר": "רי״ש" };

function href(p: Params, change: Partial<Params>): string {
  const next: Params = { ...p, ...change };
  if (!("page" in change) && !("open" in change)) delete next.page;
  if (!("open" in change)) delete next.open;
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
  const s = qs.toString();
  return s ? `/special-nikud?${s}` : "/special-nikud";
}

// The tab's cases with every filter applied except `skip`, so a filter row can count its options
function filterCases(tab: NikudKind, p: Params, skip?: keyof Params): NikudCase[] {
  const sec = SECTIONS.find((s) => s.id === p.sec)?.he;
  return NIKUD_CASES.filter((c) =>
    c.p === tab &&
    (skip === "src" || !p.src || c.st === p.src) &&
    (skip === "sec" || !sec || sectionOf(c.b) === sec) &&
    (skip === "letter" || !p.letter || c.l === p.letter) &&
    (skip === "kind" || !p.kind || (tab === "hataf" ? c.sub === p.kind : c.cls === p.kind)));
}

const count = (cases: NikudCase[], f: (c: NikudCase) => boolean) => cases.filter(f).length;

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-stone-500 w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}

// Dots over letters are counted by place (verse), the rest by case
const countOf = (tab: NikudKind, cases: NikudCase[]) =>
  tab === "puncta" ? new Set(cases.map((c) => `${c.b}|${c.c}|${c.v}`)).size : cases.length;

function Filters({ tab, p }: { tab: NikudKind; p: Params }) {
  const n = (cases: NikudCase[]) => countOf(tab, cases);
  const bySrc = filterCases(tab, p, "src");
  const bySec = filterCases(tab, p, "sec");
  const byLetter = filterCases(tab, p, "letter");
  const byKind = filterCases(tab, p, "kind");
  const letters = [...new Set(byLetter.map((c) => c.l))].sort();
  const kinds: { id: string; label: string }[] = tab === "hataf"
    ? HATAF_ORDER.map((k) => ({ id: k, label: HATAF_LABEL[k] }))
    : tab === "initial" ? CLASS_ORDER.map((k) => ({ id: k, label: CLASS_LABEL[k] })) : [];
  // An option with nothing to show is left out, unless it is the one selected
  const chip = (key: string, link: string, active: boolean, num: number, label: ReactNode) =>
    num > 0 || active ? <FilterChip key={key} href={link} active={active} count={num}>{label}</FilterChip> : null;
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 sm:p-4 mb-6 flex flex-col gap-2.5">
      {kinds.length > 0 && (
        <FilterRow label="סוג">
          <FilterChip href={href(p, { kind: undefined })} active={!p.kind} count={n(byKind)}>הכול</FilterChip>
          {kinds.map((k) => chip(k.id, href(p, { kind: k.id }), p.kind === k.id,
            n(byKind.filter((c) => (tab === "hataf" ? c.sub : c.cls) === k.id)), k.label))}
        </FilterRow>
      )}
      {tab !== "puncta" && (
        <FilterRow label="נוסח">
          <FilterChip href={href(p, { src: undefined })} active={!p.src} count={n(bySrc)}>הכול</FilterChip>
          {SOURCES.map((s) => chip(s, href(p, { src: s }), p.src === s, n(bySrc.filter((c) => c.st === s)), SOURCE_LABEL[s]))}
        </FilterRow>
      )}
      <FilterRow label="חלק">
        <FilterChip href={href(p, { sec: undefined })} active={!p.sec} count={n(bySec)}>כל התנ״ך</FilterChip>
        {SECTIONS.map((s) => chip(s.id, href(p, { sec: s.id }), p.sec === s.id, n(bySec.filter((c) => sectionOf(c.b) === s.he)), s.he))}
      </FilterRow>
      {tab !== "puncta" && letters.length > 1 && (
        <FilterRow label="אות">
          <FilterChip href={href(p, { letter: undefined })} active={!p.letter}>הכול</FilterChip>
          {letters.map((l) => chip(l, href(p, { letter: l }), p.letter === l, n(byLetter.filter((c) => c.l === l)),
            <span className="text-base leading-none">{l}</span>))}
        </FilterRow>
      )}
    </div>
  );
}

function SectionHead({ title, count, children }: { title: string; count: number; children?: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-stone-700">{title}</h2>
        <span className="text-sm text-stone-400">{count}</span>
      </div>
      {children && <div className="text-sm text-stone-500 leading-relaxed mt-1 max-w-3xl">{children}</div>}
    </div>
  );
}

function Empty() {
  return <p className="text-stone-400 text-center py-12">אין מקרים שמתאימים לסינון</p>;
}

const all = (kind: NikudKind) => NIKUD_CASES.filter((c) => c.p === kind);

// ---------- 1. dagesh in א ח ע ר ----------
function DageshTab({ p }: { p: Params }) {
  const cases = filterCases("dagesh", p);
  const total = all("dagesh");
  const letters = ["א", "ח", "ע", "ר"].filter((l) => cases.some((c) => c.l === l));
  return (
    <>
      <Explainer>
        <p>
          האותיות א, ח, ע ו־ר אינן מקבלות דגש בדרך כלל. בכמה מקומות הן בכל זאת דגושות: {total.length} מקומות בסך הכול,
          {" "}{count(total, (c) => c.st === "both")} מהם בשני הנוסחים ו־{count(total, (c) => c.st === "len")} רק בכתב יד לנינגרד.
          המפיק בה״א בסוף מילה (כמו בְּתוֹכָהּ) אינו נכלל כאן.
        </p>
        <p>
          כשהאות הדגושה פותחת מילה, מוצג גם הסיווג לדחיק או לאתי מרחיק, כמו בלשונית ״דחיק ואתי מרחיק״.
        </p>
      </Explainer>
      <Filters tab="dagesh" p={p} />
      {cases.length === 0 ? <Empty /> : letters.map((l) => {
        const list = cases.filter((c) => c.l === l);
        return (
          <section key={l} className="mb-10">
            <SectionHead title={`דגש ב${LETTER_NAME[l]}`} count={list.length} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((c, i) => <CaseCard key={i} c={c} pair={c.sub === "initial"} />)}
            </div>
          </section>
        );
      })}
    </>
  );
}

// ---------- 2. dots over letters ----------
function PunctaTab({ p }: { p: Params }) {
  const cases = filterCases("puncta", { sec: p.sec });
  const total = all("puncta");
  const places = groupByVerse(cases);
  const totalPlaces = groupByVerse(total);
  const bySection = (s: Section) => totalPlaces.filter((g) => sectionOf(g[0].b) === s).length;
  const lower = total.some((c) => /\u05C5/.test(c.mam ?? ""));
  return (
    <>
      <Explainer>
        <p>
          ב־{totalPlaces.length} מקומות במקרא מנוקדות נקודות מעל האותיות של מילה או של חלק ממנה: {bySection("תורה")} בתורה,
          {" "}{bySection("נביאים")} בנביאים ו־{bySection("כתובים")} בכתובים. שני הנוסחים מסמנים את כל המקומות, אבל לא תמיד
          על אותן אותיות. ההבדלים מסומנים בכל כרטיס.
          {lower && " בתהלים כז, יג יש נקודות גם מתחת לאותיות."}
        </p>
      </Explainer>
      <Filters tab="puncta" p={p} />
      {places.length === 0 ? <Empty /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {places.map((words) => <PunctaCard key={refOf(words[0])} words={words} />)}
        </div>
      )}
    </>
  );
}

function groupByVerse(cases: NikudCase[]): NikudCase[][] {
  const map = new Map<string, NikudCase[]>();
  for (const c of cases) {
    const k = `${c.b}|${c.c}|${c.v}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(c);
  }
  return [...map.values()];
}

function PunctaCard({ words }: { words: NikudCase[] }) {
  const first = words[0];
  const same = words.every((c) => c.st === "both" && c.am.join() === c.al.join());
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RefLink c={first} />
        {same ? <SourceBadge st="both" /> : <Tag>הנוסחים נבדלים</Tag>}
      </div>
      <div className="flex flex-col gap-2">
        {words.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-center">
              {i === 0 && <p className="text-[11px] text-stone-400 mb-1">בקורא (MAM)</p>}
              <Word word={c.mam} at={c.am.length ? c.am : c.al} has={c.am.length > 0} className="text-3xl leading-[1.9] text-stone-800" />
            </div>
            <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-center">
              {i === 0 && <p className="text-[11px] text-stone-400 mb-1">כתב יד לנינגרד</p>}
              <Word word={c.len} at={c.al.length ? c.al : c.am} has={c.al.length > 0} className="text-3xl leading-[1.9] text-stone-800" />
            </div>
          </div>
        ))}
      </div>
      <Verse c={first} ranges={words.flatMap((c) => (c.r ? [c.r] : []))} className="text-base" />
    </article>
  );
}

// ---------- 3. hataf under other letters ----------
const HATAF_INTRO: Record<HatafKind, (n: { total: number; both: number; mam: number; len: number }) => ReactNode> = {
  qamats: (n) => <>{n.both} בשני הנוסחים, {n.len} רק בכתב יד לנינגרד ו־{n.mam} רק בקורא.</>,
  segol: (n) => <>{n.both} בשני הנוסחים, {n.len} רק בכתב יד לנינגרד ו־{n.mam} רק בקורא. השם המפורש בניקוד יֱהֹוִה אינו נכלל כאן (ראו ״הערות״).</>,
  patah: (n) => (
    <>
      כל {n.total} המקרים האלה הם <strong className="text-rose-800">רק בכתב יד לנינגרד</strong>: בנוסח שבקורא יש באותם מקומות שווא.
      כך למשל וּֽזֲהַב (בראשית ב, יב) בכתב יד לנינגרד, וּֽזְהַב בקורא.
    </>
  ),
};

function HatafTab({ p }: { p: Params }) {
  const cases = filterCases("hataf", p);
  const total = all("hataf");
  // Groups of every hataf kind in order, paginated together; a page shows the heading of each kind on it
  const flat = HATAF_ORDER.flatMap((k) => {
    const list = cases.filter((c) => c.sub === k);
    return groupCases(list, hatafKey).map((g) => ({ k, g, size: list.length }));
  });
  const { page, pages, shown } = paginate(flat, p);
  const sections = HATAF_ORDER
    .map((k) => ({ k, groups: shown.filter((x) => x.k === k).map((x) => x.g), size: shown.find((x) => x.k === k)?.size ?? 0 }))
    .filter((s) => s.groups.length > 0);
  return (
    <>
      <Explainer>
        <p>
          חטף (שווא מורכב: חטף פתח, חטף סגול, חטף קמץ) בא בדרך כלל תחת האותיות הגרוניות א, ה, ח, ע. כאן מרוכזים {total.length} מקומות
          שבהם הוא בא תחת אות אחרת, באחד הנוסחים או בשניהם. מילים שחוזרות מקובצות יחד (לפי הערך המילוני), והפסוקים נפתחים בלחיצה.
        </p>
      </Explainer>
      <Filters tab="hataf" p={p} />
      {cases.length === 0 && <Empty />}
      {sections.map(({ k, groups, size }) => {
        const tk = total.filter((c) => c.sub === k);
        const n = { total: tk.length, both: count(tk, (c) => c.st === "both"), mam: count(tk, (c) => c.st === "mam"), len: count(tk, (c) => c.st === "len") };
        return (
          <section key={k} className="mb-10">
            <SectionHead title={k === "patah" ? "חטף פתח: רק בכתב יד לנינגרד" : HATAF_LABEL[k]} count={size}>
              {HATAF_INTRO[k](n)}
            </SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {groups.map((g) => (
                <GroupCard
                  key={g.key}
                  g={g}
                  open={p.open === g.key}
                  toggleHref={href(p, { open: p.open === g.key ? undefined : g.key }) + `#g-${encodeURIComponent(g.key)}`}
                  head={<Word word={markedForm(g.rep)} at={g.rep.st === "len" ? g.rep.al : g.rep.am} has />}
                  tags={g.cases.some((c) => c.aram) ? <Tag>ארמית</Tag> : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}
      {pages > 1 && <Pager p={p} page={page} pages={pages} />}
    </>
  );
}

// ---------- 4. word-initial dagesh ----------
function InitialTab({ p }: { p: Params }) {
  const cases = filterCases("initial", p);
  const total = all("initial");
  const groups = groupCases(cases, pairKey);
  const { page, pages, shown } = paginate(groups, p);
  const byClass = (k: InitialClass) => count(total, (c) => c.cls === k);
  const byReason = (r: UnclassifiedReason) => count(total, (c) => c.why === r);
  return (
    <>
      <Explainer>
        <p>
          לפעמים האות הראשונה של מילה דגושה בלי סיבה במילה עצמה, כשהמילה שלפניה מסתיימת בתנועה ומחוברת אליה במקף או בטעם מחבר.
          בדקדוק המסורה מבחינים בשני סוגים:
        </p>
        <ul className="list-disc ps-5 space-y-1">
          <li><strong className="text-stone-700">דחיק</strong>: המילה הקודמת מוטעמת בסופה (מלרע), וכאן היא מוקפת ואינה מוטעמת, כמו מַה־זֹּ֣את (בראשית ג, יג), יִֽהְיֶה־לּֽוֹ (שמות כא, לד).</li>
          <li><strong className="text-stone-700">אתי מרחיק</strong>: המילה הקודמת מוטעמת בהברה שלפני האחרונה (מלעיל), כמו לָ֣מָּה זֶּה֩ (בראשית יח, יג), ק֤וּמוּ צְּאוּ֙ (בראשית יט, יד).</li>
        </ul>
        <p>
          הסיווג כאן נעשה לפי טעמי המקרא בנוסח שבקורא, ורק כשהם מכריעים: אתי מרחיק כשהטעם המחבר במילה הקודמת יושב לפני
          ההברה האחרונה ({byClass("atei")} מקרים); דחיק כשהמילה הקודמת מוקפת ובלי טעם, ובמקומות אחרים במקרא היא מוטעמת
          בסופה או שיש בה הברה אחת ({byClass("dechik")}). {byClass("unclassified")} מקרים נשארו בלי סיווג: {byReason("final")} שבהם
          המילה הקודמת מוטעמת כאן בסופה (רובם מֹשֶׁ֥ה לֵּאמֹֽר), {byReason("maqaf")} שבהם היא מוקפת ואין בנוסח עדות שהיא מלרעית,
          ו־{byReason("other")} אחרים.
        </p>
        <p>
          נכללו רק אותיות שאינן בגדכפ״ת, כי בבגדכפ״ת דגש בראש מילה הוא לרוב דגש קל, ולא א ח ע ר (בלשונית הראשונה). ו׳ נכללת
          רק כשיש בה גם תנועה, כי וּ לבדה היא שורוק.
        </p>
      </Explainer>
      <Filters tab="initial" p={p} />
      {shown.length === 0 ? <Empty /> : (
        <>
          <p className="text-sm text-stone-500 mb-3">
            {cases.length} מקרים ב־{groups.length} צירופים, מהנפוץ לנדיר
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {shown.map((g) => (
              <GroupCard
                key={g.key}
                g={g}
                open={p.open === g.key}
                toggleHref={href(p, { open: p.open === g.key ? undefined : g.key }) + `#g-${encodeURIComponent(g.key)}`}
                head={<Pair c={g.rep} />}
                tags={
                  <span title={g.rep.why ? REASON_LABEL[g.rep.why] : undefined}>
                    <Tag tone={g.rep.cls === "unclassified" ? "stone" : "amber"}>{CLASS_LABEL[g.rep.cls!]}</Tag>
                  </span>
                }
              />
            ))}
          </div>
          {pages > 1 && <Pager p={p} page={page} pages={pages} />}
        </>
      )}
    </>
  );
}

function paginate<T>(items: T[], p: Params) {
  const pages = Math.max(1, Math.ceil(items.length / GROUPS_PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(p.page) || 1));
  return { page, pages, shown: items.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE) };
}

function Pager({ p, page, pages }: { p: Params; page: number; pages: number }) {
  return (
    <nav className="flex flex-wrap justify-center gap-1.5 mt-8" aria-label="עמודים">
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <FilterChip key={n} href={href(p, { page: n === 1 ? undefined : String(n) })} active={n === page}>{n}</FilterChip>
      ))}
    </nav>
  );
}

// ---------- 5. notes ----------
function NotesTab() {
  const { jerusalem: j, issachar: i, yhwh: y } = NIKUD_NOTES;
  const plene = j.pleneRefs.map(([b, c, v]) => refOf({ b, c, v })).join("; ");
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <NoteCard word={"יְרוּשָׁל\u05B4\u034F\u05B7ם"} title="ירושלים">
        השם כתוב כמעט תמיד בלי יו״ד, ירושלם, ונקרא ירושלַיִם: תחת הל׳ יש חיריק לצד הפתח או הקמץ. כך ב־{j.mam} מתוך {j.total} המופעים
        בנוסח שבקורא וב־{j.len} בכתב יד לנינגרד. בכתיב מלא, ירושלים, הוא כתוב {j.plene} פעמים ({plene}), ו־{j.aramaic} פעמים בא
        בארמית יְרוּשְׁלֶם, בעזרא ובדניאל.
      </NoteCard>
      <NoteCard word="יִשָּׂשכָר" title="יששכר">
        בכל {i.total} המופעים של השם, השי״ן השנייה אינה מנוקדת כלל, בשני הנוסחים ({i.mamBare} בקורא, {i.lenBare} בכתב יד
        לנינגרד), והשם נקרא יִשָּׂכָר.
      </NoteCard>
      <NoteCard word="יֱהֹוִה" title="השם אחרי אֲדֹנָי">
        כשהשם המפורש בא אחרי אֲדֹנָי, הוא נקרא אֱלֹהִים ומנוקד בתנועותיו. בנוסח שבקורא הוא מנוקד אז בחטף סגול: יֱהֹוִה,
        {" "}{y.mam} פעמים ({y.mamAfterAdonai} מהן מיד אחרי אדני). בכתב יד לנינגרד יש בו חטף סגול רק {y.len} פעמים, ובשאר המקומות
        האלה שווא וחיריק: יְהוִה.
      </NoteCard>
    </div>
  );
}

function NoteCard({ word, title, children }: { word: string; title: string; children: ReactNode }) {
  return (
    <article className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <p className="text-4xl text-stone-800 text-center leading-[1.9] mb-1">{word}</p>
      <h3 className="text-center text-sm font-semibold text-amber-700 mb-3">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{children}</p>
    </article>
  );
}

function Explainer({ children }: { children: ReactNode }) {
  return <div className="text-sm text-stone-600 leading-relaxed space-y-2 mb-5 max-w-3xl">{children}</div>;
}

export default async function SpecialNikudPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const tab: Tab = TABS.includes(raw.tab as Tab) ? (raw.tab as Tab) : "dagesh";
  const p: Params = {
    tab: tab === "dagesh" ? undefined : tab,
    src: SOURCES.includes(raw.src as NikudSource) ? raw.src : undefined,
    sec: SECTIONS.some((s) => s.id === raw.sec) ? raw.sec : undefined,
    letter: raw.letter && /^[א-ת]$/.test(raw.letter) ? raw.letter : undefined,
    kind: (tab === "hataf" ? HATAF_ORDER as string[] : tab === "initial" ? CLASS_ORDER as string[] : []).includes(raw.kind ?? "") ? raw.kind : undefined,
    page: raw.page,
    open: raw.open,
  };
  const tabCount = (t: Tab) => (t === "notes" ? 3 : countOf(t, all(t)));
  const tabTitle = (t: Tab) => (t === "notes" ? "הערות" : NIKUD_KINDS.find((k) => k.id === t)!.short);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="ניקוד מיוחד" />
      <div className="text-stone-500 text-sm leading-relaxed mb-5 max-w-3xl space-y-2">
        <p>
          סימני ניקוד חריגים במקרא: דגש באותיות שאינן מקבלות דגש, נקודות על האותיות, חטף תחת אותיות שאינן גרוניות ודגש בתחילת מילה.
        </p>
        <p>
          כל מקרה מוצג בשני נוסחים. <strong className="text-stone-700">בקורא</strong> שבאתר מוצגת מהדורת ״מקרא על פי המסורה״ (MAM)
          מספריא, המבוססת על כתר ארם צובא ועל כתבי יד קרובים לו. <strong className="text-stone-700">החיפוש והניתוח הדקדוקי</strong> באתר
          מבוססים על כתב יד לנינגרד (בתעתיק OSHB). לצד כל מקרה מצוין אם הסימן מופיע בשני הנוסחים או רק באחד מהם.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6" aria-label="סוגי ניקוד">
        {TABS.map((t) => (
          <FilterChip key={t} href={href({}, { tab: t === "dagesh" ? undefined : t })} active={t === tab} count={tabCount(t)}>
            {tabTitle(t)}
          </FilterChip>
        ))}
      </nav>

      <h2 className="sr-only">{tab === "notes" ? "הערות" : NIKUD_KINDS.find((k) => k.id === tab)!.title}</h2>
      {tab === "dagesh" && <DageshTab p={p} />}
      {tab === "puncta" && <PunctaTab p={p} />}
      {tab === "hataf" && <HatafTab p={p} />}
      {tab === "initial" && <InitialTab p={p} />}
      {tab === "notes" && <NotesTab />}
    </div>
  );
}
