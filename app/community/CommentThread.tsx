"use client";

import { useEffect, useState } from "react";
import type { CommentItem } from "@/lib/shares";
import DisplayNameForm from "@/app/components/DisplayNameForm";
import { Avatar, formatWhen } from "./format";

// Replies nest without limit, but indentation stops here; deeper replies stay at this
// level with a "בתגובה ל…" label so narrow screens remain readable.
const MAX_INDENT = 4;
// A comment with more replies than this shows the first few and a "show more" button
const VISIBLE_REPLIES = 3;

type Tree = Map<string | null, CommentItem[]>;

async function requestComments(shareId: string): Promise<CommentItem[]> {
  const res = await fetch(`/api/shares/${shareId}/comments`);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()).comments;
}

function ReplyForm({
  placeholder,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    if (await onSubmit(text.trim())) setText("");
    setBusy(false);
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
          else if (e.key === "Escape" && onCancel) onCancel();
        }}
        placeholder={placeholder}
        maxLength={2000}
        rows={2}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !text.trim()}
          className="text-xs font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          פרסם
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100">
            ביטול
          </button>
        )}
      </div>
    </div>
  );
}

function CommentNode({
  comment,
  tree,
  depth,
  parentAuthor,
  replyingTo,
  setReplyingTo,
  onReply,
  onDelete,
}: {
  comment: CommentItem;
  tree: Tree;
  depth: number;
  parentAuthor: string | null;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  onReply: (text: string, parentId: string) => Promise<boolean>;
  onDelete: (c: CommentItem) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const replies = tree.get(comment.id) ?? [];
  const shown = showAll ? replies : replies.slice(0, VISIBLE_REPLIES);
  const indentChildren = depth < MAX_INDENT;

  return (
    <div>
      <div className="flex gap-2 py-1.5">
        {comment.author ? <Avatar id={comment.author.id} name={comment.author.name} size={26} /> : <span className="w-[26px] shrink-0" />}
        <div className="flex-1 min-w-0">
          {comment.deleted ? (
            <p className="text-sm text-stone-400 italic">התגובה נמחקה</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium text-stone-700">{comment.author?.name}</span>
                <span className="text-[11px] text-stone-400">{formatWhen(comment.createdAt)}</span>
              </div>
              {depth > MAX_INDENT && parentAuthor && (
                <p className="text-[11px] text-stone-400">בתגובה ל־{parentAuthor}</p>
              )}
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
              <div className="flex gap-3 mt-0.5">
                <button
                  type="button"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-xs text-stone-500 hover:text-amber-700"
                >
                  הגב
                </button>
                {comment.canDelete && (
                  <button type="button" onClick={() => onDelete(comment)} className="text-xs text-stone-400 hover:text-red-600">
                    מחק
                  </button>
                )}
              </div>
            </>
          )}
          {replyingTo === comment.id && (
            <div className="mt-2">
              <ReplyForm
                placeholder={`תשובה ל־${comment.author?.name ?? ""}...`}
                autoFocus
                onSubmit={(text) => onReply(text, comment.id)}
                onCancel={() => setReplyingTo(null)}
              />
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className={indentChildren ? "ms-3 ps-3 border-s-2 border-stone-200" : ""}>
          {shown.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              tree={tree}
              depth={depth + 1}
              parentAuthor={comment.author?.name ?? null}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
          {replies.length > shown.length && (
            <button type="button" onClick={() => setShowAll(true)} className="text-xs text-amber-700 hover:underline my-1">
              הצג עוד {replies.length - shown.length} תגובות
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// All comments on one share, as a reply tree. Loads when mounted (i.e. when the card's
// comments are opened) and reports the visible count back to the card.
export default function CommentThread({ shareId, onCountChange }: { shareId: string; onCountChange: (n: number) => void }) {
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [error, setError] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [namePrompt, setNamePrompt] = useState<{ suggestedName: string; retry: (name: string) => void } | null>(null);

  useEffect(() => {
    requestComments(shareId).then(setComments, () => setError(true));
  }, [shareId]);

  function update(next: CommentItem[]) {
    setComments(next);
    onCountChange(next.filter((c) => !c.deleted).length);
  }

  // Posting needs a display name; on 409 ask for one, save it, then retry the same post
  async function post(text: string, parentId: string | null): Promise<boolean> {
    const res = await fetch(`/api/shares/${shareId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, parentId }),
    });
    const data = await res.json();
    if (res.status === 409 && data.needDisplayName) {
      setNamePrompt({
        suggestedName: data.suggestedName,
        retry: async (displayName) => {
          const saved = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName }),
          });
          if (!saved.ok) return;
          setNamePrompt(null);
          post(text, parentId);
        },
      });
      return false;
    }
    if (!res.ok) return false;
    update([...(comments ?? []), data.comment]);
    setReplyingTo(null);
    return true;
  }

  async function remove(c: CommentItem) {
    if (!window.confirm("למחוק את התגובה?")) return;
    const res = await fetch(`/api/comments/${c.id}`, { method: "DELETE" });
    if (!res.ok) return;
    const { removed, softDeleted } = await res.json();
    update(
      (comments ?? [])
        .filter((x) => !removed.includes(x.id))
        .map((x) => (x.id === softDeleted ? { ...x, deleted: true, text: "", author: null, canDelete: false } : x))
    );
  }

  if (error) return <p className="text-sm text-red-500 py-2">טעינת התגובות נכשלה</p>;
  if (!comments) return <p className="text-sm text-stone-400 py-2">טוען תגובות...</p>;

  const tree: Tree = new Map();
  for (const c of comments) tree.set(c.parentId, [...(tree.get(c.parentId) ?? []), c]);

  return (
    <div className="space-y-1">
      {(tree.get(null) ?? []).map((c) => (
        <CommentNode
          key={c.id}
          comment={c}
          tree={tree}
          depth={1}
          parentAuthor={null}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          onReply={post}
          onDelete={remove}
        />
      ))}
      {namePrompt ? (
        <DisplayNameForm
          suggestedName={namePrompt.suggestedName}
          submitLabel="שמור ופרסם"
          onSubmit={namePrompt.retry}
          onCancel={() => setNamePrompt(null)}
        />
      ) : (
        <div className="pt-2">
          <ReplyForm placeholder="כתוב תגובה..." onSubmit={(text) => post(text, null)} />
        </div>
      )}
    </div>
  );
}
