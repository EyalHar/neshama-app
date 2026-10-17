import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { cleanListName } from "@/lib/favoriteLists";

// POST /api/favorites/lists — create a named sub-list of favorite verses
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = cleanListName((await request.json()).name);
  if (!name) return NextResponse.json({ error: "Invalid list name" }, { status: 400 });
  if (await prisma.favoriteList.findUnique({ where: { userId_name: { userId, name } } })) {
    return NextResponse.json({ error: "A list with this name already exists" }, { status: 409 });
  }

  const list = await prisma.favoriteList.create({ data: { userId, name }, select: { id: true, name: true } });
  return NextResponse.json({ list });
}
