// Procedural sound effects, synthesised once into out/sfx/*.wav.
// Everything is built from sine waves + seeded noise so the project never
// needs network access or third-party audio samples.
const fs = require("fs");
const path = require("path");

const SR = 44100;

const OUT = path.join(__dirname, "..", "out", "sfx");

// --- tiny helpers -----------------------------------------------------------

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const fade = (t, len, ms = 6) => {
  const f = ms / 1000;
  return Math.min(1, t / f, Math.max(0, (len - t) / f));
};

const makeBuf = (seconds) => new Float32Array(Math.ceil(seconds * SR));

const env = (t, attack, decay) =>
  t < attack ? t / attack : Math.exp(-(t - attack) / decay);

/** xorshift noise, deterministic. */
const makeNoise = (seed) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return (s / 0xffffffff) * 2 - 1;
  };
};

const add = (buf, t, v) => {
  const i = Math.round(t * SR);
  if (i >= 0 && i < buf.length) buf[i] += v;
};

/** Bell-ish tone with a few inharmonic partials. */
const bell = (buf, { start, freq, dur, gain = 1, partials = [1, 2.01, 3.03, 4.7] }) => {
  const parts = partials.map((p, i) => ({
    f: freq * p,
    a: gain / (i + 1) ** 1.7,
    decay: dur / (1 + i * 0.45),
  }));
  const n = Math.floor(dur * SR);
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    let v = 0;
    for (const p of parts) v += p.a * Math.sin(2 * Math.PI * p.f * t) * Math.exp(-t / p.decay);
    add(buf, start + t, v * 0.55);
  }
};

/** Exponential glide from f0 to f1. */
const glide = (buf, { start, f0, f1, dur, gain = 1, shape = 1 }) => {
  const n = Math.floor(dur * SR);
  let phase = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const r = Math.pow(t / dur, shape);
    const f = f0 + (f1 - f0) * r;
    phase += (2 * Math.PI * f) / SR;
    const a = gain * env(t, 0.01, dur * 0.5) * 0.5;
    add(buf, start + t, Math.sin(phase) * a);
  }
};

/** Band-limited noise burst: a simple one-pole-highpass / lowpass pair. */
const noise = (buf, { start, dur, gain = 1, low = 400, high = 9000, sweep = 1, seed = 7, shape = 2 }) => {
  const rnd = makeNoise(seed);
  const n = Math.floor(dur * SR);
  let lp = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const r = Math.pow(t / dur, 1);
    const cutoff = high + (low - high) * r * sweep;
    const x = rnd();
    const a = clamp((2 * Math.PI * cutoff) / SR, 0.001, 1);
    lp += a * (x - lp);
    const hp = x - lp;
    const e = env(t, 0.002, dur * shape);
    add(buf, start + t, hp * e * gain * 0.5);
  }
};

const writeWav = (name, buf) => {
  const len = buf.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + len * 2, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(len * 2, 40);
  const data = Buffer.alloc(len * 2);
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const norm = peak > 0 ? 0.86 / peak : 1;
  for (let i = 0; i < len; i++) {
    const v = clamp(buf[i] * norm, -1, 1);
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([header, data]));
  console.log(`${name}.wav  ${(len / SR).toFixed(2)}s`);
};

// --- the sound library -----------------------------------------------------

