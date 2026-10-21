import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCompletionEvents } from "@/lib/progress";

// POST /api/tanakh/bulk
//   { action: "complete", book, chapter, verseCount }   — mark a whole chapter read
//   { action: "clear", book, chapter }                   — clear a chapter
//   { action: "completeRange", book, verses: [[chapter, verse], …], chapterVerseCounts }
//       — mark a parasha/parashiya read; completes every touched chapter that becomes fully read
//   { action: "clearRange", book, verses: [[chapter, verse], …] }
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, book } = body;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userId = user.id;

  async function markRead(refs: [number, number][]) {
    await prisma.$transaction(
      refs.map(([chapter, verse]) =>
        prisma.readVerse.upsert({
          where: { userId_book_chapter_verse: { userId, book, chapter, verse } },
          create: { userId, book, chapter, verse },
          update: {},
        })
      )
    );
  }

  if (action === "complete") {
    const { chapter, verseCount } = body;
    await markRead(Array.from({ length: verseCount }, (_, i) => [chapter, i + 1] as [number, number]));
    await prisma.completedChapter.upsert({
      where: { userId_book_chapter: { userId, book, chapter } },
      create: { userId, book, chapter },
      update: {},
    });
    return NextResponse.json({ success: true, ...(await getCompletionEvents(userId, book)) });
  }

  if (action === "clear") {
    const { chapter } = body;
    await prisma.readVerse.deleteMany({ where: { userId, book, chapter } });
    await prisma.completedChapter.deleteMany({ where: { userId, book, chapter } });
    return NextResponse.json({ success: true });
  }

  if (action === "completeRange") {
    const refs: [number, number][] = body.verses;
    const counts: Record<string, number> = body.chapterVerseCounts ?? {};
    await markRead(refs);

    const touched = [...new Set(refs.map(([c]) => c))];
    const alreadyComplete = new Set(
      (await prisma.completedChapter.findMany({ where: { userId, book, chapter: { in: touched } }, select: { chapter: true } }))
        .map((c) => c.chapter)
    );
    const chaptersJustCompleted: number[] = [];
    for (const chapter of touched) {
      if (alreadyComplete.has(chapter) || !counts[chapter]) continue;
      const readCount = await prisma.readVerse.count({ where: { userId, book, chapter } });
      if (readCount < counts[chapter]) continue;
      await prisma.completedChapter.create({ data: { userId, book, chapter } });
      chaptersJustCompleted.push(chapter);
    }
    const events = chaptersJustCompleted.length ? await getCompletionEvents(userId, book) : null;
    return NextResponse.json({ success: true, chaptersJustCompleted, ...events });
  }

  if (action === "clearRange") {
    const refs: [number, number][] = body.verses;
    await prisma.$transaction(
      refs.map(([chapter, verse]) => prisma.readVerse.deleteMany({ where: { userId, book, chapter, verse } }))
    );
    const touched = [...new Set(refs.map(([c]) => c))];
    await prisma.completedChapter.deleteMany({ where: { userId, book, chapter: { in: touched } } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
