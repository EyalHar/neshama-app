import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";

// PATCH /api/favorites/verse/list — move a favorite verse into a list ({ listId }) or back to
// the general tab ({ listId: null })
export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { book, chapter, verse, listId } = await request.json();
  if (listId !== null && !(await prisma.favoriteList.findFirst({ where: { id: listId, userId } }))) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  const { count } = await prisma.favoriteVerse.updateMany({ where: { userId, book, chapter, verse }, data: { listId } });
  if (count === 0) return NextResponse.json({ error: "Verse is not a favorite" }, { status: 404 });
  return NextResponse.json({ listId });
}
