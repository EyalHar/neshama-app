// Builds data/mitzvot/chinukh.json: the 613 mitzvot of Sefer HaChinukh, each with the verse it is
// learned from and the words of the verse it quotes, for the reader's "mitzvot" setting.
// Run: node scripts/build-mitzvot.mjs [cacheDir]   (Sefaria responses are cached outside the project)
//
// Source: Sefaria's "Sefaria Vocalized Edition" of Sefer HaChinukh (CC0). Each mitzvah's first
// paragraph names it ("מצות פריה ורביה – …") and cites its verse: "שנאמר: (בראשית א כח) וַיְבָרֶךְ …".
// The citation and the quoted words are read from that paragraph; Sefaria's links give the Rambam
// (Sefer HaMitzvot) number and positive/negative (248 / 365), and the Semag number.
//
// The quote is checked against the reader's own text (Sefaria, whose verse numbers Chinukh follows):
// the cited verse must hold the quote's first words in order (letters only, plene/defective alike,
// the Name's abbreviations read as יהוה). When it doesn't: the same words in one other verse of the
// chapter (a wrong number), then in one verse of the Torah; then Sefaria's link (whole verse); and
// OVERRIDES, read by hand with their source, for mitzvot whose paragraph cites no verse of their own.
// The script prints every mitzvah not located by its cited verse, for review.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = process.argv[2] ?? path.join(os.tmpdir(), "neshama-mitzvot");
fs.mkdirSync(CACHE, { recursive: true });
const { TANAKH_BOOKS } = await import(pathToFileURL(path.join(ROOT, "lib/tanakh.ts")).href);
const db = new DatabaseSync(path.join(ROOT, "prisma/dev.db"), { readOnly: true });

const TORAH = TANAKH_BOOKS.filter((b) => b.section === "תורה");
const BOOK_BY_HE = new Map(TORAH.map((b) => [b.he, b.id]));
const LETTER_VALUE = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90, ק: 100, ר: 200, ש: 300, ת: 400, ך: 20, ם: 40, ן: 50, ף: 80, ץ: 90 };
const hebNum = (s) => [...s.replace(/[^א-ת]/g, "")].reduce((n, c) => n + (LETTER_VALUE[c] ?? 0), 0);
// Letters and spaces only. Sefaria's {פ}/{ס} section marks and &nbsp; go first; maqaf, paseq and
// punctuation separate words; anything else (nikud, accents, the U+034F joiner MAM puts inside words)
// is deleted without splitting the word.
const plain = (s) =>
  s
    .replace(/<span class="mam-spi-[^"]*">.*?<\/span>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[־׀|,.;:!?"'()[\]–\-]/g, " ")
    .replace(/[^א-ת\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const FINAL = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const fold = (s) => s.replace(/[ךםןףץ]/g, (c) => FINAL[c]);
// Compared without ו/י after the first letter, so plene and defective spellings agree (עולה / עֹלָה)
const skeleton = (w) => (w.length <= 2 ? w : w[0] + w.slice(1).replace(/[וי]/g, ""));

async function cached(name, url) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      fs.writeFileSync(file, JSON.stringify(data));
      return data;
    }
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  throw new Error(`fetch failed: ${url}`);
}

// The reader's text of a chapter (the same Sefaria endpoint lib/tanakh.ts uses), as letters only per
// verse: version notes removed, finals folded. Chinukh's verse numbers follow Sefaria's (e.g. the
// Decalogue: "לא תרצח … לא תנאף" is one verse, Exodus 20:13), so quotes are checked against this text.
const chapterCache = new Map();
async function chapterWords(book, chapter) {
  const key = `${book}.${chapter}`;
  if (!chapterCache.has(key)) {
    const d = await cached(`t-${key}.json`, `https://www.sefaria.org/api/texts/${encodeURIComponent(key)}?lang=he&context=0`);
    const verses = (d.he ?? []).map((v) => fold(plain(v.replace(/<sup[^>]*>.*?<\/sup>\s*<i class="footnote">.*?<\/i>/g, ""))).split(" ").filter(Boolean));
    chapterCache.set(key, verses);
  }
  return chapterCache.get(key);
}

