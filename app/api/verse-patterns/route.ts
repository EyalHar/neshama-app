import { NextResponse } from "next/server";
import { getVersePatterns } from "@/lib/versePatterns";

// GET /api/verse-patterns — mirrored word order (chiasm) and words repeated back to back, Tanakh-wide
export async function GET() {
  return NextResponse.json(await getVersePatterns());
}
