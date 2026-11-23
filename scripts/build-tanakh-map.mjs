// Builds data/tanakh-map/descriptions.json: a one-line Hebrew description of every
// parashiya (lib/parashiyot.json), written from the section's own verses. Two sources:
// - data/tanakh-map/written/<Book>.json: lines written book by book by Claude sub-agents, each
//   checked against the verses (the Groq output below was ~29% wrong, so it was replaced as the source)
// - the Groq run below (Genesis–Exodus 22, corrected by hand in overrides.json)
// written/ is applied over the Groq lines, and overrides.json over both.
// Resumable: parashiyot that already have a description are skipped.
//   node scripts/build-tanakh-map.mjs                 all missing
//   node scripts/build-tanakh-map.mjs --book Genesis  regenerate one book
//   node scripts/build-tanakh-map.mjs --check         only validate + apply written/ and overrides
// TM_MAX_REQUESTS=n caps the number of model requests; TM_DEBUG=1 logs token usage.
// Groq's free tier allows 200K tokens a day for this model (about 170 parashiyot): rerun daily.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import Groq from "groq-sdk";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/tanakh-map/descriptions.json");
const OVERRIDES = path.join(ROOT, "data/tanakh-map/overrides.json");
const WRITTEN = path.join(ROOT, "data/tanakh-map/written");
const MODEL = "openai/gpt-oss-120b";

const MAX_ITEMS = 10;
const MAX_BATCH_CHARS = 6000;
const MAX_SECTION_CHARS = 2600;
const MAX_REQUESTS = Number(process.env.TM_MAX_REQUESTS ?? Infinity);

const args = process.argv.slice(2);
const onlyBook = args.includes("--book") ? args[args.indexOf("--book") + 1] : null;
const checkOnly = args.includes("--check");

const parashiyot = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/parashiyot.json"), "utf8"));
const heNames = Object.fromEntries(
  [...fs.readFileSync(path.join(ROOT, "lib/tanakh.ts"), "utf8").matchAll(/id: "([^"]+)", he: "([^"]+)"/g)].map((m) => [m[1], m[2]]),
);
if (onlyBook && !parashiyot[onlyBook]) throw new Error(`Unknown book: ${onlyBook}`);

const db = new DatabaseSync(path.join(ROOT, "prisma/dev.db"), { readOnly: true });
const indexOf = db.prepare("SELECT verseIndex FROM VerseText WHERE book = ? AND chapter = ? AND verse = ?");
const range = db.prepare(
  "SELECT chapter, verse, plainText FROM VerseText WHERE book = ? AND verseIndex BETWEEN ? AND ? ORDER BY verseIndex",
);

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function save(out) {
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
}

function sectionVerses(book, s) {
  const a = indexOf.get(book, s[0], s[1]).verseIndex;
  const z = indexOf.get(book, s[2], s[3]).verseIndex;
  return range.all(book, a, z);
}

const line = (v) => `${v.chapter}:${v.verse} ${v.plainText}`;

// Long sections: the opening, the first verse of every later chapter, and the end.
// The prompt says so, and the model is told to describe only what it sees.
function sectionText(verses) {
  const full = verses.map(line).join("\n");
  if (full.length <= MAX_SECTION_CHARS) return { text: full, partial: false };
  const head = [];
  let len = 0;
  for (const v of verses) {
    if (len > 1300) break;
    head.push(v);
    len += line(v).length;
  }
  const tail = [];
  len = 0;
  for (const v of [...verses].reverse()) {
    if (len > 600 || head.includes(v)) break;
    tail.unshift(v);
    len += line(v).length;
  }
  const middle = verses.filter((v, i) => i > 0 && v.verse === 1 && !head.includes(v) && !tail.includes(v));
  const parts = [head.map(line).join("\n")];
  if (middle.length) parts.push("[...]\n" + middle.map(line).join("\n[...]\n"));
  parts.push("[...]\n" + tail.map(line).join("\n"));
  return { text: parts.join("\n"), partial: true };
}

