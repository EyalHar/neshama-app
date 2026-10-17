import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/shares";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/shares/[id] — stop sharing (author) or remove (admin). Likes and comments go
// with it; the underlying note stays.
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const share = await prisma.share.findUnique({ where: { id } });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (share.userId !== viewer.id && !viewer.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.share.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
