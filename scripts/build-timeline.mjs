// Builds data/timeline/torah.json: Torah passages with the year they happen in, for the timeline view
// of /tanakh-map. Run: node scripts/build-timeline.mjs
//
// Every number a year is computed from is checked against VerseText (the phrase must occur in the
// verse, letters only); the script stops on a failed check. Tradition events cite a source read on
// Sefaria (Seder Olam Rabbah, Rashi; Public Domain editions). Years from creation count a son's birth
// as the father's birth year plus his age then (Adam = 0, so Noah is born in 1056 and the Flood is
// in 1656, as in Seder Olam 1). Exodus-axis years: rel 0 is the year of the Exodus (counted from Nisan),
// rel 39 the fortieth; its year from creation is 2448 + rel, plus one from the seventh month on.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(import.meta.dirname, "..");
const db = new DatabaseSync(path.join(ROOT, "prisma/dev.db"), { readOnly: true });
const verseText = db.prepare("SELECT plainText FROM VerseText WHERE book = ? AND chapter = ? AND verse = ?");
const PARASHIYOT = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/parashiyot.json"), "utf8"));

const EXODUS_AM = 2448; // Rashi on Ex 12:40; Seder Olam 3: 400 years from Isaac's birth (2048)

const problems = [];
function check(book, c, v, phrase) {
  const t = verseText.get(book, c, v)?.plainText;
  if (!t) problems.push(`${book} ${c}:${v} missing`);
  else if (!t.includes(phrase)) problems.push(`${book} ${c}:${v} lacks "${phrase}"\n    ${t}`);
}

