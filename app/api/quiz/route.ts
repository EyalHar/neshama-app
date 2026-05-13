import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { TANAKH_BOOKS, fetchChapter, toHebrewNumeral } from "@/lib/tanakh";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Strip Hebrew diacritics: niqqud (U+05B0–U+05C7) + cantillation/teamim (U+0591–U+05AF)
function stripDiacritics(text: string): string {
  return text
    .replace(/[֑-ׇ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Find the best matching token in the verse for the word Groq returned
function findWordInVerse(verse: string, word: string): string | null {
  // 1. Exact match
  if (verse.includes(word)) return word;

  // 2. Find a verse-token that contains the word as substring (handles prefixes ב,ו,כ,ל,מ,ש,ה)
  const tokens = verse.split(/\s+/);
  const exact = tokens.find((t) => t === word);
  if (exact) return exact;

  // token contains the word (e.g. "בחסדי" contains "חסדי")
  const contains = tokens.find((t) => t.includes(word) && t.length <= word.length + 3);
  if (contains) return contains;

  // the word contains a token (Groq added prefix/suffix)
  const inside = tokens.find((t) => word.includes(t) && t.length >= 2 && t.length >= word.length - 2);
  if (inside) return inside;

  return null;
}

async function fetchRandomVerse(): Promise<{ book: (typeof TANAKH_BOOKS)[0]; chapter: number; verse: number; text: string } | null> {
  // Try a few times in case Sefaria returns empty
  for (let attempt = 0; attempt < 5; attempt++) {
    const book = TANAKH_BOOKS[Math.floor(Math.random() * TANAKH_BOOKS.length)];
    const chapter = Math.floor(Math.random() * book.chapters) + 1;
    try {
      const verses = await fetchChapter(book.id, chapter);
      const valid = verses
        .map((text, i) => ({ text: stripDiacritics(text), verse: i + 1 }))
        .filter((v) => v.text.length >= 20 && v.text.length <= 200);
      if (valid.length === 0) continue;
      const picked = valid[Math.floor(Math.random() * valid.length)];
      return { book, chapter, verse: picked.verse, text: picked.text };
    } catch {
      continue;
    }
  }
  return null;
}

async function generateQuiz() {
    // Step 1: Fetch a real verse from Sefaria
    const verseData = await fetchRandomVerse();
    if (!verseData) throw new Error("Could not fetch verse from Sefaria");

    const { book, chapter, verse, text: verseText } = verseData;

    // Step 2: Ask Groq ONLY to pick a word to blank and generate 3 wrong alternatives
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `אתה מומחה בתנ"ך. קיבלת פסוק מהתנ"ך. בחר מילה אחת משמעותית (שם עצם, פועל, תואר — לא מילת יחס קצרה) וצור 3 חלופות שגויות אך הגיוניות.

החזר JSON בלבד:
{
  "missing_word": "המילה שבחרת — חייבת להופיע בדיוק כך בפסוק",
  "wrong_options": ["חלופה1", "חלופה2", "חלופה3"]
}

החלופות — מאותו תחום סמנטי, הגיוניות דקדוקית אך שגויות בהקשר הספציפי.`,
        },
        { role: "user", content: `הפסוק: ${verseText}` },
      ],
    });

    const groqText = completion.choices[0].message.content;
    if (!groqText) throw new Error("Empty response");
    const groqData = JSON.parse(groqText);
    const missingWord: string = groqData.missing_word;

    // Step 3: Find the word in the actual Sefaria text (flexible matching)
    const matchedToken = findWordInVerse(verseText, missingWord);
    if (!matchedToken) {
      throw new Error(`Word "${missingWord}" not found in verse`);
    }
    // Use the exact token as it appears in the verse
    const actualMissingWord = matchedToken;
    const verseWithBlank = verseText.replace(actualMissingWord, "_____");

    // Step 4: Shuffle options (use the actual token as it appears in the verse)
    const options = [actualMissingWord, ...groqData.wrong_options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const correctIndex = options.indexOf(actualMissingWord);

    const referenceHe = `${book.he} ${toHebrewNumeral(chapter)}:${toHebrewNumeral(verse)}`;

    return {
      reference_he: referenceHe,
      book: book.id,
      chapter,
      verse,
      verse_with_blank: verseWithBlank,
      missing_word: actualMissingWord,
      options,
      correct_index: correctIndex,
    };
}

export async function POST() {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const result = await generateQuiz();
      return NextResponse.json(result);
    } catch (error) {
      console.warn(`Quiz attempt ${attempt} failed:`, (error as Error).message);
      if (attempt === 4) {
        return NextResponse.json({ error: "שגיאה בטעינת השאלה" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: "שגיאה בטעינת השאלה" }, { status: 500 });
}
