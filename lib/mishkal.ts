import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { extractStrongsNumber, type WordRow } from "@/lib/rootFamily";

// Noun/adjective patterns (mishkalim) per Gesenius §84–86, from the one-time snapshots built by
// scripts/build-noun-patterns.mjs and scripts/build-noun-patterns-extended.mjs. The second file
// only adds words the first leaves without a mishkal, so the two never overlap.

export type MishkalKind = "noun" | "adjective";

export type MishkalWord = {
  strongs: string;
  form: string;
  kind: MishkalKind;
  tokens: number;
  root: string | null;
  mishkal: string;
  translit: string;
  gesenius: string;
  // Root was guessed (assumed-root / inferred-root), so the classification is less certain
  uncertainRoot: boolean;
};

export type MishkalSummary = {
  mishkal: string;
  translit: string;
  gesenius: string;
  nouns: number;
  adjectives: number;
  tokens: number;
};

type SnapshotEntry = {
  strongs: string;
  form: string | null;
  tokens: number;
  root?: string;
  mishkal?: string;
  translit?: string;
  gesenius?: string;
  status: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "noun-patterns");
const UNCERTAIN = new Set(["assumed-root", "inferred-root"]);

let words: MishkalWord[] | null = null;

function readSnapshot(file: string) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8"));
}

export function getMishkalWords(): MishkalWord[] {
  if (words) return words;
  const base = readSnapshot("noun-patterns.json");
  const extended = readSnapshot("noun-adjective-patterns-extended.json");
  const toWord = (e: SnapshotEntry, kind: MishkalKind): MishkalWord | null =>
    e.mishkal && e.form
      ? {
          strongs: e.strongs,
          form: e.form,
          kind,
          tokens: e.tokens,
          root: e.root ?? null,
          mishkal: e.mishkal,
          translit: e.translit ?? "",
          gesenius: e.gesenius ?? "",
          uncertainRoot: UNCERTAIN.has(e.status),
        }
      : null;
  words = [
    ...base.nouns.map((e: SnapshotEntry) => toWord(e, "noun")),
    ...extended.nouns.map((e: SnapshotEntry) => toWord(e, "noun")),
    ...extended.adjectives.map((e: SnapshotEntry) => toWord(e, "adjective")),
  ].filter((w): w is MishkalWord => w !== null);
  return words;
}

export function getMishkalSummaries(): MishkalSummary[] {
  const map = new Map<string, MishkalSummary>();
  for (const w of getMishkalWords()) {
    let s = map.get(w.mishkal);
    if (!s) map.set(w.mishkal, (s = { mishkal: w.mishkal, translit: w.translit, gesenius: w.gesenius, nouns: 0, adjectives: 0, tokens: 0 }));
    if (w.kind === "noun") s.nouns++;
    else s.adjectives++;
    s.tokens += w.tokens;
  }
  return [...map.values()].sort((a, b) => b.tokens - a.tokens);
}

// Every WordEntry row of every classified word, keyed by Strong's number. Read once per server
// process (one pass over WordEntry), since the snapshots only change when the scripts are rerun.
let rowsByNumber: Map<string, WordRow[]> | null = null;

export async function getWordRowsByNumber(): Promise<Map<string, WordRow[]>> {
  if (rowsByNumber) return rowsByNumber;
  const wanted = new Set(getMishkalWords().map((w) => w.strongs.replace(/^H/, "")));
  const rows = await prisma.$queryRawUnsafe<(WordRow & { lemma: string })[]>(
    `SELECT book, chapter, verse, word, lemma FROM "WordEntry"`
  );
  const map = new Map<string, WordRow[]>();
  for (const { lemma, ...row } of rows) {
    const num = extractStrongsNumber(lemma);
    if (num === null || !wanted.has(num)) continue;
    const key = `H${num}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  rowsByNumber = map;
  return map;
}
