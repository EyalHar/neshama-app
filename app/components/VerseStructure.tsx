"use client";

import { LEVEL_NAMES, parseVerse, usesProseAccents, type Segment } from "@/lib/taamim";

export function TreeIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <rect x="3" y="17" width="6" height="4" rx="1" />
      <rect x="15" y="17" width="6" height="4" rx="1" />
      <path d="M12 7v5M6 17v-5h12v5" />
    </svg>
  );
}

const DEPTH_STYLE = [
  "border-amber-300 bg-amber-50/40",
  "border-sky-300 bg-sky-50/40",
  "border-emerald-300 bg-emerald-50/40",
  "border-violet-300 bg-violet-50/40",
  "border-rose-300 bg-rose-50/40",
];
const LABEL_STYLE = ["text-amber-700", "text-sky-700", "text-emerald-700", "text-violet-700", "text-rose-700"];

function SegmentBox({ s, depth }: { s: Segment; depth: number }) {
  const d = Math.min(depth, DEPTH_STYLE.length - 1);
  const label = s.accent && (
    <span className={`text-[11px] font-medium whitespace-nowrap ${LABEL_STYLE[d]}`}>
      {s.accent.name}
    </span>
  );
  if (s.children.length === 0) {
    return (
      <div className={`border rounded-lg px-2 py-1 flex flex-col items-center gap-0.5 ${DEPTH_STYLE[d]}`}>
        <span className="text-lg text-stone-800 leading-relaxed">{s.words.map((w) => w.text).join(" ")}</span>
        {label}
      </div>
    );
  }
  return (
    <div className={`border rounded-xl p-1.5 flex flex-col gap-1 ${DEPTH_STYLE[d]}`}>
      <div className="flex flex-wrap gap-1.5 items-stretch">
        {s.children.map((c, i) => <SegmentBox key={i} s={c} depth={depth + 1} />)}
      </div>
      <div className="text-center">{label}</div>
    </div>
  );
}

// The verse divided by its disjunctive accents, as nested boxes: the outer box is the verse,
// inside it the halves (אתנחתא), inside each half its parts (זקף, טפחא…) and so on
export default function VerseStructure({ text, book, chapter, verse, onClose }: {
  text: string; book: string; chapter: number; verse: number; onClose: () => void;
}) {
  const supported = usesProseAccents(book, chapter, verse);
  const tree = supported ? parseVerse(text) : null;
  return (
    <div onClick={(e) => e.stopPropagation()} className="bg-white border border-stone-200 rounded-xl shadow-sm cursor-default">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-xs font-bold text-stone-500">מבנה הפסוק לפי הטעמים</span>
        <button type="button" onClick={onClose} title="סגור" className="text-stone-400 hover:text-stone-600 w-6 h-6 rounded-full hover:bg-stone-100 transition-colors">
          ✕
        </button>
      </div>
      <div className="px-3 pb-3 pt-2">
        {!supported && (
          <p className="text-sm text-stone-500 py-3 text-center">
            בתהלים, משלי ואיוב (ג, ב–מב, ו) נוהגת מערכת טעמים אחרת, טעמי אמ״ת, שעוד לא נתמכת כאן
          </p>
        )}
        {tree && (
          <>
            <SegmentBox s={tree} depth={0} />
            <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
              כל תיבה נגמרת בטעם מפסיק, וחלוקתה הפנימית נעשית לפי הטעם החזק שבתוכה. דרגות: {LEVEL_NAMES[1]} (סוף פסוק, אתנחתא) ·{" "}
              {LEVEL_NAMES[2]} (זקף, סגולתא, שלשלת, טפחא) · {LEVEL_NAMES[3]} (רביע, פשטא, תביר, זרקא, יתיב) ·{" "}
              {LEVEL_NAMES[4]} (גרש, גרשיים, פזר, תלישא גדולה, קרני פרה, לגרמיה). מילים בלי טעם מפסיק מחוברות למילה שאחריהן.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
