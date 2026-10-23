import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { random } from "remotion";
import { Bot } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { clamp01, easeOut } from "../components/fx";
import { Caption } from "../components/ui";
import { useFonts } from "../lib/font";
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
type Step = { label: string; color: string; soft: string; icon: "split" | "digits" | "layers" | "bars" | "dice" | "check" | "send" };

const STEPS: readonly Step[] = [
  { label: "切成小词", color: C.sky, soft: C.skySoft, icon: "split" },
  { label: "变成数字", color: C.mint, soft: C.mintSoft, icon: "digits" },
  { label: "层层阅读", color: C.lilac, soft: C.lilacSoft, icon: "layers" },
  { label: "打分", color: C.butter, soft: C.butterSoft, icon: "bars" },
  { label: "抽样", color: C.pink, soft: C.pinkSoft, icon: "dice" },
  { label: "检查", color: C.mint, soft: C.mintSoft, icon: "check" },
  { label: "送出", color: C.sky, soft: C.skySoft, icon: "send" },
];

const CARD_W = 212;
const GAP = 30;
const ROW_X = (1920 - (CARD_W * 7 + GAP * 6)) / 2;
const ROW_Y = 236;
const CARD_H = 196;

const CLOCK_Y = 512;
const LOOP_Y = 700;

/** Little icons drawn with primitives — no image assets. */
const Glyph = ({ icon, color, soft, frame }: { readonly icon: Step["icon"]; readonly color: string; readonly soft: string; readonly frame: number }) => (
  <div
    style={{
      width: 86,
      height: 86,
      borderRadius: 24,
      backgroundColor: soft,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    }}
  >
    {icon === "split" ? (
      <>
        {["帮我", "写"].map((t, i) => (
          <div
            key={t}
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              backgroundColor: color,
              color: "#fff",
              fontSize: 19,
              fontWeight: 700,
              translate: `0 ${Math.sin(frame / 10 + i * 1.6) * 4}px`,
            }}
          >
            {t}
          </div>
        ))}
      </>
    ) : null}
    {icon === "digits" ? (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
        {[0.4, 0.9, 0.6, 1, 0.5, 0.8].map((v, i) => (
          <div
            key={String(i)}
            style={{
              width: 8,
              height: 18 + 34 * v * (0.75 + 0.25 * Math.sin(frame / 9 + i)),
              borderRadius: 4,
              backgroundColor: color,
              opacity: 0.55 + 0.45 * v,
            }}
          />
        ))}
      </div>
    ) : null}
    {icon === "layers" ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={String(i)}
            style={{
              width: 52 - i * 6,
              height: 12,
              borderRadius: 6,
              backgroundColor: color,
              opacity: 1 - i * 0.24,
              translate: `${Math.sin(frame / 12 + i) * 3}px 0`,
            }}
          />
        ))}
      </div>
    ) : null}
    {icon === "bars" ? (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
        {[0.42, 1, 0.24].map((v, i) => (
          <div
            key={String(i)}
            style={{
              width: 15,
              height: 20 + 44 * v,
              borderRadius: 7,
              backgroundColor: color,
              opacity: i === 1 ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    ) : null}
    {icon === "dice" ? (
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 14,
          backgroundColor: "#fff",
          border: `4px solid ${color}`,
          rotate: `${Math.sin(frame / 14) * 14}deg`,
          display: "grid",
          gridTemplateColumns: "repeat(2, 10px)",
          gridTemplateRows: "repeat(2, 10px)",
          gap: 8,
          placeContent: "center",
        }}
      >
        {[0, 1, 2, 3].map((k) => (
          <div key={String(k)} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        ))}
      </div>
    ) : null}
    {icon === "check" ? (
      <div style={{ fontSize: 52, lineHeight: 1, fontWeight: 700, color }}>✓</div>
    ) : null}
    {icon === "send" ? (
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "17px solid transparent",
          borderBottom: "17px solid transparent",
          borderLeft: `30px solid ${color}`,
          translate: `${Math.sin(frame / 8) * 3}px 0`,
        }}
      />
    ) : null}
  </div>
);

