import { NextRequest, NextResponse } from "next/server";
import { stripDiacritics } from "@/lib/rootFamily";
import { findRootsContaining } from "@/lib/rootLetters";

// GET /api/verses/root-hint?root=כלכל — for a typed root of 4+ letters, the triliteral verb roots
// whose forms contain it (pilpel verbs like כִּלְכֵּל are filed under כול); empty otherwise
export async function GET(request: NextRequest) {
  const root = stripDiacritics(request.nextUrl.searchParams.get("root") ?? "");
  return NextResponse.json({ roots: await findRootsContaining(root) });
}
