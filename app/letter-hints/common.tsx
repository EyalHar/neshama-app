export const SCOPES = [
  { id: "tanakh", label: "כל התנ״ך" },
  { id: "torah", label: "תורה" },
  { id: "nevi", label: "נביאים" },
  { id: "ketuvim", label: "כתובים" },
];

const fmt = (n: number) => (n >= 10 ? Math.round(n).toLocaleString("he-IL") : n >= 0.1 ? n.toFixed(1) : "פחות מ־0.1");

// Found vs. what a text with the same letter frequencies would give by chance
export function ChanceNote({ found, expected }: { found: number; expected: number }) {
  const ratio = expected > 0 ? found / expected : 0;
  const verdict =
    expected <= 0 ? "" : ratio >= 2 ? "יותר ממה שצפוי במקרה." : ratio <= 0.5 ? "פחות ממה שצפוי במקרה." : "בערך כמו שצפוי במקרה.";
  return (
    <p className="text-sm text-stone-600 mb-3">
      נמצאו <b>{found.toLocaleString("he-IL")}</b> מופעים.{" "}
      <span className="text-stone-500">
        בטקסט אקראי עם אותן שכיחויות של אותיות היו צפויים כ־{fmt(expected)}: {verdict}
      </span>
    </p>
  );
}
