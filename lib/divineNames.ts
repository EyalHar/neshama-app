// Names and titles of God in the Tanakh, with key verses. A curated list: every key verse was
// checked to contain `match` (letters only, prefixes allowed) in VerseText.plainText, and each
// `count` (Strong's numbers or an exact phrase) checked to resolve to the intended name. Check
// any new entry the same way, against the data, not from memory. Client-safe (no Prisma).

export type DivineNameGroup = "names" | "titles" | "given";

export const DIVINE_NAME_GROUPS: { id: DivineNameGroup; title: string; intro: string }[] = [
  { id: "names", title: "השמות", intro: "השמות עצמם, ובהם שבעת השמות ״שאינם נמחקים״" },
  { id: "titles", title: "כינויים", intro: "צירופים שבהם התנ״ך מכנה את ה׳: לפי מעשיו, לפי יחסו לעמו או לאבות" },
  { id: "given", title: "שמות שניתנו למקום, למזבח ולעיר", intro: "שמות שבני אדם קראו למקום, למזבח או לעיר, ובהם שם ה׳" },
];

export type KeyVerse = { book: string; chapter: number; verse: number; match?: string };

export type DivineName = {
  id: string;
  name: string; // with nikud
  group: DivineNameGroup;
  about: string;
  match: string; // letters only, as in VerseText.plainText; highlighted in the key verses
  verses: KeyVerse[]; // `match` on a verse overrides the name's
  // How the occurrences are counted: the lexeme's Strong's numbers, or the exact phrase
  count?: { strongs: string[]; note?: string } | { phrase: string };
  seven?: boolean; // one of the seven names that may not be erased (Rambam, Yesodei HaTorah 6:2)
};

