import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ completedChapters: 0 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ completedChapters: 0 });

  const completedChapters = await prisma.completedChapter.count({ where: { userId: user.id } });
  return NextResponse.json({ completedChapters });
}
