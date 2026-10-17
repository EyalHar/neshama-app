import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { NOTE_INCLUDE, NOTE_MAX_LENGTH, toNoteItem } from "@/lib/notes";

type Ctx = { params: Promise<{ id: string }> };

async function findOwnNote(ctx: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await ctx.params;
  const note = await prisma.verseNote.findFirst({ where: { id, userId } });
  if (!note) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { note };
}

// PATCH /api/notes/[id] — edit a note's text
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { note, error } = await findOwnNote(ctx);
  if (error) return error;

  const { text } = await request.json();
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed || trimmed.length > NOTE_MAX_LENGTH) {
    return NextResponse.json({ error: "Invalid note text" }, { status: 400 });
  }

  const updated = await prisma.verseNote.update({ where: { id: note.id }, data: { text: trimmed }, include: NOTE_INCLUDE });
  return NextResponse.json({ note: toNoteItem(updated) });
}

// DELETE /api/notes/[id] — delete a note (the verse stays a favorite)
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { note, error } = await findOwnNote(ctx);
  if (error) return error;

  await prisma.verseNote.delete({ where: { id: note.id } });
  return NextResponse.json({ ok: true });
}
