"use client";

import type { ReactNode } from "react";

type Groupable = { book: string; bookHe: string };

// Items (already sorted in Tanakh order) grouped under collapsible book headings
export default function BookGroups<T extends Groupable>({
  items,
  collapsed,
  onToggle,
  render,
}: {
  items: T[];
  collapsed: Set<string>;
  onToggle: (book: string) => void;
  render: (item: T) => ReactNode;
}) {
  const groups: { book: string; bookHe: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last?.book === item.book) last.items.push(item);
    else groups.push({ book: item.book, bookHe: item.bookHe, items: [item] });
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const open = !collapsed.has(g.book);
        return (
          <div key={g.book}>
            <button
              type="button"
              onClick={() => onToggle(g.book)}
              aria-expanded={open}
              className="w-full flex items-center gap-2 py-1.5 text-sm font-bold text-stone-600 hover:text-amber-700 transition-colors"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${open ? "" : "rotate-90"}`}
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
              {g.bookHe}
              <span className="text-xs font-normal text-stone-400 bg-stone-100 rounded-full px-2 py-px">{g.items.length}</span>
            </button>
            {open && <div className="space-y-3 mt-2">{g.items.map(render)}</div>}
          </div>
        );
      })}
    </div>
  );
}
