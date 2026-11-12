import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PARALLELS, sideLabel, workHe, type Parallel } from "@/lib/parallels";

const SNIPPET_WORDS = 6;

export default async function ParallelsPage() {
  const starts = await prisma.verseText.findMany({
    where: { OR: PARALLELS.map((p) => ({ book: p.a.book, chapter: p.a.start[0], verse: p.a.start[1] })) },
    select: { book: true, chapter: true, verse: true, text: true },
  });
  const snippetOf = new Map(starts.map((s) => [`${s.book}:${s.chapter}:${s.verse}`, s.text.split(" ").slice(0, SNIPPET_WORDS).join(" ")]));

  // Grouped by the two works, in the order they first appear (Torah first)
  const groups = new Map<string, Parallel[]>();
  for (const p of PARALLELS) {
    const title = workHe(p.a.book) === workHe(p.b.book) ? `בתוך ${workHe(p.a.book)}` : `${workHe(p.a.book)} ↔ ${workHe(p.b.book)}`;
    groups.set(title, [...(groups.get(title) ?? []), p]);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">נוסחים מקבילים</h1>
      <p className="text-stone-500 text-sm mb-6 leading-relaxed max-w-3xl">
        קטעים שהתנ״ך מספר פעמיים: שמואל ומלכים מול דברי הימים, שירת דוד בשמואל ובתהלים, עשרת הדיברות בשמות ובדברים,
        ציווי המשכן ועשייתו ועוד. בחרו קטע כדי לראות את שני הנוסחים זה לצד זה, עם ההבדלים מסומנים. הרשימה חושבה
        מהטקסט עצמו: פסוקים שרוב מילותיהם משותפות.
      </p>

      <div className="space-y-8">
        {[...groups].map(([title, items]) => (
          <section key={title}>
            <h2 className="text-sm font-bold text-stone-500 mb-2">
              {title} <span className="font-normal text-stone-400">· {items.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((p) => (
                <Link
                  key={p.id}
                  href={`/parallels/${p.id}`}
                  className="bg-white border border-stone-200 rounded-xl px-4 py-3 hover:border-amber-400 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-semibold text-stone-800">
                    {sideLabel(p.a)} <span className="text-stone-400 font-normal">↔</span> {sideLabel(p.b)}
                  </p>
                  <p className="text-sm text-stone-500 mt-1 truncate">{snippetOf.get(`${p.a.book}:${p.a.start[0]}:${p.a.start[1]}`)}…</p>
                  <p className="text-[11px] text-stone-400 mt-1">{p.pairs.length} פסוקים מקבילים</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
