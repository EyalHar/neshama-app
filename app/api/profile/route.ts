import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanDisplayName, getViewer } from "@/lib/shares";

// GET /api/profile — the viewer's public display name (null until chosen) and a suggestion
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ displayName: viewer.displayName, suggestedName: viewer.googleName ?? "" });
}

// PATCH /api/profile — set the display name shown on everything the viewer shares
export async function PATCH(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const displayName = cleanDisplayName((await request.json()).displayName);
  if (!displayName) return NextResponse.json({ error: "Invalid display name" }, { status: 400 });
  await prisma.user.update({ where: { id: viewer.id }, data: { displayName } });
  return NextResponse.json({ displayName });
}
