// Checks lib/idioms.ts against the data: every verse exists and holds its `match`
// (the first word may carry up to 3 prefix letters from ובכלמהש), ids are unique, no field is empty.
// Run: node scripts/check-idioms.mjs

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { IDIOMS } = await import(pathToFileURL(path.join(root, "lib/idioms.ts")).href);
const { TANAKH_BOOKS } = await import(pathToFileURL(path.join(root, "lib/tanakh.ts")).href);

const db = new DatabaseSync(path.join(root, "prisma/dev.db"), { readOnly: true });
const getVerse = db.prepare("SELECT plainText FROM VerseText WHERE book = ? AND chapter = ? AND verse = ?");
const BOOKS = new Set(TANAKH_BOOKS.map((b) => b.id));
const TYPES = new Set(["verbatim", "adapted", "later"]);
const PREFIX = /^[ובכלמהש]{0,3}$/;

function holds(plainText, match) {
  const words = plainText.split(" ");
  const m = match.trim().split(/\s+/);
  for (let i = 0; i + m.length <= words.length; i++) {
    const w = words[i];
    if (!w.endsWith(m[0]) || !PREFIX.test(w.slice(0, w.length - m[0].length))) continue;
    if (m.slice(1).every((x, k) => words[i + 1 + k] === x)) return true;
  }
  return false;
}

const problems = [];
const seen = new Set();
const filled = (v) => typeof v === "string" && v.trim() !== "";

for (const it of IDIOMS) {
  const tag = it.id || "(no id)";
  const bad = (msg) => problems.push(`${tag}: ${msg}`);
  if (!/^[a-z0-9-]+$/.test(it.id ?? "")) bad("id must be an ascii slug");
  if (seen.has(it.id)) bad("duplicate id");
  seen.add(it.id);
  for (const f of ["saying", "meaning", "context"]) if (!filled(it[f])) bad(`empty ${f}`);
  if (!TYPES.has(it.type)) bad(`bad type ${it.type}`);
  if (typeof it.changed !== "boolean") bad("changed must be boolean");
  if (it.later && (it.type !== "later" || !filled(it.later.source) || !filled(it.later.sefariaRef)))
    bad("bad later");
  if (!Array.isArray(it.verses) || it.verses.length === 0) bad("no verses");
  for (const v of it.verses ?? []) {
    const ref = `${v.book} ${v.chapter}:${v.verse}`;
    if (!BOOKS.has(v.book)) { bad(`unknown book ${v.book}`); continue; }
    if (!filled(v.match)) bad(`${ref}: empty match`);
    if (/[֑-ׇ]/.test(v.match)) bad(`${ref}: match has nikud`);
    const row = getVerse.get(v.book, v.chapter, v.verse);
    if (!row) { bad(`${ref}: no such verse`); continue; }
    if (!holds(row.plainText, v.match)) bad(`${ref}: "${v.match}" not in "${row.plainText}"`);
  }
}

for (const p of problems) console.log(p);
console.log(`${IDIOMS.length} idioms, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
