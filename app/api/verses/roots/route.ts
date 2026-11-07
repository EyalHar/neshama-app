import { NextRequest, NextResponse } from "next/server";
import { findRootsByLetters } from "@/lib/rootLetters";
import { ANY_LETTER, ROOT_LETTERS, type RootPattern, type RootScope } from "@/lib/rootLetterPattern";

const SCOPES: RootScope[] = ["tanakh", "torah", "nevi", "ketuvim"];

// GET /api/verses/roots?l1=&l2=&l3=&l4=&scope= — verb roots matching a letter pattern. l1–l3: a
// single (non-final) letter or empty for "any". l4: empty for triliteral roots, "*" or a letter for
// quadriliteral ones. At least one position must be set.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pattern = ["l1", "l2", "l3", "l4"].map((p) => searchParams.get(p) ?? "") as RootPattern;
  const scope = (searchParams.get("scope") ?? "tanakh") as RootScope;

  const validLetter = (l: string, i: number) => !l || ROOT_LETTERS.includes(l) || (i === 3 && l === ANY_LETTER);
  if (!pattern.every(validLetter) || !SCOPES.includes(scope)) {
    return NextResponse.json({ error: "Invalid letters or scope" }, { status: 400 });
  }
  if (pattern.every((l) => !l)) {
    return NextResponse.json({ error: "Choose at least one letter" }, { status: 400 });
  }

  const roots = await findRootsByLetters(pattern, scope);
  return NextResponse.json({ roots, total: roots.length });
}
