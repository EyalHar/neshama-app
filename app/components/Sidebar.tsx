"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import TempleIcon from "./TempleIcon";

type NavItem = { href: string; label: string; icon: ReactNode };

// Everyday pages — always visible
const NAV_ITEMS: NavItem[] = [
  { href: "/tanakh", label: "קריאת תנ״ך", icon: "📖" },
  { href: "/advanced", label: "חיפוש בתנ״ך", icon: "🔍" },
  { href: "/community", label: "שיתופים", icon: "💬" },
  { href: "/favorites", label: "האהובים עליי ביותר", icon: "♥" },
  { href: "/quiz", label: "בחן את עצמך", icon: "🎯" },
  { href: "/neshama", label: "נשמה", icon: "🕊" },
];

// Occasional study pages — in the collapsible "עיון ומחקר" group
const STUDY_ITEMS: NavItem[] = [
  { href: "/events", label: "אירועי התנ״ך", icon: "📜" },
  { href: "/unique-words", label: "מילים יחידאיות", icon: "1" },
  { href: "/special-letters", label: "אותיות מיוחדות", icon: "ב" },
  { href: "/jerusalem-names", label: "שמות ירושלים", icon: <TempleIcon /> },
  { href: "/unknown-roots", label: "שורשים לא ידועים", icon: "?" },
];

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
        active ? "bg-amber-700 text-white" : "text-stone-300 hover:bg-stone-800 hover:text-amber-200"
      }`}
    >
      <span className="w-5 shrink-0 text-center text-base">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [completedChapters, setCompletedChapters] = useState<number | null>(null);
  // null = follow the current page (open when on one of its pages); set once the user toggles
  const [studyToggled, setStudyToggled] = useState<boolean | null>(null);
  const studyOpen = studyToggled ?? STUDY_ITEMS.some((i) => i.href === pathname);

  const fetchStats = () => {
    if (!session?.user) { setCompletedChapters(null); return; }
    fetch("/api/tanakh/stats")
      .then((r) => r.json())
      .then((d) => setCompletedChapters(d.completedChapters ?? 0))
      .catch(() => {});
  };

  useEffect(() => { fetchStats(); }, [session, pathname]);

  useEffect(() => {
    window.addEventListener("tanakh-stats-update", fetchStats);
    return () => window.removeEventListener("tanakh-stats-update", fetchStats);
  }, [session]);

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-stone-900 text-amber-100 px-4 py-3" dir="rtl">
        <Link href="/" onClick={() => setOpen(false)} className="flame-title font-bold text-lg">
          שַׁלְהֶבֶתְ יָֽה
        </Link>
        <button onClick={() => setOpen(!open)} className="text-amber-200 text-2xl leading-none">
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        dir="rtl"
        className={`
          fixed right-0 top-0 h-full md:static z-40 w-64 bg-stone-900 text-amber-100 flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        {/* Site title */}
        {/* Site title — doubles as the link to the home page */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          aria-current={pathname === "/" ? "page" : undefined}
          title="לדף הראשי"
          className="shrink-0 block px-6 py-8 border-b border-stone-700 hover:bg-stone-800/60 transition-colors"
        >
          <h1 className="flame-title text-xl font-bold leading-snug">
            שַׁלְהֶבֶתְ יָֽה
          </h1>
          <p className="text-stone-400 text-xs mt-1">חיבור אישי לתורה נביאים וכתובים</p>
        </Link>

        {/* Nav — scrolls on its own so the sign-in/out footer below always stays visible */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={() => setOpen(false)} />
          ))}

          {/* Styled like a nav item so it lines up with the links above; its pages are indented under it */}
          <button
            type="button"
            onClick={() => setStudyToggled(!studyOpen)}
            aria-expanded={studyOpen}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              studyOpen ? "text-amber-200" : "text-stone-300"
            } hover:bg-stone-800 hover:text-amber-200`}
          >
            <span className="w-5 shrink-0 text-center text-base">📚</span>
            עיון ומחקר
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className={`ms-auto w-4 h-4 text-stone-500 transition-transform duration-200 ${studyOpen ? "rotate-180" : ""}`}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {studyOpen && (
            <div className="ms-6 ps-2 border-s border-stone-700 space-y-1">
              {STUDY_ITEMS.map((item) => (
                <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={() => setOpen(false)} />
              ))}
            </div>
          )}
        </nav>

        <div className="shrink-0 px-6 py-4 border-t border-stone-700 space-y-1">
          {firstName && (
            <p className="text-stone-300 text-xs">שלום, {firstName}</p>
          )}
          {completedChapters !== null && completedChapters > 0 && (
            <p className="text-amber-400 text-xs">
              עד כה נקראו {completedChapters} פרקים
            </p>
          )}
          {firstName && (
            <button
              onClick={() => signOut()}
              className="text-stone-400 hover:text-amber-300 text-xs transition-colors"
            >
              התנתק
            </button>
          )}
          {!firstName && (
            <Link
              href="/login"
              className="block text-center text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              התחבר לשמירת התקדמות
            </Link>
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
