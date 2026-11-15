import CharacterGraph from "./CharacterGraph";
import PageHeader from "@/app/components/PageHeader";

export default function CharactersPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="רשת הדמויות" />
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        30 הדמויות שנזכרות הכי הרבה בכל ספר, ומי מופיע עם מי באותם פרקים. השמות נלקחו מסימון השמות הפרטיים של OSHB, ושמות
        של מקומות, חודשים ושמות ה׳ לא נכללו. לפעמים Strong&apos;s מאחד כמה אנשים באותו שם לערך אחד, ושם של אב קדמון משמש
        גם לשבט (יהודה, בנימין), ולכן אפשר להסתיר דמות מהגרף.
      </p>
      <CharacterGraph />
    </div>
  );
}
