// Checks lib/uplifting.ts against the data: every verse exists and holds its `match` (the first word
// may carry up to 3 prefix letters from ובכלמהש), every mood is known, no verse is listed twice.
// Run: node scripts/check-uplifting.mjs

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { UPLIFTING, MOODS } = await import(pathToFileURL(path.join(root, "lib/uplifting.ts")).href);
const db = new DatabaseSync(path.join(root, "prisma/dev.db"), { readOnly: true });
const getVerse = db.prepare("SELECT plainText FROM VerseText WHERE book = ? AND chapter = ? AND verse = ?");
const PREFIX = /^[ובכלמהש]{0,3}$/;
const moods = new Set(MOODS.map((m) => m.id));

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
for (const it of UPLIFTING) {
  const tag = `${it.book} ${it.chapter}:${it.verse}`;
  if (!moods.has(it.mood)) problems.push(`${tag}: unknown mood ${it.mood}`);
  if (seen.has(tag)) problems.push(`${tag}: listed twice`);
  seen.add(tag);
  if (!it.note?.trim()) problems.push(`${tag}: empty note`);
  const row = getVerse.get(it.book, it.chapter, it.verse);
  if (!row) problems.push(`${tag}: verse not found`);
  else if (!holds(row.plainText, it.match)) problems.push(`${tag}: "${it.match}" not in: ${row.plainText}`);
}
const per = Object.fromEntries(MOODS.map((m) => [m.label, UPLIFTING.filter((x) => x.mood === m.id).length]));
console.log(`${UPLIFTING.length} verses`, per);
if (problems.length) {
  console.log(`${problems.length} problem(s):\n  ` + problems.join("\n  "));
  process.exit(1);
}
console.log("all verses checked");
