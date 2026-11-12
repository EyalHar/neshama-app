import { NextRequest, NextResponse } from "next/server";
import { getCharacterNetwork } from "@/lib/characters";
import { TANAKH_BOOKS } from "@/lib/tanakh";

// GET /api/characters?book= — the most-named people of a book and the chapters each pair shares
export async function GET(request: NextRequest) {
  const book = request.nextUrl.searchParams.get("book") ?? "";
  if (!TANAKH_BOOKS.some((b) => b.id === book)) return NextResponse.json({ error: "Invalid book" }, { status: 400 });
  return NextResponse.json(await getCharacterNetwork(book));
}
