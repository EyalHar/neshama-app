// One-time builder for data/noun-patterns/noun-patterns.json: maps every Hebrew common noun
// (by Strong's number) to its noun pattern (mishkal), following Gesenius' Hebrew Grammar §84–86.
//
// Run from the project root: node scripts/build-noun-patterns.mjs
//
// Method:
// 1. Base form — the noun's most frequent singular absolute form in the OSHB text, without
//    prefixes or suffixes and not in pause (no atnach, not the verse's last word). Falls back to
//    Strong's lemmaHe, whose vocalization is less reliable.
// 2. Root — the single three-letter entry in Strong's derivedFrom.
// 3. Skeleton — the root letters are replaced by ק־ט־ל, keeping the vowels. Matres lectionis are
//    folded into the vowel before them (וֹ→ֹ, וּ→ֻ, ִי→ִ) so plene and defective spellings agree,
//    a dagesh lene on a root letter is dropped, hataf vowels on a root letter become shva, a
//    furtive patach and a final shva are dropped, and qamats qatan is written as qamats.
// 4. Mishkal — the skeleton is looked up in a table of Gesenius' patterns. Weak roots change the
//    surface form, so a weak-root noun is classified only when it keeps all three root letters
//    as consonants (פ״נ, פ״י, ע״ע); otherwise only the skeleton is recorded. A noun with no root
//    in Strong's whose form has exactly three consonants gets them as an assumed root.
// Each noun's `formSource` says whether its form came from the text or from Strong's.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  DAGESH, HOLAM, QUBUTS, HIRIQ, nfc, baseLetter, clusters, foldMatres, classify, rootType, plainRoot,
  collectLemmas, loadStrongs, topForm,
} from "./lib/mishkal.mjs";

const DB_PATH = "prisma/dev.db";
const OUT_DIR = "data/noun-patterns";
const OUT_FILE = `${OUT_DIR}/noun-patterns.json`;

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const strongs = loadStrongs(db);
const nouns = collectLemmas(db, (code) => code.startsWith("Nc"), (code) => code[3] === "s" && code[4] === "a");

const entries = [];
for (const [number, noun] of nouns) {
  const s = strongs.get(number);
  const entry = { strongs: number, lemma: s?.lemmaHe ?? null, tokens: noun.tokens };

  const textForm = topForm(noun);
  entry.form = textForm ?? (s?.lemmaHe ? nfc(s.lemmaHe) : null);
  entry.formSource = textForm ? "text" : s?.lemmaHe ? "strongs" : null;

  const roots = (s?.derivedFrom ?? "").split(",").map((d) => d.trim()).filter((d) => strongs.has(d));
  const threeLetter = [...new Set(roots.filter((d) => plainRoot(strongs.get(d).lemmaPlain).length === 3))];

  if (!entry.form) entry.status = "no-form";
  else if (threeLetter.length === 0) {
    // No root in Strong's: when the form has exactly three consonants besides vowel letters,
    // assume those are the root (אֶרֶץ, זָהָב) and classify under a separate status. A final ה
    // without mappiq, or ־וֹת/־וּת/־ִית, is a feminine ending or vowel letter, not a root letter
    const cls = foldMatres(clusters(entry.form));
    const consonants = cls.map((c) => baseLetter(c.letter));
    const [prev, last] = cls.slice(-2);
    const femEnding = (last?.letter === "ה" && !last.marks.has(DAGESH))
      || (last?.letter === "ת" && [HOLAM, QUBUTS, HIRIQ].some((v) => prev?.marks.has(v)));
    const assumed = consonants.length === 3 && !femEnding && !consonants.some((c) => c === "ו" || c === "י") ? consonants.join("") : null;
    const { pattern, match } = assumed ? classify(entry.form, assumed) : {};
    if (match) {
      entry.status = "assumed-root";
      entry.root = assumed;
      entry.pattern = pattern;
      Object.assign(entry, match);
    } else entry.status = "no-root";
  } else if (threeLetter.length > 1) {
    entry.status = "ambiguous-root";
    entry.rootCandidates = threeLetter.map((d) => plainRoot(strongs.get(d).lemmaPlain));
  } else {
    const root = plainRoot(strongs.get(threeLetter[0]).lemmaPlain);
    entry.root = root;
    entry.rootStrongs = threeLetter[0];
    entry.rootType = rootType(root);
    const { pattern, match } = classify(entry.form, root);
    entry.pattern = pattern;
    // A פ״נ, פ״י or ע״ע noun that keeps all three root letters (נֶפֶשׁ, יֶלֶד, לֵבָב) has the
    // strong form; ע״ו/ע״י and ל״ה roots turn a root letter into a vowel letter, so they stay out
    const weakButWhole = ["פ״נ", "פ״י", "ע״ע"].includes(entry.rootType) && match;
    if (entry.rootType !== "שלם" && !weakButWhole) entry.status = "weak-root";
    else if (!pattern) entry.status = "root-not-in-form";
    else if (!match) entry.status = "unmatched";
    else {
      entry.status = "classified";
      Object.assign(entry, match);
    }
  }
  entries.push(entry);
}
entries.sort((a, b) => b.tokens - a.tokens);

const totalTokens = entries.reduce((n, e) => n + e.tokens, 0);
const byStatus = {};
for (const e of entries) {
  const s = (byStatus[e.status] ??= { nouns: 0, tokens: 0 });
  s.nouns++;
  s.tokens += e.tokens;
}
for (const s of Object.values(byStatus)) {
  s.nounsPct = Math.round((1000 * s.nouns) / entries.length) / 10;
  s.tokensPct = Math.round((1000 * s.tokens) / totalTokens) / 10;
}
const byMishkal = {};
for (const e of entries) {
  if (e.status !== "classified" && e.status !== "assumed-root") continue;
  const m = (byMishkal[e.mishkal] ??= { gesenius: e.gesenius, nouns: 0, tokens: 0, examples: [] });
  m.nouns++;
  m.tokens += e.tokens;
  if (m.examples.length < 5) m.examples.push(e.form);
}

const output = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: "OSHB morphology + Strong's (prisma/dev.db); patterns per Gesenius' Hebrew Grammar §84–86",
  statuses: {
    classified: "Strong root (or פ״נ/פ״י/ע״ע keeping all root letters), skeleton matches a Gesenius pattern",
    "assumed-root": "No root in Strong's; the form's three consonants were taken as the root and the skeleton matches a Gesenius pattern",
    "weak-root": "Weak root (ע״ו/ע״י, ל״ה, or פ״נ/פ״י/ע״ע missing a root letter): skeleton recorded, not classified yet",
    unmatched: "Strong root, but the skeleton matches no pattern in the table",
    "root-not-in-form": "The root letters don't appear in order in the form",
    "no-root": "No three-letter root in Strong's derivedFrom",
    "ambiguous-root": "More than one three-letter root in derivedFrom",
    "no-form": "No usable form",
  },
  summary: { nouns: entries.length, tokens: totalTokens, byStatus, byMishkal },
  nouns: entries,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(output, null, 1) + "\n");
console.log(`Wrote ${OUT_FILE}: ${entries.length} nouns`);
console.log(JSON.stringify(byStatus, null, 1));
