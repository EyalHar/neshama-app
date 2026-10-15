import { NextRequest, NextResponse } from "next/server";
import { generateGrammarQuestion, type QuizLevel, type QuizType } from "@/lib/grammarQuiz";

const TYPES: QuizType[] = ["root", "binyan"];
const LEVELS: QuizLevel[] = ["easy", "medium", "hard"];

// GET /api/quiz/grammar?type=root|binyan|mixed&level=easy|medium|hard
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const typeParam = searchParams.get("type") ?? "mixed";
  const level = (searchParams.get("level") ?? "easy") as QuizLevel;
  if (!LEVELS.includes(level) || !(typeParam === "mixed" || TYPES.includes(typeParam as QuizType))) {
    return NextResponse.json({ error: "Invalid type or level" }, { status: 400 });
  }
  const type = typeParam === "mixed" ? TYPES[Math.floor(Math.random() * TYPES.length)] : (typeParam as QuizType);

  const question = await generateGrammarQuestion(type, level);
  if (!question) return NextResponse.json({ error: "No data — seed the database first" }, { status: 404 });
  return NextResponse.json(question);
}
