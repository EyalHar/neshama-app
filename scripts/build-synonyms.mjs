// Builds data/synonyms/synonyms.json: for each pair of synonyms (a closed, checked list), how often each
// word is used in every book and every chapter of the Tanakh, and whether the choice between them
// differs mostly BETWEEN books or WITHIN them. Hebrew only (Aramaic words have their own Strong's
// entries). Run: node scripts/build-synonyms.mjs   (reads prisma/dev.db, read-only)
//
// Data only, no claims from the literature (the user's decision). Pairs of names (חֹרֵב/סִינַי,
// יהוה/אֱלֹהִים) and spellings (דָּוִד/דָּוִיד) are left out on purpose. A pair is kept only with 40+
// occurrences in all and 8+ of the rarer word.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";

const db = new DatabaseSync("prisma/dev.db", { readOnly: true });
const BOOKS = db.prepare("SELECT book, MIN(verseIndex) i FROM VerseText GROUP BY book ORDER BY i").all().map((r) => r.book);

// Main word of a WordEntry: its Strong's number and the morph segments after it (suffixes)
function parse(r) {
  const lp = r.lemma.split("/"), mp = r.morph.slice(1).split("/");
  const i = lp.findIndex((s) => /^\d/.test(s.trim()));
  if (i < 0) return null;
  return { num: lp[i].trim().match(/^\d+/)[0], rest: mp.slice(i + 1), prefixes: lp.slice(0, i).map((s) => s.trim()) };
}
const hebrew = (r) => r.morph[0] === "H";
const num = (...ns) => (r, p) => hebrew(r) && p && ns.includes(p.num);
// OSHB tags pausal אִתָּךְ / עִמָּךְ said to a man (Noah, Jacob) as feminine: count 2nd singular of both genders
const with2sg = (n) => (r, p) => hebrew(r) && p?.num === n && p.rest.some((s) => /^Sp2[mf]s/.test(s));
const relativeShe = (r) => hebrew(r) && r.lemma.split("/").some((s) => s.trim() === "s");

const PAIRS = [
  {
    id: "itcha-imcha",
    a: { label: "אִתְּךָ", gloss: "אֵת + ־ךָ" },
    b: { label: "עִמְּךָ", gloss: "עִם + ־ךָ" },
    title: "״אִתְּךָ״ ו״עִמְּךָ״",
    note: "״עִמְּךָ״ ו״אִתְּךָ״ (וגם אִתָּךְ / עִמָּךְ בהפסק), בגוף שני יחיד.",
    A: with2sg("854"),
    B: with2sg("5973"),
  },
  { id: "et-im", a: { label: "אֵת", gloss: "״עם״, עם או בלי כינוי" }, b: { label: "עִם", gloss: "" }, title: "אֵת ועִם (במשמעות ״עם״)", note: "מילת היחס אֵת (Strong's 854), לא אֶת של המושא.", A: num("854"), B: num("5973") },
  { id: "anochi-ani", a: { label: "אָנֹכִי", gloss: "" }, b: { label: "אֲנִי", gloss: "" }, title: "אָנֹכִי ואֲנִי", A: num("595"), B: num("589") },
  {
    id: "hem-hema",
    a: { label: "הֵם", gloss: "" },
    b: { label: "הֵמָּה", gloss: "" },
    title: "הֵם והֵמָּה",
    note: "אותו ערך מילוני בשתי צורות, הקצרה והארוכה.",
    A: (r, p) => hebrew(r) && p?.num === "1992" && !/המה$/.test(r.plain),
    B: (r, p) => hebrew(r) && p?.num === "1992" && /המה$/.test(r.plain),
  },
  { id: "asher-she", a: { label: "אֲשֶׁר", gloss: "" }, b: { label: "שֶׁ־", gloss: "כתחילית" }, title: "אֲשֶׁר ושֶׁ־", note: "מילת הזיקה, כמילה נפרדת או כתחילית (״שֶׁבָּא״).", A: num("834"), B: relativeShe },
  { id: "mamlacha-malchut", a: { label: "מַמְלָכָה", gloss: "" }, b: { label: "מַלְכוּת", gloss: "" }, title: "מַמְלָכָה ומַלְכוּת", A: num("4467"), B: num("4438") },
  { id: "shifcha-ama", a: { label: "שִׁפְחָה", gloss: "" }, b: { label: "אָמָה", gloss: "" }, title: "שִׁפְחָה ואָמָה", A: num("8198"), B: num("519") },
  { id: "lev-levav", a: { label: "לֵב", gloss: "" }, b: { label: "לֵבָב", gloss: "" }, title: "לֵב ולֵבָב", A: num("3820"), B: num("3824") },
  { id: "zaak-tzaak", a: { label: "זָעַק", gloss: "" }, b: { label: "צָעַק", gloss: "" }, title: "זָעַק וצָעַק", note: "כל צורות שני הפעלים.", A: num("2199"), B: num("6817") },
  { id: "bikesh-darash", a: { label: "בִּקֵּשׁ", gloss: "" }, b: { label: "דָּרַשׁ", gloss: "" }, title: "בִּקֵּשׁ ודָרַשׁ", note: "המשמעויות חופפות רק בחלקן: ״דָּרַשׁ״ הוא גם לפנות אל ה׳ ולשאול בו.", A: num("1245"), B: num("1875") },
  { id: "davar-mila", a: { label: "דָּבָר", gloss: "" }, b: { label: "מִלָּה", gloss: "" }, title: "דָּבָר ומִלָּה", note: "״דָּבָר״ הוא גם ״עניין״, ולכן הוא נפוץ ממילא; מעניין בעיקר היכן מופיעה ״מִלָּה״.", A: num("1697"), B: num("4405") },
  { id: "shesh-butz", a: { label: "שֵׁשׁ", gloss: "בד" }, b: { label: "בּוּץ", gloss: "" }, title: "שֵׁשׁ ובּוּץ (פשתן לבן)", note: "שֵׁשׁ במשמעות בד (Strong's 8336), לא המספר.", A: num("8336"), B: num("948") },
];

