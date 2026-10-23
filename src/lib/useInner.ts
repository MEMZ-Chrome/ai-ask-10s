import { useCurrentFrame, useVideoConfig } from "remotion";
import { TIME_SLOWDOWN } from "./time";

/**
 * Frame counter on the *question's* clock: 0 = the moment the user hit send.
 * Each scene starts at `start` (seconds) and advances one real second per
 * TIME_SLOWDOWN video seconds.
 */
export const useInner = (start: number) => {
  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  return start * fps + frame / TIME_SLOWDOWN;
};

export { TIME_SLOWDOWN };
