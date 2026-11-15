"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { NAV_GROUPS, isNavActive, type NavItem } from "./nav";

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
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
      <div className="md:hidden print:hidden flex items-center justify-between bg-stone-900 text-amber-100 px-4 py-3" dir="rtl">
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
          fixed right-0 top-0 h-full md:static print:hidden z-40 w-64 bg-stone-900 text-amber-100 flex flex-col
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
          className="shrink-0 block px-6 py-6 border-b border-stone-700 hover:bg-stone-800/60 transition-colors"
        >
          <h1 className="flame-title text-xl font-bold leading-snug">
            שַׁלְהֶבֶתְ יָֽה
          </h1>
          <p className="text-stone-400 text-xs mt-1">חיבור אישי לתורה נביאים וכתובים</p>
        </Link>

        {/* Nav — scrolls on its own so the sign-in/out footer below always stays visible */}
        <nav className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 py-4">
          {NAV_GROUPS.map((group, i) => (
            <section key={group.title} aria-label={group.title} className={i > 0 ? "mt-5" : ""}>
              <h2 className="px-4 mb-1.5 text-[11px] font-semibold tracking-wide text-stone-500">{group.title}</h2>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isNavActive(item.href, pathname)} onNavigate={() => setOpen(false)} />
                ))}
              </div>
            </section>
          ))}
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
