import { NextRequest, NextResponse } from "next/server";
import { MIDDOT } from "@/lib/middot";
import { getMiddahSources } from "@/lib/middotSources";

// GET /api/middot/sources?id=&from= — further passages that use the middah, from Sefaria's search
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const middah = MIDDOT.find((m) => m.id === searchParams.get("id"));
  if (!middah) return NextResponse.json({ error: "Unknown middah" }, { status: 400 });
  const from = Math.max(0, parseInt(searchParams.get("from") ?? "0") || 0);
  try {
    return NextResponse.json(await getMiddahSources(middah, from));
  } catch (error) {
    console.error("Middot sources error:", error);
    return NextResponse.json({ error: "Sefaria unavailable" }, { status: 502 });
  }
}