export const DIVINE_NAMES: DivineName[] = [
  {
    id: "yhwh",
    name: "יְהוָה",
    group: "names",
    about: "השם המיוחד, שם הוי״ה. בסנה נאמר למשה ״זֶה שְּׁמִי לְעֹלָם״. בקריאה הוא נהגה ״אֲדֹנָי״.",
    match: "יהוה",
    verses: [
      { book: "Genesis", chapter: 2, verse: 4 },
      { book: "Exodus", chapter: 3, verse: 15 },
      { book: "Exodus", chapter: 6, verse: 3 },
    ],
    // Every word written יהוה: H3068, יֱהוִה after אֲדֹנָי (H3069) and ״יְהוָה נִסִּי״ (H3071, Ex 17:15) —
    // 6,828 words in 5,790 verses, the traditional count
    count: { strongs: ["H3068", "H3069", "H3071"] },
    seven: true,
  },
  {
    id: "elohim",
    name: "אֱלֹהִים",
    group: "names",
    about: "השם שבו פותחת התורה. אותה מילה משמשת גם לאלים אחרים (״אֱלֹהִים אֲחֵרִים״).",
    match: "אלהים",
    verses: [{ book: "Genesis", chapter: 1, verse: 1 }],
    count: { strongs: ["H430"], note: "כולל ״אלהים אחרים״ ושימושים דומים" },
    seven: true,
  },
  {
    id: "el",
    name: "אֵל",
    group: "names",
    about: "שם קצר, לרוב בצירופים: אֵל עֶלְיוֹן, אֵל שַׁדַּי, אֵל עוֹלָם.",
    match: "אל",
    verses: [
      { book: "Genesis", chapter: 14, verse: 18, match: "אל עליון" },
      { book: "Numbers", chapter: 23, verse: 19, match: "אל" },
    ],
    count: { strongs: ["H410"], note: "כולל אלים אחרים" },
    seven: true,
  },
  {
    id: "eloah",
    name: "אֱלוֹהַּ",
    group: "names",
    about: "צורת היחיד של אֱלֹהִים. רוב המופעים בספר איוב.",
    match: "אלוה",
    verses: [
      { book: "Deuteronomy", chapter: 32, verse: 15 },
      { book: "Habakkuk", chapter: 3, verse: 3 },
      { book: "Job", chapter: 3, verse: 4 },
    ],
    count: { strongs: ["H433"] },
    seven: true,
  },
  {
    id: "adonai",
    name: "אֲדֹנָי",
    group: "names",
    about: "״אֲדֹנָי״ בקמץ הוא שם ה׳, בשונה מ״אֲדֹנִי״ שנאמר לאדם.",
    match: "אדני",
    verses: [
      { book: "Genesis", chapter: 15, verse: 2 },
      { book: "Psalms", chapter: 51, verse: 17 },
    ],
    count: { strongs: ["H136"] },
    seven: true,
  },
  {
    id: "shaddai",
    name: "שַׁדַּי",
    group: "names",
    about: "לרוב בצירוף ״אֵל שַׁדַּי״, השם שבו נגלה ה׳ לאבות. בספר איוב גם לבדו.",
    match: "שדי",
    verses: [
      { book: "Genesis", chapter: 17, verse: 1, match: "אל שדי" },
      { book: "Exodus", chapter: 6, verse: 3, match: "אל שדי" },
      { book: "Ruth", chapter: 1, verse: 20 },
    ],
    count: { strongs: ["H7706"] },
    seven: true,
  },
  {
    id: "tzevaot",
    name: "צְבָאוֹת",
    group: "names",
    about: "בצירוף ״יְהוָה צְבָאוֹת״. הצירוף אינו מופיע בתורה, ולראשונה הוא נאמר בשילה.",
    match: "יהוה צבאות",
    verses: [
      { book: "I Samuel", chapter: 1, verse: 3 },
      { book: "Isaiah", chapter: 6, verse: 3 },
    ],
    count: { phrase: "יהוה צבאות" },
    seven: true,
  },
  {
    id: "yah",
    name: "יָהּ",
    group: "names",
    about: "צורה קצרה של השם, בשירה ובתהלים: ״עָזִּי וְזִמְרָת יָהּ״.",
    match: "יה",
    verses: [
      { book: "Exodus", chapter: 15, verse: 2 },
      { book: "Psalms", chapter: 118, verse: 5 },
    ],
    count: { strongs: ["H3050"] },
  },
  {
    id: "ehyeh",
    name: "אֶהְיֶה אֲשֶׁר אֶהְיֶה",
    group: "names",
    about: "התשובה שקיבל משה בסנה כששאל מה לומר לבני ישראל על שם ה׳.",
    match: "אהיה אשר אהיה",
    verses: [{ book: "Exodus", chapter: 3, verse: 14 }],
  },

  {
    id: "elyon",
    name: "אֵל עֶלְיוֹן",
    group: "titles",
    about: "כינוי שבו ברך מלכי צדק את אברם, ״קֹנֵה שָׁמַיִם וָאָרֶץ״. גם ״עֶלְיוֹן״ לבדו.",
    match: "אל עליון",
    verses: [
      { book: "Genesis", chapter: 14, verse: 19 },
      { book: "Deuteronomy", chapter: 32, verse: 8, match: "עליון" },
      { book: "Psalms", chapter: 91, verse: 1, match: "עליון" },
    ],
    count: { phrase: "אל עליון" },
  },
  { id: "el-olam", name: "אֵל עוֹלָם", group: "titles", about: "השם שבו קרא אברהם בבאר שבע, אחרי שנטע שם אשל.", match: "אל עולם", verses: [{ book: "Genesis", chapter: 21, verse: 33 }] },
  { id: "el-roi", name: "אֵל רֳאִי", group: "titles", about: "כך קראה הגר לה׳ שדיבר אליה במדבר, ועל שמו נקראה הבאר ״בְּאֵר לַחַי רֹאִי״.", match: "אל ראי", verses: [{ book: "Genesis", chapter: 16, verse: 13 }] },
  {
    id: "pachad-yitzchak",
    name: "פַּחַד יִצְחָק",
    group: "titles",
    about: "כינוי שבו קרא יעקב לאלהי אביו, בדבריו ללבן.",
    match: "פחד יצחק",
    verses: [
      { book: "Genesis", chapter: 31, verse: 42 },
      { book: "Genesis", chapter: 31, verse: 53, match: "פחד אביו יצחק" },
    ],
  },
  {
    id: "avir-yaakov",
    name: "אֲבִיר יַעֲקֹב",
    group: "titles",
    about: "כינוי שבברכת יעקב ליוסף, ושוב בישעיהו ובתהלים.",
    match: "אביר יעקב",
    verses: [
      { book: "Genesis", chapter: 49, verse: 24 },
      { book: "Psalms", chapter: 132, verse: 2 },
    ],
    count: { phrase: "אביר יעקב" },
  },
  {
    id: "el-kana",
    name: "אֵל קַנָּא",
    group: "titles",
    about: "בעשרת הדברות ובאיסור עבודה זרה: ״כִּי יְהוָה קַנָּא שְׁמוֹ״.",
    match: "אל קנא",
    verses: [
      { book: "Exodus", chapter: 20, verse: 5 },
      { book: "Exodus", chapter: 34, verse: 14 },
    ],
    count: { phrase: "אל קנא" },
  },
  { id: "rachum", name: "אֵל רַחוּם וְחַנּוּן", group: "titles", about: "פתיחת י״ג המידות, שנאמרו למשה אחרי חטא העגל.", match: "אל רחום וחנון", verses: [{ book: "Exodus", chapter: 34, verse: 6 }] },
  { id: "el-emuna", name: "אֵל אֱמוּנָה", group: "titles", about: "בשירת האזינו: ״אֵל אֱמוּנָה וְאֵין עָוֶל״.", match: "אל אמונה", verses: [{ book: "Deuteronomy", chapter: 32, verse: 4 }] },
  {
    id: "elohei-haelohim",
    name: "אֱלֹהֵי הָאֱלֹהִים וַאֲדֹנֵי הָאֲדֹנִים",
    group: "titles",
    about: "בדברי משה בספר דברים, ובתהלים קלו: ״הוֹדוּ לֵאלֹהֵי הָאֱלֹהִים״, ״הוֹדוּ לַאֲדֹנֵי הָאֲדֹנִים״.",
    match: "אלהי האלהים ואדני האדנים",
    verses: [
      { book: "Deuteronomy", chapter: 10, verse: 17 },
      { book: "Psalms", chapter: 136, verse: 2, match: "אלהי האלהים" },
    ],
  },
  {
    id: "hagadol",
    name: "הָאֵל הַגָּדֹל הַגִּבֹּר וְהַנּוֹרָא",
    group: "titles",
    about: "באותו פסוק בדברים, ובתפילת נחמיה. ממנו נלקחה פתיחת תפילת העמידה.",
    match: "האל הגדל הגבר והנורא",
    verses: [
      { book: "Deuteronomy", chapter: 10, verse: 17 },
      { book: "Nehemiah", chapter: 9, verse: 32, match: "האל הגדול הגבור והנורא" },
    ],
  },
  {
    id: "el-chai",
    name: "אֵל חָי",
    group: "titles",
    about: "״בְּזֹאת תֵּדְעוּן כִּי אֵל חַי בְּקִרְבְּכֶם״, לפני מעבר הירדן.",
    match: "אל חי",
    verses: [
      { book: "Joshua", chapter: 3, verse: 10 },
      { book: "Psalms", chapter: 42, verse: 3 },
    ],
    count: { phrase: "אל חי" },
  },
  {
    id: "kedosh-yisrael",
    name: "קְדוֹשׁ יִשְׂרָאֵל",
    group: "titles",
    about: "הכינוי האופייני לספר ישעיהו.",
    match: "קדוש ישראל",
    verses: [
      { book: "Isaiah", chapter: 1, verse: 4 },
      { book: "II Kings", chapter: 19, verse: 22 },
    ],
    count: { phrase: "קדוש ישראל" },
  },
  {
    id: "tzur-yisrael",
    name: "צוּר יִשְׂרָאֵל",
    group: "titles",
    about: "בדברי דוד האחרונים, ובישעיהו.",
    match: "צור ישראל",
    verses: [
      { book: "II Samuel", chapter: 23, verse: 3 },
      { book: "Isaiah", chapter: 30, verse: 29 },
    ],
    count: { phrase: "צור ישראל" },
  },
  { id: "goel", name: "גֹּאֵל יִשְׂרָאֵל", group: "titles", about: "בנבואות הנחמה של ישעיהו.", match: "גאל ישראל", verses: [{ book: "Isaiah", chapter: 49, verse: 7 }], count: { phrase: "גאל ישראל" } },
  { id: "roeh", name: "רֹעֵה יִשְׂרָאֵל", group: "titles", about: "״רֹעֵה יִשְׂרָאֵל הַאֲזִינָה״, בתהלים.", match: "רעה ישראל", verses: [{ book: "Psalms", chapter: 80, verse: 2 }] },
  { id: "melech-hakavod", name: "מֶלֶךְ הַכָּבוֹד", group: "titles", about: "״שְׂאוּ שְׁעָרִים רָאשֵׁיכֶם״, בתהלים כד.", match: "מלך הכבוד", verses: [{ book: "Psalms", chapter: 24, verse: 7 }], count: { phrase: "מלך הכבוד" } },
  {
    id: "atik-yomin",
    name: "עַתִּיק יוֹמִין",
    group: "titles",
    about: "בארמית, בחזון דניאל על הכיסאות והמלכויות. בהמשך הפרק: ״עַתִּיק יוֹמַיָּא״.",
    match: "עתיק יומין",
    verses: [
      { book: "Daniel", chapter: 7, verse: 9 },
      { book: "Daniel", chapter: 7, verse: 13, match: "עתיק יומיא" },
    ],
  },

  { id: "hashem-yireh", name: "יְהוָה יִרְאֶה", group: "given", about: "השם שקרא אברהם למקום העקדה.", match: "יהוה יראה", verses: [{ book: "Genesis", chapter: 22, verse: 14 }] },
  { id: "el-elohei-yisrael", name: "אֵל אֱלֹהֵי יִשְׂרָאֵל", group: "given", about: "השם שקרא יעקב למזבח שהקים בשכם.", match: "אל אלהי ישראל", verses: [{ book: "Genesis", chapter: 33, verse: 20 }] },
  { id: "el-beit-el", name: "אֵל בֵּית אֵל", group: "given", about: "השם שקרא יעקב למקום המזבח בבית אל.", match: "אל בית אל", verses: [{ book: "Genesis", chapter: 35, verse: 7 }] },
  { id: "hashem-nisi", name: "יְהוָה נִסִּי", group: "given", about: "השם שקרא משה למזבח אחרי המלחמה בעמלק.", match: "יהוה נסי", verses: [{ book: "Exodus", chapter: 17, verse: 15 }] },
  { id: "hashem-shalom", name: "יְהוָה שָׁלוֹם", group: "given", about: "השם שקרא גדעון למזבח שבנה בעפרה.", match: "יהוה שלום", verses: [{ book: "Judges", chapter: 6, verse: 24 }] },
  {
    id: "hashem-tzidkenu",
    name: "יְהוָה צִדְקֵנוּ",
    group: "given",
    about: "בירמיהו: שמו של המלך מבית דוד, ובפרק לג שמה של ירושלים.",
    match: "יהוה צדקנו",
    verses: [
      { book: "Jeremiah", chapter: 23, verse: 6 },
      { book: "Jeremiah", chapter: 33, verse: 16 },
    ],
  },
  { id: "hashem-shama", name: "יְהוָה שָׁמָּה", group: "given", about: "שמה של העיר, בפסוק האחרון של ספר יחזקאל.", match: "יהוה שמה", verses: [{ book: "Ezekiel", chapter: 48, verse: 35 }] },
];

const PREFIX = "[ובכלמהש]{0,3}";

// Where `match` (letters only, space-separated) occurs in a verse's words: the word indexes
// covered, allowing prefixes on its first word (לְאֵל חָי, וַיהוָה צְבָאוֹת). `plainWords`: the verse's
// words as letters only.
export function findMatch(plainWords: string[], match: string): number[] {
  const parts = match.split(" ");
  const first = new RegExp(`^${PREFIX}${parts[0]}$`);
  for (let i = 0; i + parts.length <= plainWords.length; i++) {
    if (first.test(plainWords[i]) && parts.slice(1).every((p, k) => plainWords[i + 1 + k] === p)) {
      return parts.map((_, k) => i + k);
    }
  }
  return [];
}
