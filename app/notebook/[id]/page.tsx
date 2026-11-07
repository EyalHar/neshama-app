"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DocNode, StudyDocFull } from "@/lib/notebook";
import NotebookEditor from "../NotebookEditor";
import { setActiveDoc, useActiveDoc } from "../activeDoc";

async function requestDoc(id: string): Promise<StudyDocFull> {
  const res = await fetch(`/api/notebook/${id}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const active = useActiveDoc();
  const [doc, setDoc] = useState<StudyDocFull | null>(null);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);

  // State is only set in the promise callbacks, so this is safe to start from an effect
  useEffect(() => {
    requestDoc(id).then((d) => { setDoc(d); setTitle(d.title); }, () => setError(true));
  }, [id]);

  const save = useCallback(async (patch: { title?: string; content?: DocNode }) => {
    const res = await fetch(`/api/notebook/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(String(res.status));
    const { doc: saved } = await res.json();
    if (patch.title !== undefined && active?.id === id) setActiveDoc({ id, title: saved.title });
  }, [id, active?.id]);

  const saveContent = useCallback((content: DocNode) => save({ content }), [save]);

  async function remove() {
    if (!doc || !window.confirm(`למחוק את הדף ״${doc.title}״? אי אפשר לשחזר אותו.`)) return;
    const res = await fetch(`/api/notebook/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (active?.id === id) setActiveDoc(null);
    router.push("/notebook");
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center" dir="rtl">
        <p className="text-stone-600 mb-2">הדף לא נמצא</p>
        <Link href="/notebook" className="text-amber-600 hover:underline">חזרה למחברת</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center gap-3 mb-4 flex-wrap print:hidden">
        <Link href="/notebook" className="text-sm text-stone-500 hover:text-amber-700">→ המחברת שלי</Link>
        <span className="flex-1" />
        {doc && (active?.id === id ? (
          <span title="מה שתוסיף לדף מכל מקום באתר ייכנס לכאן" className="text-xs bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">✓ הדף הפעיל</span>
        ) : (
          <button
            type="button"
            onClick={() => setActiveDoc({ id, title: doc.title })}
            title="מה שתוסיף לדף מכל מקום באתר ייכנס לכאן"
            className="text-xs text-stone-500 hover:text-amber-700 border border-stone-200 hover:border-amber-300 rounded-full px-2.5 py-1"
          >
            הפוך לדף הפעיל
          </button>
        ))}
        {copied && <span className="text-xs text-green-600">הועתק ✓</span>}
        {doc && <button type="button" onClick={remove} className="text-xs text-stone-400 hover:text-red-600">מחק דף</button>}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => { if (doc && title.trim() && title !== doc.title) save({ title }).catch(() => {}); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        maxLength={80}
        placeholder="שם הדף"
        aria-label="שם הדף"
        className="w-full text-2xl font-bold text-stone-800 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-amber-400 focus:outline-none mb-4 py-1"
      />

      {doc ? (
        <NotebookEditor docId={id} initialContent={doc.content} onSave={saveContent} onCopyText={copyText} />
      ) : (
        <p className="text-stone-400 text-sm">טוען...</p>
      )}
    </div>
  );
}
