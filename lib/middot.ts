// The thirteen middot of Rabbi Yishmael (Sifra, Baraita de-Rabbi Yishmael). Client-safe data.
//
// Each middah has the baraita's own wording and its own example (the Sifra gives one for each),
// plus further examples only where the source was checked on Sefaria: the ten kal va-chomer of
// Bereshit Rabbah 92:7, במועדו (Pesachim 66a), קיחה קיחה (Kiddushin 2a), הצד השוה (Mishnah Bava Kamma 1:1).
// Every verse below was checked against VerseText; `match` is the phrase to mark (prefixes allowed).

export type MiddahVerse = { book: string; chapter: number; verse: number; match?: string };
export type MiddahExample = { title: string; source: string; sefariaRef: string; explain: string; verses: MiddahVerse[] };
// A verse as shown on the page: words with nikud, `marked` = word indices to highlight
export type ShownVerse = { ref: string; href: string; words: string[]; marked: number[] };
// A further source found by Sefaria's search (lib/middotSources.ts): its text only when the edition's
// license allows (with attribution), and the verses Sefaria links to it
export type SourceItem = { ref: string; heRef: string; href: string; text: string | null; marks: [number, number][]; version: string | null; license: string | null; verses: ShownVerse[] };
export type SourcesPage = { items: SourceItem[]; total: number; next: number | null };
// `search`: the middah's own wording, searched in the sources; `exclude`: wording of a longer middah
// that contains it (כלל ופרט inside כלל ופרט וכלל)
export type Middah = {
  n: number;
  id: string;
  name: string;
  baraita: string;
  explain: string;
  search: string[];
  exclude?: string[];
  examples: MiddahExample[];
  more: MiddahExample[];
};

const SIFRA = "Sifra, Baraita DeRabbi Yishmael";
const fromSifra = (title: string, explain: string, verses: MiddahVerse[]): MiddahExample => ({
  title,
  source: "ספרא, ברייתא דרבי ישמעאל",
  sefariaRef: SIFRA,
  explain,
  verses,
});

const TEN_KAL_VACHOMER: [string, number, number, string, string][] = [
  ["Genesis", 44, 8, "הן כסף", "האחים: את הכסף שמצאנו בפי אמתחותינו השבנו, ואיך נגנוב כסף או זהב?"],
  ["Exodus", 6, 12, "הן בני ישראל לא שמעו אלי", "משה: בני ישראל לא שמעו לי, ואיך ישמע פרעה?"],
  ["Deuteronomy", 31, 27, "הן בעודני חי", "משה: בחיי הייתם ממרים, ואף כי אחרי מותי."],
  ["I Samuel", 23, 3, "הנה אנחנו פה ביהודה יראים", "אנשי דוד: כאן ביהודה אנחנו יראים, ואף כי נלך קעילה."],
  ["Jeremiah", 12, 5, "כי את רגלים רצתה וילאוך", "ירמיהו: אם רגלים הלאו אותך, איך תתחרה בסוסים? (ובאותו פסוק עוד קל וחומר: ״ובארץ שלום… ואיך תעשה בגאון הירדן״)."],
  ["Ezekiel", 15, 5, "הנה בהיותו תמים", "עץ הגפן: כשהיה שלם לא נעשה ממנו כלי, ואף כי אש אכלתהו."],
  ["Proverbs", 11, 31, "הן צדיק בארץ ישלם", "אם הצדיק נענש בארץ, אף כי רשע וחוטא."],
  ["Esther", 9, 12, "בשושן הבירה הרגו", "המלך: בשושן לבדה הרגו חמש מאות, בשאר מדינות המלך מה עשו?"],
];

