"use client";

import { useState, type ReactNode } from "react";
import type { AcrosticView } from "@/lib/letterHintsShared";
import InitialsSearch from "./InitialsSearch";
import Acrostics from "./Acrostics";
import ElsSearch from "./ElsSearch";
import WordSquares from "./WordSquares";
import AtbashTab from "./AtbashTab";
import MirrorTab from "./MirrorTab";
import FirstLettersTab from "./FirstLettersTab";
import { VISIBLE_TABS, type HintsTab } from "./tabs";

const LABELS: Record<HintsTab, string> = {
  initials: "ראשי וסופי תיבות",
  acrostics: "אקרוסטיכונים",
  squares: "ריבועי מילים",
  atbash: "אתב״ש",
  mirror: "הפוכות ופלינדרומים",
  first: "אותיות ראשונות",
  els: "דילוגי אותיות",
};

export default function LetterHintsTabs({ initial, acrostics }: { initial: HintsTab; acrostics: AcrosticView[] }) {
  const [tab, setTab] = useState(initial);
  // A tab is mounted on first visit (several scan the whole Tanakh), then kept
  const [visited, setVisited] = useState<HintsTab[]>([initial]);

  function select(t: HintsTab) {
    setTab(t);
    setVisited((v) => (v.includes(t) ? v : [...v, t]));
    window.history.replaceState(null, "", `?tab=${t}`);
  }

  const content: Record<HintsTab, () => ReactNode> = {
    initials: () => <InitialsSearch />,
    acrostics: () => <Acrostics items={acrostics} />,
    squares: () => <WordSquares />,
    atbash: () => <AtbashTab />,
    mirror: () => <MirrorTab />,
    first: () => <FirstLettersTab />,
    els: () => <ElsSearch />,
  };

  return (
    <>
      <div className="flex gap-1 sm:gap-2 mb-6 border-b border-stone-200 overflow-x-auto overflow-y-hidden" role="tablist">
        {VISIBLE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => select(t)}
            className={`px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
              tab === t ? "border-amber-600 text-amber-700 bg-amber-50" : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>
      {VISIBLE_TABS.map((t) => (
        <div key={t} hidden={tab !== t}>{visited.includes(t) && content[t]()}</div>
      ))}
    </>
  );
}
