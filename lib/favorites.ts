import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Resolves the current session to a DB user id, or null if not signed in.
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.id ?? null;
}

// Set of "book|chapter|verse" keys for every verse the user has favorited —
// used to filter search results down to favorites-only.
export async function getFavoriteVerseKeySet(userId: string): Promise<Set<string>> {
  const rows = await prisma.favoriteVerse.findMany({
    where: { userId },
    select: { book: true, chapter: true, verse: true },
  });
  return new Set(rows.map((r) => `${r.book}|${r.chapter}|${r.verse}`));
}