const SYSTEM = `You write the "map of the Tanakh": one short Hebrew line for each parashiya (open/closed section) of the Hebrew Bible. You receive the unpointed Hebrew text of several consecutive sections of one book.

For each section write a description:
- Modern Hebrew, no nikud, 4 to 12 words, a readable phrase or short sentence (not a list of keywords separated by commas), no final period.
- Say what happens or what the section is about: story, law, prophecy, psalm, list, speech.
- Only what is written in the verses you received. No interpretation, no midrash, no moral, no outside knowledge, no guesses.
- Never write numbers, ages, years or counts (they are easy to misread); "תולדות שת והולדת אנוש", not "שת חי מאה וחמש שנים".
- Check every detail against the text: who did what to whom, who blessed and who cursed, who spoke to whom. When unsure, stay general.
- Names of people and places as written in the text. Write ה׳ for the Tetragrammaton (never spell it out), and אלהים as in the text.
- Sections marked "מקוצרת" were shortened ([...] = verses left out): describe the section as a whole at a general level from what you have, and add no details from the parts you did not get.
- Correct, natural Hebrew grammar. Prefer the text's own verbs (הוליד, מלך, אמר, הכה) or a noun phrase ("הולדת", "תולדות", "מות", "חוקי"); don't invent paraphrases.
- In a long section with several events: the main one, or two at most.
- Neighbouring sections need descriptions that tell them apart.
- Style examples: "יעקב חולם על סולם בבית אל", "חוקי עבד עברי", "מזמור תהלה על חסדי ה׳ בטבע", "נבואת פורענות על מואב", "רשימת בני יהודה וצאצאיהם", "תולדות שת והולדת אנוש", "נח מקלל את כנען ומברך את שם ויפת", "דוד מולך בחברון על יהודה".

Return only JSON: { "items": [ { "start": "chapter:verse", "description": "..." } ] }, exactly one item per section sent, in the same order, "start" exactly as given.`;

