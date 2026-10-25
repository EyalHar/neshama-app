export type GematriaMethod = "standard" | "gadol" | "katan" | "siduri";

export const GEMATRIA_METHODS: { id: GematriaMethod; label: string; short: string; description: string }[] = [
  { id: "standard", label: "מספר הכרחי", short: "רגיל", description: "א=1 … י=10 … ת=400, סופיות כרגילות" },
  { id: "gadol", label: "מספר גדול", short: "גדול", description: "כמו הכרחי, והסופיות ך=500 … ץ=900" },
  { id: "katan", label: "מספר קטן", short: "קטן", description: "בלי אפסים: י=1, ק=1, ת=4" },
  { id: "siduri", label: "מספר סידורי", short: "סידורי", description: "מקום האות באלף־בית: א=1 … ת=22" },
];

const LETTERS = "אבגדהוזחטיכלמנסעפצקרשת";
const FINAL_TO_BASE: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const GADOL_FINALS: Record<string, number> = { ך: 500, ם: 600, ן: 700, ף: 800, ץ: 900 };

function letterValue(ch: string, method: GematriaMethod): number {
  if (method === "gadol" && ch in GADOL_FINALS) return GADOL_FINALS[ch];
  const i = LETTERS.indexOf(FINAL_TO_BASE[ch] ?? ch);
  if (i < 0) return 0;
  if (method === "siduri") return i + 1;
  if (method === "katan") return (i % 9) + 1;
  return i < 9 ? i + 1 : i < 18 ? (i - 8) * 10 : (i - 17) * 100;
}

// Ignores everything but Hebrew letters, so nikud, ta'amim and punctuation don't count
export function gematria(text: string, method: GematriaMethod = "standard"): number {
  let sum = 0;
  for (const ch of text) sum += letterValue(ch, method);
  return sum;
}

// Methods saved as a comma-separated preference; falls back to the standard method
export function parseGematriaMethods(raw: string): GematriaMethod[] {
  const ids = raw.split(",");
  const methods = GEMATRIA_METHODS.map((m) => m.id).filter((id) => ids.includes(id));
  return methods.length ? methods : ["standard"];
}
