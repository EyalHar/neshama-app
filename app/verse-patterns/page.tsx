import PageHeader from "@/app/components/PageHeader";
import VersePatternsTabs from "./VersePatternsTabs";
import { PATTERN_TABS } from "./tabs";

export default async function VersePatternsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="תבניות בפסוק" />
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        תבניות שנוצרות מסדר המילים בתוך פסוק: מילים שחוזרות בסדר הפוך, כמו בתמונת ראי, ומילים שנאמרות פעמיים ברצף. הזיהוי
        אוטומטי, לפי השורש המילוני של כל מילה, כך שגם ״דָּם״ ו״דָּמוֹ״ נחשבות לאותה מילה.
      </p>
      <VersePatternsTabs initial={PATTERN_TABS.find((t) => t === tab) ?? "chiasm"} />
    </div>
  );
}
