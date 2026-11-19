import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getViewer } from "@/lib/shares";

// Admin-only API routes (seeding rewrites the database): call first and return the response if
// there is one. Admins are the signed-in users whose email is in ADMIN_EMAILS (lib/shares.ts).
export async function requireAdmin(): Promise<NextResponse | null> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!viewer.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  return null;
}

// Routes that cost something per call (the Groq-backed AI features): signed-in users only.
// `needSignIn` lets the page show a sign-in prompt rather than a generic error.
export async function requireSignedIn(): Promise<NextResponse | null> {
  const session = await auth();
  if (session?.user?.email) return null;
  return NextResponse.json({ error: "יש להתחבר כדי להשתמש בתכונה הזו", needSignIn: true }, { status: 401 });
}