// ---- Genesis: births from the genealogies (Gen 5, 11) ----
const born = { adam: 0 };
const G = "Genesis";
function beget(father, son, age, c, v, phrase) {
  check(G, c, v, phrase);
  born[son] = born[father] + age;
}
function lifespan(who, years, c, v, phrase) {
  check(G, c, v, phrase);
  return born[who] + years;
}
beget("adam", "seth", 130, 5, 3, "ויחי אדם שלשים ומאת שנה");
beget("seth", "enosh", 105, 5, 6, "ויחי שת חמש שנים ומאת שנה");
beget("enosh", "kenan", 90, 5, 9, "ויחי אנוש תשעים שנה");
beget("kenan", "mahalalel", 70, 5, 12, "ויחי קינן שבעים שנה");
beget("mahalalel", "jared", 65, 5, 15, "ויחי מהללאל חמש שנים וששים שנה");
beget("jared", "enoch", 162, 5, 18, "ויחי ירד שתים וששים שנה ומאת שנה");
beget("enoch", "methuselah", 65, 5, 21, "ויחי חנוך חמש וששים שנה");
beget("methuselah", "lamech", 187, 5, 25, "ויחי מתושלח שבע ושמנים שנה ומאת שנה");
beget("lamech", "noah", 182, 5, 28, "ויחי למך שתים ושמנים שנה ומאת שנה");
const death = {
  adam: lifespan("adam", 930, 5, 5, "תשע מאות שנה ושלשים שנה"),
  seth: lifespan("seth", 912, 5, 8, "שתים עשרה שנה ותשע מאות שנה"),
  enosh: lifespan("enosh", 905, 5, 11, "חמש שנים ותשע מאות שנה"),
  kenan: lifespan("kenan", 910, 5, 14, "עשר שנים ותשע מאות שנה"),
  mahalalel: lifespan("mahalalel", 895, 5, 17, "חמש ותשעים שנה ושמנה מאות שנה"),
  jared: lifespan("jared", 962, 5, 20, "שתים וששים שנה ותשע מאות שנה"),
  enoch: lifespan("enoch", 365, 5, 23, "חמש וששים שנה ושלש מאות שנה"),
  methuselah: lifespan("methuselah", 969, 5, 27, "תשע וששים שנה ותשע מאות שנה"),
  lamech: lifespan("lamech", 777, 5, 31, "שבע ושבעים שנה ושבע מאות שנה"),
};
check(G, 5, 32, "ויהי נח בן חמש מאות שנה");
check(G, 7, 6, "ונח בן שש מאות שנה");
check(G, 7, 11, "בשנת שש מאות שנה לחיי נח בחדש השני בשבעה עשר יום לחדש");
const FLOOD = born.noah + 600;
check(G, 8, 13, "באחת ושש מאות שנה בראשון באחד לחדש");
check(G, 8, 14, "ובחדש השני בשבעה ועשרים יום לחדש יבשה הארץ");
death.noah = lifespan("noah", 950, 9, 29, "תשע מאות שנה וחמשים שנה");
check(G, 11, 10, "שם בן מאת שנה ויולד את ארפכשד שנתים אחר המבול");
born.arpachshad = FLOOD + 2;
born.shem = born.arpachshad - 100;
death.shem = born.arpachshad + 500;
check(G, 11, 11, "ויחי שם אחרי הולידו את ארפכשד חמש מאות שנה");
const POST = [
  // [father, son, age at begetting (c:v, phrase), years after (c:v, phrase)]
  ["arpachshad", "shelah", 35, [11, 12, "חי חמש ושלשים שנה"], 403, [11, 13, "שלש שנים וארבע מאות שנה"]],
  ["shelah", "eber", 30, [11, 14, "ושלח חי שלשים שנה"], 403, [11, 15, "שלש שנים וארבע מאות שנה"]],
  ["eber", "peleg", 34, [11, 16, "ויחי עבר ארבע ושלשים שנה"], 430, [11, 17, "שלשים שנה וארבע מאות שנה"]],
  ["peleg", "reu", 30, [11, 18, "ויחי פלג שלשים שנה"], 209, [11, 19, "תשע שנים ומאתים שנה"]],
  ["reu", "serug", 32, [11, 20, "ויחי רעו שתים ושלשים שנה"], 207, [11, 21, "שבע שנים ומאתים שנה"]],
  ["serug", "nahor", 30, [11, 22, "ויחי שרוג שלשים שנה"], 200, [11, 23, "מאתים שנה"]],
  ["nahor", "terah", 29, [11, 24, "ויחי נחור תשע ועשרים שנה"], 119, [11, 25, "תשע עשרה שנה ומאת שנה"]],
];
for (const [father, son, age, [c1, v1, p1], after, [c2, v2, p2]] of POST) {
  beget(father, son, age, c1, v1, p1);
  check(G, c2, v2, p2);
  death[father] = born[son] + after;
}
beget("terah", "abram", 70, 11, 26, "ויחי תרח שבעים שנה ויולד את אברם");
death.terah = lifespan("terah", 205, 11, 32, "חמש שנים ומאתים שנה");
check(G, 12, 4, "ואברם בן חמש שנים ושבעים שנה בצאתו מחרן");
check(G, 16, 3, "מקץ עשר שנים לשבת אברם בארץ כנען");
check(G, 16, 16, "ואברם בן שמנים שנה ושש שנים בלדת הגר את ישמעאל");
born.ishmael = born.abram + 86;
check(G, 17, 1, "ויהי אברם בן תשעים שנה ותשע שנים");
check(G, 17, 24, "ואברהם בן תשעים ותשע שנה בהמלו");
check(G, 18, 10, "שוב אשוב אליך כעת חיה והנה בן לשרה");
check(G, 21, 5, "ואברהם בן מאת שנה בהולד לו את יצחק");
born.isaac = born.abram + 100;
check(G, 17, 17, "ואם שרה הבת תשעים שנה תלד");
born.sarah = born.isaac - 90;
death.sarah = lifespan("sarah", 127, 23, 1, "ויהיו חיי שרה מאה שנה ועשרים שנה ושבע שנים");
check(G, 25, 20, "ויהי יצחק בן ארבעים שנה בקחתו את רבקה");
death.abram = lifespan("abram", 175, 25, 7, "מאת שנה ושבעים שנה וחמש שנים");
death.ishmael = lifespan("ishmael", 137, 25, 17, "מאת שנה ושלשים שנה ושבע שנים");
check(G, 25, 26, "ויצחק בן ששים שנה בלדת אתם");
born.jacob = born.isaac + 60;
check(G, 26, 34, "ויהי עשו בן ארבעים שנה");
death.isaac = lifespan("isaac", 180, 35, 28, "ויהיו ימי יצחק מאת שנה ושמנים שנה");
// Joseph: 30 before Pharaoh (41:46), then 7 years of plenty and 2 of famine (45:6) when Jacob, 130, comes (47:9)
check(G, 47, 9, "ימי שני מגורי שלשים ומאת שנה");
const DESCENT = born.jacob + 130;
check(G, 41, 46, "ויוסף בן שלשים שנה בעמדו לפני פרעה");
check(G, 45, 6, "כי זה שנתים הרעב בקרב הארץ");
born.joseph = DESCENT - 2 - 7 - 30;
check(G, 37, 2, "יוסף בן שבע עשרה שנה");
check(G, 41, 1, "ויהי מקץ שנתים ימים");
// Jacob in Haran: twenty years (31:41), the first fourteen for Leah and Rachel; Joseph is born at
// their end, when Jacob asks to go (30:25) and serves six more for the flocks
check(G, 31, 41, "עבדתיך ארבע עשרה שנה בשתי בנתיך ושש שנים בצאנך");
check(G, 31, 38, "זה עשרים שנה אנכי עמך");
check(G, 30, 25, "ויהי כאשר ילדה רחל את יוסף");
const HARAN = born.joseph - 14;
check(G, 47, 28, "ויחי יעקב בארץ מצרים שבע עשרה שנה");
death.jacob = lifespan("jacob", 147, 47, 28, "שבע שנים וארבעים ומאת שנה");
death.joseph = lifespan("joseph", 110, 50, 26, "וימת יוסף בן מאה ועשר שנים");

