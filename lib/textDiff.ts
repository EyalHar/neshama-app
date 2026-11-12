// Word-level comparison of two versions of a verse, for the parallel-passages view.
// Words are compared without nikud. Words that differ only in vowel letters (ו, י) count as the
// same word spelled differently (plene / defective: דָּוִד / דָּוִיד).

export type DiffKind = "same" | "spelling" | "only";
export type DiffWord = { word: string; kind: DiffKind };

const letters = (w: string) => w.replace(/[^א-ת]/g, "");
const skeleton = (w: string) => letters(w).replace(/[וי]/g, "");

export function diffWords(a: string, b: string): { a: DiffWord[]; b: DiffWord[] } {
  const wa = a.split(" ").filter(Boolean), wb = b.split(" ").filter(Boolean);
  const ka = wa.map(skeleton), kb = wb.map(skeleton);
  // Longest common subsequence of the skeletons
  const lcs = Array.from({ length: wa.length + 1 }, () => new Array<number>(wb.length + 1).fill(0));
  for (let i = wa.length - 1; i >= 0; i--) {
    for (let j = wb.length - 1; j >= 0; j--) {
      lcs[i][j] = ka[i] === kb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const outA: DiffWord[] = wa.map((word) => ({ word, kind: "only" }));
  const outB: DiffWord[] = wb.map((word) => ({ word, kind: "only" }));
  let i = 0, j = 0;
  while (i < wa.length && j < wb.length) {
    if (ka[i] === kb[j]) {
      const kind: DiffKind = letters(wa[i]) === letters(wb[j]) ? "same" : "spelling";
      outA[i].kind = kind;
      outB[j].kind = kind;
      i++; j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  return { a: outA, b: outB };
}
