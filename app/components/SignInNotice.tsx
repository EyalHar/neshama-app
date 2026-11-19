import Link from "next/link";

// Shown instead of a feature that needs a signed-in user (the AI features cost per call)
export default function SignInNotice({ what }: { what: string }) {
  return (
    <div className="bg-white/80 border border-amber-200 rounded-2xl p-5 text-center" role="status">
      <p className="text-stone-700 mb-3">כדי להשתמש ב{what} יש להתחבר.</p>
      <Link href="/login" className="inline-block bg-amber-700 hover:bg-amber-800 text-white font-medium px-6 py-2 rounded-xl transition-colors">
        התחבר עם Google
      </Link>
    </div>
  );
}
