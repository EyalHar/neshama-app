import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { cleanListName } from "@/lib/favoriteLists";

type Ctx = { params: Promise<{ id: string }> };

async function findOwnList(ctx: Ctx) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await ctx.params;
  const list = await prisma.favoriteList.findFirst({ where: { id, userId } });
  if (!list) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { list };
}

// PATCH /api/favorites/lists/[id] — rename
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { list, error } = await findOwnList(ctx);
  if (error) return error;
  const name = cleanListName((await request.json()).name);
  if (!name) return NextResponse.json({ error: "Invalid list name" }, { status: 400 });
  const clash = await prisma.favoriteList.findUnique({ where: { userId_name: { userId: list.userId, name } } });
  if (clash && clash.id !== list.id) return NextResponse.json({ error: "A list with this name already exists" }, { status: 409 });
  const updated = await prisma.favoriteList.update({ where: { id: list.id }, data: { name }, select: { id: true, name: true } });
  return NextResponse.json({ list: updated });
}

// DELETE /api/favorites/lists/[id] — its verses stay favorites and return to the general tab
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { list, error } = await findOwnList(ctx);
  if (error) return error;
  await prisma.favoriteList.delete({ where: { id: list.id } });
  return NextResponse.json({ ok: true });
}
