/**
 * 画面里反复出现的角色和图标：一只圆滚滚的小机器人、柔光、对勾 / 叉。
 * 全部用 div + border-radius 画出来，不依赖任何图片素材，所以 90px 和 250px 同样清楚。
 */
import type { CSSProperties } from "react";
import { C } from "../lib/theme";

const BOX: CSSProperties = {
  position: "absolute",
  boxSizing: "border-box",
};

type Mood = "idle" | "think" | "happy" | "focus";

/** 每种情绪独有的一点点"活着"的小动作（幅度都很小，周期也慢）。 */
const MOOD_MOTION: Record<
  Mood,
  { bobAmp: number; bobSpeed: number; swayDeg: number; swaySpeed: number }
> = {
  idle: { bobAmp: 0.012, bobSpeed: 40, swayDeg: 1.2, swaySpeed: 62 },
  think: { bobAmp: 0.02, bobSpeed: 26, swayDeg: 2.4, swaySpeed: 44 },
  happy: { bobAmp: 0.03, bobSpeed: 14, swayDeg: 2.8, swaySpeed: 30 },
  focus: { bobAmp: 0.004, bobSpeed: 70, swayDeg: 0.5, swaySpeed: 90 },
};

/**
 * 小机器人（"AI 本人"）。
 *
 * 结构自下而上：天线的发光小球 → 白色方脑袋（深色描边）→ 眼睛 → 腮红 / 鼻子 →
 * 薄荷绿的小身体 + 状态灯。`mood` 决定眼睛、鼻子和状态灯：
 *   idle  = 圆眼睛，偶尔眨眼，橘色状态灯慢慢呼吸
 *   think = 眯成小横线，头顶灯变橘色，鼻子那三个小点在慢慢转
 *   happy = 弯弯的笑眼，两颊腮红，薄荷色状态灯常亮
 *   focus = 眼睛变窄变高（盯着某处），天蓝色灯，几乎不动
 *
 * 物理尺寸是 s × 1.26s（含天线）；上下浮动用 translate，不改变布局尺寸。
 */
