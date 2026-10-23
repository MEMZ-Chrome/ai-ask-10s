import type { CSSProperties } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { Bot, Halo } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { Sparkles, VectorBars, clamp01 } from "../components/fx";
import { Caption, Header } from "../components/ui";
import { useFonts } from "../lib/font";
import { C } from "../lib/theme";
import type { SceneProps } from "./types";

/**
 * 02 变成一串数字 — 210 frames.
 *
 *  LEFT   one token number (9182) goes in and 4096 numbers come out: a
 *         multiplier grid counts 2 → 4096 and a strip of bars slides away.
 *  MIDDLE the robot funnels every chip into a vector and hands it over.
 *  RIGHT  first the sentence as 8 rows of numbers, then the same words as a
 *         constellation: 请假 / 休假 / 生病 gather together, so close in
 *         meaning = close in space.
 */

const WORDS = ["帮", "我", "写", "一封", "简短", "的", "请假", "邮件"];

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

/** deterministic vector for a token — identical on every render */
const vector = (seed: string, n = 18): readonly number[] =>
  Array.from({ length: n }, (_, i) => {
    const r = random(`${seed}-${String(i)}`);
    return Math.round((r * 1.7 - 0.85) * 100) / 100;
  });

/* timeline */

const VEC_AT = 26;
const GRID_STEP = 3;
const STRIPES_AT = 44;

const BOXES_AT = 4;
const MATRIX_AT = 20;

const MAP_AT = 96;
const CLUSTER_AT = 138;
const SAME_AT = 158;

const CALL_1 = 12;
const CALL_2 = 60;
const CALL_3 = 164;
const CAPTION_AT = 8;

/* layout */

const LEFT = { x: 150, y: 206, w: 400, h: 566 };

const BOT_BOX = { x: 612, y: 330 };
const BOT = 200;
const CHEST = { x: BOT_BOX.x + BOT / 2, y: BOT_BOX.y + BOT * 1.0 };

const RIGHT = { x: 910, y: 206, w: 860, h: 566 };
const MATRIX = { x: 1012, y: 300, w: 470 };

const MAP_IN = { x: RIGHT.x + 2, y: RIGHT.y + 86, w: RIGHT.w - 4, h: 478 };

const CALL1 = { x: 396, y: 330 };
const CALL2 = { x: 1600, y: 288 };
const CALL3 = { x: 1662, y: 524 };

/* helpers */

const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

const fade = (frame: number, at: number, dur = 10) => easeOut((frame - at) / dur);

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

/** 2, 4, 8 … 4096 while the grid fills up. */
const pow2 = (frame: number) => {
  const t = clamp01((frame - VEC_AT) / (31 * GRID_STEP));
  return Math.round(Math.pow(2, 1 + t * 11));
};

