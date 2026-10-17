import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/shares";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/comments/[id] — by the comment's author, the share's author or an admin.
// A comment with replies is soft-deleted so the thread under it survives; one without
// replies is removed, and so is any soft-deleted ancestor left with no replies.
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const comment = await prisma.shareComment.findUnique({
    where: { id },
    include: { share: { select: { userId: true } }, _count: { select: { replies: true } } },
  });
  if (!comment || comment.deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.userId !== viewer.id && comment.share.userId !== viewer.id && !viewer.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (comment._count.replies > 0) {
    await prisma.shareComment.update({ where: { id }, data: { deleted: true, text: "" } });
    return NextResponse.json({ removed: [], softDeleted: id });
  }

  const removed = [id];
  await prisma.shareComment.delete({ where: { id } });
  let parentId = comment.parentId;
  while (parentId) {
    const parent = await prisma.shareComment.findUnique({
      where: { id: parentId },
      include: { _count: { select: { replies: true } } },
    });
    if (!parent || !parent.deleted || parent._count.replies > 0) break;
    await prisma.shareComment.delete({ where: { id: parent.id } });
    removed.push(parent.id);
    parentId = parent.parentId;
  }
  return NextResponse.json({ removed, softDeleted: null });
}
