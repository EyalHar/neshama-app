import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { TANAKH_BOOKS, fetchChapter } from "@/lib/tanakh";

const bookOrder = Object.fromEntries(TANAKH_BOOKS.map((b, i) => [b.id, i]));

function bookHe(id: string): string {
  return TANAKH_BOOKS.find((b) => b.id === id)?.he ?? id;
}

// GET /api/favorites — all of the current user's favorite chapters and verses,
// with verse text fetched live from Sefaria (nikud + ta'amim intact).
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ chapters: [], verses: [] });

  const [favChapters, favVerses] = await Promise.all([
    prisma.favoriteChapter.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.favoriteVerse.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const chapters = favChapters
    .map((c) => ({ book: c.book, bookHe: bookHe(c.book), chapter: c.chapter }))
    .sort((a, b) => (bookOrder[a.book] ?? 999) - (bookOrder[b.book] ?? 999) || a.chapter - b.chapter);

  // Fetch each distinct (book, chapter) once from Sefaria, then pick out the favorited verses.
  const uniqueChapterKeys = [...new Set(favVerses.map((v) => `${v.book}|${v.chapter}`))];
  const chapterTexts = new Map<string, string[]>();
  await Promise.all(
    uniqueChapterKeys.map(async (key) => {
      const [book, chapterStr] = key.split("|");
      const chapter = parseInt(chapterStr);
      try {
        chapterTexts.set(key, await fetchChapter(book, chapter));
      } catch {
        chapterTexts.set(key, []);
      }
    })
  );

  const verses = favVerses
    .map((v) => {
      const verseTexts = chapterTexts.get(`${v.book}|${v.chapter}`) ?? [];
      return {
        book: v.book,
        bookHe: bookHe(v.book),
        chapter: v.chapter,
        verse: v.verse,
        text: verseTexts[v.verse - 1] ?? "",
      };
    })
    .sort((a, b) => (bookOrder[a.book] ?? 999) - (bookOrder[b.book] ?? 999) || a.chapter - b.chapter || a.verse - b.verse);

  return NextResponse.json({ chapters, verses });
}
