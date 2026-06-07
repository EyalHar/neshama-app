"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toHebrewNumeral } from "@/lib/tanakh";

type VerseRef = { book: string; bookHe: string; chapter: number; verse: number; text: string };

type Row = {
  id: number; strongsNum: string; lemmaHe: string;
  suggestedRoot: string | null;
  verseRef: VerseRef | null;
};

export default function UnknownRootsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "missing" | "done">("all");
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/unknown-roots")
      .then((r) => r.json())
      .then((d) => { setRows(d.rows ?? []); setLoading(false); });
  }, []);

  async function save(row: Row) {
    const val = editing[row.id] ?? row.suggestedRoot ?? "";
    setSaving(row.id);
    await fetch("/api/unknown-roots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, suggestedRoot: val }),
    });
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, suggestedRoot: val || null } : r));
    setSaving(null);
  }

  const filtered = rows.filter((r) => {
    if (filter === "missing") return !r.suggestedRoot;
    if (filter === "done") return !!r.suggestedRoot;
    return true;
  });

  const doneCount = rows.filter((r) => r.suggestedRoot).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">מילים ללא שורש ידוע</h1>
      <p className="text-stone-500 text-sm mb-6">
        מילים שב-Strong's Hebrew Dictionary אין להן הפניה לשורש. עזור להשלים את המידע.
      </p>

      {loading ? (
        <p className="text-stone-400">טוען...</p>
      ) : rows.length === 0 ? (
        <p className="text-stone-400 text-center py-12">
          הטבלה ריקה — יש לאכלס את מילון Strong's תחילה מדף <a href="/admin/seed" className="underline text-amber-700">האכלוס</a>.
        </p>
      ) : (
        <>
          {/* Stats + filter */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-stone-500 text-sm">
              {rows.length} מילים · <span className="text-green-600">{doneCount} הושלמו</span> · <span className="text-amber-600">{rows.length - doneCount} נותרו</span>
            </p>
            <div className="flex gap-2">
              {(["all", "missing", "done"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"}`}>
                  {f === "all" ? "הכל" : f === "missing" ? "חסרים" : "הושלמו"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-right px-4 py-3 text-stone-600 font-medium border-b border-stone-200">מילה</th>
                  <th className="text-right px-4 py-3 text-stone-600 font-medium border-b border-stone-200">הפסוק שבו המילה נמצאת בתנ״ך</th>
                  <th className="text-right px-4 py-3 text-stone-600 font-medium border-b border-stone-200">הצעת שורש</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id} className={`${i % 2 === 1 ? "bg-stone-50/40" : ""} hover:bg-amber-50/40 transition-colors`}>
                    <td className="px-4 py-3 align-top border-b border-stone-100">
                      <p className="font-bold text-lg text-stone-800">{row.lemmaHe}</p>
                      <a
                        href={`https://www.blueletterbible.org/lexicon/${row.strongsNum.toLowerCase()}/he/wlc/0-1/`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-amber-700 hover:underline font-mono text-xs"
                      >
                        {row.strongsNum}
                      </a>
                    </td>
                    <td className="px-4 py-3 align-top border-b border-stone-100 max-w-md">
                      {row.verseRef ? (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-amber-700 mb-1">
                              {row.verseRef.bookHe} {toHebrewNumeral(row.verseRef.chapter)}&lrm;:{toHebrewNumeral(row.verseRef.verse)}
                            </p>
                            <p className="text-stone-600 leading-relaxed">{row.verseRef.text}</p>
                          </div>
                          <Link
                            href={`/tanakh?book=${encodeURIComponent(row.verseRef.book)}&chapter=${row.verseRef.chapter}`}
                            className="shrink-0 text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                          >
                            קרא פרק ←
                          </Link>
                        </div>
                      ) : (
                        <span className="text-stone-300 text-xs">לא נמצא פסוק</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editing[row.id] ?? row.suggestedRoot ?? ""}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && save(row)}
                          placeholder="הצע שורש..."
                          className="border border-stone-200 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-amber-400 text-right"
                          dir="rtl"
                        />
                        <button
                          onClick={() => save(row)}
                          disabled={saving === row.id}
                          className="text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          {saving === row.id ? "..." : "שמור"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
