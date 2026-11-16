// One-time builder for data/who-said/who-said.json: the "מי אמר למי" quiz questions, found from
// the OSHB data by the speech formula rather than from a hand-made list.
//
// Run from the project root: node scripts/build-who-said.mjs   (--review prints every item)
//
// Method:
// 1. Formula: a finite form of אמר / דבר, then a name (the speaker), then אֶל + name or לְ + name
//    (the addressee): "וַיֹּאמֶר שָׁאוּל אֶל דָּוִד", "וַיְדַבֵּר מֹשֶׁה לְאַהֲרֹן". Also "וַיַּעַן X אֶת Y".
// 2. The quote is the rest of the verse, minus a following לֵאמֹר and an apposition on the addressee
//    (בְּנוֹ, הַנָּבִיא, בֶּן יִשַׁי). It ends where the narrative resumes: the next 3rd-person
//    wayyiqtol. That sometimes ends it early (a quote can tell a story), which only shortens it.
// 3. Ketiv words (unpointed) are dropped from the quote, keeping the qere.
// 4. Left out: quotes under 3 words, quotes naming the speaker or addressee, a second addressee
//    where the quote should start ("וּלְאֶלְעָזָר וּלְאִיתָמָר בָּנָיו"), repeated quotes (Kings and
//    Isaiah tell Hezekiah's story twice), and the items in EXCLUDE. TRIM cuts a quote to the
//    words that are speech. Both lists were made by reading every item (--review).
// 5. Divine speech is capped at DIVINE_PER_PAIR items per pair, spread across the books, so
//    "ה׳ אל משה" doesn't dominate.
// 6. Level from how often the less-named of the two appears in the Tanakh.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";

const DB_PATH = "prisma/dev.db";
const OUT_DIR = "data/who-said";
const OUT_FILE = `${OUT_DIR}/who-said.json`;
const REVIEW = process.argv.includes("--review");

const MIN_QUOTE = 3;
const DIVINE_PER_PAIR = 5;
const DIVINE = new Set(["3068", "3069"]);
const DIVINE_NAME = "ה׳";
// The less-named person of the pair: ≥ EASY occurrences → easy, ≥ MEDIUM → medium, else hard
const EASY = 100;
const MEDIUM = 35;
// Nouns that are a title in apposition to a name: נָבִיא, מֶלֶךְ, כֹּהֵן
const TITLES = new Set(["5030", "4428", "3548"]);
const SAME_PERSON = { 87: "85", 8297: "8283", 3129: "3083" }; // as in lib/characters.ts

// Checked by hand, with the reason
const EXCLUDE = {
  "Numbers 1:1": "the formula is followed by place and date, the speech is in the next verse",
  "Joshua 1:1": "apposition (מְשָׁרֵת מֹשֶׁה), the speech is in the next verse",
  "Joshua 4:8": "\"כַּאֲשֶׁר דִּבֶּר ה׳ אֶל יְהוֹשֻׁעַ\" — no quote follows",
  "Jeremiah 22:11": "\"אמר אל\" = said about",
  "Jeremiah 22:18": "\"אמר אל\" = said about",
  "Jeremiah 46:13": "\"הַדָּבָר אֲשֶׁר דִּבֶּר\" — a heading, not a quote",
  "Jeremiah 50:1": "a heading, and בָּבֶל is a place",
  "I Chronicles 21:9": "apposition (חֹזֵה דָוִיד), the speech is in the next verse",
  "II Samuel 24:17": "narration (בִּרְאֹתוֹ אֶת הַמַּלְאָךְ), the speech follows",
  "II Chronicles 6:8": "the parallel of I Kings 8:18, with the apposition אָבִי",
};

