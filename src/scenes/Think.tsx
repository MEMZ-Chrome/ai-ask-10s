import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Bot, Halo } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { Sparkles, clamp01 } from "../components/fx";
import { Caption, Header } from "../components/ui";
import { useFonts } from "../lib/font";
import { C } from "../lib/theme";
import type { SceneProps } from "./types";

/**
 * 04 打个草稿 — 195 frames.
 *
 *  Sticky notes pop out of the robot's head one by one (soft spring, slight
 *  rotation, then a gentle floating loop) and settle into a two-column
 *  "scratchpad" on the right. The notes are the draft lines; the counter on
 *  the left ticks 0 → 60 tokens, and every few tokens one draft line lights
 *  up, linking "写好这段草稿" to "花掉的时间".
 */

const NOTES = [
  "请假邮件，要简短",
  "收件人：领导",
  "语气礼貌，别啰嗦",
  "称呼 + 时间 + 原因",
  "加一句抱歉",
  "可以开始写了",
] as const;

const NOTE_COLORS: readonly { readonly c: string; readonly s: string }[] = [
  { c: C.butter, s: C.butterSoft },
  { c: C.sky, s: C.skySoft },
  { c: C.mint, s: C.mintSoft },
  { c: C.lilac, s: C.lilacSoft },
  { c: C.pink, s: C.pinkSoft },
  { c: C.peach, s: C.peachSoft },
];

/* timeline */

const NOTE_AT = 14;
const NOTE_STEP = 22;
const COUNTER_AT = 10;
const COUNTER_TOKENS = 60;
const COUNTER_LEN = 150;
const CALL1_AT = 30;
const CALL2_AT = 96;
const CALL3_AT = 156;
const CAPTION_AT = 10;

/* layout */

const BOT = { x: 430, y: 316, size: 250 };
/** the robot's head, where the notes come from */
const EMIT = { x: BOT.x + BOT.size * 0.5, y: BOT.y + BOT.size * 0.42 };

const NOTE = { w: 320, h: 96 };
/** two columns of sticky notes on the right */
const COL_X = [1150, 1520];
const ROW_Y = [252, 400, 548];

const COUNTER = { x: 176, y: 300, w: 250 };

/** callout anchors: on the first sticky note's left edge, under the robot, at the last note */
const POS1 = { x: 998, y: 252 };
const POS2 = { x: 500, y: 690 };
const POS3 = { x: 1332, y: 548 };

/* helpers */

const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const fade = (frame: number, at: number, dur = 10) => easeOut((frame - at) / dur);

/** springy scale with a small overshoot, clamped so it settles softly */
const pop = (frame: number, at: number) => {
  const t = (frame - at) / 16;

  if (t <= 0) {
    return 0;
  }

  if (t >= 1) {
    return 1;
  }

  return 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 1.15);
};

