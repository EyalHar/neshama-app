const relative = new Intl.RelativeTimeFormat("he", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric" });

// "לפני 5 דקות" / "אתמול" / "12 באוק׳ 2026"
export function formatWhen(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "עכשיו";
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return relative.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 7 * 86400) return relative.format(-Math.floor(seconds / 86400), "day");
  return fullDate.format(new Date(iso));
}

const AVATAR_COLORS = ["bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-teal-500"];

// Initial-letter avatar in a color derived from the user id — no Google photo, since
// sharers choose a display name precisely to control what others see
export function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  const hash = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
  return (
    <span
      className={`${AVATAR_COLORS[hash % AVATAR_COLORS.length]} inline-flex items-center justify-center rounded-full text-white font-bold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {name.trim()[0] ?? "?"}
    </span>
  );
}
