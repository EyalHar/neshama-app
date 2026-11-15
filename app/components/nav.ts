import type { ReactNode } from "react";
import { TOOL_GROUPS } from "../discover/tools";

// The sidebar's groups, and where a page sits in them (for the page header's category line)

export type NavItem = { href: string; label: string; icon: ReactNode };

// Three titled groups: the text itself, the user's own and shared content, and experiences. The
// study tools live on /discover, so "גלה" is also active on any of their pages.
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "תנ״ך",
    items: [
      { href: "/tanakh", label: "קריאת תנ״ך", icon: "📖" },
      { href: "/advanced", label: "חיפוש בתנ״ך", icon: "🔍" },
      { href: "/discover", label: "גלה", icon: "✨" },
    ],
  },
  {
    title: "אישי וקהילה",
    items: [
      { href: "/favorites", label: "האהובים שלי", icon: "♥" },
      { href: "/notebook", label: "המחברת שלי", icon: "📝" },
      { href: "/community", label: "קהילה", icon: "💬" },
    ],
  },
  {
    title: "חוויה",
    items: [
      { href: "/quiz", label: "בחן את עצמך", icon: "🎯" },
      { href: "/neshama", label: "נשמה", icon: "🕊" },
    ],
  },
];

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const toolGroupOf = (pathname: string) => TOOL_GROUPS.find((g) => g.tools.some((t) => under(pathname, t.href)));

export function isNavActive(href: string, pathname: string): boolean {
  return under(pathname, href) || (href === "/discover" && !!toolGroupOf(pathname));
}

// "גלה · נוסח ומבנה" for a study tool, else null: sidebar pages are already marked in the sidebar
export function pageCategory(pathname: string): string | null {
  const tools = toolGroupOf(pathname);
  return tools ? `גלה · ${tools.title}` : null;
}
