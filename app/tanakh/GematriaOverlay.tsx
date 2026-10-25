"use client";

import { Fragment, useEffect, useState } from "react";
import { GEMATRIA_METHODS, gematria, type GematriaMethod } from "@/lib/gematria";

type Anchor = { text: string; rect: DOMRect };

const WORD = "[data-word]";
const VERSE_TEXT = "[data-gtext]";

const noHover = () => window.matchMedia("(hover: none)").matches;

// A drag-selection ends with a click; the reader skips toggling the verse then
export function hasTextSelection() {
  return !!window.getSelection()?.toString();
}

// On touch screens a tap on a word shows its value instead of marking the verse read
export function isTouchWordTap(target: EventTarget) {
  return noHover() && target instanceof Element && !!target.closest(WORD);
}

// The selected part of verse text only, so verse numbers and buttons in the selection
// (it may span verses) don't count
function selectedVerseText(): Anchor | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const root = range.commonAncestorContainer;
  const nodes: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) nodes.push(root as Text);
  else {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  }
  let text = "";
  for (const node of nodes) {
    if (!range.intersectsNode(node) || !node.parentElement?.closest(VERSE_TEXT)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.data.length;
    text += node.data.slice(start, end);
  }
  return /[א-ת]/.test(text) ? { text, rect: range.getBoundingClientRect() } : null;
}

function Bubble({ anchor: { text, rect }, methods }: { anchor: Anchor; methods: GematriaMethod[] }) {
  const below = rect.top < 72;
  const shown = GEMATRIA_METHODS.filter((m) => methods.includes(m.id));
  const value = (m: GematriaMethod) => gematria(text, m).toLocaleString("he-IL");
  return (
    <div
      role="status"
      className={`fixed z-50 pointer-events-none -translate-x-1/2 ${below ? "" : "-translate-y-full"}`}
      style={{ left: rect.left + rect.width / 2, top: below ? rect.bottom + 8 : rect.top - 8 }}
    >
      <div className="bg-stone-800 text-amber-50 rounded-lg shadow-lg px-2.5 py-1 text-sm">
        {shown.length === 1 ? (
          <span className="font-bold tabular-nums">{value(shown[0].id)}</span>
        ) : (
          <dl className="grid grid-cols-[auto_auto] gap-x-3 py-0.5">
            {shown.map((m) => (
              <Fragment key={m.id}>
                <dt className="text-xs text-stone-400 self-center">{m.short}</dt>
                <dd className="font-bold tabular-nums text-left">{value(m.id)}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

// Shows the gematria of the hovered (or, on touch, tapped) word, or of the selected letters
export default function GematriaOverlay({ methods }: { methods: GematriaMethod[] }) {
  const [word, setWord] = useState<Anchor | null>(null);
  const [selection, setSelection] = useState<Anchor | null>(null);

  useEffect(() => {
    const wordAt = (target: EventTarget | null) => {
      const el = target instanceof Element ? target.closest(WORD) : null;
      setWord(el ? { text: el.textContent ?? "", rect: el.getBoundingClientRect() } : null);
    };
    const onOver = (e: MouseEvent) => { if (!noHover()) wordAt(e.target); };
    const onClick = (e: MouseEvent) => { if (noHover()) wordAt(e.target); };
    const onSelection = () => setSelection(selectedVerseText());
    const onScroll = () => { setWord(null); onSelection(); };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("click", onClick);
    document.addEventListener("selectionchange", onSelection);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("click", onClick);
      document.removeEventListener("selectionchange", onSelection);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  const anchor = selection ?? word;
  return anchor ? <Bubble anchor={anchor} methods={methods} /> : null;
}