export const MIDDOT: Middah[] = [
  {
    n: 1,
    id: "kal-vachomer",
    search: ["קל וחומר"],
    name: "קל וחומר",
    baraita: "מקל וחומר",
    explain:
      "היסק מן הקל אל החמור (או להפך): אם דין מסוים חל במקרה ה״קל״, קל וחומר שהוא חל במקרה ה״חמור״. כלל חשוב נלווה: ״דיו לבא מן הדין להיות כנדון״, המסקנה אינה יכולה להיות חמורה יותר מהמקור שממנו למדנו.",
    examples: [
      fromSifra(
        "מרים",
        "״ואביה ירק ירק בפניה הלא תכלם שבעת ימים״: אם מפני אביה הייתה נכלמת שבעה ימים, קל וחומר מפני השכינה, ארבעה עשר יום. אבל ״דיו לבא מן הדין להיות כנדון״, ולכן ״תסגר שבעת ימים״.",
        [{ book: "Numbers", chapter: 12, verse: 14, match: "ואביה ירק ירק בפניה" }]
      ),
    ],
    more: TEN_KAL_VACHOMER.map(([book, chapter, verse, match, explain]) => ({
      title: "מעשרה קלים וחמורים שבתורה",
      source: "בראשית רבה צב, ז: ״תני רבי ישמעאל: זה אחד מעשרה קלים וחמורין שכתובים בתורה״",
      sefariaRef: "Bereshit Rabbah 92:7",
      explain,
      verses: [{ book, chapter, verse, match }],
    })),
  },
  {
    n: 2,
    id: "gezerah-shavah",
    search: ["גזירה שוה", "גזרה שוה"],
    name: "גזרה שוה",
    baraita: "מגזירה שוה",
    explain:
      "מילה או ביטוי זהים בשני מקומות בתורה מלמדים שהדין של מקום אחד חל גם בשני. לפי חז״ל אין אדם דן גזרה שוה מעצמו, אלא אם כן קיבלה מרבו (פסחים סו, א).",
    examples: [
      fromSifra(
        "שומר חינם ושומר שכר",
        "בשני השומרים נאמר ״אם לא שלח ידו במלאכת רעהו״. ״מה בשומר חנם… פטר את היורשין, אף בשומר שכר… יפטור בו את היורשים״: הדין שנלמד באחד חל גם בשני.",
        [
          { book: "Exodus", chapter: 22, verse: 7, match: "אם לא שלח ידו במלאכת רעהו" },
          { book: "Exodus", chapter: 22, verse: 10, match: "אם לא שלח ידו במלאכת רעהו" },
        ]
      ),
    ],
    more: [
      {
        title: "״במועדו״: הפסח דוחה את השבת",
        source: "פסחים סו, א (הלל לפני בני בתירא)",
        sefariaRef: "Pesachim 66a",
        explain: "בפסח נאמר ״במועדו״ ובקרבן התמיד נאמר ״במועדו״. כמו שהתמיד קרב גם בשבת, כך גם הפסח.",
        verses: [
          { book: "Numbers", chapter: 9, verse: 2, match: "במועדו" },
          { book: "Numbers", chapter: 28, verse: 2, match: "במועדו" },
        ],
      },
      {
        title: "״קיחה קיחה משדה עפרון״: קידושין בכסף",
        source: "קידושין ב, א",
        sefariaRef: "Kiddushin 2a",
        explain: "באישה נאמר ״כי יקח איש אשה״ ובשדה עפרון נאמר ״קח ממני״. כמו שהשדה נקנה בכסף, כך אישה מתקדשת בכסף.",
        verses: [
          { book: "Deuteronomy", chapter: 24, verse: 1, match: "כי יקח איש אשה" },
          { book: "Genesis", chapter: 23, verse: 13, match: "קח ממני" },
        ],
      },
    ],
  },
  {
    n: 3,
    id: "binyan-av",
    search: ["בנין אב", "הצד השוה"],
    name: "בנין אב",
    baraita: "מבנין אב מכתוב אחד, ומבנין אב משני כתובים",
    explain:
      "דין שנאמר במקום אחד הופך ל״אב״, דגם, לכל המקרים הדומים לו. כשהוא נבנה משני כתובים, מחפשים את ״הצד השוה״, המשותף לשניהם, ומחילים את הדין על כל מה שיש בו אותו צד.",
    examples: [
      fromSifra(
        "מכתוב אחד: משכב ומושב",
        "מה משותף למשכב ולמושב של הזב? שניהם כלים שנועדו שאדם ינוח עליהם. מכאן שכל כלי כזה מיטמא בזב, ויצא המרכב, שאינו עשוי לכך.",
        [
          { book: "Leviticus", chapter: 15, verse: 4, match: "כל המשכב" },
          { book: "Leviticus", chapter: 15, verse: 9, match: "וכל המרכב" },
        ]
      ),
      fromSifra(
        "משני כתובים: ״צו״",
        "בפרשת הנרות ובפרשת שילוח הטמאים נאמר ״צו את בני ישראל״, ושתיהן חלות מיד ולדורות. מכאן שכל מקום שנאמר בו ״צו״, הוא מיד ולדורות.",
        [
          { book: "Leviticus", chapter: 24, verse: 2, match: "צו את בני ישראל" },
          { book: "Numbers", chapter: 5, verse: 2, match: "צו את בני ישראל" },
        ]
      ),
    ],
    more: [
      {
        title: "״הצד השוה שבהן״: ארבעה אבות נזיקין",
        source: "משנה בבא קמא א, א",
        sefariaRef: "Mishnah Bava Kamma 1:1",
        explain: "השור, הבור, המבעה וההבער שונים זה מזה, ״הצד השוה שבהן, שדרכן להזיק ושמירתן עליך״: מכאן חובת התשלום על כל נזק שיש בו הצדדים האלה.",
        verses: [],
      },
    ],
  },
  {
    n: 4,
    id: "klal-uprat",
    search: ["כלל ופרט"],
    exclude: ["כלל ופרט וכלל"],
    name: "כלל ופרט",
    baraita: "מכלל ופרט",
    explain: "כשהכתוב אומר תחילה כלל ואחריו פרט, ״אין בכלל אלא מה שבפרט״: הכלל מוגבל לפרטים שנמנו.",
    examples: [
      fromSifra(
        "מן הבהמה, מן הבקר ומן הצאן",
        "״מן הבהמה״ הוא כלל, ״מן הבקר ומן הצאן״ הוא פרט. לכן קרבן בא רק מבקר ומצאן, ולא מחיות.",
        [{ book: "Leviticus", chapter: 1, verse: 2, match: "מן הבהמה מן הבקר ומן הצאן" }]
      ),
    ],
    more: [],
  },
  {
    n: 5,
    id: "prat-ukhlal",
    search: ["פרט וכלל"],
    exclude: ["כלל ופרט וכלל"],
    name: "פרט וכלל",
    baraita: "מפרט וכלל",
    explain: "כשהפרט בא קודם והכלל אחריו, ״נעשה כלל מוסף על הפרט״: הכלל מרחיב את הדין מעבר לפרטים.",
    examples: [
      fromSifra(
        "חמור או שור או שה, וכל בהמה",
        "״חמור או שור או שה״ הוא פרט, ״וכל בהמה לשמר״ הוא כלל. לכן דיני השומרים חלים על כל דבר, לא רק על הבהמות שנמנו.",
        [{ book: "Exodus", chapter: 22, verse: 9, match: "חמור או שור או שה" }]
      ),
    ],
    more: [],
  },
  {
    n: 6,
    id: "klal-uprat-ukhlal",
    search: ["כלל ופרט וכלל"],
    name: "כלל ופרט וכלל",
    baraita: "מכלל ופרט וכלל, אי אתה דן אלא כעין הפרט",
    explain: "כלל, אחריו פרט, ואחריו שוב כלל: הדין חל על כל מה שדומה לפרט, ולא יותר.",
    examples: [
      fromSifra(
        "מעשר שני",
        "״בכל אשר תאוה נפשך״ כלל, ״בבקר ובצאן וביין ובשכר״ פרט, ״ובכל אשר תשאלך נפשך״ חזר וכלל. מה הפרט ולד ולדות הארץ, אף כל ולד ולדות הארץ, ״יצאו כמהין ופטריות״.",
        [{ book: "Deuteronomy", chapter: 14, verse: 26, match: "בבקר ובצאן" }]
      ),
    ],
    more: [],
  },
  {
    n: 7,
    id: "klal-tzarich",
    search: ["צריך לפרט", "צריך לכלל"],
    name: "כלל שהוא צריך לפרט ופרט שהוא צריך לכלל",
    baraita: "מכלל שהוא צריך לפרט, ומפרט שהוא צריך לכלל",
    explain: "כשהכלל והפרט אינם עומדים כל אחד לבדו, אלא כל אחד צריך את השני כדי להבין את משמעותו. כאן לא מפעילים את הכללים הקודמים, אלא קוראים אותם יחד.",
    examples: [
      fromSifra(
        "בכור",
        "״קדש לי כל בכור״: אולי גם נקבה? לכן נאמר ״זכר״. ואולי גם מי שקדם לו אחר? לכן ״פטר רחם״. ואולי גם מי שבא אחרי יוצא דופן? לכן ״בכור״.",
        [
          { book: "Exodus", chapter: 13, verse: 2, match: "קדש לי כל בכור" },
          { book: "Deuteronomy", chapter: 15, verse: 19, match: "הזכר" },
        ]
      ),
    ],
    more: [],
  },
  {
    n: 8,
    id: "yatza-lelamed",
    search: ["ללמד על עצמו יצא", "יצא ללמד"],
    name: "דבר שהיה בכלל ויצא ללמד",
    baraita: "כל דבר שהיה בכלל ויצא מן הכלל ללמד, לא ללמד על עצמו יצא, אלא ללמד על הכלל כולו יצא",
    explain: "כשפרט אחד מתוך כלל נזכר בנפרד עם דין מסוים, הדין חל על כל הכלל, ולא רק עליו.",
    examples: [
      fromSifra(
        "טומאת קדשים",
        "השלמים כלולים בכל הקדשים (״זאת התורה לעלה למנחה…״), ובכל זאת נאמר עליהם לבדם כרת למי שאוכל אותם בטומאה. הם יצאו ללמד על כל הקדשים שקדושתם קדושת מזבח.",
        [
          { book: "Leviticus", chapter: 7, verse: 20, match: "מזבח השלמים" },
          { book: "Leviticus", chapter: 7, verse: 37, match: "זאת התורה לעלה למנחה" },
        ]
      ),
    ],
    more: [],
  },
  {
    n: 9,
    id: "yatza-litoen-kinyano",
    search: ["שהוא כענינו"],
    name: "יצא לטעון טוען אחד שהוא כענינו",
    baraita: "כל דבר שהיה בכלל ויצא מן הכלל לטעון טוען אחד שהוא כענינו, יצא להקל ולא להחמיר",
    explain: "פרט שיצא מן הכלל עם דין משלו, דומה לדין הכלל: הוא בא להקל עליו, ולא להחמיר.",
    examples: [
      fromSifra(
        "שחין ומכוה",
        "השחין והמכוה הם נגעים, אבל נזכרו לבדם בדין דומה. לכן הם נידונים בקולא: לא במחיה, ורק בהסגר של שבוע אחד.",
        [
          { book: "Leviticus", chapter: 13, verse: 18, match: "שחין" },
          { book: "Leviticus", chapter: 13, verse: 24, match: "מכות אש" },
        ]
      ),
    ],
    more: [],
  },
  {
    n: 10,
    id: "yatza-litoen-shelo-kinyano",
    search: ["שלא כענינו"],
    name: "יצא לטעון טוען אחר שלא כענינו",
    baraita: "כל דבר שהיה בכלל ויצא מן הכלל לטעון טוען אחר שלא כענינו, יצא להקל ולהחמיר",
    explain: "פרט שיצא מן הכלל עם דין שונה מדין הכלל: יש בו גם קולא וגם חומרה.",
    examples: [
      fromSifra(
        "נגע בראש ובזקן",
        "הראש והזקן הם עור ובשר, אבל נזכרו לבדם בדין אחר (נתק). להקל: לא נידונים בשער לבן. להחמיר: נידונים בשער צהוב.",
        [{ book: "Leviticus", chapter: 13, verse: 29, match: "נגע בראש או בזקן" }]
      ),
    ],
    more: [],
  },
  {
    n: 11,
    id: "yatza-ladon",
    search: ["לידון בדבר החדש"],
    name: "יצא לידון בדבר החדש",
    baraita: "כל דבר שהיה בכלל ויצא מן הכלל לידון בדבר החדש, אי אתה יכול להחזירו לכללו עד שיחזירנו הכתוב לכללו בפירוש",
    explain: "פרט שיצא מן הכלל עם דין חדש לגמרי אינו חוזר לדיני הכלל, אלא אם הכתוב מחזיר אותו במפורש.",
    examples: [
      fromSifra(
        "אשם מצורע",
        "דמו של אשם המצורע ניתן על הבוהן והאוזן, דין חדש. לכן היה אפשר לחשוב שאינו ניתן על המזבח, עד שהכתוב החזירו במפורש: ״כי כחטאת האשם הוא לכהן״.",
        [{ book: "Leviticus", chapter: 14, verse: 13, match: "כי כחטאת האשם הוא לכהן" }]
      ),
    ],
    more: [],
  },
  {
    n: 12,
    id: "mainyano-misofo",
    search: ["הלמד מענינו", "למד מענינו", "הלמד מסופו", "למד מסופו"],
    name: "דבר הלמד מעניינו, ודבר הלמד מסופו",
    baraita: "דבר הלמד מעניינו, ודבר הלמד מסופו",
    explain: "מילה או דין שמובנים מתוך ההקשר שלהם, מהפסוקים שסביבם או מהמשך הפרשה.",
    examples: [
      fromSifra(
        "מעניינו: קרח טהור הוא",
        "״קרח הוא טהור הוא״, אולי מכל טומאה? ההקשר (״וכי יהיה בקרחת… נגע לבן אדמדם״) מלמד שהוא טהור רק מטומאת נתקים.",
        [
          { book: "Leviticus", chapter: 13, verse: 40, match: "קרח הוא טהור הוא" },
          { book: "Leviticus", chapter: 13, verse: 42, match: "וכי יהיה בקרחת" },
        ]
      ),
      fromSifra(
        "מסופו: נגע בבית",
        "״ונתתי נגע צרעת בבית״, אולי כל בית? סוף הפרשה, ״ונתץ את הבית את אבניו ואת עציו ואת כל עפר הבית״, מלמד שרק בית שיש בו אבנים, עצים ועפר.",
        [
          { book: "Leviticus", chapter: 14, verse: 34, match: "ונתתי נגע צרעת" },
          { book: "Leviticus", chapter: 14, verse: 45, match: "ונתץ את הבית" },
        ]
      ),
    ],
    more: [],
  },
  {
    n: 13,
    id: "shnei-ktuvim",
    search: ["הכתוב השלישי"],
    name: "שני כתובים המכחישים זה את זה",
    baraita: "וכן שני כתובים המכחישים זה את זה, עד שיבוא הכתוב השלישי ויכריע ביניהם",
    explain: "כששני פסוקים נראים סותרים, מחפשים פסוק שלישי שמיישב ביניהם.",
    examples: [
      fromSifra(
        "מעמד הר סיני",
        "״וירד ה׳ על הר סיני״ מול ״מן השמים השמיעך את קלו״. הכריע השלישי: ״כי מן השמים דברתי עמכם״. מלמד שהרכין הקב״ה את השמים על הר סיני ודיבר עמהם.",
        [
          { book: "Exodus", chapter: 19, verse: 20, match: "וירד יהוה על הר סיני" },
          { book: "Deuteronomy", chapter: 4, verse: 36, match: "מן השמים השמיעך את קלו" },
          { book: "Exodus", chapter: 20, verse: 22, match: "כי מן השמים דברתי עמכם" },
        ]
      ),
      fromSifra(
        "משה ואהל מועד",
        "״ובבא משה אל אהל מועד״ מול ״ולא יכל משה לבוא אל אהל מועד״. הכריע: ״כי שכן עליו הענן״. כל זמן שהענן שם, משה לא נכנס; כשנסתלק, נכנס ודיבר עמו.",
        [
          { book: "Numbers", chapter: 7, verse: 89, match: "ובבא משה אל אהל מועד" },
          { book: "Exodus", chapter: 40, verse: 35, match: "ולא יכל משה לבוא" },
        ]
      ),
    ],
    more: [],
  },
];
