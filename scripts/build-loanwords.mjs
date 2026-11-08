// One-time builder for data/loanwords/loanwords.json: the Tanakh words Strong's dictionary (1894)
// marks as coming from another language — "of Persian origin", "of Egyptian derivation",
// "perhaps of foreign derivation" and so on.
//
// Run from the project root: node scripts/build-loanwords.mjs
//
// Strong's predates most of modern Semitic philology, so it misses many loanwords recognized
// today (Akkadian הֵיכָל and כִּסֵּא are derived there from Hebrew roots). The page says so.
// Source: openscriptures/strongs, CC-BY-SA (Open Scriptures), from a public-domain text.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";

const STRONGS_URL =
  "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js";
const DB_PATH = "prisma/dev.db";
const OUT_DIR = "data/loanwords";
const OUT_FILE = `${OUT_DIR}/loanwords.json`;

const ORIGINS = { Persian: "persian", Egyptian: "egyptian", Greek: "greek", Babylonian: "babylonian", foreign: "foreign" };
// "of Persian origin", "prob. of Egyptian derivation", "of uncertain (perhaps foreign) derivation"
const ORIGIN_RE = /(?:(prob(?:ably|\.)?|perhaps)\s+)?of\s+(?:uncertain\s+\((perhaps)\s+)?(Persian|Egyptian|Greek|Babylonian|foreign)\)?\s+(?:origin|derivation)/i;

function certaintyOf(hedge) {
  if (!hedge) return "certain";
  return /^prob/i.test(hedge) ? "probable" : "possible";
}

// Main-word Strong's number of a WordEntry, as parseWord() in lib/wordStats.ts reads it
function mainWord(lemma, morph) {
  const lemmaParts = lemma.split("/");
  const morphParts = morph.slice(1).split("/");
  const i = lemmaParts.findIndex((s) => /^\d/.test(s.trim()));
  if (i < 0) return null;
  return { num: lemmaParts[i].trim().match(/^\d+/)[0], proper: (morphParts[i] ?? "").startsWith("Np") };
}

const res = await fetch(STRONGS_URL);
if (!res.ok) throw new Error(`Strong's download failed: HTTP ${res.status}`);
const raw = await res.text();
const dict = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const usage = new Map(); // num → { tokens, proper }
for (const r of db.prepare(`SELECT lemma, morph, COUNT(*) AS c FROM "WordEntry" GROUP BY lemma, morph`).all()) {
  const w = mainWord(r.lemma, r.morph);
  if (!w) continue;
  const u = usage.get(w.num) ?? { tokens: 0, proper: 0 };
  u.tokens += Number(r.c);
  if (w.proper) u.proper += Number(r.c);
  usage.set(w.num, u);
}

const entries = [];
for (const [key, e] of Object.entries(dict)) {
  const derivation = e.derivation ?? "";
  const m = derivation.match(ORIGIN_RE);
  if (!m) continue;
  const u = usage.get(key.replace(/^H/, ""));
  if (!u) continue; // not in the OSHB text
  entries.push({
    strongs: key,
    lemma: e.lemma ?? "",
    xlit: e.xlit ?? "",
    definition: e.strongs_def ?? "",
    derivation: derivation.trim(),
    origin: ORIGINS[m[3]] ?? ORIGINS[m[3].toLowerCase()] ?? "foreign",
    certainty: certaintyOf(m[1] ?? m[2]),
    aramaic: /^\(Aramaic\)/.test(derivation.trim()),
    // A proper name (person, place, people) — tagged Np in OSHB for most of its occurrences
    name: u.proper * 2 > u.tokens,
    tokens: u.tokens,
  });
}
entries.sort((a, b) => b.tokens - a.tokens);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(entries, null, 1) + "\n");

const by = (f) => entries.reduce((acc, e) => ((acc[f(e)] = (acc[f(e)] ?? 0) + 1), acc), {});
console.log(`${entries.length} loanwords → ${OUT_FILE}`);
console.log("origin:", by((e) => e.origin));
console.log("certainty:", by((e) => e.certainty));
console.log("names:", by((e) => (e.name ? "name" : "word")));
