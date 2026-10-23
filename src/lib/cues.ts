import type { CUE, SfxName } from "./cueTypes";

/**
 * 全片的音效清单，按帧升序排列。
 * 场景起点（30fps）：Intro 0 · Tokenize 135 · Embed 360 · Transformer 570
 * · Think 855 · NextToken 1050 · Predict 1230 · Decode 1425 · Stream 1635 · Outro 1815
 *
 * 主时间轴用 `trimBefore` 把它们首尾相接放进同一个音频部件，
 * 所以列表必须严格升序（`isSorted` 会在开发时兜底检查）。
 */
export const CUE_LIST: readonly CUE[] = [
  // 00 按下发送：打字、发送、倒计时滴答
  ...typewriter(6, 8, 5, "key"),
  { frame: 50, src: "send" },
  { frame: 62, src: "tick" },
  { frame: 92, src: "tick" },
  { frame: 122, src: "tick" },

  // 01 切成小词：剪刀、小块弹出、编号落下
  { frame: 140, src: "snip" },
  ...chipPops(150, 8, 7),
  ...typewriter(206, 8, 6, "pop"),
  { frame: 272, src: "pop" },

  // 02 变成数字：吸入、数字条逐行出现、收尾微光
  { frame: 368, src: "whooshUp" },
  ...typewriter(378, 7, 5, "pop"),
  { frame: 424, src: "shimmer" },

  // 03 层层阅读：层塔推进的每一次“咔哒”
  { frame: 580, src: "riser" },
  ...chipPops(612, 6, 40, "tick"),
  { frame: 846, src: "shimmer" },

  // 04 打个草稿：便利贴、token 跳动、想完了
  { frame: 862, src: "bubble" },
  ...typewriter(884, 6, 20, "type"),
  { frame: 1030, src: "ding" },

  // 05 猜下一个词：扇形展开、候选涌现、胜出
  { frame: 1055, src: "swish" },
  ...chipPops(1072, 12, 5),
  { frame: 1183, src: "select" },

  // 06 掷骰子：柱子、温度档位、骰子落定
  ...chipPops(1236, 5, 6, "tick"),
  { frame: 1262, src: "pop" },
  { frame: 1292, src: "pop" },
  { frame: 1310, src: "pop" },
  { frame: 1355, src: "select" },

  // 07 过一遍检查：三份草稿、两道红叉、一次全绿
  { frame: 1430, src: "pop" },
  { frame: 1448, src: "pop" },
  { frame: 1466, src: "pop" },
  { frame: 1487, src: "buzz" },
  { frame: 1503, src: "buzz" },
  { frame: 1524, src: "ding" },
  ...chipPops(1540, 5, 5, "tap"),

  // 08 一个字一个字地送到：首字到、打字机
  { frame: 1640, src: "send" },
  ...typewriter(1650, 40, 3, "type"),

  // 09 总结：卡片依次冒出、收尾和弦
  { frame: 1818, src: "swish" },
  ...typewriter(1830, 7, 7, "pop"),
  { frame: 1872, src: "finale" },
  { frame: 1940, src: "ding" },
  { frame: 1975, src: "chime" },
];

function chipPops(start: number, count: number, step: number, src: SfxName = "pop"): CUE[] {
  return Array.from({ length: count }, (_, i) => ({ frame: start + i * step, src }));
}

function typewriter(start: number, count: number, step: number, src: SfxName): CUE[] {
  return Array.from({ length: count }, (_, i) => ({ frame: start + i * step, src }));
}

/** Cheap dev-time guard: the list must be sorted by frame. */
export const isSorted = CUE_LIST.every((cue, i) => i === 0 || cue.frame >= (CUE_LIST[i - 1]?.frame ?? 0));

export type { SfxName };
