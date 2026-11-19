import { NextResponse } from "next/server";
import { getMirror } from "@/lib/letterHints";

// GET /api/letter-hints/mirror — reversed-word pairs in one verse, palindromic words and phrases
export async function GET() {
  return NextResponse.json(await getMirror());
}
