import { prisma } from "@/lib/prisma";

// Shared WordEntry parsing and Tanakh-wide frequency counts, used by leitword detection
// and the grammar quiz.

export type ParsedWord = {
  num: string; // Strong's number of the main word, no "H" prefix
  seg: string; // its morph segment, e.g. "Vqw3ms"
  pos: string; // part of speech: first letter of seg (V verb, N noun, A adjective, …)
  proper: boolean;
};

// A WordEntry is a prefix chain plus one main word: lemma "c/7200" ↔ morph "HC/Vqw3ms".
// The lemma segment holding the Strong's number lines up with the morph segment of the
// same index (after the leading language letter), which describes that main word.
export function parseWord(lemma: string, morph: string): ParsedWord | null {
  const lemmaParts = lemma.split("/");
  const morphParts = morph.slice(1).split("/");
  const i = lemmaParts.findIndex((s) => /^\d/.test(s.trim()));
  if (i < 0) return null;
  const seg = morphParts[i] ?? "";
  return { num: lemmaParts[i].trim().match(/^\d+/)![0], seg, pos: seg[0] ?? "", proper: seg.startsWith("Np") };
}

let corpusCounts: Promise<{ counts: Map<string, number>; total: number }> | null = null;

// Tanakh-wide occurrence count per Strong's number — computed once per server process
// (counts only change on re-seed, so restart the server after seeding).
export function getCorpusCounts() {
  corpusCounts ??= (async () => {
    const rows = await prisma.$queryRawUnsafe<{ lemma: string; morph: string; c: bigint | number }[]>(
      `SELECT lemma, morph, COUNT(*) AS c FROM "WordEntry" GROUP BY lemma, morph`
    );
    const counts = new Map<string, number>();
    let total = 0;
    for (const r of rows) {
      const w = parseWord(r.lemma, r.morph);
      if (!w) continue;
      const c = Number(r.c);
      counts.set(w.num, (counts.get(w.num) ?? 0) + c);
      total += c;
    }
    return { counts, total };
  })();
  return corpusCounts;
}
