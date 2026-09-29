import { NextRequest, NextResponse } from "next/server";
import { getHapaxWords } from "@/lib/hapax";
import { Section } from "@/lib/tanakh";

const VALID_SECTIONS: Section[] = ["תורה", "נביאים", "כתובים"];
const PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sectionParam = searchParams.get("section");
  const section = VALID_SECTIONS.includes(sectionParam as Section) ? (sectionParam as Section) : null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const mergeSpelling = searchParams.get("mergeSpelling") === "1";
  const mergeDerived = searchParams.get("mergeDerived") === "1";

  const all = await getHapaxWords({ mergeSpelling, mergeDerived });

  const counts: Record<Section, number> = { "תורה": 0, "נביאים": 0, "כתובים": 0 };
  for (const h of all) counts[h.section]++;

  const filtered = section ? all.filter((h) => h.section === section) : all;
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const results = filtered.slice(start, start + PAGE_SIZE);

  return NextResponse.json({
    results,
    total,
    pages,
    page,
    pageSize: PAGE_SIZE,
    counts,
    seeded: all.length > 0,
  });
}
