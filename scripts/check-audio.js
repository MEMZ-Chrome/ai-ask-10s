#!/usr/bin/env node
// Audits every generated effect in public/sfx: format, duration, peak, RMS,
// silence and clipping. Exits non-zero when any clip fails.
//
//   node scripts/check-audio.js            # table for public/sfx
//   node scripts/check-audio.js out/sfx    # any folder of .wav files
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const TARGET_SR = 44100;

const FULL_SCALE = 32767;

/** A clip is "clipped" when it holds a run of consecutive full-scale samples. */
const CLIP_RUN = 3;

/** Near-silent: peak below -60 dBFS. */
const SILENT_PEAK = 0.001;

/** Loops are allowed to be long; one-shots are not. */
const LOOP_NAMES = new Set(["music-loop", "think-loop"]);

const MAX_ONESHOT_SECONDS = 2.5;

/** Expected duration in seconds, used to catch a generator that changed shape. */
const EXPECTED = {
  key: 0.09,
  type: 0.07,
  tick: 0.15,
  send: 0.42,
  pop: 0.22,
  snip: 0.2,
  snipShort: 0.18,
  swish: 0.34,
  select: 0.35,
  buzz: 0.35,
  bubble: 0.38,
  tap: 0.12,
  whooshUp: 0.7,
  riser: 1.8,
  sparkle: 0.8,
  ding: 0.8,
  whoosh: 0.9,
  shimmer: 1.2,
  chime: 1.1,
  finale: 2.4,
  "think-loop": 4,
  "music-loop": 24,
};

const TOLERANCE = 0.03;

const db = (v) => (v <= 0 ? "-inf" : (20 * Math.log10(v)).toFixed(1));

/** Parse a RIFF/WAVE file into { fmt, samples } (samples normalised to -1..1). */
const readWav = (file) => {
  const buf = fs.readFileSync(file);

  const problems = [];

  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return { problems: ["not a RIFF/WAVE file"] };
  }

  const declaredRiff = buf.readUInt32LE(4);

  if (declaredRiff + 8 > buf.length) {
    problems.push(`RIFF size ${declaredRiff + 8} > file size ${buf.length}`);
  }

  let fmt = null;

  let data = null;

  let offset = 12;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);

    const size = buf.readUInt32LE(offset + 4);

    const body = offset + 8;

    const end = Math.min(buf.length, body + size);

    if (id === "fmt ") {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        byteRate: buf.readUInt32LE(body + 8),
        blockAlign: buf.readUInt16LE(body + 12),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      data = buf.subarray(body, end);
    }

    offset = body + size + (size % 2);
  }

  if (!fmt) return { problems: [...problems, "missing 'fmt ' chunk"] };

  if (!data) return { problems: [...problems, "missing 'data' chunk"] };

  if (fmt.format !== 1) problems.push(`format ${fmt.format} is not PCM`);

  if (fmt.channels !== 1) problems.push(`${String(fmt.channels)} channels, expected mono`);

  if (fmt.bits !== 16) problems.push(`${String(fmt.bits)}-bit, expected 16`);

  if (fmt.sampleRate !== TARGET_SR) problems.push(`${String(fmt.sampleRate)} Hz, expected ${String(TARGET_SR)}`);

  if (fmt.byteRate !== fmt.sampleRate * fmt.channels * (fmt.bits / 8)) {
    problems.push("byteRate does not match sampleRate * channels * bytes");
  }

  if (fmt.bits !== 16) return { fmt, problems, samples: null, dataBytes: data.length };

  const count = Math.floor(data.length / 2);

  const samples = new Int16Array(count);

  for (let i = 0; i < count; i++) samples[i] = data.readInt16LE(i * 2);

  return { fmt, problems, samples, dataBytes: data.length };
};

