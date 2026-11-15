import LetterWheel from "./LetterWheel";
import PageHeader from "@/app/components/PageHeader";

export default function LetterPairsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="צירופי אותיות · רל״א שערים" />
      <p className="text-stone-500 text-sm mb-4 leading-relaxed max-w-3xl">
        &quot;עשרים ושתים אותיות יסוד, קבען בגלגל כמין חומה ברל״א שערים, וחוזר הגלגל פנים ואחור&quot; (ספר יצירה ב, ד).
        כל קו בגלגל מחבר שתי אותיות, וכל צמד כזה הוא &quot;שער&quot;: 22×21÷2 = 231. בחרו שתי אותיות כדי לראות את
        שורשי הפועל במקרא שמכילים את הצמד, בשני הכיוונים.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 leading-relaxed mb-6 max-w-3xl">
        צמד אותיות משותף הוא נתון, לא הוכחה לקשר במשמעות. לפעמים הקשר ברור (פרר, פרד, פרט, פרץ), ולפעמים הדמיון
        מקרי (פרה, פרח). הקו עבה יותר ככל שיותר שורשים מכילים את הצמד, וקווים חסרים הם צמדים שלא מופיעים כלל.
      </div>
      <LetterWheel />
    </div>
  );
}
