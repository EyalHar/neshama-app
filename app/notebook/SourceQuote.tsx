"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import Link from "next/link";

// Links are only followed inside the site or to Sefaria — page JSON comes back from the client
const safeHref = (href: unknown) =>
  typeof href === "string" && ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("https://www.sefaria.org/")) ? href : null;

function SourceQuoteView({ node, deleteNode }: ReactNodeViewProps) {
  const { source, href, attribution } = node.attrs as { source: string; href: string | null; attribution: string | null };
  const link = safeHref(href);
  return (
    <NodeViewWrapper as="figure" className="group/quote relative my-3 border-s-4 border-amber-300 bg-amber-50/60 rounded-e-lg px-4 py-2.5">
      {/* Removes the whole quote (text + source) in one step; undoable with ↶ */}
      <button
        type="button"
        contentEditable={false}
        onClick={deleteNode}
        title="מחק את הציטוט מהדף"
        className="absolute top-1.5 left-1.5 text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md px-1.5 py-0.5 opacity-0 group-hover/quote:opacity-100 focus-visible:opacity-100 transition-opacity print:hidden"
      >
        ✕ מחק
      </button>
      <NodeViewContent className="text-stone-800 leading-relaxed [&_p]:my-1" />
      <figcaption contentEditable={false} className="mt-1 text-xs text-amber-800 select-none">
        —{" "}
        {link ? (
          link.startsWith("/") ? (
            <Link href={link} className="hover:underline">{source}</Link>
          ) : (
            <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">{source}</a>
          )
        ) : (
          source
        )}
        {attribution && <span className="text-stone-400"> · {attribution}</span>}
      </figcaption>
    </NodeViewWrapper>
  );
}

// A quote collected from a verse, note or commentary, with its source kept as attributes
export const SourceQuote = Node.create({
  name: "sourceQuote",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      source: { default: "" },
      href: { default: null },
      attribution: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-source-quote]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-source-quote": "" }), ["blockquote", 0]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SourceQuoteView);
  },
});
