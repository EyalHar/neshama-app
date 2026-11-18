import { NextRequest, NextResponse } from "next/server";
import { elsGrid, elsVerses } from "@/lib/letterHints";

// GET /api/letter-hints/els/grid?start=&skip=&length= — the grid around one sequence and its verses
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = parseInt(searchParams.get("start") ?? "");
  const skip = parseInt(searchParams.get("skip") ?? "");
  const length = parseInt(searchParams.get("length") ?? "");
  if (![start, skip, length].every(Number.isInteger)) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const [grid, verses] = await Promise.all([elsGrid(start, skip, length), elsVerses(start, skip, length)]);
  if (!grid) return NextResponse.json({ error: "Out of range" }, { status: 400 });
  return NextResponse.json({ grid, verses });
}
