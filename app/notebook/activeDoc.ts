"use client";

import { useSyncExternalStore } from "react";
import { ACTIVE_DOC_KEY, NOTEBOOK_EVENT } from "@/lib/notebook";

export type ActiveDoc = { id: string; title: string };

function subscribe(onChange: () => void) {
  window.addEventListener(NOTEBOOK_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(NOTEBOOK_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Cached by the raw string so useSyncExternalStore gets a stable snapshot
let lastRaw: string | null = null;
let lastValue: ActiveDoc | null = null;
function read(): ActiveDoc | null {
  const raw = localStorage.getItem(ACTIVE_DOC_KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    try { lastValue = raw ? JSON.parse(raw) : null; } catch { lastValue = null; }
  }
  return lastValue;
}

// The page the collector adds to ("הדף הפעיל"), shared by every component through localStorage
export function useActiveDoc(): ActiveDoc | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function setActiveDoc(doc: ActiveDoc | null) {
  if (doc) localStorage.setItem(ACTIVE_DOC_KEY, JSON.stringify(doc));
  else localStorage.removeItem(ACTIVE_DOC_KEY);
  window.dispatchEvent(new Event(NOTEBOOK_EVENT));
}
