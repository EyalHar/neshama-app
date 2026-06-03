import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = {
  id: number; strongsNum: string; lemmaHe: string; lemmaPlain: string;
  xlit: string; definition: string; derivation: string; issue: string;
  suggestedRoot: string | null;
};

export async function GET() {
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT id, strongsNum, lemmaHe, lemmaPlain, xlit, definition, derivation, issue, suggestedRoot
     FROM "UnknownRoot" ORDER BY issue, lemmaPlain`
  );
  return NextResponse.json({ rows });
}

export async function PATCH(req: NextRequest) {
  const { id, suggestedRoot } = await req.json();
  if (!id || typeof suggestedRoot !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await prisma.$executeRawUnsafe(
    `UPDATE "UnknownRoot" SET suggestedRoot = ?, suggestedAt = datetime('now') WHERE id = ?`,
    suggestedRoot.trim() || null, id
  );
  return NextResponse.json({ ok: true });
}
