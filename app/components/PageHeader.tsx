"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { pageCategory } from "./nav";

// The title block of a page: on a study tool a small amber line with its place in "גלה", the
// title, and a thin gold rule across the page that fades out. `actions` sit beside the title,
// `children` below the rule.
export default function PageHeader({ title, actions, center = false, children }: {
  title: ReactNode;
  actions?: ReactNode;
  center?: boolean;
  children?: ReactNode;
}) {
  const category = pageCategory(usePathname());
  return (
    <header className={`mb-5 ${center ? "text-center" : ""}`}>
      <div className={`flex flex-wrap items-start gap-x-4 gap-y-2 ${center ? "justify-center" : "justify-between"}`}>
        <div>
          {category &&<p className="text-xs font-semibold tracking-wide text-amber-700 mb-1.5">{category}</p>}
          <h1 className="text-3xl font-bold text-stone-800 leading-tight">{title}</h1>
        </div>
        {actions}
      </div>
      <div
        className={`mt-4 h-px ${center
          ? "bg-gradient-to-l from-transparent via-amber-400 to-transparent"
          : "bg-gradient-to-l from-amber-400 via-amber-300/60 to-transparent"}`}
      />
      {children}
    </header>
  );
}
