// One-time builder for data/parallels/parallels.json: passages the Tanakh tells twice (Samuel–Kings
// and Chronicles, II Samuel 22 and Psalm 18, the Decalogue in Exodus and Deuteronomy, the
// Tabernacle's command and its making…), found from the data rather than from a hand-made list.
//
// Run from the project root: node scripts/build-parallels.mjs
//
// Method:
// 1. Each verse = the set of its lexemes (Strong's numbers of all its words, names included).
// 2. Two verses match when they share at least 4 lexemes and their Jaccard similarity is at least
//    0.6. Verses in the same chapter are not compared.
// 3. Matches are chained into passages when both sides move forward by 1–4 verses.
// 4. A passage is kept when it has at least 3 matched verses, or 2 across different works. Two-verse
//    matches inside one work are mostly formulas — the closing summaries of the kings ("וְיֶתֶר דִּבְרֵי…"),
//    the festival offerings in Numbers 28–29 — not a passage told twice.
// 5. A passage contained in a larger one is dropped.
// 6. Inside each passage, verses left between two matched pairs are matched more loosely (Jaccard
//    of at least 0.3), keeping the order: those are the verses the two versions tell differently
//    (זָכוֹר / שָׁמוֹר), which is what the side-by-side view is for.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";

const DB_PATH = "prisma/dev.db";
const OUT_DIR = "data/parallels";
const OUT_FILE = `${OUT_DIR}/parallels.json`;

const MIN_SHARED = 4;
const MIN_JACCARD = 0.6;
const MAX_STEP = 4;
// Lexemes in more than this many verses are not used to find candidates (they still count in the
// similarity of a candidate)
const MAX_DF = 400;
const GAP_JACCARD = 0.3;

// Books that are one work, so two-verse matches between them are treated as formulas
const WORK = { "I Samuel": "Samuel", "II Samuel": "Samuel", "I Kings": "Kings", "II Kings": "Kings", "I Chronicles": "Chronicles", "II Chronicles": "Chronicles" };
const workOf = (book) => WORK[book] ?? book;

function mainNumber(lemma) {
  const seg = lemma.split("/").find((s) => /^\d/.test(s.trim()));
  return seg ? seg.trim().match(/^\d+/)[0] : null;
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const verses = new Map();
for (const r of db.prepare(`SELECT book, chapter, verse, verseIndex, lemma FROM "WordEntry" ORDER BY verseIndex, wordNum`).all()) {
  let v = verses.get(r.verseIndex);
  if (!v) verses.set(r.verseIndex, (v = { book: r.book, chapter: r.chapter, verse: r.verse, lexemes: new Set() }));
  const n = mainNumber(r.lemma);
  if (n) v.lexemes.add(n);
}

const df = new Map();
for (const v of verses.values()) for (const l of v.lexemes) df.set(l, (df.get(l) ?? 0) + 1);
const postings = new Map();
for (const [vi, v] of verses) {
  for (const l of v.lexemes) {
    if (df.get(l) > MAX_DF) continue;
    if (!postings.has(l)) postings.set(l, []);
    postings.get(l).push(vi);
  }
}

const matches = [];
for (const [vi, v] of verses) {
  if (v.lexemes.size < MIN_SHARED) continue;
  const candidates = new Map();
  for (const l of v.lexemes) for (const o of postings.get(l) ?? []) if (o > vi) candidates.set(o, (candidates.get(o) ?? 0) + 1);
  for (const [o, c] of candidates) {
    if (c < 2) continue;
    const ov = verses.get(o);
    if (ov.book === v.book && ov.chapter === v.chapter) continue;
    let shared = 0;
    for (const l of v.lexemes) if (ov.lexemes.has(l)) shared++;
    const jaccard = shared / (v.lexemes.size + ov.lexemes.size - shared);
    if (shared >= MIN_SHARED && jaccard >= MIN_JACCARD) matches.push([vi, o, jaccard]);
  }
}

matches.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
const groups = [];
for (const m of matches) {
  const g = groups.find(({ last: [a, b] }) => m[0] > a && m[0] - a <= MAX_STEP && m[1] > b && m[1] - b <= MAX_STEP);
  if (g) { g.pairs.push(m); g.last = [m[0], m[1]]; }
  else groups.push({ pairs: [m], last: [m[0], m[1]] });
}

const kept = groups.filter((g) => {
  const a = verses.get(g.pairs[0][0]), b = verses.get(g.pairs[0][1]);
  return g.pairs.length >= 3 || (g.pairs.length === 2 && workOf(a.book) !== workOf(b.book));
});
const span = (g, side) => [g.pairs[0][side], g.pairs.at(-1)[side]];
const inside = (inner, outer) => inner[0] >= outer[0] && inner[1] <= outer[1];
const passages = kept.filter((g) => !kept.some((o) => o !== g && o.pairs.length > g.pairs.length
  && inside(span(g, 0), span(o, 0)) && inside(span(g, 1), span(o, 1))));

function jaccardOf(x, y) {
  const a = verses.get(x).lexemes, b = verses.get(y).lexemes;
  let shared = 0;
  for (const l of a) if (b.has(l)) shared++;
  return shared / (a.size + b.size - shared);
}

// Step 6: between consecutive matched pairs, match the remaining verses greedily in order
for (const g of passages) {
  const filled = [g.pairs[0]];
  for (const next of g.pairs.slice(1)) {
    const prev = filled.at(-1);
    let j = prev[1] + 1;
    for (let i = prev[0] + 1; i < next[0]; i++) {
      let best = null;
      for (let k = j; k < next[1]; k++) {
        const s = jaccardOf(i, k);
        if (s >= GAP_JACCARD && (!best || s > best[1])) best = [k, s];
      }
      if (best) { filled.push([i, best[0], best[1]]); j = best[0] + 1; }
    }
    filled.push(next);
  }
  g.pairs = filled;
}

const ref = (vi) => { const v = verses.get(vi); return { book: v.book, chapter: v.chapter, verse: v.verse }; };
const cv = (vi) => { const v = verses.get(vi); return `${v.chapter}:${v.verse}`; };
const side = (g, i) => {
  const [s, e] = span(g, i);
  const start = ref(s), end = ref(e);
  return { book: start.book, start: [start.chapter, start.verse], end: [end.chapter, end.verse] };
};

const out = passages.map((g, i) => ({
  id: i + 1,
  a: side(g, 0),
  b: side(g, 1),
  pairs: g.pairs.map(([x, y, j]) => [cv(x), cv(y), Math.round(j * 100) / 100]),
}));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(out) + "\n");
console.log(`${matches.length} matching verse pairs → ${out.length} parallel passages → ${OUT_FILE}`);
