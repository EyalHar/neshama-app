import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const COMMENT_MAX_LENGTH = 2000;
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const FEED_PAGE_SIZE = 20;

export type Viewer = { id: string; isAdmin: boolean; displayName: string | null; googleName: string | null };

// Admins (who may delete any share or comment) are listed by email in ADMIN_EMAILS, comma-separated
function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, displayName: true, name: true } });
  if (!user) return null;
  return { id: user.id, isAdmin: isAdminEmail(email), displayName: user.displayName, googleName: user.name };
}

export type Author = { id: string; name: string };

// Only the chosen display name is ever exposed — never the Google name, email or photo
export function toAuthor(user: { id: string; displayName: string | null }): Author {
  return { id: user.id, name: user.displayName ?? "משתמש" };
}

export function cleanDisplayName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  return name.length >= 2 && name.length <= DISPLAY_NAME_MAX_LENGTH ? name : null;
}

export type FeedItem = {
  id: string;
  type: "note";
  createdAt: string;
  edited: boolean;
  author: Author;
  book: string;
  bookHe: string;
  chapter: number;
  verse: number;
  verseText: string;
  text: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  mine: boolean;
  canDelete: boolean;
};

export type CommentItem = {
  id: string;
  parentId: string | null;
  text: string; // "" when deleted
  deleted: boolean;
  createdAt: string;
  author: Author | null; // null when deleted
  canDelete: boolean;
};
