"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import styles from "./ScrollIntro.module.css";

// The home page hero: a Torah scroll opens, its text is written, and golden copies of some of its
// letters rise from them and kindle the title "שַׁלְהֶבֶתְ יָהּ" (letters becoming a flame). The
// text itself stays whole. Plays once per browser session; on later visits, after a click on it,
// or with reduced motion it shows the open scroll at once. Pure CSS animation, driven by one
// class on the root; JS only measures where the rising letters start.

type Mode = "pending" | "play" | "done";

const SEEN_KEY = "home-intro-seen";

// Decided once per page load and kept in a module variable: the first mount plays, and after
// it unmounts, returning to the home page in the same session shows the end state
let mode: Mode | null = null;

function readMode(): Mode {
  if (mode) return mode;
  try {
    mode = sessionStorage.getItem(SEEN_KEY) ? "done" : "play";
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    mode = "play";
  }
  return mode;
}

const noSubscribe = () => () => {};

// Genesis 1:1–5 as in a Torah scroll: no nikud, with the large ב of בראשית
const COLUMNS = [
  "ראשית ברא אלהים את השמים ואת הארץ והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים ויאמר אלהים יהי אור ויהי אור",
  "וירא אלהים את האור כי טוב ויבדל אלהים בין האור ובין החשך ויקרא אלהים לאור יום ולחשך קרא לילה ויהי ערב ויהי בקר יום אחד",
];
const RISE_EVERY = 9; // every 9th letter of the text lifts a copy (from the 5th)
const RISE_OFFSET = 4;
const RISE_PER_COLUMN = 9;
const RISE_START = 2.1; // seconds into the intro (the first column is written by then)
const RISE_STEP = 0.09;
const AMBIENT_COUNT = 5;

type Rising = { letter: string; x: number; y: number };

// The column text with every RISE_EVERY-th letter in a span the overlay can measure
function columnText(text: string, column: number): ReactNode[] {
  const out: ReactNode[] = [];
  let run = "";
  let letters = 0;
  let marked = 0;
  for (const c of text) {
    if (c !== " " && letters++ % RISE_EVERY === RISE_OFFSET && marked < RISE_PER_COLUMN) {
      if (run) out.push(run);
      run = "";
      out.push(
        <span key={out.length} data-rise="">
          {c}
        </span>
      );
      marked++;
    } else {
      run += c;
    }
  }
  if (run) out.push(run);
  return column === 0 ? [<span key="bet" className={styles.bigBet}>ב</span>, ...out] : out;
}

// Deterministic per-letter variation, so the flight paths don't line up
const drift = (i: number) => ((i * 37) % 61) - 30;
const tilt = (i: number) => ((i * 53) % 29) - 14;

export default function ScrollIntro({ title, subtitle, fontClassName }: { title: string; subtitle: string; fontClassName: string }) {
  const stored = useSyncExternalStore(noSubscribe, readMode, (): Mode => "pending");
  const [skipped, setSkipped] = useState(false);
  const current: Mode = skipped && stored === "play" ? "done" : stored;
  const stageRef = useRef<HTMLDivElement>(null);
  // `lag`: seconds between the intro starting and the letters being placed, taken off their delays
  const [{ rising, lag }, setRising] = useState<{ rising: Rising[]; lag: number }>({ rising: [], lag: 0 });

  useEffect(() => {
    const mountedAt = Date.now();
    return () => {
      // StrictMode's immediate mount-unmount-mount in dev is not a visit
      if (Date.now() - mountedAt > 300) mode = "done";
    };
  }, []);

  // Where each marked letter sits, relative to the stage (after the scroll font has loaded)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    const startedAt = performance.now();
    let lag: number | null = null;
    const measure = () => {
      if (cancelled) return;
      const base = stage.getBoundingClientRect();
      const list: Rising[] = [];
      stage.querySelectorAll<HTMLElement>("[data-rise]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width) list.push({ letter: el.textContent ?? "", x: r.left - base.left, y: r.top - base.top });
      });
      lag ??= (performance.now() - startedAt) / 1000;
      setRising({ rising: list, lag });
    };
    document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, []);

  const ambient = rising.filter((_, i) => i % 3 === 1).slice(0, AMBIENT_COUNT);

  return (
    <div className={`${styles.root} ${styles[current]}`}>
      <div className={styles.titleWrap}>
        <h1 className="flame-title text-5xl font-bold leading-tight">{title}</h1>
      </div>

      <div ref={stageRef} className={styles.stage} onClick={() => setSkipped(true)} aria-hidden="true">
        <div className={styles.light} />
        <div className={`${styles.parchment} ${fontClassName}`}>
          <div className={styles.columns}>
            {COLUMNS.map((text, i) => (
              <p key={i} className={`${styles.column} ${i > 0 ? styles.second : ""}`}>
                {columnText(text, i)}
              </p>
            ))}
          </div>
        </div>
        <Roller side="right" />
        <Roller side="left" />

        <div className={`${styles.letters} ${fontClassName}`}>
          {rising.map((r, i) => (
            <span
              key={i}
              className={styles.rising}
              style={
                {
                  left: r.x,
                  top: r.y,
                  "--dx": `${drift(i)}px`,
                  "--rot": `${tilt(i)}deg`,
                  "--delay": `${RISE_START + i * RISE_STEP - lag}s`,
                } as CSSProperties
              }
            >
              {r.letter}
            </span>
          ))}
          {ambient.map((r, i) => (
            <span
              key={`a${i}`}
              className={styles.ambient}
              style={
                {
                  left: r.x,
                  top: r.y,
                  "--dx": `${drift(i + 7)}px`,
                  "--dur": `${9 + (i % 3) * 1.5}s`,
                  "--delay": `${i * 2.3 - (current === "play" ? lag : 0)}s`,
                } as CSSProperties
              }
            >
              {r.letter}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.subtitleWrap}>
        <p className="text-stone-500 text-xl leading-relaxed max-w-xl mx-auto">{subtitle}</p>
        <div className="mt-6 w-16 h-1 bg-amber-400 mx-auto rounded-full" />
      </div>
    </div>
  );
}

function Roller({ side }: { side: "left" | "right" }) {
  return (
    <div className={`${styles.roller} ${side === "left" ? styles.rollerLeft : styles.rollerRight}`}>
      <span className={styles.knob} />
      <span className={styles.handle} />
      <span className={styles.disc} />
      <span className={styles.cylinder} />
      <span className={styles.disc} />
      <span className={styles.handle} />
      <span className={styles.knob} />
    </div>
  );
}
