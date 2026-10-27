// Shared mishkal machinery for the noun/adjective pattern builders in scripts/.
// See build-noun-patterns.mjs for the method.

export const SHVA = "ְ", HATAF = ["ֱ", "ֲ", "ֳ"];
export const HIRIQ = "ִ", TSERE = "ֵ", SEGOL = "ֶ", PATACH = "ַ";
export const HOLAM = "ֹ", HOLAM_HASER = "ֺ", QUBUTS = "ֻ", DAGESH = "ּ";
export const SHIN_DOT = "ׁ", SIN_DOT = "ׂ";
export const VOWELS = new Set(["ְ", "ֱ", "ֲ", "ֳ", "ִ", "ֵ", "ֶ", "ַ", "ָ", "ֹ", "ֺ", "ֻ", "ׇ"]);
export const FULL_VOWELS = new Set([...VOWELS].filter((v) => v !== SHVA && !HATAF.includes(v)));
export const BEGADKEFAT = new Set([..."בגדכפת"]);
export const FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
export const PLACEHOLDERS = ["ק", "ט", "ל"];

export const isLetter = (c) => c >= "א" && c <= "ת";
export const baseLetter = (c) => FINALS[c] ?? c;
export const hasFullVowel = (cl) => cl && [...cl.marks].some((m) => FULL_VOWELS.has(m));

