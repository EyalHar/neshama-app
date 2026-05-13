"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/", label: "ראשי", icon: "✡" },
  { href: "/tanakh", label: "קריאת תנ״ך", icon: "📖" },
  { href: "/quiz", label: "בחן את עצמך", icon: "🎯" },
  { href: "/neshama", label: "נשמה", icon: "🕊" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user) { setCompletedChapters(null); return; }
    fetch("/api/tanakh/stats")
      .then((r) => r.json())
      .then((d) => setCompletedChapters(d.completedChapters ?? 0))
      .catch(() => {});
  }, [session, pathname]);

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-stone-900 text-amber-100 px-4 py-3" dir="rtl">
        <span className="font-bold text-lg">התנ״ך שבקרבי</span>
        <button onClick={() => setOpen(!open)} className="text-amber-200 text-2xl leading-none">
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        dir="rtl"
        className={`
          fixed right-0 top-0 h-full md:static md:h-auto z-40 w-64 bg-stone-900 text-amber-100 flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        {/* Site title */}
        <div className="px-6 py-8 border-b border-stone-700">
          <h1 className="text-xl font-bold text-amber-300 leading-snug">
            התנ״ך שבקרבי
          </h1>
          <p className="text-stone-400 text-xs mt-1">חיבור אישי לכתבי הקודש</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber-700 text-white"
                    : "text-stone-300 hover:bg-stone-800 hover:text-amber-200"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-stone-700 space-y-1">
          {firstName && (
            <p className="text-stone-300 text-xs">שלום, {firstName}</p>
          )}
          {completedChapters !== null && completedChapters > 0 && (
            <p className="text-amber-400 text-xs">
              עד כה נקראו {completedChapters} פרקים
            </p>
          )}
          {!firstName && (
            <p className="text-stone-500 text-xs text-center">עוד דפים בקרוב...</p>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