// Quotes cut by hand to the words that are speech: [first word, end] (end exclusive, optional)
const TRIM = {
  "Genesis 25:30": [0, 9], // the narrator: "עַל כֵּן קָרָא שְׁמוֹ אֱדוֹם"
  "Genesis 38:11": [0, 8], // the narrator: "כִּי אָמַר פֶּן יָמוּת גַּם הוּא"
  "I Samuel 14:18": [0, 3], // the narrator: "כִּי הָיָה אֲרוֹן הָאֱלֹהִים…"
  "I Samuel 30:7": [2], // apposition: "בֶּן אֲחִימֶלֶךְ"
  "I Kings 5:19": [2], // apposition and לֵאמֹר: "אָבִי לֵאמֹר"
  "I Kings 8:18": [1], // apposition: "אָבִי"
  "Job 42:7": [1], // apposition: "הַתֵּימָנִי"
};

const db = new DatabaseSync(DB_PATH);
const rows = db
  .prepare(`SELECT book, chapter, verse, verseIndex, wordNum, word, lemma, morph FROM WordEntry ORDER BY verseIndex, wordNum`)
  .all();

function parse(w) {
  const l = w.lemma.split("/");
  const m = w.morph.slice(1).split("/");
  const i = l.findIndex((s) => /^\d/.test(s.trim()));
  return {
    ...w,
    word: w.word.replace(/ֽ/g, ""),
    prefixes: l.slice(0, Math.max(i, 0)).map((s) => s.trim()),
    num: i < 0 ? null : l[i].trim().match(/^\d+/)[0],
    seg: m[i] ?? "",
    tail: m.slice(i + 1).join("/"),
  };
}

const verses = new Map();
const nameForms = new Map(); // Strong's → form → count (unprefixed names only)
const nameCounts = new Map();
for (const r of rows) {
  const w = parse(r);
  if (!verses.has(w.verseIndex)) verses.set(w.verseIndex, []);
  verses.get(w.verseIndex).push(w);
  if (w.seg.startsWith("Np")) {
    nameCounts.set(w.num, (nameCounts.get(w.num) ?? 0) + 1);
    if (!w.prefixes.length && /[ְ-ּ]/.test(w.word)) {
      const forms = nameForms.get(w.num) ?? new Map();
      forms.set(w.word, (forms.get(w.word) ?? 0) + 1);
      nameForms.set(w.num, forms);
    }
  }
}

const personCounts = new Map();
for (const [num, n] of nameCounts) personCounts.set(SAME_PERSON[num] ?? num, (personCounts.get(SAME_PERSON[num] ?? num) ?? 0) + n);

const nameOf = (num) =>
  DIVINE.has(num) ? DIVINE_NAME : [...(nameForms.get(num) ?? new Map())].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "?";
const personOf = (num) => SAME_PERSON[num] ?? num;
const isName = (w) => w?.seg.startsWith("Np") && w.prefixes.length === 0;
const isSpeech = (w) => (w.num === "559" || w.num === "1696") && w.seg.startsWith("V") && w.seg[2] !== "c" && w.seg[2] !== "a";
const isLemor = (w) => w?.num === "559" && w.seg[2] === "c";
const isWayyiqtol3 = (w) => /^V.w3/.test(w.seg);

function formulaAt(ws, i) {
  const v = ws[i];
  if (isSpeech(v) && isName(ws[i + 1])) {
    if (ws[i + 2]?.num === "413" && isName(ws[i + 3])) return { s: ws[i + 1], a: ws[i + 3], end: i + 4 };
    if (ws[i + 2]?.prefixes.join() === "l" && ws[i + 2].seg.startsWith("Np")) return { s: ws[i + 1], a: ws[i + 2], end: i + 3 };
  }
  if (v.num === "6030" && isName(ws[i + 1]) && ws[i + 2]?.num === "853" && isName(ws[i + 3])) {
    return { s: ws[i + 1], a: ws[i + 3], end: ws[i + 4]?.num === "559" ? i + 5 : i + 4 };
  }
  return null;
}