/** 09 总结 — the whole pipeline in one row; the clock stops at 10.0 s. */
export const Outro = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const count = Math.round(282 * easeOut(clamp01((frame - 128) / 34)));

  const celebrate = frame >= 176;

  const clockIn = spring({ frame: frame - 78, fps, config: { damping: 9, stiffness: 150 } });

  const clockSeconds = Math.min(10, 10 * easeOut(clamp01((frame - 84) / 26)));

  return (
    <>
      <Background />
      <Hud realSeconds={Math.min(10, start + frame / (10 * fps))} />

      {/* takeaway: takes the middle band, right beside the clock card */}
      <div
        style={{
          position: "absolute",
          left: 1080,
          top: CLOCK_Y + 8,
          opacity: easeOut(clamp01((frame - 62) / 14)),
          translate: `${(1 - easeOut(clamp01((frame - 62) / 14))) * -24}px 0`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>其实，就</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 78, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>7</span>
          <span style={{ fontSize: 30, fontWeight: 700, color: C.muted }}>步</span>
        </div>
      </div>

      {/* ---------------- the 7-step row ---------------- */}
      {STEPS.map((s, i) => {
        const at = 8 + i * 7;

        const a = spring({ frame: frame - at, fps, config: { damping: 8.5, stiffness: 150 } });

        const bob = Math.sin(frame / 11 + i * 0.7) * 3;

        const x = ROW_X + i * (CARD_W + GAP);

        return (
          <div key={s.label}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: ROW_Y + bob,
                width: CARD_W,
                height: CARD_H,
                translate: "0 -50%",
                scale: Math.max(0, a),
                opacity: clamp01(a),
                borderRadius: 28,
                backgroundColor: C.card,
                border: `3px solid ${s.color}`,
                boxShadow: `0 10px 0 ${s.soft}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <Glyph icon={s.icon} color={s.color} soft={s.soft} frame={frame} />
              <div style={{ fontSize: 27, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: x + CARD_W + 6,
                  top: ROW_Y + bob,
                  width: GAP - 12,
                  height: 6,
                  translate: "0 -50%",
                  borderRadius: 3,
                  backgroundColor: C.lineStrong,
                  opacity: clamp01(spring({ frame: frame - at - 4, fps, config: { damping: 200, stiffness: 90 } })),
                }}
              />
            ) : null}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: ROW_Y - CARD_H / 2,
          height: CARD_H,
          display: "none",
        }}
      />

      {/* ---------------- the 10.0 s clock card ---------------- */}
      <div
        style={{
          position: "absolute",
          left: 150,
          top: CLOCK_Y,
          width: 860,
          height: 172,
          scale: Math.max(0, clockIn),
          opacity: clamp01(clockIn * 1.4),
          borderRadius: 36,
          backgroundColor: C.card,
          border: `3px solid ${C.line}`,
          boxShadow: `0 14px 0 ${C.line}`,
          display: "flex",
          alignItems: "center",
          gap: 34,
          padding: "0 44px",
          transformOrigin: "50% 50%",
        }}
      >
        {/* dial */}
        <div
          style={{
            position: "relative",
            width: 108,
            height: 108,
            borderRadius: 54,
            backgroundColor: C.mintSoft,
            border: `5px solid ${C.mint}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 52,
              top: 20,
              width: 6,
              height: 36,
              borderRadius: 3,
              backgroundColor: C.ink,
              transformOrigin: "50% 100%",
              rotate: `${clockSeconds * 36}deg`,
              translate: "0 0",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 35,
              top: 33,
              width: 6,
              height: 10,
              borderRadius: 3,
              backgroundColor: C.mint,
              transformOrigin: "50% 0",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 47,
              top: 47,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: C.ink,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>提问之后的</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontSize: 92,
                fontWeight: 700,
                color: C.ink,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {clockSeconds.toFixed(1)}
            </span>
            <span style={{ fontSize: 34, fontWeight: 700, color: C.inkSoft }}>秒</span>
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 700, color: C.muted }}>从提问到第一个字</span>
          <span style={{ fontSize: 34, fontWeight: 700, color: C.mint }}>0.4 秒</span>
        </div>
      </div>

      {/* ---------------- the "重复 282 次" line ---------------- */}
      <div
        style={{
          position: "absolute",
          left: 150,
          top: LOOP_Y,
          width: 860,
          display: "flex",
          alignItems: "center",
          gap: 18,
          opacity: easeOut(clamp01((frame - 116) / 14)),
          translate: `${(1 - easeOut(clamp01((frame - 116) / 14))) * 30}px 0`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 74,
            height: 74,
            borderRadius: 24,
            backgroundColor: C.skySoft,
            border: `3px solid ${C.sky}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 20,
              top: 20,
              width: 32,
              height: 32,
              borderRadius: 16,
              border: `5px solid ${C.sky}`,
              borderRightColor: "transparent",
              rotate: `${frame * 4}deg`,
            }}
          />
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.inkSoft, whiteSpace: "nowrap" }}>
          整条流水线，重复
        </div>
        <div
          style={{
            fontSize: 76,
            lineHeight: 1,
            fontWeight: 700,
            color: C.sky,
            fontVariantNumeric: "tabular-nums",
            minWidth: 132,
            textAlign: "center",
          }}
        >
          {count}
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.inkSoft, whiteSpace: "nowrap" }}>次</div>
      </div>

      {/* ---------------- robot celebrating ---------------- */}
      <div
        style={{
          position: "absolute",
          left: 1200,
          top: CLOCK_Y + 10,
          width: 620,
          height: 360,
          opacity: easeOut(clamp01((frame - 60) / 16)),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 40,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.mintSoft} 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 210,
            top: 70,
            translate: `0 ${Math.sin(frame / 7) * (celebrate ? 10 : 4)}px`,
            rotate: `${Math.sin(frame / 6) * (celebrate ? 5 : 2)}deg`,
          }}
        >
          <Bot size={170} mood={frame > 120 ? "happy" : "idle"} frame={frame} />
        </div>
      </div>

      {/* confetti, once the celebration starts */}
      {celebrate
        ? Array.from({ length: 34 }, (_, i) => {
            const t = clamp01((frame - 176) / 60);

            const sx = 1510 + (random(`oc-x-${String(i)}`) - 0.5) * 240;

            const sy = 230 + random(`oc-y-${String(i)}`) * 70;

            const vy = 0.6 + random(`oc-v-${String(i)}`) * 0.4;

            const drift = Math.sin(t * 6 + i) * 26;

            const size = 9 + random(`oc-s-${String(i)}`) * 11;

            return (
              <div
                key={`ocf-${String(i)}`}
                style={{
                  position: "absolute",
                  left: sx + drift,
                  top: sy + t * 360 * vy,
                  width: size,
                  height: size * (i % 2 === 0 ? 1 : 0.55),
                  borderRadius: i % 3 === 0 ? "50%" : 3,
                  backgroundColor: [C.butter, C.pink, C.mint, C.sky, C.lilac][i % 5],
                  rotate: `${t * 420 + i * 30}deg`,
                  opacity: Math.sin(Math.PI * Math.min(1, t * 1.05)),
                }}
              />
            );
          })
        : null}

      {/* callouts */}
      <Callout
        a={easeOut(clamp01((frame - 58) / 12))}
        x={ROW_X + CARD_W + GAP / 2}
        y={236 + CARD_H / 2 + 10}
        side="down"
        textAlign="center"
        text="这 7 步，每个字都走一遍"
        color={C.sky}
        leader={16}
      />
      <Callout
        a={easeOut(clamp01((frame - 132) / 12))}
        x={150 + 74 + 18 + 6}
        y={LOOP_Y + 92}
        side="down"
        textAlign="left"
        text="282 个 token × 全部步骤"
        color={C.mint}
        leader={12}
      />

      <Caption>每一个字，都是一次完整的计算</Caption>
    </>
  );
};
