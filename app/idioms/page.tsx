import PageHeader from "@/app/components/PageHeader";
import { IDIOMS } from "@/lib/idioms";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import type { ShownVerse } from "@/lib/middot";
import { loadVerse } from "@/lib/middotVerses";
import IdiomsBrowser, { type ShownIdiom } from "./IdiomsBrowser";

const SECTION = new Map(TANAKH_BOOKS.map((b) => [b.id, b.section]));

export default async function IdiomsPage() {
  const idioms: ShownIdiom[] = await Promise.all(
    IDIOMS.map(async (i) => ({
      ...i,
      section: SECTION.get(i.verses[0]?.book ?? "") ?? "",
      shown: (await Promise.all(i.verses.map((v) => loadVerse(v)))).filter((v): v is ShownVerse => v !== null),
    }))
  );
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="ניבים ופתגמים מן המקרא" />
      <p className="text-stone-600 leading-relaxed mb-2 max-w-3xl">
        ביטויים שאנחנו אומרים היום בלי לחשוב, ומקורם בתנ״ך: ״אין חדש תחת השמש״, ״לא דובים ולא יער״. לכל אחד המשמעות שלו
        היום, הפסוק שממנו הוא בא, ומה פירושו שם. לפעמים המשמעות זזה בדרך.
      </p>
      <p className="text-stone-500 text-sm leading-relaxed mb-6 max-w-3xl">
        כל ביטוי נבדק מול לשון הפסוק. ביטוי ״שנבנה על סיפור״ נשען על סיפור מקראי, אבל נוסחו שלו נוצר מאוחר יותר. כשהמקור
        הראשון של הנוסח נמצא ונבדק (בספרות חז״ל), הוא מצוין; כשלא, לא נכתב מקור.
      </p>
      {idioms.length === 0 ? (
        <p className="text-stone-400 text-center py-12">הרשימה בהכנה.</p>
      ) : (
        <IdiomsBrowser idioms={idioms} />
      )}
    </div>
  );
}
