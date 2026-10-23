import type { CSSProperties, ReactNode } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Bot, Halo } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { Sparkles, clamp01 } from "../components/fx";
import { Caption } from "../components/ui";
import { useFonts } from "../lib/font";
import { C } from "../lib/theme";
import type { SceneProps } from "./types";

/**
 * 00 按下发送 — 135 frames.
 *
 *  A chat window in the top-left: someone types 「帮我写一封简短的请假邮件」,
 *  presses send, and the bubble leaves the panel and flies down into the
 *  robot's head. The robot pops up to catch it, the bubble squeezes in with a
 *  small rebound, the reply bubble with three dots appears and the clock starts.
 *
 *  Everything is a pure function of the frame (no CSS transitions).
 */

const QUESTION = "帮我写一封简短的请假邮件";

const PANEL_AT = 2;
const TYPE_START = 6;
const TYPE_GAP = 5; // a key every 5 frames — matches the "key" sfx cues
const TYPE_END = TYPE_START + QUESTION.length * TYPE_GAP; // 46
const SEND_FILL = 4;
const SEND_AT = TYPE_END + SEND_FILL; // 50
const FLIGHT = 58; // panel → robot
const CATCH = SEND_AT + FLIGHT; // 108
const BOT_HOP_AT = CATCH - 8;
const THINK_AT = CATCH + 2; // 110
const DIAL_AT = CATCH + 3;
const CALL1_AT = 40;
const CALL2_AT = 12;
const CALL3_AT = THINK_AT + 4;
const CAPTION_AT = 6;

/* layout */

/** chat window, top-left — the bottom half stays free for the robot */
const PANEL = { x: 150, y: 196, w: 620, h: 410 };

const BOT = 230;
/** resting place of the robot: head centre ~ (1010, 642) */
const BOT_IDLE = { x: 900, y: 536 };
const HOP_DX = 44;
const HOP_DY = -46;

/** input row inside the panel */
const ROW = { y: 514, w: PANEL.w - 48, h: 72 };

const TOKEN_W = 40; // advance per character at 42px
const BUBBLE_FULL = TOKEN_W * QUESTION.length + 2 * 46; // 596
const BUBBLE_START = { x: PANEL.x + 30, y: ROW.y + 5 };

/** where the bubble's tail stops: just short of the head's right edge */
const LAND_TIP_X = 1138;
const LAND_Y = 632;

const DIAL = { x: 400, y: 700, w: 320, size: 150 };

const CALL1 = { x: 700, y: 516 };
const CALL2 = { x: 1354, y: 520 };
const CALL3 = { x: 1130, y: 816 };

/* helpers */

const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

const fade = (frame: number, at: number, dur = 10) => easeOut((frame - at) / dur);

const pop = (frame: number, at: number, dur = 18) =>
  spring({
    fps: 30,
    frame,
    config: { damping: 17, stiffness: 190, mass: 0.7, overshootClamping: true },
    delay: at,
    durationInFrames: dur,
  });

const hop = (frame: number, at: number, dur = 20) => Math.sin(Math.PI * clamp01((frame - at) / dur));

/**
 * Diagram callout: a thin leader grows out of the anchor dot, then one short
 * line of text fades in at its tip. No boxes — it reads like a diagram label.
 */
