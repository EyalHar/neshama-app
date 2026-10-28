"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toHebrewNumeral } from "@/lib/tanakh";
import HeartIcon from "@/app/components/HeartIcon";
import LetterSearch from "./LetterSearch";

const BINYANIM = [
  { id: "all", label: "כל הבניינים" },
  { id: "q", label: "קַל (Qal)" },
  { id: "N", label: "נִפְעַל (Niphal)" },
  { id: "p", label: "פִּיעֵל (Piel)" },
  { id: "P", label: "פֻּעַל (Pual)" },
  { id: "h", label: "הִפְעִיל (Hiphil)" },
  { id: "H", label: "הָפְעַל (Hophal)" },
  { id: "t", label: "הִתְפַּעֵל (Hitpael)" },
];

// Ids match VERB_FORMS in lib/rootFamily.ts
const VERB_FORM_OPTIONS = [
  { id: "all", label: "כל הצורות" },
  { id: "perfect", label: "עבר" },
  { id: "imperfect", label: "עתיד" },
  { id: "imperative", label: "ציווי" },
  { id: "participle", label: "בינוני" },
  { id: "infinitive", label: "שם הפועל (מקור נטוי)" },
  { id: "infAbsolute", label: "מקור מוחלט" },
];

type Result = {
  book: string; bookHe: string; chapter: number; verse: number;
  text: string; forms?: string[];
};

type Tab = "basic" | "substring" | "root" | "etymology" | "mishkal" | "letters";

const TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "חיפוש בסיסי" },
  { id: "substring", label: "חיפוש תת-מחרוזת" },
  { id: "root", label: "חיפוש לפי שורש ובניין" },
  { id: "etymology", label: "קרובי מילה (אטימולוגיה)" },
  { id: "mishkal", label: "חיפוש לפי משקל" },
  { id: "letters", label: "אות ראשונה ואחרונה" },
];

type EtymGroup = { key: string; label: string; rootLabel: string | null; definition: string; total: number };

type MishkalOption = { mishkal: string; translit: string; gesenius: string; nouns: number; adjectives: number; tokens: number };
type MishkalWord = { strongs: string; form: string; kind: "noun" | "adjective"; tokens: number; uncertainRoot: boolean };

const MISHKAL_KINDS = [
  { id: "all", label: "שמות עצם ותארים" },
  { id: "noun", label: "שמות עצם" },
  { id: "adjective", label: "שמות תואר" },
];

// Gesenius' sections, in his order, for grouping the mishkal picker
const MISHKAL_SECTIONS = [
  { prefix: "§84a", label: "§84a — משקלים פשוטים" },
  { prefix: "§84b", label: "§84b — ע׳ הפועל כפולה" },
  { prefix: "§85", label: "§85 — תחיליות וסיומות" },
  { prefix: "§86", label: "§86 — סיומות של שמות מן השם" },
];

// Hebrew points/cantillation block — used to auto-toggle "חפש עם ניקוד מדויק" based on
// whether the typed query itself contains nikud, so the user doesn't have to remember
// to flip the checkbox manually.
const hasNikud = (s: string) => /[֑-ׇ]/.test(s);

const SCOPES = [
  { id: "tanakh", label: "כל התנ״ך" },
  { id: "torah", label: "תורה" },
  { id: "nevi", label: "נביאים" },
  { id: "ketuvim", label: "כתובים" },
] as const;

function ResultCard({ r, num }: { r: Result; num: number }) {
  const text = r.text;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-stone-300 min-w-[2rem] text-left">{num}.</span>
            <p className="text-xs font-medium text-amber-700">
              {r.bookHe} {toHebrewNumeral(r.chapter)}&lrm;:{toHebrewNumeral(r.verse)}
            </p>
          </div>
          <p className="text-stone-700 leading-relaxed">{text}</p>
          {r.forms && r.forms.length > 0 && (
            <p className="text-xs text-stone-400 mt-1">
              צורות: {r.forms.join("، ")}
            </p>
          )}
        </div>
        <Link
          href={`/tanakh?book=${encodeURIComponent(r.book)}&chapter=${r.chapter}&verse=${r.verse}`}
          className="shrink-0 text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          קרא פרק ←
        </Link>
      </div>
    </div>
  );
}

