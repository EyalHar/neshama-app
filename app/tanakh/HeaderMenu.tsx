"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// A compact header button that opens a floating panel over the page (so opening it doesn't push
// the reader down). Closes on an outside click or Escape.
export default function HeaderMenu({ label, icon, badge = 0, children }: {
  label: string;
  icon: ReactNode;
  badge?: number;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
          open ? "border-amber-300 bg-amber-50 text-amber-800" : "border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-800"
        }`}
      >
        <span className="w-4 h-4 shrink-0">{icon}</span>
        {label}
        {badge > 0 && (
          <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
            {badge}
          </span>
        )}
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-30 w-52 rounded-xl border border-stone-200 bg-white shadow-xl p-2.5 animate-modal-enter">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
