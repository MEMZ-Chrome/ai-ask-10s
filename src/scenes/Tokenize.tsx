import { useCurrentFrame, useVideoConfig } from "remotion";
import { Bot, Halo } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { Sparkles, clamp01 } from "../components/fx";
import { Caption, Header } from "../components/ui";
import { useFonts } from "../lib/font";
import { C } from "../lib/theme";
import type { SceneProps } from "./types";

/**
 * 01 切成小词 — 225 frames.
 *
 *  1. The sentence on the paper is cut into 8 pieces: the scissors travel
 *     along the cut and a pink ripple runs behind them.
 *  2. The pieces hop into a row and squeeze together (≤ 3 characters can
 *     already be one token, so 「帮我写」 and 「一封简短」 each become one chip).
 *  3. Every chip flips over to its number in the 100k vocabulary, the meter
 *     tops out at 100k and the robot points at 「请假」.
 */

const TOKENS = ["帮", "我", "写", "一封", "简短", "的", "请假", "邮件"];

const IDS = [3128, 19, 1024, 3380, 7654, 21, 9182, 7365];

const PALETTE: readonly { readonly c: string; readonly s: string }[] = [
  { c: C.sky, s: C.skySoft },
  { c: C.sky, s: C.skySoft },
  { c: C.sky, s: C.skySoft },
  { c: C.butter, s: C.butterSoft },
  { c: C.butter, s: C.butterSoft },
  { c: C.mint, s: C.mintSoft },
  { c: C.pink, s: C.pinkSoft },
  { c: C.lilac, s: C.lilacSoft },
];

/* timeline (30 fps) */

const PAPER_AT = 2;
const SNIP_AT = 16;
const SNIP_STEP = 4; // the scissors reach gap k at SNIP_AT + k * SNIP_STEP
const LIFT_AT = 60;
const FLIGHT = 24;
const CLOSE_AT = 100;
const FLIP_AT = 118;
const FLIP_STEP = 10;
const FLIP_LEN = 20;
const IDS_AT = 128;
const IDS_LEN = 56;
const POINT_AT = 190;
const CALL_1 = 26;
const CALL_2 = 126;
const CALL_3 = 196;
const CAPTION_AT = 8;

/* layout */

/** centre of character i on the paper */
const X = (i: number) => 189 + i * 104;
const CH = 104;
/** top-left of the paper's text */
const TX = X(0) - CH / 2;
const TY = 292;

const PAPER = { x: 165, y: 232, w: 846, h: 272 };

const ROW_Y = 520;
const CHIP = 88;

/** word boundaries: gap k sits before character BOUNDARIES[k] */
const BOUNDARIES = [0, 1, 2, 3, 5, 6, 8];

/** merged row: 8 chips of 100px with small gaps, centres at 707 … 1267 */
const ROW_X0 = 707;
const ROW_STEP = 80;

const METER = { x: 1238, y: 236, w: 482 };

const BOT_BOX = { x: 1586, y: 452 };
const BOT_SIZE = 172;
const HEAD = { x: BOT_BOX.x, y: BOT_BOX.y + BOT_SIZE * 0.2, d: BOT_SIZE };

const CALL1 = { x: 1036, y: 312 };
const CALL2 = { x: 1078, y: 592 };
const CALL3 = { x: 1278, y: 752 };

/* helpers */

const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

const fade = (frame: number, at: number, dur = 10) => easeOut((frame - at) / dur);

const hop = (frame: number, at: number, dur = 20) => Math.sin(Math.PI * clamp01((frame - at) / dur));

const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

