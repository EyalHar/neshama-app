import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { findMatch } from "@/lib/divineNames";
import type { MiddahVerse, ShownVerse } from "@/lib/middot";

const BOOK_HE = new Map(TANAKH_BOOKS.map((b) => [b.id, b.he]));

export const verseRef = (book: string, chapter: number, verse: number) =>
  `${BOOK_HE.get(book) ?? book} ${toHebrewNumeral(chapter)}, ${toHebrewNumeral(verse)}`;

// A verse with nikud from VerseText, the `match` phrase (or the given word indices) marked
export async function loadVerse(v: MiddahVerse, markAt?: number[]): Promise<ShownVerse | null> {
  const row = await prisma.verseText.findUnique({
    where: { book_chapter_verse: { book: v.book, chapter: v.chapter, verse: v.verse } },
    select: { text: true, plainText: true },
  });
  if (!row) return null;
  const words = row.text.replace(/ֽ/g, "").split(" ");
  const plain = row.plainText.split(" ");
  const marked = markAt ?? (v.match && plain.length === words.length ? findMatch(plain, v.match) : []);
  return {
    ref: verseRef(v.book, v.chapter, v.verse),
    href: `/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`,
    words,
    marked,
  };
}