// ---- The Exodus axis ----
const E = "Exodus", N = "Numbers", D = "Deuteronomy", L = "Leviticus";
check(D, 34, 7, "ומשה בן מאה ועשרים שנה במתו");
check(D, 1, 3, "ויהי בארבעים שנה בעשתי עשר חדש באחד לחדש");
check(E, 7, 7, "ומשה בן שמנים שנה ואהרן בן שלש ושמנים שנה בדברם אל פרעה");
check(E, 12, 2, "ראשון הוא לכם לחדשי השנה");
check(E, 12, 41, "ויהי מקץ שלשים שנה וארבע מאות שנה");
check(N, 33, 3, "בחמשה עשר יום לחדש הראשון ממחרת הפסח יצאו");
check(E, 16, 1, "בחמשה עשר יום לחדש השני לצאתם מארץ מצרים");
check(E, 19, 1, "בחדש השלישי לצאת בני ישראל מארץ מצרים ביום הזה באו מדבר סיני");
check(E, 24, 18, "ויהי משה בהר ארבעים יום וארבעים לילה");
check(E, 40, 17, "בחדש הראשון בשנה השנית באחד לחדש הוקם המשכן");
check(L, 8, 33, "שבעת ימים");
check(L, 9, 1, "ויהי ביום השמיני");
check(L, 16, 1, "אחרי מות שני בני אהרן");
check(N, 1, 1, "באחד לחדש השני בשנה השנית לצאתם מארץ מצרים");
check(N, 7, 1, "ויהי ביום כלות משה להקים את המשכן");
check(N, 9, 1, "בשנה השנית לצאתם מארץ מצרים בחדש הראשון");
check(N, 10, 11, "ויהי בשנה השנית בחדש השני בעשרים בחדש נעלה הענן");
check(D, 2, 14, "והימים אשר הלכנו מקדש ברנע עד אשר עברנו את נחל זרד שלשים ושמנה שנה");
check(N, 33, 38, "בשנת הארבעים לצאת בני ישראל מארץ מצרים בחדש החמישי באחד לחדש");
check(N, 33, 39, "ואהרן בן שלש ועשרים ומאת שנה");
check(N, 21, 4, "ויסעו מהר ההר");
check(N, 22, 1, "ויחנו בערבות מואב");
check(D, 1, 5, "בעבר הירדן בארץ מואב");
// The gap the page explains: no single number joins the two axes
check(G, 15, 13, "ועבדום וענו אתם ארבע מאות שנה");
check(E, 12, 40, "ומושב בני ישראל אשר ישבו במצרים שלשים שנה וארבע מאות שנה");
check(E, 6, 16, "ושני חיי לוי שבע ושלשים ומאת שנה");
check(E, 6, 18, "ושני חיי קהת שלש ושלשים ומאת שנה");
check(E, 6, 20, "ושני חיי עמרם שבע ושלשים ומאת שנה");
const amOf = (rel, month = 1) => EXODUS_AM + rel + (rel >= 0 && month >= 7 ? 1 : 0);

