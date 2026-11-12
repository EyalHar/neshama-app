import { NextRequest, NextResponse } from "next/server";
import { findEchoes } from "@/lib/echoes";
import { TANAKH_BOOKS } from "@/lib/tanakh";

// GET /api/echoes?book=&chapter=&verse= — verses elsewhere in the Tanakh that share a rare
// combination of words with this one (see lib/echoes.ts)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const book = searchParams.get("book") ?? "";
  const chapter = Number(searchParams.get("chapter"));
  const verse = Number(searchParams.get("verse"));
  if (!TANAKH_BOOKS.some((b) => b.id === book) || !Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return NextResponse.json({ error: "Invalid verse" }, { status: 400 });
  }
  const result = await findEchoes(book, chapter, verse);
  if (!result) return NextResponse.json({ error: "Verse not found" }, { status: 404 });
  return NextResponse.json(result);
}
