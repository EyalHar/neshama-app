import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS } from "@/lib/tanakh";
import { FEED_PAGE_SIZE, cleanDisplayName, getViewer, toAuthor, type FeedItem } from "@/lib/shares";

// GET /api/shares?filter=all|mine|liked&book=&cursor= — the community feed, newest first
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const filter = searchParams.get("filter") ?? "all";
  const book = searchParams.get("book");
  const cursor = searchParams.get("cursor");

  const where: Prisma.ShareWhereInput = { type: "note", note: { isNot: null } };
  if (filter === "mine") where.userId = viewer.id;
  if (filter === "liked") where.likes = { some: { userId: viewer.id } };
  if (book && TANAKH_BOOKS.some((b) => b.id === book)) where.note = { is: { book } };

  const rows = await prisma.share.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { id: true, displayName: true } },
      note: { select: { book: true, chapter: true, verse: true, text: true, updatedAt: true } },
      likes: { where: { userId: viewer.id }, select: { id: true } },
      _count: { select: { likes: true, comments: { where: { deleted: false } } } },
    },
  });
  const page = rows.slice(0, FEED_PAGE_SIZE);

  // Verse text (nikud, no ta'amim) for all items in one query
  const verseRows = page.length
    ? await prisma.verseText.findMany({
        where: { OR: page.map((s) => ({ book: s.note!.book, chapter: s.note!.chapter, verse: s.note!.verse })) },
        select: { book: true, chapter: true, verse: true, text: true },
      })
    : [];
  const verseText = new Map(verseRows.map((v) => [`${v.book}|${v.chapter}|${v.verse}`, v.text.replace(/ֽ/g, "")]));

  const items: FeedItem[] = page.map((s) => {
    const n = s.note!;
    return {
      id: s.id,
      type: "note",
      createdAt: s.createdAt.toISOString(),
      edited: n.updatedAt.getTime() - s.createdAt.getTime() > 1000,
      author: toAuthor(s.user),
      book: n.book,
      bookHe: TANAKH_BOOKS.find((b) => b.id === n.book)?.he ?? n.book,
      chapter: n.chapter,
      verse: n.verse,
      verseText: verseText.get(`${n.book}|${n.chapter}|${n.verse}`) ?? "",
      text: n.text,
      likeCount: s._count.likes,
      likedByMe: s.likes.length > 0,
      commentCount: s._count.comments,
      mine: s.userId === viewer.id,
      canDelete: s.userId === viewer.id || viewer.isAdmin,
    };
  });

  return NextResponse.json({ items, nextCursor: rows.length > FEED_PAGE_SIZE ? page[page.length - 1].id : null });
}

// POST /api/shares — share one of the viewer's notes. On the first share the viewer must
// also choose a display name; without one this returns 409 with a suggestion.
export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const note = await prisma.verseNote.findFirst({ where: { id: body.noteId, userId: viewer.id }, include: { share: true } });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (note.share) return NextResponse.json({ shareId: note.share.id });

  if (!viewer.displayName) {
    const displayName = cleanDisplayName(body.displayName);
    if (!displayName) {
      return NextResponse.json({ needDisplayName: true, suggestedName: viewer.googleName ?? "" }, { status: 409 });
    }
    await prisma.user.update({ where: { id: viewer.id }, data: { displayName } });
  }

  const share = await prisma.share.create({ data: { userId: viewer.id, type: "note", noteId: note.id } });
  return NextResponse.json({ shareId: share.id });
}
