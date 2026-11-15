import { TOOL_GROUPS } from "./tools";
import ToolCard from "./ToolCard";

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">גלה</h1>
        <p className="text-stone-500 leading-relaxed mb-10 max-w-2xl">
          כלים לעיון ולמחקר בתנ״ך: במילים ובאותיות, בנוסח ובמבנה שלו, ובאנשים, במקומות ובאירועים שבו.
        </p>

        <div className="space-y-10">
          {TOOL_GROUPS.map((g) => (
            <section key={g.title} aria-labelledby={`group-${g.title}`}>
              <div className="flex items-baseline gap-3 flex-wrap mb-4 pb-2 border-b border-stone-200">
                <h2 id={`group-${g.title}`} className="text-xl font-bold text-stone-700">{g.title}</h2>
                <p className="text-sm text-stone-500">{g.intro}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {g.tools.map((t) => <ToolCard key={t.href} {...t} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