// The quote's words, the Name's abbreviations (ה׳, יי, השם) read as יהוה
const quoteWords = (quote) => fold(quote).split(" ").filter(Boolean).map((w) => (/^(ה|יי|השם)$/.test(w) ? "יהוה" : w));

// The longest run of the quote's first words found consecutively in a verse (a verse word may carry up
// to two more letters, e.g. a prefix the quote dropped); a single word only when 3+ letters and unique
function matchIn(verse, qw) {
  // A verse word may carry up to two more prefix letters than the quote (פטר / וכל־פטר), or the
  // quote one more (ופטר / פטר); spellings compared by skeleton
  const same = (v, w) => {
    const a = skeleton(v), b = skeleton(w);
    return a === b || (b.length >= 2 && a.endsWith(b) && a.length - b.length <= 2) || (a.length >= 2 && b.endsWith(a) && b.length - a.length === 1);
  };
  for (let len = qw.length; len >= 1; len--) {
    const want = qw.slice(0, len);
    const hits = [];
    for (let i = 0; i + len <= verse.length; i++) if (want.every((w, j) => same(verse[i + j], w))) hits.push(i);
    if (hits.length && (len >= 2 || (want[0].length >= 3 && hits.length === 1))) {
      return { at: hits[0], len, words: verse.slice(hits[0], hits[0] + len).join(" ") };
    }
  }
  return null;
}