export const Embed = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const boxesIn = fade(frame, BOXES_AT, 12);

  const matrixIn = fade(frame, MATRIX_AT, 12);

  return (
    <>
      <Background />
      <Hud realSeconds={Math.min(10, start + frame / (10 * fps))} />
      <Header step="2" title="变成一串数字" />

      {/* ── LEFT: one number → one vector ─────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: LEFT.x,
          top: LEFT.y,
          width: LEFT.w,
          height: LEFT.h,
          borderRadius: 34,
          backgroundColor: "rgba(255,255,255,0.84)",
          border: `3px solid ${C.line}`,
          boxShadow: "0 12px 0 rgba(199, 218, 240, 0.35), 0 26px 60px rgba(72, 168, 245, 0.10)",
          opacity: boxesIn,
          translate: `0px ${(1 - boxesIn) * 22}px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 30,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            color: C.muted,
          }}
        >
          1 个 token
        </div>

        {/* the token number */}
        <div
          style={{
            position: "absolute",
            left: LEFT.w / 2 - 86,
            top: 70,
            width: 172,
            height: 66,
            borderRadius: 20,
            backgroundColor: C.pinkSoft,
            border: `3px solid ${C.pink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: 700,
            color: C.ink,
            fontVariantNumeric: "tabular-nums",
            boxShadow: `0 0 ${16 + 8 * Math.sin(frame / 9)}px ${C.pink}44`,
          }}
        >
          9182
        </div>

        {/* arrow down */}
        <div
          style={{
            position: "absolute",
            left: LEFT.w / 2 - 3,
            top: 140,
            width: 6,
            height: 30,
            borderRadius: 3,
            backgroundColor: C.lineStrong,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: LEFT.w / 2 - 11,
            top: 164,
            width: 0,
            height: 0,
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: `14px solid ${C.lineStrong}`,
          }}
        />

        {/* the multiplying grid: 2 → 4096 */}
        <div
          style={{
            position: "absolute",
            left: LEFT.w / 2 - 152,
            top: 194,
            width: 304,
            height: 152,
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: 6,
          }}
        >
          {Array.from({ length: 32 }, (_, i) => {
            const on = fade(frame, VEC_AT + i * GRID_STEP, 6);

            const big = i < 8;

            return (
              <div
                key={String(i)}
                style={{
                  borderRadius: 8,
                  backgroundColor: on > 0.02 ? (big ? C.mint : C.sky) : C.line,
                  opacity: 0.28 + 0.72 * on,
                  scale: `${0.72 + 0.28 * on}`,
                }}
              />
            );
          })}
        </div>

        {/* counter */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 360,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1,
              color: C.mint,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -1,
            }}
          >
            {pow2(frame)}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>维</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 436,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            color: C.muted,
            opacity: fade(frame, STRIPES_AT, 10),
          }}
        >
          一个词 = 一串数字
        </div>
      </div>

      {/* the strip of bars sliding out of the left box, into the robot */}
      <div
        style={{
          position: "absolute",
          left: LEFT.x + LEFT.w + 10,
          top: LT_STRIP_Y,
          width: 214,
          height: 84,
          opacity: fade(frame, STRIPES_AT, 10),
        }}
      >
        <div
          style={{
            width: 206 * easeOut((frame - STRIPES_AT) / 20),
            height: 84,
            borderRadius: 20,
            backgroundColor: C.card,
            border: `3px solid ${C.mint}`,
            boxShadow: `0 0 0 ${6 + 4 * Math.sin(frame / 9)}px ${C.mintSoft}`,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ paddingLeft: 8 }}>
            <VectorBars values={vector("9182")} height={54} color={C.mint} barWidth={7} gap={4} />
          </div>
        </div>
      </div>

      {/* ── MIDDLE: the robot turns chips into vectors ────────────────── */}
      <Halo
        size={470}
        color={C.sky}
        opacity={0.36 + 0.08 * Math.sin(frame / 12)}
        style={{ left: CHEST.x - 235, top: CHEST.y - 220 }}
      />
      <div style={{ position: "absolute", left: BOT_BOX.x, top: BOT_BOX.y }}>
        <Bot size={BOT} mood="focus" frame={frame} style={{ scale: `${1 + 0.015 * Math.sin(frame / 10)}` }} />
      </div>

      {/* chips: in through the chest, out as stripes, then into the matrix */}
      {WORDS.map((w, i) => {
        const pal = PALETTE[i] ?? PALETTE[0];

        if (!pal) {
          return null;
        }

        const launch = MATRIX_AT + 4 + i * 5;

        if (frame < launch || frame > launch + 56) {
          return null;
        }

        const into = easeInOut((frame - launch) / 14);

        const out = easeInOut((frame - launch - 14) / 16);

        const toMatrix = easeInOut((frame - launch - 30) / 22);

        const from = { x: 560, y: 470 - i * 24 };

        const mouth = { x: CHEST.x + 30, y: CHEST.y - 4 };

        const exit = { x: CHEST.x + 96, y: CHEST.y - 10 + i * 9 };

        const target = { x: MATRIX.x - 26, y: MATRIX.y + 44 + i * 46 };

        const x = from.x + (mouth.x - from.x) * into + (exit.x - mouth.x) * out + (target.x - exit.x) * toMatrix;

        const y = from.y + (mouth.y - from.y) * into + (exit.y - mouth.y) * out + (target.y - exit.y) * toMatrix;

        return (
          <div
            key={`f-${w}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 80,
              height: 52,
              translate: "-50% -50%",
              opacity: 1 - 0.9 * toMatrix,
              scale: `${1 - 0.4 * into + 0.3 * out}`,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 16,
                backgroundColor: out > 0.5 ? C.card : pal.s,
                border: `3px solid ${pal.c}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {out > 0.5 ? (
                <VectorBars values={vector(`v-${w}`, 8)} height={38} color={pal.c} barWidth={5} gap={3} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: C.ink }}>{w}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* ── RIGHT: matrix, then the constellation ─────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: RIGHT.x,
          top: RIGHT.y,
          width: RIGHT.w,
          height: RIGHT.h,
          borderRadius: 34,
          backgroundColor: "rgba(255,255,255,0.84)",
          border: `3px solid ${C.line}`,
          boxShadow: "0 12px 0 rgba(199, 218, 240, 0.35), 0 26px 60px rgba(72, 168, 245, 0.10)",
          opacity: matrixIn,
          translate: `0px ${(1 - matrixIn) * 22}px`,
          overflow: "hidden",
        }}
      >
        <MapLayer frame={frame} />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 22,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            color: C.muted,
            opacity: fade(frame, MAP_AT + 20, 12),
          }}
        >
          词的位置：意思越近，靠得越紧
        </div>

        {/* the matrix takes the right panel over at first */}
        <div
          style={{
            position: "absolute",
            left: MATRIX.x - RIGHT.x,
            top: MATRIX.y - RIGHT.y,
            width: MATRIX.w,
            opacity: 1 - fade(frame, MAP_AT, 16),
            translate: `${-30 * fade(frame, MAP_AT, 16)}px 0px`,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: C.muted, marginBottom: 8 }}>这句话 → 8 行数字</div>
          {WORDS.map((w, i) => {
            const pal = PALETTE[i] ?? PALETTE[0];

            if (!pal) {
              return null;
            }

            const a = fade(frame, MATRIX_AT + i * 5, 10);

            return (
              <div
                key={`m-${w}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  height: 48,
                  opacity: a,
                  translate: `${(1 - a) * 24}px 0px`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: pal.s,
                    border: `2.5px solid ${pal.c}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: w.length > 1 ? 16 : 21,
                    fontWeight: 700,
                    color: C.ink,
                    whiteSpace: "nowrap",
                  }}
                >
                  {w}
                </div>
                <div
                  style={{
                    width: 168,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: C.card,
                    border: `2.5px solid ${C.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <VectorBars values={vector(`m-${w}`)} height={24} color={pal.c} barWidth={4} gap={3} />
                </div>
                <div style={{ width: 108, fontSize: 22, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>
                  …4096 个
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Sparkles
        frame={frame}
        at={STRIPES_AT + 4}
        cx={CHEST.x + 90}
        cy={CHEST.y}
        count={12}
        radius={100}
        seed="embed-out"
        size={11}
      />

      {/* ── callouts ─────────────────────────────────────────────────── */}
      <Callout
        text="编号 → 4096 个小数"
        x={CALL1.x}
        y={CALL1.y}
        rot={180}
        len={80}
        opacity={fade(frame, CALL_1, 8)}
        grow={easeOut((frame - CALL_1) / 14)}
        accent={C.mint}
      />
      <Callout
        text="每个词都变成一行数字"
        x={CALL2.x}
        y={CALL2.y}
        rot={180}
        len={44}
        opacity={fade(frame, CALL_2, 8)}
        grow={easeOut((frame - CALL_2) / 14)}
        accent={C.lilac}
      />
      <Callout
        text="意思相近 → 挨得近"
        x={CALL3.x}
        y={CALL3.y}
        rot={180}
        len={52}
        opacity={fade(frame, CALL_3, 8)}
        grow={easeOut((frame - CALL_3) / 14)}
        accent={C.pink}
      />

      <div
        style={{
          opacity: fade(frame, CAPTION_AT, 10),
          translate: `0px ${(1 - fade(frame, CAPTION_AT, 10)) * 12}px`,
        }}
      >
        <Caption>意思相近的词，在数字空间里也挨得近</Caption>
      </div>
    </>
  );
};

const LT_STRIP_Y = LEFT.y + 244;

/* ── the constellation ──────────────────────────────────────────────────── */

type MapNode = {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly c: string;
  readonly s: string;
};

/** positions are relative to the map box (856 × 478) */
const NODES: readonly MapNode[] = [
  { id: "qj", label: "请假", x: 470, y: 268, r: 46, c: C.pink, s: C.pinkSoft },
  { id: "xj", label: "休假", x: 356, y: 150, r: 34, c: C.pink, s: C.pinkSoft },
  { id: "sb", label: "生病", x: 352, y: 372, r: 30, c: C.lilac, s: C.lilacSoft },
  { id: "yj", label: "邮件", x: 196, y: 268, r: 42, c: C.butter, s: C.butterSoft },
  { id: "jd", label: "简短", x: 668, y: 142, r: 36, c: C.mint, s: C.mintSoft },
  { id: "kh", label: "开会", x: 686, y: 368, r: 34, c: C.sky, s: C.skySoft },
];

const LINKS: readonly (readonly [string, string])[] = [
  ["qj", "xj"],
  ["qj", "sb"],
  ["qj", "yj"],
];

/** the whole map starts on the right and slides left while it zooms in */
const HOME = { x: 560, y: 248 };
const CLUSTERED = { x: 486, y: 252 };

const MapLayer = ({ frame }: { readonly frame: number }) => {
  const move = easeInOut((frame - CLUSTER_AT) / 30);

  const ox = HOME.x + (CLUSTERED.x - HOME.x) * move;

  const oy = HOME.y + (CLUSTERED.y - HOME.y) * move;

  const zoom = 1 + 0.16 * move;

  const at = (n: MapNode) => ({ x: ox + (n.x - HOME.x) * zoom, y: oy + (n.y - HOME.y) * zoom });

  return (
    <div
      style={{
        position: "absolute",
        left: MAP_IN.x - RIGHT.x,
        top: MAP_IN.y - RIGHT.y,
        width: MAP_IN.w,
        height: MAP_IN.h,
        opacity: fade(frame, MAP_AT, 14),
      }}
    >
      {/* dashed playfield */}
      <div
        style={{
          position: "absolute",
          left: ox - 330,
          top: oy - 178,
          width: 660,
          height: 356,
          borderRadius: "50%",
          border: `2.5px dashed ${C.lineStrong}`,
          opacity: 0.85,
        }}
      />

      {/* links between neighbours */}
      {LINKS.map(([a, b], i) => {
        const na = NODES.find((n) => n.id === a);

        const nb = NODES.find((n) => n.id === b);

        if (!na || !nb) {
          return null;
        }

        const grow = easeOut((frame - (CLUSTER_AT + 8 + i * 5)) / 16);

        if (grow <= 0) {
          return null;
        }

        const pa = at(na);

        const pb = at(nb);

        const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);

        const angle = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI;

        return (
          <div
            key={`l-${a}-${b}`}
            style={{
              position: "absolute",
              left: pa.x,
              top: pa.y - 2,
              width: len * grow,
              height: 4,
              borderRadius: 2,
              backgroundColor: C.pink,
              opacity: 0.5,
              transformOrigin: "0 50%",
              rotate: `${angle}deg`,
            }}
          />
        );
      })}

      {/* nodes */}
      {NODES.map((n, i) => {
        const a = fade(frame, MAP_AT + 6 + i * 7, 10);

        if (a <= 0) {
          return null;
        }

        const p = at(n);

        const float = Math.sin(frame / 22 + i * 1.3) * 4 * (1 - 0.5 * move);

        const isHome = n.id === "qj";

        return (
          <div key={n.id} style={{ position: "absolute", left: p.x, top: p.y + float, opacity: a, translate: "-50% -50%" }}>
            {isHome ? (
              <div
                style={{
                  position: "absolute",
                  left: -n.r * 1.5,
                  top: -n.r * 1.5,
                  width: n.r * 3,
                  height: n.r * 3,
                  borderRadius: "50%",
                  border: `3px solid ${C.pink}`,
                  opacity: 0.16 + 0.1 * Math.sin(frame / 9),
                }}
              />
            ) : null}
            <div
              style={{
                width: n.r * 2,
                height: n.r * 2,
                borderRadius: "50%",
                backgroundColor: n.s,
                border: `3.5px solid ${n.c}`,
                boxShadow: `0 8px 0 ${n.c}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: Math.round(n.r * 0.64),
                fontWeight: 700,
                color: C.ink,
                scale: `${isHome ? 1 + 0.05 * Math.sin(frame / 8) : 1}`,
              }}
            >
              {n.label}
            </div>
          </div>
        );
      })}

      {/* "≈" tag over the cluster */}
      <div
        style={{
          position: "absolute",
          left: ox + (470 - HOME.x) * zoom,
          top: oy + (268 - HOME.y) * zoom - 70,
          padding: "4px 16px",
          borderRadius: 999,
          backgroundColor: C.pinkSoft,
          border: `2.5px solid ${C.pink}`,
          fontSize: 24,
          fontWeight: 700,
          color: C.ink,
          whiteSpace: "nowrap",
          opacity: fade(frame, SAME_AT, 10),
          translate: "-50% 0",
        }}
      >
        ≈ 很近
      </div>
    </div>
  );
};
