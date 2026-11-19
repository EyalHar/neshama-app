import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TANAKH_BOOKS, stripVerseHtml } from "@/lib/tanakh";
import { requireSignedIn } from "@/lib/apiGuards";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `אתה עוזר רוחני שמתמחה בתנ"ך העברי.

תפקידך: לקרוא את מה שהמשתמש שיתף, להבין את הצורך הרגשי/נפשי, ולהמליץ על פסוקים מדויקים מהתנ"ך.

החזר JSON בפורמט הזה בלבד:
{
  "emotional_need": "זיהוי קצר של הצורך (משפט אחד בעברית)",
  "emotion": "אחד מהערכים: sadness | fear | loneliness | hope | loss | anger | love | illness | default",
  "verses": [
    {
      "sefaria_ref": "שם הספר באנגלית פרק:פסוק (לדוגמה: Psalms 23:4 או Isaiah 40:31 או Genesis 15:1)",
      "reference_he": "שם הספר בעברית פרק:פסוק (לדוגמה: תהלים כג:ד)",
      "why": "משפט אחד בעברית - למה הפסוק הזה מתאים למצב"
    }
  ],
  "personal_message": "מסר אישי חם ומחזק בעברית (2-3 משפטים)"
}

הנחיות לבחירת emotion:
- sadness: עצב, בכי, דיכאון, תחושת כבדות
- fear: פחד, חרדה, דאגה, לחץ
- loneliness: בדידות, ניתוק, חוסר שייכות
- hope: תקווה, ציפייה, חלומות, שינוי
- loss: אובדן, אבל, פרידה, מוות
- anger: כעס, תסכול, עוול, פגיעה
- love: אהבה, קשר, משפחה, זוגיות
- illness: מחלה, ריפוי, בריאות, כאב גופני
- default: כללי / לא מתאים לשום קטגוריה

חוקים:
- בחר 2-3 פסוקים אמיתיים מהתנ"ך (תורה, נביאים, כתובים)
- השתמש בשמות ספרים באנגלית ב-sefaria_ref (Genesis, Exodus, Psalms, Isaiah, Proverbs, וכו')
- כל שאר הטקסט - בעברית בלבד
- טון: חם, אוהב, מחזק`;

// The model's "Book 12:3" (or "Book 12:3-5") as a place in the reader — only if the verse is really in
// the Tanakh (VerseText), so a wrong reference from the model gets no link rather than a broken one
const BOOK_IDS = new Set(TANAKH_BOOKS.map((b) => b.id));
// Spellings the model may use for our book ids ("Psalm 23:4", "1 Samuel 1:27")
const BOOK_ALIASES: Record<string, string> = { Psalm: "Psalms", "Song of Solomon": "Song of Songs", Canticles: "Song of Songs", Qohelet: "Ecclesiastes" };
const bookId = (name: string) => {
  const roman = name.replace(/^([12])\s+/, (_, n: string) => (n === "1" ? "I " : "II "));
  return [name, roman, BOOK_ALIASES[name]].find((n) => n && BOOK_IDS.has(n)) ?? null;
};
async function readerLocation(ref: string): Promise<{ book: string; chapter: number; verse: number } | null> {
  const m = ref?.trim().match(/^(.+?)\s+(\d+):(\d+)/);
  const book = m && bookId(m[1]);
  if (!m || !book) return null;
  const [chapter, verse] = [Number(m[2]), Number(m[3])];
  const row = await prisma.verseText.findUnique({ where: { book_chapter_verse: { book, chapter, verse } }, select: { id: true } });
  return row ? { book, chapter, verse } : null;
}

async function fetchVerseFromSefaria(ref: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(ref);
    const res = await fetch(
      `https://www.sefaria.org/api/texts/${encoded}?lang=he&context=0`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const raw = Array.isArray(data.he) ? data.he.join(" ") : data.he;
    return raw ? stripVerseHtml(raw) : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireSignedIn();
  if (denied) return denied;
  try {
    const { story, wish } = await request.json();

    if (!story?.trim()) {
      return NextResponse.json({ error: "נא לשתף מה עובר עליך" }, { status: 400 });
    }

    const userMessage = wish?.trim()
      ? `מה עובר עלי: ${story}\n\nמשאלתי: ${wish}`
      : `מה עובר עלי: ${story}`;

    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const text = completion.choices[0].message.content;
    if (!text) throw new Error("Empty response");

    const groqResult = JSON.parse(text);

    const versesWithText = await Promise.all(
      groqResult.verses.map(async (v: { sefaria_ref: string; reference_he: string; why: string }) => {
        const [hebrewText, location] = await Promise.all([fetchVerseFromSefaria(v.sefaria_ref), readerLocation(v.sefaria_ref)]);
        return {
          reference: v.reference_he,
          text: hebrewText ?? "לא נמצא טקסט",
          why: v.why,
          ...(location ?? {}),
        };
      })
    );

    return NextResponse.json({
      emotional_need: groqResult.emotional_need,
      emotion: groqResult.emotion ?? "default",
      verses: versesWithText,
      personal_message: groqResult.personal_message,
    });
  } catch (error) {
    console.error("Neshama API error:", error);
    return NextResponse.json(
      { error: "אירעה שגיאה, נסה שוב" },
      { status: 500 }
    );
  }
}