// Citations in the first paragraph: "(book chapter verse)", and the words after each
function citations(par) {
  const text = par.replace(/<[^>]+>/g, "");
  const found = [];
  for (const m of text.matchAll(/\(([^()]{3,40})\)/g)) {
    const parts = m[1].replace(/[,:–]/g, " ").replace(/-\S*/g, "").trim().split(/\s+/);
    const book = BOOK_BY_HE.get(parts[0]);
    if (!book || parts.length < 3) continue;
    const chapter = hebNum(parts[1]), verse = hebNum(parts[2]);
    if (!chapter || !verse) continue;
    const after = text.slice(m.index + m[0].length);
    found.push({ book, chapter, verse, quote: plain(after.split(/[.:;]|\s[–-]\s|וְגוֹ|וגו|\(/)[0]) });
  }
  return found;
}

// "שנאמר <quote>" without a reference
function bareQuote(par) {
  const text = par.replace(/<[^>]+>/g, "").replace(/\([^()]*\)/g, " ");
  const m = /(?:שֶׁנֶּאֱמַר|שנאמר|דִּכְתִיב|דכתיב|שֶׁכָּתוּב)\s*:?\s*([^.:;]+)/.exec(text);
  return m ? plain(m[1].split(/וְגוֹ|וגו/)[0]) : null;
}

// Where a quote is when its reference is missing or wrong: the one Torah verse of VerseText holding
// its first 3+ words (none when several do)
const allTorah = db
  .prepare("SELECT book, chapter, verse, plainText FROM VerseText WHERE book IN ('Genesis','Exodus','Leviticus','Numbers','Deuteronomy')")
  .all()
  .map((r) => ({ ...r, words: fold(r.plainText).split(" ") }));
function findInTorah(qw) {
  for (let len = Math.min(qw.length, 6); len >= 3; len--) {
    const hits = allTorah.filter((r) => {
      const m = matchIn(r.words, qw.slice(0, len));
      return m && m.len === len;
    });
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return null;
  }
  return null;
}

function linkNumber(links, prefix) {
  const l = links.find((x) => x.ref.startsWith(prefix));
  if (!l) return null;
  const m = /(Positive|Negative) Commandments,? (\d+)/.exec(l.ref);
  return m ? { type: m[1] === "Positive" ? "aseh" : "lav", n: Number(m[2]) } : null;
}

// Sefaria's link from the mitzvah's first paragraph to a Torah verse
function linkedVerse(links, n) {
  const l = links.find(
    (x) => x.category === "Tanakh" && x.anchorRef === `Sefer HaChinukh ${n}:1` && /^(Genesis|Exodus|Leviticus|Numbers|Deuteronomy) \d+:\d+$/.test(x.ref)
  );
  if (!l) return null;
  const [, book, c, v] = /^(\S+) (\d+):(\d+)$/.exec(l.ref);
  return { book, chapter: Number(c), verse: Number(v) };
}

// Read by hand where the first paragraph cites no verse of the mitzvah itself (or Sefaria's link is
// off). Each follows a named source, and its words are checked against the verse like the rest.
const OVERRIDES = {
  70: { ref: ["Exodus", 22, 27], quote: "אלהים לא תקלל", basis: "Rambam, Sefer HaMitzvot, Negative 60" },
  87: { ref: ["Exodus", 23, 13], quote: "ולא ישמע על פיך", basis: "Rambam, Sefer HaMitzvot, Negative 15 (Mekhilta)" },
  129: { ref: ["Leviticus", 5, 21], quote: "נפש כי תחטא ומעלה מעל ביהוה", basis: "Sefer HaChinukh 129, later in the mitzvah" },
  195: { ref: ["Leviticus", 18, 17], quote: "שארה הנה", basis: "Sefer HaChinukh 195: learned from שארה הנה (Lev 18:17)" },
  336: { ref: ["Leviticus", 25, 14], quote: "או קנה מיד עמיתך", basis: "Sefer HaChinukh 336, later in the mitzvah; Rambam, Positive 245" },
  430: { ref: ["Deuteronomy", 8, 10], quote: "ואכלת ושבעת וברכת את יהוה אלהיך", basis: "Rambam, Sefer HaMitzvot, Positive 19" },
  514: { ref: ["Deuteronomy", 18, 11], quote: "ושאל אוב וידעני", basis: "Rambam, Sefer HaMitzvot, Negative 37 (לא ימצא בך … וידעוני)" },
  527: { ref: ["Deuteronomy", 20, 10], quote: "וקראת אליה לשלום", basis: "the verse that commands calling for peace (Rambam, Positive 190, cites the next verses)" },
};
// 487: "לא תוכל לזבח את הפסח באחד שעריך" (Deut 16:5), no Sefer HaMitzvot link. 581: Sefaria links it
// to the next mitzvah (Positive 214, rejoicing with his wife); it is Negative 311. That makes 248 / 365.
const TYPE_OVERRIDES = { 487: { type: "lav" }, 581: { type: "lav", rambam: 311 } };
// Names whose paragraph opens with the parasha's heading instead
const NAME_OVERRIDES = { 24: "שלא נלך בשבת חוץ לתחום" };

const out = [], problems = [], notes = [];
for (let n = 1; n <= 613; n++) {
  const text = await cached(`c${n}.json`, `https://www.sefaria.org/api/v3/texts/Sefer_HaChinukh.${n}?version=hebrew`);
  const links = await cached(`l${n}.json`, `https://www.sefaria.org/api/links/Sefer_HaChinukh.${n}?with_text=0`);
  const par = [text.versions?.[0]?.text].flat(9)[0] ?? "";
  const name = plain(par.split(/\s[–-]\s/)[0]);
  const rambam = linkNumber(links, "Sefer HaMitzvot, ");
  const semag = linkNumber(links, "Sefer Mitzvot Gadol, ");
  const entry = { n, name, type: rambam?.type ?? null, rambam: rambam?.n ?? null, semag, ref: null, words: null, how: null };

  // 1. a cited verse holding the quote; 2. the quote elsewhere in the cited chapter (one verse);
  // 3. the quote anywhere in the Torah (one verse); 4. Sefaria's link, the whole verse
  const tries = citations(par);
  for (const c of tries) {
    const words = await chapterWords(c.book, c.chapter);
    const qw = quoteWords(c.quote);
    const v = words[c.verse - 1];
    const m = v && qw.length ? matchIn(v, qw) : null;
    if (m) {
      entry.ref = [c.book, c.chapter, c.verse];
      entry.words = m.words;
      entry.how = "cited";
      break;
    }
    const inChapter = qw.length >= 3 ? words.map((w, i) => ({ i, m: matchIn(w, qw) })).filter((x) => x.m && x.m.len >= 3) : [];
    if (inChapter.length === 1) {
      entry.ref = [c.book, c.chapter, inChapter[0].i + 1];
      entry.words = inChapter[0].m.words;
      entry.how = "chapter";
      notes.push(`${n} ${name}: cited ${c.chapter}:${c.verse}, words found in ${c.chapter}:${inChapter[0].i + 1}`);
      break;
    }
  }
  if (!entry.ref) {
    const q = tries[0]?.quote ?? bareQuote(par);
    const hit = q ? findInTorah(quoteWords(q)) : null;
    if (hit) {
      const words = await chapterWords(hit.book, hit.chapter);
      const m = matchIn(words[hit.verse - 1] ?? [], quoteWords(q));
      entry.ref = [hit.book, hit.chapter, hit.verse];
      entry.words = m?.words ?? null;
      entry.how = "search";
      notes.push(`${n} ${name}: ${tries[0] ? `cited ${tries[0].book} ${tries[0].chapter}:${tries[0].verse}, ` : ""}quote found in ${hit.book} ${hit.chapter}:${hit.verse}`);
    }
  }
  if (!entry.ref) {
    const l = linkedVerse(links, n);
    if (l) {
      entry.ref = [l.book, l.chapter, l.verse];
      entry.how = "link";
      notes.push(`${n} ${name}: whole verse from Sefaria's link, ${l.book} ${l.chapter}:${l.verse}`);
    }
  }
  const o = OVERRIDES[n];
  if (o) {
    const words = await chapterWords(o.ref[0], o.ref[1]);
    const m = matchIn(words[o.ref[2] - 1] ?? [], quoteWords(o.quote));
    if (!m || m.len !== quoteWords(o.quote).length) problems.push(`${n} ${name}: override words not in ${o.ref.join(" ")}`);
    else {
      entry.ref = o.ref;
      entry.words = m.words;
      entry.how = "override";
      entry.basis = o.basis;
    }
  }
  if (TYPE_OVERRIDES[n]) Object.assign(entry, TYPE_OVERRIDES[n]);
  if (NAME_OVERRIDES[n]) entry.name = NAME_OVERRIDES[n];
  if (!entry.ref) problems.push(`${n} ${name}: no verse found`);
  if (!entry.type) problems.push(`${n} ${name}: no Sefer HaMitzvot link, so no positive/negative`);
  out.push(entry);
}

const dir = path.join(ROOT, "data/mitzvot");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "chinukh.json"), JSON.stringify({ source: "Sefer HaChinukh, Sefaria Vocalized Edition (CC0)", mitzvot: out }, null, 1) + "\n");
const withRef = out.filter((m) => m.ref).length, withWords = out.filter((m) => m.words).length;
console.log(`${out.length} mitzvot: ${withRef} with a verse, ${withWords} with the quoted words; aseh ${out.filter((m) => m.type === "aseh").length}, lav ${out.filter((m) => m.type === "lav").length}`);
const how = {};
for (const m of out) how[m.how] = (how[m.how] ?? 0) + 1;
console.log("located by:", how);
if (notes.length) console.log(`${notes.length} located other than by the cited verse:\n  ` + notes.join("\n  "));
if (problems.length) console.log(`${problems.length} problems:\n  ` + problems.join("\n  "));
