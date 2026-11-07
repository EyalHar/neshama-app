"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { APPEND_CHANNEL, COLLECT_EVENT, type AppendMessage, type CollectDetail, type QuoteSource, type StudyDocSummary } from "@/lib/notebook";
import { setActiveDoc, useActiveDoc, type ActiveDoc } from "@/app/notebook/activeDoc";

// Text anywhere on the site can be collected into the active notebook page if it sits inside an
// element marked with data-collect-source (plus optional data-collect-href / -attribution).
// Inside a selection, buttons and [data-collect-skip] elements (verse numbers, ✓ marks) are dropped.

function sourceOf(el: Element | null): (QuoteSource & { el: Element }) | null {
  const host = el?.closest("[data-collect-source]");
  if (!host) return null;
  return {
    el: host,
    source: host.getAttribute("data-collect-source") ?? "",
    href: host.getAttribute("data-collect-href"),
    attribution: host.getAttribute("data-collect-attribution"),
  };
}

const elementOf = (n: Node | null) => (n instanceof Element ? n : n?.parentElement ?? null);

// The selection as a collectable quote, or null if it isn't inside a marked source
function readSelection(): { detail: CollectDetail; rect: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (elementOf(range.commonAncestorContainer)?.closest(".notebook-content, input, textarea, [contenteditable=true]")) return null;
  const start = sourceOf(elementOf(range.startContainer));
  const end = sourceOf(elementOf(range.endContainer));
  if (!start || !end) return null;

  const box = document.createElement("div");
  box.appendChild(range.cloneContents());
  box.querySelectorAll("button, [data-collect-skip]").forEach((n) => n.remove());
  const text = (box.textContent ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 2) return null;

  // A selection across several verses is cited as a range
  const source = start.el === end.el || start.source === end.source ? start.source : `${start.source} – ${end.source}`;
  return { detail: { text, source: { source, href: start.href, attribution: start.attribution } }, rect: range.getBoundingClientRect() };
}

async function appendTo(doc: ActiveDoc, detail: CollectDetail): Promise<boolean> {
  const res = await fetch(`/api/notebook/${doc.id}/append`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(detail),
  });
  if (!res.ok) return false;
  // Let a tab that has this page open in the editor add the quote too (see NotebookEditor)
  const { node } = await res.json();
  const channel = new BroadcastChannel(APPEND_CHANNEL);
  channel.postMessage({ id: doc.id, node } satisfies AppendMessage);
  channel.close();
  return true;
}

function DocPicker({ onPick, onClose }: { onPick: (doc: ActiveDoc) => void; onClose: () => void }) {
  const [docs, setDocs] = useState<StudyDocSummary[] | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    fetch("/api/notebook").then((r) => r.json()).then((d) => setDocs(d.docs ?? []), () => setDocs([]));
  }, []);

  async function create() {
    const res = await fetch("/api/notebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) onPick((await res.json()).doc);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 print:hidden" onMouseDown={onClose}>
      <div dir="rtl" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-stone-800 mb-1">לאיזה דף להוסיף?</h2>
        <p className="text-xs text-stone-500 mb-3">הדף שתבחר יהיה ״הדף הפעיל״, ומה שתוסיף מעכשיו ייכנס אליו.</p>
        <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
          {!docs && <p className="text-sm text-stone-400">טוען...</p>}
          {docs?.length === 0 && <p className="text-sm text-stone-400">עוד אין דפים — צור אחד למטה</p>}
          {docs?.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onPick({ id: d.id, title: d.title })}
              className="w-full text-right px-3 py-2 rounded-lg text-sm text-stone-700 hover:bg-amber-50 transition-colors"
            >
              📝 {d.title}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex gap-2 border-t border-stone-100 pt-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="דף חדש: שם הדף"
            className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
          />
          <button type="submit" className="text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg">צור</button>
        </form>
      </div>
    </div>
  );
}

