"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { StudyDocSummary } from "@/lib/notebook";
import { setActiveDoc, useActiveDoc } from "./activeDoc";

const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function requestDocs(): Promise<StudyDocSummary[]> {
  const res = await fetch("/api/notebook");
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()).docs;
}

export default function NotebookListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const active = useActiveDoc();
  const [docs, setDocs] = useState<StudyDocSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // State is only set in the promise callbacks, so this is safe to start from an effect
  const load = useCallback(() => {
    requestDocs().then(setDocs, () => setError(true));
  }, []);
  useEffect(() => { if (session) load(); }, [session, load]);

  async function create() {
    setCreating(true);
    const res = await fetch("/api/notebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setCreating(false);
    if (!res.ok) return;
    const { doc } = await res.json();
    setActiveDoc({ id: doc.id, title: doc.title });
    router.push(`/notebook/${doc.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">המחברת שלי</h1>
      <p className="text-stone-500 text-sm mb-6">
        דפים לדבר תורה, לסיכום או לכל צורך. אפשר לכתוב בהם חופשי, ולאסוף אליהם פסוקים, הערות וקטעים מפרשנים מכל מקום באתר:
        מסמנים טקסט ולוחצים ״הוסף לדף״.
      </p>

      {status !== "loading" && !session && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <p className="text-stone-600 mb-2">המחברת פתוחה למשתמשים מחוברים</p>
          <Link href="/login" className="text-amber-600 hover:underline">התחבר</Link>
        </div>
      )}

      {session && (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); create(); }}
            className="flex gap-2 mb-6"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="שם הדף, למשל: דבר תורה לפרשת נח"
              className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button type="submit" disabled={creating} className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-colors">
              + דף חדש
            </button>
          </form>

          {error && <p className="text-red-500 text-sm">טעינת הדפים נכשלה, נסה לרענן</p>}
          {!docs && !error && <p className="text-stone-400 text-sm">טוען...</p>}
          {docs?.length === 0 && <p className="text-stone-400 text-sm">עוד אין דפים. צור דף ראשון למעלה.</p>}

          <div className="space-y-2">
            {docs?.map((d) => {
              const isActive = active?.id === d.id;
              return (
                <div key={d.id} className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm ${isActive ? "border-amber-300" : "border-stone-200"}`}>
                  <Link href={`/notebook/${d.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{d.title}</p>
                    <p className="text-xs text-stone-400">עודכן {dateFormat.format(new Date(d.updatedAt))}</p>
                  </Link>
                  {isActive ? (
                    <span title="מה שתוסיף לדף מכל מקום באתר ייכנס לכאן" className="text-xs bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">✓ הדף הפעיל</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveDoc({ id: d.id, title: d.title })}
                      title="מה שתוסיף לדף מכל מקום באתר ייכנס לכאן"
                      className="text-xs text-stone-500 hover:text-amber-700 border border-stone-200 hover:border-amber-300 rounded-full px-2.5 py-1 transition-colors"
                    >
                      הפוך לדף הפעיל
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
