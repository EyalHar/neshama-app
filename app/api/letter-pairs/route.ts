import { NextResponse } from "next/server";
import { listTriliteralRoots } from "@/lib/rootLetters";

// GET /api/letter-pairs — every triliteral verb root with its count and Strong's meaning; the
// letter-pairs wheel groups them by pairs of letters on the client
export async function GET() {
  const roots = await listTriliteralRoots();
  return NextResponse.json({ roots });
}
