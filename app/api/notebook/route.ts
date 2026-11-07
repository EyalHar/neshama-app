import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/favorites";
import { NOTEBOOK_TITLE_MAX, emptyDoc } from "@/lib/notebook";

// GET /api/notebook — the user's pages, most recently edited first
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const docs = await prisma.studyDoc.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ docs });
}

// POST /api/notebook — { title } → a new, empty page
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = (await request.json()).title;
  const title = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, NOTEBOOK_TITLE_MAX) : "";
  const doc = await prisma.studyDoc.create({
    data: { userId, title: title || "דף ללא שם", content: JSON.stringify(emptyDoc()) },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json({ doc });
}
