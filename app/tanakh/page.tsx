"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore, Fragment } from "react";
import { useSession } from "next-auth/react";
import { TANAKH_BOOKS, randomBook, randomChapter, toHebrewNumeral } from "@/lib/tanakh";
import HeartIcon from "@/app/components/HeartIcon";
import VerseText, { findWordRanges } from "@/app/components/VerseText";
import NoteIcon from "@/app/components/NoteIcon";
import VerseNotes from "@/app/components/VerseNotes";
import Commentaries, { BookIcon } from "@/app/components/Commentaries";
import { unfavoriteConfirmMessage, type VerseNoteItem } from "@/lib/notes";
import type { DivisionKind, DivisionUnit, VerseRef } from "@/lib/divisions";
import { inRef, type PassageMark, type PassageResponse, type PassageSection, type PassageVerse } from "@/lib/passage";
import type { Leitword } from "@/lib/leitwords";
import CelebrationModal, { type CelebrationData } from "./CelebrationModal";
import LeitwordChips from "./LeitwordChips";
import GematriaSettings from "./GematriaSettings";
import GematriaOverlay, { hasTextSelection, isTouchWordTap } from "./GematriaOverlay";
import { parseGematriaMethods } from "@/lib/gematria";
import { playCelebrationSound } from "./sound";

const SHOW_SPECIAL_KEY = "tanakh-show-special-letters";
const GEMATRIA_KEY = "tanakh-show-gematria";
const GEMATRIA_METHODS_KEY = "tanakh-gematria-methods";
const DIVISION_KEY = "tanakh-division";
const PREFS_EVENT = "tanakh-prefs-change";

