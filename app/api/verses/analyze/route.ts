import { NextRequest, NextResponse } from "next/server";
import { analyzeWords } from "@/lib/wordAnalysis";

const SCOPES = ["tanakh", "torah", "nevi", "ketuvim"];

// GET /api/verses/analyze?q=&whole=1&scope= — the lexemes behind the typed words, how each
// occurrence is built and its Strong's chain up to the root
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const scope = searchParams.get("scope") ?? "tanakh";
  if (!SCOPES.includes(scope)) return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  if (q.length < 2) return NextResponse.json({ lexemes: [], totalLexemes: 0 });
  return NextResponse.json(await analyzeWords(q, searchParams.get("whole") === "1", scope));
}