// Gesenius patterns, keyed by the normalized (defective) skeleton. `display` is the usual plene
// spelling of the mishkal name. Where two of Gesenius' patterns fall together in Tiberian
// vocalization (e.g. qaṭul / qaṭâl both surface as קָטֹל), they share one entry.
export const PATTERNS = [
  // §84a — one originally short vowel (segolates) and their feminines
  // Guttural variants (§84a a) and pausal forms with lengthened first vowel (§29) are aliases
  ["קֶטֶל", "קֶטֶל", "qaṭl", "§84a a", ["קַטַל", "קֶטַל", "קָטֶל", "קָטַל"]],
  ["קֵטֶל", "קֵטֶל", "qiṭl", "§84a a", ["קֵטַל"]],
  ["קֹטֶל", "קֹטֶל", "quṭl", "§84a a", ["קֹטַל"]],
  ["קַטְלָה", "קַטְלָה", "qaṭlâ", "§84a b"],
  ["קִטְלָה", "קִטְלָה", "qiṭlâ", "§84a b", ["קֶטְלָה"]],
  ["קָטְלָה", "קָטְלָה", "quṭlâ", "§84a b", ["קֹטְלָה", "קֻטְלָה"]],
  ["קְטַל", "קְטַל", "qeṭal", "§84a e"],
  ["קְטֵל", "קְטֵל", "qeṭel", "§84a e"],
  // §84a — two short vowels / a long vowel in the second syllable
  ["קָטָל", "קָטָל", "qaṭal", "§84a f"],
  ["קְטָלָה", "קְטָלָה", "qeṭālâ", "§84a f"],
  ["קָטֵל", "קָטֵל", "qaṭil", "§84a g"],
  ["קְטֵלָה", "קְטֵלָה", "qeṭilâ", "§84a g"],
  ["קְטֶלֶת", "קְטֶלֶת", "qeṭelet", "§84a g"],
  ["קָטֹל", "קָטוֹל", "qaṭul / qaṭâl", "§84a h, k"],
  ["קְטֻלָּה", "קְטֻלָּה", "qeṭullâ", "§84a h"],
  ["קְטֹלָה", "קְטוֹלָה", "qeṭôlâ", "§84a k, n"],
  ["קֵטָל", "קֵטָל", "qēṭāl", "§84a i"],
  ["קָטִל", "קָטִיל", "qaṭîl", "§84a l"],
  ["קְטִלָה", "קְטִילָה", "qeṭîlâ", "§84a l"],
  ["קָטֻל", "קָטוּל", "qaṭûl", "§84a m"],
  ["קְטֻלָה", "קְטוּלָה", "qeṭûlâ", "§84a m, p"],
  ["קְטָל", "קְטָל", "qeṭāl", "§84a n"],
  ["קְטֹל", "קְטוֹל", "qeṭôl", "§84a n", ["קֵטֹל"]],
  ["קְטֹלֶת", "קְטֹלֶת", "qeṭōlet", "§84a n"],
  ["קְטִל", "קְטִיל", "qiṭîl", "§84a o"],
  ["קְטֻל", "קְטוּל", "qiṭûl", "§84a p", ["קֵטֻל"]],
  ["קֹטָל", "קוֹטָל", "qôṭal", "§84a r"],
  ["קֹטֵל", "קוֹטֵל", "qôṭel", "§84a s"],
  ["קֹטֵלָה", "קוֹטֵלָה", "qôṭelâ", "§84a s"],
  ["קֹטֶלֶת", "קוֹטֶלֶת", "qôṭelet", "§84a s"],
  ["קֻטָל", "קוּטָל", "qûṭal", "§84a t", ["קֻטַל"]],
  ["קִטֹל", "קִיטוֹל", "qîṭôl", "§84a u"],
  // §84b — doubled middle radical
  ["קַטָּל", "קַטָּל", "qaṭṭāl", "§84b b"],
  ["קַטָּלָה", "קַטָּלָה", "qaṭṭālâ", "§84b b", ["קֶטָלָה"]],
  ["קַטֶּלֶת", "קַטֶּלֶת", "qaṭṭelet", "§84b b", ["קַטַּלַת"]],
  ["קִטֶּלֶת", "קִטֶּלֶת", "qiṭṭelet", "§84b c"],
  ["קֻטֶּלֶת", "קֻטֶּלֶת", "quṭṭelet", "§84b 19"],
  ["קֻטֹּלֶת", "קֻטֹּלֶת", "quṭṭōlet", "§84b 19"],
  ["קַטֵּל", "קַטֵּל", "qaṭṭēl", "§84b d"],
  ["קִטֵּל", "קִטֵּל", "qiṭṭēl", "§84b 21"],
  ["קִטָּל", "קִטָּל", "qiṭṭāl", "§84b 23"],
  ["קִטֹּל", "קִטּוֹל", "qiṭṭôl", "§84b 24"],
  ["קִטֹּלֶת", "קִטֹּלֶת", "qiṭṭōlet", "§84b 24"],
  ["קַטִּל", "קַטִּיל", "qaṭṭîl", "§84b f"],
  ["קַטֻּל", "קַטּוּל", "qaṭṭûl", "§84b g"],
  ["קַטֻּלָה", "קַטּוּלָה", "qaṭṭûlâ", "§84b g"],
  ["קַטֹּל", "קַטּוֹל", "qaṭṭōl", "§84b h"],
  ["קַטֹּלֶת", "קַטֹּלֶת", "qaṭṭōlet", "§84b h"],
  ["קִטֻּל", "קִטּוּל", "qiṭṭûl", "§84b i"],
  // §85 — preformatives
  ["אַקְטָל", "אַקְטָל", "ʾaqṭāl", "§85 b", ["אֶקְטָל"]],
  ["אַקְטָלָה", "אַקְטָלָה", "ʾaqṭālâ", "§85 b"],
  ["אֶקְטַל", "אֶקְטַל", "ʾeqṭal", "§85 b"],
  ["אֶקְטֹל", "אֶקְטוֹל", "ʾeqṭôl", "§85 b"],
  ["הַקְטָלָה", "הַקְטָלָה", "haqṭālâ", "§85 c"],
  ["הַקְטֵל", "הַקְטֵל", "haqṭēl", "§85 c"],
  ["הַקְטִל", "הַקְטִיל", "haqṭîl", "§85 c"],
  ["יִקְטָל", "יִקְטָל", "yiqṭāl", "§85 d"],
  ["יַקְטֻל", "יַקְטוּל", "yaqṭûl", "§85 d"],
  ["מַקְטָל", "מַקְטָל", "maqṭāl", "§85 g a", ["מַקְטַל"]],
  ["מַקְטָלָה", "מַקְטָלָה", "maqṭālâ", "§85 g a"],
  ["מַקְטֶלֶת", "מַקְטֶלֶת", "maqṭelet", "§85 g a"],
  ["מִקְטָל", "מִקְטָל", "miqṭāl", "§85 g b", ["מֶקְטָל"]],
  ["מִקְטָלָה", "מִקְטָלָה", "miqṭālâ", "§85 g b", ["מֶקְטָלָה"]],
  ["מִקְטֶלֶת", "מִקְטֶלֶת", "miqṭelet", "§85 g b", ["מִקְטַלַת"]],
  ["מַקְטֵל", "מַקְטֵל", "maqṭēl", "§85 g c"],
  ["מַקְטֵלָה", "מַקְטֵלָה", "maqṭēlâ", "§85 g c"],
  ["מִקְטֵל", "מִקְטֵל", "miqṭēl", "§85 g d"],
  ["מַקְטֹל", "מַקְטוֹל", "maqṭōl / maqṭâl", "§85 g e, l f"],
  ["מַקְטֹלֶת", "מַקְטֹלֶת", "maqṭōlet", "§85 g e"],
  ["מִקְטֹל", "מִקְטוֹל", "miqṭōl", "§85 l g"],
  ["מִקְטֹלֶת", "מִקְטֹלֶת", "miqṭōlet", "§85 l g"],
  ["מַקְטִל", "מַקְטִיל", "maqṭîl", "§85 l h"],
  ["מַקְטֻל", "מַקְטוּל", "maqṭûl", "§85 l i"],
  ["נִקְטָל", "נִקְטָל", "niqṭāl", "§85 n"],
  ["תַּקְטָל", "תַּקְטָל", "taqṭal", "§85 p a"],
  ["תִּקְטָלָה", "תִּקְטָלָה", "tiqṭālâ", "§85 p b"],
  ["תִּקְטֶלֶת", "תִּקְטֶלֶת", "tiqṭelet", "§85 p b"],
  ["תַּקְטֵל", "תַּקְטֵל", "taqṭēl", "§85 p c"],
  ["תַּקְטֵלָה", "תַּקְטֵלָה", "taqṭēlâ", "§85 p c"],
  ["תַּקְטִל", "תַּקְטִיל", "taqṭîl", "§85 p e"],
  ["תַּקְטֻל", "תַּקְטוּל", "taqṭûl", "§85 p f"],
  ["תַּקְטֻלָה", "תַּקְטוּלָה", "taqṭûlâ", "§85 p f"],
  // §85–86 — afformatives
  ["קִטָּלֹן", "קִטָּלוֹן", "qiṭṭālôn", "§85 u"],
  ["קְטָלֹן", "קְטָלוֹן", "qeṭālôn", "§85 u"],
  ["קָטְלָן", "קָטְלָן", "quṭlān", "§85 u"],
  ["קֻטְלָן", "קֻטְלָן", "quṭlān", "§85 u"],
  ["קִטְלָן", "קִטְלָן", "qiṭlān", "§85 u"],
  ["קִטְלֹן", "קִטְלוֹן", "qiṭlôn", "§85 u"],
  ["קַטְלֹן", "קַטְלוֹן", "qaṭlôn", "§86 f"],
  ["קַטְלֻת", "קַטְלוּת", "qaṭlût", "§86 k"],
  ["קִטְלֻת", "קִטְלוּת", "qiṭlût", "§86 k"],
  ["קַטָּלֻת", "קַטָּלוּת", "qaṭṭālût", "§86 k"],
];

