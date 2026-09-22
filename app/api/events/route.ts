import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `אתה מומחה בתנ"ך העברי.

תפקידך: לקבל שם של אירוע מהתנ"ך ולהחזיר את כל המקורות הרלוונטיים שבהם האירוע מוזכר.

החזר JSON בפורמט הזה בלבד:
{
  "event_title": "שם האירוע בעברית",
  "event_summary": "תיאור קצר של האירוע (1-2 משפטים בעברית)",
  "sources": [
    {
      "sefaria_ref": "שם הספר באנגלית פרק:פסוק (לדוגמה: II Kings 2:11)",
      "reference_he": "שם הספר בעברית פרק:פסוק (לדוגמה: מלכים ב ב:יא)",
      "context": "משפט אחד בעברית המסביר כיצד פסוק זה קשור לאירוע"
    }
  ]
}

חוקים:
- החזר עד 10 מקורות
- כלול פסוקים שמתארים את האירוע ישירות, ופסוקים שמזכירים אותו בהקשרים אחרים
- השתמש בשמות ספרים באנגלית ב-sefaria_ref בלבד: Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, I Samuel, II Samuel, I Kings, II Kings, Isaiah, Jeremiah, Ezekiel, Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi, Psalms, Proverbs, Job, Song of Songs, Ruth, Lamentations, Ecclesiastes, Esther, Daniel, Ezra, Nehemiah, I Chronicles, II Chronicles
- ציין רק פסוקים שאתה בטוח שהם קיימים
- כל הטקסט מחוץ ל-sefaria_ref — בעברית בלבד`;

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
    return raw ? stripHtml(raw) : null;
  } catch {
    return null;
  }
}

function parseSefRef(ref: string): { book: string; chapter: number; verse: number } | null {
  // Match "Book Chapter:Verse" and also "Book Chapter:Verse-EndVerse" ranges — take first verse
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)/);
  if (!match) return null;
  return { book: match[1], chapter: parseInt(match[2]), verse: parseInt(match[3]) };
}

export async function POST(request: NextRequest) {
  try {
    const { event, exclude } = await request.json();

    if (!event?.trim()) {
      return NextResponse.json({ error: "נא להזין שם אירוע" }, { status: 400 });
    }

    const excludeRefs: string[] = Array.isArray(exclude) ? exclude : [];
    const userContent = excludeRefs.length
      ? `אירוע: ${event}\n\nהמקורות הבאים כבר נמצאו והוצגו למשתמש — אל תחזיר אותם שוב, החזר עד 10 מקורות נוספים ואחרים בלבד (אם אין עוד מקורות רלוונטיים, החזר sources כרשימה ריקה):\n${excludeRefs.join(", ")}`
      : `אירוע: ${event}`;

    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const text = completion.choices[0].message.content;
    if (!text) throw new Error("Empty response");

    const groqResult = JSON.parse(text);

    // Safety net beyond the prompt instruction — drop anything the model re-sent anyway.
    const excludeSet = new Set(excludeRefs.map((r) => r.trim().toLowerCase()));
    const rawSources = (groqResult.sources as { sefaria_ref: string; reference_he: string; context: string }[])
      .filter((s) => !excludeSet.has(s.sefaria_ref?.trim().toLowerCase()));

    const sources = await Promise.all(
      rawSources.map(async (s) => {
        const hebrewText = await fetchVerseFromSefaria(s.sefaria_ref);
        const parsed = parseSefRef(s.sefaria_ref);
        return {
          reference_he: s.reference_he,
          sefaria_ref: s.sefaria_ref,
          text: hebrewText ?? "לא נמצא טקסט",
          context: s.context,
          book: parsed?.book ?? "",
          chapter: parsed?.chapter ?? 0,
          verse: parsed?.verse ?? 0,
        };
      })
    );

    return NextResponse.json({
      event_title: groqResult.event_title,
      event_summary: groqResult.event_summary,
      sources,
    });
  } catch (error) {
    console.error("Events API error:", error);
    return NextResponse.json({ error: "אירעה שגיאה, נסה שוב" }, { status: 500 });
  }
}
