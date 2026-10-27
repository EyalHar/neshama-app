// One-time builder for data/noun-patterns/noun-adjective-patterns-extended.json: the nouns that
// noun-patterns.json leaves without a mishkal, plus all adjectives, classified wherever Gesenius'
// Hebrew Grammar (§84–86) gives a basis for it. Only words that got a mishkal are listed.
//
// Run from the project root, after build-noun-patterns.mjs: node scripts/build-noun-patterns-extended.mjs
//
// On top of the strong-root method in build-noun-patterns.mjs (see there), this adds:
// 1. Weak roots — a root letter that a weak root drops or turns into a vowel letter is left out
//    of the skeleton (מָקוֹם, root קום → מָקֹל), and the skeleton is looked up in WEAK_RULES. Every
//    rule rests on Gesenius' own examples for that pattern and root type, named in the rule.
//    Weak-root nouns that keep all their root letters use the strong table.
// 2. Ambiguous roots — when Strong's gives several roots, the noun is classified only if every
//    root that yields a pattern yields the same one.
// 3. Inferred roots — a noun with no root in Strong's is tried against every Hebrew verb root in
//    the text; it's classified only if all the roots that fit give the same mishkal.
// 4. Adjectives (OSHB "Aa", base form masculine singular absolute), by the same method.
// The 20 nouns of §96 ("nouns of peculiar formation": אָב, בַּיִת, בֵּן, יוֹם, עִיר…) are left out,
// since Gesenius assigns them no pattern.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  PATTERNS, DAGESH, nfc, isLetter, baseLetter, clusters, foldMatres, skeleton, lookupPattern, classify,
  plainRoot, collectLemmas, loadStrongs, topForm,
} from "./lib/mishkal.mjs";

const DB_PATH = "prisma/dev.db";
const OUT_DIR = "data/noun-patterns";
const FIRST_FILE = `${OUT_DIR}/noun-patterns.json`;
const OUT_FILE = `${OUT_DIR}/noun-adjective-patterns-extended.json`;

// Patterns Gesenius names that the strong table has no entry for
const EXTRA_PATTERNS = {
  tiqtal: { mishkal: "תִּקְטוֹל", translit: "tiqṭâl", gesenius: "§85 p d" },
  on: { mishkal: "־וֹן (סיומת)", translit: "-ôn", gesenius: "§85 u" },
  ut: { mishkal: "־וּת (סיומת)", translit: "-ût", gesenius: "§86 k" },
  it: { mishkal: "־ִית (סיומת)", translit: "-ît", gesenius: "§86 l" },
};
const STRONG = new Map(PATTERNS.map(([, display, translit, gesenius]) => [nfc(display), { mishkal: display, translit, gesenius }]));
function target(name) {
  const t = EXTRA_PATTERNS[name] ?? STRONG.get(nfc(name));
  if (!t) throw new Error(`Unknown target mishkal: ${name}`);
  return t;
}