/**
 * Diagram callout: a thin leader grows out of the anchor dot, then one short
 * line of text fades in at its tip.
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

  const pos =
    rot === 0
      ? { left: ex + 16, top: y - size * 0.65, translate: "0px", textAlign: "left" as const }
      : rot === 180
        ? { left: ex - 16, top: y - size * 0.65, translate: "-100%", textAlign: "right" as const }
        : rot === 90
          ? { left: ex - 46, top: ey + 16, translate: "0px", textAlign: "left" as const }
          : { left: ex - 46, top: ey - 16, translate: "0px -100%", textAlign: "left" as const };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        opacity,
        pointerEvents: "none",
        // the label sits above the paper that fades out underneath it
        zIndex: 5,
      }}
    >
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
          fontSize: size,
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

export const Tokenize = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const paperIn = fade(frame, PAPER_AT, 12);

  const paperOut = 1 - fade(frame, LIFT_AT + 6, 12);

  const charDim = fade(frame, LIFT_AT, 14);

  return (
    <>
      <Background />
      <Hud realSeconds={start + frame / fps} />
      <Header step="1" title="切成小词" />

      {/* paper with the sentence */}
      <div
        style={{
          position: "absolute",
          left: PAPER.x,
          top: PAPER.y,
          width: PAPER.w,
          height: PAPER.h,
          borderRadius: 34,
          backgroundColor: C.card,
          border: `3px solid ${C.line}`,
          boxShadow: "0 12px 0 rgba(199, 218, 240, 0.4), 0 26px 60px rgba(72, 168, 245, 0.12)",
          opacity: paperIn * paperOut,
          translate: `0px ${(1 - paperIn) * 22}px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: TX - PAPER.x,
            top: TY - PAPER.y,
            fontSize: 70,
            fontWeight: 700,
            lineHeight: `${CH}px`,
            color: C.ink,
            whiteSpace: "nowrap",
            opacity: 1 - 0.85 * charDim,
          }}
        >
          {TOKENS.map((t, i) => (
            <span
              key={`c-${String(i)}`}
              style={{
                display: "inline-block",
                width: CH,
                textAlign: "center",
                opacity: fade(frame, PAPER_AT + 3 + i * 2, 8),
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 26,
            top: 188,
            right: 26,
            height: 2,
            backgroundImage: `repeating-linear-gradient(90deg, ${C.lineStrong} 0 10px, transparent 10px 20px)`,
            opacity: 1 - charDim,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 28,
            bottom: 20,
            fontSize: 24,
            fontWeight: 700,
            color: C.faint,
            opacity: 1 - charDim,
          }}
        >
          8 个字
        </div>
        <div
          style={{
            position: "absolute",
            right: 28,
            bottom: 20,
            fontSize: 24,
            fontWeight: 700,
            color: C.mint,
            opacity: fade(frame, CLOSE_AT, 12),
          }}
        >
          8 个 token
        </div>
      </div>

      {/* cut ripples: one per word boundary */}
      {BOUNDARIES.map((b, k) => {
        const at = SNIP_AT + k * SNIP_STEP + 1;

        if (frame < at) {
          return null;
        }

        const grow = easeOut((frame - at) / 7);

        const gone = 1 - fade(frame, at + 16, 14);

        const cx = b === 8 ? X(7) + CH / 2 : X(b) - CH / 2;

        return (
          <div
            key={`cut-${String(b)}`}
            style={{
              position: "absolute",
              left: cx - 3,
              top: PAPER.y + 30,
              width: 6,
              height: (PAPER.h - 76) * grow,
              borderRadius: 3,
              backgroundColor: C.pink,
              opacity: 0.9 * gone,
            }}
          />
        );
      })}

      <Scissors frame={frame} />

      {/* the chips */}
      {TOKENS.map((t, i) => {
        const pal = PALETTE[i] ?? PALETTE[0];

        // word group index: 帮我写 is one group, 一封简短 is one group
        const group = i < 3 ? i : i < 5 ? 3 : i - 1;
        const centre = ROW_X0 + group * ROW_STEP + (i === 3 ? 12 : 0);

        const liftAt = LIFT_AT + i * 2;

        const lift = easeInOut((frame - liftAt) / FLIGHT);

        const flying = frame < liftAt + FLIGHT;

        const closeAt = CLOSE_AT + Math.abs(i - 3.5) * 2;

        const close = easeInOut((frame - closeAt) / 16);

        const bump = 1 + 0.12 * hop(frame, closeAt, 18);

        const flipAt = FLIP_AT + i * FLIP_STEP;

        const flip = easeInOut((frame - flipAt) / FLIP_LEN);

        const flat = Math.abs(Math.cos(Math.PI * flip));

        const showBack = flip >= 0.5;

        const x = flying ? X(i) : lerp(X(i), centre, close);

        const y = flying ? lerp(TY + CH / 2, ROW_Y, lift) - Math.sin(Math.PI * lift) * 120 : ROW_Y;

        const scale = flying ? lerp(1.18, 1, lift) : bump;

        return (
          <div
            key={`chip-${String(i)}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: CHIP,
              height: CHIP,
              translate: "-50% -50%",
              opacity: fade(frame, liftAt, 8),
              scale: `${scale}`,
            }}
          >
            <div
              style={{
                width: CHIP,
                height: CHIP,
                borderRadius: 27,
                backgroundColor: showBack ? C.card : pal.s,
                border: `3.5px solid ${pal.c}`,
                boxShadow: `0 8px 0 ${pal.c}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: showBack ? 0.3 + 0.7 * flat : 1,
                scale: `${showBack ? Math.max(0.25, flat) : 1} 1`,
              }}
            >
              {showBack ? (
                <span
                  style={{
                    fontSize: 25,
                    fontWeight: 700,
                    color: pal.c,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: -0.5,
                  }}
                >
                  {IDS[i]}
                </span>
              ) : (
                <span style={{ fontSize: 42, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{t}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* "3 个字 → 1 个 token" under the two merged groups */}
      {[
        { from: 0, to: 2 },
        { from: 3, to: 4 },
      ].map((g, gi) => {
        const at = CLOSE_AT + 6 + gi * 4;

        const a = fade(frame, at, 10);

        const gl = ROW_X0 + g.from * ROW_STEP - 48;

        const gr = ROW_X0 + g.to * ROW_STEP + 48;

        return (
          <div key={String(gi)} style={{ position: "absolute", left: 0, top: 0, opacity: a }}>
            <div
              style={{
                position: "absolute",
                left: gl,
                top: 574,
                width: (gr - gl) * easeOut((frame - at) / 10),
                height: 4,
                borderRadius: 2,
                backgroundColor: C.mint,
                opacity: 0.55,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: gl,
                top: 590,
                fontSize: 22,
                fontWeight: 700,
                color: C.muted,
                whiteSpace: "nowrap",
              }}
            >
              3 个字 → 1 个 token
            </div>
          </div>
        );
      })}

      {/* token counter — arrives once the paper has faded away */}
      <div style={{ position: "absolute", left: 137, top: METER.y, opacity: fade(frame, LIFT_AT + 22, 12) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span
            style={{
              fontSize: 104,
              fontWeight: 700,
              lineHeight: 1,
              color: C.mint,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -2,
            }}
          >
            8
          </span>
          <span style={{ fontSize: 30, fontWeight: 700, color: C.inkSoft }}>个 token</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: C.muted }}>整句话就是这 8 个小块</div>
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 10 }}>
          {["切得很细", "每个小块一个编号", "编号再变成数字"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, opacity: fade(frame, LIFT_AT + 40 + i * 6, 10) }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: [C.sky, C.mint, C.lilac][i] }} />
              <span style={{ fontSize: 22, fontWeight: 700, color: C.muted }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 100k vocabulary meter */}
      <div
        style={{
          position: "absolute",
          left: METER.x,
          top: METER.y,
          width: METER.w,
          opacity: fade(frame, IDS_AT - 8, 10),
          translate: `0px ${(1 - fade(frame, IDS_AT - 8, 10)) * 14}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: C.muted }}>词表大小</span>
          <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1, color: C.lilac, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(easeOut((frame - IDS_AT) / IDS_LEN) * 100)}k
          </span>
        </div>
        <div
          style={{
            marginTop: 16,
            height: 34,
            borderRadius: 17,
            backgroundColor: C.card,
            border: `3px solid ${C.line}`,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 3,
              top: 3,
              bottom: 3,
              width: `calc(${easeOut((frame - IDS_AT) / IDS_LEN) * 100}% - 6px)`,
              borderRadius: 13,
              background: `linear-gradient(90deg, ${C.sky}, ${C.lilac})`,
            }}
          />
        </div>
        <div style={{ marginTop: 12, height: 34, display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: C.lilac,
              opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 8)),
            }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>
            {easeOut((frame - IDS_AT) / IDS_LEN) >= 0.99 ? "每个词都有一个编号" : "100k 个编号，慢慢长"}
          </span>
        </div>
      </div>

      {/* robot: idle, then points at 「请假」 */}
      <div style={{ position: "absolute", left: BOT_BOX.x, top: BOT_BOX.y, width: BOT_SIZE, height: BOT_SIZE * 1.26 }}>
        <Halo
          size={430}
          color={C.mint}
          opacity={0.4 + 0.1 * Math.sin(frame / 14)}
          style={{ left: BOT_SIZE / 2 - 215, top: BOT_SIZE * 0.6 - 215 }}
        />
        <Bot
          size={BOT_SIZE}
          mood={frame > POINT_AT ? "happy" : "idle"}
          frame={frame}
          style={{ scale: `${1 + 0.05 * hop(frame, POINT_AT, 18)}` }}
        />
        <div
          style={{
            position: "absolute",
            left: -78,
            top: BOT_SIZE * 0.98,
            width: 92 * fade(frame, POINT_AT, 9),
            height: 14,
            borderRadius: 8,
            backgroundColor: C.ink,
            rotate: `${-8 + Math.sin(frame / 12) * 4}deg`,
            transformOrigin: "100% 50%",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -8,
              top: -2,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.ink,
            }}
          />
        </div>
        <Highlight frame={frame} left={HEAD.x - BOT_BOX.x} top={HEAD.y - BOT_BOX.y} d={HEAD.d} />
      </div>

      <Sparkles
        frame={frame}
        at={CLOSE_AT + 8}
        cx={(ROW_X0 + ROW_X0 + 7 * ROW_STEP) / 2}
        cy={ROW_Y}
        count={12}
        radius={140}
        seed="tok-close"
        size={11}
      />

      {/* callouts */}
      <Callout
        text="剪刀把句子切成 8 个小块"
        x={CALL1.x}
        y={CALL1.y}
        rot={90}
        len={110}
        opacity={fade(frame, CALL_1, 8) * (1 - fade(frame, LIFT_AT, 12))}
        grow={easeOut((frame - CALL_1) / 14)}
        accent={C.pink}
      />
      <Callout
        text="每个小块，就是 1 个 token"
        x={CALL2.x}
        y={CALL2.y}
        rot={90}
        len={44}
        opacity={fade(frame, CALL_2, 8)}
        grow={easeOut((frame - CALL_2) / 14)}
        accent={C.mint}
      />
      <Callout
        text="100k 词表：每个词对应一个编号"
        x={CALL3.x}
        y={CALL3.y}
        rot={180}
        len={92}
        opacity={fade(frame, CALL_3, 8)}
        grow={easeOut((frame - CALL_3) / 14)}
        accent={C.lilac}
      />

      <div style={{ opacity: fade(frame, CAPTION_AT, 10), translate: `0px ${(1 - fade(frame, CAPTION_AT, 10)) * 12}px` }}>
        <Caption>模型不认识字，只认识编号</Caption>
      </div>
    </>
  );
};

