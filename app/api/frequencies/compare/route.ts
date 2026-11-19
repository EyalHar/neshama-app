import { NextRequest, NextResponse } from "next/server";
import { getComparison } from "@/lib/frequencies";
import type { FreqKind } from "@/lib/frequenciesShared";

const KINDS: FreqKind[] = ["lexeme", "form", "root"];

// GET /api/frequencies/compare?kind=lexeme|form|root&content=1 — the top 10 of the Tanakh, counted per section
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kind = (searchParams.get("kind") ?? "lexeme") as FreqKind;
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  return NextResponse.json(await getComparison(kind, searchParams.get("content") === "1"));
}
