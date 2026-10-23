import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, LAYOUT } from "../lib/theme";
import { FONT_FAMILY } from "../lib/font";

/**
 * 背景：奶油色 → 薄荷 → 天蓝的极淡径向光晕，几颗慢慢漂浮的大泡泡，
 * 稀疏的小圆点，最后是一层"亮"的暗角（白色，不是黑色）。
 * 所有运动都只依赖 frame，所以渲染结果永远可复现。
 */

type BubbleSpec = {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly color: string;
  readonly dx: number;
  readonly dy: number;
  readonly speed: number;
  readonly phase: number;
};

/** 泡泡的"性格"：位置、半径、颜色、漂移幅度与速度。 */
const BUBBLES: readonly BubbleSpec[] = [
  { x: 4, y: 14, r: 300, color: C.mint, dx: 16, dy: 22, speed: 150, phase: 0 },
  { x: 92, y: 8, r: 230, color: C.sky, dx: 22, dy: 16, speed: 120, phase: 1.7 },
  {
    x: 97,
    y: 70,
    r: 340,
    color: C.lilac,
    dx: 14,
    dy: 26,
    speed: 170,
    phase: 3.1,
  },
  {
    x: 8,
    y: 84,
    r: 250,
    color: C.butter,
    dx: 20,
    dy: 18,
    speed: 140,
    phase: 4.4,
  },
  {
    x: 52,
    y: 104,
    r: 280,
    color: C.pink,
    dx: 26,
    dy: 14,
    speed: 190,
    phase: 2.2,
  },
  {
    x: 34,
    y: -6,
    r: 190,
    color: C.mint,
    dx: 18,
    dy: 12,
    speed: 210,
    phase: 5.3,
  },
];

/** 稀疏小圆点：位置用固定的伪随机，避免每次渲染跳动。 */
const DOTS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.sin(i * 12.9898) * 43758.5453;
  const hx = h - Math.floor(h);
  const k = Math.sin(i * 78.233) * 12345.6789;
  const ky = k - Math.floor(k);
  return {
    x: 60 + hx * 1800,
    y: 80 + ky * 920,
    r: 3 + (i % 3) * 2.5,
    color: [C.mint, C.sky, C.lilac, C.butter, C.pink][i % 5] ?? C.mint,
    speed: 70 + (i % 5) * 22,
    phase: i * 0.7,
  };
});

export const Background = () => {
  const frame = useCurrentFrame();

  const { durationInFrames } = useVideoConfig();

  // 全片的整体呼吸：整个背景极慢地缩放一点点，让静止的画面也有生气。
  const breathe =
    Math.sin((frame / Math.max(1, durationInFrames)) * Math.PI * 2) * 6;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundColor: C.bg,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* 三团巨大的柔光：顶部偏暖、中间薄荷、右上偏蓝 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            `radial-gradient(1200px 760px at 50% -16%, ${C.bgWarm} 0%, transparent 72%)`,
            `radial-gradient(1100px 820px at 84% 8%, ${C.skySoft} 0%, transparent 70%)`,
            `radial-gradient(1000px 760px at 6% 96%, ${C.mintSoft} 0%, transparent 74%)`,
          ].join(", "),
        }}
      />

      {/* 漂浮的大泡泡 */}
      {BUBBLES.map((b, i) => {
        const t = frame / b.speed + b.phase;
        const x = Math.sin(t) * b.dx + breathe * 0.5;
        const y = Math.cos(t * 0.8) * b.dy + breathe;
        return (
          <div
            key={String(i)}
            style={{
              position: "absolute",
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.r,
              height: b.r,
              translate: `calc(-50% + ${x}px) calc(-50% + ${y}px)`,
              borderRadius: "50%",
              // 泡泡本身是透明的，只有一层"薄玻璃"：内有柔光、边缘有一道亮边
              backgroundImage: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.72) 0%, ${b.color}1a 46%, ${b.color}14 100%)`,
              border: `2.5px solid ${b.color}22`,
              boxShadow: `inset 0 0 ${b.r * 0.3}px rgba(255,255,255,0.75), inset 0 ${-b.r * 0.06}px ${b.r * 0.18}px ${b.color}26`,
            }}
          />
        );
      })}

      {/* 稀疏小圆点，轻轻上下浮动 */}
      {DOTS.map((d, i) => (
        <div
          key={`d-${String(i)}`}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y + Math.sin(frame / d.speed + d.phase) * 10,
            width: d.r,
            height: d.r,
            borderRadius: "50%",
            backgroundColor: d.color,
            opacity: 0.3,
          }}
        />
      ))}

      {/* 亮色暗角：边缘收白，画面永远不脏不暗 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 260px rgba(255,255,255,0.85)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 74%, rgba(255,255,255,0.45) 100%)`,
        }}
      />
    </div>
  );
};

/** 布景尺寸的静态检查点在构建时就会被 tree-shake 掉，这里只用来保证 import 不闲置。 */
export const STAGE = { width: LAYOUT.width, height: LAYOUT.height } as const;

/**
 * 左上角的小时钟：问句发出后的"真实时间"。
 * 白药丸高 64px、顶部 34px，所以右边缘最低在 y = 98，不会压到 y=120 起的场景标题。
 * 数字用等宽数字（tabular-nums），跳秒时整块不会左右抖。
 */
export const Hud = ({ realSeconds }: { readonly realSeconds: number }) => {
  const safe = Number.isFinite(realSeconds) ? Math.max(0, realSeconds) : 0;

  const text = `${safe.toFixed(1)}秒`;

  return (
    <div
      style={{
        position: "absolute",
        left: LAYOUT.padX,
        top: 34,
        height: 64,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 24px 0 22px",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.94)",
        border: `2.5px solid ${C.line}`,
        boxShadow: `0 8px 0 rgba(199, 218, 240, 0.45), 0 14px 32px rgba(72, 168, 245, 0.14)`,
        fontFamily: FONT_FAMILY,
        whiteSpace: "nowrap",
      }}
    >
      {/* 一颗会呼吸的小灯，暗示"正在计时" */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: C.mint,
          boxShadow: `0 0 0 4px ${C.mint}33`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 22, color: C.muted, letterSpacing: "0.01em" }}>
        提问后
      </span>
      <span
        style={{
          fontSize: 40,
          fontWeight: 700,
          lineHeight: 1,
          color: C.ink,
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum" 1',
          letterSpacing: "-0.01em",
        }}
      >
        {text}
      </span>
      <span
        style={{
          fontSize: 20,
          color: C.muted,
          letterSpacing: "0.06em",
          paddingLeft: 12,
          borderLeft: `2px solid ${C.line}`,
          lineHeight: 1.2,
        }}
      >
        慢放
      </span>
    </div>
  );
};