/* scissors */

const Scissors = ({ frame }: { readonly frame: number }) => {
  const t = clamp01((frame - SNIP_AT + 2) / ((BOUNDARIES.length - 1) * SNIP_STEP + 4));

  const x = lerp(TX - 70, TX + 8 * CH + 70, easeInOut(t));

  const snips = Math.sin(frame * 1.4);

  const fadeIn = fade(frame, SNIP_AT - 6, 6);

  const fadeOut = 1 - fade(frame, SNIP_AT + (BOUNDARIES.length - 1) * SNIP_STEP + 6, 9);

  if (frame < SNIP_AT - 6) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: PAPER.y - 92,
        width: 150,
        height: 170,
        opacity: fadeIn * fadeOut,
        translate: "-50% 0",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 14,
          top: 60,
          width: 58,
          height: 58,
          borderRadius: 29,
          border: `8px solid ${C.ink}`,
          backgroundColor: C.card,
          rotate: `${-14 + snips * 6}deg`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 60,
          width: 58,
          height: 58,
          borderRadius: 29,
          border: `8px solid ${C.ink}`,
          backgroundColor: C.card,
          rotate: `${14 - snips * 6}deg`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 60,
          width: 92,
          height: 14,
          borderRadius: 7,
          backgroundColor: C.inkSoft,
          rotate: `${-52 + snips * 8}deg`,
          transformOrigin: "0 50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 60,
          width: 92,
          height: 14,
          borderRadius: 7,
          backgroundColor: C.muted,
          rotate: `${-128 + snips * 8}deg`,
          transformOrigin: "0 50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 51,
          top: 51,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: C.pink,
          boxShadow: `0 0 0 5px ${C.pink}33`,
        }}
      />
    </div>
  );
};

/** Pulsing rings over the robot's screen while it points. */
const Highlight = ({
  frame,
  left,
  top,
  d,
}: {
  readonly frame: number;
  readonly left: number;
  readonly top: number;
  readonly d: number;
}) => {
  const on = fade(frame, POINT_AT, 8) * (1 - fade(frame, POINT_AT + 34, 18));

  const pulse = 0.5 + 0.5 * Math.sin(frame / 5);

  return (
    <div style={{ position: "absolute", left, top, width: d, height: d, opacity: on }}>
      {[0.26, 0.74].map((p) => (
        <div
          key={String(p)}
          style={{
            position: "absolute",
            left: d * p - 12 - pulse * 7,
            top: d * 0.5 - 12 - pulse * 7,
            width: 24 + pulse * 14,
            height: 24 + pulse * 14,
            borderRadius: "50%",
            border: `3.5px solid ${C.mint}`,
            opacity: 0.85 - pulse * 0.5,
          }}
        />
      ))}
    </div>
  );
};
