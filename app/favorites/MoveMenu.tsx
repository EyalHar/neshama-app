"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FavoriteListItem } from "@/lib/favoriteLists";

// Context menu for moving a favorite verse between lists, opened at the pointer (right-click)
// or under the card's "⋮" button. Includes creating a new list inline.
export default function MoveMenu({
  x,
  y,
  lists,
  currentListId,
  onMove,
  onCreate,
  onClose,
}: {
  x: number;
  y: number;
  lists: FavoriteListItem[];
  currentListId: string | null;
  onMove: (listId: string | null) => void;
  onCreate: (name: string) => Promise<string | null>; // returns an error message, or null on success
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Keep the menu inside the viewport
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
  }, [x, y, creating]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  async function create() {
    if (!name.trim()) return;
    const err = await onCreate(name.trim());
    if (err) setError(err);
  }

  const itemClass = "w-full text-right px-3 py-2 text-sm rounded-lg transition-colors";

  return (
    <div
      ref={ref}
      role="menu"
      dir="rtl"
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-50 w-60 bg-white border border-stone-200 rounded-xl shadow-xl p-1.5"
    >
      <p className="px-3 pt-1 pb-1.5 text-xs font-bold text-stone-400">העבר לרשימה</p>

      {currentListId !== null && (
        <button type="button" role="menuitem" onClick={() => onMove(null)} className={`${itemClass} text-stone-700 hover:bg-stone-100`}>
          ♥ הפסוקים האהובים ביותר (כללי)
        </button>
      )}
      {lists.map((l) => (
        <button
          key={l.id}
          type="button"
          role="menuitem"
          disabled={l.id === currentListId}
          onClick={() => onMove(l.id)}
          className={`${itemClass} ${
            l.id === currentListId ? "text-amber-700 bg-amber-50 cursor-default" : "text-stone-700 hover:bg-stone-100"
          }`}
        >
          {l.id === currentListId && "✓ "}
          {l.name}
        </button>
      ))}

      <div className="border-t border-stone-100 mt-1 pt-1">
        {creating ? (
          <div className="p-2 space-y-2">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") create(); }}
              placeholder="שם הרשימה, למשל: פסוקים שמופיעים בתפילה"
              maxLength={40}
              autoFocus
              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:border-amber-400"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="button"
              onClick={create}
              disabled={!name.trim()}
              className="w-full text-xs font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              צור והעבר
            </button>
          </div>
        ) : (
          <button type="button" role="menuitem" onClick={() => setCreating(true)} className={`${itemClass} text-amber-700 hover:bg-amber-50`}>
            + רשימה חדשה…
          </button>
        )}
      </div>
    </div>
  );
}