// A guttural or ר can't be doubled, so the vowel before it lengthens (§22c): with such a middle
// radical these skeletons are qaṭṭāl forms, not the patterns they look like.
export const GUTTURALS = new Set([..."אהחער"]);
export const MIDDLE_GUTTURAL_ALIASES = [
  ["קָטָלָה", "קַטָּלָה"],
  ["קָטַלַת", "קַטֶּלֶת"],
];

export const nfc = (s) => s.normalize("NFC");
export const PATTERN_BY_KEY = new Map();
for (const [key, display, translit, section, aliases = []] of PATTERNS) {
  const entry = { mishkal: display, translit, gesenius: section };
  for (const k of [key, ...aliases]) PATTERN_BY_KEY.set(nfc(k), entry);
}
export const GUTTURAL_ALIAS = new Map(MIDDLE_GUTTURAL_ALIASES.map(([k, target]) => [nfc(k), PATTERN_BY_KEY.get(nfc(target))]));

export const lookupPattern = (key, root) =>
  PATTERN_BY_KEY.get(key) ?? (GUTTURALS.has(root[1]) ? GUTTURAL_ALIAS.get(key) : undefined);

// Splits a pointed word into letter clusters, dropping cantillation, meteg, rafe and anything
// that isn't a Hebrew letter or point.
export function clusters(word) {
  const out = [];
  for (const ch of nfc(word)) {
    if (isLetter(ch)) out.push({ letter: ch, marks: new Set() });
    else if (out.length && ch === "ׇ") out[out.length - 1].marks.add("ָ");
    else if (out.length && ((ch >= "ְ" && ch <= "ּ") || ch === SHIN_DOT || ch === SIN_DOT || ch === "ׇ")) {
      out[out.length - 1].marks.add(ch);
    }
  }
  return out;
}

