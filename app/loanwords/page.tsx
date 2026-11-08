import LoanwordsBrowser from "./LoanwordsBrowser";

export default function LoanwordsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">מילים שאולות במקרא</h1>
      <p className="text-stone-500 text-sm mb-4 leading-relaxed">
        מילים שנכנסו לעברית המקראית משפות אחרות: פרסית (בעיקר באסתר, עזרא, נחמיה ודניאל), מצרית (בסיפורי יוסף
        ויציאת מצרים), יוונית ושפות שהמקור המדויק שלהן לא ידוע.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 leading-relaxed mb-6">
        הרשימה מבוססת על הסימון במילון Strong&apos;s משנת 1894. הוא נכתב לפני רוב המחקר המודרני של השפות
        השמיות, ולכן מילים שמזוהות היום כשאולות מאכדית או משומרית, כמו <b>הֵיכָל</b> ו<b>כִּסֵּא</b>, מופיעות בו כעבריות
        ואינן ברשימה. הסימונים &quot;כנראה&quot; ו&quot;אולי&quot; הם של Strong&apos;s עצמו.
      </div>
      <LoanwordsBrowser />
      <p className="text-xs text-stone-400 mt-10 leading-relaxed" dir="ltr">
        Source: James Strong, <i>A Concise Dictionary of the Words in the Hebrew Bible</i> (1894), JSON edition by{" "}
        <a href="https://github.com/openscriptures/strongs" className="underline" target="_blank" rel="noreferrer">
          Open Scriptures
        </a>{" "}
        (CC-BY-SA). Occurrences: Open Scriptures Hebrew Bible (OSHB).
      </p>
    </div>
  );
}
