import { NextRequest, NextResponse } from "next/server";
import { generateWhoSaidQuestion, type WhoSaidLevel } from "@/lib/whoSaid";

const LEVELS: WhoSaidLevel[] = ["easy", "medium", "hard"];

// GET /api/quiz/who-said?level=easy|medium|hard
export async function GET(request: NextRequest) {
  const level = (request.nextUrl.searchParams.get("level") ?? "easy") as WhoSaidLevel;
  if (!LEVELS.includes(level)) return NextResponse.json({ error: "Invalid level" }, { status: 400 });

  const question = await generateWhoSaidQuestion(level);
  if (!question) return NextResponse.json({ error: "No questions" }, { status: 404 });
  return NextResponse.json(question);
}
