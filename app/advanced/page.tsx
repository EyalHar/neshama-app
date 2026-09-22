"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toHebrewNumeral } from "@/lib/tanakh";
import HeartIcon from "@/app/components/HeartIcon";

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

type Result = {
  book: string; bookHe: string; chapter: number; verse: number;
  text: string; forms?: string[];
};

type Tab = "basic" | "substring" | "root";

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

export default function AdvancedPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("basic");
  const [basicQ, setBasicQ] = useState("");
  const [scope, setScope] = useState<typeof SCOPES[number]["id"]>("tanakh");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [lastFavoritesOnly, setLastFavoritesOnly] = useState(false);
  const [nikudMode, setNikudMode] = useState(false);
  const [lastNikudMode, setLastNikudMode] = useState(false);
  const [substringQ, setSubstringQ] = useState("");
  const [rootQ, setRootQ] = useState("");
  const [stem, setStem] = useState("all");
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [occurrences, setOccurrences] = useState<number | null>(null);
  const [rootView, setRootView] = useState<"direct" | "etymological">("direct");
  const [rootDirectTotal, setRootDirectTotal] = useState<number | null>(null);
  const [rootEtymTotal, setRootEtymTotal] = useState<number | null>(null);
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
  const abortRef = useRef<AbortController | null>(null);

  async function search(url: string, resetPage = true) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isRoot = url.includes("/api/verses/root");

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

  function favParam(fav: boolean) {
    return fav ? "&favoritesOnly=1" : "";
  }

  function nikudParam(n: boolean) {
    return n ? "&nikud=1" : "";
  }

  function rootUrl(rootValue: string, stemValue: string, scopeValue: string, view: "direct" | "etymological", p: number, fav: boolean) {
    const params = new URLSearchParams({ scope: scopeValue, view, page: String(p) });
    if (rootValue) params.set("root", rootValue);
    if (stemValue && stemValue !== "all") params.set("stem", stemValue);
    if (fav) params.set("favoritesOnly", "1");
    return `/api/verses/root?${params.toString()}`;
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
      search(rootUrl(lastRootQ, lastStem, lastScope, rootView, p, lastFavoritesOnly), false);
    }
  }

  function handleRoot(e: React.FormEvent, p = 1) {
    e.preventDefault();
    const hasRoot = rootQ.trim().length > 0;
    const hasStem = stem !== "all";
    if (!hasRoot && !hasStem) return;
    setLastRootQ(rootQ.trim());
    setLastStem(stem);
    setLastScope(scope);
    setLastFavoritesOnly(favoritesOnly);
    setRootView("direct");
    setPage(p);
    search(rootUrl(rootQ.trim(), stem, scope, "direct", p, favoritesOnly), p === 1);
  }

  function switchRootView(view: "direct" | "etymological") {
    if (view === rootView) return;
    setRootView(view);
    search(rootUrl(lastRootQ, lastStem, lastScope, view, 1, lastFavoritesOnly), true);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "חיפוש בסיסי" },
    { id: "substring", label: "חיפוש תת-מחרוזת" },
    { id: "root", label: "חיפוש לפי שורש ובניין" },
  ];

  const isEmpty = searched && !loading && (
    tab === "root" ? (rootDirectTotal ?? 0) + (rootEtymTotal ?? 0) === 0 : (total ?? 0) === 0
  );
  const showingEtym = tab === "root" && rootView === "etymological";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">חיפוש בתנ״ך</h1>
      <p className="text-stone-400 text-xs mb-6">Based on <a href="https://github.com/openscriptures/morphhb" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">Open Scriptures Hebrew Bible</a></p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-stone-200 pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearched(false); setResults([]); }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
              tab === t.id
                ? "border-amber-600 text-amber-700 bg-amber-50"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Scope filter — shared across all tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
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
              onChange={(e) => setBasicQ(e.target.value)}
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
              onChange={(e) => setSubstringQ(e.target.value)}
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
            הקלד שורש (ללא ניקוד) ו/או בחר בניין — אפשר להשתמש בשניהם יחד כדי לצמצם לתוצאות שהן גם מהשורש וגם מהבניין המבוקשים.
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
              disabled={(!rootQ.trim() && stem === "all") || loading}
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
          <NotSeeded />
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
                    ← הקודם
                  </button>
                  <span className="px-4 py-2 text-stone-500 text-sm">{page} / {pages}</span>
                  <button onClick={() => goToPage(page + 1)} disabled={page >= pages || loading}
                    className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                    הבא →
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
                  ← הקודם
                </button>
                <span className="px-4 py-2 text-stone-500 text-sm">{page} / {pages}</span>
                <button onClick={() => goToPage(page + 1)} disabled={page >= pages || loading}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors text-sm">
                  הבא →
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
