import { prisma } from "@/lib/prisma";

const STRONGS_URL =
  "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js";

function stripDiacritics(text: string): string {
  return text.replace(/[^א-ת]/g, "");
}

function extractParents(derivation: string): string {
  if (!derivation) return "";
  const matches = derivation.match(/H(\d+)/g) ?? [];
  return [...new Set(matches)].join(",");
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        send({ type: "progress", msg: "מוריד מילון Strong's..." });

        const res = await fetch(STRONGS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.text();

        // Strip JS wrapper and parse JSON
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const dict = JSON.parse(raw.slice(start, end + 1)) as Record<
          string,
          { lemma?: string; xlit?: string; strongs_def?: string; derivation?: string }
        >;

        send({ type: "progress", msg: `מעבד ${Object.keys(dict).length} ערכים...` });

        let count = 0;
        for (const [key, entry] of Object.entries(dict)) {
          const lemmaHe = entry.lemma ?? "";
          const lemmaPlain = stripDiacritics(lemmaHe);
          const derivation = entry.derivation ?? "";
          const derivedFrom = extractParents(derivation);
          const isPrimitive = /primitive/i.test(derivation);

          await prisma.$executeRawUnsafe(
            `INSERT OR REPLACE INTO "StrongsEntry" (number, lemmaHe, lemmaPlain, xlit, definition, derivedFrom, isPrimitive)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            key,
            lemmaHe,
            lemmaPlain,
            entry.xlit ?? "",
            entry.strongs_def ?? "",
            derivedFrom,
            isPrimitive ? 1 : 0
          );
          count++;
        }

        send({ type: "complete", count });
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
