import { NextRequest, NextResponse } from "next/server";
import { getFrequencyItems } from "@/lib/frequencies";
import { CUSTOM_MAX } from "@/lib/frequenciesShared";

// GET /api/frequencies/items?ids=lexeme:7965,root:שוב — the user's list, counted per section
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length > CUSTOM_MAX) return NextResponse.json({ error: "Too many items" }, { status: 400 });
  return NextResponse.json(await getFrequencyItems(ids));
}
