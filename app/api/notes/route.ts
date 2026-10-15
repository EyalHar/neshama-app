import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { NOTE_MAX_LENGTH, toNoteItem } from "@/lib/notes";

// POST /api/notes — add a note to a verse. Every verse with notes is a favorite,
// so the verse is favorited here too (no-op if it already is).
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { book, chapter, verse, text } = await request.json();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!TANAKH_BOOKS.some((b) => b.id === book) || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return NextResponse.json({ error: "Invalid book, chapter or verse" }, { status: 400 });
  }
  if (!trimmed || trimmed.length > NOTE_MAX_LENGTH) {
    return NextResponse.json({ error: "Invalid note text" }, { status: 400 });
  }

  const [note] = await prisma.$transaction([
    prisma.verseNote.create({ data: { userId, book, chapter, verse, text: trimmed } }),
    prisma.favoriteVerse.upsert({
      where: { userId_book_chapter_verse: { userId, book, chapter, verse } },
      create: { userId, book, chapter, verse },
      update: {},
    }),
  ]);

  return NextResponse.json({ note: toNoteItem(note) });
}