function quoteAfter(ws, end) {
  let rest = ws.slice(end);
  if (isLemor(rest[0])) rest = rest.slice(1);
  if (rest[0]?.seg.startsWith("Nc") && (/Sp3/.test(rest[0].tail) || (TITLES.has(rest[0].num) && rest[0].prefixes.includes("d")))) {
    rest = rest.slice(1);
  } else if (rest[0]?.num === "1121" && isName(rest[1])) {
    rest = rest.slice(2); // בֶּן יִשַׁי
  }
  if (isLemor(rest[0])) rest = rest.slice(1);
  // "וְאֶל לֵוִי", "וּלְאֶלְעָזָר": the formula names a second addressee
  if (rest[0]?.prefixes.includes("c") && (rest[0].num === "413" || rest[0].prefixes.includes("l"))) return null;
  const cut = rest.findIndex(isWayyiqtol3);
  return (cut >= 0 ? rest.slice(0, cut) : rest).filter((w) => /[ְ-ּ]/.test(w.word));
}

const candidates = [];
for (const ws of verses.values()) {
  for (let i = 0; i + 2 < ws.length; i++) {
    const f = formulaAt(ws, i);
    if (!f) continue;
    const { book, chapter, verse, verseIndex } = ws[i];
    const ref = `${book} ${chapter}:${verse}`;
    let quote = quoteAfter(ws, f.end);
    if (!quote) continue;
    if (TRIM[ref]) quote = quote.slice(...TRIM[ref]);
    const people = new Set([personOf(f.s.num), personOf(f.a.num)]);
    candidates.push({
      ref,
      book,
      chapter,
      verse,
      verseIndex,
      speaker: f.s.num,
      addressee: f.a.num,
      quote: quote.map((w) => w.word).join(" "),
      ok: quote.length >= MIN_QUOTE && !quote.some((w) => people.has(personOf(w.num))),
    });
  }
}

// Divine speech: keep DIVINE_PER_PAIR per pair, evenly spaced through the Tanakh
const kept = [];
const divineByPair = new Map();
const seen = new Set();
for (const c of candidates.filter((c) => c.ok && !EXCLUDE[c.ref])) {
  const key = `${personOf(c.speaker)}>${personOf(c.addressee)}>${c.quote.replace(/[֑-ׇ]/g, "")}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!DIVINE.has(c.speaker) && !DIVINE.has(c.addressee)) {
    kept.push(c);
    continue;
  }
  const k = `${c.speaker}>${c.addressee}`;
  divineByPair.set(k, [...(divineByPair.get(k) ?? []), c]);
}
for (const list of divineByPair.values()) {
  const n = Math.min(DIVINE_PER_PAIR, list.length);
  for (let j = 0; j < n; j++) kept.push(list[Math.floor((j * list.length) / n)]);
}

const level = (c) => {
  const count = (num) => (DIVINE.has(num) ? Infinity : personCounts.get(personOf(num)) ?? 0);
  const min = Math.min(count(c.speaker), count(c.addressee));
  return min >= EASY ? "easy" : min >= MEDIUM ? "medium" : "hard";
};

const items = kept
  .sort((a, b) => a.verseIndex - b.verseIndex)
  .map((c) => ({
    book: c.book,
    chapter: c.chapter,
    verse: c.verse,
    speaker: personOf(c.speaker),
    addressee: personOf(c.addressee),
    quote: c.quote,
    level: level(c),
  }));

const people = {};
for (const it of items) for (const n of [it.speaker, it.addressee]) people[n] ??= nameOf(n);

if (REVIEW) {
  for (const it of items) console.log(`${it.book} ${it.chapter}:${it.verse} | ${it.level} | ${people[it.speaker]} → ${people[it.addressee]} | ${it.quote}`);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify({ people, items }, null, 1) + "\n");
const byLevel = items.reduce((acc, it) => ({ ...acc, [it.level]: (acc[it.level] ?? 0) + 1 }), {});
console.log(`${items.length} items (${JSON.stringify(byLevel)}), ${Object.keys(people).length} people → ${OUT_FILE}`);
