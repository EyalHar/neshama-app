// Client-safe constants and types for the roots-by-letters search (the data lives in the
// server-only lib/rootLetters.ts)

export const ROOT_LETTERS = "אבגדהוזחטיכלמנסעפצקרשת".split("");

export type RootScope = "tanakh" | "torah" | "nevi" | "ketuvim";

// `letters`: the root in regular (non-final) letters, e.g. "ברכ"; `plain`: Strong's spelling ("ברך")
export type RootItem = { letters: string; plain: string; lemmaHe: string; count: number };