// [weak type, skeleton, target mishkal, Gesenius' example(s), applies to: "N" | "A" | "NA", middle radical]
// The skeleton leaves out the dropped root letter, so a ע״ו skeleton has only ק and ל.
const WEAK_RULES = [
  // ע״ע — §84a c β
  ["ע״ע", "קַט", "קֶטֶל", "עַם, פַּת, רַב", "NA"],
  ["ע״ע", "קָט", "קֶטֶל", "יָם, רָע", "NA"],
  ["ע״ע", "קֵט", "קֵטֶל", "אֵם", "N"],
  ["ע״ע", "קֹט", "קֹטֶל", "חֹק", "N"],
  ["ע״ע", "קַטָּה", "קַטְלָה", "fem. of qaṭl", "N"],
  ["ע״ע", "קָטָה", "קַטְלָה", "רָעָה, fem. of רַע", "N"],
  ["ע״ע", "קִטָּה", "קִטְלָה", "מִדָּה, גִּזָּה", "N"],
  ["ע״ע", "קֻטָּה", "קָטְלָה", "חֻקָּה", "N"],
  ["ע״ע", "מָקֵט", "מַקְטֵל", "מָגֵן (§85 g c)", "N"],
  ["ע״ע", "מָקֹט", "מַקְטוֹל", "מָעוֹז (§85 g e)", "N"],
  ["ע״ע", "מְקִטָּה", "מַקְטֵלָה", "מְגִלָּה (§85 g c)", "N"],
  ["ע״ע", "תְּקִטָּה", "תַּקְטֵלָה", "תְּהִלָּה, תְּפִלָּה (§85 p c)", "N"],
  // ע״ו / ע״י — §84a c γ, δ
  ["ע״ו", "קֹל", "קֶטֶל", "יוֹם, שׁוֹט, שׁוֹר (contracted qaṭl)", "N", "ו"],
  ["ע״ו", "קֹלָה", "קַטְלָה", "עוֹלָה (fem. of qaṭl)", "N", "ו"],
  ["ע״ו", "קֻל", "קֹטֶל", "צוּר", "N"],
  ["ע״ו", "קֻלָה", "קָטְלָה", "סוּפָה", "N"],
  ["ע״ו", "קַטִל", "קֶטֶל", "זַיִת", "N", "י"],
  ["ע״ו", "קֵל", "קֶטֶל", "חֵיק, חֵיל (contracted qaṭl)", "N", "י"],
  ["ע״ו", "קֵלָה", "קַטְלָה", "שֵׂיבָה", "N", "י"],
  ["ע״ו", "קִל", "קֵטֶל", "דִּין", "N"],
  ["ע״ו", "קִלָה", "קִטְלָה", "בִּינָה", "N"],
  ["ע״ו", "מָקֹל", "מַקְטָל", "מָקוֹם (§85 g a)", "N"],
  ["ע״ו", "מְקֹלָה", "מַקְטוֹל", "מְגוֹרָה (§85 l f)", "N"],
  ["ע״ו", "מְקֻלָה", "מַקְטוֹל", "מְגוּרָה, מְהוּמָה (§85 l f)", "N"],
  ["ע״ו", "תְּקֻלָה", "תַּקְטוּלָה", "תְּבוּסָה, תְּנוּפָה, תְּשׁוּקָה (§85 p f)", "N"],
  ["ע״ו", "תְקֻלָה", "תַּקְטוּלָה", "תְּבוּסָה, תְּנוּפָה, תְּשׁוּקָה (§85 p f)", "N"],
  ["ע״ו", "תְּקֹל", "tiqtal", "תְּהוֹם (§85 p d)", "N"],
  ["ע״ו", "קָלֹן", "on", "זָדוֹן-type, cf. גָּאוֹן, הָמוֹן (§85 u)", "N"],
  ["ע״ו", "קִלֹן", "קַטְלוֹן", "חִיצוֹן (§86 f)", "A"],
  // ל״ה / ל״י / ל״ו — §84a c ε, f, l
  ["ל״ה", "קְטִ", "קֶטֶל", "בְּכִי, אֲרִי (qaṭl); Gesenius takes חֲצִי as qiṭl", "N"],
  ["ל״ה", "קֹטִ", "קֹטֶל", "דֳּלִי (quṭl)", "N"],
  ["ל״ה", "קָטֶה", "קָטָל", "שָׂדֶה", "N"],
  ["ל״ה", "קָטָה", "קְטָלָה", "שָׁנָה", "N"],
  ["ל״ה", "קָטִ", "קָטִיל", "נָקִי, עָנִי", "NA"],
  ["ל״ה", "קַטָּה", "קַטְלָה", "חַיָּה (§84a c β)", "N"],
  ["ל״ה", "מַקְטֶה", "מַקְטָל", "מַרְאֶה (§85 g a)", "N"],
  ["ל״ה", "מִקְטֶה", "מִקְטָל", "מִקְנֶה (§85 g b)", "N"],
  ["ל״ה", "מִקְטָה", "מִקְטָלָה", "מִקְנָה (§85 g b)", "N"],
  ["ל״ה", "מַקְטָה", "מַקְטָלָה", "fem. of maqṭāl, cf. מַרְאֶה (§85 g a)", "N"],
  ["ל״ה", "קָטֹן", "on", "גָּאוֹן, הָמוֹן, חָזוֹן (§85 u)", "N"],
  ["ל״ה", "קְטֻת", "ut", "§86 k", "N"],
  ["ל״ה", "תַּקְטִת", "תַּקְטִיל", "תַּכְלִית, תַּרְבִּית (§85 p e)", "N"],
  ["ל״ה", "מַקְטִת", "מַקְטִיל", "מַרְבִּית, parallel to תַּרְבִּית (§85 p e)", "N"],
  ["ל״ה", "קֶטְלֹן", "קַטְלוֹן", "קַדְמוֹן (§86 f)", "A"],
  // פ״י / פ״ו — §85 g, p
  ["פ״י", "מֹטָל", "מַקְטָל", "מוֹשָׁב, מוֹצָא (§85 g a)", "N"],
  ["פ״י", "מֵטָל", "מַקְטָל", "מֵיטָב (§85 g a)", "N"],
  ["פ״י", "מֹטֵל", "מַקְטֵל", "מוֹקֵשׁ (§85 g c)", "N"],
  ["פ״י", "תֹּטָל", "תַּקְטָל", "תּוֹשָׁב (§85 p a)", "N"],
  ["פ״י", "תֹּטָלָה", "תַּקְטָל", "תּוֹדָה, תּוֹרָה (§85 p a)", "N"],
  ["פ״י", "תֹּטְלָה", "תַּקְטָל", "fem. of taqṭal (§85 p a)", "N"],
  ["פ״י", "תֹּטֶלֶת", "תַּקְטָל", "תּוֹחֶלֶת (§85 p a)", "N"],
  ["פ״י", "תֹּטַלַת", "תַּקְטָל", "תּוֹכַחַת (§85 p a)", "N"],
  // פ״י and ל״ה at once: only the middle root letter is left
  ["פ״י+ל״ה", "תֹּטָה", "תַּקְטָל", "תּוֹדָה, תּוֹרָה (§85 p a)", "N"],
  // פ״נ — §85 g
  ["פ״נ", "מַטָּל", "מַקְטָל", "מַתָּן, מַצָּע (§85 g a)", "N"],
  ["פ״נ", "מַטֵּל", "מַקְטֵל", "§85 g c", "N"],
  ["פ״נ", "מַטֵּלָה", "מַקְטֵלָה", "מַגֵּפָה, מַצֵּבָה (§85 g c)", "N"],
  ["פ״נ", "מִטָּל", "מִקְטָל", "§85 g b", "N"],
];

