import { NextRequest, NextResponse } from "next/server";
import { getAtbashPairs, searchAtbash } from "@/lib/letterHints";
import { normalizeLetters } from "@/lib/letterHintsShared";

// GET /api/letter-hints/atbash — same-verse atbash pairs; ?q= — a word's atbash and where it occurs
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (q === null) return NextResponse.json({ pairs: await getAtbashPairs() });
  const length = normalizeLetters(q).length;
  if (length < 2 || length > 15) return NextResponse.json({ error: "Query must be 2–15 letters" }, { status: 400 });
  return NextResponse.json(await searchAtbash(q));
}
