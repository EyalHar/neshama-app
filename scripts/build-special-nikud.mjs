// One-time builder for data/special-nikud/special-nikud.json: unusual nikud marks, found in both
// texts the site uses and compared word by word:
//   - MAM: Sefaria's "Miqra according to the Masorah" (what the reader shows), downloaded per book;
//   - OSHB: the Leningrad Codex as seeded into VerseText (prisma/dev.db).
// Kinds: dagesh in א ח ע ר; dots over letters (נקודות על האותיות); hataf vowels under letters other
// than א ה ח ע (the divine name left out); word-initial dagesh in letters other than בגדכפ״ת and
// א ח ע ר (דחיק / אתי מרחיק), classified from MAM's accents only where the accents decide it; and
// counts for the notes (ירושלִַם, יששכר, יֱהֹוִה).
//
// The two texts are aligned per chapter (verse numbering differs in a few chapters, e.g. the
// Decalogue) by longest common subsequence of the words' consonants. The reader shows MAM, so a
// case carries MAM's book/chapter/verse when MAM has the word.
//
// Run from the project root: node scripts/build-special-nikud.mjs [cacheDir]
// Downloads are cached in cacheDir (default: the OS temp folder), never in the project.
// Sources: Sefaria, Miqra according to the Masorah (CC-BY-SA); OSHB (CC-BY 4.0).

import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT_DIR = "data/special-nikud";
const OUT_FILE = `${OUT_DIR}/special-nikud.json`;
const VERSION = "Miqra according to the Masorah";
const CACHE = process.argv[2] ?? join(tmpdir(), "sefaria-mam-books");
const POETIC = new Set(["Psalms", "Proverbs", "Job"]);

const books = [...readFileSync("lib/tanakh.ts", "utf8").matchAll(/id: "([^"]+)", he: "/g)]
  .map((m) => ({ id: m[1] }));
if (books.length !== 39) throw new Error(`expected 39 books, found ${books.length}`);

// ---------- MAM download (one request per book, sequential, cached) ----------
async function mamBook(book) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${book.replace(/ /g, "_")}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(book)}?version=${encodeURIComponent(`hebrew|${VERSION}`)}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 && attempt < 6) { await new Promise((r) => setTimeout(r, 15000 * attempt)); continue; }
    if (!res.ok) throw new Error(`${book}: HTTP ${res.status}`);
    const v = (await res.json()).versions?.[0];
    if (!v || v.versionTitle !== VERSION || !Array.isArray(v.text)) throw new Error(`${book}: unexpected version`);
    writeFileSync(file, JSON.stringify(v.text));
    await new Promise((r) => setTimeout(r, 1500));
    return v.text;
  }
}