const sfx = {
  /** soft "tick" for typing */
  key() {
    const b = makeBuf(0.09);
    noise(b, { start: 0, dur: 0.05, gain: 0.5, low: 2400, high: 8000, seed: 11 });
    glide(b, { start: 0, f0: 1900, f1: 1100, dur: 0.06, gain: 0.5 });
    return b;
  },

  /** message sent: short rising "pop" */
  send() {
    const b = makeBuf(0.42);
    glide(b, { start: 0, f0: 420, f1: 980, dur: 0.16, gain: 0.9, shape: 0.6 });
    bell(b, { start: 0.02, freq: 880, dur: 0.35, gain: 0.35, partials: [1, 2] });
    return b;
  },

  /** countdown tick on a soft woodblock */
  tick() {
    const b = makeBuf(0.15);
    bell(b, { start: 0, freq: 1320, dur: 0.09, gain: 0.8, partials: [1, 2.4] });
    noise(b, { start: 0, dur: 0.03, gain: 0.25, low: 3000, high: 9000, seed: 3 });
    return b;
  },

  /** token chip popping in: tiny bright pluck */
  pop() {
    const b = makeBuf(0.22);
    glide(b, { start: 0, f0: 700, f1: 1500, dur: 0.09, gain: 0.8, shape: 0.5 });
    bell(b, { start: 0, freq: 1760, dur: 0.16, gain: 0.3, partials: [1, 2] });
    return b;
  },

  /** scissors snip */
  snip() {
    const b = makeBuf(0.2);
    noise(b, { start: 0, dur: 0.04, gain: 0.9, low: 3500, high: 12000, seed: 21 });
    noise(b, { start: 0.07, dur: 0.05, gain: 0.7, low: 2800, high: 11000, seed: 22 });
    return b;
  },

  /** shimmer: rising chord for "numbers become meaning" */
  shimmer() {
    const b = makeBuf(1.2);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      bell(b, { start: i * 0.06, freq: f, dur: 1.0, gain: 0.24, partials: [1, 2.01, 3] });
    });
    noise(b, { start: 0, dur: 0.7, gain: 0.12, low: 4000, high: 12000, seed: 31, shape: 3 });
    return b;
  },

  /** deeper, rolling wave for the transformer stack */
  whoosh() {
    const b = makeBuf(0.9);
    noise(b, { start: 0, dur: 0.8, gain: 0.55, low: 300, high: 6000, seed: 41, shape: 3 });
    glide(b, { start: 0.05, f0: 180, f1: 90, dur: 0.7, gain: 0.35 });
    return b;
  },

  /** soft upward air for something being lifted/carried up */
  whooshUp() {
    const b = makeBuf(0.7);
    // noise whose band creeps up instead of down: sweep < 0 lifts the low edge
    noise(b, { start: 0, dur: 0.55, gain: 0.42, low: 900, high: 1600, sweep: -6, seed: 67, shape: 2.2 });
    glide(b, { start: 0.02, f0: 420, f1: 1150, dur: 0.5, gain: 0.28, shape: 0.7 });
    bell(b, { start: 0.34, freq: 1318.5, dur: 0.3, gain: 0.1, partials: [1, 2.01] });
    return b;
  },

  /** quick lateral swish for chips flying across the frame */
  swish() {
    const b = makeBuf(0.34);
    noise(b, { start: 0, dur: 0.16, gain: 0.5, low: 1500, high: 5000, sweep: -4, seed: 71, shape: 1.8 });
    noise(b, { start: 0.13, dur: 0.16, gain: 0.34, low: 2600, high: 8500, seed: 72, shape: 2.4 });
    glide(b, { start: 0.06, f0: 900, f1: 1500, dur: 0.2, gain: 0.1 });
    return b;
  },

  /** gentle bubble for the little robot: two soft rising blips */
  bubble() {
    const b = makeBuf(0.38);
    glide(b, { start: 0.02, f0: 320, f1: 720, dur: 0.1, gain: 0.4, shape: 1.4 });
    glide(b, { start: 0.14, f0: 460, f1: 980, dur: 0.11, gain: 0.26, shape: 1.4 });
    noise(b, { start: 0.02, dur: 0.05, gain: 0.05, low: 1200, high: 3000, seed: 73 });
    return b;
  },

  /** very soft raiser that swells into the final reveal and cuts cleanly */
  riser() {
    const dur = 1.8;
    const b = makeBuf(dur);
    const rnd = makeNoise(83);
    let lp = 0;
    for (let k = 0; k < b.length; k++) {
      const t = k / SR;
      const u = t / dur;
      // brightening filtered noise, level swells then stops dead at the reveal
      const cutoff = 500 + 7500 * u * u;
      const a = clamp((2 * Math.PI * cutoff) / SR, 0.001, 1);
      lp += a * (rnd() - lp);
      add(b, t, (rnd() - lp) * 0.16 * u ** 1.5);
      // a quiet octave stack chasing the riser
      const f = 261.63 * 2 ** (u * 1.5);
      add(b, t, Math.sin(2 * Math.PI * f * t) * 0.05 * u ** 2);
      add(b, t, Math.sin(2 * Math.PI * f * 1.5 * t) * 0.03 * u ** 2);
    }
    // hard-ish tail: 8 ms fade so it never clicks when it lands
    const tail = Math.floor(0.008 * SR);
    for (let k = 0; k < tail; k++) b[b.length - 1 - k] *= k / tail;
    return b;
  },

  /** tiny wooden "tap" for a gate lamp lighting up */
  tap() {
    const b = makeBuf(0.12);
    bell(b, { start: 0, freq: 2350, dur: 0.045, gain: 0.5, partials: [1, 2.6] });
    bell(b, { start: 0.012, freq: 880, dur: 0.06, gain: 0.22, partials: [1, 2] });
    noise(b, { start: 0, dur: 0.018, gain: 0.22, low: 4200, high: 11000, seed: 59 });
    return b;
  },

  /** thinking sparkle for reasoning */
  sparkle() {
    const b = makeBuf(0.8);
    [1568, 2093, 2637].forEach((f, i) =>
      bell(b, { start: 0.05 * i, freq: f, dur: 0.45, gain: 0.22, partials: [1, 2.01] }),
    );
    return b;
  },

  /** calm "thinking" bed, looped under the reasoning scene */
  thinkLoop() {
    const b = makeBuf(4);
    const rnd = makeNoise(99);
    [220, 277.18, 329.63].forEach((f, i) => {
      for (let k = 0; k < b.length; k++) {
        const t = k / SR;
        const lfo = 0.55 + 0.45 * Math.sin(2 * Math.PI * (0.25 + i * 0.07) * t);
        b[k] += Math.sin(2 * Math.PI * f * t) * 0.09 * lfo;
      }
    });
    for (let k = 0; k < b.length; k++) b[k] += rnd() * 0.006;
    return b;
  },

  /** score bar answer reveals: soft marimba notes, rising */
  chime() {
    const b = makeBuf(1.1);
    [659.25, 830.61, 987.77].forEach((f, i) =>
      bell(b, { start: 0.12 * i, freq: f, dur: 0.7, gain: 0.26, partials: [1, 2.01, 3.01] }),
    );
    return b;
  },

  /** sample picked */
  select() {
    const b = makeBuf(0.35);
    bell(b, { start: 0, freq: 987.77, dur: 0.3, gain: 0.5, partials: [1, 2.01] });
    bell(b, { start: 0.06, freq: 1318.5, dur: 0.3, gain: 0.4, partials: [1, 2.01] });
    return b;
  },

  /** checkmark ding */
  ding() {
    const b = makeBuf(0.8);
    bell(b, { start: 0, freq: 1318.5, dur: 0.6, gain: 0.6, partials: [1, 2.01, 3.01, 4.2] });
    return b;
  },

  /** rejected draft: low buzz */
  buzz() {
    const b = makeBuf(0.35);
    for (let k = 0; k < b.length; k++) {
      const t = k / SR;
      const v = Math.sign(Math.sin(2 * Math.PI * 120 * t)) * 0.18 + Math.sin(2 * Math.PI * 240 * t) * 0.1;
      b[k] += v * env(t, 0.005, 0.18) * 0.5;
    }
    return b;
  },

  /** typewriter click for streaming text */
  type() {
    const b = makeBuf(0.07);
    noise(b, { start: 0, dur: 0.035, gain: 0.55, low: 3200, high: 10000, seed: 5 });
    return b;
  },

  /** final chord for the outro */
  finale() {
    const b = makeBuf(2.4);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      bell(b, { start: 0.05 * i, freq: f, dur: 2.0, gain: 0.18, partials: [1, 2.01, 3] }),
    );
    return b;
  },
};

