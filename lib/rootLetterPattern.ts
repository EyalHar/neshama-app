// Client-safe constants and types for the roots-by-letters search (the data lives in the
// server-only lib/rootLetters.ts)

export const ROOT_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");

// Fourth selector: "" = triliteral roots only; ANY_LETTER = quadriliteral roots, any 4th letter
export const ANY_LETTER = "*";

export type RootScope = "tanakh" | "torah" | "nevi" | "ketuvim";

// One entry per root position; the 4th decides between triliteral and quadriliteral roots
export type RootPattern = [string, string, string, string];

// `letters`: the root in regular (non-final) letters, e.g. "ברכ"; `plain`: Strong's spelling ("ברך")
export type RootItem = { letters: string; plain: string; lemmaHe: string; count: number };