// Reader preferences live in localStorage; useSyncExternalStore keeps SSR (no localStorage) consistent
function subscribePrefs(onChange: () => void) {
  window.addEventListener(PREFS_EVENT, onChange);
  return () => window.removeEventListener(PREFS_EVENT, onChange);
}
function setPref(key: string, value: string) {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

const SECTIONS = ["תורה", "נביאים", "כתובים"] as const;

const key = (c: number, v: number) => `${c}:${v}`;
const refLabel = (r: VerseRef) => `${toHebrewNumeral(r[0])}:${toHebrewNumeral(r[1])}`;
const verseCountLabel = (n: number) => (n === 1 ? "פסוק אחד" : `${n} פסוקים`);

type UnitsInfo = { kind: DivisionKind | null; units: DivisionUnit[] };

// Open (פ) / closed (ס) section break, as in a Torah scroll; green once the section is read
function SectionBreak({ type, done }: { type: "פ" | "ס"; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 ${type === "פ" ? "py-4" : "py-1.5"}`} title={type === "פ" ? "פרשה פתוחה" : "פרשה סתומה"}>
      <span className={`h-px flex-1 ${done ? "bg-green-200" : "bg-stone-200"}`} />
      <span className={`text-sm font-bold transition-colors ${done ? "text-green-600" : "text-stone-300"}`}>
        {done && "✓ "}
        {type}
      </span>
      <span className={`h-px flex-1 ${done ? "bg-green-200" : "bg-stone-200"}`} />
    </div>
  );
}

// The unit containing `anchor`; past the end → the last unit, otherwise the first
function unitFor(units: DivisionUnit[], anchor: VerseRef): DivisionUnit | undefined {
  return units.find((u) => inRef(anchor, u.start, u.end)) ?? (units.length && inRef(units.at(-1)!.end, [0, 0], anchor) ? units.at(-1) : units[0]);
}

export default function TanakhPage() {
  const { data: session } = useSession();

  // Position: book + an anchor verse. Chapter mode shows the anchor's chapter; division mode
  // shows the parasha / parashiya containing it — so switching modes keeps the reader's place.
  const [selectedBook, setSelectedBook] = useState(TANAKH_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [anchorVerse, setAnchorVerse] = useState(1);
  const [unitsByBook, setUnitsByBook] = useState<Record<string, UnitsInfo>>({});

  const [verses, setVerses] = useState<PassageVerse[]>([]);
  const [versesLoadedFor, setVersesLoadedFor] = useState(""); // passage key the current `verses` belong to
  const [chapterVerseCounts, setChapterVerseCounts] = useState<Record<number, number>>({});
  const [sections, setSections] = useState<PassageSection[]>([]);
  const [specialLetters, setSpecialLetters] = useState<PassageMark[]>([]);
  const [leitwords, setLeitwords] = useState<Leitword[]>([]);
  const [activeLeitword, setActiveLeitword] = useState<string | null>(null); // `${scope}|${strongs}`
  const [readVerses, setReadVerses] = useState<Set<string>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const [partialChapters, setPartialChapters] = useState<Set<number>>(new Set());
  const [completedBooks, setCompletedBooks] = useState<Set<string>>(new Set());
  const [partialBooks, setPartialBooks] = useState<Set<string>>(new Set());
  const [favoriteVerses, setFavoriteVerses] = useState<Set<string>>(new Set());
  const [favoriteChapters, setFavoriteChapters] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<VerseNoteItem[]>([]);
  const [openNotesVerse, setOpenNotesVerse] = useState<string | null>(null);
  const [openCommentaryVerse, setOpenCommentaryVerse] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null); // tinted parashiya
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const chapterHeaderRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("תורה");
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [restored, setRestored] = useState(false);
  const [highlightedVerse, setHighlightedVerse] = useState<string | null>(null);
  const [pendingRandomVerse, setPendingRandomVerse] = useState(false);
  const [pendingVerseParam, setPendingVerseParam] = useState<VerseRef | null>(null);

  const showSpecialLetters = useSyncExternalStore(subscribePrefs, () => localStorage.getItem(SHOW_SPECIAL_KEY) === "1", () => false);
  const divisionPref = useSyncExternalStore(subscribePrefs, () => localStorage.getItem(DIVISION_KEY) === "units", () => false);
  const showGematria = useSyncExternalStore(subscribePrefs, () => localStorage.getItem(GEMATRIA_KEY) === "1", () => false);
  const gematriaMethods = parseGematriaMethods(
    useSyncExternalStore(subscribePrefs, () => localStorage.getItem(GEMATRIA_METHODS_KEY) ?? "", () => "")
  );

  // ── Current passage ────────────────────────────────────────────────────────────────
  const bookUnits = unitsByBook[selectedBook.id];
  const divisionAvailable = selectedBook.id !== "Psalms";
  const wantUnits = divisionPref && divisionAvailable;
  const unitsLoaded = !!bookUnits;
  const unitMode = wantUnits && unitsLoaded && bookUnits.kind !== null && bookUnits.units.length > 0;
  const units = unitMode ? bookUnits.units : [];
  const currentUnit = unitMode ? unitFor(units, [selectedChapter, anchorVerse]) : undefined;
  const unitIndex = currentUnit ? units.indexOf(currentUnit) : -1;
  const kind = unitMode ? bookUnits.kind : null;
  const unitNoun = kind === "parashot" ? "בפרשה" : kind === "parashiyot" ? "בפרשייה" : "בפרק";
  const unitName = kind === "parashot" ? "פרשה" : kind === "parashiyot" ? "פרשייה" : "פרק";

  const passageKey = currentUnit
    ? `${selectedBook.id}|${currentUnit.start.join(":")}-${currentUnit.end.join(":")}`
    : `${selectedBook.id}|${selectedChapter}`;
  const passageUrl = currentUnit
    ? `/api/tanakh?book=${encodeURIComponent(selectedBook.id)}&from=${currentUnit.start.join(":")}&to=${currentUnit.end.join(":")}`
    : `/api/tanakh?book=${encodeURIComponent(selectedBook.id)}&chapter=${selectedChapter}`;
  // In division mode wait for the book's units before loading anything
  const passageReady = restored && (!wantUnits || unitsLoaded);

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  // Restore position — URL params take priority over localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlBook = TANAKH_BOOKS.find((b) => b.id === urlParams.get("book"));
    if (urlBook) {
      const chapter = parseInt(urlParams.get("chapter") ?? "1") || 1;
      const verse = parseInt(urlParams.get("verse") ?? "");
      setSelectedBook(urlBook);
      setSelectedChapter(chapter);
      setAnchorVerse(verse || 1);
      setActiveSection(urlBook.section);
      if (verse) setPendingVerseParam([chapter, verse]);
      setRestored(true);
      return;
    }
    try {
      const { bookId, chapter, verse } = JSON.parse(localStorage.getItem("tanakh-position") ?? "{}");
      const book = TANAKH_BOOKS.find((b) => b.id === bookId);
      if (book) {
        setSelectedBook(book);
        setSelectedChapter(chapter);
        setAnchorVerse(verse ?? 1);
        setActiveSection(book.section);
      }
    } catch {}
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem("tanakh-position", JSON.stringify({ bookId: selectedBook.id, chapter: selectedChapter, verse: anchorVerse }));
  }, [selectedBook, selectedChapter, anchorVerse, restored]);

  // Fetch the book's parashot / parashiyot when reading by division (state set in the callback)
  useEffect(() => {
    if (!wantUnits || unitsByBook[selectedBook.id]) return;
    const bookId = selectedBook.id;
    fetch(`/api/tanakh/units?book=${encodeURIComponent(bookId)}`)
      .then((r) => r.json())
      .then((info: UnitsInfo) => setUnitsByBook((prev) => ({ ...prev, [bookId]: info })))
      .catch(() => setUnitsByBook((prev) => ({ ...prev, [bookId]: { kind: null, units: [] } })));
  }, [wantUnits, selectedBook, unitsByBook]);

  const loadPassage = useCallback(async (url: string, loadedKey: string) => {
    setLoading(true);
    setVerses([]);
    setReadVerses(new Set());
    setOpenNotesVerse(null);
    setOpenCommentaryVerse(null);
    setActiveLeitword(null);
    setSelectedSection(null);
    setCollapsedSections(new Set());
    try {
      const data: PassageResponse = await (await fetch(url)).json();
      setVerses(data.verses ?? []);
      setChapterVerseCounts(data.chapterVerseCounts ?? {});
      setSections(data.sections ?? []);
      setSpecialLetters(data.specialLetters ?? []);
      setLeitwords(data.leitwords ?? []);
      setVersesLoadedFor(loadedKey);
      setReadVerses(new Set(data.readVerses ?? []));
      setCompletedChapters(new Set(data.completedChapters ?? []));
      setPartialChapters(new Set(data.partialChapters ?? []));
      setCompletedBooks(new Set(data.completedBooks ?? []));
      setPartialBooks(new Set(data.partialBooks ?? []));
      setFavoriteVerses(new Set(data.favoriteVerses ?? []));
      setFavoriteChapters(new Set(data.favoriteChapters ?? []));
      setNotes(data.notes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!passageReady) return;
    loadPassage(passageUrl, passageKey);
  }, [passageReady, passageUrl, passageKey, loadPassage]);

  // `verses` briefly still holds the PREVIOUS passage's data after the selection changes
  // (loadPassage clears/repopulates it asynchronously) — so both effects below must wait for
  // versesLoadedFor to catch up to the current selection before trusting `verses`.
  const versesReady = verses.length > 0 && versesLoadedFor === passageKey;

  function flashVerse(k: string) {
    setHighlightedVerse(k);
    setTimeout(() => {
      document.getElementById(`verse-${k.replace(":", "-")}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    setTimeout(() => setHighlightedVerse(null), 1000);
  }

  // Random-verse jump and arriving via a verse-specific link (search results, favorites, the
  // quiz, etc.) both scroll to the verse and briefly highlight it, the same subtle way.
  useEffect(() => {
    if (!pendingRandomVerse || !versesReady) return;
    setPendingRandomVerse(false);
    const v = verses[Math.floor(Math.random() * verses.length)];
    flashVerse(key(v.chapter, v.verse));
  }, [verses, versesReady, pendingRandomVerse]);

  useEffect(() => {
    if (!pendingVerseParam || !versesReady) return;
    setPendingVerseParam(null);
    flashVerse(key(...pendingVerseParam));
  }, [versesReady, pendingVerseParam]);

  // ── Navigation ─────────────────────────────────────────────────────────────────────
  function goTo(book: typeof TANAKH_BOOKS[0], chapter: number, verse = 1) {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setAnchorVerse(verse);
    setActiveSection(book.section);
  }

  // Prev/next are clicked at the bottom of the passage. Without this, the old verses are
  // cleared and the new ones load *above* the buttons, and the browser's scroll anchoring
  // keeps the buttons in view, which lands the reader at the bottom of the new passage.
  // Jumping to the passage header first means the new verses load below the viewport anchor.
  function scrollToChapterHeader() {
    chapterHeaderRef.current?.scrollIntoView({ block: "start" });
  }

  const currentBookIndex = TANAKH_BOOKS.findIndex((b) => b.id === selectedBook.id);
  const nextBook = TANAKH_BOOKS[currentBookIndex + 1];
  const prevBook = TANAKH_BOOKS[currentBookIndex - 1];
  const hasNext = unitMode ? unitIndex < units.length - 1 || !!nextBook : selectedChapter < selectedBook.chapters || !!nextBook;
  const hasPrev = unitMode ? unitIndex > 0 || !!prevBook : selectedChapter > 1 || !!prevBook;

  function goNext() {
    scrollToChapterHeader();
    if (unitMode && unitIndex < units.length - 1) {
      const u = units[unitIndex + 1];
      goTo(selectedBook, u.start[0], u.start[1]);
    } else if (!unitMode && selectedChapter < selectedBook.chapters) {
      goTo(selectedBook, selectedChapter + 1);
    } else if (nextBook) {
      goTo(nextBook, 1);
    }
  }

  function goPrev() {
    scrollToChapterHeader();
    if (unitMode && unitIndex > 0) {
      const u = units[unitIndex - 1];
      goTo(selectedBook, u.start[0], u.start[1]);
    } else if (!unitMode && selectedChapter > 1) {
      goTo(selectedBook, selectedChapter - 1);
    } else if (prevBook) {
      // An anchor past the book's end resolves to its last parasha / parashiya
      goTo(prevBook, prevBook.chapters, unitMode ? 999 : 1);
    }
  }

  function selectBook(book: typeof TANAKH_BOOKS[0]) {
    goTo(book, 1);
  }

  function handleRandomTanakh() {
    const book = randomBook();
    goTo(book, randomChapter(book));
  }

  function handleRandomInBook() {
    goTo(selectedBook, randomChapter(selectedBook));
  }

  function handleRandomVerse() {
    const book = randomBook();
    goTo(book, randomChapter(book));
    setPendingRandomVerse(true);
  }

  // ── Progress & celebrations ────────────────────────────────────────────────────────
  const verseKeysOf = (start: VerseRef, end: VerseRef) =>
    verses.filter((v) => inRef([v.chapter, v.verse], start, end)).map((v) => key(v.chapter, v.verse));
  const isComplete = (keys: string[], read: Set<string>) => keys.length > 0 && keys.every((k) => read.has(k));

  function findNextUnreadChapter(afterChapter: number, completed: Set<number>): number | undefined {
    for (let ch = afterChapter + 1; ch <= selectedBook.chapters; ch++) {
      if (!completed.has(ch)) return ch;
    }
    return undefined;
  }

  type BigEvents = {
    tanakhJustCompleted?: boolean;
    sectionJustCompleted?: string | null;
    bookJustCompleted?: boolean;
    completedBooksCount?: number;
  };

  // Book / section / Tanakh completion → the big modal. Returns whether one was shown.
  function celebrateBig(data: BigEvents): boolean {
    if (!data.tanakhJustCompleted && !data.sectionJustCompleted && !data.bookJustCompleted) return false;
    setCompletedBooks((prev) => new Set([...prev, selectedBook.id]));
    if (data.tanakhJustCompleted) {
      playCelebrationSound("tanakh");
      setCelebration({ type: "tanakh", count: data.completedBooksCount ?? 0 });
    } else if (data.sectionJustCompleted) {
      playCelebrationSound("section");
      setCelebration({ type: "section", sectionName: data.sectionJustCompleted, count: data.completedBooksCount ?? 0 });
    } else {
      playCelebrationSound("book");
      setCelebration({ type: "book", bookName: selectedBook.he, count: data.completedBooksCount ?? 0 });
    }
    return true;
  }

  // After marking verses read in division mode: a finished parasha gets the modal, a finished
  // parashiya (or chapter) a small toast. `before`/`after` are the read sets around the change.
  function celebrateDivision(before: Set<string>, after: Set<string>, chaptersDone: number[]) {
    const allKeys = verses.map((v) => key(v.chapter, v.verse));
    if (kind === "parashot" && currentUnit && !isComplete(allKeys, before) && isComplete(allKeys, after)) {
      playCelebrationSound("book");
      setCelebration({ type: "parasha", parashaName: currentUnit.label, count: 0 });
      return;
    }
    const finished = sections.filter((s) => {
      const keys = verseKeysOf(s.start, s.end);
      return !isComplete(keys, before) && isComplete(keys, after);
    });
    if (finished.length === 1) {
      playCelebrationSound("small");
      showToast(`✓ סיימת את הפרשייה ״${finished[0].title}״`);
    } else if (finished.length > 1) {
      playCelebrationSound("small");
      showToast(`✓ סיימת ${finished.length} פרשיות`);
    } else if (chaptersDone.length) {
      playCelebrationSound("small");
      showToast(`✓ סיימת את פרק ${toHebrewNumeral(chaptersDone[0])}`);
    }
  }

  async function toggleVerse(v: PassageVerse) {
    if (!session) return;
    const k = key(v.chapter, v.verse);
    const before = readVerses;
    const after = new Set(readVerses);
    const wasRead = after.has(k);
    if (wasRead) after.delete(k); else after.add(k);
    setReadVerses(after);
    if (!wasRead) {
      setCompletedChapters((prev) => { const s = new Set(prev); s.delete(v.chapter); return s; });
      setPartialChapters((prev) => new Set([...prev, v.chapter]));
    }

    const res = await fetch("/api/tanakh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book: selectedBook.id, chapter: v.chapter, verse: v.verse, totalVerses: chapterVerseCounts[v.chapter] }),
    });
    const data = await res.json();

    if (data.chapterJustCompleted) {
      window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
      setCompletedChapters((prev) => new Set([...prev, v.chapter]));
    }
    if (celebrateBig(data)) return;
    if (unitMode) {
      if (!wasRead) celebrateDivision(before, after, data.chapterJustCompleted ? [v.chapter] : []);
    } else if (data.chapterJustCompleted) {
      const newCompleted = new Set([...completedChapters, v.chapter]);
      playCelebrationSound("chapter");
      setCelebration({ type: "chapter", bookName: selectedBook.he, chapterNum: v.chapter, count: data.completedChaptersTotal, nextUnreadChapter: findNextUnreadChapter(v.chapter, newCompleted) });
    }
  }

  async function markPassageComplete() {
    if (!session || verses.length === 0) return;
    const before = readVerses;
    const after = new Set(verses.map((v) => key(v.chapter, v.verse)));
    setReadVerses(after);

    if (!unitMode) {
      setCompletedChapters((prev) => new Set([...prev, selectedChapter]));
      const res = await fetch("/api/tanakh/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", book: selectedBook.id, chapter: selectedChapter, verseCount: verses.length }),
      });
      const data = await res.json();
      window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
      if (celebrateBig(data)) return;
      const newCompleted = new Set([...completedChapters, selectedChapter]);
      playCelebrationSound("chapter");
      setCelebration({ type: "chapter", bookName: selectedBook.he, chapterNum: selectedChapter, count: data.completedChaptersTotal, nextUnreadChapter: findNextUnreadChapter(selectedChapter, newCompleted) });
      return;
    }

    const res = await fetch("/api/tanakh/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "completeRange",
        book: selectedBook.id,
        verses: verses.map((v) => [v.chapter, v.verse]),
        chapterVerseCounts,
      }),
    });
    const data = await res.json();
    if (data.chaptersJustCompleted?.length) {
      setCompletedChapters((prev) => new Set([...prev, ...data.chaptersJustCompleted]));
      window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
    }
    if (celebrateBig(data)) return;
    celebrateDivision(before, after, data.chaptersJustCompleted ?? []);
  }

  async function clearPassage() {
    if (!session) return;
    setReadVerses(new Set());
    const chapters = [...new Set(verses.map((v) => v.chapter))];
    setCompletedChapters((prev) => { const s = new Set(prev); chapters.forEach((c) => s.delete(c)); return s; });
    await fetch("/api/tanakh/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        unitMode
          ? { action: "clearRange", book: selectedBook.id, verses: verses.map((v) => [v.chapter, v.verse]) }
          : { action: "clear", book: selectedBook.id, chapter: selectedChapter }
      ),
    });
    window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
  }

  async function handleReset() {
    await fetch("/api/tanakh/reset", { method: "DELETE" });
    setReadVerses(new Set());
    setCompletedChapters(new Set());
    setPartialChapters(new Set());
    setCompletedBooks(new Set());
    setPartialBooks(new Set());
    setCelebration(null);
  }

  // ── Favorites ──────────────────────────────────────────────────────────────────────
  async function toggleVerseFavorite(e: React.MouseEvent, v: PassageVerse) {
    e.stopPropagation();
    if (!session) return;
    const k = key(v.chapter, v.verse);
    const wasFav = favoriteVerses.has(k);
    const verseNoteItems = notes.filter((n) => n.chapter === v.chapter && n.verse === v.verse);
    if (wasFav && verseNoteItems.length > 0) {
      if (!window.confirm(unfavoriteConfirmMessage(verseNoteItems))) return;
      setNotes((prev) => prev.filter((n) => !(n.chapter === v.chapter && n.verse === v.verse)));
      if (openNotesVerse === k) setOpenNotesVerse(null);
    }
    const flip = (s: Set<string>, on: boolean) => { const n = new Set(s); if (on) n.add(k); else n.delete(k); return n; };
    setFavoriteVerses((prev) => flip(prev, !wasFav));
    try {
      await fetch("/api/favorites/verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: selectedBook.id, chapter: v.chapter, verse: v.verse }),
      });
    } catch {
      setFavoriteVerses((prev) => flip(prev, wasFav)); // revert on network failure
    }
  }

  async function toggleChapterFavorite() {
    if (!session) return;
    const wasFav = favoriteChapters.has(selectedChapter);
    const flip = (on: boolean) => setFavoriteChapters((prev) => { const s = new Set(prev); if (on) s.add(selectedChapter); else s.delete(selectedChapter); return s; });
    flip(!wasFav);
    try {
      await fetch("/api/favorites/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: selectedBook.id, chapter: selectedChapter }),
      });
    } catch {
      flip(wasFav);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────────────
  const booksInSection = TANAKH_BOOKS.filter((b) => b.section === activeSection);
  const allKeys = verses.map((v) => key(v.chapter, v.verse));
  const readCount = allKeys.filter((k) => readVerses.has(k)).length;
  const totalVerses = verses.length;
  const passageComplete = isComplete(allKeys, readVerses);
  const isBookComplete = completedBooks.has(selectedBook.id);

  // Highlight forms for the active leitword, which may belong to the passage or to one parashiya
  const [activeScope, activeStrongs] = activeLeitword?.split("|") ?? [];
  const activeList: Leitword[] = activeScope === "passage" ? leitwords : sections[Number(activeScope)]?.leitwords ?? [];
  const activeForms = activeList.find((l) => l.strongs === activeStrongs)?.forms;

  // A parasha holding several parashiyot is shown as one selectable, collapsible block per
  // parashiya; a chapter or a single parashiya is a flat list
  const showSections = unitMode && sections.length > 1;
  const allSectionsCollapsed = sections.length > 0 && collapsedSections.size === sections.length;
  const verseIndex = new Map(verses.map((v, i) => [key(v.chapter, v.verse), i]));

  function toggleSectionCollapsed(i: number) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function renderVerse(v: PassageVerse) {
    const k = key(v.chapter, v.verse);
    const i = verseIndex.get(k) ?? 0;
    const isRead = readVerses.has(k);
    const isFav = favoriteVerses.has(k);
    const verseNotes = notes.filter((n) => n.chapter === v.chapter && n.verse === v.verse);
    const notesOpen = openNotesVerse === k;
    const commentaryOpen = openCommentaryVerse === k;
    const newChapter = unitMode && (i === 0 || verses[i - 1].chapter !== v.chapter);
    return (
      <Fragment key={k}>
        {newChapter && <p className="px-4 pt-2 text-xs font-bold text-stone-400">פרק {toHebrewNumeral(v.chapter)}</p>}
        <div className={`relative ${notesOpen ? "z-20" : ""}`}>
          <div
            id={`verse-${v.chapter}-${v.verse}`}
            onClick={(e) => {
              if (hasTextSelection() || (showGematria && isTouchWordTap(e.target))) return;
              toggleVerse(v);
            }}
            className={`group flex gap-3 px-4 py-3 rounded-xl transition-colors duration-700 ${
              highlightedVerse === k
                ? "bg-amber-50 ring-1 ring-amber-200"
                : isRead ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-stone-100"
            } ${session ? "cursor-pointer" : "cursor-default"}`}
          >
            <span className={`text-xs font-mono mt-1 min-w-[1.5rem] ${isRead ? "text-amber-500" : "text-stone-300"}`}>
              {toHebrewNumeral(v.verse)}
            </span>
            <p data-gtext="" className={`text-lg leading-relaxed flex-1 ${isRead ? "text-amber-800" : "text-stone-700"}`}>
              <VerseText
                text={v.text}
                words={showGematria}
                marks={showSpecialLetters ? specialLetters.filter((m) => m.chapter === v.chapter && m.verse === v.verse) : undefined}
                highlights={activeForms?.[k] ? findWordRanges(v.text, new Set(activeForms[k])) : undefined}
              />
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenCommentaryVerse(commentaryOpen ? null : k); }}
              title="הצג פרשנים"
              aria-expanded={commentaryOpen}
              className={`self-start mt-1 shrink-0 p-0.5 rounded-full text-stone-500 hover:bg-stone-200 transition-opacity ${
                commentaryOpen ? "opacity-100 text-amber-700" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              }`}
            >
              <BookIcon />
            </button>
            {session && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpenNotesVerse(notesOpen ? null : k); }}
                title={verseNotes.length > 0 ? "הצג הערות וחידושים" : "הערה/ חידוש"}
                aria-expanded={notesOpen}
                className={`relative self-start mt-1 shrink-0 p-0.5 rounded-full text-amber-600 hover:bg-amber-100 transition-opacity ${
                  verseNotes.length > 0 || notesOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                }`}
              >
                <NoteIcon size={17} />
                {verseNotes.length > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-600 text-white text-[10px] leading-[15px] text-center font-medium">
                    {verseNotes.length}
                  </span>
                )}
              </button>
            )}
            {session && (
              <button
                type="button"
                onClick={(e) => toggleVerseFavorite(e, v)}
                title={isFav ? "הסר פסוק מהאהובים ביותר" : "הוסף פסוק לאהובים ביותר"}
                aria-pressed={isFav}
                className={`self-start mt-1 shrink-0 p-0.5 rounded-full hover:bg-red-50 transition-opacity ${
                  isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                }`}
              >
                <HeartIcon filled={isFav} size={17} />
              </button>
            )}
            {isRead && <span className="text-amber-400 text-lg self-start mt-1">✓</span>}
          </div>
          {commentaryOpen && (
            <div className="mx-2 sm:mx-10 mt-1 mb-3">
              <Commentaries book={selectedBook.id} chapter={v.chapter} verse={v.verse} onClose={() => setOpenCommentaryVerse(null)} />
            </div>
          )}
          {notesOpen && (
            <div className="absolute top-full inset-x-2 sm:inset-x-10 mt-1 shadow-xl rounded-xl bg-white">
              <VerseNotes
                book={selectedBook.id}
                chapter={v.chapter}
                verse={v.verse}
                notes={verseNotes}
                isFavorite={isFav}
                onNotesChange={(next) =>
                  setNotes((prev) => [...prev.filter((n) => !(n.chapter === v.chapter && n.verse === v.verse)), ...next])
                }
                onFavorited={() => setFavoriteVerses((prev) => new Set(prev).add(k))}
                onClose={() => setOpenNotesVerse(null)}
              />
            </div>
          )}
        </div>
      </Fragment>
    );
  }

  const passageTitle = currentUnit
    ? kind === "parashot"
      ? `פרשת ${currentUnit.label}`
      : `${selectedBook.he} · פרשייה ${toHebrewNumeral(unitIndex + 1)}`
    : `${selectedBook.he} פרק ${toHebrewNumeral(selectedChapter)}`;

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {celebration && (
        <CelebrationModal
          celebration={celebration}
          onClose={() => setCelebration(null)}
          onReset={handleReset}
          onGoToChapter={(ch) => { goTo(selectedBook, ch); setCelebration(null); }}
        />
      )}

      {showGematria && <GematriaOverlay methods={gematriaMethods} />}

      {toast && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="bg-stone-800 text-amber-50 text-sm px-4 py-2.5 rounded-full shadow-lg animate-modal-enter">{toast}</div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">קריאת תנ״ך</h1>
            {!session && (
              <a href="/login" className="text-amber-600 text-sm hover:underline">התחבר לשמירת התקדמות</a>
            )}
          </div>
          <div className="flex flex-col gap-1 w-36">
            <button
              onClick={handleRandomTanakh}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              פרק אקראי מהתנ״ך
            </button>
            <button
              onClick={handleRandomInBook}
              className="w-full bg-stone-600 hover:bg-stone-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              פרק אקראי מ{selectedBook.he}
            </button>
            <button
              onClick={handleRandomVerse}
              className="w-full bg-stone-400 hover:bg-stone-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              פסוק אקראי מהתנ״ך
            </button>
            <label className="flex items-center justify-center gap-2 mt-1 text-xs text-stone-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSpecialLetters}
                onChange={(e) => setPref(SHOW_SPECIAL_KEY, e.target.checked ? "1" : "0")}
                className="accent-amber-600 w-3.5 h-3.5"
              />
              הצג אותיות מיוחדות
            </label>
            <GematriaSettings
              enabled={showGematria}
              methods={gematriaMethods}
              onToggle={(on) => setPref(GEMATRIA_KEY, on ? "1" : "0")}
              onMethodsChange={(methods) => setPref(GEMATRIA_METHODS_KEY, methods.join(","))}
            />
          </div>
        </div>

        {/* Selector */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 shadow-sm">
          {/* Section tabs */}
          <div className="flex gap-2 mb-4">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => selectBook(TANAKH_BOOKS.find((b) => b.section === s)!)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === s ? "bg-amber-700 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Book selector */}
          <div className="flex gap-2 flex-wrap mb-4">
            {booksInSection.map((book) => {
              const isComplete = completedBooks.has(book.id);
              const isPartial = !isComplete && partialBooks.has(book.id);
              const isSelected = selectedBook.id === book.id;
              return (
                <button
                  key={book.id}
                  onClick={() => selectBook(book)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? "bg-amber-100 text-amber-800 font-medium ring-2 ring-amber-400"
                      : isComplete
                      ? "bg-green-100 text-green-700 font-medium"
                      : isPartial
                      ? "bg-orange-100 text-orange-700 font-medium"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {book.he}
                  {isComplete && <span className="mr-1">✓</span>}
                  {isPartial && <span className="mr-1">◑</span>}
                </button>
              );
            })}
          </div>

          {/* Division toggle: chapters ↔ parashot (Torah) / parashiyot (Nevi'im, Ketuvim) */}
          {divisionAvailable && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-stone-500 text-sm">חלוקה:</span>
              <div className="inline-flex bg-stone-100 rounded-lg p-0.5">
                {[
                  { units: false, label: "פרקים" },
                  { units: true, label: selectedBook.section === "תורה" ? "פרשות" : "פרשיות" },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setPref(DIVISION_KEY, o.units ? "units" : "chapters")}
                    aria-pressed={divisionPref === o.units}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      divisionPref === o.units ? "bg-white text-amber-800 font-medium shadow-sm" : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chapter / unit selector */}
          {unitMode ? (
            <div className="flex items-start gap-2">
              <span className="text-stone-500 text-sm mt-1.5">{kind === "parashot" ? "פרשה:" : "פרשייה:"}</span>
              <div className="flex gap-1 flex-wrap">
                {units.map((u, i) => (
                  <button
                    key={u.id}
                    onClick={() => goTo(selectedBook, u.start[0], u.start[1])}
                    title={`${u.title ? `״${u.title}״ · ` : ""}${refLabel(u.start)}–${refLabel(u.end)}`}
                    className={`min-w-8 h-8 px-2 rounded-lg text-sm transition-colors ${
                      currentUnit === u ? "bg-amber-700 text-white font-medium" : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {kind === "parashot" ? u.label : toHebrewNumeral(i + 1)}
                  </button>
                ))}
              </div>
            </div>
          ) : wantUnits && !unitsLoaded ? (
            <p className="text-sm text-stone-400">טוען חלוקה...</p>
          ) : (
            <div className="flex items-start gap-2">
              <span className="text-stone-500 text-sm mt-1.5">פרק:</span>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                  const isComplete = completedChapters.has(ch);
                  const isPartial = !isComplete && partialChapters.has(ch);
                  const isSelected = selectedChapter === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => goTo(selectedBook, ch)}
                      className={`min-w-8 h-8 px-1.5 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-amber-700 text-white font-medium"
                          : isComplete
                          ? "bg-green-100 text-green-700 font-medium"
                          : isPartial
                          ? "bg-orange-100 text-orange-700 font-medium"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {toHebrewNumeral(ch)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Passage header */}
        <div ref={chapterHeaderRef} className="flex items-center justify-between mb-4 flex-wrap gap-2 scroll-mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-stone-700">{passageTitle}</h2>
            {currentUnit && (
              <span className="text-sm text-stone-400">
                {kind === "parashiyot" && currentUnit.title && <>״{currentUnit.title}״ · </>}
                {refLabel(currentUnit.start)}–{refLabel(currentUnit.end)}
                {kind === "parashiyot" && totalVerses > 0 && ` (${verseCountLabel(totalVerses)})`}
              </span>
            )}
            {session && !unitMode && (
              <button
                type="button"
                onClick={toggleChapterFavorite}
                title={favoriteChapters.has(selectedChapter) ? "הסר פרק מהאהובים ביותר" : "הוסף פרק לאהובים ביותר"}
                aria-pressed={favoriteChapters.has(selectedChapter)}
                className="p-1 rounded-full hover:bg-red-50 transition-colors"
              >
                <HeartIcon filled={favoriteChapters.has(selectedChapter)} size={22} />
              </button>
            )}
            {isBookComplete && <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">✓ הספר הושלם</span>}
            {!isBookComplete && (unitMode ? passageComplete : completedChapters.has(selectedChapter)) && (
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">✓ ה{unitName} {unitName === "פרק" ? "הושלם" : "הושלמה"}</span>
            )}
            {showSpecialLetters && specialLetters.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {specialLetters.length} אותיות מיוחדות {unitNoun}
              </span>
            )}
            {showGematria && (
              <span className="bg-stone-200 text-stone-600 text-xs font-medium px-2 py-0.5 rounded-full">
                גימטריה: הצביעו על מילה או סמנו אותיות
              </span>
            )}
          </div>

          {session && totalVerses > 0 && (
            <span className="text-sm text-stone-400">{readCount}/{totalVerses}</span>
          )}
        </div>

        {!loading && (
          <LeitwordChips
            leitwords={leitwords}
            scope="passage"
            unitNoun={unitNoun}
            activeKey={activeLeitword}
            onToggle={setActiveLeitword}
          />
        )}

        {/* Verses */}
        {loading || !passageReady ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-amber-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : showSections ? (
          <div className="space-y-2">
            {sections.length > 1 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCollapsedSections(allSectionsCollapsed ? new Set() : new Set(sections.map((_, i) => i)))}
                  className="text-xs text-stone-500 hover:text-amber-700"
                >
                  {allSectionsCollapsed ? "פתח את כל הפרשיות" : "כווץ את כל הפרשיות"}
                </button>
              </div>
            )}
            {sections.map((s, si) => {
              const sectionVerses = verses.filter((v) => inRef([v.chapter, v.verse], s.start, s.end));
              const keys = sectionVerses.map((v) => key(v.chapter, v.verse));
              const done = isComplete(keys, readVerses);
              const readInSection = keys.filter((k) => readVerses.has(k)).length;
              const collapsed = collapsedSections.has(si);
              const selected = selectedSection === si;
              return (
                <section
                  key={si}
                  className={`rounded-2xl transition-colors duration-300 ${selected ? "bg-stone-200/60 ring-1 ring-stone-300" : ""}`}
                >
                  <div className="flex items-start gap-1 px-2 pt-2 pb-1">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapsed(si)}
                      aria-expanded={!collapsed}
                      title={collapsed ? "פתח פרשייה" : "כווץ פרשייה"}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-90" : ""}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedSection(selected ? null : si)}
                        aria-pressed={selected}
                        title={selected ? "בטל סימון פרשייה" : "סמן פרשייה, כדי לראות את גבולותיה"}
                        className={`text-right text-xs transition-colors ${selected ? "text-stone-700 font-medium" : "text-stone-400 hover:text-stone-600"}`}
                      >
                        פרשייה ״{s.title}״ · {refLabel(s.start)}–{refLabel(s.end)} ({verseCountLabel(keys.length)}
                        {session && readInSection > 0 && !done && ` · נקראו ${readInSection}`})
                        {done && <span className="mr-1.5 text-green-600">✓</span>}
                      </button>
                      {!collapsed && s.leitwords && (
                        <LeitwordChips
                          leitwords={s.leitwords}
                          scope={String(si)}
                          unitNoun="בפרשייה"
                          activeKey={activeLeitword}
                          onToggle={setActiveLeitword}
                          small
                        />
                      )}
                    </div>
                  </div>

                  {collapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapsed(si)}
                      className="w-full text-right px-11 pb-2 text-xs text-stone-400 hover:text-amber-700"
                    >
                      {keys.length === 1 ? "פסוק אחד מכווץ" : `${keys.length} פסוקים מכווצים`} — לחץ לפתיחה
                    </button>
                  ) : (
                    <div className="space-y-1 px-1 pb-1">{sectionVerses.map((v) => renderVerse(v))}</div>
                  )}

                  {s.type && <SectionBreak type={s.type} done={done} />}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {verses.map((v) => renderVerse(v))}
            {unitMode && sections[0]?.type && (
              <SectionBreak type={sections[0].type} done={passageComplete} />
            )}
          </div>
        )}

        {!loading && verses.length > 0 && (hasPrev || hasNext) && (
          <div className="flex justify-between items-center mt-6">
            <div>
              {hasPrev && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="text-sm text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-4 py-2 rounded-lg transition-colors"
                >
                  → ל{unitName} {unitName === "פרק" ? "הקודם" : "הקודמת"}
                </button>
              )}
            </div>
            <div>
              {hasNext && (
                <button
                  type="button"
                  onClick={goNext}
                  className="text-sm text-amber-700 hover:text-amber-900 border border-amber-300 hover:bg-amber-50 px-4 py-2 rounded-lg transition-colors"
                >
                  ל{unitName} הבא{unitName === "פרק" ? "" : "ה"} ←
                </button>
              )}
            </div>
          </div>
        )}

        {session && verses.length > 0 && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-stone-200">
            <button
              onClick={markPassageComplete}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              סיימתי את ה{unitName}
            </button>
            <button
              onClick={clearPassage}
              className="border border-stone-300 hover:bg-stone-100 text-stone-600 font-medium px-5 py-3 rounded-xl transition-colors"
            >
              נקה
            </button>
          </div>
        )}

        {!session && verses.length > 0 && (
          <p className="text-center text-stone-400 text-sm mt-8">
            <a href="/login" className="text-amber-600 hover:underline">התחבר</a> כדי לסמן פסוקים שנקראו
          </p>
        )}
      </div>
    </div>
  );
}
