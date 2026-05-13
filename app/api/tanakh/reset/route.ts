import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.readVerse.deleteMany({ where: { userId: user.id } }),
    prisma.completedChapter.deleteMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ success: true });
}