const Callout = ({
  text,
  x,
  y,
  rot = 0,
  len = 56,
  opacity,
  grow = 1,
  accent = C.sky,
  size = 26,
}: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  /** 0 = right, 90 = down, 180 = left, -90 = up */
  readonly rot?: number;
  readonly len?: number;
  readonly opacity: number;
  readonly grow?: number;
  readonly accent?: string;
  readonly size?: number;
}) => {
  if (opacity <= 0.001) {
    return null;
  }

  const rad = (rot * Math.PI) / 180;
  const l = len * easeOut(grow);
  const ex = x + Math.cos(rad) * l;
  const ey = y + Math.sin(rad) * l;
  const textIn = easeOut((grow - 0.4) / 0.6);

  const textPos: CSSProperties =
    rot === 0
      ? { left: ex + 16, top: y - size * 0.65, textAlign: "left" }
      : rot === 180
        ? { left: ex - 16, top: y - size * 0.65, translate: "-100% 0", textAlign: "right" }
        : rot === 90
          ? { left: ex - 46, top: ey + 16, textAlign: "left" }
          : { left: ex - 46, top: ey - 16, translate: "0 -100%", textAlign: "left" };

  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity, pointerEvents: "none" }}>
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
          ...textPos,
          fontSize: size,
          lineHeight: 1.32,
          fontWeight: 700,
          color: C.inkSoft,
          whiteSpace: "nowrap",
          opacity: textIn,
          translate: `${textPos.translate ?? ""} ${(1 - textIn) * 8}px`,
          textShadow: "0 2px 10px rgba(255,255,255,0.95)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Intro = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const chars = Math.max(0, Math.min(QUESTION.length, Math.floor((frame - TYPE_START) / TYPE_GAP) + 1));
  const typingNow = frame >= TYPE_START && frame < SEND_AT;

  const press = clamp01((frame - SEND_AT) / SEND_FILL) * (1 - clamp01((frame - SEND_AT - 3) / 4));

  const sent = clamp01((frame - SEND_AT) / FLIGHT);

  const caught = clamp01((frame - CATCH) / 12);

  const hopT = hop(frame, BOT_HOP_AT, 30);

  const bob = Math.sin(frame / 11);

  /* the flying bubble: eased along a gentle arc into the robot's mouth */
  const t = easeInOut(sent);

  const tipX = BUBBLE_START.x + BUBBLE_FULL + (LAND_TIP_X - BUBBLE_START.x - BUBBLE_FULL) * t;

  const bubbleY = BUBBLE_START.y + (LAND_Y - BUBBLE_START.y) * t - Math.sin(Math.PI * t) * 120;

  const squash = caught > 0 ? Math.sin(Math.PI * caught) * 0.82 : 0;

  const ripple = caught > 0 ? Math.sin(Math.PI * caught) : 0;

  const panelIn = fade(frame, PANEL_AT, 12);

  const replyIn = fade(frame, THINK_AT, 10);

  return (
    <>
      <Background />
      <Hud realSeconds={Math.min(10, start + frame / (10 * fps))} />

      {/* title */}
      <div style={{ position: "absolute", left: 150, top: 100, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: C.muted, letterSpacing: 2 }}>提问后</span>
        <span
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1,
            color: C.sky,
            display: "inline-block",
            scale: `${0.84 + 0.16 * pop(frame, 4, 24)}`,
            translate: `0px ${Math.sin(frame / 13) * 2.5}px`,
          }}
        >
          10 秒
        </span>
      </div>

      {/* chat panel */}
      <div
        style={{
          position: "absolute",
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          height: PANEL.h,
          borderRadius: 38,
          backgroundColor: C.card,
          border: `3px solid ${C.line}`,
          boxShadow: "0 12px 0 rgba(199, 218, 240, 0.4), 0 26px 60px rgba(72, 168, 245, 0.12)",
          opacity: panelIn,
          translate: `0px ${(1 - panelIn) * 22}px`,
        }}
      >
        {/* window chrome */}
        <div style={{ position: "absolute", left: 26, top: 20, display: "flex", alignItems: "center", gap: 10 }}>
          {[C.pink, C.butter, C.mint].map((c, i) => (
            <div key={String(i)} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: `${c}aa` }} />
          ))}
          <div style={{ marginLeft: 10, fontSize: 22, color: C.muted, fontWeight: 700 }}>和小机器人的对话</div>
        </div>

        {/* the question, once it has been sent */}
        <div
          style={{
            position: "absolute",
            right: 26,
            top: 58,
            height: 50,
            padding: "0 22px",
            borderRadius: 18,
            backgroundColor: C.skySoft,
            border: `3px solid ${C.sky}`,
            display: "flex",
            alignItems: "center",
            fontSize: 26,
            fontWeight: 700,
            color: C.ink,
            whiteSpace: "nowrap",
            opacity: caught,
            scale: `${0.92 + 0.08 * caught}`,
          }}
        >
          {QUESTION}
        </div>

        {/* the robot's reply */}
        <div
          style={{
            position: "absolute",
            left: 26,
            top: 124,
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: replyIn,
            translate: `0px ${(1 - replyIn) * 10}px`,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              background: `linear-gradient(150deg, ${C.mint}, ${C.sky})`,
              border: `3px solid ${C.card}`,
              boxShadow: `0 6px 14px ${C.sky}44`,
            }}
          />
          <div
            style={{
              height: 60,
              padding: "0 24px",
              borderRadius: 20,
              backgroundColor: C.mintSoft,
              border: `3px solid ${C.mint}`,
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            {[0, 1, 2].map((i) => {
              const w = Math.max(0, Math.sin(frame / 5 - i * 0.9));

              const appeared = fade(frame, THINK_AT + i * 3, 4);

              return (
                <div
                  key={String(i)}
                  style={{
                    width: 13 + w * 3,
                    height: 13 + w * 3,
                    borderRadius: "50%",
                    backgroundColor: C.mint,
                    opacity: appeared * (0.45 + 0.55 * w),
                    translate: `0px ${-w * 5}px`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* input row */}
        <div
          style={{
            position: "absolute",
            left: 24,
            top: ROW.y - PANEL.y,
            width: ROW.w,
            height: ROW.h,
            borderRadius: 26,
            backgroundColor: C.bg,
            border: `3px solid ${C.skySoft}`,
          }}
        />

        {/* typed text + caret */}
        <div
          style={{
            position: "absolute",
            left: 26,
            top: ROW.y - PANEL.y,
            height: ROW.h,
            display: "flex",
            alignItems: "center",
            fontSize: 42,
            fontWeight: 700,
            color: C.ink,
            whiteSpace: "pre",
            opacity: 1 - fade(frame, SEND_AT, 5),
          }}
        >
          {QUESTION.slice(0, Math.max(0, chars))}
          <div
            style={{
              width: 3,
              height: 40,
              marginLeft: 2,
              borderRadius: 2,
              backgroundColor: C.sky,
              opacity: typingNow ? (Math.floor(frame / 4) % 2 === 0 ? 1 : 0.25) : 1,
            }}
          />
        </div>

        {/* send button */}
        <div
          style={{
            position: "absolute",
            left: ROW.w - 84,
            top: ROW.y - PANEL.y + 7,
            width: 84,
            height: 58,
            borderRadius: 20,
            backgroundColor: frame >= TYPE_END ? C.sky : `${C.sky}55`,
            boxShadow:
              frame >= TYPE_END
                ? `0 ${10 - press * 5}px 0 rgba(72, 168, 245, 0.32), 0 0 ${20 + 14 * Math.abs(Math.sin(frame / 4))}px ${C.sky}55`
                : "0 10px 0 rgba(72, 168, 245, 0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            translate: `0px ${press * 5}px`,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `13px solid ${C.card}`,
              borderTop: "9px solid transparent",
              borderBottom: "9px solid transparent",
              translate: "3px 0px",
            }}
          />
        </div>
      </div>

      {/* the flying bubble */}
      {frame >= SEND_AT ? (
        <div
          style={{
            position: "absolute",
            left: tipX - BUBBLE_FULL,
            top: bubbleY,
            width: BUBBLE_FULL,
            height: 62,
            borderRadius: 22,
            backgroundColor: C.skySoft,
            border: `3px solid ${C.sky}`,
            boxShadow: "0 8px 0 rgba(72, 168, 245, 0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 700,
            color: C.ink,
            whiteSpace: "nowrap",
            scale: `${1 - 0.16 * squash} ${1 + 0.1 * squash}`,
            rotate: `${-6 * Math.sin(Math.PI * t) * (1 - t)}deg`,
            opacity: 1 - 0.82 * ripple,
          }}
        >
          {QUESTION}
          <div
            style={{
              position: "absolute",
              right: -17,
              top: 29,
              width: 0,
              height: 0,
              borderTop: "12px solid transparent",
              borderBottom: "12px solid transparent",
              borderLeft: `18px solid ${C.sky}`,
            }}
          />
        </div>
      ) : null}

      {/* the robot */}
      <Halo
        size={520}
        color={frame > THINK_AT ? C.mint : C.sky}
        opacity={0.36 + 0.08 * Math.sin(frame / 14)}
        style={{ left: 1010 - 260, top: 660 - 260 }}
      />
      <div
        style={{
          position: "absolute",
          left: BOT_IDLE.x + BOT * 0.18,
          top: BOT_IDLE.y + BOT * 1.16,
          width: BOT * 0.64,
          height: 24,
          borderRadius: "50%",
          backgroundColor: C.lineStrong,
          opacity: 0.5 - 0.2 * hopT,
          scale: `${1 - 0.12 * hopT}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: BOT_IDLE.x,
          top: BOT_IDLE.y,
          translate: `${HOP_DX * hopT}px ${HOP_DY * hopT + (1 - hopT) * bob * 2}px`,
          scale: `${1 + 0.005 * bob} ${1 + 0.06 * hopT}`,
          transformOrigin: "50% 100%",
        }}
      >
        <Bot size={BOT} mood={frame > THINK_AT ? "think" : "idle"} frame={frame} />
      </div>
      <Sparkles frame={frame} at={CATCH} cx={1120} cy={LAND_Y} count={14} radius={130} seed="intro-catch" size={12} />
      <div
        style={{
          position: "absolute",
          left: 1120 - 44,
          top: LAND_Y - 44,
          width: 88,
          height: 88,
          borderRadius: "50%",
          border: `4px solid ${C.mint}`,
          opacity: (1 - caught) * 0.8,
          scale: `${0.35 + caught * 2.6}`,
        }}
      />

      {/* countdown dial */}
      <div
        style={{
          position: "absolute",
          left: DIAL.x,
          top: DIAL.y,
          width: DIAL.w,
          display: "flex",
          alignItems: "center",
          gap: 18,
          opacity: fade(frame, DIAL_AT, 10),
          translate: `0px ${(1 - fade(frame, DIAL_AT, 10)) * 16}px`,
        }}
      >
        <div style={{ position: "relative", width: DIAL.size, height: DIAL.size, flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              backgroundColor: C.card,
              border: `4px solid ${C.line}`,
              boxShadow: "0 8px 0 rgba(199, 218, 240, 0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 5,
              borderRadius: "50%",
              background: `conic-gradient(${C.sky} ${((frame - DIAL_AT) * 9) % 360}deg, transparent 0)`,
            }}
          />
          <div style={{ position: "absolute", inset: 17, borderRadius: "50%", backgroundColor: C.card }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: C.ink,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              0.0
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.sky }}>秒</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.inkSoft }}>开始计时</div>
          <div style={{ marginTop: 4, fontSize: 22, color: C.muted }}>慢放</div>
        </div>
      </div>

      {/* callouts */}
      <Callout
        text="每敲一个字，都算 1 个 token"
        x={CALL1.x}
        y={CALL1.y}
        rot={-90}
        len={64}
        opacity={fade(frame, CALL1_AT, 8)}
        grow={easeOut((frame - CALL1_AT) / 14)}
        accent={C.sky}
      />
      <Callout
        text="小机器人空闲着，等你发话"
        x={CALL2.x}
        y={CALL2.y}
        rot={0}
        len={84}
        opacity={fade(frame, CALL2_AT, 8)}
        grow={easeOut((frame - CALL2_AT) / 14)}
        accent={C.mint}
      />
      <Callout
        text="接住消息，倒计时开始"
        x={CALL3.x}
        y={CALL3.y}
        rot={90}
        len={56}
        opacity={fade(frame, CALL3_AT, 8)}
        grow={easeOut((frame - CALL3_AT) / 14)}
        accent={C.butter}
      />

      <div style={{ opacity: fade(frame, CAPTION_AT, 10), translate: `0px ${(1 - fade(frame, CAPTION_AT, 10)) * 12}px` }}>
        <Caption>按下发送的那一刻，倒计时开始</Caption>
      </div>
    </>
  );
};

/** Kept so the barrel export list stays stable for the Studio. */
export type IntroLabel = ReactNode;
