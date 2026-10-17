"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeedItem } from "@/lib/shares";
import { toHebrewNumeral } from "@/lib/tanakh";
import HeartIcon from "@/app/components/HeartIcon";
import CommentThread from "./CommentThread";
import { Avatar, formatWhen } from "./format";

export default function ShareCard({ item, onRemoved }: { item: FeedItem; onRemoved: (id: string) => void }) {
  const [liked, setLiked] = useState(item.likedByMe);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);

  async function toggleLike() {
    setLiked(!liked);
    setLikeCount((n) => n + (liked ? -1 : 1));
    const res = await fetch(`/api/shares/${item.id}/like`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    }
  }

  async function remove() {
    const msg = item.mine
      ? "להפסיק לשתף? ההערה תוסר מדף השיתופים, יחד עם התגובות והלייקים. ההערה עצמה תישאר אצלך."
      : "למחוק את השיתוף? הוא יוסר לכל המשתמשים, יחד עם התגובות והלייקים.";
    if (!window.confirm(msg)) return;
    const res = await fetch(`/api/shares/${item.id}`, { method: "DELETE" });
    if (res.ok) onRemoved(item.id);
  }

  const ref = `${item.bookHe} ${toHebrewNumeral(item.chapter)}, ${toHebrewNumeral(item.verse)}`;

  return (
    <article className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <header className="flex items-center gap-3 mb-3">
        <Avatar id={item.author.id} name={item.author.name} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-800">{item.author.name}</p>
          <p className="text-xs text-stone-400">
            {formatWhen(item.createdAt)}
            {item.edited && " · נערך"}
          </p>
        </div>
        {item.canDelete && (
          <button type="button" onClick={remove} className="text-xs text-stone-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
            {item.mine ? "הפסק לשתף" : "מחק"}
          </button>
        )}
      </header>

      <Link
        href={`/tanakh?book=${encodeURIComponent(item.book)}&chapter=${item.chapter}&verse=${item.verse}`}
        className="block border-s-4 border-amber-300 bg-amber-50/60 rounded-e-lg px-4 py-2.5 mb-3 hover:bg-amber-50 transition-colors"
      >
        <p className="text-xs font-medium text-amber-700 mb-1">{ref}</p>
        <p className="text-stone-600 leading-relaxed">{item.verseText}</p>
      </Link>

      <p className="text-stone-800 leading-relaxed whitespace-pre-wrap break-words">{item.text}</p>

      <footer className="flex items-center gap-5 mt-4 pt-3 border-t border-stone-100">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-600 transition-colors"
        >
          <HeartIcon filled={liked} size={18} />
          {likeCount > 0 && <span>{likeCount}</span>}
          <span className="sr-only">לייק</span>
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen(!commentsOpen)}
          aria-expanded={commentsOpen}
          className="text-sm text-stone-500 hover:text-amber-700 transition-colors"
        >
          {commentCount === 0 ? "הגב" : commentCount === 1 ? "תגובה אחת" : `${commentCount} תגובות`}
        </button>
      </footer>

      {commentsOpen && (
        <div className="mt-3">
          <CommentThread shareId={item.id} onCountChange={setCommentCount} />
        </div>
      )}
    </article>
  );
}
