import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NOTE_INCLUDE, toNoteItem, type VerseNoteItem } from "@/lib/notes";
import { getPassageLeitwords } from "@/lib/leitwords";
import type { PassageMark, PassageSection, PassageVerse } from "@/lib/passage";
import { compareRefs, getParashiyot, parseRef, refKey, type VerseRef } from "@/lib/divisions";
import { getCompletionEvents } from "@/lib/progress";
import { fetchChapterWithMarks, TANAKH_BOOKS, type Section } from "@/lib/tanakh";


// First three words, without ta'amim — how an unnamed parashiya is referred to
const firstWords = (text: string) => text.replace(/[֑-֯׀׃׆ֽ]/g, "").replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ");

// GET /api/tanakh?book=Genesis&chapter=1            — one chapter
// GET /api/tanakh?book=Genesis&from=1:1&to=6:8      — a verse range (parasha / parashiya), which
//   also returns its parashiyot (`sections`) with per-section leitwords.
// Verses, marks, read/favorite status and notes are all keyed by chapter + verse, since a range
// can span chapters. `chapterVerseCounts` gives each touched chapter's full length, which the
// client needs to report chapter completion.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const book = searchParams.get("book");
  const chapterParam = parseInt(searchParams.get("chapter") ?? "");
  const rangeFrom = parseRef(searchParams.get("from"));
  const rangeTo = parseRef(searchParams.get("to"));
  const isRange = !!(rangeFrom && rangeTo);

  if (!book || !TANAKH_BOOKS.some((b) => b.id === book) || (!isRange && isNaN(chapterParam))) {
    return NextResponse.json({ error: "Missing book, chapter or range" }, { status: 400 });
  }

  try {
    const firstChapter = isRange ? rangeFrom![0] : chapterParam;
    const lastChapter = isRange ? rangeTo![0] : chapterParam;
    const chapterNums = Array.from({ length: lastChapter - firstChapter + 1 }, (_, i) => firstChapter + i);
    const chapters = await Promise.all(chapterNums.map((c) => fetchChapterWithMarks(book, c)));

    const chapterVerseCounts: Record<number, number> = {};
    chapterNums.forEach((c, i) => { chapterVerseCounts[c] = chapters[i].verses.length; });
    const from: VerseRef = isRange ? rangeFrom! : [chapterParam, 1];
    const to: VerseRef = isRange ? rangeTo! : [chapterParam, chapterVerseCounts[chapterParam]];
    const inRange = (c: number, v: number) => compareRefs([c, v], from) >= 0 && compareRefs([c, v], to) <= 0;

    const verses: PassageVerse[] = [];
    const specialLetters: PassageMark[] = [];
    chapterNums.forEach((c, i) => {
      chapters[i].verses.forEach((text, vi) => { if (inRange(c, vi + 1)) verses.push({ chapter: c, verse: vi + 1, text }); });
      for (const m of chapters[i].specialLetters) if (inRange(c, m.verse)) specialLetters.push({ ...m, chapter: c });
    });

    const parashiyot = isRange ? getParashiyot(book, from, to) : [];
    const leit = await getPassageLeitwords(book, from, to, parashiyot);
    const sections: PassageSection[] = parashiyot.map((p, i) => {
      const firstVerse = verses.find((v) => v.chapter === p.start[0] && v.verse === p.start[1]);
      const title = p.clipped && firstVerse ? firstWords(firstVerse.text) : p.title;
      return { ...p, title, leitwords: leit.sections[i] };
    });

    const session = await auth();
    let readVerses: string[] = [];
    let completedChapters: number[] = [];
    let partialChapters: number[] = [];
    const completedBooks: string[] = [];
    const partialBooks: string[] = [];
    let favoriteVerses: string[] = [];
    let favoriteChapters: number[] = [];
    let favoriteParashiyot: string[] = [];
    let notes: VerseNoteItem[] = [];

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) {
        const chapterFilter = { userId: user.id, book, chapter: { gte: firstChapter, lte: lastChapter } };
        const keep = (r: { chapter: number; verse: number }) => inRange(r.chapter, r.verse);

        const read = await prisma.readVerse.findMany({ where: chapterFilter, select: { chapter: true, verse: true } });
        readVerses = read.filter(keep).map((r) => refKey(r.chapter, r.verse));

        // Completed chapters for this book
        const completed = await prisma.completedChapter.findMany({
          where: { userId: user.id, book },
          select: { chapter: true },
        });
        completedChapters = completed.map((c) => c.chapter);
        const completedChaptersSet = new Set(completedChapters);

        // Partial chapters — chapters in this book with ≥1 read verse but not complete
        const partialRows = await prisma.readVerse.groupBy({
          by: ["chapter"],
          where: { userId: user.id, book },
        });
        partialChapters = partialRows
          .map((r) => r.chapter)
          .filter((ch) => !completedChaptersSet.has(ch));

        // Completed & partial books
        const allCompleted = await prisma.completedChapter.findMany({
          where: { userId: user.id },
          select: { book: true, chapter: true },
        });
        // Books with any read verse (for partial detection)
        const booksWithActivity = await prisma.readVerse.groupBy({
          by: ["book"],
          where: { userId: user.id },
        });
        const activeBooksSet = new Set(booksWithActivity.map((r) => r.book));

        for (const b of TANAKH_BOOKS) {
          const completedCount = allCompleted.filter((c) => c.book === b.id).length;
          if (completedCount >= b.chapters) {
            completedBooks.push(b.id);
          } else if (completedCount > 0 || activeBooksSet.has(b.id)) {
            partialBooks.push(b.id);
          }
        }

        const favVerses = await prisma.favoriteVerse.findMany({ where: chapterFilter, select: { chapter: true, verse: true } });
        favoriteVerses = favVerses.filter(keep).map((v) => refKey(v.chapter, v.verse));

        const noteRows = await prisma.verseNote.findMany({
          where: chapterFilter,
          orderBy: { createdAt: "asc" },
          include: NOTE_INCLUDE,
        });
        notes = noteRows.filter(keep).map(toNoteItem);

        // Favorite chapters for this book
        const favChapters = await prisma.favoriteChapter.findMany({
          where: { userId: user.id, book },
          select: { chapter: true },
        });
        favoriteChapters = favChapters.map((c) => c.chapter);

        // Favorite parashiyot for this book, as the "chapter:verse" each starts on
        const favParashiyot = await prisma.favoriteParashiya.findMany({
          where: { userId: user.id, book },
          select: { chapter: true, verse: true },
        });
        favoriteParashiyot = favParashiyot.map((p) => refKey(p.chapter, p.verse));
      }
    }

    return NextResponse.json({
      verses, chapterVerseCounts, specialLetters, leitwords: leit.passage, sections,
      readVerses, completedChapters, partialChapters, completedBooks, partialBooks, favoriteVerses, favoriteChapters, favoriteParashiyot, notes,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch passage" }, { status: 500 });
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

  let chapterJustCompleted = false;
  let bookJustCompleted = false;
  let sectionJustCompleted: Section | null = null;
  let tanakhJustCompleted = false;
  let completedChaptersTotal = 0;
  let completedBooksCount = 0;

  if (isRead && totalVerses) {
    const readCount = await prisma.readVerse.count({ where: { userId: user.id, book, chapter } });
    if (readCount >= totalVerses) {
      chapterJustCompleted = true;
      await prisma.completedChapter.upsert({
        where: { userId_book_chapter: { userId: user.id, book, chapter } },
        create: { userId: user.id, book, chapter },
        update: {},
      });
      const events = await getCompletionEvents(user.id, book);
      ({ bookJustCompleted, sectionJustCompleted, tanakhJustCompleted, completedBooksCount, completedChaptersTotal } = events);
    }
  }

  return NextResponse.json({
    read: isRead,
    chapterJustCompleted,
    completedChaptersTotal,
    bookJustCompleted,
    sectionJustCompleted,
    tanakhJustCompleted,
    completedBooksCount,
  });
}
