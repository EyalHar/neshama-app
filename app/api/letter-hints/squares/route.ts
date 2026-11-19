import { NextResponse } from "next/server";
import { getWordSquares } from "@/lib/letterHints";

// GET /api/letter-hints/squares — every three-word square in the Tanakh, and the count by chance
export async function GET() {
  return NextResponse.json(await getWordSquares());
}
