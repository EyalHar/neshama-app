// Reads a psalm's superscription from the plain text of its first verse: who it is attributed to
// (לדוד, לבני קרח…) and what it is called (מזמור, שיר המעלות, תפלה…). Client-safe, no Prisma.
//
// The superscription is the start of verse 1, up to the first יהוה / אלהים: there the psalm itself
// begins (Ps 132: "שיר המעלות זכור יהוה לדוד" is not attributed to David, Ps 23: "מזמור לדוד יהוה
// רעי" is). Checked against the data: 73 psalms come out "לדוד", as in the Masoretic text.

export const PSALM_ATTRIBUTIONS = ["דוד", "בני קרח", "אסף", "שלמה", "משה", "הימן", "איתן"] as const;
export type PsalmAttribution = (typeof PSALM_ATTRIBUTIONS)[number];

export const PSALM_TAGS = ["מזמור", "שיר", "שיר המעלות", "תפילה", "משכיל", "מכתם", "תהלה", "הללויה", "למנצח"] as const;
export type PsalmTag = (typeof PSALM_TAGS)[number];

const ATTRIBUTION_WORDS: [RegExp, PsalmAttribution][] = [
  [/^(לדוד|לדויד)$/, "דוד"],
  [/^לאסף$/, "אסף"],
  [/^לשלמה$/, "שלמה"],
  [/^למשה$/, "משה"],
  [/^להימן$/, "הימן"],
  [/^לאיתן$/, "איתן"],
];
const TAG_WORDS: Record<string, PsalmTag> = { מזמור: "מזמור", שיר: "שיר", תפלה: "תפילה", משכיל: "משכיל", מכתם: "מכתם", תהלה: "תהלה", למנצח: "למנצח" };

export type PsalmTitle = { attributions: PsalmAttribution[]; tags: PsalmTag[]; title: string };

export function readPsalmTitle(plainVerse1: string): PsalmTitle {
  const words = plainVerse1.split(" ");
  // "למנצח לעבד יהוה לדוד" (Ps 18, 36): there the Name is part of the title
  const end = words.findIndex((w, i) => (w === "יהוה" || w === "אלהים") && words[i - 1] !== "לעבד");
  const head = words.slice(0, end < 0 ? words.length : end);
  const attributions: PsalmAttribution[] = [];
  const tags = new Set<PsalmTag>();
  head.forEach((w, i) => {
    const a = ATTRIBUTION_WORDS.find(([re]) => re.test(w))?.[1];
    if (a && !attributions.includes(a)) attributions.push(a);
    if (w === "לבני" && head[i + 1] === "קרח" && !attributions.includes("בני קרח")) attributions.push("בני קרח");
    if (w === "שיר" && (head[i + 1] === "המעלות" || head[i + 1] === "למעלות")) tags.add("שיר המעלות");
    else if (TAG_WORDS[w]) tags.add(TAG_WORDS[w]);
  });
  if (words[0] === "הללויה" || (words[0] === "הללו" && words[1] === "יה")) tags.add("הללויה");
  return { attributions, tags: PSALM_TAGS.filter((t) => tags.has(t)), title: head.join(" ") };
}
