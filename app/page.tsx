import { TOOL_GROUPS } from "./discover/tools";
import ToolCard from "./discover/ToolCard";

const FEATURES = [
  {
    href: "/tanakh",
    title: "קריאת תנ״ך",
    description: "קרא את התנ״ך פרק אחרי פרק, סמן פסוקים שקראת ועקוב אחר ההתקדמות שלך",
    icon: "📖",
  },
  {
    href: "/community",
    title: "קהילה",
    description: "הערות וחידושים על פסוקים ששיתפו משתמשי האתר — קרא, הגב ועשה לייק, ושתף גם את שלך",
    icon: "💬",
  },
  {
    href: "/favorites",
    title: "האהובים שלי",
    description: "פרקים ופסוקים ששמרת כאהובים ביותר — הכל במקום אחד, מוכן לחזור אליו בכל רגע",
    icon: <span className="text-red-600">♥</span>,
  },
  {
    href: "/notebook",
    title: "המחברת שלי",
    description: "דפים לדבר תורה או לסיכום: כתבו חופשי ואספו פסוקים, הערות וקטעים מהפרשנים, כל אחד עם המקור שלו",
    icon: "📝",
  },
  {
    href: "/advanced?tab=letters",
    title: "אות ראשונה ואחרונה בפסוק",
    description: "מצא פסוקים שמתחילים ונגמרים באותיות שתבחר מהאלף-בית",
    icon: "א",
  },
  {
    href: "/advanced",
    title: "חיפוש בתנ״ך",
    description: "חיפוש בסיסי, חיפוש תת-מחרוזת, חיפוש לפי שורש עברי וחיפוש לפי בניין — על כל מילות התנ״ך",
    icon: "🔍",
  },
  {
    href: "/quiz",
    title: "בחן את עצמך",
    description: "חידון פסוקים — השלם את המילה החסרה וגלה כמה אתה מכיר את התנ״ך",
    icon: "🎯",
  },
  {
    href: "/neshama",
    title: "נשמה",
    description: "שתף מה עובר עליך וקבל פסוקים מהתנ״ך שמדברים ישירות לליבך",
    icon: "🕊",
  },
  ...TOOL_GROUPS.flatMap((g) => g.tools),
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="flame-title text-5xl font-bold mb-4 leading-tight">
            שַׁלְהֶבֶתְ יָֽה
          </h1>
          <p className="text-stone-500 text-xl leading-relaxed max-w-xl mx-auto">
            חיבור אישי לתורה נביאים וכתובים — כלים שמחברים בין הלב לבין המילה הנצחית
          </p>
          <div className="mt-6 w-16 h-1 bg-amber-400 mx-auto rounded-full" />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => <ToolCard key={f.href} {...f} />)}
        </div>
      </div>
    </div>
  );
}
