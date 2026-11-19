"use client";

import { useState } from "react";
import type { AcrosticView } from "@/lib/letterHintsShared";
import InitialsSearch from "./InitialsSearch";
import Acrostics from "./Acrostics";
import ElsSearch from "./ElsSearch";
import WordSquares from "./WordSquares";

export type HintsTab = "initials" | "acrostics" | "squares" | "els";

const TABS: { id: HintsTab; label: string }[] = [
  { id: "initials", label: "ראשי וסופי תיבות" },
  { id: "acrostics", label: "אקרוסטיכונים" },
  { id: "squares", label: "ריבועי מילים" },
  { id: "els", label: "דילוגי אותיות" },
];

export default function LetterHintsTabs({ initial, acrostics }: { initial: HintsTab; acrostics: AcrosticView[] }) {
  const [tab, setTab] = useState(initial);
  // A tab is mounted on first visit (the word squares scan the whole Tanakh), then kept
  const [visited, setVisited] = useState<HintsTab[]>([initial]);

  function select(t: HintsTab) {
    setTab(t);
    setVisited((v) => (v.includes(t) ? v : [...v, t]));
    window.history.replaceState(null, "", `?tab=${t}`);
  }

  return (
    <>
      <div className="flex gap-1 sm:gap-2 mb-6 border-b border-stone-200 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => select(t.id)}
            className={`px-3 sm:px-5 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors -mb-px border-b-2 ${
              tab === t.id ? "border-amber-600 text-amber-700 bg-amber-50" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div hidden={tab !== "initials"}>{visited.includes("initials") && <InitialsSearch />}</div>
      <div hidden={tab !== "acrostics"}>{visited.includes("acrostics") && <Acrostics items={acrostics} />}</div>
      <div hidden={tab !== "squares"}>{visited.includes("squares") && <WordSquares />}</div>
      <div hidden={tab !== "els"}>{visited.includes("els") && <ElsSearch />}</div>
    </>
  );
}
