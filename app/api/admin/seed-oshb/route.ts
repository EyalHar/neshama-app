import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Canonical Tanakh order: [OSHB filename, Sefaria book ID]
const TORAH: [string, string][] = [
  ["Gen", "Genesis"], ["Exod", "Exodus"], ["Lev", "Leviticus"],
  ["Num", "Numbers"], ["Deut", "Deuteronomy"],
];
const NEVI: [string, string][] = [
  ["Josh", "Joshua"], ["Judg", "Judges"], ["1Sam", "I Samuel"],
  ["2Sam", "II Samuel"], ["1Kgs", "I Kings"], ["2Kgs", "II Kings"],
  ["Isa", "Isaiah"], ["Jer", "Jeremiah"], ["Ezek", "Ezekiel"],
  ["Hos", "Hosea"], ["Joel", "Joel"], ["Amos", "Amos"],
  ["Obad", "Obadiah"], ["Jonah", "Jonah"], ["Mic", "Micah"],
  ["Nah", "Nahum"], ["Hab", "Habakkuk"], ["Zeph", "Zephaniah"],
  ["Hag", "Haggai"], ["Zech", "Zechariah"], ["Mal", "Malachi"],
];
const KETUVIM: [string, string][] = [
  ["Ps", "Psalms"], ["Prov", "Proverbs"], ["Job", "Job"],
  ["Song", "Song of Songs"], ["Ruth", "Ruth"], ["Lam", "Lamentations"],
  ["Eccl", "Ecclesiastes"], ["Esth", "Esther"], ["Dan", "Daniel"],
  ["Ezra", "Ezra"], ["Neh", "Nehemiah"],
  ["1Chr", "I Chronicles"], ["2Chr", "II Chronicles"],
];
const ALL_BOOKS = [...TORAH, ...NEVI, ...KETUVIM];

const SCOPE_MAP: Record<string, [string, string][]> = {
  torah: TORAH, nevi: NEVI, ketuvim: KETUVIM, all: ALL_BOOKS,
};

function stripToLetters(text: string): string {
  return text.replace(/[^א-ת\s]/g, "").replace(/\s+/g, " ").trim();
}

function stripCantillation(text: string): string {
  return text.replace(/[֑-֯׀׃׆]/g, "").replace(/\//g, "").replace(/\s+/g, " ").trim();
}

type VerseData = {
  book: string; chapter: number; verse: number; verseIndex: number;
  text: string; plainText: string; firstLetter: string; lastLetter: string;
};
type WordData = {
  book: string; chapter: number; verse: number; verseIndex: number;
  wordNum: number; word: string; lemma: string; morph: string; plain: string;
};

function parseXml(xml: string, bookId: string, startVerseIndex: number): { verses: VerseData[]; words: WordData[]; nextVerseIndex: number } {
  const verses: VerseData[] = [];
  const words: WordData[] = [];
  let verseIndex = startVerseIndex;

  const verseRegex = /<verse osisID="[^.]+\.(\d+)\.(\d+)">([\s\S]*?)<\/verse>/g;
  let verseMatch: RegExpExecArray | null;

  while ((verseMatch = verseRegex.exec(xml)) !== null) {
    const chapter = parseInt(verseMatch[1]);
    const verse = parseInt(verseMatch[2]);
    const content = verseMatch[3];

    const wordTexts: string[] = [];
    const wordRegex = /<w\b([^>]*)>([\s\S]*?)<\/w>/g;
    let wMatch: RegExpExecArray | null;
    let wordNum = 0;

    while ((wMatch = wordRegex.exec(content)) !== null) {
      const attrs = wMatch[1];
      const rawWord = wMatch[2].replace(/\//g, "");
      const lemma = attrs.match(/lemma="([^"]*)"/)?.[1] ?? "";
      const morph = attrs.match(/morph="([^"]*)"/)?.[1] ?? "";

      wordTexts.push(rawWord);
      wordNum++;
      words.push({
        book: bookId, chapter, verse, verseIndex,
        wordNum, word: stripCantillation(rawWord),
        lemma, morph, plain: stripToLetters(rawWord),
      });
    }

    if (wordTexts.length === 0) continue;

    const text = wordTexts.map(stripCantillation).join(" ");
    const plainText = wordTexts.map(stripToLetters).join(" ").trim();
    const lettersOnly = plainText.replace(/\s/g, "");
    const firstLetter = lettersOnly[0] ?? "";
    const lastLetter = lettersOnly[lettersOnly.length - 1] ?? "";

    if (firstLetter && lastLetter) {
      verses.push({ book: bookId, chapter, verse, verseIndex, text, plainText, firstLetter, lastLetter });
      verseIndex++;
    }
  }

  return { verses, words, nextVerseIndex: verseIndex };
}

async function insertVerses(verses: VerseData[]) {
  for (const v of verses) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "VerseText" (book, chapter, verse, verseIndex, text, plainText, firstLetter, lastLetter) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      v.book, v.chapter, v.verse, v.verseIndex, v.text, v.plainText, v.firstLetter, v.lastLetter
    );
  }
}

async function insertWords(words: WordData[]) {
  for (const w of words) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "WordEntry" (book, chapter, verse, verseIndex, wordNum, word, lemma, morph, plain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      w.book, w.chapter, w.verse, w.verseIndex, w.wordNum, w.word, w.lemma, w.morph, w.plain
    );
  }
}

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "all";
  const books = SCOPE_MAP[scope] ?? ALL_BOOKS;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // Start verseIndex after existing data so sections can be seeded independently
      type MaxRow = { maxIdx: number | null };
      const [{ maxIdx }] = await prisma.$queryRawUnsafe<MaxRow[]>(
        `SELECT MAX(verseIndex) as maxIdx FROM "VerseText"`
      );
      let verseIndex = (maxIdx ?? 0) + 1;

      let totalVerses = 0;
      let totalWords = 0;

      try {
        for (const [oshbId, bookId] of books) {
          send({ type: "progress", book: bookId, status: "downloading" });

          const res = await fetch(
            `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${oshbId}.xml`
          );
          if (!res.ok) { send({ type: "error", book: bookId, msg: `HTTP ${res.status}` }); continue; }

          const xml = await res.text();
          send({ type: "progress", book: bookId, status: "parsing" });

          const { verses, words, nextVerseIndex } = parseXml(xml, bookId, verseIndex);
          verseIndex = nextVerseIndex;

          await insertVerses(verses);
          await insertWords(words);

          totalVerses += verses.length;
          totalWords += words.length;
          send({ type: "progress", book: bookId, status: "done", verses: verses.length });
        }

        send({ type: "complete", totalVerses, totalWords });
      } catch (e) {
        send({ type: "error", msg: String(e) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
