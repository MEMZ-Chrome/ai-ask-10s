/**
 * 场景里反复用到的小图形与动效工具。
 * 纯函数 + 纯 div 绘制：不引图片、不用 CSS transition / keyframes，
 * 一切都按当前 frame 计算，渲染与预览永远一致。
 */
import type { CSSProperties, ReactNode } from "react";
import { C } from "../lib/theme";
import { FONT_FAMILY } from "../lib/font";
import {
  clamp01,
  dice,
  easeOut,
  appear,
  leave,
  pulseAt,
  smoothstep,
} from "../lib/motion";

// 运动工具在这里原样转出，场景只要 import 一处就够。
export { clamp01, smoothstep, easeOut, appear, leave, pulseAt, dice };

export type Vec = { readonly x: number; readonly y: number };

/** 确定性 0..1 随机：同 seed 永远同结果。 */
const rand = (seed: string): number => (dice(seed, 1000000) + 0.5) / 1000000;

/** 一行圆角小柱：向量 / 数字的视觉速记。 */
export const VectorBars = ({
  values,
  height,
  color,
  gap = 3,
  barWidth = 7,
  drop = 1,
}: {
  readonly values: readonly number[];
  readonly height: number;
  readonly color: string;
  readonly gap?: number;
  readonly barWidth?: number;
  readonly drop?: number;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap,
      height,
    }}
  >
    {values.map((v, i) => {
      const h = Math.max(4, Math.abs(v) * height * drop);
      return (
        <div
          key={String(i)}
          style={{
            width: barWidth,
            height: h,
            borderRadius: Math.min(barWidth / 2, 4),
            backgroundColor: v >= 0 ? color : C.lilac,
            opacity: 0.4 + Math.min(0.6, Math.abs(v) * 0.6),
          }}
        />
      );
    })}
  </div>
);

