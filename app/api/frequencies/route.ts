import { NextRequest, NextResponse } from "next/server";
import { getFrequencies } from "@/lib/frequencies";
import { FREQ_TOTAL, type FreqKind, type FreqScope } from "@/lib/frequenciesShared";

const KINDS: FreqKind[] = ["lexeme", "form", "root"];
const SCOPES: FreqScope[] = ["tanakh", "torah", "nevi", "ketuvim"];

// GET /api/frequencies?kind=lexeme|form|root&scope=&limit=1..500&content=1
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kind = (searchParams.get("kind") ?? "lexeme") as FreqKind;
  const scope = (searchParams.get("scope") ?? "tanakh") as FreqScope;
  const limit = Number(searchParams.get("limit") ?? FREQ_TOTAL);
  if (!KINDS.includes(kind) || !SCOPES.includes(scope) || !Number.isInteger(limit) || limit < 1 || limit > FREQ_TOTAL)
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  return NextResponse.json(await getFrequencies(kind, scope, limit, searchParams.get("content") === "1"));
}
