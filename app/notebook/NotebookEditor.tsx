"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import { APPEND_CHANNEL, docToText, sourceQuoteNode, type AppendMessage, type DocNode } from "@/lib/notebook";
import { SourceQuote } from "./SourceQuote";

const AUTOSAVE_MS = 800;

function ToolButton({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`min-w-8 h-8 px-2 rounded-lg text-sm transition-colors ${active ? "bg-amber-100 text-amber-800" : "text-stone-600 hover:bg-stone-100"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [addingVerse, setAddingVerse] = useState(false);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  return (
    <div className="relative flex flex-wrap items-center gap-0.5 border-b border-stone-200 px-2 py-1.5 print:hidden">
      <ToolButton title="כותרת" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>כותרת</ToolButton>
      <ToolButton title="כותרת משנה" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>משנה</ToolButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <ToolButton title="מודגש" active={s.bold} onClick={() => chain().toggleBold().run()}><b>ב</b></ToolButton>
      <ToolButton title="נטוי" active={s.italic} onClick={() => chain().toggleItalic().run()}><i>נ</i></ToolButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <ToolButton title="רשימה" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>• רשימה</ToolButton>
      <ToolButton title="רשימה ממוספרת" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>1. רשימה</ToolButton>
      <ToolButton title="ציטוט" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>ציטוט</ToolButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <ToolButton title="בטל" onClick={() => s.canUndo && chain().undo().run()}>↶</ToolButton>
      <ToolButton title="בצע שוב" onClick={() => s.canRedo && chain().redo().run()}>↷</ToolButton>
      <span className="w-px h-5 bg-stone-200 mx-1" />
      <span data-addverse-toggle="">
        <ToolButton title="הוסף פסוק במקום הסמן" active={addingVerse} onClick={() => setAddingVerse(!addingVerse)}>＋ פסוק</ToolButton>
      </span>
      {addingVerse && <AddVersePopover editor={editor} onClose={() => setAddingVerse(false)} />}
    </div>
  );
}

// Hebrew numeral with geresh / gershayim: 1 → א׳, 11 → י״א, 15 → ט״ו
function hebrewNumberLabel(n: number): string {
  const s = toHebrewNumeral(n);
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`;
}

type ChapterVerse = { verse: number; text: string };

async function requestChapter(book: string, chapter: number): Promise<ChapterVerse[]> {
  const res = await fetch(`/api/tanakh?book=${encodeURIComponent(book)}&chapter=${chapter}`);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()).verses ?? [];
}

