"use client";

import { useMemo } from "react";

const COLORS = {
  chapter: ["#fbbf24", "#f59e0b", "#fde68a", "#ffffff"],
  book:    ["#fbbf24", "#f59e0b", "#10b981", "#34d399", "#ffffff"],
  section: ["#f59e0b", "#10b981", "#6366f1", "#f472b6", "#34d399", "#ffffff"],
  tanakh:  ["#fbbf24", "#f59e0b", "#10b981", "#6366f1", "#f472b6", "#ef4444", "#ffffff", "#60a5fa"],
};

interface Props {
  type: "chapter" | "book" | "section" | "tanakh";
}

export default function Confetti({ type }: Props) {
  const colors = COLORS[type];
  const count = type === "tanakh" ? 60 : type === "section" ? 45 : type === "book" ? 30 : 15;

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.2 + Math.random() * 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        shape: Math.random() > 0.5 ? "rounded-sm" : "rounded-full",
      })),
    [count, colors]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute animate-confetti ${p.shape}`}
          style={{
            left: `${p.left}%`,
            top: -12,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
