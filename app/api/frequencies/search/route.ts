import { NextRequest, NextResponse } from "next/server";
import { searchFrequencyItems } from "@/lib/frequencies";

// GET /api/frequencies/search?q= — what a typed word can be: dictionary entries, the written form, a verb root
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.length > 40) return NextResponse.json({ error: "Too long" }, { status: 400 });
  return NextResponse.json({ candidates: await searchFrequencyItems(q) });
}
