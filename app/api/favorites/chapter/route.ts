import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/favorites/chapter — toggle a whole chapter's favorite status
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { book, chapter } = await request.json();
  if (!book || !chapter) {
    return NextResponse.json({ error: "Missing book or chapter" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.favoriteChapter.findUnique({
    where: { userId_book_chapter: { userId: user.id, book, chapter } },
  });

  let favorited: boolean;
  if (existing) {
    await prisma.favoriteChapter.delete({ where: { id: existing.id } });
    favorited = false;
  } else {
    await prisma.favoriteChapter.create({ data: { userId: user.id, book, chapter } });
    favorited = true;
  }

  return NextResponse.json({ favorited });
}