// Wilson score interval for a share k/n
function wilson(k, n) {
  if (!n) return [0, 1];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n, c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
// Cramér's V of a 2-column table (rows: books or chapters)
function cramerV(cells) {
  const live = cells.filter(([a, b]) => a + b > 0);
  const A = live.reduce((s, c) => s + c[0], 0), B = live.reduce((s, c) => s + c[1], 0), N = A + B;
  if (!N || !A || !B || live.length < 2) return null;
  let chi = 0;
  for (const [a, b] of live) {
    const n = a + b, ea = (n * A) / N, eb = (n * B) / N;
    chi += (a - ea) ** 2 / ea + (b - eb) ** 2 / eb;
  }
  return Math.sqrt(chi / N);
}
// Seeded shuffle: the same table, words dealt at random to the same row sizes (no real preference)
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
function shuffled(cells) {
  const labels = cells.flatMap(([a, b]) => [...Array(a).fill(0), ...Array(b).fill(1)]);
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  let k = 0;
  return cells.map(([a, b]) => {
    const n = a + b, part = labels.slice(k, (k += n));
    const x = part.filter((v) => v === 0).length;
    return [x, n - x];
  });
}
const RUNS = 400;
function versusChance(cells) {
  const V = cramerV(cells);
  if (V === null) return null;
  let sum = 0, atLeast = 0;
  for (let r = 0; r < RUNS; r++) {
    const v = cramerV(shuffled(cells)) ?? 0;
    sum += v;
    if (v >= V) atLeast++;
  }
  return { v: +V.toFixed(3), chance: +(sum / RUNS).toFixed(3), p: +((atLeast + 1) / (RUNS + 1)).toFixed(4) };
}

const rows = db.prepare("SELECT book, chapter, verse, wordNum, lemma, morph, plain FROM WordEntry ORDER BY verseIndex, wordNum").all();
const MIN_BOOK = 10; // a book's share is shown faded below this
const MIN_WITHIN = 30; // chapter clustering is tested only in books with this many and both words

const out = [];
for (const pair of PAIRS) {
  const perBook = new Map(), perChapter = new Map(), samples = new Map();
  for (const r of rows) {
    const p = parse(r);
    const side = pair.A(r, p) ? 0 : pair.B(r, p) ? 1 : -1;
    if (side < 0) continue;
    const b = perBook.get(r.book) ?? [0, 0];
    b[side]++;
    perBook.set(r.book, b);
    const ch = perChapter.get(r.book) ?? new Map();
    const c = ch.get(r.chapter) ?? [0, 0];
    c[side]++;
    ch.set(r.chapter, c);
    perChapter.set(r.book, ch);
    // every occurrence's place, to pick a nearby verse of each word per book
    const s = samples.get(r.book) ?? [[], []];
    s[side].push([r.chapter, r.verse, r.wordNum - 1]);
    samples.set(r.book, s);
  }
  const books = BOOKS.filter((b) => perBook.has(b)).map((book) => {
    const [a, b] = perBook.get(book), n = a + b, [lo, hi] = wilson(a, n);
    const chapters = [...perChapter.get(book)].sort((x, y) => x[0] - y[0]).map(([c, [ca, cb]]) => [c, ca, cb]);
    // Same book, both words: the closest pair of occurrences (by chapter, then verse)
    let example = null;
    const [sa, sb] = samples.get(book);
    if (sa.length && sb.length) {
      let best = Infinity;
      for (const x of sa) for (const y of sb) {
        const d = Math.abs(x[0] - y[0]) * 1000 + Math.abs(x[1] - y[1]);
        if (d > 0 && d < best) {
          best = d;
          example = { a: x, b: y };
        }
      }
    }
    return { book, a, b, lo: +lo.toFixed(3), hi: +hi.toFixed(3), chapters, example };
  });
  const between = versusChance(books.map((x) => [x.a, x.b]));
  const within = books
    .filter((x) => x.a + x.b >= MIN_WITHIN && x.a && x.b)
    .map((x) => ({ book: x.book, ...versusChance(x.chapters.map(([, a, b]) => [a, b])) }))
    .filter((x) => x.v !== undefined);
  const big = books.filter((x) => x.a + x.b >= MIN_BOOK);
  const usesBoth = big.filter((x) => Math.min(x.a, x.b) / (x.a + x.b) >= 0.1).length;
  out.push({
    id: pair.id,
    title: pair.title,
    note: pair.note,
    a: pair.a,
    b: pair.b,
    total: [books.reduce((s, x) => s + x.a, 0), books.reduce((s, x) => s + x.b, 0)],
    books,
    between,
    within,
    bigBooks: big.length,
    usesBoth,
  });
  console.log(`${pair.id}: ${out.at(-1).total.join("/")} | between V ${between?.v} (chance ${between?.chance}, p ${between?.p}) | both in ${usesBoth}/${big.length} | clustered within: ${within.filter((w) => w.p < 0.05).map((w) => w.book).join(", ") || "—"}`);
}

mkdirSync("data/synonyms", { recursive: true });
writeFileSync("data/synonyms/synonyms.json", JSON.stringify({ minBook: MIN_BOOK, minWithin: MIN_WITHIN, runs: RUNS, pairs: out }));
console.log("wrote data/synonyms/synonyms.json");
