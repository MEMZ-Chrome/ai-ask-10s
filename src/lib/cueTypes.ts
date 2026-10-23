export type SfxName =
  | "key"
  | "send"
  | "tick"
  | "pop"
  | "snip"
  | "shimmer"
  | "whoosh"
  | "whooshUp"
  | "swish"
  | "bubble"
  | "riser"
  | "tap"
  | "sparkle"
  | "type"
  | "chime"
  | "select"
  | "ding"
  | "buzz"
  | "finale";

export type CUE = {
  /** Frame at which the sound starts. */
  readonly frame: number;
  readonly src: SfxName;
};
