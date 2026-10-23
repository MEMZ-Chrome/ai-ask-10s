import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Bot } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { clamp01, easeOut } from "../components/fx";
import { Caption, Header } from "../components/ui";
import { useFonts } from "../lib/font";
import { ANSWER_START, FULL_ANSWER } from "../lib/answer";
import { C } from "../lib/theme";
import type { SceneProps } from "./types";

/* ------------------------------------------------------------------ */
/* local diagram callout (dot + optional leader + one short line)      */
/* ------------------------------------------------------------------ */
type Side = "up" | "down" | "left" | "right" | "none";

const Callout = ({
  a,
  x,
  y,
  text,
  color,
  side = "right",
  textAlign = "left",
  leader = 44,
  size = 26,
}: {
  readonly a: number;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly color: string;
  readonly side?: Side;
  readonly textAlign?: "left" | "center" | "right";
  readonly leader?: number;
  readonly size?: number;
}) => {
  if (a <= 0.002) {
    return null;
  }

  const off = leader + 8;

  const anchorX = textAlign === "center" ? "-50%" : textAlign === "right" ? "-100%" : "0";

  const pos =
    side === "right"
      ? { left: off, top: 0, translate: "0 -50%" }
      : side === "left"
        ? { left: -off, top: 0, translate: "-100% -50%" }
        : side === "down"
          ? { left: 0, top: off, translate: `${anchorX} 0` }
          : side === "up"
            ? { left: 0, top: -off, translate: `${anchorX} -100%` }
            : { left: 0, top: 0, translate: `${anchorX} -50%` };

  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div
        style={{
          position: "absolute",
          left: -7,
          top: -7,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: color,
          boxShadow: `0 0 0 5px ${color}26`,
          scale: a,
        }}
      />
      {side !== "none" && leader > 0 ? (
        <div
          style={{
            position: "absolute",
            left: side === "left" ? -leader : side === "right" ? 0 : -1.5,
            top: side === "up" ? -leader : side === "down" ? 8 : -1.5,
            width: side === "left" || side === "right" ? leader : 3,
            height: side === "up" || side === "down" ? leader : 3,
            borderRadius: 2,
            backgroundColor: color,
            opacity: 0.55 * a,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: pos.left,
          top: pos.top,
          translate: `${pos.translate} ${(1 - a) * 12}px 0`,
          opacity: a,
        }}
      >
        <span
          style={{
            fontSize: size,
            lineHeight: 1.25,
            fontWeight: 700,
            color: C.inkSoft,
            whiteSpace: "nowrap",
            padding: "3px 10px",
            borderRadius: 10,
            backgroundColor: "rgba(243,249,255,0.9)",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* content                                                             */
/* ------------------------------------------------------------------ */
/** Characters of the answer visible at `frame`. */
const typedCount = (frame: number) => {
  if (frame < 10) {
    return 0;
  }
  return Math.min(FULL_ANSWER.length, ANSWER_START.length + Math.floor((frame - 10) * 4));
};

const TOKENS_TOTAL = 282;

const PIPE_X = 300;
const PIPE_W = 260;
const PIPE_Y = 470;

const CARD_X = 1230;
const CARD_Y = 346;

/**
 * The card grows with the answer so the last line never hides behind the
 * stat chips: ~21 characters per line at 24px inside a 444px column.
 */
const CARD_H = (() => {
  const perLine = 20;
  const lines = FULL_ANSWER.split("\n").reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)),
    0,
  );
  return Math.round(40 + lines * 24 * 1.56);
})();

const PACKET_COLORS = [C.mint, C.sky, C.butter, C.pink, C.lilac];

/** Straight tube, then a smooth bend down into the chat card. */
const pathPoint = (t: number) => {
  const HEADS = [
    { x: PIPE_X, y: PIPE_Y },
    { x: 860, y: PIPE_Y },
    { x: 1090, y: 380 },
    { x: CARD_X - 10, y: 384 },
  ] as const;

  const seg = t < 0.5 ? 0 : t < 0.78 ? 1 : 2;

  const local = seg === 0 ? t / 0.5 : seg === 1 ? (t - 0.5) / 0.28 : (t - 0.78) / 0.22;

  const a = HEADS[seg] ?? HEADS[0];

  const b = HEADS[seg + 1] ?? HEADS[3];

  const cx = seg === 1 ? a.x : (a.x + b.x) / 2;

  const cy = seg === 1 ? b.y : (a.y + b.y) / 2;

  const m = 1 - local;

  return {
    x: m * m * a.x + 2 * m * local * cx + local * local * b.x,
    y: m * m * a.y + 2 * m * local * cy + local * local * b.y,
  };
};

/** 08 流式返回 — tokens ride the pipe and the bubble fills in live. */
export const Stream = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const typed = typedCount(frame);

  const text = FULL_ANSWER.slice(0, typed);

  const done = typed >= FULL_ANSWER.length;

  const tokens = Math.round((TOKENS_TOTAL * Math.min(typed, FULL_ANSWER.length)) / FULL_ANSWER.length);

  const cardIn = spring({ frame: frame - 4, fps, config: { damping: 200, stiffness: 60 } });

  return (
    <>
      <Background />
      <Hud realSeconds={start + frame / fps} />
      <Header step="8" title="一个字一个字地送" />

      {/* ---------------- left: robot ---------------- */}
      <div style={{ position: "absolute", left: 150, top: 318, width: 160, opacity: easeOut(clamp01(frame / 10)) }}>
        <Bot size={150} mood={done ? "happy" : "focus"} frame={frame} />
      </div>

      {/* ---------------- the pipe ---------------- */}
      <div
        style={{
          position: "absolute",
          left: PIPE_X - 24,
          top: PIPE_Y - 38,
          width: PIPE_W + 52,
          height: 76,
          borderRadius: 38,
          backgroundColor: "rgba(255,255,255,0.72)",
          border: `3px solid ${C.line}`,
          boxShadow: `0 10px 0 ${C.line}`,
          opacity: easeOut(clamp01((frame - 2) / 12)),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: PIPE_X,
          top: PIPE_Y - 4,
          width: PIPE_W + 4,
          height: 8,
          borderRadius: 4,
          backgroundImage: `repeating-linear-gradient(90deg, ${C.lineStrong} 0 16px, transparent 16px 32px)`,
          opacity: easeOut(clamp01((frame - 6) / 12)),
        }}
      />

      {/* flying packets on the straight run */}
      {frame > 8
        ? [0, 1, 2].map((i) => {
            const period = 22;

            const raw = ((((frame - 8) % period) + period) % period) / period + i / 3;

            const t = (raw % 1) * 0.5;

            const p = pathPoint(t);

            const col = PACKET_COLORS[(i + Math.floor(frame / period)) % PACKET_COLORS.length] ?? C.mint;

            return (
              <div
                key={`pk-${String(i)}`}
                style={{
                  position: "absolute",
                  left: p.x - 19,
                  top: p.y - 19,
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: col,
                  rotate: `${t * 240}deg`,
                  boxShadow: `0 6px 0 ${col}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#fff" }} />
              </div>
            );
          })
        : null}

      {/* flying packets bending down into the card */}
      {frame > 8
        ? [0, 1].map((i) => {
            const period = 26;

            const raw = ((((frame - 14 + i * 13) % period) + period) % period) / period;

            const p = pathPoint(0.5 + raw * 0.5);

            const col = PACKET_COLORS[(i + 2) % PACKET_COLORS.length] ?? C.sky;

            return (
              <div
                key={`bend-${String(i)}`}
                style={{
                  position: "absolute",
                  left: p.x - 17,
                  top: p.y - 17,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: col,
                  rotate: `${raw * 200}deg`,
                  boxShadow: `0 6px 0 ${col}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: "#fff" }} />
              </div>
            );
          })
        : null}

      {/* token counter */}
      <div
        style={{
          position: "absolute",
          left: 165,
          top: 600,
          width: 400,
          opacity: easeOut(clamp01((frame - 12) / 12)),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            padding: "14px 24px",
            borderRadius: 26,
            backgroundColor: C.card,
            border: `3px solid ${C.sky}`,
            boxShadow: `0 10px 0 ${C.skySoft}`,
          }}
        >
          <span
            style={{
              fontSize: 54,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: C.ink,
              width: 140,
              textAlign: "right",
            }}
          >
            {tokens}
          </span>
          <span style={{ fontSize: 25, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>
            / 282 token
          </span>
        </div>
        <div style={{ marginTop: 14, height: 14, borderRadius: 7, backgroundColor: "#e6f0fb" }}>
          <div
            style={{
              width: `${Math.min(100, (tokens / TOKENS_TOTAL) * 100)}%`,
              height: "100%",
              borderRadius: 7,
              background: `linear-gradient(90deg, ${C.mint}, ${C.sky})`,
            }}
          />
        </div>
      </div>

      {/* ---------------- right: chat card header ---------------- */}
      <div
        style={{
          position: "absolute",
          left: CARD_X,
          top: 210,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: cardIn,
        }}
      >
        <Bot size={74} mood={done ? "happy" : "focus"} frame={frame} />
        <div
          style={{
            marginLeft: 62,
            padding: "10px 24px",
            borderRadius: 999,
            backgroundColor: C.mintSoft,
            border: `3px solid ${C.mint}`,
            fontSize: 26,
            fontWeight: 700,
            color: C.ink,
            whiteSpace: "nowrap",
          }}
        >
          {done ? "回答完毕" : "正在回答…"}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: CARD_X,
          top: CARD_Y,
          width: 500,
          height: CARD_H,
          borderRadius: 32,
          backgroundColor: C.card,
          border: `3px solid ${C.line}`,
          boxShadow: `0 16px 0 ${C.line}`,
          opacity: cardIn,
          translate: `${(1 - cardIn) * 36}px 0px`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 20,
            width: 444,
            fontSize: 24,
            lineHeight: 1.56,
            color: C.ink,
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 27,
              translate: "0 4px",
              borderRadius: 3,
              backgroundColor: C.sky,
              opacity: done ? 0.3 : Math.floor(frame / 6) % 2 === 0 ? 1 : 0.1,
            }}
          />
        </div>
      </div>

      {/* stat chips */}
      <div
        style={{
          position: "absolute",
          left: CARD_X,
          top: 694,
          width: 222,
          padding: "12px 22px",
          borderRadius: 24,
          backgroundColor: C.card,
          border: `3px solid ${C.mint}`,
          boxShadow: `0 10px 0 ${C.mintSoft}`,
          opacity: easeOut(clamp01((frame - 22) / 12)),
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>
          0.4<span style={{ fontSize: 25, marginLeft: 4 }}>秒</span>
        </div>
        <div style={{ fontSize: 23, color: C.muted, fontWeight: 700 }}>首个 token</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: CARD_X + 244,
          top: 694,
          width: 256,
          padding: "12px 22px",
          borderRadius: 24,
          backgroundColor: C.card,
          border: `3px solid ${C.sky}`,
          boxShadow: `0 10px 0 ${C.skySoft}`,
          opacity: easeOut(clamp01((frame - 28) / 12)),
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>
          62<span style={{ fontSize: 25, marginLeft: 4 }}>个/秒</span>
        </div>
        <div style={{ fontSize: 23, color: C.muted, fontWeight: 700 }}>吐字速度</div>
      </div>

      {/* callouts */}
      <Callout
        a={easeOut(clamp01((frame - 16) / 12))}
        x={PIPE_X + PIPE_W / 2}
        y={PIPE_Y - 44}
        side="up"
        textAlign="center"
        text="一个 token 走一格"
        color={C.mint}
        leader={20}
      />
      <Callout
        a={easeOut(clamp01((frame - 18) / 12))}
        x={720}
        y={PIPE_Y + 4}
        side="down"
        textAlign="center"
        text="边算边送，像打字机"
        color={C.sky}
        leader={18}
      />

      <Caption>不等整段写完，第一个字马上给你</Caption>
    </>
  );
};
