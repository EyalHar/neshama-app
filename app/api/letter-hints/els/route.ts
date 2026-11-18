import { NextRequest, NextResponse } from "next/server";
import { searchEls } from "@/lib/letterHints";
import { ELS_LIMITS, normalizeLetters } from "@/lib/letterHintsShared";

// GET /api/letter-hints/els?q=&min=&max=&scope=torah|tanakh|<book id>
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const min = parseInt(searchParams.get("min") ?? "2");
  const max = parseInt(searchParams.get("max") ?? "1000");
  const scope = searchParams.get("scope") ?? "torah";
  const length = normalizeLetters(q).length;
  if (length < ELS_LIMITS.minLength || length > ELS_LIMITS.maxLength)
    return NextResponse.json({ error: `Query must be ${ELS_LIMITS.minLength}–${ELS_LIMITS.maxLength} letters` }, { status: 400 });
  if (!(min >= 2 && max >= min && max <= ELS_LIMITS.maxSkip)) return NextResponse.json({ error: "Invalid skip range" }, { status: 400 });

  const result = await searchEls(q, min, max, scope);
  if (!result) return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
  return NextResponse.json(result);
}
