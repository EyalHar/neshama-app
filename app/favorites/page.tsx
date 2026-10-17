"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toHebrewNumeral } from "@/lib/tanakh";
import HeartIcon from "@/app/components/HeartIcon";
import NoteIcon from "@/app/components/NoteIcon";
import VerseNotes from "@/app/components/VerseNotes";
import { unfavoriteConfirmMessage, type VerseNoteItem } from "@/lib/notes";
import type { FavoriteListItem } from "@/lib/favoriteLists";
import BookGroups from "./BookGroups";
import MoveMenu from "./MoveMenu";

type FavoriteChapterItem = { book: string; bookHe: string; chapter: number };
type FavoriteVerseItem = {
  book: string; bookHe: string; chapter: number; verse: number; text: string;
  notes: VerseNoteItem[]; listId: string | null;
};

const verseKey = (v: { book: string; chapter: number; verse: number }) => `${v.book}-${v.chapter}-${v.verse}`;

// "verses" = general tab (verses in no list), "chapters", or the id of a named list
type FavTab = "verses" | "chapters" | string;

async function sendJson(url: string, method: string, body?: object) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const [chapters, setChapters] = useState<FavoriteChapterItem[]>([]);
  const [verses, setVerses] = useState<FavoriteVerseItem[]>([]);
  const [lists, setLists] = useState<FavoriteListItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [tab, setTab] = useState<FavTab>("verses");
  const [addingNoteTo, setAddingNoteTo] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; verse: FavoriteVerseItem } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); // `${tab}|${book}`
  const [renaming, setRenaming] = useState<string | null>(null);
  const loading = status === "loading" || (!!session && fetching);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => {
        setChapters(d.chapters ?? []);
        setVerses(d.verses ?? []);
        setLists(d.lists ?? []);
      })
      .finally(() => setFetching(false));
  }, [session]);

  async function removeChapter(item: FavoriteChapterItem) {
    setChapters((prev) => prev.filter((c) => !(c.book === item.book && c.chapter === item.chapter)));
    await sendJson("/api/favorites/chapter", "POST", { book: item.book, chapter: item.chapter });
  }

  function patchVerse(item: FavoriteVerseItem, patch: Partial<FavoriteVerseItem>) {
    setVerses((prev) => prev.map((v) => (verseKey(v) === verseKey(item) ? { ...v, ...patch } : v)));
  }

  async function removeVerse(item: FavoriteVerseItem) {
    if (item.notes.length > 0 && !window.confirm(unfavoriteConfirmMessage(item.notes))) return;
    setVerses((prev) => prev.filter((v) => verseKey(v) !== verseKey(item)));
    await sendJson("/api/favorites/verse", "POST", { book: item.book, chapter: item.chapter, verse: item.verse });
  }

  async function moveVerse(item: FavoriteVerseItem, listId: string | null) {
    setMenu(null);
    patchVerse(item, { listId });
    const { ok } = await sendJson("/api/favorites/verse/list", "PATCH", {
      book: item.book, chapter: item.chapter, verse: item.verse, listId,
    });
    if (!ok) patchVerse(item, { listId: item.listId });
  }

  async function createListAndMove(item: FavoriteVerseItem, name: string): Promise<string | null> {
    const { ok, status: code, data } = await sendJson("/api/favorites/lists", "POST", { name });
    if (!ok) return code === 409 ? "כבר יש רשימה בשם הזה" : "יצירת הרשימה נכשלה";
    setLists((prev) => [...prev, data.list]);
    await moveVerse(item, data.list.id);
    return null;
  }

  async function renameList(list: FavoriteListItem, name: string) {
    const { ok, status: code, data } = await sendJson(`/api/favorites/lists/${list.id}`, "PATCH", { name });
    if (!ok) { window.alert(code === 409 ? "כבר יש רשימה בשם הזה" : "שינוי השם נכשל"); return; }
    setLists((prev) => prev.map((l) => (l.id === list.id ? data.list : l)));
    setRenaming(null);
  }

  async function deleteList(list: FavoriteListItem) {
    const count = verses.filter((v) => v.listId === list.id).length;
    const msg = count > 0
      ? `למחוק את הרשימה "${list.name}"? ${count === 1 ? "הפסוק שבה יחזור" : `${count} הפסוקים שבה יחזרו`} לפסוקים האהובים ביותר.`
      : `למחוק את הרשימה "${list.name}"?`;
    if (!window.confirm(msg)) return;
    const { ok } = await sendJson(`/api/favorites/lists/${list.id}`, "DELETE");
    if (!ok) return;
    setLists((prev) => prev.filter((l) => l.id !== list.id));
    setVerses((prev) => prev.map((v) => (v.listId === list.id ? { ...v, listId: null } : v)));
    setTab("verses");
  }

  function openMenu(e: MouseEvent, verse: FavoriteVerseItem) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, verse });
  }

  function toggleBook(book: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      const key = `${tab}|${book}`;
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const tabVerses = tab === "chapters" ? [] : verses.filter((v) => (tab === "verses" ? v.listId === null : v.listId === tab));
  const tabBooks = [...new Set(tabVerses.map((v) => v.book))];
  const collapsedInTab = new Set([...collapsed].filter((k) => k.startsWith(`${tab}|`)).map((k) => k.slice(tab.length + 1)));
  const allCollapsed = tabBooks.length > 0 && tabBooks.every((b) => collapsedInTab.has(b));
  const activeList = lists.find((l) => l.id === tab);

  function setAllCollapsed(value: boolean) {
    setCollapsed((prev) => {
      const next = new Set([...prev].filter((k) => !k.startsWith(`${tab}|`)));
      if (value) tabBooks.forEach((b) => next.add(`${tab}|${b}`));
      return next;
    });
  }

  const tabs: { id: FavTab; label: string; count: number }[] = [
    { id: "verses", label: "הפסוקים האהובים ביותר", count: verses.filter((v) => v.listId === null).length },
    ...lists.map((l) => ({ id: l.id, label: l.name, count: verses.filter((v) => v.listId === l.id).length })),
    { id: "chapters", label: "הפרקים האהובים ביותר", count: chapters.length },
  ];

  function renderVerse(v: FavoriteVerseItem) {
    const showNotes = v.notes.length > 0 || addingNoteTo === verseKey(v);
    return (
      <div
        key={verseKey(v)}
        onContextMenu={(e) => openMenu(e, v)}
        className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-700 mb-1.5">
              {v.bookHe} {toHebrewNumeral(v.chapter)}&lrm;:{toHebrewNumeral(v.verse)}
            </p>
            <p className="text-stone-700 leading-relaxed">{v.text}</p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ x: r.left, y: r.bottom + 4, verse: v }); }}
                title="העבר לרשימה (או לחצן ימני על הפסוק)"
                aria-haspopup="menu"
                className="w-7 h-7 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-lg leading-none"
              >
                ⋮
              </button>
              <button
                type="button"
                onClick={() => removeVerse(v)}
                title="הסר מהאהובים ביותר"
                className="p-1 rounded-full hover:bg-red-50 transition-colors"
              >
                <HeartIcon filled size={18} />
              </button>
            </div>
            <Link
              href={`/tanakh?book=${encodeURIComponent(v.book)}&chapter=${v.chapter}&verse=${v.verse}`}
              className="text-xs text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              קרא פרק ←
            </Link>
          </div>
        </div>
        {showNotes ? (
          <div className="mt-3">
            <VerseNotes
              book={v.book}
              chapter={v.chapter}
              verse={v.verse}
              notes={v.notes}
              isFavorite
              onNotesChange={(notes) => patchVerse(v, { notes })}
              onClose={v.notes.length === 0 ? () => setAddingNoteTo(null) : undefined}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingNoteTo(verseKey(v))}
            className="mt-2 flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-700 transition-colors"
          >
            <NoteIcon size={14} />
            הערה/ חידוש
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center gap-2 mb-1">
        <HeartIcon filled size={24} />
        <h1 className="text-2xl font-bold text-stone-800">האהובים עליי ביותר</h1>
      </div>
      <p className="text-stone-400 text-sm mb-6">פרקים ופסוקים ששמרת — כל האהובים ביותר שלך במקום אחד</p>

      {status !== "loading" && !session && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <p className="text-stone-600 mb-2">כדי לשמור ולצפות באהובים ביותר יש להתחבר</p>
          <a href="/login" className="text-amber-600 hover:underline">התחבר</a>
        </div>
      )}

      {session && loading && (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {session && !loading && (
        <div>
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 mb-6 border-b border-stone-200 pb-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setRenaming(null); }}
                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
                  tab === t.id
                    ? "border-amber-600 text-amber-700 bg-amber-50"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {t.label}
                <span className="mr-1.5 text-xs text-stone-400">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Favorite chapters */}
          {tab === "chapters" && (
            <section>
              {chapters.length === 0 ? (
                <p className="text-stone-400 text-sm">
                  עדיין לא סימנת פרקים כאהובים ביותר — לחץ על סמל הלב ליד כותרת הפרק בדף{" "}
                  <Link href="/tanakh" className="text-amber-600 hover:underline">קריאת תנ״ך</Link> כדי להוסיף.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {chapters.map((c) => (
                    <div
                      key={`${c.book}-${c.chapter}`}
                      className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl pr-3 pl-1.5 py-1.5 shadow-sm"
                    >
                      <Link
                        href={`/tanakh?book=${encodeURIComponent(c.book)}&chapter=${c.chapter}`}
                        className="text-sm font-medium text-stone-700 hover:text-amber-700 transition-colors"
                      >
                        {c.bookHe} פרק {toHebrewNumeral(c.chapter)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeChapter(c)}
                        title="הסר מהאהובים ביותר"
                        className="p-1 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <HeartIcon filled size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Favorite verses — general tab or a named list */}
          {tab !== "chapters" && (
            <section>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                {activeList && renaming === activeList.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); renameList(activeList, new FormData(e.currentTarget).get("name") as string); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      name="name"
                      defaultValue={activeList.name}
                      maxLength={40}
                      autoFocus
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
                    />
                    <button type="submit" className="text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg">שמור</button>
                    <button type="button" onClick={() => setRenaming(null)} className="text-xs text-stone-500 px-2 py-1.5 rounded-lg hover:bg-stone-100">ביטול</button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-stone-700">{activeList?.name ?? "הפסוקים האהובים ביותר"}</h2>
                    {activeList && (
                      <>
                        <button type="button" onClick={() => setRenaming(activeList.id)} className="text-xs text-stone-400 hover:text-amber-700">שנה שם</button>
                        <button type="button" onClick={() => deleteList(activeList)} className="text-xs text-stone-400 hover:text-red-600">מחק רשימה</button>
                      </>
                    )}
                  </div>
                )}
                {tabBooks.length > 1 && (
                  <button type="button" onClick={() => setAllCollapsed(!allCollapsed)} className="text-xs text-stone-500 hover:text-amber-700">
                    {allCollapsed ? "פתח את כל הספרים" : "סגור את כל הספרים"}
                  </button>
                )}
              </div>

              {tabVerses.length === 0 ? (
                <p className="text-stone-400 text-sm">
                  {activeList ? (
                    "הרשימה ריקה. כדי להעביר אליה פסוק, לחץ לחצן ימני על פסוק (או על ⋮) ובחר ברשימה."
                  ) : verses.length > 0 ? (
                    "כל הפסוקים האהובים שלך נמצאים ברשימות."
                  ) : (
                    <>
                      עדיין לא סימנת פסוקים כאהובים ביותר — עבור עם העכבר על פסוק בדף{" "}
                      <Link href="/tanakh" className="text-amber-600 hover:underline">קריאת תנ״ך</Link> ולחץ על סמל הלב כדי להוסיף.
                    </>
                  )}
                </p>
              ) : (
                <>
                  <p className="text-xs text-stone-400 mb-3">לחצן ימני על פסוק (או ⋮) כדי להעביר אותו לרשימה</p>
                  <BookGroups items={tabVerses} collapsed={collapsedInTab} onToggle={toggleBook} render={renderVerse} />
                </>
              )}
            </section>
          )}
        </div>
      )}

      {menu && (
        <MoveMenu
          x={menu.x}
          y={menu.y}
          lists={lists}
          currentListId={menu.verse.listId}
          onMove={(listId) => moveVerse(menu.verse, listId)}
          onCreate={(name) => createListAndMove(menu.verse, name)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