// ---------- text helpers ----------
const FOOTNOTE_RE = /<sup class="footnote-marker">[\s\S]*?<\/sup>\s*<i class="footnote">([\s\S]*?)<\/i>|<i class="footnote">([\s\S]*?)<\/i>/g;
// Same as stripVerseHtml() in lib/tanakh.ts: the verse as the reader shows it
function stripVerseHtml(html) {
  return html.replace(FOOTNOTE_RE, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&thinsp;/g, " ").replace(/&[a-zA-Z]+;/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const isLetter = (c) => c >= "א" && c <= "ת";
const isMark = (c) => c >= "\u0591" && c <= "\u05C7" && !"\u05BE\u05C0\u05C3\u05C6".includes(c);
const isAccent = (c) => c >= "\u0591" && c <= "\u05AF";
const VOWEL_RE = /[\u05B4-\u05BB\u05C7]/; // full vowels: no sheva, no hataf
const ANY_VOWEL_RE = /[\u05B0-\u05BB\u05C7]/;
const DAGESH = "\u05BC";
const HATAF = { "\u05B1": "segol", "\u05B2": "patah", "\u05B3": "qamats" };
const PUNCTA_RE = /[\u05C4\u05C5]/;
// Conjunctive accents written on the stressed syllable (not pre/postpositive): munah, mahpakh,
// merkha, merkha kefula, darga, qadma/azla, yerah ben yomo, illuy
const CONJ = new Set(["\u05A3", "\u05A4", "\u05A5", "\u05A6", "\u05A7", "\u05A8", "\u05AA", "\u05AC"]);

const units = (word) => {
  const u = [];
  for (const ch of word) {
    if (isLetter(ch)) u.push({ l: ch, m: "" });
    else if (u.length && isMark(ch)) u[u.length - 1].m += ch;
  }
  return u;
};
const skeleton = (word) => [...word].filter(isLetter).join("");
const isShuruk = (u) => u.l === "ו" && u.m.includes(DAGESH) && !ANY_VOWEL_RE.test(u.m);
const hatafOf = (u) => Object.keys(HATAF).find((h) => u.m.includes(h)) ?? null;

// MAM verse → its display text (as the reader shows it) and its words, split on space, maqaf and
// paseq, each with its offsets in the display text, the separator before it, and whether it sits
// inside Sefaria's ketiv ( ) / qere [ ] brackets.
function mamTokens(html, verse) {
  const text = stripVerseHtml(html);
  const tokens = [];
  let cur = null, sep = "start", depth = 0, offset = 0;
  const close = () => { if (cur) { tokens.push(cur); cur = null; sep = "space"; } };
  for (const ch of text) {
    if ("([)]".includes(ch)) {
      close();
      depth = "([".includes(ch) ? depth + 1 : Math.max(0, depth - 1);
    } else if (isLetter(ch) || (cur && isMark(ch))) {
      if (!cur) cur = { w: "", start: offset, sep, kq: depth > 0, verse };
      cur.w += ch;
      cur.end = offset + ch.length;
    } else if (/[\s\u05BE\u05C0\u05C3|]/.test(ch)) {
      close();
      if (ch === "\u05BE") sep = "maqaf";
      else if (ch === "\u05C0" || ch === "|") sep = "paseq";
    } // anything else (U+034F joiner, inverted nun) is skipped without splitting the word
    offset += ch.length;
  }
  close();
  return { text, tokens };
}

// Longest common subsequence of two sequences → Map(index in a → index in b)
function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = new Map();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] === b[j]) { pairs.set(i, j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

// Words aligned by consonants; between two aligned words, gaps of equal length on both sides are
// paired in order (spelling variants such as סִּֽירֹתֵיכֶם / סִּירֹתֵכֶם). Words of b for which
// skip() holds (MAM's unpointed ketiv) are left out of the gaps.
function alignWords(a, b, skip) {
  const pairs = lcs(a, b);
  const anchors = [[-1, -1], ...[...pairs].sort((x, y) => x[0] - y[0]), [a.length, b.length]];
  for (let k = 1; k < anchors.length; k++) {
    const [i0, j0] = anchors[k - 1], [i1, j1] = anchors[k];
    const gapB = [];
    for (let j = j0 + 1; j < j1; j++) if (!skip(j)) gapB.push(j);
    if (i1 - i0 - 1 === gapB.length) gapB.forEach((j, d) => pairs.set(i0 + 1 + d, j));
  }
  return pairs;
}

// Where the last syllable of a word begins: the letter carrying the last full vowel (for holam or
// shuruk written with ו, the consonant before it)
function lastSyllableStart(u) {
  for (let i = u.length - 1; i >= 0; i--) {
    const vavVowel = u[i].l === "ו" && (isShuruk(u[i]) || (u[i].m.includes("\u05B9") && !/[\u05B0-\u05B8\u05BA\u05BB\u05C7]/.test(u[i].m)));
    if (vavVowel) return Math.max(0, i - 1);
    if (VOWEL_RE.test(u[i].m)) return i;
  }
  return -1;
}
// The word ends in a vowel: its last letter has a full vowel (not a furtive patah), or is a bare
// ה / א / י after one, or is holam/shuruk ו
function endsInVowel(u) {
  const last = u[u.length - 1];
  if (!last) return false;
  if (isShuruk(last) || (last.l === "ו" && last.m.includes("\u05B9"))) return true;
  if (VOWEL_RE.test(last.m)) return !("חע".includes(last.l) && last.m.includes("\u05B7"));
  const bare = !ANY_VOWEL_RE.test(last.m) && !last.m.includes(DAGESH);
  return bare && "האי".includes(last.l) && u.length > 1 && VOWEL_RE.test(u[u.length - 2].m);
}

const accentsOf = (u) => u.flatMap((x, i) => [...x.m].filter(isAccent).map((c) => ({ c, i })));
// A word's form without accents and meteg, to look up how it is stressed elsewhere
const formKey = (w) => [...w].filter((c) => !isAccent(c) && c !== "\u05BD").join("");
// Full vowels, not counting the conjunction ו (never stressed)
const fullVowels = (u) => u.filter((x, i) => VOWEL_RE.test(x.m) || (i > 0 && isShuruk(x))).length;

// Stress "by nature" of a word form: where MAM puts a disjunctive accent written on the stressed
// syllable (zaqef, tipha, revia, tevir, pazer, shalshelet) in the prose books. Conjunctive accents
// and etnahta/silluq are left out, since stress can move back before a stressed word (nesigah) or
// in pause. A form with one full vowel is stressed on it.
const IMPOSITIVE_DISJ = new Set(["\u0594", "\u0595", "\u0596", "\u0597", "\u059B", "\u05A1", "\u0593"]);
const natureStress = new Map(); // formKey → Set("final" | "penult")
function learnStress(token, book) {
  if (POETIC.has(book) || token.kq) return;
  const u = units(token.w);
  const acc = accentsOf(u);
  if (acc.length !== 1 || !IMPOSITIVE_DISJ.has(acc[0].c)) return;
  const k = formKey(token.w);
  if (!natureStress.has(k)) natureStress.set(k, new Set());
  natureStress.get(k).add(acc[0].i >= lastSyllableStart(u) ? "final" : "penult");
}

// Dechik / atei merahik, only where MAM's accents decide it. Both follow a word ending in a vowel,
// joined to the dagesh word by maqaf or a conjunctive accent:
// - the previous word's only accents are conjunctive and written before its last syllable (it is
//   stressed on the penult, mil'el) → atei merahik;
// - it is joined by maqaf with no accent (its last vowel unstressed) and is stressed on its last
//   syllable by nature (milra, as seen where it carries a disjunctive accent) → dechik.
// Anything else stays unclassified, with the reason: "final" (stressed on its last syllable here),
// "maqaf" (joined by maqaf, but mil'el by nature or not attested), "other" (a disjunctive or
// pre/postpositive accent, a paseq, ketiv/qere, start of the verse, a word ending in a consonant).
function classifyInitial(prev, cur, book) {
  const other = { cls: "unclassified", why: "other" };
  if (!prev || !cur || prev.verse !== cur.verse || cur.sep === "paseq" || prev.kq || cur.kq) return other;
  const u = units(prev.w);
  if (!endsInVowel(u)) return other;
  const accents = accentsOf(u);
  if (accents.length === 0) {
    if (cur.sep !== "maqaf") return other;
    const key = formKey(prev.w);
    // A form with the conjunction ו is looked up without it when not attested (וְלָמָּה → לָמָּה)
    const nature = fullVowels(u) === 1 ? new Set(["final"])
      : natureStress.get(key) ?? (key.startsWith("ו") ? natureStress.get(key.slice(2)) : undefined);
    return nature?.size === 1 && nature.has("final") ? { cls: "dechik" } : { cls: "unclassified", why: "maqaf" };
  }
  if (!accents.every((a) => CONJ.has(a.c))) return other;
  // In the poetic books a mahpakh can be part of a disjunctive (mehuppakh legarmeh, ole veyored)
  if (POETIC.has(book) && accents.some((a) => a.c === "\u05A4")) return other;
  return accents[accents.length - 1].i < lastSyllableStart(u) ? { cls: "atei" } : { cls: "unclassified", why: "final" };
}

// ---------- OSHB ----------
const db = new DatabaseSync("prisma/dev.db", { readOnly: true });
const meta = new Map();
for (const r of db.prepare("SELECT book, chapter, verse, wordNum, lemma, morph FROM WordEntry").iterate())
  meta.set(`${r.book}|${r.chapter}|${r.verse}|${r.wordNum}`, { lemma: r.lemma, morph: r.morph });
const oshbChapters = new Map(); // "book|chapter" → [{ verse, text }]
for (const r of db.prepare("SELECT book, chapter, verse, text FROM VerseText ORDER BY verseIndex").iterate()) {
  const k = `${r.book}|${r.chapter}`;
  if (!oshbChapters.has(k)) oshbChapters.set(k, []);
  oshbChapters.get(k).push({ verse: r.verse, text: r.text });
}
const strongs = (lemma) => (lemma ?? "").split("/").find((s) => /^\d/.test(s))?.replace(/\s.*$/, "") ?? null;

// ---------- scan ----------
const cases = [];
const verseText = {}; // "book|chapter|verse" → MAM verse text, for verses a case shows
const stats = { variantPairs: 0, unmatched: 0, kq: 0 };
const notes = {
  jerusalem: { total: 0, plene: 0, aramaic: 0, mam: 0, len: 0, pleneRefs: [] },
  issachar: { total: 0, mamBare: 0, lenBare: 0 },
  // mam: יֱהֹוִה in MAM; mamAfterAdonai: of them right after (ו/ל/ב)אדני; lenHiriqThere: of them,
  // Leningrad has a hiriq without the hataf segol; len: hataf segol anywhere in Leningrad
  yhwh: { total: 0, mam: 0, mamAfterAdonai: 0, lenHiriqThere: 0, len: 0 },
};

// First pass: MAM tokens of every chapter, and how each word form is stressed by nature
const mamBooks = [];
for (const { id: book } of books) {
  const chapters = (await mamBook(book)).map((verses) => {
    const text = [];
    const tokens = verses.flatMap((html, vi) => {
      const t = mamTokens(html, vi + 1);
      text[vi + 1] = t.text;
      return t.tokens;
    });
    for (const t of tokens) learnStress(t, book);
    return { text, tokens };
  });
  mamBooks.push(chapters);
  process.stdout.write(".");
}

for (const [bi, { id: book }] of books.entries()) {
  mamBooks[bi].forEach(({ text: mamText, tokens: mt }, ci) => {
    const chapter = ci + 1;
    const ot = (oshbChapters.get(`${book}|${chapter}`) ?? []).flatMap(({ verse, text }) =>
      text.split(" ").map((w, i) => {
        const m = meta.get(`${book}|${chapter}|${verse}|${i + 1}`);
        return { w: [...w].filter((c) => isLetter(c) || isMark(c)).join(""), verse, lemma: m?.lemma, morph: m?.morph };
      }));
    // An unpointed word (a ketiv) only matches another unpointed word
    const alignKey = (w) => (ANY_VOWEL_RE.test(w) ? "" : "K") + skeleton(w);
    const pairs = alignWords(ot.map((x) => alignKey(x.w)), mt.map((x) => alignKey(x.w)), (j) => mt[j].kq && !ANY_VOWEL_RE.test(mt[j].w));
    const mamToOshb = new Map([...pairs].map(([o, m]) => [m, o]));
    for (const [o, m] of pairs) if (skeleton(ot[o].w) !== skeleton(mt[m].w)) stats.variantPairs++;

    // Notes, counted per MAM word and the Leningrad word aligned to it
    mt.forEach((t, mi) => {
      const sk = skeleton(t.w);
      const o = mamToOshb.has(mi) ? ot[mamToOshb.get(mi)].w : null;
      // ירושלם: patah or qamats together with hiriq on the ל
      const twoVowels = (w) => units(w).some((x) => x.l === "ל" && x.m.includes("\u05B4") && /[\u05B7\u05B8]/.test(x.m));
      if (/ירושלי?(ם|מה)$/.test(sk)) {
        notes.jerusalem.total++;
        if (/י(ם|מה)$/.test(sk)) { notes.jerusalem.plene++; notes.jerusalem.pleneRefs.push([book, chapter, t.verse]); }
        else if (units(t.w).some((x) => x.l === "ל" && x.m.includes("\u05B6"))) notes.jerusalem.aramaic++;
        if (twoVowels(t.w)) notes.jerusalem.mam++;
        if (o && twoVowels(o)) notes.jerusalem.len++;
      }
      // יששכר: the second ש without any mark
      if (sk.endsWith("יששכר")) {
        notes.issachar.total++;
        const bare = (w) => { const u = units(w); const i = u.findIndex((x, k) => k > 0 && x.l === "ש" && u[k - 1].l === "ש"); return i > 0 && u[i].m === ""; };
        if (bare(t.w)) notes.issachar.mamBare++;
        if (o && bare(o)) notes.issachar.lenBare++;
      }
      // The divine name with hataf segol under the י (יֱהֹוִה)
      if (sk === "יהוה") {
        notes.yhwh.total++;
        const segol = (w) => units(w)[0].m.includes("\u05B1");
        // In Leningrad: hataf segol, or a hiriq under the ו (יְהוִה) without it
        const hiriq = (w) => units(w)[2]?.m.includes("\u05B4");
        if (o && segol(o)) notes.yhwh.len++;
        if (segol(t.w)) {
          notes.yhwh.mam++;
          if (mi > 0 && skeleton(mt[mi - 1].w).endsWith("אדני")) notes.yhwh.mamAfterAdonai++;
          if (o && !segol(o) && hiriq(o)) notes.yhwh.lenHiriqThere++;
        }
      }
    });

    // Every word, aligned or not, is scanned in both forms; letters are matched by consonant LCS
    const found = new Map();
    const scanWord = (oi, mi) => {
      const o = oi === null ? null : ot[oi], m = mi === null ? null : mt[mi];
      const uo = o ? units(o.w) : [], um = m ? units(m.w) : [];
      const letterPairs = o && m ? lcs(uo.map((x) => x.l), um.map((x) => x.l)) : new Map();
      const pairsOfLetters = [];
      const usedM = new Set(letterPairs.values());
      uo.forEach((_, j) => pairsOfLetters.push([j, letterPairs.has(j) ? letterPairs.get(j) : null]));
      um.forEach((_, j) => { if (!usedM.has(j)) pairsOfLetters.push([null, j]); });
      const sk = skeleton((m ?? o).w);
      const add = (phen, jo, jm, inLen, inMam, extra = {}) => {
        const k = `${phen}|${oi}|${mi}|${phen === "puncta" ? "" : `${jo}|${jm}`}`;
        const ex = found.get(k);
        if (ex) {
          if (jo !== null && !ex.al.includes(jo)) ex.al.push(jo);
          if (jm !== null && !ex.am.includes(jm)) ex.am.push(jm);
          ex.inLen ||= inLen; ex.inMam ||= inMam;
          return;
        }
        found.set(k, { phen, oi, mi, al: jo === null ? [] : [jo], am: jm === null ? [] : [jm], inLen, inMam, ...extra });
      };
      for (const [jo, jm] of pairsOfLetters) {
        const lo = jo === null ? null : uo[jo], lm = jm === null ? null : um[jm];
        const letter = (lm ?? lo).l;
        const test = (f) => [lo ? f(lo) : false, lm ? f(lm) : false];
        const first = (jm ?? jo) === 0;
        if ("אחער".includes(letter)) {
          const [l, mm] = test((x) => x.m.includes(DAGESH));
          if (l || mm) add("dagesh", jo, jm, l, mm, { sub: first ? "initial" : "inWord" });
        }
        if (!"אהחע".includes(letter) && sk !== "יהוה") {
          const ho = lo ? hatafOf(lo) : null, hm = lm ? hatafOf(lm) : null;
          if (ho || hm) add("hataf", jo, jm, !!ho, !!hm, { markLen: ho && HATAF[ho], markMam: hm && HATAF[hm] });
        }
        {
          const [l, mm] = test((x) => PUNCTA_RE.test(x.m));
          if (l || mm) add("puncta", l ? jo : null, mm ? jm : null, l, mm);
        }
        if (first && !"בגדכפתאחער".includes(letter)) {
          // ו counts only with its own vowel (וּ alone is shuruk)
          const [l, mm] = test((x) => x.m.includes(DAGESH) && (x.l !== "ו" || ANY_VOWEL_RE.test(x.m)));
          if (l || mm) add("initial", jo, jm, l, mm);
        }
      }
    };
    ot.forEach((_, oi) => scanWord(oi, pairs.has(oi) ? pairs.get(oi) : null));
    mt.forEach((_, mi) => { if (!mamToOshb.has(mi)) scanWord(null, mi); });

    for (const f of found.values()) {
      const o = f.oi === null ? null : ot[f.oi], m = f.mi === null ? null : mt[f.mi];
      if (!o || !m) stats.unmatched++;
      if (m?.kq) stats.kq++;
      const verse = m ? m.verse : o.verse;
      const c = {
        p: f.phen,
        b: book, c: chapter, v: verse,
        mam: m ? m.w : null,
        len: o ? o.w : null,
        am: f.am.sort((x, y) => x - y),
        al: f.al.sort((x, y) => x - y),
        st: f.inLen && f.inMam ? "both" : f.inMam ? "mam" : "len",
      };
      // The letter: for dots over letters the first dotted one (each form lists only its own dots)
      c.l = c.am.length ? units(m.w)[c.am[0]].l : units(o.w)[c.al[0]].l;
      if (m) c.r = [m.start, m.end];
      if (f.phen === "dagesh") c.sub = f.sub;
      if (f.phen === "hataf") {
        c.sub = f.markMam ?? f.markLen;
        if (f.markMam && f.markLen && f.markMam !== f.markLen) c.other = f.markLen;
        c.strongs = strongs(o?.lemma);
        if ((o?.morph ?? "").startsWith("A")) c.aram = true;
      }
      if (f.phen === "initial" || (f.phen === "dagesh" && f.sub === "initial")) {
        const prev = m && f.mi > 0 && mt[f.mi - 1].verse === m.verse ? mt[f.mi - 1] : null;
        const k = classifyInitial(prev, m, book);
        c.cls = k.cls;
        if (k.why) c.why = k.why;
        if (prev) { c.prev = prev.w; c.join = m.sep === "maqaf" ? "maqaf" : "space"; }
      }
      cases.push(c);
      verseText[`${book}|${chapter}|${verse}`] = mamText[verse] ?? "";
    }
  });
}

const order = new Map(books.map((b, i) => [b.id, i]));
cases.sort((x, y) => order.get(x.b) - order.get(y.b) || x.c - y.c || x.v - y.v || (x.r?.[0] ?? 0) - (y.r?.[0] ?? 0));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify({ notes, cases, verses: verseText }) + "\n");

const count = (f) => cases.reduce((acc, c) => { const k = f(c); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
console.log(`\n${cases.length} cases →`, OUT_FILE);
console.log(count((c) => `${c.p} ${c.sub ?? ""} ${c.cls ?? ""} ${c.why ?? ""} ${c.st}`));
console.log(stats, JSON.stringify(notes));
