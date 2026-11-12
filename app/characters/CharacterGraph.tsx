"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TANAKH_BOOKS, toHebrewNumeral } from "@/lib/tanakh";
import type { ChapterRef, CharacterEdge, CharacterNetwork, CharacterNode } from "@/lib/characters";

const W = 760;
const H = 540;
const MARGIN = 40;
const NIKUD = /[֑-ׇ]/g;

type Point = { x: number; y: number };

// Force-directed layout (Fruchterman–Reingold), deterministic: starts from a circle in order of
// prominence, so the same book always lays out the same way
function layout(nodes: CharacterNode[], edges: CharacterEdge[]): Map<string, Point> {
  const n = nodes.length;
  const pos = nodes.map((_, i) => ({
    x: W / 2 + (W / 3) * Math.cos((2 * Math.PI * i) / n),
    y: H / 2 + (H / 3) * Math.sin((2 * Math.PI * i) / n),
  }));
  const index = new Map(nodes.map((nd, i) => [nd.id, i]));
  const maxShared = Math.max(1, ...edges.map((e) => e.chapters.length));
  const k = Math.sqrt((W * H) / Math.max(1, n)) * 0.6;
  const ITER = 400;
  for (let it = 0; it < ITER; it++) {
    const t = (W / 8) * (1 - it / ITER) + 0.5;
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const f = (k * k) / d;
        disp[i].x += (dx / d) * f; disp[i].y += (dy / d) * f;
        disp[j].x -= (dx / d) * f; disp[j].y -= (dy / d) * f;
      }
    }
    for (const e of edges) {
      const i = index.get(e.a)!, j = index.get(e.b)!;
      const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const f = ((d * d) / k) * (0.2 + Math.log1p(e.chapters.length) / Math.log1p(maxShared));
      disp[i].x -= (dx / d) * f; disp[i].y -= (dy / d) * f;
      disp[j].x += (dx / d) * f; disp[j].y += (dy / d) * f;
    }
    for (let i = 0; i < n; i++) {
      disp[i].x += (W / 2 - pos[i].x) * 0.05;
      disp[i].y += (H / 2 - pos[i].y) * 0.05;
      const d = Math.max(1, Math.hypot(disp[i].x, disp[i].y));
      pos[i].x = Math.min(W - MARGIN, Math.max(MARGIN, pos[i].x + (disp[i].x / d) * Math.min(d, t)));
      pos[i].y = Math.min(H - MARGIN, Math.max(MARGIN, pos[i].y + (disp[i].y / d) * Math.min(d, t)));
    }
  }
  return new Map(nodes.map((nd, i) => [nd.id, pos[i]]));
}

