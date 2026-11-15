// The reader's custom (מנהג): picks the weekly haftarah and the accent names in the accent tree.
// Client-safe.

export type Custom = "ashkenazi" | "sephardi";

export const CUSTOM_KEY = "tanakh-custom";

export const CUSTOMS: { id: Custom; label: string }[] = [
  { id: "ashkenazi", label: "אשכנז" },
  { id: "sephardi", label: "ספרד" },
];

export const parseCustom = (value: string | null): Custom => (value === "sephardi" ? "sephardi" : "ashkenazi");
