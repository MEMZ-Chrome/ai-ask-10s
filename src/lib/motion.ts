/**
 * 运动语言：参考 Apple《Designing Fluid Interfaces》。
 *
 * - 落在画面上的东西用 springIn（带一点点回弹），
 *   只是"出现"的东西用 enter / appear（不过冲，干净）。
 * - 所有函数都是 (frame, ...) 的纯函数，同一条时间线永远得到同一帧画面，
 *   这样 Remotion 的逐帧渲染和 Studio 预览完全一致。
 * - 每个插值都有固定时长，所以进入 / 退出可以对称（同一路径原路返回）。
 */
import { Easing, spring } from "remotion";

/** 把任意值夹到 0..1。 */
export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** 三次方缓出：起步快、收尾轻，全场默认的"安静"曲线。 */
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);

/** 三次方缓入：退场用，和 easeOut 互为镜像。 */
export const easeIn = (t: number): number => Math.pow(clamp01(t), 3);

/** 平滑的 S 曲线，用来做"连续变化"的量（透明度、位移轨道等）。 */
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};

/** 一段 0..1 的时长比（不做缓动）。 */
export const ratio = (frame: number, at: number, duration: number): number =>
  clamp01((frame - at) / Math.max(1, duration));

/** 0 → 1，不过冲。用于"淡入 / 滑入"这类普通的出现。 */
export const enter = (frame: number, at: number, duration = 18): number =>
  easeOut(ratio(frame, at, duration));

/** 0 → 1，带回弹。用于"落下来 / 弹进来"的东西（卡片、徽章、机器人）。
 *  - 不给 duration：物理弹簧，自然静止（轻微过冲到 ~1.02–1.05）。
 *  - 给 duration：Remotion 会把弹簧归一化到这段时长，结尾仍然是"落定"的动作。
 *  - 想要调过冲幅度：减小 damping（更弹）或减小 stiffness（更慢、更晃）。 */
export const springIn = (
  frame: number,
  at: number,
  duration?: number,
  fps = 30,
  {
    damping = 13,
    mass = 0.7,
    stiffness = 130,
  }: {
    readonly damping?: number;
    readonly mass?: number;
    readonly stiffness?: number;
  } = {},
): number => {
  const local = frame - at;
  if (local <= 0) {
    return 0;
  }
  if (duration !== undefined && local >= duration) {
    return 1;
  }
  return spring({
    frame: local,
    fps,
    config: { damping, mass, stiffness },
    ...(duration === undefined ? {} : { durationInFrames: duration }),
    durationRestThreshold: 0.001,
  });
};

/** enter 的别名：场景里最常用的"出现"。 */
export const appear = (frame: number, at: number, duration = 16): number =>
  enter(frame, at, duration);

/** 1 → 0 的缓出退场。和 enter 同一条路径，只是反向播放。 */
export const leave = (frame: number, at: number, duration = 14): number =>
  1 - easeOut(ratio(frame, at, duration));

/** 进入后再退出：在 [at, at + length] 之间维持 1。 */
export const hold = (
  frame: number,
  at: number,
  length: number,
  fadeIn = 12,
  fadeOut = 14,
): number =>
  Math.min(enter(frame, at, fadeIn), leave(frame, at + length, fadeOut));

/** 在某一瞬间"闪一下"：先快速升起，再缓慢落回 0。 */
export const pulseAt = (frame: number, at: number, length: number): number =>
  Math.min(
    Easing.out(Easing.cubic)(ratio(frame, at, 10)),
    1 - clamp01((frame - at - length) / 12),
  );

/** 在两帧之间的 `at` 处来一发衰减的弹簧脉冲（用于挤压 / 拉伸）。 */
export const bounceAt = (frame: number, at: number, strength = 1): number => {
  const local = frame - at;
  if (local < 0) {
    return 0;
  }
  return Math.sin(local * 0.9) * Math.exp(-local / 6) * strength;
};

/** 很慢的呼吸 / 漂浮：返回 -1..1，用来做"活着"的微小运动。 */
export const float = (frame: number, speed = 34, phase = 0): number =>
  Math.sin(frame / Math.max(1, speed) + phase);

/** 线性重映射（不循环，超出端点就停在端点）。 */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** 依次出现：第 index 个元素比第一个晚 step 帧。 */
export const staggered = (
  frame: number,
  at: number,
  index: number,
  step: number,
  duration = 16,
): number => enter(frame, at + index * step, duration);

/** 确定性的"骰子"：同样的 seed 永远得到同样的整数，预览与渲染一致。 */
export const dice = (seed: string, max: number): number =>
  Math.floor(randomFloat(seed) * Math.max(1, max));

/**
 * 确定性 0..1 随机数。
 * 不用 remotion 的 random 是为了让 motion.ts 不依赖渲染环境（可以在任意地方调用）。
 * 同一套 hash（xmur3 + mulberry32）保证每个 seed 的分布是均匀的。
 */
export const randomFloat = (seed: string): number => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * 把 0..1 的进度变成"弹性位移"（px）：常用于卡片从下方弹入。
 * 0% 时位移 = offset，100% 时 = 0。
 */
export const slideUp = (progress: number, offset: number): number =>
  (1 - progress) * offset;