// --- gentle background music loop (24 s) -----------------------------------

function music() {
  const b = makeBuf(24);
  const bpm = 84;
  const beat = 60 / bpm;
  // chord progression: Fmaj7 - Cmaj7 - Am7 - G6, two bars each
  const chords = [
    [174.61, 261.63, 329.63, 440.0],
    [130.81, 196.0, 261.63, 329.63],
    [220.0, 261.63, 329.63, 392.0],
    [196.0, 246.94, 293.66, 392.0],
  ];
  for (let bar = 0; bar < 8; bar++) {
    const chord = chords[Math.floor(bar / 2) % 4] ?? chords[0];
    const t0 = bar * 4 * beat;
    // pad
    for (const f of chord) {
      for (let k = 0; k < 4 * beat * SR; k++) {
        const t = k / SR;
        const swell = Math.sin((Math.PI * t) / (4 * beat));
        const v = Math.sin(2 * Math.PI * f * t) * 0.028 + Math.sin(2 * Math.PI * f * 2.003 * t) * 0.008;
        add(b, t0 + t, v * swell);
      }
    }
    // arpeggio: soft sine plucks on eighth notes
    const notes = [chord[3], chord[2], chord[1], chord[2], chord[3] * 2, chord[2], chord[1], chord[2]];
    notes.forEach((f, i) => {
      const s = t0 + i * beat * 0.5;
      for (let k = 0; k < beat * SR; k++) {
        const t = k / SR;
        const e = Math.exp(-t / 0.22) * Math.min(1, t / 0.01);
        add(b, s + t, Math.sin(2 * Math.PI * f * 2 * t) * 0.05 * e);
      }
    });
    // heartbeat-ish low kick for pulse
    for (let i = 0; i < 2; i++) {
      const s = t0 + i * 2 * beat;
      glide(b, { start: s, f0: 90, f1: 45, dur: 0.18, gain: 0.4 });
    }
  }
  // crossfade the loop seam so `loop` is click-free
  const seam = Math.floor(0.5 * SR);
  for (let k = 0; k < seam; k++) {
    const w = k / seam;
    b[b.length - seam + k] = b[b.length - seam + k] * (1 - w) + b[k] * w;
  }
  return b;
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(__dirname, "..", "public", "sfx"), { recursive: true });

for (const [name, fn] of Object.entries(sfx)) {
  if (name === "thinkLoop") continue;
  writeWav(name, fn());
}
writeWav("think-loop", sfx.thinkLoop());
writeWav("music-loop", music());

// public/ is what the browser loads; keep it in sync automatically.
fs.cpSync(OUT, path.join(__dirname, "..", "public", "sfx"), { recursive: true });
