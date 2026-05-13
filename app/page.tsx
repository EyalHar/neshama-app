import Link from "next/link";

const FEATURES = [
  {
    href: "/neshama",
    title: "נשמה",
    description: "שתף מה עובר עליך וקבל פסוקים מהתנ\"ך שמדברים ישירות לליבך",
    icon: "🕊",
    color: "from-amber-50 to-orange-50 border-amber-200 hover:border-amber-400",
    labelColor: "text-amber-700",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-stone-800 mb-4 leading-tight">
            התנ״ך שבקרבי
          </h1>
          <p className="text-stone-500 text-xl leading-relaxed max-w-xl mx-auto">
            חיבור אישי לדברי הקודש — כלים שמחברים בין הלב לבין המילה הנצחית
          </p>
          <div className="mt-6 w-16 h-1 bg-amber-400 mx-auto rounded-full" />
        </div>

        {/* Feature cards */}
        <div className="grid gap-5">
          {FEATURES.map((f) => (
            <Link key={f.href} href={f.href}>
              <div className={`bg-gradient-to-br ${f.color} border-2 rounded-2xl p-7 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md`}>
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{f.icon}</span>
                  <div>
                    <h2 className={`text-xl font-bold ${f.labelColor} mb-1`}>{f.title}</h2>
                    <p className="text-stone-600 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Placeholder cards */}
          {[1, 2].map((i) => (
            <div key={i} className="border-2 border-dashed border-stone-200 rounded-2xl p-7 opacity-50">
              <div className="flex items-start gap-4">
                <span className="text-4xl">✨</span>
                <div>
                  <h2 className="text-xl font-bold text-stone-400 mb-1">בקרוב...</h2>
                  <p className="text-stone-400">עוד כלי חדש בדרך</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