function userPrompt(book, items) {
  const blocks = items.map(({ s, text, partial }) => {
    const head = `### פרשה start=${s[0]}:${s[1]} (פסוקים ${s[0]}:${s[1]}–${s[2]}:${s[3]}${partial ? ", מקוצרת" : ""})`;
    return `${head}\n${text}`;
  });
  return `ספר ${heNames[book]}. ${items.length} פרשות:\n\n${blocks.join("\n\n")}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class QuotaError extends Error {}
class TooLargeError extends Error {}

async function callModel(client, book, items) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        reasoning_effort: "medium",
        max_completion_tokens: 2500,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt(book, items) },
        ],
      });
      if (process.env.TM_DEBUG) console.log("  usage", res.usage?.prompt_tokens, res.usage?.completion_tokens);
      const content = res.choices[0].message.content ?? "";
      const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
      return JSON.parse(json);
    } catch (err) {
      const status = err?.status;
      if (status === 429) {
        const msg = String(err?.message ?? "");
        const retryAfter = Number(err?.headers?.["retry-after"]);
        if (/per day|TPD|RPD/i.test(msg) && (!retryAfter || retryAfter > 900)) {
          throw new QuotaError(msg.slice(0, 300));
        }
        const wait = (retryAfter || 20) * 1000 + 1000;
        console.log(`  429, waiting ${Math.round(wait / 1000)}s`);
        await sleep(wait);
        continue;
      }
      if (status === 413) throw new TooLargeError();
      if (status >= 500 || err instanceof SyntaxError || status === 400) {
        console.log(`  error ${status ?? err.name}: ${String(err.message).slice(0, 150)}; retrying`);
        if (process.env.TM_DEBUG) console.log(JSON.stringify(err?.error ?? "").slice(-600));
        await sleep(3000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  return null;
}

const HEBREW_OK = /^[א-ת׳״"'׳״ ,\-–:;()?!.]+$/;

function problems(out) {
  const issues = [];
  for (const book of Object.keys(parashiyot)) {
    const seen = new Map();
    for (const s of parashiyot[book]) {
      const key = `${s[0]}:${s[1]}`;
      const d = out.descriptions[book]?.[key];
      if (!d || !d.trim()) {
        issues.push(`${book} ${key}: missing`);
        continue;
      }
      const words = d.trim().split(/\s+/).length;
      if (words < 3 || words > 16) issues.push(`${book} ${key}: ${words} words: ${d}`);
      if (!HEBREW_OK.test(d)) issues.push(`${book} ${key}: bad characters: ${d}`);
      if (seen.has(d)) issues.push(`${book} ${key}: duplicate of ${seen.get(d)}: ${d}`);
      else seen.set(d, key);
    }
  }
  return issues;
}

function clean(d) {
  return String(d ?? "")
    .replace(/־/g, " ")
    .replace(/[֑-ׇ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.。]+$/, "")
    .trim();
}

function acceptable(d) {
  const words = d.split(" ").length;
  return d && HEBREW_OK.test(d) && words >= 3 && words <= 16;
}

async function main() {
  const out = readJson(OUT, { model: null, generatedAt: null, descriptions: {} });
  out.descriptions ??= {};

  if (!checkOnly) {
    const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    const apiKey = env.match(/^GROQ_API_KEY\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
    if (!apiKey) throw new Error("GROQ_API_KEY not found in .env.local");
    const client = new Groq({ apiKey, maxRetries: 0 });

    const books = onlyBook ? [onlyBook] : Object.keys(parashiyot);
    let requests = 0;
    try {
      for (const book of books) {
        if (onlyBook) out.descriptions[book] = {};
        const done = (out.descriptions[book] ??= {});
        let todo = parashiyot[book].filter((s) => !done[`${s[0]}:${s[1]}`]);
        if (!todo.length) continue;
        console.log(`${book}: ${todo.length} to do`);
        const failures = new Map();
        let itemCap = MAX_ITEMS;
        while (todo.length && requests < MAX_REQUESTS) {
          const batch = [];
          let chars = 0;
          for (const s of todo) {
            const { text, partial } = sectionText(sectionVerses(book, s));
            if (batch.length && (batch.length >= itemCap || chars + text.length > MAX_BATCH_CHARS)) break;
            batch.push({ s, text, partial });
            chars += text.length;
          }
          let json;
          try {
            json = await callModel(client, book, batch);
          } catch (err) {
            if (!(err instanceof TooLargeError) || batch.length === 1) throw err;
            itemCap = Math.max(1, Math.floor(batch.length / 2));
            continue;
          }
          requests++;
          itemCap = MAX_ITEMS;
          const wanted = new Set(batch.map(({ s }) => `${s[0]}:${s[1]}`));
          const got = new Map();
          for (const item of Array.isArray(json?.items) ? json.items : []) {
            const key = String(item?.start ?? "").trim();
            const d = clean(item?.description);
            if (wanted.has(key) && !got.has(key) && acceptable(d)) got.set(key, d);
          }
          for (const [k, d] of got) done[k] = d;
          for (const k of wanted) {
            if (got.has(k)) continue;
            failures.set(k, (failures.get(k) ?? 0) + 1);
          }
          todo = todo.filter((s) => {
            const k = `${s[0]}:${s[1]}`;
            return !done[k] && (failures.get(k) ?? 0) < 4;
          });
          out.model = MODEL;
          out.generatedAt = new Date().toISOString();
          save(out);
          console.log(`  ${batch[0].s[0]}:${batch[0].s[1]}…  ${got.size}/${batch.length}  (requests ${requests})`);
        }
      }
    } catch (err) {
      if (!(err instanceof QuotaError)) throw err;
      console.log(`Stopped: daily quota reached. ${err.message}`);
    }
  }

  // Lines written per book (written/<Book>.json), then the hand corrections on top
  // <Book>.json, or a long book split in parts: <Book>.part1.json, <Book>.part2.json …
  const written = {};
  if (fs.existsSync(WRITTEN)) {
    for (const f of fs.readdirSync(WRITTEN).filter((f) => f.endsWith(".json"))) {
      const book = f.replace(/(\.part\d+)?\.json$/, "");
      Object.assign((written[book] ??= {}), readJson(path.join(WRITTEN, f), {}));
    }
  }
  const overrides = readJson(OVERRIDES, {});
  let applied = 0;
  for (const source of [written, overrides]) {
    for (const [book, map] of Object.entries(source)) {
      if (!parashiyot[book]) throw new Error(`Unknown book in ${source === written ? "written/" : "overrides.json"}: ${book}`);
      for (const [key, d] of Object.entries(map)) {
        (out.descriptions[book] ??= {})[key] = d;
        applied++;
      }
    }
  }
  if (applied) save(out);

  const total = Object.values(parashiyot).reduce((n, list) => n + list.length, 0);
  const have = Object.entries(parashiyot).reduce(
    (n, [book, list]) => n + list.filter((s) => out.descriptions[book]?.[`${s[0]}:${s[1]}`]).length,
    0,
  );
  const issues = problems(out);
  console.log(`${have}/${total} described; ${issues.length} issues`);
  for (const i of issues.slice(0, 80)) console.log("  " + i);
}

main();
