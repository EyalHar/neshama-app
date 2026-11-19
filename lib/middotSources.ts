import { TANAKH_BOOKS } from "@/lib/tanakh";
import { ALLOWED_LICENSES } from "@/lib/commentaries";
import { loadVerse } from "@/lib/middotVerses";
import type { Middah, ShownVerse, SourceItem, SourcesPage } from "@/lib/middot";

// Further sources for a middah, found by Sefaria's search: passages of the Bavli and the halakhic
// midrashim that use the middah's own wording. Nothing here is generated. A passage's text is
// shown only from an edition whose license is in ALLOWED_LICENSES (as for commentaries), as
// plain text with its edition and license; otherwise only the link. Verses come from Sefaria's links.

const SEARCH_URL = "https://www.sefaria.org/api/search-wrapper";
const PATHS = [
  "Talmud/Bavli/Seder Zeraim",
  "Talmud/Bavli/Seder Moed",
  "Talmud/Bavli/Seder Nashim",
  "Talmud/Bavli/Seder Nezikin",
  "Talmud/Bavli/Seder Kodashim",
  "Talmud/Bavli/Seder Tahorot",
  "Midrash/Halakhah/Sifra",
  "Midrash/Halakhah/Sifrei Bamidbar",
  "Midrash/Halakhah/Sifrei Devarim",
  "Midrash/Halakhah/Mekhilta d'Rabbi Yishmael",
  "Midrash/Halakhah/Mekhilta DeRabbi Shimon Ben Yochai",
];
// For the Bavli, Sefaria's Wikisource edition is CC-BY-SA; other editions are checked one by one
const PREFERRED_VERSION = "Wikisource Talmud Bavli";
const SEARCH_SIZE = 150;
const PAGE = 5;
const MAX_VERSES = 4;

const BOOK_IDS = new Set(TANAKH_BOOKS.map((b) => b.id));
const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const letters = (s: string) =>
  s
    .replace(/[֑-ׇ]/g, "")
    .replace(/[ךםןףץ]/g, (c) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[c]!)
    .replace(/[^א-ת\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Hit = { ref: string; heRef: string };
const refsCache = new Map<string, Promise<Hit[]>>();

async function searchRefs(m: Middah): Promise<Hit[]> {
  const hits: Hit[] = [];
  const seen = new Set<string>();
  for (const query of m.search) {
    const res = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        type: "text",
        field: "exact",
        size: SEARCH_SIZE,
        source_proj: true,
        slop: 0,
        filters: PATHS,
        filter_fields: PATHS.map(() => "path"),
        aggs: [],
        sort_fields: [],
        sort_method: "score",
        sort_reverse: false,
        sort_score_missing: 0.04,
      }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`Sefaria search ${res.status}`);
    const data = await res.json();
    for (const h of data.hits?.hits ?? []) {
      const ref: string = h._source?.ref;
      if (!ref || seen.has(ref)) continue;
      seen.add(ref);
      hits.push({ ref, heRef: h._source.heRef ?? ref });
    }
  }
  return hits;
}

function getRefs(m: Middah): Promise<Hit[]> {
  if (!refsCache.has(m.id)) refsCache.set(m.id, searchRefs(m).catch((e) => (refsCache.delete(m.id), Promise.reject(e))));
  return refsCache.get(m.id)!;
}