const analyse = (name, file) => {
  const problems = [];

  const wav = readWav(file);

  problems.push(...wav.problems);

  const s = wav.samples;

  if (!s || s.length === 0) {
    problems.push("no audio samples");

    return { name, problems, duration: 0, peak: 0, rms: 0, silent: true, clipped: false };
  }

  const sr = wav.fmt.sampleRate || TARGET_SR;

  const duration = s.length / (sr * (wav.fmt.channels || 1));

  let peak = 0;

  let sumSq = 0;

  let nonzero = 0;

  let clippedRuns = 0;

  let run = 0;

  let firstFull = -1;

  let lastFull = -1;

  for (let i = 0; i < s.length; i++) {
    const v = s[i];

    const a = Math.abs(v);

    if (a > peak) peak = a;

    sumSq += (v / FULL_SCALE) ** 2;

    if (a > 0) nonzero++;

    if (a >= FULL_SCALE) {
      if (firstFull < 0) firstFull = i;

      lastFull = i;

      run++;

      if (run === CLIP_RUN) clippedRuns++;
    } else {
      run = 0;
    }
  }

  const peakN = peak / FULL_SCALE;

  const rms = Math.sqrt(sumSq / s.length);

  const silent = peakN < SILENT_PEAK || nonzero / s.length < 0.001;

  const clipped = clippedRuns > 0;

  if (silent) problems.push("SILENT (peak below -60 dBFS)");

  if (clipped) {
    problems.push(`CLIPPED (${String(clippedRuns)} run(s) of ≥${String(CLIP_RUN)} full-scale samples, first @ ${(firstFull / sr).toFixed(3)}s)`);
  }

  const isLoop = LOOP_NAMES.has(name);

  if (!isLoop && duration > MAX_ONESHOT_SECONDS) {
    problems.push(`too long (${duration.toFixed(2)}s > ${String(MAX_ONESHOT_SECONDS)}s)`);
  }

  const expected = EXPECTED[name];

  if (typeof expected === "number" && Math.abs(duration - expected) > TOLERANCE) {
    problems.push(`duration ${duration.toFixed(2)}s, expected ${expected.toFixed(2)}s ± ${String(TOLERANCE)}`);
  }

  // Loops must wrap without a click: the seam jump should stay under the peak.
  if (isLoop && s.length > 2) {
    const seam = Math.abs(s[0] - s[s.length - 1]) / FULL_SCALE;

    if (seam > Math.max(0.05, peakN * 0.5)) {
      problems.push(`loop seam jumps by ${seam.toFixed(3)} (audible click)`);
    }
  }

  return {
    name,
    problems,
    duration,
    peak: peakN,
    rms,
    silent,
    clipped,
    lastFull: lastFull / sr,
  };
};

const dirArg = process.argv[2];

const dir = path.resolve(ROOT, dirArg || "public/sfx");

if (!fs.existsSync(dir)) {
  console.error(`No such folder: ${dir}`);

  process.exit(2);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith(".wav"))
  .sort();

if (files.length === 0) {
  console.error(`No .wav files in ${dir}`);

  process.exit(2);
}

const rows = files.map((f) => analyse(path.basename(f, ".wav"), path.join(dir, f)));

const pad = (v, n) => String(v).padEnd(n);

const padL = (v, n) => String(v).padStart(n);

console.log(`\nAudio audit — ${path.relative(ROOT, dir) || dir}  (${String(rows.length)} files, target ${String(TARGET_SR)} Hz mono 16-bit)\n`);

console.log(
  `${pad("clip", 12)}${padL("dur(s)", 8)}${padL("peak(dB)", 10)}${padL("rms(dB)", 9)}${padL("crest", 8)}  ${pad("state", 12)}note`,
);

console.log("-".repeat(88));

let failures = 0;

for (const r of rows) {
  const state = r.silent ? "SILENT" : r.clipped ? "CLIPPED" : "ok";

  const crest = r.rms > 0 ? (r.peak / r.rms).toFixed(1) : "-";

  const note = r.problems.filter((p) => !/^(SILENT|CLIPPED)/.test(p)).join("; ");

  if (r.problems.length > 0) failures++;

  console.log(
    `${pad(r.name, 12)}${padL(r.duration.toFixed(2), 8)}${padL(db(r.peak), 10)}${padL(db(r.rms), 9)}${padL(crest, 8)}  ${pad(state, 12)}${note}`,
  );
}

const total = rows.reduce((sum, r) => sum + r.duration, 0);

console.log("-".repeat(88));

console.log(`${String(rows.length)} clips, ${total.toFixed(2)}s total, ${String(failures)} with problems`);

if (failures > 0) {
  console.error("\nFAILED — see the notes above.");

  process.exit(1);
}

console.log("All clips OK (44.1 kHz mono 16-bit, audible, unclipped, sane length).");
