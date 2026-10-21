import { NextRequest, NextResponse } from "next/server";
import { divisionKind, getUnits } from "@/lib/divisions";

// GET /api/tanakh/units?book=Genesis — the book's reading units in division mode:
// parashot for the Torah, parashiyot elsewhere; { kind: null, units: [] } for Psalms
export async function GET(request: NextRequest) {
  const book = request.nextUrl.searchParams.get("book") ?? "";
  return NextResponse.json({ kind: divisionKind(book), units: getUnits(book) });
}