// "＋ פסוק" popover: pick book / chapter / verse (Hebrew numerals); the verse is inserted at the
// cursor as a sourced quote
function AddVersePopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState(TANAKH_BOOKS[0].id);
  const [chapter, setChapter] = useState(1);
  const [verse, setVerse] = useState(1);
  const [loaded, setLoaded] = useState<{ key: string; verses: ChapterVerse[] } | null>(null);
  const [error, setError] = useState("");
  const bookMeta = TANAKH_BOOKS.find((b) => b.id === book)!;
  const key = `${book}|${chapter}`;
  const verses = loaded?.key === key ? loaded.verses : null;

  // Load the chapter to list its verses (state is only set in the promise callbacks)
  useEffect(() => {
    let cancelled = false;
    requestChapter(book, chapter).then(
      (v) => { if (!cancelled) { setLoaded({ key: `${book}|${chapter}`, verses: v }); setError(""); } },
      () => { if (!cancelled) setError("טעינת הפרק נכשלה"); }
    );
    return () => { cancelled = true; };
  }, [book, chapter]);

  useEffect(() => {
    // Clicks on the toolbar toggle are left to its own onClick, or it would close and reopen
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!ref.current?.contains(target) && !target.closest?.("[data-addverse-toggle]")) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function insert() {
    const v = verses?.find((x) => x.verse === verse);
    if (!v) return;
    const source = `${bookMeta.he} ${toHebrewNumeral(chapter)}:${toHebrewNumeral(verse)}`;
    const href = `/tanakh?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`;
    editor.chain().focus().insertContent(sourceQuoteNode(v.text, { source, href, attribution: null })).run();
    onClose();
  }

  const select = "rounded-lg border border-stone-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-amber-400";
  return (
    <div ref={ref} dir="rtl" className="absolute top-full right-0 mt-1 z-30 w-72 bg-white border border-stone-200 rounded-xl shadow-xl p-3 space-y-2">
      <p className="text-xs font-bold text-stone-500">הוסף פסוק במקום הסמן</p>
      <select value={book} onChange={(e) => { setBook(e.target.value); setChapter(1); setVerse(1); }} className={`${select} w-full`} aria-label="ספר">
        {TANAKH_BOOKS.map((b) => <option key={b.id} value={b.id}>{b.he}</option>)}
      </select>
      <div className="flex gap-2">
        <label className="flex-1 flex items-center gap-1.5 text-sm text-stone-500">פרק
          <select value={chapter} onChange={(e) => { setChapter(Number(e.target.value)); setVerse(1); }} className={`${select} flex-1`}>
            {Array.from({ length: bookMeta.chapters }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>{hebrewNumberLabel(c)}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 flex items-center gap-1.5 text-sm text-stone-500">פסוק
          <select value={verse} onChange={(e) => setVerse(Number(e.target.value))} disabled={!verses} className={`${select} flex-1`}>
            {(verses ?? [{ verse: 1, text: "" }]).map((v) => (
              <option key={v.verse} value={v.verse}>{hebrewNumberLabel(v.verse)}</option>
            ))}
          </select>
        </label>
      </div>
      {verses && (
        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{verses.find((v) => v.verse === verse)?.text}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={insert}
        disabled={!verses}
        className="w-full text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        {verses ? "הוסף" : "טוען..."}
      </button>
    </div>
  );
}

// The notebook page editor: TipTap with headings, lists, quotes and sourced quotes; autosaves
export default function NotebookEditor({
  docId,
  initialContent,
  onSave,
  onCopyText,
}: {
  docId: string;
  initialContent: DocNode;
  onSave: (content: DocNode) => Promise<void>;
  onCopyText: (text: string) => void;
}) {
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: false }), SourceQuote],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir: "rtl",
        class: "notebook-content min-h-[50vh] px-6 py-5 focus:outline-none text-stone-800 leading-relaxed",
      },
    },
    onUpdate: ({ editor: e }) => {
      setStatus("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await saveRef.current(e.getJSON() as DocNode);
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      }, AUTOSAVE_MS);
    },
  });

  // A quote collected into this page from another tab: add it here too, at the end, so this
  // editor's next autosave keeps it instead of overwriting it
  useEffect(() => {
    if (!editor) return;
    const channel = new BroadcastChannel(APPEND_CHANNEL);
    channel.onmessage = (e: MessageEvent<AppendMessage>) => {
      if (e.data.id !== docId) return;
      editor.commands.insertContentAt(editor.state.doc.content.size, e.data.node);
    };
    return () => channel.close();
  }, [editor, docId]);

  // Flush a pending save when leaving the page
  useEffect(() => () => {
    if (timer.current && editor) {
      clearTimeout(timer.current);
      saveRef.current(editor.getJSON() as DocNode).catch(() => {});
    }
  }, [editor]);

  if (!editor) return <div className="min-h-[50vh] bg-white rounded-2xl border border-stone-200" />;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm print:border-0 print:shadow-none">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-stone-100 text-xs text-stone-400 print:hidden">
        <span>
          {status === "saving" ? "שומר..." : status === "dirty" ? "שינויים לא שמורים" : status === "error" ? <span className="text-red-600">השמירה נכשלה — ננסה שוב בשינוי הבא</span> : "נשמר ✓"}
        </span>
        <span className="flex gap-3">
          <button type="button" onClick={() => onCopyText(docToText(editor.getJSON() as DocNode))} className="hover:text-amber-700">העתק כטקסט</button>
          <button type="button" onClick={() => window.print()} className="hover:text-amber-700">הדפס / PDF</button>
        </span>
      </div>
    </div>
  );
}