function NotSeeded() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mt-4">
      <p className="text-amber-700 font-medium mb-1">הנתונים עוד לא נטענו</p>
      <Link href="/admin/seed" className="text-amber-700 underline text-sm">עבור לדף האכלוס</Link>
    </div>
  );
}

// ?tab= opens a specific tab directly (e.g. /letters redirects to ?tab=letters)
export default function AdvancedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = use(searchParams);
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t.id === tabParam)?.id ?? "basic");
  const [basicQ, setBasicQ] = useState("");
  const [scope, setScope] = useState<typeof SCOPES[number]["id"]>("tanakh");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [lastFavoritesOnly, setLastFavoritesOnly] = useState(false);
  const [nikudMode, setNikudMode] = useState(false);
  const [lastNikudMode, setLastNikudMode] = useState(false);
  const [substringQ, setSubstringQ] = useState("");
  const [rootQ, setRootQ] = useState("");
  const [stem, setStem] = useState("all");
  const [verbForm, setVerbForm] = useState("all");
  const [wordQ, setWordQ] = useState("");
  const [mishkalList, setMishkalList] = useState<MishkalOption[] | null>(null);
  const [mishkalQ, setMishkalQ] = useState("");
  const [mishkalKind, setMishkalKind] = useState("all");
  const [mishkalRoot, setMishkalRoot] = useState("");
  const [mishkalWords, setMishkalWords] = useState<MishkalWord[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [occurrences, setOccurrences] = useState<number | null>(null);
  const [rootView, setRootView] = useState<"direct" | "etymological">("direct");
  const [rootDirectTotal, setRootDirectTotal] = useState<number | null>(null);
  const [rootEtymTotal, setRootEtymTotal] = useState<number | null>(null);
  const [etymGroups, setEtymGroups] = useState<EtymGroup[]>([]);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [lastActiveGroupKey, setLastActiveGroupKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pageSize, setPageSize] = useState(500);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lastBasicQ, setLastBasicQ] = useState("");
  const [lastScope, setLastScope] = useState<typeof SCOPES[number]["id"]>("tanakh");
  const [lastSubstringQ, setLastSubstringQ] = useState("");
  const [lastRootQ, setLastRootQ] = useState("");
  const [lastStem, setLastStem] = useState("all");
  const [lastVerbForm, setLastVerbForm] = useState("all");
  const [lastWordQ, setLastWordQ] = useState("");
  const [lastMishkal, setLastMishkal] = useState({ mishkal: "", kind: "all", root: "" });
  const abortRef = useRef<AbortController | null>(null);

  async function search(url: string, resetPage = true) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isRoot = url.includes("/api/verses/root");
    const isEtymology = url.includes("/api/verses/etymology");
    const isMishkal = url.includes("/api/verses/mishkal");

    if (resetPage) setPage(1);
    setLoading(true);
    setSearched(true);
    setResults([]);
    setTotal(null);
    setOccurrences(null);

    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      if (abortRef.current !== controller) return; // superseded by a newer search
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setOccurrences(typeof data.occurrences === "number" ? data.occurrences : null);
      setPages(data.pages ?? 1);
      setPageSize(data.pageSize ?? 500);
      setRootDirectTotal(isRoot ? (data.directTotal ?? data.total ?? 0) : null);
      setRootEtymTotal(isRoot ? (data.etymologicalTotal ?? 0) : null);
      setMishkalWords(isMishkal ? (data.words ?? []) : []);
      if (isEtymology) {
        setEtymGroups(data.groups ?? []);
        const active = data.activeGroup ?? null;
        setActiveGroupKey(active);
        setLastActiveGroupKey(active);
      } else {
        setEtymGroups([]);
        setActiveGroupKey(null);
      }
      setLoading(false);
      abortRef.current = null;
    } catch (err) {
      if (abortRef.current !== controller) return; // superseded
      if (err instanceof DOMException && err.name === "AbortError") setSearched(false);
      setLoading(false);
      abortRef.current = null;
    }
  }

  function cancelSearch() {
    abortRef.current?.abort();
  }

  useEffect(() => {
    if (tab !== "mishkal" || mishkalList) return;
    fetch("/api/verses/mishkal")
      .then((r) => r.json())
      .then((d) => setMishkalList(d.mishkalim ?? []))
      .catch(() => setMishkalList([]));
  }, [tab, mishkalList]);

  function favParam(fav: boolean) {
    return fav ? "&favoritesOnly=1" : "";
  }

  function nikudParam(n: boolean) {
    return n ? "&nikud=1" : "";
  }

  function rootUrl(rootValue: string, stemValue: string, formValue: string, scopeValue: string, view: "direct" | "etymological", p: number, fav: boolean) {
    const params = new URLSearchParams({ scope: scopeValue, view, page: String(p) });
    if (rootValue) params.set("root", rootValue);
    if (stemValue && stemValue !== "all") params.set("stem", stemValue);
    if (formValue && formValue !== "all") params.set("form", formValue);
    if (fav) params.set("favoritesOnly", "1");
    return `/api/verses/root?${params.toString()}`;
  }

  function mishkalUrl(m: typeof lastMishkal, scopeValue: string, p: number, fav: boolean) {
    const params = new URLSearchParams({ mishkal: m.mishkal, scope: scopeValue, page: String(p) });
    if (m.kind !== "all") params.set("kind", m.kind);
    if (m.root) params.set("root", m.root);
    if (fav) params.set("favoritesOnly", "1");
    return `/api/verses/mishkal?${params.toString()}`;
  }

  function etymologyUrl(wordValue: string, scopeValue: string, groupKey: string | null, p: number, fav: boolean) {
    const params = new URLSearchParams({ word: wordValue, scope: scopeValue, page: String(p) });
    if (groupKey) params.set("group", groupKey);
    if (fav) params.set("favoritesOnly", "1");
    return `/api/verses/etymology?${params.toString()}`;
  }

  function handleBasic(e: React.FormEvent, p = 1) {
    e.preventDefault();
    if (basicQ.trim().length < 2) return;
    setLastBasicQ(basicQ.trim());
    setLastScope(scope);
    setLastFavoritesOnly(favoritesOnly);
    setLastNikudMode(nikudMode);
    setPage(p);
    search(`/api/verses/substring?q=${encodeURIComponent(basicQ.trim())}&scope=${scope}&whole=1&page=${p}${favParam(favoritesOnly)}${nikudParam(nikudMode)}`, p === 1);
  }

  function handleSubstring(e: React.FormEvent, p = 1) {
    e.preventDefault();
    if (substringQ.trim().length < 2) return;
    setLastSubstringQ(substringQ.trim());
    setLastScope(scope);
    setLastFavoritesOnly(favoritesOnly);
    setLastNikudMode(nikudMode);
    setPage(p);
    search(`/api/verses/substring?q=${encodeURIComponent(substringQ.trim())}&scope=${scope}&page=${p}${favParam(favoritesOnly)}${nikudParam(nikudMode)}`, p === 1);
  }

  function goToPage(p: number) {
    setPage(p);
    if (tab === "basic" || tab === "substring") {
      const q = tab === "basic" ? lastBasicQ : lastSubstringQ;
      const whole = tab === "basic" ? "&whole=1" : "";
      search(`/api/verses/substring?q=${encodeURIComponent(q)}&scope=${lastScope}${whole}&page=${p}${favParam(lastFavoritesOnly)}${nikudParam(lastNikudMode)}`, false);
    } else if (tab === "root") {
      search(rootUrl(lastRootQ, lastStem, lastVerbForm, lastScope, rootView, p, lastFavoritesOnly), false);
    } else if (tab === "etymology") {
      search(etymologyUrl(lastWordQ, lastScope, lastActiveGroupKey, p, lastFavoritesOnly), false);
    } else if (tab === "mishkal") {
      search(mishkalUrl(lastMishkal, lastScope, p, lastFavoritesOnly), false);
    }
  }

  function handleRoot(e: React.FormEvent, p = 1) {
    e.preventDefault();
    const hasRoot = rootQ.trim().length > 0;
    if (!hasRoot && stem === "all" && verbForm === "all") return;
    setLastRootQ(rootQ.trim());
    setLastStem(stem);
    setLastVerbForm(verbForm);
    setLastScope(scope);
    setLastFavoritesOnly(favoritesOnly);
    setRootView("direct");
    setPage(p);
    search(rootUrl(rootQ.trim(), stem, verbForm, scope, "direct", p, favoritesOnly), p === 1);
  }

  function switchRootView(view: "direct" | "etymological") {
    if (view === rootView) return;
    setRootView(view);
    search(rootUrl(lastRootQ, lastStem, lastVerbForm, lastScope, view, 1, lastFavoritesOnly), true);
  }

  function handleEtymology(e: React.FormEvent, p = 1) {
    e.preventDefault();
    if (wordQ.trim().length < 2) return;
    setLastWordQ(wordQ.trim());
    setLastScope(scope);
    setLastFavoritesOnly(favoritesOnly);
    setPage(p);
    search(etymologyUrl(wordQ.trim(), scope, null, p, favoritesOnly), p === 1);
  }

  function handleMishkal(e: React.FormEvent) {
    e.preventDefault();
    if (!mishkalQ) return;
    const m = { mishkal: mishkalQ, kind: mishkalKind, root: mishkalRoot.trim() };
    setLastMishkal(m);
    setLastScope(scope);
    setLastFavoritesOnly(favoritesOnly);
    setPage(1);
    search(mishkalUrl(m, scope, 1, favoritesOnly), true);
  }

  function switchGroup(key: string) {
    if (key === activeGroupKey) return;
    setActiveGroupKey(key);
    setLastActiveGroupKey(key);
    search(etymologyUrl(lastWordQ, lastScope, key, 1, lastFavoritesOnly), true);
  }

  const isEmpty = searched && !loading && (
    tab === "root" ? (rootDirectTotal ?? 0) + (rootEtymTotal ?? 0) === 0 : (total ?? 0) === 0
  );
  const showingEtym = tab === "root" && rootView === "etymological";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">חיפוש בתנ״ך</h1>
      <p className="text-stone-400 text-xs mb-6">Based on <a href="https://github.com/openscriptures/morphhb" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">Open Scriptures Hebrew Bible</a></p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-x-1 gap-y-1 mb-6 border-b border-stone-200 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearched(false); setResults([]); setEtymGroups([]); setActiveGroupKey(null); }}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
              tab === t.id
                ? "border-amber-600 text-amber-700 bg-amber-50"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "letters" && <LetterSearch />}

      {/* Scope filter — shared across the text/root tabs (the letter search has no scope) */}
      <div className={`flex items-center gap-2 mb-6 flex-wrap ${tab === "letters" ? "hidden" : ""}`}>
        <span className="text-stone-500 text-sm">חפש ב:</span>
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScope(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              scope === s.id ? "bg-amber-700 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {s.label}
          </button>
        ))}

        {session && (
          <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
              className="w-4 h-4 accent-red-600 cursor-pointer"
            />
            <HeartIcon filled={favoritesOnly} size={15} />
            חפש רק באהובים ביותר שלי
          </label>
        )}

        {(tab === "basic" || tab === "substring") && (
          <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={nikudMode}
              onChange={(e) => setNikudMode(e.target.checked)}
              className="w-4 h-4 accent-amber-700 cursor-pointer"
            />
            חפש עם ניקוד מדויק
          </label>
        )}
      </div>

      {/* Basic */}
      {tab === "basic" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            {nikudMode
              ? "חפש מילה או ביטוי בתנ״ך — התאמה מדויקת של הניקוד (טעמים יתעלמו)"
              : "חפש מילה או ביטוי בתנ״ך"}
          </p>
          <form onSubmit={handleBasic} className="flex gap-2 mb-4">
            <input
              type="text"
              value={basicQ}
              onChange={(e) => {
                const v = e.target.value;
                setBasicQ(v);
                setNikudMode(hasNikud(v));
              }}
              placeholder={nikudMode ? "לדוגמה: בְּרֵאשִׁית" : "חפש מילה או ביטוי..."}
              className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              autoFocus
            />
            <button
              type="submit"
              disabled={basicQ.trim().length < 2 || loading}
              className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              חפש
            </button>
          </form>
        </div>
      )}

      {/* Substring */}
      {tab === "substring" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            {nikudMode
              ? "מוצא כל פסוק שמכיל את הרצף המבוקש — עם ניקוד מדויק (טעמים יתעלמו)"
              : "מוצא כל פסוק שמכיל את הרצף המבוקש — ללא ניקוד"}
          </p>
          <form onSubmit={handleSubstring} className="flex gap-2 mb-4">
            <input
              type="text"
              value={substringQ}
              onChange={(e) => {
                const v = e.target.value;
                setSubstringQ(v);
                setNikudMode(hasNikud(v));
              }}
              placeholder={nikudMode ? "לדוגמה: רֵאשִׁי" : "לדוגמה: ראשי"}
              className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              autoFocus
            />
            <button
              type="submit"
              disabled={substringQ.trim().length < 2 || loading}
              className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              חפש
            </button>
          </form>
        </div>
      )}

      {/* Root + Binyan */}
      {tab === "root" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            הקלד שורש (ללא ניקוד) ו/או בחר בניין וצורה — אפשר לשלב ביניהם כדי לצמצם לתוצאות שמתאימות לכל מה שנבחר.
          </p>
          <form onSubmit={handleRoot} className="flex gap-2 mb-4">
            <input
              type="text"
              value={rootQ}
              onChange={(e) => setRootQ(e.target.value)}
              placeholder="לדוגמה: ברא  אהב  שמר (אופציונלי)"
              className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              autoFocus
            />
            <button
              type="submit"
              disabled={(!rootQ.trim() && stem === "all" && verbForm === "all") || loading}
              className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              חפש
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mb-4">
            {BINYANIM.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setStem(b.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  stem === b.id
                    ? "bg-amber-700 text-white"
                    : "bg-white border border-stone-200 text-stone-700 hover:border-amber-400"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-stone-500 text-sm">צורה:</span>
            {VERB_FORM_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setVerbForm(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  verbForm === f.id
                    ? "bg-amber-700 text-white"
                    : "bg-white border border-stone-200 text-stone-700 hover:border-amber-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Etymology (word -> full etymological family) */}
      {tab === "etymology" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            הקלד מילה (ללא ניקוד) — ימצאו כל המילים שקשורות אליה אטימולוגית: אם המילה עצמה שורש, יופיעו כל הנגזרים ממנה; אם היא צורה נגזרת, יופיעו גם המילים ה״אחיות״ שנגזרו מאותו שורש קדום, לא רק הנגזרות ממנה עצמה.
          </p>
          <form onSubmit={handleEtymology} className="flex gap-2 mb-4">
            <input
              type="text"
              value={wordQ}
              onChange={(e) => setWordQ(e.target.value)}
              placeholder="לדוגמה: תפוח"
              className="flex-1 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              autoFocus
            />
            <button
              type="submit"
              disabled={wordQ.trim().length < 2 || loading}
              className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              חפש
            </button>
          </form>
        </div>
      )}

      {/* Mishkal (noun/adjective pattern) */}
      {tab === "mishkal" && (
        <div>
          <p className="text-stone-500 text-sm mb-4">
            בחר משקל ותקבל את כל הפסוקים שיש בהם שם עצם או שם תואר במשקל הזה. אפשר לצמצם לשמות עצם או לתארים בלבד, ולשורש מסוים.
          </p>
          <form onSubmit={handleMishkal} className="space-y-3 mb-4">
            <div className="flex gap-2">
              <select
                value={mishkalQ}
                onChange={(e) => setMishkalQ(e.target.value)}
                disabled={!mishkalList}
                className="flex-1 min-w-0 border border-stone-300 rounded-xl px-4 py-2.5 text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">{mishkalList ? "בחר משקל…" : "טוען משקלים…"}</option>
                {MISHKAL_SECTIONS.map((section) => (
                  <optgroup key={section.prefix} label={section.label}>
                    {(mishkalList ?? [])
                      .filter((m) => m.gesenius.startsWith(section.prefix))
                      .map((m) => (
                        <option key={m.mishkal} value={m.mishkal}>
                          {m.mishkal} · {m.translit} · {(m.nouns + m.adjectives).toLocaleString()} מילים
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <button
                type="submit"
                disabled={!mishkalQ || loading}
                className="bg-amber-700 hover:bg-amber-800 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                חפש
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {MISHKAL_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setMishkalKind(k.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mishkalKind === k.id
                      ? "bg-amber-700 text-white"
                      : "bg-white border border-stone-200 text-stone-700 hover:border-amber-400"
                  }`}
                >
                  {k.label}
                </button>
              ))}
              <input
                type="text"
                value={mishkalRoot}
                onChange={(e) => setMishkalRoot(e.target.value)}
                placeholder="שורש (אופציונלי), למשל שפט"
                className="w-56 max-w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
              />
            </div>
          </form>
          <p className="text-stone-400 text-xs mb-4">
            הסיווג אוטומטי, לפי הדקדוק של גזניוס (§84–86), ומכסה כ־68% משמות העצם וכ־62% משמות התואר בתנ״ך.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <svg className="animate-spin h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <button
            type="button"
            onClick={cancelSearch}
            className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
          >
            בטל חיפוש
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        isEmpty ? (
          tab === "mishkal" ? (
            <p className="text-stone-500 text-center py-6">לא נמצאו מילים במשקל הזה בסינון שנבחר</p>
          ) : (
            <NotSeeded />
          )
        ) : (
          <>
            {/* Sub-tabs: direct vs. etymologically-related results (root search only) */}
            {tab === "root" && (rootEtymTotal ?? 0) > 0 && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => switchRootView("direct")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    rootView === "direct" ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
                  }`}
                >
                  תוצאות ישירות · {rootDirectTotal?.toLocaleString()}
                </button>
                <button
                  type="button"
                  onClick={() => switchRootView("etymological")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    rootView === "etymological" ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
                  }`}
                >
                  קשר אטימולוגי · {rootEtymTotal?.toLocaleString()}
                </button>
              </div>
            )}

            {/* Group switcher (etymology tab only) — shown when the typed word matched more
                than one distinct word-sense/root family, so homograph families are never
                silently merged into one blob. */}
            {tab === "etymology" && etymGroups.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {etymGroups.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => switchGroup(g.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors text-right ${
                      activeGroupKey === g.key ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
                    }`}
                  >
                    <span>{g.label}</span>
                    {g.rootLabel && <span className="opacity-75"> · מהשורש {g.rootLabel}</span>}
                    <span className="opacity-75"> · {g.total.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}

            {tab === "mishkal" && mishkalWords.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
                <p className="text-stone-600 text-sm font-medium mb-2">
                  {mishkalWords.length.toLocaleString()} מילים במשקל {lastMishkal.mishkal}
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {mishkalWords.map((w) => (
                    <span
                      key={w.strongs}
                      title={w.uncertainRoot ? "השורש משוער, ולכן הסיווג פחות ודאי" : undefined}
                      className={`text-sm rounded-lg px-2 py-0.5 ${
                        w.uncertainRoot ? "bg-stone-50 text-stone-500 border border-dashed border-stone-300" : "bg-amber-50 text-stone-700"
                      }`}
                    >
                      {w.form}
                      <span className="text-xs text-stone-400 ms-1">{w.tokens}</span>
                    </span>
                  ))}
                </div>
                {mishkalWords.some((w) => w.uncertainRoot) && (
                  <p className="text-stone-400 text-xs mt-2">מילים במסגרת מקווקוות: השורש שלהן משוער, ולכן הסיווג פחות ודאי.</p>
                )}
              </div>
            )}

            {showingEtym && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-stone-600 text-sm leading-relaxed">
                  הפסוקים ברשימה זו אינם מכילים את השורש שחיפשת עצמו, אלא מילים שמקורן בשורש קרוב או נגזר ממנו — קשר היסטורי-לשוני ולא התאמה ישירה.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2 my-4">
              <p className="text-stone-500 text-sm">
                נמצאו {total?.toLocaleString()} פסוקים
                {occurrences != null && ` (${occurrences.toLocaleString()} מופעים)`}
                {pages > 1 && ` · עמוד ${page} מתוך ${pages}`}
              </p>
              {pages > 1 && (
                <div className="flex gap-2">
                  <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}
                    className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                    → הקודם
                  </button>
                  <span className="px-4 py-2 text-stone-500 text-sm">{page} / {pages}</span>
                  <button onClick={() => goToPage(page + 1)} disabled={page >= pages || loading}
                    className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                    הבא ←
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {results.map((r, i) => (
                <ResultCard key={`${r.book}-${r.chapter}-${r.verse}`} r={r} num={(page - 1) * pageSize + i + 1} />
              ))}
            </div>
            {pages > 1 && (
              <div className="flex gap-2 justify-center mt-6">
                <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                  → הקודם
                </button>
                <span className="px-4 py-2 text-stone-500 text-sm">{page} / {pages}</span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= pages || loading}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                  הבא ←
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
