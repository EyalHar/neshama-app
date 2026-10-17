// Classic commentators shown in the reader, in tab order. Matched against Sefaria's
// `collectiveTitle.en` on the verse's commentary links. Modern commentaries (Steinsaltz,
// Kehot, "The Torah: A Women's Commentary", …) are deliberately not listed — they are
// copyrighted.
export const COMMENTATORS: { key: string; he: string }[] = [
  { key: "Rashi", he: "רש״י" },
  { key: "Ramban", he: "רמב״ן" },
  { key: "Ibn Ezra", he: "אבן עזרא" },
  { key: "Rashbam", he: "רשב״ם" },
  { key: "Sforno", he: "ספורנו" },
  { key: "Radak", he: "רד״ק" },
  { key: "Metzudat David", he: "מצודת דוד" },
  { key: "Metzudat Zion", he: "מצודת ציון" },
  { key: "Ralbag", he: "רלב״ג" },
  { key: "Or HaChaim", he: "אור החיים" },
  { key: "Kli Yakar", he: "כלי יקר" },
  { key: "Malbim", he: "מלבי״ם" },
  { key: "Shadal", he: "שד״ל" },
  { key: "Chizkuni", he: "חזקוני" },
  { key: "Abarbanel", he: "אברבנאל" },
];

// Licenses whose text may be reproduced (with attribution). Anything else — including
// Sefaria's "unknown" — is not shown; the tab links to Sefaria instead.
export const ALLOWED_LICENSES = new Set(["Public Domain", "CC0", "CC-BY", "CC-BY-SA"]);

export type Commentary =
  | { key: string; he: string; status: "ok"; segments: string[]; versionTitle: string; license: string; sefariaUrl: string }
  | { key: string; he: string; status: "unavailable"; sefariaUrl: string };
