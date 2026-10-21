"use client";

import type { Leitword } from "@/lib/leitwords";

// Leitword chips for a passage (or one parashiya inside it). `activeKey`/`onToggle` use
// `${scope}|${strongs}` keys so chips of different scopes don't light each other up.
export default function LeitwordChips({
  leitwords,
  scope,
  unitNoun,
  activeKey,
  onToggle,
  small = false,
}: {
  leitwords: Leitword[];
  scope: string;
  unitNoun: string; // "בפרק" / "בפרשה" / "בפרשייה"
  activeKey: string | null;
  onToggle: (key: string | null) => void;
  small?: boolean;
}) {
  if (leitwords.length === 0) return null;
  return (
    <div className={`flex items-center gap-2 flex-wrap ${small ? "" : "mb-4 -mt-1"}`}>
      <span
        className={`${small ? "text-[11px]" : "text-xs"} text-stone-500 cursor-help border-b border-dotted border-stone-300`}
        title={`מילה מנחה: שורש שחוזר ${unitNoun} הרבה יותר מהרגיל בתנ״ך, ומדגיש את הנושא שלו. לחיצה על מילה מדגישה את כל מופעיה.`}
      >
        מילים מנחות{small ? ` ${unitNoun}` : ""}:
      </span>
      {leitwords.map((l) => {
        const key = `${scope}|${l.strongs}`;
        const active = activeKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(active ? null : key); }}
            aria-pressed={active}
            title={`${l.count} מופעים ${unitNoun}, פי ${l.ratio} מהשכיחות הרגילה בתנ״ך`}
            className={`${small ? "text-xs px-2 py-px" : "text-sm px-2.5 py-0.5"} rounded-full border transition-colors ${
              active
                ? "bg-yellow-200 border-yellow-400 text-stone-800"
                : "bg-white border-stone-200 text-stone-600 hover:border-yellow-400 hover:bg-yellow-50"
            }`}
          >
            {l.lemmaHe} <span className="text-xs text-stone-400">×{l.count}</span>
          </button>
        );
      })}
    </div>
  );
}
