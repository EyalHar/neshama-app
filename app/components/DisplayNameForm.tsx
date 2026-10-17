"use client";

import { useState } from "react";

// Asked once, before the first share or comment: the name everyone will see on it
export default function DisplayNameForm({
  suggestedName,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  suggestedName: string;
  submitLabel: string;
  onSubmit: (displayName: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(suggestedName);
  const valid = name.trim().length >= 2;

  return (
    <div onClick={(e) => e.stopPropagation()} className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
      <p className="text-sm text-stone-700 font-medium">איך יופיע שמך בשיתופים?</p>
      <p className="text-xs text-stone-500">השם הזה יוצג לכל המשתמשים ליד מה שתשתף ותגיב. אפשר לבחור כל שם, לא חייב את השם המלא.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && valid) onSubmit(name.trim()); }}
        maxLength={40}
        autoFocus
        className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:border-amber-400"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSubmit(name.trim())}
          disabled={!valid}
          className="text-xs font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100">
          ביטול
        </button>
      </div>
    </div>
  );
}
