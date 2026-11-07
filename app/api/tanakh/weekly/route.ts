import { NextResponse } from "next/server";
import { getUnits, type VerseRef } from "@/lib/divisions";
import type { WeeklyReading } from "@/lib/passage";
import { TANAKH_BOOKS } from "@/lib/tanakh";

// Sefaria refs look like "Genesis 23:1-25:18", "I Kings 1:1-31" or "Isaiah 54:1"
function parseRef(ref: string): Omit<WeeklyReading, "name" | "isUnit"> | null {
  const m = ref.match(/^(.+?) (\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
  if (!m || !TANAKH_BOOKS.some((b) => b.id === m[1])) return null;
  const start: VerseRef = [parseInt(m[2]), parseInt(m[3])];
  const end: VerseRef = m[5] ? [m[4] ? parseInt(m[4]) : start[0], parseInt(m[5])] : start;
  return { book: m[1], start, end };
}

type CalendarItem = { title: { en: string }; displayValue: { he: string }; ref?: string };

// GET /api/tanakh/weekly — this week's Torah reading and haftarah (Israel), from Sefaria's
// calendar. On a festival Shabbat that is the festival reading. The date is Israel's, so the
// week turns over on Saturday night there.
export async function GET() {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date()).split("-");
  const res = await fetch(
    `https://www.sefaria.org/api/calendars?diaspora=0&year=${year}&month=${parseInt(month)}&day=${parseInt(day)}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 502 });
  const items: CalendarItem[] = (await res.json()).calendar_items ?? [];

  const toReading = (item: CalendarItem, name: string): WeeklyReading | null => {
    const r = item.ref ? parseRef(item.ref) : null;
    if (!r) return null;
    const isUnit = getUnits(r.book).some((u) => u.start.join(":") === r.start.join(":") && u.end.join(":") === r.end.join(":"));
    return { name, ...r, isUnit };
  };

  const parashaItem = items.find((i) => i.title.en === "Parashat Hashavua");
  const parasha = parashaItem ? toReading(parashaItem, parashaItem.displayValue.he) : null;
  const haftarot = items
    .filter((i) => i.title.en === "Haftarah")
    .map((i) => toReading(i, i.displayValue.he))
    .filter((r): r is WeeklyReading => r !== null);

  return NextResponse.json({ parasha, haftarot });
}
