"use client";

import { toHebrewNumeral } from "@/lib/tanakh";
import Confetti from "@/app/components/Confetti";

const CHAPTER_ENCOURAGEMENTS = [
  "כל הכבוד! המשך כך — כל פרק מקרב אותך יותר לתנ״ך שלך.",
  "יישר כח! הדרך של אלף מיל מתחילה בצעד אחד.",
  "מדהים! הידע שלך גדל עם כל פרק שאתה קורא.",
  "כל הכבוד! ״ולמדתם אותם ושמרתם לעשותם״ — אתה חי את זה.",
  "עוד פרק, עוד חיבור. המשך בדרך הזאת!",
];

const BOOK_ENCOURAGEMENTS = [
  "הישג עצום! סיימת ספר שלם — זו עבודה של אמת.",
  "כל הכבוד! ״בכל לבבך ובכל נפשך״ — ניכר שאתה קורא עם הלב.",
  "מדהים! ספר שלם מאחוריך — המשך לכבוש את התנ״ך פרק אחרי פרק.",
  "יישר כח ענק! לא כולם מגיעים לכאן — אתה כן.",
];

const PARASHA_ENCOURAGEMENTS = [
  "כל הכבוד! ״הפוך בה והפוך בה דכולא בה״.",
  "יישר כח! עוד פרשה של תורה, נקראה מתחילתה ועד סופה.",
  "מדהים! פרשה שלמה, פרשייה אחרי פרשייה.",
];

const SECTION_ENCOURAGEMENTS: Record<string, string> = {
  "תורה": "סיימת את חמישה חומשי תורה! זה לא פחות מיוצא דופן. ״תורת ה׳ תמימה משיבת נפש״.",
  "נביאים": "סיימת את ספר הנביאים! קולם של הנביאים מהדהד בך. ״וְחָזוֹן רָב חָזָה יְשַׁעְיָהוּ״.",
  "כתובים": "סיימת את הכתובים! חכמה, שירה ותפילה — כולם שלך. ״אַשְׁרֵי הָאִישׁ אֲשֶׁר לֹא הָלַךְ בַּעֲצַת רְשָׁעִים״.",
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface CelebrationData {
  type: "chapter" | "parasha" | "book" | "section" | "tanakh";
  bookName?: string;
  chapterNum?: number;
  parashaName?: string;
  sectionName?: string;
  count: number;
  nextUnreadChapter?: number;
}

const primaryButton = "bg-amber-700 hover:bg-amber-800 text-white font-medium px-8 py-3 rounded-xl transition-colors";

export default function CelebrationModal({
  celebration,
  onClose,
  onReset,
  onGoToChapter,
}: {
  celebration: CelebrationData;
  onClose: () => void;
  onReset: () => void;
  onGoToChapter: (chapter: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-modal-enter overflow-hidden">
        <Confetti type={celebration.type === "parasha" ? "book" : celebration.type} />
        {celebration.type === "tanakh" ? (
          <>
            <div className="text-6xl mb-4 animate-emoji-tada inline-block">🎉</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-3">כל הכבוד!</h2>
            <p className="text-stone-700 font-semibold text-lg mb-2">סיימת את כל התנ״ך!</p>
            <p className="text-stone-500 text-sm italic mb-6">
              ״תּוֹרַת ה׳ תְּמִימָה מְשִׁיבַת נָפֶשׁ״ — הגעת למשהו שרוב בני האדם לא מגיעים אליו.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={onClose} className={primaryButton}>תודה! 🙏</button>
              <button
                onClick={onReset}
                className="border-2 border-stone-300 hover:bg-stone-50 text-stone-600 font-medium px-8 py-3 rounded-xl transition-colors"
              >
                התחל מחדש
              </button>
            </div>
          </>
        ) : celebration.type === "section" ? (
          <>
            <div className="text-5xl mb-4 animate-emoji-spin inline-block">🌟</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">כל הכבוד!</h2>
            <p className="text-stone-600 mb-2">
              סיימת את <span className="font-bold text-amber-700">{celebration.sectionName}</span>!
            </p>
            <p className="text-stone-500 text-sm italic mb-6">{SECTION_ENCOURAGEMENTS[celebration.sectionName ?? ""] ?? ""}</p>
            <button onClick={onClose} className={primaryButton}>תודה!</button>
          </>
        ) : celebration.type === "book" ? (
          <>
            <div className="text-5xl mb-4 animate-emoji-bounce inline-block">🏆</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">כל הכבוד!</h2>
            <p className="text-stone-600 mb-2">
              סיימת את ספר {celebration.bookName}!<br />
              <span className="font-semibold text-amber-700">{celebration.count} ספרים הושלמו עד כה</span>
            </p>
            <p className="text-stone-500 text-sm italic mb-6">{randomItem(BOOK_ENCOURAGEMENTS)}</p>
            <button onClick={onClose} className={primaryButton}>תודה!</button>
          </>
        ) : celebration.type === "parasha" ? (
          <>
            <div className="text-5xl mb-4 animate-emoji-bounce inline-block">📜</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">כל הכבוד!</h2>
            <p className="text-stone-600 mb-2">
              סיימת את <span className="font-bold text-amber-700">פרשת {celebration.parashaName}</span>!
            </p>
            <p className="text-stone-500 text-sm italic mb-6">{randomItem(PARASHA_ENCOURAGEMENTS)}</p>
            <button onClick={onClose} className={primaryButton}>תודה!</button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4 animate-emoji-pulse-glow inline-block">⭐</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">כל הכבוד!</h2>
            <p className="text-stone-600 mb-2">
              סיימת את פרק {toHebrewNumeral(celebration.chapterNum!)} ב{celebration.bookName}!<br />
              <span className="font-semibold text-amber-700">{celebration.count} פרקים הושלמו עד כה</span>
            </p>
            <p className="text-stone-500 text-sm italic mb-6">{randomItem(CHAPTER_ENCOURAGEMENTS)}</p>
            <div className="flex flex-col gap-3">
              {celebration.nextUnreadChapter && (
                <button onClick={() => onGoToChapter(celebration.nextUnreadChapter!)} className={primaryButton}>
                  לפרק הבא שלא נקרא ({toHebrewNumeral(celebration.nextUnreadChapter)})
                </button>
              )}
              <button
                onClick={onClose}
                className={`font-medium px-8 py-3 rounded-xl transition-colors ${
                  celebration.nextUnreadChapter ? "border border-stone-300 hover:bg-stone-50 text-stone-600" : "bg-amber-700 hover:bg-amber-800 text-white"
                }`}
              >
                תודה!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
