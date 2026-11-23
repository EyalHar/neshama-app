"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FreqSpellings, SpellingForm } from "@/lib/frequenciesShared";

// "צורות כתיבה" of a written form: the same word spelled plene / defective elsewhere, and the
// different pointings of these same letters (each with what the word is there)
export default function SpellingVariants({ form }: { form: string }) {
  const [state, setState] = useState<{ data: FreqSpellings | null; error: boolean }>({ data: null, error: false });

  useEffect(() => {
    let live = true;
    fetch(`/api/frequencies/spellings?form=${encodeURIComponent(form)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (data: FreqSpellings) => live && setState({ data, error: false }),
        () => live && setState({ data: null, error: true })
      );
    return () => {
      live = false;
    };
  }, [form]);

  const { data, error } = state;
  if (error) return <p className="text-red-500 text-sm">שגיאה בטעינת צורות הכתיבה</p>;
  if (!data) return <p className="text-stone-400 text-sm">טוען צורות כתיבה...</p>;
  if (data.groups.length === 0 && data.pointings.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {data.groups.map((g) => (
        <section key={g.id}>
          <h4 className="text-xs font-semibold text-amber-800 mb-1.5">
            כתיב מלא וחסר: <span className="text-stone-700">{g.lexeme}</span>
            <span className="font-normal text-stone-500"> · {g.parse} · {g.total.toLocaleString("he-IL")} פעמים</span>
          </h4>
          <ul className="flex flex-col gap-1.5">
            {g.forms.map((f) => (
              <FormLine key={f.plain} f={f} total={g.total} current={f.plain === data.form} />
            ))}
          </ul>
        </section>
      ))}
      {data.pointings.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-amber-800 mb-1.5">אותן אותיות, ניקוד אחר</h4>
          <ul className="flex flex-col gap-1">
            {data.pointings.map((p) => (
              <li key={p.pointed} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                <span className="text-lg font-bold text-stone-800 min-w-[5rem]">{p.label}</span>
                <span className="tabular-nums text-stone-700">{p.count.toLocaleString("he-IL")}</span>
                <span className="text-xs text-stone-500">
                  {/[ְ-ׇ]/.test(p.label) ? [p.lexeme, p.parse].filter(Boolean).join(" · ") : "בלי ניקוד (כתיב שנקרא אחרת)"}
                </span>
                <Link href={p.first.href} className="text-xs text-amber-700 hover:underline">{p.first.ref} ←</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function FormLine({ f, total, current }: { f: SpellingForm; total: number; current: boolean }) {
  return (
    <li className={`rounded-lg border px-3 py-2 ${current ? "border-amber-300 bg-amber-50/60" : "border-stone-200"}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="text-lg font-bold text-stone-800">{f.label}</span>
        <span className="text-sm tabular-nums text-stone-700">
          {f.count.toLocaleString("he-IL")} <span className="text-xs text-stone-400">({Math.round((f.count / total) * 100)}%)</span>
        </span>
        {current && <span className="text-[11px] rounded bg-amber-100 text-amber-800 px-1.5 py-0.5">הצורה הזאת</span>}
        <Link href={f.first.href} className="text-xs text-amber-700 hover:underline">לראשונה: {f.first.ref} ←</Link>
      </div>
      <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
        {f.books.map((b) => `${b.book} ${b.count}`).join(" · ")}
      </p>
    </li>
  );
}
