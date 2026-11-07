import { NextRequest, NextResponse } from "next/server";
import { findRootsByLetters } from "@/lib/rootLetters";
import { ROOT_LETTERS, type RootScope } from "@/lib/rootLetterPattern";

const SCOPES: RootScope[] = ["tanakh", "torah", "nevi", "ketuvim"];

// GET /api/verses/roots?l1=&l2=&l3=&scope= — verb roots matching a letter pattern; each lN is a
// single (non-final) letter or empty for "any", and at least one must be given
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pattern = ["l1", "l2", "l3"].map((p) => searchParams.get(p) ?? "") as [string, string, string];
  const scope = (searchParams.get("scope") ?? "tanakh") as RootScope;

  if (pattern.some((l) => l && !ROOT_LETTERS.includes(l)) || !SCOPES.includes(scope)) {
    return NextResponse.json({ error: "Invalid letters or scope" }, { status: 400 });
  }
  if (pattern.every((l) => !l)) {
    return NextResponse.json({ error: "Choose at least one letter" }, { status: 400 });
  }

  const roots = await findRootsByLetters(pattern, scope);
  return NextResponse.json({ roots, total: roots.length });
}