// The passage's Hebrew in an allowed edition: the Wikisource Bavli first, else the default one if its license allows
async function sourceText(ref: string): Promise<{ text: string; version: string; license: string } | null> {
  for (const version of [`hebrew|${PREFERRED_VERSION}`, "hebrew"]) {
    try {
      const res = await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=${encodeURIComponent(version)}`, { next: { revalidate: 86400 } });
      if (!res.ok) continue;
      const v = (await res.json()).versions?.[0];
      if (v && ALLOWED_LICENSES.has(v.license)) {
        const text = plain([v.text].flat(Infinity).join(" "));
        if (text) return { text, version: v.versionTitle, license: v.license };
      }
    } catch {
      // try the next edition
    }
  }
  return null;
}

async function linkedVerses(ref: string, text: string | null): Promise<ShownVerse[]> {
  let links: { category?: string; ref?: string }[] = [];
  try {
    const res = await fetch(`https://www.sefaria.org/api/links/${encodeURIComponent(ref)}`, { next: { revalidate: 86400 } });
    if (res.ok) links = await res.json();
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: ShownVerse[] = [];
  const source = text ? letters(text) : null;
  for (const l of links) {
    if (l.category !== "Tanakh" || !l.ref) continue;
    const m = l.ref.match(/^(.+?) (\d+):(\d+)/);
    if (!m || !BOOK_IDS.has(m[1])) continue;
    const key = `${m[1]} ${m[2]}:${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const shown = await loadVerse({ book: m[1], chapter: Number(m[2]), verse: Number(m[3]) });
    if (!shown) continue;
    // Mark the words the passage quotes (runs of 2+ consecutive verse words found in it)
    if (source) {
      const words = shown.words.map(letters);
      const marked = new Set<number>();
      for (let i = 0; i + 1 < words.length; i++) if (source.includes(`${words[i]} ${words[i + 1]}`)) marked.add(i).add(i + 1);
      shown.marked = [...marked];
    }
    out.push(shown);
    if (out.length >= MAX_VERSES) break;
  }
  return out;
}

const SNIPPET_AROUND = 220;

// The text without nikud, with each kept character's index in the original
function stripped(text: string): { s: string; at: number[] } {
  let s = "";
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/[֑-ׇ]/.test(text[i])) continue;
    s += text[i];
    at.push(i);
  }
  return { s, at };
}

// A window of the passage around the middah's wording, and where the wording is in it
function snippet(text: string, phrases: string[]): { text: string; marks: [number, number][] } {
  const { s, at } = stripped(text);
  const ranges: [number, number][] = [];
  for (const p of phrases) for (let i = s.indexOf(p); i >= 0; i = s.indexOf(p, i + 1)) ranges.push([at[i], at[i + p.length - 1] + 1]);
  ranges.sort((a, b) => a[0] - b[0]);
  if (!ranges.length) return { text: text.slice(0, SNIPPET_AROUND * 2), marks: [] };
  let start = Math.max(0, ranges[0][0] - SNIPPET_AROUND);
  let end = Math.min(text.length, ranges[0][1] + SNIPPET_AROUND);
  if (start > 0) start = text.indexOf(" ", start) + 1;
  if (end < text.length) end = Math.max(text.lastIndexOf(" ", end), ranges[0][1]);
  const marks = ranges.filter(([a, b]) => a >= start && b <= end).map(([a, b]): [number, number] => [a - start, b - start]);
  return { text: (start > 0 ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : ""), marks: marks.map(([a, b]) => (start > 0 ? [a + 2, b + 2] : [a, b])) };
}

// The passage only holds a longer middah's wording (כלל ופרט inside כלל ופרט וכלל)
function onlyLonger(m: Middah, text: string): boolean {
  if (!m.exclude) return false;
  let rest = stripped(text).s;
  for (const x of m.exclude) rest = rest.replaceAll(x, " ");
  return !m.search.some((q) => rest.includes(q));
}

// Passages already on the page
const SHOWN = /^Sifra, Baraita DeRabbi Yishmael/;

export async function getMiddahSources(m: Middah, from: number): Promise<SourcesPage> {
  const refs = (await getRefs(m)).filter((h) => !SHOWN.test(h.ref));
  const items: SourceItem[] = [];
  let i = from;
  while (items.length < PAGE && i < refs.length) {
    const hit = refs[i++];
    const src = await sourceText(hit.ref);
    if (src && onlyLonger(m, src.text)) continue;
    const snip = src ? snippet(src.text, m.search) : null;
    items.push({
      ref: hit.ref,
      heRef: hit.heRef,
      href: `https://www.sefaria.org/${encodeURIComponent(hit.ref.replace(/ /g, "_"))}?lang=he`,
      text: snip?.text ?? null,
      marks: snip?.marks ?? [],
      version: src?.version ?? null,
      license: src?.license ?? null,
      verses: await linkedVerses(hit.ref, src?.text ?? null),
    });
  }
  return { items, total: refs.length, next: i < refs.length ? i : null };
}