const Callout = ({
  text,
  x,
  y,
  rot = 0,
  len = 56,
  opacity,
  grow = 1,
  accent = C.sky,
  zIndex = 6,
}: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly rot?: number;
  readonly len?: number;
  readonly opacity: number;
  readonly grow?: number;
  readonly accent?: string;
  readonly zIndex?: number;
}) => {
  if (opacity <= 0.001) {
    return null;
  }

  const rad = (rot * Math.PI) / 180;
  const l = len * easeOut(grow);
  const ex = x + Math.cos(rad) * l;
  const ey = y + Math.sin(rad) * l;
  const textIn = easeOut((grow - 0.4) / 0.6);

  const pos: CSSProperties =
    rot === 0
      ? { left: ex + 16, top: y - 17, translate: "0px", textAlign: "left" }
      : rot === 180
        ? { left: ex - 16, top: y - 17, translate: "-100%", textAlign: "right" }
        : rot === 90
          ? { left: ex - 46, top: ey + 16, translate: "0px", textAlign: "left" }
          : { left: ex - 46, top: ey - 16, translate: "0px -100%", textAlign: "left" };

  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity, pointerEvents: "none", zIndex }}>
      <div
        style={{
          position: "absolute",
          left: Math.min(x, ex),
          top: Math.min(y, ey),
          width: Math.max(3, Math.abs(ex - x)),
          height: Math.max(3, Math.abs(ey - y)),
          borderRadius: 3,
          backgroundColor: C.muted,
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 8,
          top: y - 8,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: C.card,
          border: `3.5px solid ${accent}`,
          boxShadow: `0 0 0 6px ${accent}1f`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: pos.left,
          top: pos.top,
          fontSize: 26,
          lineHeight: 1.32,
          fontWeight: 700,
          color: C.inkSoft,
          whiteSpace: "nowrap",
          textAlign: pos.textAlign,
          opacity: textIn,
          translate: pos.translate,
          textShadow: "0 2px 10px rgba(255,255,255,0.95)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Think = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const tokens = Math.round(clamp01((frame - COUNTER_AT) / COUNTER_LEN) * COUNTER_TOKENS);

  const done = tokens >= COUNTER_TOKENS;

  return (
    <>
      <Background />
      <Hud realSeconds={Math.min(10, start + frame / (10 * fps))} />
      <Header step="4" title="打个草稿再写" />

      {/* the robot */}
      <Halo
        size={560}
        color={C.butter}
        opacity={0.34 + 0.08 * Math.sin(frame / 16)}
        style={{ left: EMIT.x - 280, top: EMIT.y - 140 - 280 }}
      />
      <div style={{ position: "absolute", left: BOT.x, top: BOT.y }}>
        <div
          style={{
            position: "absolute",
            left: BOT.size * 0.18,
            top: BOT.size * 1.16,
            width: BOT.size * 0.64,
            height: 22,
            borderRadius: "50%",
            backgroundColor: C.lineStrong,
            opacity: 0.45,
          }}
        />
        <Bot
          size={BOT.size}
          mood={done ? "happy" : "think"}
          frame={frame}
          style={{ scale: `${1 + 0.03 * Math.sin(frame / 10)}` }}
        />
        {/* the little "..." bubble above the head */}
        <div
          style={{
            position: "absolute",
            left: BOT.size * 0.72,
            top: -26,
            display: "flex",
            gap: 8,
            opacity: fade(frame, NOTE_AT - 4, 8),
          }}
        >
          {[0, 1, 2].map((i) => {
            const w = Math.max(0, Math.sin(frame / 5 - i * 0.9));

            return (
              <div
                key={String(i)}
                style={{
                  width: 12 + w * 4,
                  height: 12 + w * 4,
                  borderRadius: "50%",
                  backgroundColor: C.butter,
                  opacity: 0.5 + 0.5 * w,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* sticky notes: fly out of the head, settle in a two-column scratchpad */}
      {NOTES.map((text, i) => {
        const pal = NOTE_COLORS[i] ?? NOTE_COLORS[0];

        const at = NOTE_AT + i * NOTE_STEP;

        const col = i % 2;

        const row = Math.floor(i / 2);

        const tx = (COL_X[col] ?? 1150) - NOTE.w / 2;

        const ty = (ROW_Y[row] ?? 252) - NOTE.h / 2;

        const sx = EMIT.x - NOTE.w / 2;

        const sy = EMIT.y - NOTE.h / 2;

        const fly = easeOut((frame - at) / 18);

        const s = pop(frame, at);

        if (frame < at) {
          return null;
        }

        const x = sx + (tx - sx) * fly;

        const y = sy + (ty - sy) * fly - Math.sin(Math.PI * fly) * 60;

        const restTilt = (i % 2 === 0 ? -1 : 1) * (1.6 + (i % 3) * 0.8);

        const floatY = Math.sin(frame / 26 + i * 1.4) * 5 * fly;

        const lit = tokens > 0 && tokens >= Math.round(((i + 1) / NOTES.length) * COUNTER_TOKENS);

        return (
          <div
            key={text}
            style={{
              position: "absolute",
              left: x,
              top: y + floatY,
              width: NOTE.w,
              height: NOTE.h,
              borderRadius: 22,
              backgroundColor: pal?.s,
              border: `3px solid ${pal?.c}`,
              boxShadow: `0 10px 0 ${pal?.c}33${lit ? `, 0 0 26px ${pal?.c}66` : ""}`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 22px",
              boxSizing: "border-box",
              opacity: fly,
              scale: `${0.5 + 0.5 * s}`,
              rotate: `${restTilt * fly}deg`,
            }}
          >
            {/* the "pin" corner of the sticky note */}
            <div
              style={{
                position: "absolute",
                right: 14,
                top: 12,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: pal?.c,
                opacity: 0.75,
              }}
            />
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                backgroundColor: pal?.c,
                color: C.card,
                fontSize: 20,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{text}</span>
          </div>
        );
      })}

      {/* token counter */}
      <div
        style={{
          position: "absolute",
          left: COUNTER.x,
          top: COUNTER.y,
          width: COUNTER.w,
          opacity: fade(frame, COUNTER_AT, 10),
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>草稿用了</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
          <span
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1,
              color: done ? C.mint : C.butter,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -2,
            }}
          >
            {tokens}
          </span>
          <span style={{ fontSize: 26, fontWeight: 700, color: C.inkSoft }}>个 token</span>
        </div>
        <div
          style={{
            marginTop: 14,
            height: 16,
            borderRadius: 8,
            backgroundColor: C.card,
            border: `2.5px solid ${C.line}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${(tokens / COUNTER_TOKENS) * 100}%`,
              height: "100%",
              borderRadius: 8,
              background: `linear-gradient(90deg, ${C.butter}, ${C.mint})`,
            }}
          />
        </div>
      </div>

      <Sparkles
        frame={frame}
        at={NOTE_AT + (NOTES.length - 1) * NOTE_STEP + 6}
        cx={EMIT.x + 10}
        cy={EMIT.y + 30}
        count={12}
        radius={120}
        seed="think-emit"
        size={11}
      />

      {/* callouts */}
      <Callout
        text="这些草稿，只给模型自己看"
        x={POS1.x}
        y={POS1.y}
        rot={180}
        len={60}
        opacity={fade(frame, CALL1_AT, 8)}
        grow={easeOut((frame - CALL1_AT) / 14)}
        accent={C.butter}
      />
      <Callout
        text="想得越多，那 10 秒越不够用"
        x={POS2.x}
        y={POS2.y}
        rot={180}
        len={38}
        opacity={fade(frame, CALL2_AT, 8)}
        grow={easeOut((frame - CALL2_AT) / 14)}
        accent={C.mint}
      />
      <Callout
        text="草稿写完，才开始正式回信"
        x={POS3.x}
        y={POS3.y}
        rot={90}
        len={44}
        opacity={fade(frame, CALL3_AT, 8) * (done ? 1 : 0)}
        grow={easeOut((frame - CALL3_AT) / 14)}
        accent={C.sky}
      />

      <div style={{ opacity: fade(frame, CAPTION_AT, 10), translate: `0px ${(1 - fade(frame, CAPTION_AT, 10)) * 12}px` }}>
        <Caption>先在心里打一遍草稿，也要花时间</Caption>
      </div>
    </>
  );
};
