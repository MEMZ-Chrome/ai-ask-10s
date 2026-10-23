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
 * 03 一层一层地读 — 285 frames.
 *
 *  The 8 word chips sit in a row on a glowing stage. Behind them a tower of
 *  16 layer bars lights up bottom → top; the active layer breathes.
 *  Odd layers are "注意力" (words look at each other — arcs appear with
 *  dashes travelling along them), even layers are "前馈" (each chip gets its
 *  own burst of squares). The robot watches and its eyes follow the layer.
 */

const TOKENS = ["帮", "我", "写", "一封", "简短", "的", "请假", "邮件"];

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

/* attention: who looks at whom (chip indices) */
const LINKS: readonly (readonly [number, number])[] = [
  [7, 6],
  [5, 4],
  [6, 2],
  [3, 7],
  [1, 0],
];

const SAMPLE = [7, 6];

const LAYERS = 16;

/* timeline */

const CHIPS_AT = 4;
const CLIMB_AT = 30;
const CLIMB_LEN = 168; // ~11 frames per layer
const LINKS_AT = 40;
const FEED_AT = 96;
const CAPTION_AT = 10;

/* layout */

/** the 8 chips in one row, centred on the stage */
const CHIP_W = 84;
const CHIP_ROW_Y = 520;
const CHIP_X0 = 300;
const CHIP_GAP = 100;
const chipX = (i: number) => CHIP_X0 + i * CHIP_GAP;

/** the stage under the chips */
const STAGE = { x: 160, y: 352, w: 860, h: 340 };

/** tower of 16 layers on the right, layer 1 at the bottom */
const TOWER = { x: 1112, w: 300, barH: 21, gap: 6 };
const TOWER_BOTTOM = 668;

/** the robot sits above the tower, watching it light up */
const BOT = { x: 1600, y: 168, size: 150 };

const CALL1_AT = 26;
const CALL2_AT = 140;
const CALL3_AT = 236;
/** callout dots: on the lowest attention link, on the tower's top layer, on the progress bar */
const POS1 = { x: 1010, y: 470 };
const POS2 = { x: 1290, y: 200 };
const POS3 = { x: 1418, y: 690 };

/* helpers */

const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

const fade = (frame: number, at: number, dur = 10) => easeOut((frame - at) / dur);

/** per-layer window: 0..LAYERS where the integer part is the active layer */
const layerPos = (frame: number) => clamp01((frame - CLIMB_AT) / CLIMB_LEN) * LAYERS;

const activeLayer = (frame: number) => Math.min(LAYERS, Math.max(1, Math.ceil(layerPos(frame))));

const layerPhase = (frame: number) => {
  const p = layerPos(frame);
  return p <= 0 ? 0 : p - Math.floor(p) + (Number.isInteger(p) && p > 0 ? 1 : 0);
};