function ChapterLinks({ book, chapters }: { book: string; chapters: ChapterRef[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {chapters.map(({ chapter, verse }) => (
        <Link
          key={chapter}
          href={`/tanakh?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`}
          title={`פרק ${toHebrewNumeral(chapter)}, פסוק ${toHebrewNumeral(verse)}`}
          className="text-xs bg-white border border-stone-200 hover:border-amber-400 rounded-md px-1.5 py-0.5 text-amber-800"
        >
          {toHebrewNumeral(chapter)}
        </Link>
      ))}
    </div>
  );
}

export default function CharacterGraph() {
  const [book, setBook] = useState("Genesis");
  const [loaded, setLoaded] = useState<{ book: string; data: CharacterNetwork } | null>(null);
  const [error, setError] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/characters?book=${encodeURIComponent(book)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: CharacterNetwork) => setLoaded({ book, data }))
      .catch(() => setError(true));
  }, [book]);

  function chooseBook(b: string) {
    setBook(b);
    setHidden(new Set());
    setSelected(null);
    setPartner(null);
    setError(false);
  }

  const data = loaded?.book === book ? loaded.data : null;
  const nodes = useMemo(() => data?.nodes.filter((nd) => !hidden.has(nd.id)) ?? [], [data, hidden]);
  const edges = useMemo(() => data?.edges.filter((e) => !hidden.has(e.a) && !hidden.has(e.b)) ?? [], [data, hidden]);
  const pos = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const maxCount = Math.max(1, ...nodes.map((nd) => nd.count));
  const maxShared = Math.max(1, ...edges.map((e) => e.chapters.length));

  const sel = nodes.find((nd) => nd.id === selected) ?? null;
  const links = sel
    ? edges
        .filter((e) => e.a === sel.id || e.b === sel.id)
        .map((e) => ({ other: nodes.find((nd) => nd.id === (e.a === sel.id ? e.b : e.a))!, chapters: e.chapters }))
        .sort((x, y) => y.chapters.length - x.chapters.length)
    : [];
  const neighbors = new Set(links.map((l) => l.other.id));
  const partnerLink = links.find((l) => l.other.id === partner);

  function hide(id: string) {
    setHidden(new Set([...hidden, id]));
    setSelected(null);
    setPartner(null);
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <label className="text-sm text-stone-600">
          ספר:{" "}
          <select
            value={book}
            onChange={(e) => chooseBook(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800"
          >
            {TANAKH_BOOKS.map((b) => <option key={b.id} value={b.id}>{b.he}</option>)}
          </select>
        </label>
        {hidden.size > 0 && (
          <button type="button" onClick={() => setHidden(new Set())} className="text-sm text-amber-700 hover:underline">
            הצג את כל הדמויות ({hidden.size} מוסתרות)
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">טעינת הדמויות נכשלה</p>}
      {!data && !error && <p className="text-stone-400 text-sm py-10 text-center">טוען דמויות…</p>}
      {data && nodes.length === 0 && <p className="text-stone-500 text-sm py-10 text-center">לא נמצאו דמויות בספר הזה</p>}

      {data && nodes.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full lg:flex-1 bg-white border border-stone-200 rounded-2xl select-none" role="img" aria-label="רשת הדמויות">
            <g>
              {edges.map((e) => {
                const a = pos.get(e.a)!, b = pos.get(e.b)!;
                const active = sel && (e.a === sel.id || e.b === sel.id);
                const t = e.chapters.length / maxShared;
                return (
                  <line
                    key={`${e.a}-${e.b}`}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    className={active ? "stroke-amber-500" : "stroke-stone-400"}
                    strokeWidth={0.5 + t * 5}
                    strokeOpacity={sel ? (active ? 0.4 + t * 0.6 : 0.05) : 0.12 + t * 0.6}
                  />
                );
              })}
            </g>
            {nodes.map((nd) => {
              const p = pos.get(nd.id)!;
              const r = 7 + 18 * Math.sqrt(nd.count / maxCount);
              const isSel = nd.id === selected;
              const dim = sel && !isSel && !neighbors.has(nd.id);
              return (
                <g
                  key={nd.id}
                  onClick={() => { setSelected(isSel ? null : nd.id); setPartner(null); }}
                  className="cursor-pointer"
                  opacity={dim ? 0.25 : 1}
                >
                  <title>{`${nd.name} · ${nd.count} אזכורים`}</title>
                  <circle cx={p.x} cy={p.y} r={r} className={isSel ? "fill-amber-600 stroke-amber-800" : "fill-amber-100 stroke-amber-500 hover:fill-amber-200"} strokeWidth={1.5} />
                  <text x={p.x} y={p.y + r + 14} textAnchor="middle" className="text-[13px] font-semibold fill-stone-800 pointer-events-none" style={{ paintOrder: "stroke" }} stroke="white" strokeWidth={3}>
                    {nd.name.replace(NIKUD, "")}
                  </text>
                </g>
              );
            })}
          </svg>

          <aside className="w-full lg:w-80 shrink-0">
            {!sel && (
              <p className="text-sm text-stone-500 bg-white border border-stone-200 rounded-2xl p-4 leading-relaxed">
                גודל העיגול לפי מספר האזכורים בספר, ועובי הקו לפי מספר הפרקים שבהם שתי הדמויות מופיעות יחד. לחצו על דמות כדי לראות
                עם מי היא מופיעה ובאילו פרקים.
              </p>
            )}
            {sel && (
              <div className="bg-white border border-stone-200 rounded-2xl p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-2xl font-bold text-stone-800">{sel.name}</h2>
                  <button type="button" onClick={() => hide(sel.id)} className="text-xs text-stone-400 hover:text-red-600">
                    הסתר מהגרף
                  </button>
                </div>
                <p className="text-xs text-stone-500 text-left mt-1" dir="ltr">{sel.definition}</p>
                <p className="text-sm text-stone-600 mt-2">{sel.count} אזכורים ב-{sel.chapters.length} פרקים</p>
                <div className="mt-2"><ChapterLinks book={book} chapters={sel.chapters} /></div>

                <h3 className="text-sm font-semibold text-stone-700 mt-4 mb-2">מופיע/ה יחד עם</h3>
                <ul className="space-y-1">
                  {links.map((l) => (
                    <li key={l.other.id}>
                      <button
                        type="button"
                        onClick={() => setPartner(partner === l.other.id ? null : l.other.id)}
                        className={`w-full flex justify-between text-sm rounded-lg px-2 py-1 transition-colors ${
                          partner === l.other.id ? "bg-amber-100" : "hover:bg-stone-100"
                        }`}
                      >
                        <span className="font-medium text-stone-800">{l.other.name}</span>
                        <span className="text-stone-400 text-xs">{l.chapters.length} פרקים</span>
                      </button>
                      {partnerLink && partner === l.other.id && (
                        <div className="px-2 py-2"><ChapterLinks book={book} chapters={partnerLink.chapters} /></div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
