import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `אתה מומחה בתנ"ך העברי. צור שאלת חידון.

בחר פסוק אמיתי ומוכר מהתנ"ך, בחר מילה משמעותית להסתרה, וצור 3 חלופות שגויות אך הגיוניות.

החזר JSON בלבד:
{
  "sefaria_ref": "Book Chapter:Verse (לדוגמה: Psalms 23:4 או Genesis 1:1)",
  "reference_he": "שם הספר בעברית פרק:פסוק (לדוגמה: תהלים כג:ד)",
  "book": "English book name",
  "chapter": 1,
  "verse": 1,
  "verse_with_blank": "טקסט הפסוק עם _____ (חמישה קווים תחתונים) במקום המילה החסרה",
  "missing_word": "המילה החסרה",
  "wrong_options": ["חלופה שגויה 1", "חלופה שגויה 2", "חלופה שגויה 3"]
}

חוקים:
- הפסוק חייב להיות אמיתי ומדויק מהתנ"ך העברי
- המילה החסרה — שם עצם, פועל, או תואר (לא מילת יחס קצרה)
- החלופות השגויות — מאותו תחום סמנטי, הגיוניות דקדוקית אך שגויות בהקשר
- גוון בין תורה, נביאים וכתובים`;

export async function POST() {
  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "צור שאלת חידון חדשה" },
      ],
    });

    const text = completion.choices[0].message.content;
    if (!text) throw new Error("Empty response");

    const data = JSON.parse(text);

    // Put correct answer first, then shuffle
    const options = [data.missing_word, ...data.wrong_options];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const correctIndex = options.indexOf(data.missing_word);

    return NextResponse.json({
      sefaria_ref: data.sefaria_ref,
      reference_he: data.reference_he,
      book: data.book,
      chapter: data.chapter,
      verse: data.verse,
      verse_with_blank: data.verse_with_blank,
      missing_word: data.missing_word,
      options,
      correct_index: correctIndex,
    });
  } catch (error) {
    console.error("Quiz API error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת השאלה" }, { status: 500 });
  }
}
