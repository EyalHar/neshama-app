import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, checkSectionCompletion, checkTanakhCompletion, type Section } from "@/lib/tanakh";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, book, chapter, verseCount } = await request.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "complete") {
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
    await prisma.completedChapter.upsert({
      where: { userId_book_chapter: { userId: user.id, book, chapter } },
      create: { userId: user.id, book, chapter },
      update: {},
    });

    const allCompleted = await prisma.completedChapter.findMany({
      where: { userId: user.id },
      select: { book: true, chapter: true },
    });

    const completedChaptersTotal = allCompleted.length;
    const completedBooksSet = new Set<string>();
    for (const b of TANAKH_BOOKS) {
      if (allCompleted.filter((c) => c.book === b.id).length >= b.chapters)
        completedBooksSet.add(b.id);
    }
    const completedBooksCount = completedBooksSet.size;
    const bookJustCompleted = completedBooksSet.has(book);

    let sectionJustCompleted: Section | null = null;
    let tanakhJustCompleted = false;

    if (bookJustCompleted) {
      const bookData = TANAKH_BOOKS.find((b) => b.id === book);
      if (bookData) {
        const section = bookData.section as Section;
        if (checkTanakhCompletion(allCompleted)) {
          tanakhJustCompleted = true;
        } else if (checkSectionCompletion(allCompleted, section)) {
          sectionJustCompleted = section;
        }
      }
    }

    return NextResponse.json({
      success: true,
      bookJustCompleted,
      sectionJustCompleted,
      tanakhJustCompleted,
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
