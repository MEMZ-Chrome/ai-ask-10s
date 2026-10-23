/**
 * 「提问之后的 10 秒」— 清新亮色版视觉系统
 * 薄荷绿 + 天蓝 + 奶油底色，圆润、留白多、以图形为主，字尽量少。
 *
 * 柔和色（*Soft）统一取同一个色相、把饱和度压低、亮度抬高到 96% 左右，
 * 这样叠在白卡片上仍然是"一层很淡的彩色"，而不是另一种颜色。
 */
export const C = {
  /** 奶油底：overall background */
  bg: "#f3f9ff",
  /** 偏暖的奶油，用来做顶部高光 */
  bgWarm: "#fff8ef",
  /** 主文字：深海军蓝，和薄荷/天蓝同属冷色系 */
  ink: "#1b2a4a",
  /** 次级文字 */
  inkSoft: "#3d5480",
  /** 说明文字 */
  muted: "#7e93b8",
  /** 更淡的辅助线／占位 */
  faint: "#b6c4dc",
  /** 卡片与浮层底色 */
  card: "#ffffff",
  /** 普通描边 */
  line: "#e2ecf8",
  /** 强调描边 */
  lineStrong: "#c7daf0",

  mint: "#3dd6b5",
  mintSoft: "#d9f8f0",
  sky: "#48a8f5",
  skySoft: "#dcefff",
  peach: "#ff9f76",
  peachSoft: "#ffe7dc",
  lilac: "#9a86fd",
  lilacSoft: "#ebe6ff",
  butter: "#ffc95c",
  butterSoft: "#fff2d4",
  pink: "#ff7fb0",
  pinkSoft: "#ffe1ec",
  red: "#ff6b81",
  redSoft: "#ffe2e7",
} as const;

export type ColorKey = keyof typeof C;

/**
 * 「奶油底 + 白卡片 + 柔和浅色块」三种材质，统一在这里写阴影，
 * 场景作者不需要再手写 box-shadow。
 */
export const MATERIAL = {
  /** 白卡片：柔和的落到地面上的影子 + 一层很淡的蓝光 */
  card: "0 10px 0 rgba(199, 218, 240, 0.35), 0 26px 60px rgba(72, 168, 245, 0.14)",
  /** 带厚度的小件（chip、药丸）：底下一道"键帽"影子 */
  keycap: "0 6px 0 rgba(199, 218, 240, 0.55)",
  /** 浮动元素（HUD、气泡） */
  float: "0 10px 26px rgba(72, 168, 245, 0.16)",
  /** 半透明白：像一层薄玻璃 */
  glass: "rgba(255, 255, 255, 0.78)",
} as const;

/** 字号层级：越大的字字距越紧（Apple 的尺寸相关 tracking） */
export const TYPE = {
  display: { size: 104, weight: 700, tracking: "-0.03em" },
  title: { size: 52, weight: 700, tracking: "-0.02em" },
  lead: { size: 44, weight: 700, tracking: "-0.01em" },
  body: { size: 38, weight: 400, tracking: "0em" },
  note: { size: 28, weight: 400, tracking: "0.01em" },
} as const;

export const LAYOUT = {
  width: 1920,
  height: 1080,
  padTop: 120,
  padX: 150,
  captionY: 905,
} as const;

/**
 * Scene windows in seconds (fractions OK).
 * The last two scenes overlap so the answer lands at ~9.2 s and the summary
 * clocks out at 10.0 s.
 */
export const SCENES = [
  { id: "Intro", seconds: 4.5, start: 0 },
  { id: "Tokenize", seconds: 7.5, start: 0.8 },
  { id: "Embed", seconds: 7.0, start: 2.0 },
  { id: "Transformer", seconds: 9.5, start: 3.0 },
  { id: "Think", seconds: 6.5, start: 4.6 },
  { id: "NextToken", seconds: 6.0, start: 5.4 },
  { id: "Predict", seconds: 6.5, start: 6.8 },
  { id: "Decode", seconds: 7.0, start: 8.0 },
  { id: "Stream", seconds: 6.0, start: 8.8 },
  { id: "Outro", seconds: 8.0, start: 9.2 },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

/** 4.5+7.5+7+9.5+6.5+6+6.5+7+6+8 = 68.5 s, plus a 3-frame tail. */
export const SCENE_TOTAL_FRAMES = 2058;

export const sceneDurationInFrames = (id: SceneId, fps: number): number => {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) {
    throw new Error(`Unknown scene ${String(id)}`);
  }
  return Math.round(scene.seconds * fps);
};