export default function NotebookCollector() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const active = useActiveDoc();
  const [floating, setFloating] = useState<{ detail: CollectDetail; top: number; left: number } | null>(null);
  const [pending, setPending] = useState<CollectDetail | null>(null); // waiting for a page to be picked
  const [picking, setPicking] = useState(false);
  const [toast, setToast] = useState<{ text: string; doc?: ActiveDoc } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, doc?: ActiveDoc) => {
    setToast({ text, doc });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const add = useCallback(async (detail: CollectDetail, doc: ActiveDoc | null) => {
    setFloating(null);
    if (!doc) { setPending(detail); setPicking(true); return; }
    const ok = await appendTo(doc, detail);
    if (ok) {
      window.getSelection()?.removeAllRanges();
      showToast(`נוסף ל״${doc.title}״ ✓`, doc);
    } else {
      // The page may have been deleted elsewhere — ask again
      setActiveDoc(null);
      setPending(detail);
      setPicking(true);
    }
  }, [showToast]);

  // Floating "add to page" button over a selection inside a collectable source
  useEffect(() => {
    if (!session) return;
    const update = () => {
      const found = readSelection();
      if (!found) { setFloating(null); return; }
      setFloating({
        detail: found.detail,
        top: Math.max(8, found.rect.top - 44),
        left: Math.min(window.innerWidth - 140, Math.max(8, found.rect.left + found.rect.width / 2 - 60)),
      });
    };
    const onUp = () => setTimeout(update, 0);
    const onScroll = () => setFloating(null);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    document.addEventListener("touchend", onUp);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("touchend", onUp);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [session]);

  // Explicit "add to page" buttons (verse, note) dispatch COLLECT_EVENT
  useEffect(() => {
    const onCollect = (e: Event) => add((e as CustomEvent<CollectDetail>).detail, active);
    window.addEventListener(COLLECT_EVENT, onCollect);
    return () => window.removeEventListener(COLLECT_EVENT, onCollect);
  }, [add, active]);

  if (!session) return null;
  const onActivePage = active && pathname === `/notebook/${active.id}`;

  return (
    <>
      {floating && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => add(floating.detail, active)}
          style={{ top: floating.top, left: floating.left }}
          className="fixed z-50 bg-stone-800 hover:bg-stone-900 text-amber-50 text-sm px-3 py-1.5 rounded-full shadow-lg print:hidden"
        >
          📝 הוסף לדף
        </button>
      )}

      {active && !onActivePage && (
        <div dir="rtl" className="fixed bottom-4 left-4 z-40 flex items-center gap-2 bg-white border border-amber-200 shadow-lg rounded-full pr-3 pl-1.5 py-1.5 text-xs print:hidden">
          <Link href={`/notebook/${active.id}`} className="text-stone-700 hover:text-amber-700 max-w-48 truncate" title="פתח את הדף. מה שתוסיף לדף מכל מקום באתר ייכנס לכאן">
            📝 הדף הפעיל: <span className="font-medium">{active.title}</span>
          </Link>
          <button type="button" onClick={() => setPicking(true)} className="text-stone-400 hover:text-amber-700 px-1">החלף</button>
          <button type="button" onClick={() => setActiveDoc(null)} title="בטל את הדף הפעיל" className="text-stone-400 hover:text-stone-700 w-5 h-5 rounded-full hover:bg-stone-100">✕</button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-16 inset-x-0 z-50 flex justify-center pointer-events-none px-4 print:hidden">
          <div dir="rtl" className="pointer-events-auto bg-stone-800 text-amber-50 text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
            {toast.text}
            {toast.doc && <Link href={`/notebook/${toast.doc.id}`} className="underline text-amber-200">פתח</Link>}
          </div>
        </div>
      )}

      {picking && (
        <DocPicker
          onClose={() => { setPicking(false); setPending(null); }}
          onPick={(doc) => {
            setActiveDoc(doc);
            setPicking(false);
            if (pending) add(pending, doc);
            setPending(null);
          }}
        />
      )}
    </>
  );
}
