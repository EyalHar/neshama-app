// Songs, prayers, laments and blessings told in the Tanakh outside Psalms (the psalms are listed
// from the text itself, see lib/psalmTitles.ts). A curated list: each entry's `opening` (letters
// only) was checked to occur in the plain text of its first verse, and its last verse to exist.
// Check any new entry the same way, against the data, not from memory.

export type PrayerKind = "שירה" | "תפילה" | "קינה" | "ברכה";

export type PrayerSong = {
  id: string;
  title: string;
  kind: PrayerKind;
  who: string;
  book: string;
  from: [number, number];
  to: [number, number];
  opening: string; // words of the first verse, letters only
  // How a scroll writes it: the rule that songs are written "אריח על גבי לבנה" (Megillah 16b),
  // and Ha'azinu in two columns (Rambam, Hilchot Sefer Torah ch. 8)
  layout?: string;
};

const BRICKS = "נכתבת בספר בצורת שירה, ״אריח על גבי לבנה״: מילים ורווחים לסירוגין (״כל השירות כולן נכתבות אריח על גבי לבנה״, מגילה טז, ב)";

export const PRAYERS_SONGS: PrayerSong[] = [
  // תורה
  { id: "lemech", title: "שירת למך", kind: "שירה", who: "למך", book: "Genesis", from: [4, 23], to: [4, 24], opening: "ויאמר למך לנשיו עדה וצלה שמען קולי" },
  { id: "eliezer", title: "תפילת עבד אברהם", kind: "תפילה", who: "עבד אברהם", book: "Genesis", from: [24, 12], to: [24, 14], opening: "הקרה נא לפני היום" },
  { id: "yaakov", title: "תפילת יעקב לפני הפגישה עם עשו", kind: "תפילה", who: "יעקב", book: "Genesis", from: [32, 10], to: [32, 13], opening: "ויאמר יעקב אלהי אבי אברהם" },
  { id: "yaakov-blessing", title: "ברכת יעקב לבניו", kind: "ברכה", who: "יעקב", book: "Genesis", from: [49, 2], to: [49, 27], opening: "הקבצו ושמעו בני יעקב" },
  { id: "hayam", title: "שירת הים", kind: "שירה", who: "משה ובני ישראל", book: "Exodus", from: [15, 1], to: [15, 18], opening: "אז ישיר משה ובני ישראל את השירה הזאת", layout: BRICKS },
  { id: "miriam", title: "שירת מרים", kind: "שירה", who: "מרים הנביאה והנשים", book: "Exodus", from: [15, 20], to: [15, 21], opening: "ותקח מרים הנביאה" },
  { id: "moshe-egel", title: "תפילת משה אחרי חטא העגל", kind: "תפילה", who: "משה", book: "Exodus", from: [32, 11], to: [32, 13], opening: "ויחל משה את פני יהוה אלהיו" },
  { id: "birkat-kohanim", title: "ברכת כהנים", kind: "ברכה", who: "אהרן ובניו", book: "Numbers", from: [6, 24], to: [6, 26], opening: "יברכך יהוה וישמרך" },
  { id: "binsoa", title: "״ויהי בנסע הארן״", kind: "תפילה", who: "משה", book: "Numbers", from: [10, 35], to: [10, 36], opening: "ויהי בנסע הארן" },
  { id: "moshe-miriam", title: "תפילת משה לרפואת מרים", kind: "תפילה", who: "משה", book: "Numbers", from: [12, 13], to: [12, 13], opening: "אל נא רפא נא לה" },
  { id: "moshe-meraglim", title: "תפילת משה אחרי חטא המרגלים", kind: "תפילה", who: "משה", book: "Numbers", from: [14, 13], to: [14, 19], opening: "ושמעו מצרים" },
  { id: "habeer", title: "שירת הבאר", kind: "שירה", who: "בני ישראל", book: "Numbers", from: [21, 17], to: [21, 18], opening: "אז ישיר ישראל את השירה הזאת עלי באר" },
  { id: "vaetchanan", title: "״ואתחנן״: תפילת משה להיכנס לארץ", kind: "תפילה", who: "משה", book: "Deuteronomy", from: [3, 23], to: [3, 25], opening: "ואתחנן אל יהוה" },
  { id: "bikurim", title: "מקרא ביכורים", kind: "תפילה", who: "מביא הביכורים", book: "Deuteronomy", from: [26, 5], to: [26, 10], opening: "ארמי אבד אבי" },
  { id: "maaser", title: "וידוי מעשר", kind: "תפילה", who: "מפריש המעשרות", book: "Deuteronomy", from: [26, 13], to: [26, 15], opening: "בערתי הקדש מן הבית" },
  { id: "haazinu", title: "שירת האזינו", kind: "שירה", who: "משה", book: "Deuteronomy", from: [32, 1], to: [32, 43], opening: "האזינו השמים ואדברה", layout: "נכתבת בספר תורה בשני טורים, עם ריווח באמצע כל שורה (רמב״ם, הלכות ספר תורה פרק ח)" },
  { id: "moshe-blessing", title: "ברכת משה לשבטים", kind: "ברכה", who: "משה", book: "Deuteronomy", from: [33, 2], to: [33, 29], opening: "יהוה מסיני בא" },

  // נביאים
  { id: "yehoshua-shemesh", title: "״שמש בגבעון דום״", kind: "תפילה", who: "יהושע", book: "Joshua", from: [10, 12], to: [10, 13], opening: "אז ידבר יהושע ליהוה" },
  { id: "devora", title: "שירת דבורה", kind: "שירה", who: "דבורה וברק בן אבינעם", book: "Judges", from: [5, 1], to: [5, 31], opening: "ותשר דבורה וברק בן אבינעם", layout: BRICKS },
  { id: "manoach", title: "תפילת מנוח", kind: "תפילה", who: "מנוח", book: "Judges", from: [13, 8], to: [13, 8], opening: "ויעתר מנוח אל יהוה" },
  { id: "shimshon", title: "תפילת שמשון בבית דגון", kind: "תפילה", who: "שמשון", book: "Judges", from: [16, 28], to: [16, 28], opening: "ויקרא שמשון אל יהוה" },
  { id: "chana-neder", title: "נדר חנה", kind: "תפילה", who: "חנה", book: "I Samuel", from: [1, 10], to: [1, 11], opening: "והיא מרת נפש ותתפלל על יהוה" },
  { id: "chana", title: "תפילת חנה (״עלץ לבי״)", kind: "שירה", who: "חנה", book: "I Samuel", from: [2, 1], to: [2, 10], opening: "ותתפלל חנה ותאמר עלץ לבי ביהוה" },
  { id: "kashet", title: "קינת דוד על שאול ויהונתן (״הקשת״)", kind: "קינה", who: "דוד", book: "II Samuel", from: [1, 17], to: [1, 27], opening: "ויקנן דוד את הקינה הזאת" },
  { id: "avner", title: "קינת דוד על אבנר", kind: "קינה", who: "דוד", book: "II Samuel", from: [3, 33], to: [3, 34], opening: "ויקנן המלך אל אבנר" },
  { id: "david-nathan", title: "תפילת דוד אחרי נבואת נתן", kind: "תפילה", who: "דוד", book: "II Samuel", from: [7, 18], to: [7, 29], opening: "ויבא המלך דוד וישב לפני יהוה" },
  { id: "david-song", title: "שירת דוד", kind: "שירה", who: "דוד", book: "II Samuel", from: [22, 1], to: [22, 51], opening: "וידבר דוד ליהוה את דברי השירה הזאת", layout: BRICKS },
  { id: "david-last", title: "דברי דוד האחרונים", kind: "שירה", who: "דוד", book: "II Samuel", from: [23, 1], to: [23, 7], opening: "ואלה דברי דוד האחרנים" },
  { id: "shlomo-givon", title: "תפילת שלמה בגבעון", kind: "תפילה", who: "שלמה", book: "I Kings", from: [3, 6], to: [3, 9], opening: "ויאמר שלמה אתה עשית עם עבדך" },
  { id: "shlomo-mikdash", title: "תפילת שלמה בחנוכת המקדש", kind: "תפילה", who: "שלמה", book: "I Kings", from: [8, 22], to: [8, 53], opening: "ויעמד שלמה לפני מזבח יהוה" },
  { id: "eliyahu-tzarfat", title: "תפילת אליהו על בן הצרפתית", kind: "תפילה", who: "אליהו", book: "I Kings", from: [17, 20], to: [17, 21], opening: "ויקרא אל יהוה ויאמר יהוה אלהי" },
  { id: "eliyahu-carmel", title: "תפילת אליהו בהר הכרמל", kind: "תפילה", who: "אליהו", book: "I Kings", from: [18, 36], to: [18, 37], opening: "ויהי בעלות המנחה ויגש אליהו הנביא" },
  { id: "chizkiyahu-sancheriv", title: "תפילת חזקיהו מול סנחריב", kind: "תפילה", who: "חזקיהו", book: "II Kings", from: [19, 15], to: [19, 19], opening: "ויתפלל חזקיהו לפני יהוה" },
  { id: "chizkiyahu-choli", title: "תפילת חזקיהו בחוליו", kind: "תפילה", who: "חזקיהו", book: "II Kings", from: [20, 2], to: [20, 3], opening: "ויסב את פניו אל הקיר" },
  { id: "kerem", title: "שירת הכרם", kind: "שירה", who: "ישעיהו", book: "Isaiah", from: [5, 1], to: [5, 7], opening: "אשירה נא לידידי" },
  { id: "odcha", title: "״אוֹדְךָ יְהוָה כִּי אָנַפְתָּ בִּי״", kind: "שירה", who: "ישעיהו", book: "Isaiah", from: [12, 1], to: [12, 6], opening: "ואמרת ביום ההוא אודך יהוה" },
  { id: "michtav", title: "מכתב לחזקיהו", kind: "תפילה", who: "חזקיהו", book: "Isaiah", from: [38, 9], to: [38, 20], opening: "מכתב לחזקיהו מלך יהודה" },
  { id: "yirmiyahu-sade", title: "תפילת ירמיהו בקניית השדה", kind: "תפילה", who: "ירמיהו", book: "Jeremiah", from: [32, 16], to: [32, 25], opening: "ואתפלל אל יהוה" },
  { id: "kina-nesiim", title: "קינה על נשיאי ישראל", kind: "קינה", who: "יחזקאל", book: "Ezekiel", from: [19, 1], to: [19, 14], opening: "ואתה שא קינה אל נשיאי ישראל" },
  { id: "yona", title: "תפילת יונה ממעי הדגה", kind: "תפילה", who: "יונה", book: "Jonah", from: [2, 2], to: [2, 10], opening: "ויתפלל יונה אל יהוה אלהיו ממעי הדגה" },
  { id: "yona-2", title: "תפילת יונה אחרי שנינוה ניצלה", kind: "תפילה", who: "יונה", book: "Jonah", from: [4, 2], to: [4, 3], opening: "ויתפלל אל יהוה ויאמר אנה יהוה" },
  { id: "chavakuk", title: "תפילת חבקוק", kind: "תפילה", who: "חבקוק", book: "Habakkuk", from: [3, 1], to: [3, 19], opening: "תפלה לחבקוק הנביא" },

  // כתובים
  { id: "agur", title: "תפילת אגור (״שתים שאלתי מאתך״)", kind: "תפילה", who: "אגור בן יקה", book: "Proverbs", from: [30, 7], to: [30, 9], opening: "שתים שאלתי מאתך" },
  { id: "eshet-chayil", title: "״אשת חיל״", kind: "שירה", who: "", book: "Proverbs", from: [31, 10], to: [31, 31], opening: "אשת חיל מי ימצא" },
  { id: "shir-hashirim", title: "שיר השירים", kind: "שירה", who: "שלמה", book: "Song of Songs", from: [1, 1], to: [8, 14], opening: "שיר השירים אשר לשלמה" },
  { id: "eicha", title: "מגילת איכה", kind: "קינה", who: "ירמיהו (לפי המסורת)", book: "Lamentations", from: [1, 1], to: [5, 22], opening: "איכה ישבה בדד" },
  { id: "eicha-5", title: "״זְכֹר יְהוָה מֶה הָיָה לָנוּ״", kind: "תפילה", who: "", book: "Lamentations", from: [5, 1], to: [5, 22], opening: "זכר יהוה מה היה לנו" },
  { id: "daniel-2", title: "הודיית דניאל על פתרון החלום", kind: "תפילה", who: "דניאל", book: "Daniel", from: [2, 20], to: [2, 23], opening: "ענה דניאל ואמר" },
  { id: "daniel-9", title: "תפילת דניאל", kind: "תפילה", who: "דניאל", book: "Daniel", from: [9, 4], to: [9, 19], opening: "ואתפללה ליהוה אלהי ואתודה" },
  { id: "ezra", title: "תפילת עזרא על נשים נכריות", kind: "תפילה", who: "עזרא", book: "Ezra", from: [9, 6], to: [9, 15], opening: "ואמרה אלהי בשתי ונכלמתי" },
  { id: "nechemya-1", title: "תפילת נחמיה", kind: "תפילה", who: "נחמיה", book: "Nehemiah", from: [1, 5], to: [1, 11], opening: "ואמר אנא יהוה אלהי השמים" },
  { id: "nechemya-9", title: "תפילת הלויים", kind: "תפילה", who: "הלויים", book: "Nehemiah", from: [9, 5], to: [9, 37], opening: "ויאמרו הלוים" },
  { id: "yaabetz", title: "תפילת יעבץ", kind: "תפילה", who: "יעבץ", book: "I Chronicles", from: [4, 10], to: [4, 10], opening: "ויקרא יעבץ לאלהי ישראל" },
  { id: "hodu", title: "״הוֹדוּ לַיהוָה״ בהעלאת הארון", kind: "שירה", who: "אסף ואחיו", book: "I Chronicles", from: [16, 8], to: [16, 36], opening: "הודו ליהוה קראו בשמו" },
  { id: "vayevarech-david", title: "״ויברך דוד״", kind: "ברכה", who: "דוד", book: "I Chronicles", from: [29, 10], to: [29, 19], opening: "ויברך דויד את יהוה" },
  { id: "asa", title: "תפילת אסא", kind: "תפילה", who: "אסא", book: "II Chronicles", from: [14, 10], to: [14, 10], opening: "ויקרא אסא אל יהוה אלהיו" },
  { id: "yehoshafat", title: "תפילת יהושפט", kind: "תפילה", who: "יהושפט", book: "II Chronicles", from: [20, 6], to: [20, 12], opening: "ויאמר יהוה אלהי אבתינו" },
];

// Not songs, but written like one (Megillah 16b): the kings of Canaan and the sons of Haman,
// "אריח על גבי אריח"
export const WRITTEN_AS_SONG = [
  { title: "מלכי כנען שהיכה יהושע", book: "Joshua", from: [12, 9] as [number, number], to: [12, 24] as [number, number], opening: "מלך יריחו אחד" },
  { title: "עשרת בני המן", book: "Esther", from: [9, 7] as [number, number], to: [9, 10] as [number, number], opening: "ואת פרשנדתא" },
];
