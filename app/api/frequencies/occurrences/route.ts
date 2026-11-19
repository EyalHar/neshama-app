import { NextRequest, NextResponse } from "next/server";
import { getOccurrences } from "@/lib/frequencies";
import type { FreqKind, FreqScope } from "@/lib/frequenciesShared";

const KINDS: FreqKind[] = ["lexeme", "form", "root"];
const SCOPES: FreqScope[] = ["tanakh", "torah", "nevi", "ketuvim"];

// GET /api/frequencies/occurrences?kind=&key=&scope=&offset= — the verses of one word or root, 10 at a time
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const kind = searchParams.get("kind") as FreqKind;
  const scope = (searchParams.get("scope") ?? "tanakh") as FreqScope;
  const key = searchParams.get("key") ?? "";
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0") || 0);
  if (!KINDS.includes(kind) || !SCOPES.includes(scope) || !key) return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  const result = await getOccurrences(kind, key, scope, offset);
  if (!result) return NextResponse.json({ error: "Unknown key" }, { status: 404 });
  return NextResponse.json(result);
}
