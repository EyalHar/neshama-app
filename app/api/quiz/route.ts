import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { TANAKH_BOOKS, fetchChapter, toHebrewNumeral } from "@/lib/tanakh";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Strip Hebrew diacritics: niqqud (U+05B0–U+05C7) + cantillation/teamim (U+0591–U+05AF)
// Maqaf (U+05BE) is replaced with a space first so connected words don't merge
function stripDiacritics(text: string): string {
  return text
    .replace(/־/g, " ")
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

async function fetchRandomVerse(): Promise<{
  book: (typeof TANAKH_BOOKS)[0];
  chapter: number;
  verse: number;
  textRaw: string;   // with niqqud — for display
  textClean: string; // without diacritics — for Groq
} | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const book = TANAKH_BOOKS[Math.floor(Math.random() * TANAKH_BOOKS.length)];
    const chapter = Math.floor(Math.random() * book.chapters) + 1;
    try {
      const verses = await fetchChapter(book.id, chapter);
      const valid = verses
        .map((rawText, i) => ({
          textRaw: rawText,
          textClean: stripDiacritics(rawText),
          verse: i + 1,
        }))
        .filter((v) => v.textClean.length >= 20 && v.textClean.length <= 200);
      if (valid.length === 0) continue;
      const picked = valid[Math.floor(Math.random() * valid.length)];
      return { book, chapter, verse: picked.verse, textRaw: picked.textRaw, textClean: picked.textClean };
    } catch {
      continue;
    }
  }
  return null;
}

// Find the index of the matching clean token, then return the raw token at that index
function findRawToken(
  textRaw: string,
  textClean: string,
  cleanWord: string
): string | null {
  const rawTokens = textRaw.split(/\s+/);
  const cleanTokens = textClean.split(/\s+/);

  for (let i = 0; i < cleanTokens.length; i++) {
    const t = cleanTokens[i];
    if (
      t === cleanWord ||
      (t.includes(cleanWord) && t.length <= cleanWord.length + 3) ||
      (cleanWord.includes(t) && t.length >= 2 && t.length >= cleanWord.length - 2)
    ) {
      return rawTokens[i] ?? null;
    }
  }
  return null;
}

async function generateQuiz() {
    // Step 1: Fetch a real verse from Sefaria
    const verseData = await fetchRandomVerse();
    if (!verseData) throw new Error("Could not fetch verse from Sefaria");

    const { book, chapter, verse, textRaw, textClean } = verseData;

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
        { role: "user", content: `הפסוק: ${textClean}` },
      ],
    });

    const groqText = completion.choices[0].message.content;
    if (!groqText) throw new Error("Empty response");
    const groqData = JSON.parse(groqText);
    const missingWord: string = groqData.missing_word;

    // Step 3: Find the raw token (with niqqud) that corresponds to the clean word Groq returned
    const rawToken = findRawToken(textRaw, textClean, missingWord);
    if (!rawToken) {
      throw new Error(`Word "${missingWord}" not found in verse`);
    }
    // Blank out in the raw (niqqud) text — all other words keep their niqqud
    const verseWithBlank = textRaw.replace(rawToken, "_____");
    const actualMissingWord = rawToken; // show with niqqud when answer is revealed

    // Step 4: Shuffle options — correct answer displayed without niqqud (like the wrong options)
    const actualMissingWordClean = stripDiacritics(actualMissingWord);
    const options = [actualMissingWordClean, ...groqData.wrong_options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const correctIndex = options.indexOf(actualMissingWordClean);

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
