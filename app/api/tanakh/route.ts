import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchChapter, TANAKH_BOOKS } from "@/lib/tanakh";

// GET /api/tanakh?book=Genesis&chapter=1
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const book = searchParams.get("book");
  const chapter = parseInt(searchParams.get("chapter") ?? "");

  if (!book || isNaN(chapter)) {
    return NextResponse.json({ error: "Missing book or chapter" }, { status: 400 });
  }

  try {
    const verses = await fetchChapter(book, chapter);

    const session = await auth();
    let readVerses: number[] = [];
    let completedChapters: number[] = [];
    let completedBooks: string[] = [];

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) {
        // Read verses for this chapter
        const read = await prisma.readVerse.findMany({
          where: { userId: user.id, book, chapter },
          select: { verse: true },
        });
        readVerses = read.map((r) => r.verse);

        // Completed chapters for this book
        const completed = await prisma.completedChapter.findMany({
          where: { userId: user.id, book },
          select: { chapter: true },
        });
        completedChapters = completed.map((c) => c.chapter);

        // Completed books
        const allCompleted = await prisma.completedChapter.findMany({
          where: { userId: user.id },
          select: { book: true, chapter: true },
        });
        for (const b of TANAKH_BOOKS) {
          const count = allCompleted.filter((c) => c.book === b.id).length;
          if (count >= b.chapters) completedBooks.push(b.id);
        }
      }
    }

    return NextResponse.json({ verses, readVerses, completedChapters, completedBooks });
  } catch {
    return NextResponse.json({ error: "Failed to fetch chapter" }, { status: 500 });
  }
}

// POST /api/tanakh — toggle single verse
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { book, chapter, verse, totalVerses } = await request.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.readVerse.findUnique({
    where: { userId_book_chapter_verse: { userId: user.id, book, chapter, verse } },
  });

  let isRead: boolean;
  if (existing) {
    await prisma.readVerse.delete({ where: { id: existing.id } });
    // Un-complete chapter if it was complete
    await prisma.completedChapter.deleteMany({ where: { userId: user.id, book, chapter } });
    isRead = false;
  } else {
    await prisma.readVerse.create({ data: { userId: user.id, book, chapter, verse } });
    isRead = true;
  }

  // Check if chapter just became complete
  let chapterJustCompleted = false;
  let completedChaptersTotal = 0;
  let bookJustCompleted = false;
  let completedBooksCount = 0;

  if (isRead && totalVerses) {
    const readCount = await prisma.readVerse.count({
      where: { userId: user.id, book, chapter },
    });
    if (readCount >= totalVerses) {
      chapterJustCompleted = true;
      await prisma.completedChapter.upsert({
        where: { userId_book_chapter: { userId: user.id, book, chapter } },
        create: { userId: user.id, book, chapter },
        update: {},
      });

      completedChaptersTotal = await prisma.completedChapter.count({ where: { userId: user.id } });

      // Check book completion
      const bookData = TANAKH_BOOKS.find((b) => b.id === book);
      if (bookData) {
        const chaptersCompleted = await prisma.completedChapter.count({ where: { userId: user.id, book } });
        if (chaptersCompleted >= bookData.chapters) {
          bookJustCompleted = true;
          const allCompleted = await prisma.completedChapter.findMany({
            where: { userId: user.id },
            select: { book: true, chapter: true },
          });
          const completedBooksSet = new Set<string>();
          for (const b of TANAKH_BOOKS) {
            const count = allCompleted.filter((c) => c.book === b.id).length;
            if (count >= b.chapters) completedBooksSet.add(b.id);
          }
          completedBooksCount = completedBooksSet.size;
        }
      }
    }
  }

  return NextResponse.json({
    read: isRead,
    chapterJustCompleted,
    completedChaptersTotal,
    bookJustCompleted,
    completedBooksCount,
  });
}