// ---- Events ----
const T = (book, from, to, title, am, basis, extra = {}) => ({ book, from, to, title, axis: "creation", am, basis, source: "text", ...extra });
const X = (book, from, to, title, rel, basis, extra = {}) => ({
  book, from, to, title, axis: "exodus", rel, am: { from: amOf(rel.from, extra.month), ...(rel.to !== undefined ? { to: amOf(rel.to, extra.monthTo ?? extra.month) } : {}) }, basis, source: "text", ...extra,
});
const TRAD = (book, from, to, title, am, basis, sefariaRef, rel) => ({ book, from, to, title, axis: rel ? "exodus" : "creation", am, ...(rel ? { rel } : {}), basis, source: "tradition", sefariaRef });

const life = (who, he, c1, v1, c2, v2, extra = "") =>
  T(G, [c1, v1], [c2, v2], `ימי ${he}${extra}`, { from: Math.max(born[who], 1), to: death[who] },
    who === "adam" ? "אדם נברא בשנה 1 וחי 930 שנה (ה, ה)" : `שנת הולדתו לפי גיל אביו בהולדתו, ושנות חייו (בראשית ${c1}–${c2})`);

const events = [
  T(G, [1, 1], [2, 3], "ששת ימי בראשית והשבת", { from: 1 },
    "נקודת המוצא של הספירה: השנים נספרות מבריאת האדם, לפי גיל האב בהולדת בנו (בראשית ה; יא)"),
  life("adam", "אדם", 5, 1, 5, 5, "; הולדת שת"),
  life("seth", "שת", 5, 6, 5, 8),
  life("enosh", "אנוש", 5, 9, 5, 11),
  life("kenan", "קינן", 5, 12, 5, 14),
  life("mahalalel", "מהללאל", 5, 15, 5, 17),
  life("jared", "ירד", 5, 18, 5, 20),
  T(G, [5, 21], [5, 24], "ימי חנוך, ״ואיננו כי לקח אתו אלהים״", { from: born.enoch, to: death.enoch }, "שנת הולדתו לפי גיל ירד, ושלוש מאות שישים וחמש שנותיו"),
  T(G, [5, 25], [5, 27], "ימי מתושלח, שמת בשנת המבול", { from: born.methuselah, to: death.methuselah }, "שנת הולדתו לפי גיל חנוך, ותשע מאות שישים ותשע שנותיו; מותו חל בשנת המבול"),
  life("lamech", "למך", 5, 28, 5, 31, "; הולדת נח"),
  T(G, [5, 32], [5, 32], "נח בן 500 מוליד את שם, חם ויפת", { from: born.noah + 500 }, "נח נולד בשנת 1056 (גיל למך, ה, כח)"),
  T(G, [7, 11], [8, 14], "המבול: מירידת הגשם עד שיבשה הארץ", { from: FLOOD, to: FLOOD + 1 },
    "נח בן שש מאות (ז, ו), ושנתו ה־601 (ח, יג)", { date: "מי״ז בחודש השני עד כ״ז בחודש השני בשנה שאחריה" }),
  T(G, [8, 15], [9, 17], "היציאה מן התבה, המזבח וברית הקשת", { from: FLOOD + 1 }, "מיד אחרי שיבשה הארץ (ח, יד)"),
  T(G, [9, 28], [9, 29], "מות נח", { from: death.noah }, "חי אחרי המבול שלוש מאות וחמישים שנה, וכל ימיו 950"),
  TRAD(G, [11, 1], [11, 9], "מגדל בבל וההפלגה", { from: death.peleg },
    "״מן המבול עד הפלגה ש״מ שנה״: בסוף ימי פלג, ״כי בימיו נפלגה הארץ״ (י, כה)", "Seder_Olam_Rabbah.1"),
  T(G, [11, 10], [11, 11], "ימי שם; הולדת ארפכשד שנתיים אחרי המבול", { from: born.shem, to: death.shem }, "בן מאה שנתיים אחר המבול (יא, י)"),
  ...POST.map(([who], i) => {
    const names = { arpachshad: "ארפכשד", shelah: "שלח", eber: "עבר", peleg: "פלג", reu: "רעו", serug: "שרוג", nahor: "נחור" };
    const v = 12 + i * 2;
    return T(G, [11, v], [11, v + 1], `ימי ${names[who]}`, { from: born[who], to: death[who] }, `שנת הולדתו לפי גיל אביו, ושנות חייו (יא, ${v}–${v + 1})`);
  }),
  T(G, [11, 26], [11, 32], "ימי תרח; הולדת אברם, נחור והרן", { from: born.terah, to: death.terah },
    "אברם נולד כשתרח בן שבעים (יא, כו). מות תרח מסופר לפני יציאת אברם, אף שאירע אחריה (רש״י יא, לב)"),
  T(G, [12, 1], [12, 9], "לך לך: אברם יוצא מחרן לארץ כנען", { from: born.abram + 75 }, "אברם בן שבעים וחמש בצאתו מחרן (יב, ד)"),
  TRAD(G, [15, 1], [15, 21], "ברית בין הבתרים", { from: born.abram + 70 },
    "אברהם היה בשעת ברית בין הבתרים בן שבעים, לפני יציאתו מחרן: הסיפור אינו לפי סדר הזמנים", "Seder_Olam_Rabbah.1"),
  T(G, [16, 1], [16, 16], "שרי נותנת את הגר לאברם; הולדת ישמעאל", { from: born.abram + 85, to: born.ishmael }, "עשר שנים לשבת אברם בכנען (טז, ג), ואברם בן 86 בלדת ישמעאל (טז, טז)"),
  T(G, [17, 1], [17, 27], "ברית המילה ושינוי השמות", { from: born.abram + 99 }, "אברם בן תשעים ותשע (יז, א; יז, כד)"),
  T(G, [18, 1], [19, 38], "שלושת המלאכים והפיכת סדום", { from: born.abram + 99 }, "״כעת חיה והנה בן לשרה״ (יח, י), שנה לפני הולדת יצחק"),
  T(G, [21, 1], [21, 8], "הולדת יצחק", { from: born.isaac }, "אברהם בן מאה (כא, ה)"),
  TRAD(G, [22, 1], [22, 19], "עקדת יצחק", { from: born.isaac + 37 }, "יצחק היה בן ל״ז בשעת העקידה", "Seder_Olam_Rabbah.1"),
  T(G, [23, 1], [23, 20], "מות שרה וקניית מערת המכפלה", { from: death.sarah }, "שרה בת תשעים בהולדת יצחק (יז, יז), ומתה בת 127 (כג, א)"),
  T(G, [24, 1], [24, 67], "רבקה נלקחת לאשה ליצחק", { from: born.isaac + 40 }, "יצחק בן ארבעים בקחתו את רבקה (כה, כ)"),
  T(G, [25, 7], [25, 11], "מות אברהם", { from: death.abram }, "אברהם חי 175 שנה (כה, ז)"),
  T(G, [25, 17], [25, 18], "מות ישמעאל", { from: death.ishmael }, "ישמעאל חי 137 שנה (כה, יז)"),
  T(G, [25, 19], [25, 26], "הולדת עשו ויעקב", { from: born.jacob }, "יצחק בן שישים בלדת אותם (כה, כו)"),
  T(G, [26, 34], [26, 35], "עשו נושא נשים חתיות", { from: born.jacob + 40 }, "עשו בן ארבעים (כו, לד)"),
  T(G, [28, 10], [32, 3], "יעקב בחרן: עשרים שנה אצל לבן", { from: HARAN, to: HARAN + 20 },
    "עשרים שנה (לא, לח), ויוסף נולד בתום ארבע עשרה השנים הראשונות (ל, כה; לא, מא), כשיעקב בן 91"),
  T(G, [32, 4], [33, 17], "יעקב שב לכנען ונפגש עם עשו", { from: HARAN + 20 }, "בשובו מחרן, בתום עשרים השנים"),
  T(G, [35, 28], [35, 29], "מות יצחק", { from: death.isaac }, "יצחק חי 180 שנה (לה, כח)"),
  T(G, [37, 1], [37, 36], "חלומות יוסף ומכירתו", { from: born.joseph + 17 }, "יוסף בן שבע עשרה (לז, ב)"),
  T(G, [40, 1], [40, 23], "יוסף פותר את חלומות השרים בבית הסוהר", { from: born.joseph + 28 }, "שנתיים לפני חלומות פרעה (מא, א)"),
  T(G, [41, 1], [44, 17], "חלומות פרעה, עליית יוסף, שנות השובע והרעב", { from: born.joseph + 30, to: DESCENT },
    "יוסף בן שלושים בעמדו לפני פרעה (מא, מו); שבע שנות שובע ושנתיים של רעב עד שהתוודע (מה, ו)"),
  T(G, [44, 18], [46, 7], "יוסף מתוודע לאחיו ויעקב יורד מצרימה", { from: DESCENT }, "״כי זה שנתים הרעב״ (מה, ו); יעקב בן 130 (מז, ט)"),
  T(G, [46, 28], [47, 31], "יעקב במצרים: לפני פרעה, ושבע עשרה שנותיו שם", { from: DESCENT, to: death.jacob }, "יעקב בן 130 לפני פרעה (מז, ט) וחי שם עוד 17 שנה (מז, כח)"),
  T(G, [49, 27], [50, 26], "מות יעקב, ומות יוסף", { from: death.jacob, to: death.joseph }, "יעקב חי 147 שנה (מז, כח); יוסף מת בן 110 (נ, כו)"),

  X(E, [2, 1], [2, 10], "הולדת משה", { from: -80 }, "משה מת בן 120 (דברים לד, ז) בשנה הארבעים (דברים א, ג), ולכן נולד שמונים שנה לפני היציאה; גם ״בן שמנים שנה... בדברם אל פרעה״ (שמות ז, ז)"),
  X(E, [7, 1], [11, 10], "משה ואהרן לפני פרעה, והמכות", { from: 0 }, "משה בן שמונים ואהרן בן 83 בדברם אל פרעה (ז, ז)", { note: "לפי סדר עולם (פרק ג) המכות נמשכו שנים עשר חודשים" }),
  X(E, [12, 1], [12, 28], "החודש הראשון וקורבן הפסח", { from: 0 }, "״החדש הזה לכם ראש חדשים״ (יב, ב)", { month: 1, date: "בעשור לחודש הראשון ובארבעה עשר בו" }),
  X(E, [12, 29], [12, 42], "מכת בכורות ויציאת מצרים", { from: 0 }, "״ממחרת הפסח יצאו״ (במדבר לג, ג)", { month: 1, date: "בחמישה עשר לחודש הראשון" }),
  X(E, [16, 1], [16, 36], "המן במדבר סין", { from: 0 }, "בט״ו לחודש השני לצאתם (טז, א)", { month: 2, date: "בחמישה עשר לחודש השני" }),
  X(E, [19, 1], [24, 18], "מעמד הר סיני ועשרת הדברות", { from: 0 }, "״בחדש השלישי לצאת בני ישראל״ (יט, א)", { month: 3, date: "בחודש השלישי" }),
  X(E, [25, 1], [34, 35], "ציווי המשכן, חטא העגל והלוחות השניים", { from: 0 }, "בארבעים הימים בהר (כד, יח) ואחריהם, לפני הקמת המשכן בשנה השנית"),
  X(E, [35, 1], [40, 16], "בניית המשכן", { from: 0 }, "המשכן הושלם והוקם בראש השנה השנית (מ, יז)"),
  X(E, [40, 17], [40, 38], "הקמת המשכן", { from: 1 }, "״בחדש הראשון בשנה השנית באחד לחדש הוקם המשכן״ (מ, יז)", { month: 1, date: "באחד לחודש הראשון" }),
  X(L, [8, 1], [10, 20], "ימי המילואים, היום השמיני ומות נדב ואביהוא", { from: 1 }, "חנוכת המשכן שהוקם בשנה השנית (שמות מ, יז; ויקרא ח, לג; ט, א)", { month: 1 }),
  X(L, [16, 1], [16, 34], "עבודת יום הכיפורים", { from: 1 }, "״אחרי מות שני בני אהרן״ (טז, א), בשנה השנית"),
  X(N, [1, 1], [4, 49], "מפקד בני ישראל וסדר המחנה", { from: 1 }, "״באחד לחדש השני בשנה השנית״ (א, א)", { month: 2, date: "באחד לחודש השני" }),
  X(N, [7, 1], [7, 89], "קורבנות הנשיאים בחנוכת המשכן", { from: 1 }, "״ביום כלות משה להקים את המשכן״ (ז, א)", { month: 1 }),
  X(N, [9, 1], [9, 14], "הפסח במדבר ופסח שני", { from: 1 }, "״בשנה השנית... בחדש הראשון״ (ט, א)", { month: 1, date: "בארבעה עשר לחודש הראשון" }),
  X(N, [10, 11], [12, 16], "הנסיעה מסיני, קברות התאווה ומרים", { from: 1 }, "״בשנה השנית בחדש השני בעשרים בחדש נעלה הענן״ (י, יא)", { month: 2, date: "בעשרים לחודש השני" }),
  X(N, [13, 1], [14, 45], "המרגלים וגזירת ארבעים השנה", { from: 1 },
    "שלושים ושמונה שנה מקדש ברנע עד נחל זרד (דברים ב, יד), ומשם לשנה הארבעים", { month: 3, note: "לפי סדר עולם (פרק ח) נשלחו בכ״ט בסיון ושבו בתשעה באב" }),
  TRAD(N, [20, 1], [20, 21], "מות מרים, מי מריבה והשליחים לאדום", { from: amOf(39, 1) },
    "״שנת הארבעים היתה, וראש חדש ניסן היה״; הפסוק אומר רק ״בחדש הראשון״", "Seder_Olam_Rabbah.9", { from: 39 }),
  X(N, [20, 22], [20, 29], "מות אהרן בהר ההר", { from: 39 }, "״בשנת הארבעים... בחדש החמישי באחד לחדש״, ואהרן בן 123 (לג, לח–לט)", { month: 5, date: "באחד לחודש החמישי" }),
  X(N, [21, 4], [21, 35], "הנחשים, השירה, סיחון ועוג", { from: 39 }, "אחרי הנסיעה מהר ההר, שם מת אהרן (כא, ד)", { month: 5 }),
  X(N, [22, 1], [36, 13], "בערבות מואב: בלעם, בעל פעור, המפקד השני ונחלת השבטים", { from: 39 }, "אחרי סיחון ועוג, בשנה הארבעים (כב, א)", { month: 5 }),
  X(D, [1, 1], [33, 29], "נאומי משה בערבות מואב, השירה והברכה", { from: 39 }, "״בארבעים שנה בעשתי עשר חדש באחד לחדש״ (א, ג)", { month: 11, date: "מאחד לחודש האחד עשר" }),
  X(D, [34, 1], [34, 12], "מות משה בהר נבו", { from: 39 }, "משה בן 120 במותו (לד, ז), אחרי נאומיו שהחלו בחודש האחד עשר של השנה הארבעים (א, ג)", { month: 12, note: "לפי סדר עולם (פרק י) מת משה בז׳ באדר" }),
];

