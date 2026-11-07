"use client";

import { useEffect, useState } from "react";
import type { WeeklyReading } from "@/lib/passage";

export type WeeklyKind = "parasha" | "haftarah";

type Weekly = { parasha: WeeklyReading | null; haftarot: WeeklyReading[] };

// Jump buttons for this week's parasha and haftarah; hidden until (and unless) the calendar loads
export default function WeeklyReadings({ onJump }: { onJump: (reading: WeeklyReading, kind: WeeklyKind) => void }) {
  const [weekly, setWeekly] = useState<Weekly | null>(null);

  useEffect(() => {
    fetch("/api/tanakh/weekly")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setWeekly(d))
      .catch(() => {});
  }, []);

  if (!weekly || (!weekly.parasha && weekly.haftarot.length === 0)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {weekly.parasha && (
        <button
          type="button"
          onClick={() => onJump(weekly.parasha!, "parasha")}
          className="flex items-center gap-2 bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl px-4 py-2 shadow-sm transition-colors"
        >
          <span className="text-xs text-stone-400">פרשת השבוע</span>
          <span className="text-sm font-bold text-amber-800">{weekly.parasha.name}</span>
        </button>
      )}
      {weekly.haftarot.map((h) => (
        <button
          key={`${h.book}-${h.start.join(":")}`}
          type="button"
          onClick={() => onJump(h, "haftarah")}
          className="flex items-center gap-2 bg-white border border-sky-200 hover:border-sky-400 hover:bg-sky-50 rounded-xl px-4 py-2 shadow-sm transition-colors"
        >
          <span className="text-xs text-stone-400">הפטרת השבוע</span>
          <span className="text-sm font-bold text-sky-800">{h.name}</span>
        </button>
      ))}
    </div>
  );
}
