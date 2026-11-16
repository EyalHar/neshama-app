import { NextRequest, NextResponse } from "next/server";
import { generateLettersQuestion, type LettersLevel } from "@/lib/lettersQuiz";

const LEVELS: LettersLevel[] = ["easy", "medium", "hard"];

// GET /api/quiz/letters?level=easy|medium|hard
export async function GET(request: NextRequest) {
  const level = (request.nextUrl.searchParams.get("level") ?? "easy") as LettersLevel;
  if (!LEVELS.includes(level)) return NextResponse.json({ error: "Invalid level" }, { status: 400 });

  const question = await generateLettersQuestion(level);
  if (!question) return NextResponse.json({ error: "No data — seed the database first" }, { status: 404 });
  return NextResponse.json(question);
}