/** 圆头连接线（可虚线）。`from` 为旋转原点。 */
export const Line = ({
  from,
  to,
  color = C.lineStrong,
  width = 5,
  opacity = 1,
  dashed = false,
}: {
  readonly from: Vec;
  readonly to: Vec;
  readonly color?: string;
  readonly width?: number;
  readonly opacity?: number;
  readonly dashed?: boolean;
}) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  return (
    <div
      style={{
        position: "absolute",
        left: from.x,
        top: from.y,
        width: len,
        height: width,
        borderRadius: width,
        backgroundColor: dashed ? "transparent" : color,
        backgroundImage: dashed
          ? `repeating-linear-gradient(90deg, ${color} 0 ${width * 2.2}px, transparent ${width * 2.2}px ${width * 4.4}px)`
          : undefined,
        opacity,
        transformOrigin: "0 50%",
        rotate: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * 一次性的五彩纸屑：圆角方块 + 小圆点从中心向外飞，一边旋转一边淡出。
 * 起点用 easeOut 冲出去，末段再加一点下坠，落下来更有重量。
 */
export const Sparkles = ({
  frame,
  at,
  cx,
  cy,
  count = 10,
  radius = 90,
  colors = [C.butter, C.pink, C.mint, C.sky, C.lilac],
  seed = "sp",
  size = 10,
}: {
  readonly frame: number;
  readonly at: number;
  readonly cx: number;
  readonly cy: number;
  readonly count?: number;
  readonly radius?: number;
  readonly colors?: readonly string[];
  readonly seed?: string;
  readonly size?: number;
}) => {
  const span = 34;
  const t = (frame - at) / span;

  if (t <= 0 || t >= 1) {
    return null;
  }

  const fly = easeOut(t);
  const fade = 1 - Math.pow(clamp01((t - 0.35) / 0.65), 1.6);

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + rand(`${seed}-a-${i}`) * 0.9;
        const dist = radius * fly * (0.55 + rand(`${seed}-d-${i}`) * 0.65);
        const gravity =
          t * t * radius * 0.28 * (0.4 + rand(`${seed}-g-${i}`) * 0.6);
        const piece = size * (0.6 + rand(`${seed}-s-${i}`) * 0.8);
        const round = i % 3 === 0;
        const color = colors[i % colors.length] ?? C.mint;
        const spin = (rand(`${seed}-r-${i}`) - 0.5) * 540 * t;

        return (
          <div
            key={String(i)}
            style={{
              position: "absolute",
              left: cx + Math.cos(angle) * dist - piece / 2,
              top: cy + Math.sin(angle) * dist - piece / 2 + gravity,
              width: piece,
              height: round ? piece : piece * 0.72,
              borderRadius: round ? "50%" : Math.max(2, piece * 0.28),
              backgroundColor: color,
              opacity: fade,
              rotate: `${spin}deg`,
              scale: `${0.5 + 0.5 * fly}`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

/**
 * 说话气泡：白底、柔边、带一个小尾巴。
 * 尾巴用旋转 45° 的小方块画，边框会在视觉上"接着"气泡本体（不用 CSS 三角）。
 */
export const Bubble = ({
  children,
  color = C.card,
  border = C.line,
  tail = "left",
  style,
}: {
  readonly children?: ReactNode;
  readonly color?: string;
  readonly border?: string;
  readonly tail?: "left" | "bottom" | "right";
  readonly style?: CSSProperties;
}) => {
  const size = 26;

  const tailBox: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: 7,
    backgroundColor: color,
    border: `3px solid ${border}`,
    rotate: "45deg",
  };

  const tailPos: Record<"left" | "bottom" | "right", CSSProperties> = {
    left: {
      left: -size * 0.42,
      top: 40,
      borderTop: "none",
      borderLeft: "none",
    },
    right: {
      right: -size * 0.42,
      top: 40,
      borderRight: "none",
      borderBottom: "none",
    },
    bottom: {
      left: "50%",
      bottom: -size * 0.42,
      translate: "-50% 0",
      borderRight: "none",
      borderBottom: "none",
    },
  };

  return (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        backgroundColor: color,
        border: `3px solid ${border}`,
        borderRadius: 30,
        padding: "20px 32px",
        boxShadow: `0 10px 0 rgba(199, 218, 240, 0.42), 0 20px 44px rgba(72, 168, 245, 0.13)`,
        fontFamily: FONT_FAMILY,
        color: C.ink,
        ...style,
      }}
    >
      {children}
      <div style={{ ...tailBox, ...tailPos[tail] }} />
    </div>
  );
};

/**
 * 会"画出来"的圆角短棒：0 → progress 增长。
 * 用来做连接线 / 进度条；`vertical` 时从下往上长。
 */
export const Dash = ({
  length,
  thickness = 8,
  color = C.mint,
  progress,
  vertical = false,
}: {
  readonly length: number;
  readonly thickness?: number;
  readonly color?: string;
  readonly progress: number;
  readonly vertical?: boolean;
}) => {
  const p = clamp01(progress);

  if (p <= 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "relative",
        width: vertical ? thickness : length,
        height: vertical ? length : thickness,
        borderRadius: Math.min(thickness / 2, 999),
        backgroundColor: `${color}22`,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: vertical ? 0 : undefined,
          bottom: vertical ? 0 : undefined,
          width: vertical ? "100%" : `${p * 100}%`,
          height: vertical ? `${p * 100}%` : "100%",
          borderRadius: Math.min(thickness / 2, 999),
          background: vertical
            ? `linear-gradient(180deg, ${color}, ${color}cc)`
            : `linear-gradient(90deg, ${color}cc, ${color})`,
          boxShadow: `0 0 ${thickness * 1.2}px ${color}55`,
        }}
      />
    </div>
  );
};

/**
 * 环形进度：浅色底圈 + 按 progress 顺时针画出的彩色圆弧（conic-gradient 再用 mask 挖空成圆环）。
 * 0° 在 12 点方向；progress 为 0 时只剩底圈。
 */
export const Ring = ({
  size,
  color,
  progress,
  thickness = 12,
}: {
  readonly size: number;
  readonly color: string;
  readonly progress: number;
  readonly thickness?: number;
}) => {
  const p = clamp01(progress);
  const deg = p * 360;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        boxSizing: "border-box",
        borderRadius: "50%",
        border: `${thickness}px solid ${C.line}`,
        pointerEvents: "none",
      }}
    >
      {p > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: -thickness,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${color} 0deg ${deg}deg, transparent ${deg}deg 360deg)`,
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
            filter: `drop-shadow(0 0 ${thickness * 0.45}px ${color}55)`,
          }}
        />
      ) : null}
    </div>
  );
};
