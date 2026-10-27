"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import {
  MODERN_PLACES,
  ANCIENT_PLACES,
  type AncientRegion,
  type BiblicalPlace,
} from "@/lib/biblicalPlaces";

const BOOK_HE = Object.fromEntries(TANAKH_BOOKS.map((b) => [b.id, b.he]));
const REGIONS: AncientRegion[] = ["ארץ ישראל", "עבר הירדן", "מחוץ לארץ"];

const byName = (a: BiblicalPlace, b: BiblicalPlace) => a.name.localeCompare(b.name, "he");
const SORTED_MODERN = [...MODERN_PLACES].sort(byName);
const SORTED_ANCIENT = [...ANCIENT_PLACES].sort(byName);

function PlaceRow({ place, accent }: { place: BiblicalPlace; accent: string }) {
  return (
    <li>
      <Link
        href={`/tanakh?book=${encodeURIComponent(place.book)}&chapter=${place.chapter}&verse=${place.verse}`}
        className="group flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors"
      >
        <span className="min-w-0">
          <span className="font-medium text-stone-800">{place.name}</span>
          {place.note && <span className="text-xs text-stone-400 ms-2">{place.note}</span>}
        </span>
        <span className={`shrink-0 text-xs ${accent} whitespace-nowrap`}>
          {BOOK_HE[place.book]} {toHebrewNumeral(place.chapter)}&lrm;:{toHebrewNumeral(place.verse)}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity"> ←</span>
        </span>
      </Link>
    </li>
  );
}

function Column({ title, subtitle, count, headerClass, children }: {
  title: string;
  subtitle: string;
  count: number;
  headerClass: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <header className={`px-5 py-4 border-b ${headerClass}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <span className="text-xs bg-white/70 rounded-full px-2.5 py-0.5">{count}</span>
        </div>
        <p className="text-xs mt-1 opacity-80">{subtitle}</p>
      </header>
      <div className="p-2">{children}</div>
    </section>
  );
}

const Empty = () => <p className="text-stone-400 text-sm text-center py-6">אין תוצאות</p>;

export default function BiblicalPlacesPage() {
  const [query, setQuery] = useState("");
  const matches = (p: BiblicalPlace) => p.name.includes(query.trim());
  const modern = SORTED_MODERN.filter(matches);
  const ancient = SORTED_ANCIENT.filter(matches);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">ערים ויישובים במקרא</h1>
      <p className="text-stone-500 text-sm mb-6">
        יישובים של היום ששמם מופיע בתנ״ך, ויישובים מקראיים שכבר אינם קיימים — כל שם מקושר לפסוק בקורא
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חפש יישוב... (למשל שילה, נהלל, צקלג)"
        className="w-full rounded-xl border border-stone-200 px-4 py-2.5 mb-6 text-stone-700 focus:outline-none focus:border-emerald-400"
      />

      <div className="grid gap-6 md:grid-cols-2 items-start">
        <Column
          title="יישובים הקיימים כיום"
          subtitle="ערים, מושבים, קיבוצים ויישובים ששמם בתנ״ך — גם כשבמקרא זה שם של אדם, מילה או ביטוי"
          count={modern.length}
          headerClass="bg-emerald-50 border-emerald-100 text-emerald-900"
        >
          {modern.length === 0 ? <Empty /> : (
            <ul>
              {modern.map((p) => <PlaceRow key={p.name} place={p} accent="text-emerald-700" />)}
            </ul>
          )}
        </Column>

        <Column
          title="יישובים עתיקים"
          subtitle="ערים מקראיות שאינן קיימות עוד, ונותרו מהן תלים, חורבות או זיכרון בלבד"
          count={ancient.length}
          headerClass="bg-amber-50 border-amber-100 text-amber-900"
        >
          {ancient.length === 0 ? <Empty /> : REGIONS.map((region) => {
            const places = ancient.filter((p) => p.region === region);
            if (places.length === 0) return null;
            return (
              <div key={region} className="mb-2 last:mb-0">
                <h3 className="px-3 pt-3 pb-1 text-xs font-semibold text-stone-400">{region}</h3>
                <ul>
                  {places.map((p) => <PlaceRow key={p.name} place={p} accent="text-amber-700" />)}
                </ul>
              </div>
            );
          })}
        </Column>
      </div>
    </div>
  );
}