// The parashiya a passage starts in, and a stable id
const parashiyaOf = (book, [c, v]) => {
  const at = c * 1000 + v;
  const row = PARASHIYOT[book].find(([c1, v1, c2, v2]) => at >= c1 * 1000 + v1 && at <= c2 * 1000 + v2);
  if (!row) throw new Error(`${book} ${c}:${v}: no parashiya`);
  return `${row[0]}:${row[1]}`;
};
const out = events.map((e) => {
  const rest = { ...e };
  delete rest.month; // only used to compute `am`
  delete rest.monthTo;
  return { id: `${e.book}-${e.from[0]}-${e.from[1]}`, parashiya: parashiyaOf(e.book, e.from), ...rest };
});
for (const e of out) {
  check(e.book, e.to[0], e.to[1], ""); // the range ends on a real verse
  if (e.source === "text" && e.axis === "exodus" && !e.rel) problems.push(`${e.id}: exodus event without rel`);
}
if (new Set(out.map((e) => e.id)).size !== out.length) problems.push("duplicate ids");

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ` + problems.join("\n  "));
  process.exit(1);
}
const file = path.join(ROOT, "data/timeline/torah.json");
fs.writeFileSync(file, JSON.stringify({ exodusAm: EXODUS_AM, events: out }, null, 1) + "\n");
console.log(`${out.length} events (${out.filter((e) => e.source === "tradition").length} from tradition) → ${path.relative(ROOT, file)}`);
console.log(`Noah ${born.noah}, Flood ${FLOOD}, Abram ${born.abram}, Isaac ${born.isaac}, Jacob ${born.jacob}, Joseph ${born.joseph}, descent ${DESCENT} (+210 = ${DESCENT + 210}), Joseph dies ${death.joseph}`);
