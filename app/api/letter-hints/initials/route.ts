import { NextRequest, NextResponse } from "next/server";
import { searchInitials } from "@/lib/letterHints";
import { normalizeLetters, type InitialsDir, type InitialsMode } from "@/lib/letterHintsShared";

const MODES: InitialsMode[] = ["first", "last"];
const DIRS: InitialsDir[] = ["forward", "backward", "both"];

// GET /api/letter-hints/initials?q=&mode=first|last&dir=forward|backward|both&cross=1&scope=
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const mode = (searchParams.get("mode") ?? "first") as InitialsMode;
  const dir = (searchParams.get("dir") ?? "forward") as InitialsDir;
  const cross = searchParams.get("cross") === "1";
  const scope = searchParams.get("scope") ?? "tanakh";
  const length = normalizeLetters(q).length;
  if (length < 3 || length > 20) return NextResponse.json({ error: "Query must be 3–20 letters" }, { status: 400 });
  if (!MODES.includes(mode) || !DIRS.includes(dir)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  return NextResponse.json(await searchInitials(q, mode, dir, cross, scope));
}