// Strong-root skeletons the strong table misses, with Gesenius' own examples
const STRONG_EXTRAS = new Map([
  ["קֵטְל", ["קֵטֶל", "חֵטְא (§84a a)"]],
  ["קְטֵלִת", ["it", "שְׁאֵרִית (§86 l)"]],
  ["קֵטלִת", ["it", "רֵאשִׁית (§86 l)"]],
  ["קַטְלִת", ["it", "§86 l"]],
  ["תִּקְטֹל", ["tiqtal", "§85 p d"]],
]);

const IRREGULAR = new Set(["אב", "אח", "אחד", "אחות", "איש", "אמה", "אשה", "בית", "בן", "בת", "חם", "חמות", "יום", "כלי", "מים", "עיר", "פה", "ראש", "שה", "שם", "שמים"]);
const plain = (s) => [...(s ?? "")].filter(isLetter).join("");

const rules = new Map();
for (const [weak, skel, to, example, kinds, middle] of WEAK_RULES) {
  const k = `${weak}|${nfc(skel)}`;
  rules.set(k, [...(rules.get(k) ?? []), { match: target(to), example, kinds, middle }]);
}

function weakTypes(root) {
  const [a, b, c] = root, out = [];
  if (a === "נ") out.push("פ״נ");
  if (a === "י" || a === "ו") out.push("פ״י");
  if (b === "ו" || b === "י") out.push("ע״ו");
  if (b === c) out.push("ע״ע");
  if ("הוי".includes(c)) out.push("ל״ה");
  return out;
}

