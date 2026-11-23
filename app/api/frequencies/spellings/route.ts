import { NextRequest, NextResponse } from "next/server";
import { getSpellings } from "@/lib/frequencies";

// GET /api/frequencies/spellings?form= — a written form's spelling variants (plene / defective) and pointings
export async function GET(request: NextRequest) {
  const form = request.nextUrl.searchParams.get("form") ?? "";
  if (!form || form.length > 40) return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  const result = await getSpellings(form);
  if (!result) return NextResponse.json({ error: "Unknown form" }, { status: 404 });
  return NextResponse.json(result);
}
