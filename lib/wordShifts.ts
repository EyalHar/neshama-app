// "גלגולי מילים": biblical words whose everyday meaning today is different. A hand-picked list:
// each entry is tied to its Strong's number, and its biblical sense follows Strong's definition and
// the verses (checked against the data when written). `ref` is the verse to show; when it doesn't
// contain the word, the page falls back to the word's first occurrence.

export type WordShift = {
  strongs: string;
  then: string;
  now: string;
  ref?: [book: string, chapter: number, verse: number];
};

export const WORD_SHIFTS: WordShift[] = [
  { strongs: "H2830", then: "מתכת בוהקת (כנראה סגסוגת מלוטשת) במראה המרכבה של יחזקאל", now: "חשמל", ref: ["Ezekiel", 1, 4] },
  { strongs: "H4350", then: "כַּן, בסיס, כמו מכונות הכיורים במקדש שלמה", now: "מכונה", ref: ["I Kings", 7, 27] },
  { strongs: "H688", then: "אבן חן לוהטת", now: "אקדח" },
  { strongs: "H7784", then: "רחוב בעיר", now: "שוק, מקום מסחר" },
  { strongs: "H7339", then: "רחבה, מקום פתוח בעיר, לרוב ליד השער", now: "רחוב" },
  { strongs: "H4082", then: "מחוז שיפוט, פלך בממלכה", now: "מדינה ריבונית", ref: ["Esther", 1, 1] },
  { strongs: "H7860", then: "פקיד ממונה, סופר", now: "שוטר", ref: ["Exodus", 5, 6] },
  { strongs: "H4388", then: "כלי לכתישה, ובהשאלה שקע", now: "מכתש, עמק סגור בנגב" },
  { strongs: "H4385", then: "כתב, דבר כתוב", now: "מכתב ששולחים", ref: ["Exodus", 32, 16] },
  { strongs: "H8466", then: "מקום חניה של מחנה", now: "תחנה (של רכבת, של אוטובוס)" },
  { strongs: "H212", then: "גלגל", now: "דרך, צורה (\"באופן\"), ומכאן גם אופניים", ref: ["Ezekiel", 1, 15] },
  { strongs: "H2876", then: "שוחט, ובהשאלה משמר המלך (\"שר הטבחים\")", now: "טבח, מבשל", ref: ["Genesis", 37, 36] },
  { strongs: "H4201", then: "עמוד הפתח, המשקוף הצדדי של הדלת", now: "הקלף שקובעים על המשקוף" },
  { strongs: "H4208", then: "קבוצות כוכבים, מזלות השמים", now: "מזל, הצלחה" },
  { strongs: "H727", then: "תיבה, ארגז: ארון הברית, וגם ארון מתים", now: "ארון בגדים, ארון ספרים" },
  { strongs: "H4093", then: "דעת, תבונה", now: "מדע", ref: ["Ecclesiastes", 10, 20] },
  { strongs: "H8635", then: "רבייה, צאצאים (\"תרבות אנשים חטאים\")", now: "תרבות" },
  { strongs: "H8615", then: "חבל (\"תקות חוט השני\"), וגם תקווה", now: "תקווה בלבד", ref: ["Joshua", 2, 18] },
  { strongs: "H3658", then: "כלי מיתרים קטן, נבל יד", now: "כינור, כלי קשת" },
  { strongs: "H4236", then: "חזון, מראה נבואי", now: "מחזה, הצגה" },
  { strongs: "H8544", then: "צורה, דמות", now: "תמונה, ציור, צילום", ref: ["Deuteronomy", 4, 12] },
  { strongs: "H226", then: "סימן (\"אות הברית\", \"אותות ומופתים\")", now: "אות, אחת מאותיות האלפבית", ref: ["Genesis", 9, 12] },
  { strongs: "H4175", then: "גם \"יורה\", הגשם הראשון של השנה (\"מורה ומלקוש\")", now: "מורה, מלמד", ref: ["Joel", 2, 23] },
  { strongs: "H7393", then: "מרכבות מלחמה", now: "רכב, מכונית", ref: ["Exodus", 14, 9] },
  { strongs: "H5690", then: "אהבה, חשק (\"שירי עגבים\")", now: "כמעט לא בשימוש. ממנה נגזרה העגבנייה, \"תפוח האהבה\"" },
  { strongs: "H3730", then: "עיטור עגול בקני המנורה, כותרת של עמוד", now: "כפתור בבגד, במכשיר", ref: ["Exodus", 25, 31] },
];
