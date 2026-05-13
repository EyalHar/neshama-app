export type TanakhBook = {
  id: string;
  he: string;
  section: "תורה" | "נביאים" | "כתובים";
  chapters: number;
};

export const TANAKH_BOOKS: TanakhBook[] = [
  // תורה
  { id: "Genesis", he: "בראשית", section: "תורה", chapters: 50 },
  { id: "Exodus", he: "שמות", section: "תורה", chapters: 40 },
  { id: "Leviticus", he: "ויקרא", section: "תורה", chapters: 27 },
  { id: "Numbers", he: "במדבר", section: "תורה", chapters: 36 },
  { id: "Deuteronomy", he: "דברים", section: "תורה", chapters: 34 },
  // נביאים
  { id: "Joshua", he: "יהושע", section: "נביאים", chapters: 24 },
  { id: "Judges", he: "שופטים", section: "נביאים", chapters: 21 },
  { id: "I Samuel", he: "שמואל א", section: "נביאים", chapters: 31 },
  { id: "II Samuel", he: "שמואל ב", section: "נביאים", chapters: 24 },
  { id: "I Kings", he: "מלכים א", section: "נביאים", chapters: 22 },
  { id: "II Kings", he: "מלכים ב", section: "נביאים", chapters: 25 },
  { id: "Isaiah", he: "ישעיהו", section: "נביאים", chapters: 66 },
  { id: "Jeremiah", he: "ירמיהו", section: "נביאים", chapters: 52 },
  { id: "Ezekiel", he: "יחזקאל", section: "נביאים", chapters: 48 },
  { id: "Hosea", he: "הושע", section: "נביאים", chapters: 14 },
  { id: "Joel", he: "יואל", section: "נביאים", chapters: 4 },
  { id: "Amos", he: "עמוס", section: "נביאים", chapters: 9 },
  { id: "Obadiah", he: "עובדיה", section: "נביאים", chapters: 1 },
  { id: "Jonah", he: "יונה", section: "נביאים", chapters: 4 },
  { id: "Micah", he: "מיכה", section: "נביאים", chapters: 7 },
  { id: "Nahum", he: "נחום", section: "נביאים", chapters: 3 },
  { id: "Habakkuk", he: "חבקוק", section: "נביאים", chapters: 3 },
  { id: "Zephaniah", he: "צפניה", section: "נביאים", chapters: 3 },
  { id: "Haggai", he: "חגי", section: "נביאים", chapters: 2 },
  { id: "Zechariah", he: "זכריה", section: "נביאים", chapters: 14 },
  { id: "Malachi", he: "מלאכי", section: "נביאים", chapters: 3 },
  // כתובים
  { id: "Psalms", he: "תהלים", section: "כתובים", chapters: 150 },
  { id: "Proverbs", he: "משלי", section: "כתובים", chapters: 31 },
  { id: "Job", he: "איוב", section: "כתובים", chapters: 42 },
  { id: "Song of Songs", he: "שיר השירים", section: "כתובים", chapters: 8 },
  { id: "Ruth", he: "רות", section: "כתובים", chapters: 4 },
  { id: "Lamentations", he: "איכה", section: "כתובים", chapters: 5 },
  { id: "Ecclesiastes", he: "קהלת", section: "כתובים", chapters: 12 },
  { id: "Esther", he: "אסתר", section: "כתובים", chapters: 10 },
  { id: "Daniel", he: "דניאל", section: "כתובים", chapters: 12 },
  { id: "Ezra", he: "עזרא", section: "כתובים", chapters: 10 },
  { id: "Nehemiah", he: "נחמיה", section: "כתובים", chapters: 13 },
  { id: "I Chronicles", he: "דברי הימים א", section: "כתובים", chapters: 29 },
  { id: "II Chronicles", he: "דברי הימים ב", section: "כתובים", chapters: 36 },
];

export function randomBook(): TanakhBook {
  return TANAKH_BOOKS[Math.floor(Math.random() * TANAKH_BOOKS.length)];
}

export function randomChapter(book: TanakhBook): number {
  return Math.floor(Math.random() * book.chapters) + 1;
}

export type Section = "תורה" | "נביאים" | "כתובים";

// Given a set of completed (bookId, chapter) pairs, return which section just completed (if any)
export function checkSectionCompletion(
  completedEntries: { book: string; chapter: number }[],
  section: Section
): boolean {
  const booksInSection = TANAKH_BOOKS.filter((b) => b.section === section);
  return booksInSection.every((b) => {
    const completedForBook = completedEntries.filter((e) => e.book === b.id).length;
    return completedForBook >= b.chapters;
  });
}

export function checkTanakhCompletion(
  completedEntries: { book: string; chapter: number }[]
): boolean {
  return TANAKH_BOOKS.every((b) => {
    const count = completedEntries.filter((e) => e.book === b.id).length;
    return count >= b.chapters;
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&thinsp;/g, " ")
    .replace(/&[a-zA-Z]+;/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchChapter(
  bookId: string,
  chapter: number
): Promise<string[]> {
  const ref = `${bookId} ${chapter}`;
  const encoded = encodeURIComponent(ref);
  const res = await fetch(
    `https://www.sefaria.org/api/texts/${encoded}?lang=he&context=0`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error("Failed to fetch chapter");
  const data = await res.json();
  const verses: string[] = Array.isArray(data.he) ? data.he : [];
  return verses.map(stripHtml);
}
