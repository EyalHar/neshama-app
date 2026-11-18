import PageHeader from "@/app/components/PageHeader";
import { getAcrostics } from "@/lib/letterHints";
import LetterHintsTabs, { type HintsTab } from "./LetterHintsTabs";

const TABS: HintsTab[] = ["initials", "acrostics", "els"];

export default async function LetterHintsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const acrostics = await getAcrostics();
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="רמזים באותיות" />
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        מילים שנוצרות מאותיות הטקסט: מראשי המילים או מסופיהן, מראשי השורות באקרוסטיכון, או מאותיות במרחק קבוע.
        האקרוסטיכונים הם מבנה מכוון של הכתוב. בשאר החיפושים מוצג גם כמה מופעים היו צפויים במקרה, כדי שאפשר יהיה לשפוט.
      </p>
      <LetterHintsTabs initial={TABS.includes(tab as HintsTab) ? (tab as HintsTab) : "initials"} acrostics={acrostics} />
    </div>
  );
}
