import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";

// POST /api/tanakh/bulk
// action: "complete" | "clear"
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, book, chapter, verseCount } = await request.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "complete") {
    // Mark all verses as read
    const verses = Array.from({ length: verseCount }, (_, i) => i + 1);
    await prisma.$transaction(
      verses.map((verse) =>
        prisma.readVerse.upsert({
          where: { userId_book_chapter_verse: { userId: user.id, book, chapter, verse } },
          create: { userId: user.id, book, chapter, verse },
          update: {},
        })
      )
    );
    // Mark chapter as complete
    await prisma.completedChapter.upsert({
      where: { userId_book_chapter: { userId: user.id, book, chapter } },
      create: { userId: user.id, book, chapter },
      update: {},
    });

    // Check if book is now complete
    const bookData = TANAKH_BOOKS.find((b) => b.id === book);
    let bookJustCompleted = false;
    let completedBooksCount = 0;

    if (bookData) {
      const completedChaptersInBook = await prisma.completedChapter.count({
        where: { userId: user.id, book },
      });
      if (completedChaptersInBook >= bookData.chapters) {
        bookJustCompleted = true;
      }
    }

    // Count all completed books
    const allCompleted = await prisma.completedChapter.findMany({
      where: { userId: user.id },
      select: { book: true, chapter: true },
    });
    const completedBooksSet = new Set<string>();
    for (const b of TANAKH_BOOKS) {
      const chaptersForBook = allCompleted.filter((c) => c.book === b.id).length;
      if (chaptersForBook >= b.chapters) completedBooksSet.add(b.id);
    }
    completedBooksCount = completedBooksSet.size;

    // Count completed chapters total
    const completedChaptersTotal = await prisma.completedChapter.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      bookJustCompleted,
      completedChaptersTotal,
      completedBooksCount,
    });
  }

  if (action === "clear") {
    await prisma.readVerse.deleteMany({ where: { userId: user.id, book, chapter } });
    await prisma.completedChapter.deleteMany({ where: { userId: user.id, book, chapter } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
