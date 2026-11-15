"use client";

import { useState } from "react";

// A small marker after a word that has a version note (חילוף נוסח); hover or tap shows the note.
// Its "*" has no Hebrew letters, so gematria selection sums ignore it, and data-collect-skip keeps
// it out of notebook quotes.
export default function VersionNoteMark({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span data-collect-skip="" className="relative inline-block align-super leading-none" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={`חילוף נוסח: ${text}`}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="mx-0.5 px-0.5 text-sm font-bold text-sky-600 hover:text-sky-800 rounded"
      >
        *
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-20 top-full right-1/2 translate-x-1/2 mt-1 w-max max-w-64 rounded-lg bg-stone-800 text-white text-sm font-normal leading-relaxed px-3 py-1.5 shadow-lg whitespace-normal text-right"
        >
          <span className="block text-[11px] text-stone-300">חילוף נוסח</span>
          {text}
        </span>
      )}
    </span>
  );
}
