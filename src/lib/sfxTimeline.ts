import type { CalculateMetadataFunction } from "remotion";
import { staticFile } from "remotion";
import { CUE_LIST } from "./cues";

export type SfxTimeline = {
  /** Start of clip i relative to the previous clip's start, in seconds. */
  readonly offsets: readonly number[];
  /** Length of each clip. */
  readonly durations: readonly number[];
};

export const DEFAULT_TIMELINE: SfxTimeline = {
  offsets: CUE_LIST.map(() => 0),
  durations: CUE_LIST.map(() => 0.2),
};

export type SfxProps = {
  readonly sfx: SfxTimeline;
};

const probeDuration = async (src: string) => {
  const buffer = await fetch(src)
    .then((r) => r.arrayBuffer())
    .catch(() => new ArrayBuffer(0));

  if (buffer.byteLength <= 44) {
    return 0.25;
  }

  const view = new DataView(buffer);

  const byteRate = view.getUint32(28, true);

  const dataSize = view.getUint32(40, true);

  return byteRate > 0 ? dataSize / byteRate : 0.25;
};

/**
 * Reads the exact duration of every effect once, so the main timeline can lay
 * them out with `<Audio trimBefore>` inside a single audio part.
 *
 * Also declares every WAV as a composition asset: Remotion then stages the
 * files before rendering, and refuses to render a "silent" video when the
 * audio is missing.
 */
export const calculateSfxMetadata: CalculateMetadataFunction<SfxProps> = async () => {
  const durations: number[] = [];

  const unique = [...new Set(CUE_LIST.map((cue) => cue.src))];

  const probed = new Map<string, number>();

  for (const name of unique) {
    probed.set(name, await probeDuration(staticFile(`sfx/${name}.wav`)));
  }

  for (const cue of CUE_LIST) {
    durations.push(probed.get(cue.src) ?? 0.25);
  }

  const offsets = CUE_LIST.map((cue, i) => {
    const prevFrame = i === 0 ? 0 : (CUE_LIST[i - 1]?.frame ?? 0);

    const prevDuration = i === 0 ? 0 : (durations[i - 1] ?? 0);

    return Math.max(0, (cue.frame - prevFrame) / 30 - prevDuration);
  });

  const audioFiles = ["music-loop", "think-loop", ...unique];

  const assets = audioFiles.map((name, i) => ({
    type: "audio",
    src: staticFile(`sfx/${name}.wav`),
    id: `sfx-${name}-${i}`,
    duration: null,
    startInVideo: 0,
    trimBefore: null,
    trimAfter: null,
    playbackRate: 1,
    volume: 1,
    toneFrequency: null,
    audioStartFrame: 0,
  }));

  return { props: { sfx: { offsets, durations } }, assets };
};
