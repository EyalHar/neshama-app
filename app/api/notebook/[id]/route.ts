import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { NOTEBOOK_TITLE_MAX } from "@/lib/notebook";

type Ctx = { params: Promise<{ id: string }> };

// Largest page we accept (TipTap JSON), to keep a runaway client from filling the DB
const CONTENT_MAX = 2_000_000;

async function findOwnDoc(ctx: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await ctx.params;
  const doc = await prisma.studyDoc.findFirst({ where: { id, userId } });
  if (!doc) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { doc };
}

// GET /api/notebook/[id] — a page with its content
export async function GET(_request: NextRequest, ctx: Ctx) {
  const { doc, error } = await findOwnDoc(ctx);
  if (error) return error;
  return NextResponse.json({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt, content: JSON.parse(doc.content) });
}

// PATCH /api/notebook/[id] — { title?, content? } (autosave)
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { doc, error } = await findOwnDoc(ctx);
  if (error) return error;
  const body = await request.json();
  const data: { title?: string; content?: string } = {};
  if (typeof body.title === "string") data.title = body.title.replace(/\s+/g, " ").trim().slice(0, NOTEBOOK_TITLE_MAX) || "דף ללא שם";
  if (body.content !== undefined) {
    if (body.content?.type !== "doc") return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    const json = JSON.stringify(body.content);
    if (json.length > CONTENT_MAX) return NextResponse.json({ error: "Page too large" }, { status: 413 });
    data.content = json;
  }
  const updated = await prisma.studyDoc.update({ where: { id: doc.id }, data, select: { id: true, title: true, updatedAt: true } });
  return NextResponse.json({ doc: updated });
}

// DELETE /api/notebook/[id]
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { doc, error } = await findOwnDoc(ctx);
  if (error) return error;
  await prisma.studyDoc.delete({ where: { id: doc.id } });
  return NextResponse.json({ ok: true });
}
