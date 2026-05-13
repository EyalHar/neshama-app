"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { TANAKH_BOOKS, randomBook, randomChapter } from "@/lib/tanakh";

const SECTIONS = ["תורה", "נביאים", "כתובים"] as const;

const CHAPTER_ENCOURAGEMENTS = [
  "כל הכבוד! המשך כך — כל פרק מקרב אותך יותר לתנ״ך שלך.",
  "יישר כח! הדרך של אלף מיל מתחילה בצעד אחד.",
  "מדהים! הידע שלך גדל עם כל פרק שאתה קורא.",
  "כל הכבוד! ״ולמדתם אותם ושמרתם לעשותם״ — אתה חי את זה.",
  "עוד פרק, עוד חיבור. המשך בדרך הזאת!",
];

const BOOK_ENCOURAGEMENTS = [
  "הישג עצום! סיימת ספר שלם — זו עבודה של אמת.",
  "כל הכבוד! ״בכל לבבך ובכל נפשך״ — ניכר שאתה קורא עם הלב.",
  "מדהים! ספר שלם מאחוריך — המשך לכבוש את התנ״ך פרק אחרי פרק.",
  "יישר כח ענק! לא כולם מגיעים לכאן — אתה כן.",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface CelebrationData {
  type: "chapter" | "book";
  bookName: string;
  chapterNum?: number;
  count: number;
}

export default function TanakhPage() {
  const { data: session } = useSession();

  const [selectedBook, setSelectedBook] = useState(TANAKH_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<string[]>([]);
  const [readVerses, setReadVerses] = useState<Set<number>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [partialChapters, setPartialChapters] = useState<Set<number>>(new Set());
  const [completedBooks, setCompletedBooks] = useState<Set<string>>(new Set());
  const [partialBooks, setPartialBooks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("תורה");
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  const loadChapter = useCallback(async (bookId: string, chapter: number) => {
    setLoading(true);
    setVerses([]);
    setReadVerses(new Set());
    try {
      const res = await fetch(`/api/tanakh?book=${encodeURIComponent(bookId)}&chapter=${chapter}`);
      const data = await res.json();
      setVerses(data.verses ?? []);
      setReadVerses(new Set(data.readVerses ?? []));
      setCompletedChapters(new Set(data.completedChapters ?? []));
      setPartialChapters(new Set(data.partialChapters ?? []));
      setCompletedBooks(new Set(data.completedBooks ?? []));
      setPartialBooks(new Set(data.partialBooks ?? []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChapter(selectedBook.id, selectedChapter);
  }, [selectedBook, selectedChapter, loadChapter]);

  async function toggleVerse(verseIndex: number) {
    if (!session) return;
    const verseNum = verseIndex + 1;
    const newSet = new Set(readVerses);
    const wasRead = newSet.has(verseNum);
    if (wasRead) newSet.delete(verseNum); else newSet.add(verseNum);
    setReadVerses(newSet);
    if (!wasRead) {
      setCompletedChapters((prev) => { const s = new Set(prev); s.delete(selectedChapter); return s; });
      setPartialChapters((prev) => new Set([...prev, selectedChapter]));
    }

    const res = await fetch("/api/tanakh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book: selectedBook.id, chapter: selectedChapter, verse: verseNum, totalVerses: verses.length }),
    });
    const data = await res.json();

    if (data.chapterJustCompleted) {
      setCompletedChapters((prev) => new Set([...prev, selectedChapter]));
      if (data.bookJustCompleted) {
        setCompletedBooks((prev) => new Set([...prev, selectedBook.id]));
        setCelebration({ type: "book", bookName: selectedBook.he, count: data.completedBooksCount });
      } else {
        setCelebration({ type: "chapter", bookName: selectedBook.he, chapterNum: selectedChapter, count: data.completedChaptersTotal });
      }
    }
  }

  async function markChapterComplete() {
    if (!session || verses.length === 0) return;
    const allVerses = new Set(Array.from({ length: verses.length }, (_, i) => i + 1));
    setReadVerses(allVerses);
    setCompletedChapters((prev) => new Set([...prev, selectedChapter]));

    const res = await fetch("/api/tanakh/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", book: selectedBook.id, chapter: selectedChapter, verseCount: verses.length }),
    });
    const data = await res.json();

    if (data.bookJustCompleted) {
      setCompletedBooks((prev) => new Set([...prev, selectedBook.id]));
      setCelebration({ type: "book", bookName: selectedBook.he, count: data.completedBooksCount });
    } else {
      setCelebration({ type: "chapter", bookName: selectedBook.he, chapterNum: selectedChapter, count: data.completedChaptersTotal });
    }
  }

  async function clearChapter() {
    if (!session) return;
    setReadVerses(new Set());
    setCompletedChapters((prev) => { const s = new Set(prev); s.delete(selectedChapter); return s; });

    await fetch("/api/tanakh/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear", book: selectedBook.id, chapter: selectedChapter }),
    });
  }

  function handleRandomTanakh() {
    const book = randomBook();
    const chapter = randomChapter(book);
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setActiveSection(book.section);
  }

  function handleRandomInBook() {
    const chapter = randomChapter(selectedBook);
    setSelectedChapter(chapter);
  }

  function selectBook(book: typeof TANAKH_BOOKS[0]) {
    setSelectedBook(book);
    setSelectedChapter(1);
  }

  const booksInSection = TANAKH_BOOKS.filter((b) => b.section === activeSection);
  const readCount = readVerses.size;
  const totalVerses = verses.length;
  const isChapterComplete = completedChapters.has(selectedChapter);
  const isBookComplete = completedBooks.has(selectedBook.id);

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {/* Celebration modal */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">{celebration.type === "book" ? "🏆" : "⭐"}</div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2">כל הכבוד!</h2>
            {celebration.type === "chapter" ? (
              <p className="text-stone-600 mb-3">
                סיימת את פרק {celebration.chapterNum} ב{celebration.bookName}!<br />
                <span className="font-semibold text-amber-700">{celebration.count} פרקים הושלמו עד כה</span>
              </p>
            ) : (
              <p className="text-stone-600 mb-3">
                סיימת את ספר {celebration.bookName}!<br />
                <span className="font-semibold text-amber-700">{celebration.count} ספרים הושלמו עד כה</span>
              </p>
            )}
            <p className="text-stone-500 text-sm italic mb-6">
              {celebration.type === "book"
                ? randomItem(BOOK_ENCOURAGEMENTS)
                : randomItem(CHAPTER_ENCOURAGEMENTS)}
            </p>
            <button
              onClick={() => setCelebration(null)}
              className="bg-amber-700 hover:bg-amber-800 text-white font-medium px-8 py-3 rounded-xl transition-colors"
            >
              תודה!
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">קריאת תנ״ך</h1>
            {session ? (
              <p className="text-stone-500 text-sm mt-0.5">
                שלום, {session.user?.name?.split(" ")[0]} ·{" "}
                <button onClick={() => signOut()} className="text-amber-600 hover:underline">התנתק</button>
              </p>
            ) : (
              <a href="/login" className="text-amber-600 text-sm hover:underline">התחבר לשמירת התקדמות</a>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            <button
              onClick={handleRandomTanakh}
              className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              אקראי מכל התנ״ך
            </button>
            <button
              onClick={handleRandomInBook}
              className="bg-stone-600 hover:bg-stone-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              אקראי מ{selectedBook.he}
            </button>
          </div>
        </div>

        {/* Selector */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 shadow-sm">
          {/* Section tabs */}
          <div className="flex gap-2 mb-4">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setActiveSection(s);
                  const first = TANAKH_BOOKS.find((b) => b.section === s)!;
                  selectBook(first);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === s ? "bg-amber-700 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Book selector */}
          <div className="flex gap-2 flex-wrap mb-4">
            {booksInSection.map((book) => {
              const isComplete = completedBooks.has(book.id);
              const isPartial = !isComplete && partialBooks.has(book.id);
              const isSelected = selectedBook.id === book.id;
              return (
                <button
                  key={book.id}
                  onClick={() => selectBook(book)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? "bg-amber-100 text-amber-800 font-medium ring-2 ring-amber-400"
                      : isComplete
                      ? "bg-green-100 text-green-700 font-medium"
                      : isPartial
                      ? "bg-orange-100 text-orange-700 font-medium"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {book.he}
                  {isComplete && <span className="mr-1">✓</span>}
                  {isPartial && <span className="mr-1">◑</span>}
                </button>
              );
            })}
          </div>

          {/* Chapter selector */}
          <div className="flex items-start gap-2">
            <span className="text-stone-500 text-sm mt-1.5">פרק:</span>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                const isComplete = completedChapters.has(ch);
                const isPartial = !isComplete && partialChapters.has(ch);
                const isSelected = selectedChapter === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setSelectedChapter(ch)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? "bg-amber-700 text-white font-medium"
                        : isComplete
                        ? "bg-green-100 text-green-700 font-medium"
                        : isPartial
                        ? "bg-orange-100 text-orange-700 font-medium"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chapter header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-700">
              {selectedBook.he} פרק {selectedChapter}
            </h2>
            {isBookComplete && <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">✓ הספר הושלם</span>}
            {!isBookComplete && isChapterComplete && <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">✓ הפרק הושלם</span>}
          </div>

          {session && totalVerses > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-400">{readCount}/{totalVerses}</span>
              <button
                onClick={markChapterComplete}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                סיימתי את הפרק
              </button>
              <button
                onClick={clearChapter}
                className="border border-stone-300 hover:bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                נקה
              </button>
            </div>
          )}
        </div>

        {/* Verses */}
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-1">
            {verses.map((verse, i) => {
              const isRead = readVerses.has(i + 1);
              return (
                <div
                  key={i}
                  onClick={() => toggleVerse(i)}
                  className={`group flex gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isRead ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-stone-100"
                  } ${session ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className={`text-xs font-mono mt-1 min-w-[1.5rem] ${isRead ? "text-amber-500" : "text-stone-300"}`}>
                    {i + 1}
                  </span>
                  <p className={`text-lg leading-relaxed flex-1 ${isRead ? "text-amber-800" : "text-stone-700"}`}>
                    {verse}
                  </p>
                  {isRead && <span className="text-amber-400 text-lg self-start mt-1">✓</span>}
                </div>
              );
            })}
          </div>
        )}

        {!session && verses.length > 0 && (
          <p className="text-center text-stone-400 text-sm mt-8">
            <a href="/login" className="text-amber-600 hover:underline">התחבר</a> כדי לסמן פסוקים שנקראו
          </p>
        )}
      </div>
    </div>
  );
}
