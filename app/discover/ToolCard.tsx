import Link from "next/link";
import type { ReactNode } from "react";

// A feature card, shared by the home page and /discover: white with a thin border, color only in
// the icon, an amber border on hover
export default function ToolCard({ href, title, description, icon }: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 hover:shadow-md transition-all duration-200"
    >
      <span className="text-3xl w-9 shrink-0 text-center leading-none pt-0.5 font-bold text-amber-700">{icon}</span>
      <span>
        <span className="block text-lg font-bold text-stone-800 group-hover:text-amber-800 transition-colors mb-1">{title}</span>
        <span className="block text-sm text-stone-600 leading-relaxed">{description}</span>
      </span>
    </Link>
  );
}
