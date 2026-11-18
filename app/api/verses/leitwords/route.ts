import { NextRequest, NextResponse } from "next/server";
import { searchLeitwords, type LeitwordUnitMode } from "@/lib/leitwordSearch";

const MODES: LeitwordUnitMode[] = ["chapters", "divisions"];

// GET /api/verses/leitwords?q=&unit=chapters|divisions&scope=&offset=&exclude=H3220,…
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const unit = (searchParams.get("unit") ?? "chapters") as LeitwordUnitMode;
  const scope = searchParams.get("scope") ?? "tanakh";
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0") || 0);
  const exclude = new Set((searchParams.get("exclude") ?? "").split(",").filter((n) => /^H\d+$/.test(n)));
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });
  if (!MODES.includes(unit)) return NextResponse.json({ error: "Invalid unit" }, { status: 400 });

  return NextResponse.json(await searchLeitwords(q, unit, scope, offset, exclude));
}
