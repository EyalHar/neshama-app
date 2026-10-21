import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, checkSectionCompletion, checkTanakhCompletion, type Section } from "@/lib/tanakh";

export type CompletionEvents = {
  bookJustCompleted: boolean;
  sectionJustCompleted: Section | null;
  tanakhJustCompleted: boolean;
  completedBooksCount: number;
  completedChaptersTotal: number;
};

// After a chapter of `bookId` was completed: did that also complete the book, its section,
// or the whole Tanakh?
export async function getCompletionEvents(userId: string, bookId: string): Promise<CompletionEvents> {
  const allCompleted = await prisma.completedChapter.findMany({
    where: { userId },
    select: { book: true, chapter: true },
  });

  const completedBooksSet = new Set<string>();
  for (const b of TANAKH_BOOKS) {
    if (allCompleted.filter((c) => c.book === b.id).length >= b.chapters) completedBooksSet.add(b.id);
  }
  const bookJustCompleted = completedBooksSet.has(bookId);

  let sectionJustCompleted: Section | null = null;
  let tanakhJustCompleted = false;
  if (bookJustCompleted) {
    const bookData = TANAKH_BOOKS.find((b) => b.id === bookId);
    if (bookData) {
      if (checkTanakhCompletion(allCompleted)) tanakhJustCompleted = true;
      else if (checkSectionCompletion(allCompleted, bookData.section)) sectionJustCompleted = bookData.section;
    }
  }

  return {
    bookJustCompleted,
    sectionJustCompleted,
    tanakhJustCompleted,
    completedBooksCount: completedBooksSet.size,
    completedChaptersTotal: allCompleted.length,
  };
}
