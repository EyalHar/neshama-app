import data from "@/data/loanwords/loanwords.json";

// Words Strong's dictionary (1894) marks as borrowed from another language — a one-time snapshot
// built by scripts/build-loanwords.mjs. Client-safe: no Prisma here (verses come from
// /api/loanwords/verses).

export type LoanOrigin = "persian" | "egyptian" | "greek" | "babylonian" | "foreign";
export type LoanCertainty = "certain" | "probable" | "possible";

export type Loanword = {
  strongs: string;
  lemma: string;
  xlit: string;
  definition: string;
  derivation: string;
  origin: LoanOrigin;
  certainty: LoanCertainty;
  // An entry of the Aramaic parts of the Tanakh (Daniel, Ezra…)
  aramaic: boolean;
  name: boolean;
  tokens: number;
};

export const LOANWORDS = data as Loanword[];

export const ORIGIN_LABELS: Record<LoanOrigin, string> = {
  persian: "פרסית",
  egyptian: "מצרית",
  greek: "יוונית",
  babylonian: "בבלית",
  foreign: "לשון זרה (לא פורט)",
};

export const CERTAINTY_LABELS: Record<LoanCertainty, string> = {
  certain: "",
  probable: "כנראה",
  possible: "אולי",
};