/** how "attention-like" the current layer is (odd layers look around) */
const attentionAmount = (frame: number) => {
  const l = activeLayer(frame);
  return l % 2 === 1 ? 1 : 0.18;
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
}: {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly rot?: number;
  readonly len?: number;
  readonly opacity: number;
  readonly grow?: number;
  readonly accent?: string;
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
    <div style={{ position: "absolute", left: 0, top: 0, opacity, pointerEvents: "none", zIndex: 6 }}>
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

export const Transformer = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const layer = activeLayer(frame);

  const phase = layerPhase(frame);

  const attn = attentionAmount(frame);

  const idle = fade(frame, CLIMB_AT, 10) * (1 - fade(frame, CLIMB_AT + 12, 10));

  return (
    <>
      <Background />
      <Hud realSeconds={Math.min(10, start + frame / (10 * fps))} />
      <Header step="3" title="一层一层地读" />

      {/* stage */}
      <div
        style={{
          position: "absolute",
          left: STAGE.x,
          top: STAGE.y,
          width: STAGE.w,
          height: STAGE.h,
          borderRadius: 36,
          backgroundColor: "rgba(255,255,255,0.78)",
          border: `3px solid ${C.line}`,
          boxShadow: `0 12px 0 rgba(199,218,240,0.35), 0 0 0 ${6 + 10 * attn}px ${attn > 0.5 ? C.skySoft : C.mintSoft}`,
          opacity: fade(frame, CHIPS_AT, 12),
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: 24, textAlign: "center", fontSize: 22, fontWeight: 700, color: C.muted, opacity: fade(frame, CHIPS_AT + 8, 10) }}>
          一句话的 8 个 token 一起送进去
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, textAlign: "center", fontSize: 22, fontWeight: 700, color: C.inkSoft, opacity: fade(frame, CLIMB_AT + 20, 10) }}>
          每过一层，这些数字就被改写一遍
        </div>
      </div>

      {/* attention arcs above the chips (SVG so they can curve) */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
        {LINKS.map(([a, b], i) => {
          const on = fade(frame, LINKS_AT + i * 7, 14);

          const x1 = chipX(a);

          const x2 = chipX(b);

          const y = CHIP_ROW_Y - CHIP_W / 2 - 10;

          const mid = (x1 + x2) / 2;

          const h = 54 + Math.abs(a - b) * 12;

          const strength = attn * on;

          if (strength < 0.02) {
            return null;
          }

          return (
            <g key={`l-${String(i)}`} opacity={strength}>
              <path
                d={`M ${x1} ${y} C ${mid} ${y - h}, ${mid} ${y - h}, ${x2} ${y}`}
                stroke={C.butter}
                strokeWidth={6}
                strokeLinecap="round"
                fill="none"
                opacity={0.55}
              />
              <path
                d={`M ${x1} ${y} C ${mid} ${y - h}, ${mid} ${y - h}, ${x2} ${y}`}
                stroke={C.sky}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray="14 22"
                strokeDashoffset={-frame * 3}
                fill="none"
              />
              <circle cx={x1} cy={y} r={7} fill={C.butter} />
              <circle cx={x2} cy={y} r={7} fill={C.butter} />
            </g>
          );
        })}
      </svg>

      {/* the chips */}
      {TOKENS.map((t, i) => {
        const pal = PALETTE[i] ?? PALETTE[0];

        const a = fade(frame, CHIPS_AT + i * 3, 10);

        const isFocus = attn > 0.5 && (SAMPLE[0] === i || SAMPLE[1] === i);

        const nod = 1 + 0.05 * Math.sin(frame / 6 + i);

        return (
          <div
            key={t}
            style={{
              position: "absolute",
              left: chipX(i) - CHIP_W / 2,
              top: CHIP_ROW_Y - CHIP_W / 2,
              width: CHIP_W,
              height: CHIP_W,
              borderRadius: 24,
              backgroundColor: pal?.s,
              border: `3.5px solid ${pal?.c}`,
              boxShadow: isFocus ? `0 10px 0 ${pal?.c}55, 0 0 26px ${pal?.c}66` : `0 8px 0 ${pal?.c}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 700,
              color: C.ink,
              opacity: a,
              translate: `0px ${(1 - a) * 26 + Math.sin(frame / 24 + i) * 2}px`,
              scale: `${(0.8 + 0.2 * a) * (isFocus ? 1.06 * nod : 1)}`,
            }}
          >
            {t}
          </div>
        );
      })}

      {/* feed-forward bursts (even layers) */}
      {attnFactor(frame) === 1
        ? TOKENS.map((t, i) =>
            [0, 1, 2].map((k) => {
              const ang = -Math.PI / 2 + (k - 1) * 0.85;

              const d = 30 + 14 * Math.sin(frame / 5 + i + k);

              return (
                <div
                  key={`f-${t}-${String(k)}`}
                  style={{
                    position: "absolute",
                    left: chipX(i) + Math.cos(ang) * d - 5,
                    top: CHIP_ROW_Y + Math.sin(ang) * d - 5,
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: C.mint,
                    opacity: 0.8 * fade(frame, CLIMB_AT, 10),
                  }}
                />
              );
            }),
          )
        : null}

      {/* layer counter, above the tower (stays put so the number never jumps) */}
      <div
        style={{
          position: "absolute",
          left: TOWER.x,
          top: 160,
          width: TOWER.w,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          opacity: fade(frame, 8, 12),
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 700, color: C.muted }}>第</span>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1,
            width: 86,
            textAlign: "center",
            color: layer % 2 === 1 ? C.sky : C.mint,
            fontVariantNumeric: "tabular-nums",
            display: "inline-block",
            scale: `${1 + 0.05 * Math.sin(phase * Math.PI)}`,
          }}
        >
          {layer}
        </span>
        <span style={{ fontSize: 26, fontWeight: 700, color: C.muted }}>/ 16 层</span>
      </div>

      {/* tower: 16 layers, lit bottom → top */}
      <div style={{ position: "absolute", left: TOWER.x, top: TOWER_BOTTOM - LAYERS * (TOWER.barH + TOWER.gap), width: TOWER.w }}>
        {Array.from({ length: LAYERS }, (_, k) => {
          const idx = LAYERS - k; // drawn top-down, layer 16 first
          const on = layerPos(frame) >= idx;
          const isNow = idx === layer;
          const appear = fade(frame, 6 + (LAYERS - idx) * 2, 8);

          const odd = idx % 2 === 1;

          return (
            <div
              key={String(idx)}
              style={{
                position: "absolute",
                left: isNow ? 0 : 16,
                top: k * (TOWER.barH + TOWER.gap),
                width: TOWER.w - 16,
                height: TOWER.barH,
                borderRadius: 10,
                backgroundColor: on ? (isNow ? (odd ? C.sky : C.mint) : odd ? `${C.sky}40` : `${C.mint}40`) : "rgba(255,255,255,0.85)",
                border: `2.5px solid ${on ? (isNow ? (odd ? C.sky : C.mint) : C.lineStrong) : C.line}`,
                boxShadow: isNow ? `0 0 ${20 + 16 * Math.sin(frame / 5)}px ${odd ? C.sky : C.mint}88` : "none",
                opacity: appear,
                display: "flex",
                alignItems: "center",
                paddingLeft: 12,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: isNow ? C.card : on ? C.muted : C.faint,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {idx}
              </span>
              {on ? (
                <span
                  style={{
                    marginLeft: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    color: isNow ? C.card : C.muted,
                    opacity: isNow ? 1 : 0.55,
                  }}
                >
                  {odd ? "注意力" : "前馈"}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* progress */}
      <div style={{ position: "absolute", left: TOWER.x, top: TOWER_BOTTOM + 16, width: TOWER.w, height: 10, borderRadius: 5, backgroundColor: C.line, overflow: "hidden", opacity: fade(frame, 8, 12) }}>
        <div
          style={{
            width: `${(layerPos(frame) / LAYERS) * 100}%`,
            height: "100%",
            borderRadius: 5,
            background: `linear-gradient(90deg, ${C.mint}, ${C.sky})`,
          }}
        />
      </div>

      {/* "attention vs feed-forward" mini legend */}
      <div style={{ position: "absolute", left: TOWER.x, top: TOWER_BOTTOM + 40, display: "flex", gap: 20, opacity: fade(frame, LINKS_AT, 12) }}>
        {[
          { c: C.sky, t: "注意力：词之间互相看" },
          { c: C.mint, t: "前馈：各自再算一遍" },
        ].map((s) => (
          <div key={s.t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.c }} />
            <span style={{ fontSize: 21, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>{s.t}</span>
          </div>
        ))}
      </div>

      {/* robot watching */}
      <Halo
        size={420}
        color={layer % 2 === 1 ? C.sky : C.mint}
        opacity={0.32 + 0.08 * Math.sin(frame / 12)}
        style={{ left: BOT.x + BOT.size / 2 - 210, top: BOT.y + 60 - 210 }}
      />
      <div style={{ position: "absolute", left: BOT.x, top: BOT.y }}>
        <Bot size={BOT.size} mood="focus" frame={frame} />
        {/* the robot's "gaze" follows the height of the active layer */}
        {/* the robot's "gaze" slides up as the tower lights up */}
        <div
          style={{
            position: "absolute",
            left: -128,
            top: BOT.size * 0.4,
            width: 104,
            height: 14,
            borderRadius: 7,
            backgroundColor: `${C.sky}22`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `${100 - (layerPos(frame) / LAYERS) * 100}%`,
              top: -5,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: layer % 2 === 1 ? C.sky : C.mint,
              border: `3px solid ${C.card}`,
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <Sparkles
        frame={frame}
        at={CLIMB_AT + CLIMB_LEN + 4}
        cx={TOWER.x + TOWER.w / 2}
        cy={TOWER_BOTTOM - LAYERS * 14}
        count={14}
        radius={150}
        seed="tf-top"
        size={12}
      />

      {/* callouts */}
      <div style={{ opacity: idle }} />
      <Callout
        text="词在互相看：谁和谁有关"
        x={POS1.x}
        y={POS1.y}
        rot={180}
        len={70}
        opacity={fade(frame, CALL1_AT, 8) * fade(frame, FEED_AT + 6, 14)}
        grow={easeOut((frame - CALL1_AT) / 14)}
        accent={C.butter}
      />
      <Callout
        text={`第 ${layer} / 16 层：又读一遍上下文`}
        x={POS2.x}
        y={POS2.y}
        rot={180}
        len={54}
        opacity={fade(frame, CALL2_AT, 8)}
        grow={easeOut((frame - CALL2_AT) / 14)}
        accent={C.mint}
      />
      <Callout
        text="16 层全部点亮，才算读完一遍"
        x={POS3.x}
        y={POS3.y}
        rot={90}
        len={26}
        opacity={fade(frame, CALL3_AT, 8)}
        grow={easeOut((frame - CALL3_AT) / 14)}
        accent={C.sky}
      />

      <div style={{ opacity: fade(frame, CAPTION_AT, 10), translate: `0px ${(1 - fade(frame, CAPTION_AT, 10)) * 12}px` }}>
        <Caption>每一层，都把上下文重新读一遍</Caption>
      </div>
    </>
  );
};

/** 1 while the feed-forward layers are hot, 0 during attention layers. */
const attnFactor = (frame: number) => (activeLayer(frame) % 2 === 0 ? 1 : 0);
