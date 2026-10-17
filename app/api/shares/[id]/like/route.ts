import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/shares";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/shares/[id]/like — toggle the viewer's like
export async function POST(_request: NextRequest, ctx: Ctx) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: shareId } = await ctx.params;
  if (!(await prisma.share.findUnique({ where: { id: shareId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = { shareId_userId: { shareId, userId: viewer.id } };
  const existing = await prisma.shareLike.findUnique({ where: key });
  if (existing) await prisma.shareLike.delete({ where: key });
  else await prisma.shareLike.create({ data: { shareId, userId: viewer.id } });

  const likeCount = await prisma.shareLike.count({ where: { shareId } });
  return NextResponse.json({ liked: !existing, likeCount });
}
