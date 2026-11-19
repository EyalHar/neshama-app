import Link from "next/link";
import { getViewer } from "@/lib/shares";

// Every /admin page is for admins only (ADMIN_EMAILS); the API routes check the same on their own
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.isAdmin) return children;
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center" dir="rtl">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">דף למנהלים בלבד</h1>
      <p className="text-stone-500 mb-6">
        {viewer ? "החשבון שלך אינו ברשימת המנהלים." : "יש להתחבר בחשבון מנהל כדי לגשת לדף הזה."}
      </p>
      {!viewer && (
        <Link href="/login" className="bg-amber-700 hover:bg-amber-800 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
          התחבר
        </Link>
      )}
    </div>
  );
}