// Assignments of root letters to clusters, where a weak root's dropped letter may be null.
// ל״ה roots may show their third radical as י/ו (or as ה with mappiq, גָּבֹהַּ) — a plain final ה
// is a vowel letter — and ע״ו roots their middle as ו or י.
function* weakAssignments(cls, root) {
  const types = weakTypes(root);
  const droppable = new Set();
  if (types.includes("פ״נ") || types.includes("פ״י")) droppable.add(0);
  if (types.includes("ע״ו")) droppable.add(1);
  if (types.includes("ע״ע") || types.includes("ל״ה")) droppable.add(2);
  const letters = [0, 1, 2].map((p) =>
    p === 2 && root[2] === "ה" ? ["י", "ו"] : p === 1 && "וי".includes(root[1]) ? ["ו", "י"] : [root[p]]);
  // A root weak at both ends (ידה → תּוֹדָה) can keep a single root letter
  const minPresent = types.includes("פ״י") && types.includes("ל״ה") ? 1 : 2;
  function* rec(p, from, acc) {
    if (p === 3) {
      if (acc.filter((x) => x !== null).length >= minPresent) yield acc;
      return;
    }
    for (let i = from; i < cls.length; i++) {
      const letter = baseLetter(cls[i].letter);
      const mappiq = p === 2 && root[2] === "ה" && letter === "ה" && cls[i].marks.has(DAGESH);
      if (letters[p].includes(letter) || mappiq) yield* rec(p + 1, i + 1, [...acc, i]);
    }
    if (droppable.has(p)) yield* rec(p + 1, from, [...acc, null]);
  }
  yield* rec(0, 0, []);
}

// The segolate table entry accepts pausal forms (שָׁחַר for שַׁחַר); an adjective form like שָׂמַח
// or קָשֶׁה is a qaṭil / ל״ה form instead, so adjectives don't get it from those skeletons
const PAUSAL_ALIASES = new Set(["קָטַל", "קָטֶל"].map(nfc));
const acceptable = (res, kind) => !(kind === "A" && PAUSAL_ALIASES.has(res.pattern));

// Classifies a form against one root, strong table first, then the weak rules. With `strongOnly`,
// only matches that use all three root letters count.
function classifyWithRoot(form, root, kind, strongOnly = false) {
  const res = classifyAny(form, root, kind, strongOnly);
  return res && acceptable(res, kind) ? res : null;
}

function classifyAny(form, root, kind, strongOnly) {
  // A ל״ה root's final ה is a vowel letter, so its strong-table match would be spurious
  if (root[2] !== "ה") {
    const strong = classify(form, root);
    if (strong.match) return { pattern: strong.pattern, ...strong.match, rule: "strong" };
    if (strong.pattern && STRONG_EXTRAS.has(strong.pattern)) {
      const [to, example] = STRONG_EXTRAS.get(strong.pattern);
      return { pattern: strong.pattern, ...target(to), rule: "strong", basis: example };
    }
  }
  const types = weakTypes(root);
  if (types.length === 0) return null;
  const cls = foldMatres(clusters(form));
  const assignments = [...weakAssignments(cls, root)]
    .sort((x, y) => y.filter((v) => v !== null).length - x.filter((v) => v !== null).length);
  for (const a of assignments) {
    const skel = skeleton(cls, a);
    const full = a.every((v) => v !== null);
    if (full) {
      const m = lookupPattern(skel, root);
      if (m) return { pattern: skel, ...m, rule: "strong" };
    }
    if (strongOnly) continue;
    // A single-letter skeleton is matched only by the rules written for the combined weak type
    const ruleTypes = a.filter((v) => v !== null).length < 2 ? [types.join("+")] : [...types, types.join("+")];
    for (const t of ruleTypes) {
      for (const r of rules.get(`${t}|${skel}`) ?? []) {
        if (!r.kinds.includes(kind) || (r.middle && root[1] !== r.middle)) continue;
        return { pattern: skel, ...r.match, rule: `weak ${t}`, basis: r.example };
      }
    }
  }
  return null;
}

