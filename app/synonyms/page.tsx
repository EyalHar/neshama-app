import PageHeader from "@/app/components/PageHeader";
import { SYNONYMS } from "@/lib/synonyms";
import SynonymsView from "./SynonymsView";

export default async function SynonymsPage({ searchParams }: { searchParams: Promise<{ pair?: string; book?: string }> }) {
  const { pair, book } = await searchParams;
  const initialPair = SYNONYMS.pairs.find((p) => p.id === pair)?.id ?? SYNONYMS.pairs[0].id;
  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="מילים נרדפות" />
      <p className="text-stone-600 leading-relaxed mb-2 max-w-3xl">
        לפעמים לתנ״ך יש שתי מילים לאותו דבר: אִתְּךָ ועִמְּךָ, אָנֹכִי ואֲנִי, לֵב ולֵבָב. האם הבחירה ביניהן היא עניין של
        ספר, כלומר כל ספר מעדיף מילה אחת, או שבאותו ספר משתמשים בשתיהן?
      </p>
      <p className="text-stone-500 text-sm leading-relaxed mb-6 max-w-3xl">
        לכל זוג מוצג החלק של כל מילה בכל ספר (כך שאורך הספר אינו משנה), פרק אחר פרק בספר שבוחרים, ופסוקים מאותו ספר שבהם
        מופיעה כל אחת מהמילים. הנתונים בלבד, מתוך הטקסט, בלי הכרעות מהספרות.
      </p>
      <SynonymsView initialPair={initialPair} initialBook={book ?? null} />
    </div>
  );
}
