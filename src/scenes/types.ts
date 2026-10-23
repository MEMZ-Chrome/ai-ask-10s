import type { SfxTimeline } from "../lib/sfxTimeline";

export type SceneProps = {
  /**
   * Seconds on the question's clock at which this scene starts.
   * Kept on the JSX node so it stays visible and editable in the Studio.
   */
  readonly start: number;
  /** Layer name shown in the Studio timeline. */
  readonly name?: string;
  /** Timing prop added by the Studio (when the scene is used with `from`). */
  readonly durationInFrames?: number | undefined;
  /** Sound-effect timing for the main timeline. */
  readonly sfx?: SfxTimeline;
};

export type SfxProps = {
  readonly sfx: SfxTimeline;
};
