import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMMENT_MAX_LENGTH, getViewer, toAuthor, type CommentItem, type Viewer } from "@/lib/shares";

type Ctx = { params: Promise<{ id: string }> };

type CommentRow = {
  id: string;
  parentId: string | null;
  userId: string;
  text: string;
  deleted: boolean;
  createdAt: Date;
  user: { id: string; displayName: string | null };
};

// Comment author, share author or an admin may delete a comment
function toCommentItem(c: CommentRow, viewer: Viewer, shareOwnerId: string): CommentItem {
  return {
    id: c.id,
    parentId: c.parentId,
    text: c.deleted ? "" : c.text,
    deleted: c.deleted,
    createdAt: c.createdAt.toISOString(),
    author: c.deleted ? null : toAuthor(c.user),
    canDelete: !c.deleted && (c.userId === viewer.id || shareOwnerId === viewer.id || viewer.isAdmin),
  };
}

const USER_SELECT = { user: { select: { id: true, displayName: true } } } as const;

// GET /api/shares/[id]/comments — every comment on a share, flat and oldest first; the
// client builds the reply tree from parentId
export async function GET(_request: NextRequest, ctx: Ctx) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const share = await prisma.share.findUnique({ where: { id }, select: { userId: true } });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await prisma.shareComment.findMany({ where: { shareId: id }, orderBy: { createdAt: "asc" }, include: USER_SELECT });
  return NextResponse.json({ comments: rows.map((c) => toCommentItem(c, viewer, share.userId)) });
}

// POST /api/shares/[id]/comments — { text, parentId? }; replies may nest to any depth
export async function POST(request: NextRequest, ctx: Ctx) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!viewer.displayName) return NextResponse.json({ needDisplayName: true, suggestedName: viewer.googleName ?? "" }, { status: 409 });
  const { id: shareId } = await ctx.params;
  const share = await prisma.share.findUnique({ where: { id: shareId }, select: { userId: true } });
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { text, parentId } = await request.json();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed || trimmed.length > COMMENT_MAX_LENGTH) return NextResponse.json({ error: "Invalid comment text" }, { status: 400 });
  if (parentId) {
    const parent = await prisma.shareComment.findFirst({ where: { id: parentId, shareId, deleted: false } });
    if (!parent) return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
  }

  const comment = await prisma.shareComment.create({
    data: { shareId, userId: viewer.id, parentId: parentId || null, text: trimmed },
    include: USER_SELECT,
  });
  return NextResponse.json({ comment: toCommentItem(comment, viewer, share.userId) });
}
