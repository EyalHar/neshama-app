"use client";

import { useState, type KeyboardEvent } from "react";
import { NOTE_MAX_LENGTH, type VerseNoteItem } from "@/lib/notes";

type Props = {
  book: string;
  chapter: number;
  verse: number;
  notes: VerseNoteItem[];
  isFavorite: boolean;
  onNotesChange: (notes: VerseNoteItem[]) => void;
  // Called when a note is added to a non-favorite verse — the server favorites it at the same time
  onFavorited?: () => void;
  onClose?: () => void;
};

const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" });

async function sendJson(url: string, method: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Ctrl/Cmd+Enter submits a note textarea, Escape cancels
function submitKeys(onSubmit: () => void, onCancel?: () => void) {
  return (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSubmit(); }
    else if (e.key === "Escape" && onCancel) { e.preventDefault(); onCancel(); }
  };
}

const textareaClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 leading-relaxed resize-y focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100";

export default function VerseNotes({ book, chapter, verse, notes, isFavorite, onNotesChange, onFavorited, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch {
      setError("השמירה נכשלה, נסה שוב");
    } finally {
      setBusy(false);
    }
  }

  const addNote = () => {
    if (!draft.trim() || busy) return;
    run(async () => {
      const { note } = await sendJson("/api/notes", "POST", { book, chapter, verse, text: draft });
      onNotesChange([...notes, note]);
      if (!isFavorite) onFavorited?.();
      setDraft("");
    });
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim() || busy) return;
    run(async () => {
      const { note } = await sendJson(`/api/notes/${editingId}`, "PATCH", { text: editText });
      onNotesChange(notes.map((n) => (n.id === note.id ? note : n)));
      setEditingId(null);
    });
  };

  const deleteNote = (id: string) => {
    if (!window.confirm("למחוק את ההערה?")) return;
    run(async () => {
      await sendJson(`/api/notes/${id}`, "DELETE");
      onNotesChange(notes.filter((n) => n.id !== id));
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2 text-right cursor-default"
    >
      {onClose && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-800">ההערות שלי</span>
          <button
            type="button"
            onClick={onClose}
            title="סגור"
            className="text-stone-400 hover:text-stone-600 w-6 h-6 rounded-full hover:bg-amber-100 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {notes.map((n) =>
        editingId === n.id ? (
          <div key={n.id} className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={submitKeys(saveEdit, () => setEditingId(null))}
              maxLength={NOTE_MAX_LENGTH}
              rows={3}
              autoFocus
              className={textareaClass}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy || !editText.trim()}
                className="text-xs font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                שמור
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div key={n.id} className="group/note bg-white rounded-lg border border-amber-100 px-3 py-2">
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap break-words">{n.text}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-stone-400">{dateFormat.format(new Date(n.updatedAt))}</span>
              <div className="flex gap-1 opacity-60 group-hover/note:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => { setEditingId(n.id); setEditText(n.text); }}
                  className="text-xs text-amber-700 hover:bg-amber-50 px-2 py-0.5 rounded transition-colors"
                >
                  ערוך
                </button>
                <button
                  type="button"
                  onClick={() => deleteNote(n.id)}
                  className="text-xs text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        )
      )}

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={submitKeys(addNote, onClose)}
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
          autoFocus={notes.length === 0}
          placeholder={notes.length === 0 ? "כתוב הערה לפסוק..." : "הוסף הערה נוספת..."}
          className={textareaClass}
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={addNote}
            disabled={busy || !draft.trim()}
            className="text-xs font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            הוסף הערה
          </button>
          {error ? (
            <span className="text-xs text-red-600">{error}</span>
          ) : (
            !isFavorite && <span className="text-[11px] text-stone-400">הפסוק יתווסף לאהובים</span>
          )}
        </div>
      </div>
    </div>
  );
}
