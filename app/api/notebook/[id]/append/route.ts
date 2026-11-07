import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { NOTEBOOK_QUOTE_MAX, sourceQuoteNode, type DocNode } from "@/lib/notebook";

type Ctx = { params: Promise<{ id: string }> };

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// POST /api/notebook/[id]/append — { text, source: { source, href, attribution } }: add a quote with
// its source to the end of a page, from anywhere on the site (the page needn't be open)
export async function POST(request: NextRequest, ctx: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const doc = await prisma.studyDoc.findFirst({ where: { id, userId } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const text = str(body.text, NOTEBOOK_QUOTE_MAX);
  const source = str(body.source?.source, 200);
  if (!text || !source) return NextResponse.json({ error: "Missing text or source" }, { status: 400 });
  // Only links within the site or to Sefaria are kept
  const hrefRaw = str(body.source?.href, 500);
  const href = hrefRaw && ((hrefRaw.startsWith("/") && !hrefRaw.startsWith("//")) || hrefRaw.startsWith("https://www.sefaria.org/")) ? hrefRaw : null;

  const content: DocNode = JSON.parse(doc.content);
  const blocks = content.content ?? [];
  // Drop a trailing empty paragraph so quotes don't pile up behind blank lines
  const last = blocks.at(-1);
  if (last?.type === "paragraph" && !last.content?.length) blocks.pop();
  const node = sourceQuoteNode(text, { source, href, attribution: str(body.source?.attribution, 300) });
  blocks.push(node, { type: "paragraph" });
  content.content = blocks;

  const updated = await prisma.studyDoc.update({
    where: { id: doc.id },
    data: { content: JSON.stringify(content) },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ doc: updated, node });
}
