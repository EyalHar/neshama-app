"use client";

import { useEffect, useRef, useState } from "react";
import { GEMATRIA_METHODS, gematria, type GematriaMethod } from "@/lib/gematria";

const SAMPLE = "שלום";

export default function GematriaSettings({
  enabled,
  methods,
  onToggle,
  onMethodsChange,
}: {
  enabled: boolean;
  methods: GematriaMethod[];
  onToggle: (on: boolean) => void;
  onMethodsChange: (methods: GematriaMethod[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleMethod(id: GematriaMethod) {
    const next = methods.includes(id) ? methods.filter((m) => m !== id) : [...methods, id];
    if (next.length) onMethodsChange(next);
  }

  return (
    <div ref={ref} className="relative flex items-center justify-center gap-1">
      <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="accent-amber-600 w-3.5 h-3.5"
        />
        חישוב גימטריה
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="שיטות חישוב"
        aria-expanded={open}
        className={`p-0.5 rounded transition-colors ${open ? "text-amber-700 bg-amber-50" : "text-stone-400 hover:text-amber-700 hover:bg-stone-100"}`}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="w-3.5 h-3.5">
          <path d="M3 5h8M15 5h2M3 10h2M9 10h8M3 15h6M13 15h4" />
          <circle cx="13" cy="5" r="2" />
          <circle cx="7" cy="10" r="2" />
          <circle cx="11" cy="15" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-30 w-72 bg-white rounded-xl border border-stone-200 shadow-xl p-3 animate-modal-enter">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-bold text-stone-700">שיטות חישוב</p>
            <p className="text-xs text-stone-400">לדוגמה: ״{SAMPLE}״</p>
          </div>
          <ul className="space-y-1">
            {GEMATRIA_METHODS.map((m) => {
              const on = methods.includes(m.id);
              const last = on && methods.length === 1;
              return (
                <li key={m.id}>
                  <label
                    title={last ? "יש לבחור לפחות שיטה אחת" : undefined}
                    className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${on ? "bg-amber-50" : "hover:bg-stone-50"} ${last ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={last}
                      onChange={() => toggleMethod(m.id)}
                      className="accent-amber-600 w-3.5 h-3.5 mt-0.5"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-stone-700">{m.label}</span>
                      <span className="block text-xs text-stone-400">{m.description}</span>
                    </span>
                    <span className={`text-sm tabular-nums ${on ? "text-amber-700 font-medium" : "text-stone-400"}`}>{gematria(SAMPLE, m.id)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {!enabled && (
            <button
              type="button"
              onClick={() => { onToggle(true); setOpen(false); }}
              className="mt-2 w-full text-xs font-medium text-amber-700 hover:bg-amber-50 py-1.5 rounded-lg transition-colors"
            >
              הפעל חישוב גימטריה
            </button>
          )}
        </div>
      )}
    </div>
  );
}
