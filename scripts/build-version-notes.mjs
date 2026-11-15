// One-time builder for data/version-notes/version-notes.json: the version notes (חילופי נוסח) in
// Sefaria's "Miqra according to the Masorah" text, e.g. Deut 23:2 "בספרי ספרד ורוב ספרי אשכנז דַּכָּה".
// Each note keeps its verse (clean text, as the reader shows it) and the word it follows.
//
// Run from the project root: node scripts/build-version-notes.mjs
//
// The extraction mirrors fetchChapterWithMarks() in lib/tanakh.ts: if that changes, rebuild this.
// Source: Sefaria, Miqra according to the Masorah (CC-BY-SA).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT_DIR = "data/version-notes";
const OUT_FILE = `${OUT_DIR}/version-notes.json`;
const VERSION = "Miqra according to the Masorah";

const books = [...readFileSync("lib/tanakh.ts", "utf8").matchAll(/id: "([^"]+)", he: "([^"]+)"/g)].map((m) => m[1]);
if (books.length !== 39) throw new Error(`expected 39 books, found ${books.length}`);

const FOOTNOTE_RE = /<sup class="footnote-marker">[\s\S]*?<\/sup>\s*<i class="footnote">([\s\S]*?)<\/i>|<i class="footnote">([\s\S]*?)<\/i>/g;
const NOTE = "";

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&thinsp;/g, " ").replace(/&[a-zA-Z]+;/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Who the note is about, from its opening words
function traditionOf(note) {
  if (/ספרד/.test(note)) return "sephardi-ashkenazi";
  if (/אשכנז/.test(note)) return "ashkenazi";
  if (/תימן/.test(note)) return "yemenite";
  if (/ארם צובה|כתר/.test(note)) return "aleppo";
  return "other";
}

const notes = [];
for (const book of books) {
  const url = `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(book)}?version=${encodeURIComponent(`hebrew|${VERSION}`)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${book}: HTTP ${res.status}`);
  const chapters = (await res.json()).versions?.[0]?.text;
  if (!Array.isArray(chapters)) throw new Error(`${book}: no text`);
  chapters.forEach((verses, ci) => verses.forEach((html, vi) => {
    if (!html.includes('class="footnote"')) return;
    const found = [];
    const marked = stripHtml(html.replace(FOOTNOTE_RE, (_, a, b) => {
      found.push(stripHtml(a ?? b ?? "").replace(/^\((.*)\)$/, "$1"));
      return NOTE;
    }));
    const parts = marked.split(NOTE);
    const text = parts.join("").replace(/\s+/g, " ").trim();
    found.forEach((note, i) => {
      const before = parts.slice(0, i + 1).join("").trimEnd();
      const word = before.split(/[\s־]+/).pop() ?? "";
      notes.push({
        book, chapter: ci + 1, verse: vi + 1,
        word: word.replace(/[׃]/g, ""),
        wordEnd: before.replace(/\s+/g, " ").trimStart().length,
        note, tradition: traditionOf(note), text,
      });
    });
  }));
  process.stdout.write(".");
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(notes, null, 1) + "\n");
const by = notes.reduce((m, n) => ({ ...m, [n.tradition]: (m[n.tradition] ?? 0) + 1 }), {});
console.log(`\n${notes.length} notes →`, OUT_FILE, by);
