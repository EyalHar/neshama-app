import PageHeader from "@/app/components/PageHeader";
import FrequenciesView from "./FrequenciesView";

export default async function FrequenciesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="המילים והשורשים השכיחים" />
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        אילו מילים ושורשים חוזרים הכי הרבה בתורה, בנביאים, בכתובים ובכל התנ״ך, כמה פעמים, ואיפה הם נזכרים לראשונה. אפשר
        לפתוח כל מילה ולראות את הפסוקים שלה. הספירה לפי חלוקת המילים של OSHB (מילים המחוברות במקף נספרות בנפרד), ולכן
        אינה זהה למניין המסורתי של תיבות התורה.
      </p>
      <FrequenciesView initialTab={tab === "roots" ? "roots" : "words"} />
    </div>
  );
}
