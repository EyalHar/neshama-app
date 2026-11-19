import PageHeader from "@/app/components/PageHeader";
import { MIDDOT, type MiddahExample, type ShownVerse } from "@/lib/middot";
import { loadVerse } from "@/lib/middotVerses";
import MiddotView, { type ShownExample, type ShownMiddah } from "./MiddotView";

async function showExample(e: MiddahExample): Promise<ShownExample> {
  const verses = (await Promise.all(e.verses.map((v) => loadVerse(v)))).filter((v): v is ShownVerse => v !== null);
  return { title: e.title, source: e.source, sefariaRef: e.sefariaRef, explain: e.explain, verses };
}

export default async function MiddotPage() {
  const middot: ShownMiddah[] = await Promise.all(
    MIDDOT.map(async (m) => ({
      n: m.n,
      id: m.id,
      name: m.name,
      baraita: m.baraita,
      explain: m.explain,
      examples: await Promise.all(m.examples.map(showExample)),
      more: await Promise.all(m.more.map(showExample)),
    }))
  );
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="י״ג מידות שהתורה נדרשת בהן" />
      <div className="bg-amber-50/70 border-s-4 border-amber-400 rounded-e-xl px-5 py-4 mb-4 max-w-3xl">
        <p className="text-xl text-stone-800 leading-relaxed">״רבי ישמעאל אומר: בשלש עשרה מדות התורה נדרשת״</p>
        <p className="text-sm text-stone-500 mt-1">
          הברייתא שבפתח ספרא, מדרש ההלכה על ספר ויקרא. היא נאמרת בכל יום בתפילת שחרית.
        </p>
      </div>
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        המידות הן הכללים שבהם חז״ל למדו הלכות מן הכתוב. לכל מידה כאן: לשון הברייתא, הסבר, והדוגמה שהברייתא עצמה מביאה
        מן התורה. ״עוד דוגמאות״ מביא דוגמאות נוספות, וגם מקורות מהתלמוד וממדרשי ההלכה שבהם המידה נזכרת בשמה, מתוך
        החיפוש של ספריא.
      </p>
      <MiddotView middot={middot} />
    </div>
  );
}