// Folds vowel letters into the vowel of the letter before them. Root letters are never ו/י
// for the strong roots this is applied to.
export function foldMatres(cls) {
  const out = [];
  for (const cl of cls) {
    const prev = out[out.length - 1];
    const ownVowels = [...cl.marks].filter((m) => VOWELS.has(m) && m !== HOLAM && m !== HOLAM_HASER);
    if (prev && cl.letter === "ו" && ownVowels.length === 0) {
      if ((cl.marks.has(HOLAM) || cl.marks.has(HOLAM_HASER)) && !hasFullVowel(prev)) {
        prev.marks.delete(SHVA);
        prev.marks.add(HOLAM);
        continue;
      }
      if (cl.marks.has(DAGESH) && cl.marks.size === 1 && !hasFullVowel(prev)) {
        prev.marks.delete(SHVA);
        prev.marks.add(QUBUTS);
        continue;
      }
    }
    if (prev && cl.letter === "י" && cl.marks.size === 0 && [HIRIQ, TSERE, SEGOL].some((v) => prev.marks.has(v))) continue;
    if (cl.letter === "ו" && cl.marks.has(HOLAM_HASER)) {
      cl.marks.delete(HOLAM_HASER);
      cl.marks.add(HOLAM);
    }
    out.push(cl);
  }
  return out;
}

export function renderCluster(letter, marks) {
  const order = [DAGESH, ...VOWELS];
  return letter + order.filter((m) => marks.has(m)).join("");
}

// Builds the ק־ט־ל skeleton for one assignment of root letters to cluster indexes.
export function skeleton(cls, radicalIdx) {
  // A null index is a root letter missing from the form (weak roots)
  const radicalPos = new Map(radicalIdx.map((idx, n) => [idx, n]).filter(([idx]) => idx !== null));
  let out = "";
  cls.forEach((cl, i) => {
    const marks = new Set(cl.marks);
    marks.delete(SHIN_DOT);
    marks.delete(SIN_DOT);
    const isLast = i === cls.length - 1;
    if (radicalPos.has(i)) {
      const letter = baseLetter(cl.letter);
      for (const h of HATAF) if (marks.delete(h)) marks.add(SHVA);
      if (marks.has(DAGESH)) {
        const prev = cls[i - 1];
        const lene = BEGADKEFAT.has(letter) && (i === 0 || !hasFullVowel(prev));
        if (lene || (letter === "ה" && isLast)) marks.delete(DAGESH);
      }
      if (isLast && marks.has(PATACH) && "חעה".includes(letter) && hasFullVowel(cls[i - 1])) marks.delete(PATACH);
      if (isLast) marks.delete(SHVA);
      out += renderCluster(PLACEHOLDERS[radicalPos.get(i)], marks);
    } else {
      if (isLast) marks.delete(SHVA);
      out += renderCluster(cl.letter, marks);
    }
  });
  return nfc(out);
}