// Classifies against several candidate roots; succeeds only if all that fit agree on the mishkal.
function classifyAgreeing(form, roots, kind, strongOnly = false) {
  const results = roots.map((root) => ({ root, res: classifyWithRoot(form, root, kind, strongOnly) })).filter((r) => r.res);
  const mishkalim = new Set(results.map((r) => r.res.mishkal));
  if (mishkalim.size !== 1) return null;
  return { ...results[0], roots: results.map((r) => r.root) };
}

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const strongs = loadStrongs(db);
const first = JSON.parse(readFileSync(FIRST_FILE, "utf8"));
const firstDone = new Set(first.nouns.filter((e) => e.status === "classified" || e.status === "assumed-root").map((e) => e.strongs));

const verbRoots = new Set();
const verbs = collectLemmas(db, (code) => code.startsWith("V"), () => false);
for (const number of verbs.keys()) {
  const r = plainRoot(strongs.get(number)?.lemmaPlain);
  if (r.length === 3) verbRoots.add(r);
}

const nouns = collectLemmas(db, (code) => code.startsWith("Nc"), (code) => code[3] === "s" && code[4] === "a");
const adjectives = collectLemmas(db, (code) => code.startsWith("Aa"), (code) => code[2] === "m" && code[3] === "s" && code[4] === "a");

function build(lemmas, kind, skip) {
  const found = [];
  const left = {};
  const leave = (reason, tokens) => {
    const l = (left[reason] ??= { words: 0, tokens: 0 });
    l.words++;
    l.tokens += tokens;
  };
  for (const [number, lemma] of lemmas) {
    if (skip.has(number)) continue;
    const s = strongs.get(number);
    const textForm = topForm(lemma);
    const form = textForm ?? (s?.lemmaHe ? nfc(s.lemmaHe) : null);
    if (!form) { leave("no-form", lemma.tokens); continue; }
    if (kind === "N" && IRREGULAR.has(plain(form))) { leave("irregular-§96", lemma.tokens); continue; }

    const roots = [...new Set((s?.derivedFrom ?? "").split(",").map((d) => d.trim())
      .filter((d) => strongs.has(d)).map((d) => plainRoot(strongs.get(d).lemmaPlain)).filter((r) => r.length === 3))];
    let status, result;
    if (roots.length === 1) {
      const res = classifyWithRoot(form, roots[0], kind);
      if (res) [status, result] = [res.rule === "strong" ? "classified" : "weak-root", { root: roots[0], res }];
    } else if (roots.length > 1) {
      const r = classifyAgreeing(form, roots, kind);
      if (r) [status, result] = ["ambiguous-root-agreeing", r];
    } else {
      const cls = foldMatres(clusters(form));
      const consonants = [...new Set(cls.map((c) => baseLetter(c.letter)))];
      const candidates = [...verbRoots].filter((r) => [...r].some((ch) => consonants.includes(ch)));
      // A two-letter word (יָד, קוֹל, אֵשׁ) fits too many weak roots by chance, and Gesenius treats
      // such nouns as primitive; weak-root rules are tried only on longer words
      const r = classifyAgreeing(form, candidates, kind, cls.length < 3);
      if (r && r.roots.length <= 3) [status, result] = ["inferred-root", r];
    }
    if (!status) { leave(roots.length ? "no-rule" : "no-root", lemma.tokens); continue; }
    const { res } = result;
    found.push({
      strongs: number,
      lemma: s?.lemmaHe ?? null,
      form,
      formSource: textForm ? "text" : "strongs",
      tokens: lemma.tokens,
      root: result.root,
      ...(result.roots && result.roots.length > 1 ? { rootCandidates: result.roots } : {}),
      rootType: weakTypes(result.root).join("+") || "שלם",
      pattern: res.pattern,
      mishkal: res.mishkal,
      translit: res.translit,
      gesenius: res.gesenius,
      ...(res.basis ? { basis: res.basis } : {}),
      status,
    });
  }
  found.sort((a, b) => b.tokens - a.tokens);
  return { found, left };
}