export const Bot = ({
  size = 180,
  mood = "idle",
  frame = 0,
  style,
}: {
  readonly size?: number;
  readonly mood?: Mood;
  readonly frame?: number;
  readonly style?: CSSProperties;
}) => {
  const s = size;

  // 描边与五官随尺寸缩放，但有最小值：缩到 90px 也不会糊成一片。
  const outline = Math.max(2.5, s * 0.032);
  const eyeW = s * 0.12;
  const eyeGap = s * 0.16;

  // 眼睛上边线：所有 mood 共用同一条线，切 mood 时眼睛不会上下乱跳
  const eyeTop = s * 0.2 + s * 0.265;

  const m = MOOD_MOTION[mood];
  const bob = Math.sin(frame / m.bobSpeed) * s * m.bobAmp;
  const sway = Math.sin(frame / m.swaySpeed) * m.swayDeg;

  // 眨眼：每 ~2.4 秒眨一次，一次 4 帧；happy 不眨（本来就是笑眼）。
  const blinkCycle = 72;
  const blinkPhase = ((frame % blinkCycle) + blinkCycle) % blinkCycle;
  const blinkClose =
    mood === "idle" && blinkPhase < 4
      ? Math.sin((blinkPhase / 4) * Math.PI)
      : 0;

  const eyeH =
    mood === "focus"
      ? s * 0.13
      : mood === "think"
        ? s * 0.05
        : Math.max(s * 0.022, s * 0.15 * (1 - blinkClose * 0.94));

  const antennaGlow =
    mood === "think" ? C.butter : mood === "focus" ? C.sky : C.mint;
  const statusColor =
    mood === "focus"
      ? C.sky
      : mood === "think"
        ? C.butter
        : mood === "happy"
          ? C.mint
          : C.peach;
  const statusGlow =
    mood === "idle"
      ? 0.55 + 0.45 * Math.abs(Math.sin(frame / 22))
      : mood === "think"
        ? 0.6 + 0.4 * Math.abs(Math.sin(frame / 9))
        : 1;

  const eye = (side: 0 | 1) => {
    const cx = s * 0.5 + (side === 0 ? -1 : 1) * eyeGap * 0.5;

    if (mood === "happy") {
      // 笑眼：一段向上拱的圆弧（半圆环，两端是圆头），像 ^^ 一样"笑"。
      const r = eyeW * 0.5;
      const bar = Math.max(3, eyeW * 0.3);
      const arcBottom = eyeTop + r * 0.38;
      return (
        <div
          key={side}
          style={{
            ...BOX,
            left: cx - r,
            top: arcBottom - r,
            width: r * 2,
            height: r,
          }}
        >
          <div
            style={{
              ...BOX,
              left: 0,
              top: 0,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: `${bar}px solid ${C.ink}`,
              // 只留上半圈：底边透明 —— 一道干净的笑眼弧
              borderBottomColor: "transparent",
            }}
          />
        </div>
      );
    }

    return (
      <div
        key={side}
        style={{
          ...BOX,
          left: cx - eyeW * 0.5,
          top: eyeTop,
          width: eyeW,
          height: eyeH,
          borderRadius: Math.min(eyeW / 2, eyeH / 2),
          backgroundColor: C.ink,
          // 眼睛底部一小道反光，显得有精神
          boxShadow: `inset 0 ${-eyeH * 0.2}px 0 ${C.ink}, inset 0 ${eyeH * 0.1}px 0 rgba(255,255,255,0.22)`,
        }}
      />
    );
  };

  return (
    <div
      style={{
        ...BOX,
        width: s,
        height: s * 1.26,
        translate: `0px ${bob}px`,
        rotate: `${sway}deg`,
        ...style,
      }}
    >
      {/* 天线：细杆 + 发光小球（小球很亮，所以杆画成浅灰蓝，不会糊成黑点） */}
      <div
        style={{
          ...BOX,
          left: s * 0.47,
          top: s * 0.06,
          width: s * 0.06,
          height: s * 0.16,
          borderRadius: s,
          backgroundColor: C.lineStrong,
        }}
      />
      <div
        style={{
          ...BOX,
          left: s * 0.5 - s * 0.075,
          top: 0,
          width: s * 0.15,
          height: s * 0.15,
          borderRadius: "50%",
          backgroundColor: antennaGlow,
          boxShadow: `0 0 ${s * 0.16}px ${antennaGlow}aa, 0 0 ${s * 0.05}px ${antennaGlow}`,
        }}
      />

      {/* 头：白色圆角方块，深色描边，底下一道浅影子 */}
      <div
        style={{
          ...BOX,
          left: 0,
          top: s * 0.2,
          width: s,
          height: s * 0.64,
          borderRadius: s * 0.3,
          backgroundColor: C.card,
          border: `${outline}px solid ${C.ink}`,
          boxShadow: `0 ${s * 0.045}px 0 rgba(199, 218, 240, 0.75), 0 ${s * 0.12}px ${s * 0.18}px rgba(27, 42, 74, 0.08)`,
        }}
      />

      {/* 脸层：只为裁切而存在（overflow: hidden），保证腮红和思考点在脑袋范围内；
          它没有背景色，不会挡住底下的脑袋和影子。 */}
      <div
        style={{
          ...BOX,
          left: 0,
          top: 0,
          width: s,
          height: s * 0.84,
          overflow: "hidden",
        }}
      >
        {eye(0)}
        {eye(1)}

        {/* 腮红 */}
        {mood === "idle" || mood === "happy" ? (
          <>
            <div
              style={{
                ...BOX,
                left: s * 0.14,
                top: s * 0.36,
                width: s * 0.12,
                height: s * 0.07,
                borderRadius: "50%",
                backgroundColor: C.peach,
                opacity: mood === "happy" ? 0.55 : 0.32,
              }}
            />
            <div
              style={{
                ...BOX,
                left: s * 0.74,
                top: s * 0.36,
                width: s * 0.12,
                height: s * 0.07,
                borderRadius: "50%",
                backgroundColor: C.peach,
                opacity: mood === "happy" ? 0.55 : 0.32,
              }}
            />
          </>
        ) : null}

        {/* 鼻子：平时是两只小点，思考时变成中间转圈的三颗小点 */}
        {mood === "think"
          ? [0, 1, 2].map((i) => {
              const a = frame / 16 + i * ((Math.PI * 2) / 3);
              return (
                <div
                  key={String(i)}
                  style={{
                    ...BOX,
                    left: s * 0.5 + Math.cos(a) * s * 0.05 - s * 0.022,
                    top: s * 0.5 + Math.sin(a) * s * 0.02,
                    width: s * 0.044,
                    height: s * 0.044,
                    borderRadius: "50%",
                    backgroundColor: C.inkSoft,
                    opacity:
                      0.4 + 0.6 * Math.abs(Math.sin(frame / 8 - i * 1.1)),
                  }}
                />
              );
            })
          : ([-1, 1] as const).map((side) => (
              <div
                key={String(side)}
                style={{
                  ...BOX,
                  left: s * 0.5 + side * s * 0.072 - s * 0.018,
                  top: s * 0.515,
                  width: s * 0.036,
                  height: s * 0.036,
                  borderRadius: "50%",
                  backgroundColor: mood === "happy" ? C.peach : C.muted,
                  opacity: mood === "happy" ? 0.9 : 0.55,
                }}
              />
            ))}
      </div>

      {/* 身体：薄荷绿，深色描边，中间一颗状态灯 */}
      <div
        style={{
          ...BOX,
          left: s * 0.17,
          top: s * 0.875,
          width: s * 0.66,
          height: s * 0.34,
          borderRadius: s * 0.14,
          backgroundColor: C.mintSoft,
          border: `${outline}px solid ${C.ink}`,
          boxShadow: `inset 0 ${-s * 0.02}px 0 ${C.mint}55`,
        }}
      >
        <div
          style={{
            ...BOX,
            left: "50%",
            top: s * 0.08,
            width: s * 0.17,
            height: s * 0.17,
            translate: "-50% 0",
            borderRadius: s * 0.055,
            backgroundColor: C.card,
            border: `${Math.max(2, outline * 0.7)}px solid ${C.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: s * 0.075,
              height: s * 0.075,
              borderRadius: "50%",
              backgroundColor: statusColor,
              opacity: statusGlow,
              boxShadow: `0 0 ${s * 0.06}px ${statusColor}`,
            }}
          />
        </div>
        {/* 身体下方两排小散热孔 */}
        {[0, 1].map((row) =>
          [0, 1, 2].map((col) => (
            <div
              key={`v-${String(row)}-${String(col)}`}
              style={{
                ...BOX,
                left: s * 0.5 - s * 0.075 + col * s * 0.06,
                top: s * 0.36 + row * s * 0.07,
                width: s * 0.03,
                height: Math.max(2, s * 0.018),
                borderRadius: s,
                backgroundColor: C.mint,
                opacity: 0.75,
              }}
            />
          )),
        )}
      </div>
    </div>
  );
};

/** 柔光圆：径向渐变的"打光"，用来给角色或卡片托底。 */
export const Halo = ({
  size,
  color,
  opacity = 0.55,
  style,
}: {
  readonly size: number;
  readonly color: string;
  readonly opacity?: number;
  readonly style?: CSSProperties;
}) => (
  <div
    style={{
      ...BOX,
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle at 50% 45%, ${color} 0%, ${color}00 68%)`,
      opacity,
      pointerEvents: "none",
      ...style,
    }}
  />
);

/**
 * 对勾 / 叉：几根圆头短棒拼出来，薄荷绿与红色。
 * 对勾的两根棒在"V"的折点相交；叉的两根棒绕中心旋转 ±45°。
 */
export const Mark = ({
  size,
  ok,
  thickness = 0.18,
}: {
  readonly size: number;
  readonly ok: boolean;
  readonly thickness?: number;
}) => {
  const color = ok ? C.mint : C.red;
  const t = Math.max(3, size * thickness);

  if (ok) {
    // 折点 J = (0.44, 0.60)，短臂回到 (0.20, 0.44)，长臂伸到 (0.84, 0.22)。
    const joint = { x: size * 0.44, y: size * 0.6 };
    const arm = (dx: number, dy: number) => ({
      len: Math.sqrt(dx * dx + dy * dy) * size,
      deg: (Math.atan2(dy, dx) * 180) / Math.PI,
    });
    const short = arm(-0.24, -0.16);
    const long = arm(0.4, -0.38);

    return (
      <div style={{ ...BOX, width: size, height: size }}>
        <div
          style={{
            ...BOX,
            left: joint.x,
            top: joint.y - t / 2,
            width: short.len + t,
            height: t,
            borderRadius: 999,
            backgroundColor: color,
            rotate: `${short.deg}deg`,
            transformOrigin: "0 50%",
            boxShadow: `0 ${t * 0.22}px 0 ${color}3a`,
          }}
        />
        <div
          style={{
            ...BOX,
            left: joint.x - t / 2,
            top: joint.y - t / 2,
            width: long.len + t,
            height: t,
            borderRadius: 999,
            backgroundColor: color,
            rotate: `${long.deg}deg`,
            transformOrigin: "0 50%",
            boxShadow: `0 ${t * 0.22}px 0 ${color}3a`,
          }}
        />
      </div>
    );
  }

  const armLen = size * 0.62;
  const cross = (deg: number) => (
    <div
      style={{
        ...BOX,
        left: size * 0.5 - armLen / 2,
        top: size * 0.5 - t / 2,
        width: armLen,
        height: t,
        borderRadius: 999,
        backgroundColor: color,
        rotate: `${deg}deg`,
        boxShadow: `0 ${t * 0.22}px 0 ${color}3a`,
      }}
    />
  );

  return (
    <div style={{ ...BOX, width: size, height: size }}>
      {cross(45)}
      {cross(-45)}
    </div>
  );
};
