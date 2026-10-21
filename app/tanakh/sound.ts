function playNote(ctx: AudioContext, freq: number, start: number, dur: number, vol = 0.25) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

// "small" is the quiet single chime for a finished parashiya (or a chapter while reading by parasha)
export function playCelebrationSound(type: "small" | "chapter" | "book" | "section" | "tanakh") {
  try {
    const ctx = new AudioContext();
    if (type === "small") {
      playNote(ctx, 783.99, 0, 0.35, 0.12);
    } else if (type === "chapter") {
      playNote(ctx, 523.25, 0,    0.25);
      playNote(ctx, 659.25, 0.18, 0.3);
    } else if (type === "book") {
      playNote(ctx, 523.25, 0,    0.25);
      playNote(ctx, 659.25, 0.15, 0.25);
      playNote(ctx, 783.99, 0.3,  0.4);
    } else if (type === "section") {
      playNote(ctx, 523.25, 0,    0.2);
      playNote(ctx, 659.25, 0.15, 0.2);
      playNote(ctx, 783.99, 0.3,  0.2);
      playNote(ctx, 1046.5, 0.48, 0.55, 0.3);
    } else {
      playNote(ctx, 523.25, 0,    0.2);
      playNote(ctx, 659.25, 0.12, 0.2);
      playNote(ctx, 783.99, 0.24, 0.2);
      playNote(ctx, 1046.5, 0.36, 0.2);
      playNote(ctx, 1318.5, 0.5,  0.7, 0.3);
      playNote(ctx, 1046.5, 0.5,  0.7, 0.15);
      playNote(ctx, 783.99, 0.5,  0.7, 0.1);
    }
  } catch { /* AudioContext not available */ }
}
