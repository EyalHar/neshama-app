import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getParashiyaAt } from "@/lib/divisions";

// POST /api/favorites/parashiya — toggle a parashiya's favorite status, by the verse it starts on
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { book, chapter, verse } = await request.json();
  if (!book || !chapter || !verse || !getParashiyaAt(book, [chapter, verse])) {
    return NextResponse.json({ error: "Not the start of a parashiya" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.favoriteParashiya.findUnique({
    where: { userId_book_chapter_verse: { userId: user.id, book, chapter, verse } },
  });

  let favorited: boolean;
  if (existing) {
    await prisma.favoriteParashiya.delete({ where: { id: existing.id } });
    favorited = false;
  } else {
    await prisma.favoriteParashiya.create({ data: { userId: user.id, book, chapter, verse } });
    favorited = true;
  }

  return NextResponse.json({ favorited });
}