export function* radicalAssignments(cls, root) {
  const n = cls.length;
  for (let i = 0; i < n; i++) {
    if (baseLetter(cls[i].letter) !== root[0]) continue;
    for (let j = i + 1; j < n; j++) {
      if (baseLetter(cls[j].letter) !== root[1]) continue;
      for (let k = j + 1; k < n; k++) {
        if (baseLetter(cls[k].letter) === root[2]) yield [i, j, k];
      }
    }
  }
}

export function rootType(root) {
  const [a, b, c] = root;
  if (b === c) return "ע״ע";
  if (a === "נ") return "פ״נ";
  if (a === "י" || a === "ו") return "פ״י";
  if (b === "ו" || b === "י") return "ע״ו/ע״י";
  if (c === "ה" || c === "י" || c === "ו") return "ל״ה";
  return "שלם";
}

export const plainRoot = (s) => [...(s ?? "")].filter(isLetter).map(baseLetter).join("");

export function classify(form, root) {
  const cls = foldMatres(clusters(form));
  const assignments = [...radicalAssignments(cls, root)];
  if (assignments.length === 0) return { pattern: null, match: null };
  // Prefer the rightmost assignment: a prefix letter that repeats a root letter (מַמְלָכָה)
  // comes before the real one
  assignments.sort((x, y) => y[0] - x[0] || y[1] - x[1] || y[2] - x[2]);
  for (const a of assignments) {
    const key = skeleton(cls, a);
    const match = lookupPattern(key, root);
    if (match) return { pattern: key, match };
  }
  return { pattern: skeleton(cls, assignments[0]), match: null };
}

// Collects every lemma whose main-word morph code passes `isWanted`, with its token count and
// the frequency of its unprefixed, non-pausal forms that pass `isBaseForm` (e.g. singular absolute).
export function collectLemmas(db, isWanted, isBaseForm) {
  const lastWord = new Map();
  for (const r of db.prepare(`SELECT book, chapter, verse, MAX(wordNum) AS last FROM "WordEntry" GROUP BY book, chapter, verse`).all()) {
    lastWord.set(`${r.book}|${r.chapter}|${r.verse}`, r.last);
  }
  const lemmas = new Map();
  const rows = db.prepare(`SELECT book, chapter, verse, wordNum, word, lemma, morph FROM "WordEntry" WHERE morph LIKE 'H%'`).all();
  for (const r of rows) {
    const lemmaSegs = r.lemma.split("/");
    const morphSegs = r.morph.slice(1).split("/");
    const mainIdx = lemmaSegs.findIndex((s) => /^\d/.test(s.trim()));
    if (mainIdx < 0) continue;
    const code = morphSegs[mainIdx] ?? "";
    if (!isWanted(code)) continue;
    const number = `H${lemmaSegs[mainIdx].match(/^\d+/)[0]}`;
    let lemma = lemmas.get(number);
    if (!lemma) lemmas.set(number, (lemma = { tokens: 0, forms: new Map() }));
    lemma.tokens++;
    const plainForm = !r.morph.includes("/") && isBaseForm(code);
    const inPause = r.word.includes("֑") || lastWord.get(`${r.book}|${r.chapter}|${r.verse}`) === r.wordNum;
    // Maqaf-joined forms are compounds (בֶּן־חֶסֶד), not the word alone
    if (plainForm && !inPause && !r.word.includes("־")) {
      const form = clusters(r.word).map((c) => renderCluster(c.letter, c.marks) + (c.marks.has(SHIN_DOT) ? SHIN_DOT : c.marks.has(SIN_DOT) ? SIN_DOT : "")).join("");
      lemma.forms.set(form, (lemma.forms.get(form) ?? 0) + 1);
    }
  }
  return lemmas;
}

export function loadStrongs(db) {
  const strongs = new Map();
  for (const r of db.prepare(`SELECT number, lemmaHe, lemmaPlain, derivedFrom FROM "StrongsEntry"`).all()) {
    strongs.set(r.number, r);
  }
  return strongs;
}

export const topForm = (lemma) => [...lemma.forms].sort((a, b) => b[1] - a[1])[0]?.[0];
