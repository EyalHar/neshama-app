// "המחברת שלי" — personal notebook pages built from free text and quotes collected around the
// site. Client-safe: shared by the API routes, the editor and the global collector.

export const NOTEBOOK_TITLE_MAX = 80;
export const NOTEBOOK_QUOTE_MAX = 20000;

export type StudyDocSummary = { id: string; title: string; updatedAt: string };
export type StudyDocFull = StudyDocSummary & { content: DocNode };

// Where a collected quote came from, shown under it in the page
export type QuoteSource = {
  source: string; // e.g. "בראשית א:ג", "רש״י על בראשית א:ג"
  href: string | null; // the verse in the reader, or the commentary on Sefaria
  attribution: string | null; // edition + license for commentary text (required by CC-BY-SA)
};

// Minimal ProseMirror/TipTap JSON shape
export type DocNode = { type: string; attrs?: Record<string, unknown>; content?: DocNode[]; text?: string; marks?: { type: string; attrs?: Record<string, unknown> }[] };

export const emptyDoc = (): DocNode => ({ type: "doc", content: [{ type: "paragraph" }] });

// A quote node ("sourceQuote", see app/notebook/SourceQuote.tsx): its text as paragraphs + the source
export function sourceQuoteNode(text: string, src: QuoteSource): DocNode {
  const paragraphs = text
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return {
    type: "sourceQuote",
    attrs: { ...src },
    content: (paragraphs.length ? paragraphs : [""]).map((p) => (p ? { type: "paragraph", content: [{ type: "text", text: p }] } : { type: "paragraph" })),
  };
}

// Plain text of a page, for "copy as text": quotes in ״…״ with their source on the next line
export function docToText(doc: DocNode): string {
  const inline = (n: DocNode): string => (n.text ?? "") + (n.content ?? []).map(inline).join("");
  const block = (n: DocNode): string => {
    switch (n.type) {
      case "sourceQuote": {
        const a = n.attrs as QuoteSource;
        const body = (n.content ?? []).map(inline).join("\n");
        return `״${body}״\n— ${a.source}${a.attribution ? ` (${a.attribution})` : ""}`;
      }
      case "bulletList":
        return (n.content ?? []).map((li) => `• ${(li.content ?? []).map(block).join(" ")}`).join("\n");
      case "orderedList":
        return (n.content ?? []).map((li, i) => `${i + 1}. ${(li.content ?? []).map(block).join(" ")}`).join("\n");
      case "blockquote":
        return (n.content ?? []).map(block).join("\n");
      default:
        return inline(n);
    }
  };
  return (doc.content ?? []).map(block).filter((t) => t.trim()).join("\n\n");
}

// The page the collector currently adds to ("הדף הפעיל"), remembered per browser
export const ACTIVE_DOC_KEY = "notebook-active-doc";
export const NOTEBOOK_EVENT = "notebook-active-change";
// Explicit "add to page" buttons dispatch this with { text, source } as detail
export const COLLECT_EVENT = "notebook-collect";
// BroadcastChannel name: after a quote is appended to a page, other tabs with that page open add
// the same node locally, so their next autosave doesn't overwrite it
export const APPEND_CHANNEL = "notebook-append";
export type AppendMessage = { id: string; node: DocNode };
export type CollectDetail = { text: string; source: QuoteSource };

export function collect(detail: CollectDetail) {
  window.dispatchEvent(new CustomEvent<CollectDetail>(COLLECT_EVENT, { detail }));
}
