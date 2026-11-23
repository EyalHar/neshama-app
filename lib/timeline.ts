// "ציר הזמן": Torah passages placed in time, shown on /tanakh-map?view=timeline.
// Data: data/timeline/torah.json, built and checked by scripts/build-timeline.mjs. Nothing is guessed:
// a passage gets a year only when the verses give it (ages, stated dates and intervals, every number
// checked against VerseText) or a traditional source checked on Sefaria states it.
//
// Two axes, because the text alone does not join them: the years from creation (genealogies and ages,
// Genesis), and the years of the Exodus (stated dates from the Exodus to Moses' death; Moses' birth from
// his age). The time in Egypt is "400" (Gen 15:13) or "430" (Ex 12:40) years, counted from different
// points, so only tradition (Rashi on Ex 12:40, Seder Olam: 400 years from Isaac's birth) places the
// Exodus in year 2448 and puts both on one axis. Client-safe.

import data from "@/data/timeline/torah.json";

export type VerseRef = [chapter: number, verse: number];

export type TimelineEvent = {
  id: string;
  book: string; // Torah book id
  parashiya: string; // "c:v", the start of the parashiya `from` lies in (lib/parashiyot.json)
  from: VerseRef;
  to: VerseRef;
  title: string;
  axis: "creation" | "exodus"; // which text-only axis the event belongs to
  am: { from: number; to?: number }; // years from creation (for an exodus-axis event: via 2448)
  rel?: { from: number; to?: number }; // exodus axis: years after the Exodus (0 = its year, 39 = the 40th)
  date?: string; // the day as the verse states it ("בחדש השני בשבעה עשר יום לחדש")
  basis: string; // how the year is known
  source: "text" | "tradition";
  sefariaRef?: string; // tradition: the checked source
  note?: string; // tradition's addition to a text event (a day the verses don't give)
};

export type TimelineData = { exodusAm: number; events: TimelineEvent[] };

export const TIMELINE = data as unknown as TimelineData;

// "בשנה ה־3 ליציאת מצרים", "80 שנה לפני יציאת מצרים"
export function relLabel(rel: number): string {
  if (rel < 0) return `${-rel} שנה לפני יציאת מצרים`;
  if (rel === 0) return "שנת יציאת מצרים";
  return `בשנה ה־${rel + 1} ליציאת מצרים`;
}

export const sefariaUrl = (ref: string) => `https://www.sefaria.org/${ref}?lang=he`;