const pct = (n, total) => Math.round((1000 * n) / total) / 10;

function summarize(found, left, totalWords, totalTokens) {
  const byStatus = {};
  for (const e of found) {
    const s = (byStatus[e.status] ??= { words: 0, tokens: 0 });
    s.words++;
    s.tokens += e.tokens;
  }
  for (const s of [...Object.values(byStatus), ...Object.values(left)]) {
    s.wordsPct = pct(s.words, totalWords);
    s.tokensPct = pct(s.tokens, totalTokens);
  }
  const byMishkal = {};
  for (const e of found) {
    const m = (byMishkal[e.mishkal] ??= { gesenius: e.gesenius, words: 0, tokens: 0, examples: [] });
    m.words++;
    m.tokens += e.tokens;
    if (m.examples.length < 5) m.examples.push(e.form);
  }
  return { byStatus, notFound: left, byMishkal };
}

const nounResult = build(nouns, "N", firstDone);
const adjResult = build(adjectives, "A", new Set());

const nounTotals = { words: nouns.size, tokens: [...nouns.values()].reduce((n, l) => n + l.tokens, 0) };
const adjTotals = { words: adjectives.size, tokens: [...adjectives.values()].reduce((n, l) => n + l.tokens, 0) };
const firstFound = first.nouns.filter((e) => firstDone.has(e.strongs));
const nounsWithMishkal = {
  words: firstFound.length + nounResult.found.length,
  tokens: firstFound.reduce((n, e) => n + e.tokens, 0) + nounResult.found.reduce((n, e) => n + e.tokens, 0),
};
const adjWithMishkal = { words: adjResult.found.length, tokens: adjResult.found.reduce((n, e) => n + e.tokens, 0) };

const output = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: "OSHB morphology + Strong's (prisma/dev.db); patterns per Gesenius' Hebrew Grammar §84–86",
  scope: "Nouns that noun-patterns.json leaves without a mishkal, and all adjectives. Only words that got a mishkal are listed.",
  statuses: {
    classified: "Root from Strong's, skeleton matches a Gesenius pattern directly (incl. weak roots that keep all root letters)",
    "weak-root": "Root from Strong's is weak; skeleton matches a weak-root rule based on Gesenius' examples (see `basis`)",
    "ambiguous-root-agreeing": "Strong's gives several roots; all that fit give the same mishkal",
    "inferred-root": "No root in Strong's; every Hebrew verb root that fits (at most 3, listed in rootCandidates) gives the same mishkal",
  },
  summary: {
    nouns: {
      ...nounTotals,
      withMishkalBothFiles: { ...nounsWithMishkal, wordsPct: pct(nounsWithMishkal.words, nounTotals.words), tokensPct: pct(nounsWithMishkal.tokens, nounTotals.tokens) },
      ...summarize(nounResult.found, nounResult.left, nounTotals.words, nounTotals.tokens),
    },
    adjectives: {
      ...adjTotals,
      withMishkal: { ...adjWithMishkal, wordsPct: pct(adjWithMishkal.words, adjTotals.words), tokensPct: pct(adjWithMishkal.tokens, adjTotals.tokens) },
      ...summarize(adjResult.found, adjResult.left, adjTotals.words, adjTotals.tokens),
    },
  },
  nouns: nounResult.found,
  adjectives: adjResult.found,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(output, null, 1) + "\n");
console.log(`Wrote ${OUT_FILE}: ${nounResult.found.length} nouns, ${adjResult.found.length} adjectives`);
console.log(JSON.stringify({ nouns: output.summary.nouns.withMishkalBothFiles, adjectives: output.summary.adjectives.withMishkal }, null, 1));
console.log(JSON.stringify({ nouns: output.summary.nouns.byStatus, nounsLeft: output.summary.nouns.notFound, adjectives: output.summary.adjectives.byStatus, adjLeft: output.summary.adjectives.notFound }));
