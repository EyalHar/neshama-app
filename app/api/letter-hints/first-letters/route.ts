import { NextRequest, NextResponse } from "next/server";
import { getFirstLetters } from "@/lib/letterHints";

// GET /api/letter-hints/first-letters?book= — where each letter form is first written in a book
export async function GET(request: NextRequest) {
  const letters = await getFirstLetters(request.nextUrl.searchParams.get("book") ?? "Genesis");
  if (!letters.length) return NextResponse.json({ error: "Unknown book" }, { status: 400 });
  return NextResponse.json({ letters });
}
