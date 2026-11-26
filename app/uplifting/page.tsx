import PageHeader from "@/app/components/PageHeader";
import { MOODS, UPLIFTING } from "@/lib/uplifting";
import { loadVerse } from "@/lib/middotVerses";
import UpliftingView, { type ShownUplifting } from "./UpliftingView";

// "חייך, הכול לטובה": hand-picked verses of joy, happiness, hope, faith, inspiration, awe and wonder.
// Verses load from VerseText on the server (with the uplifting words marked); the view filters by mood.
export const dynamic = "force-dynamic";

// The verse of the day: the same for everyone on a given (UTC) day. Read per request (force-dynamic).
function verseOfTheDay(count: number): number {
  return count ? Math.floor(Date.now() / 86_400_000) % count : 0;
}

export default async function UpliftingPage() {
  const verses: ShownUplifting[] = (
    await Promise.all(
      UPLIFTING.map(async (u) => {
        const shown = await loadVerse({ book: u.book, chapter: u.chapter, verse: u.verse, match: u.match });
        return shown ? { ...shown, mood: u.mood, note: u.note } : null;
      })
    )
  ).filter((v): v is ShownUplifting => v !== null);

  const today = verseOfTheDay(verses.length);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" dir="rtl">
      <PageHeader title="חייך, הכול לטובה" />
      <p className="text-stone-600 leading-relaxed mb-6 max-w-3xl">
        פסוקים שמרימים את הלב: שמחה, אושר, תקווה, אמונה, השראה, השתאות והתפעלות. כל פסוק נבחר ביד ונבדק מול לשון
        המקרא. המילים המרכזיות מודגשות, ולחיצה על המקור פותחת את הפסוק בקורא.
      </p>
      <UpliftingView verses={verses} moods={MOODS} today={today} />
    </div>
  );
}
