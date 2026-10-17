import { NextRequest, NextResponse } from "next/server";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { ALLOWED_LICENSES, COMMENTATORS, type Commentary } from "@/lib/commentaries";

const SEFARIA = "https://www.sefaria.org";
const CACHE = { next: { revalidate: 604800 } }; // commentary texts rarely change — cache a week

type SefariaLink = { category: string; index_title: string; collectiveTitle?: { en: string } };
type SefariaVersion = { text: unknown; license?: string; versionTitle?: string };

// Commentary HTML comes from a third party: keep only basic formatting tags (no attributes),
// drop footnotes entirely, strip every other tag but keep its text.
function sanitize(html: string): string {
  return html
    .replace(/<sup class="footnote-marker">[\s\S]*?<\/sup>/g, "")
    .replace(/<i class="footnote">[\s\S]*?<\/i>/g, "")
    .replace(/<(\/?)(b|strong|i|em|br)\b[^>]*>/gi, "\u0001$1$2\u0002")
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\u0001/g, "<")
    .replace(/\u0002/g, ">")
    .trim();
}

const sefariaUrl = (ref: string) => `${SEFARIA}/${encodeURIComponent(ref.replace(/ /g, "_"))}?lang=he`;

// Opens the verse on Sefaria with this commentator's side panel — works even for commentaries
// whose ref structure differs from "<index> chapter:verse" (e.g. Chizkuni, Abarbanel)
const sefariaVerseUrl = (verseRef: string, key: string) =>
  `${SEFARIA}/${encodeURIComponent(verseRef.replace(/ /g, "_"))}?lang=he&with=${encodeURIComponent(key)}`;

async function fetchCommentary(key: string, he: string, ref: string, verseRef: string): Promise<Commentary> {
  const unavailable: Commentary = { key, he, status: "unavailable", sefariaUrl: sefariaVerseUrl(verseRef, key) };
  try {
    const res = await fetch(`${SEFARIA}/api/v3/texts/${encodeURIComponent(ref)}?version=hebrew`, CACHE);
    if (!res.ok) return unavailable;
    const version: SefariaVersion | undefined = (await res.json()).versions?.[0];
    if (!version?.license || !ALLOWED_LICENSES.has(version.license)) return unavailable;
    const raw = [version.text].flat(Infinity).filter((t): t is string => typeof t === "string");
    const segments = raw.map(sanitize).filter(Boolean);
    if (segments.length === 0) return unavailable;
    return {
      key, he, status: "ok", segments,
      versionTitle: version.versionTitle ?? "",
      license: version.license,
      sefariaUrl: sefariaUrl(ref),
    };
  } catch {
    return unavailable;
  }
}

// GET /api/commentaries?book=Genesis&chapter=1&verse=1 — classic commentaries on one verse
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const book = searchParams.get("book") ?? "";
  const chapter = parseInt(searchParams.get("chapter") ?? "");
  const verse = parseInt(searchParams.get("verse") ?? "");
  if (!TANAKH_BOOKS.some((b) => b.id === book) || !chapter || !verse) {
    return NextResponse.json({ error: "Invalid book, chapter or verse" }, { status: 400 });
  }

  const linksRes = await fetch(`${SEFARIA}/api/links/${encodeURIComponent(`${book}.${chapter}.${verse}`)}?with_text=0`, CACHE);
  if (!linksRes.ok) return NextResponse.json({ error: "Failed to fetch commentaries" }, { status: 502 });
  const links: SefariaLink[] = await linksRes.json();

  // One index (e.g. "Rashi on Genesis") per commentator on our list
  const indexByKey = new Map<string, string>();
  for (const l of links) {
    const key = l.collectiveTitle?.en;
    if (l.category === "Commentary" && key && !indexByKey.has(key)) indexByKey.set(key, l.index_title);
  }

  const commentaries = await Promise.all(
    COMMENTATORS.filter((c) => indexByKey.has(c.key)).map((c) =>
      fetchCommentary(c.key, c.he, `${indexByKey.get(c.key)} ${chapter}:${verse}`, `${book}.${chapter}.${verse}`)
    )
  );

  return NextResponse.json({ commentaries });
}
