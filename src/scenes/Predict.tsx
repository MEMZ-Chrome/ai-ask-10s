import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Bot } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { clamp01, easeOut } from "../components/fx";
import { Caption, Header } from "../components/ui";
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
type Cand = { w: string; logit: number; color: string };

const CANDS: readonly Cand[] = [
  { w: "尊敬的", logit: 2.3, color: C.mint },
  { w: "亲爱的", logit: 1.6, color: C.sky },
  { w: "各位", logit: 1.0, color: C.lilac },
  { w: "您好", logit: 0.4, color: C.butter },
  { w: "打扰", logit: -0.3, color: C.pink },
];

/** Softmax over logits / T — the one formula this scene is really about. */
const softmax = (logits: readonly number[], t: number) => {
  const e = logits.map((l) => Math.exp(l / t));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
};

const DICE_PIPS: Record<number, readonly boolean[]> = {
  1: [false, false, false, false, true, false, false, false, false],
  2: [true, false, false, false, false, false, false, false, true],
  3: [true, false, false, false, true, false, false, false, true],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};

/* ---------------- panel geometry (nothing overlaps) ---------------- */
const PANEL_X = 160;
const PANEL_Y = 232;
const PANEL_W = 1000;
const PANEL_H = 512;

const PAD = 26;

const BAR_LABEL_W = 100;
const BAR_X = PAD + BAR_LABEL_W + 12;
const BAR_W = 600;

const ROW_Y0 = 78;
const ROW_H = 58;
const BAR_H = 40;

const SLIDER_Y = 372;
const CAPTION_ROW_Y = 424;

/* ---------------- dice geometry ---------------- */
const DICE_CX = 1420;
const DICE_CY = 430;
const DICE_S = 160;

const SLOT_X = 1430 - 440 / 2;
const SLOT_Y = 590;
const SLOT_W = 440;
const SLOT_H = 84;

/** 06 温度与抽样 — bars reshape with temperature, then the dice picks a word. */
export const Predict = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const panelIn = spring({ frame: frame - 2, fps, config: { damping: 200, stiffness: 60 } });

  /** Temperature runs 0.2 → 1.0 → 0.2 in a smooth loop. */
  const tNorm = 0.5 - 0.5 * Math.cos((Math.PI * 2 * Math.max(0, frame - 14)) / 108);

  const temperature = 0.2 + 0.8 * tNorm;

  const probs = softmax(
    CANDS.map((c) => c.logit),
    temperature,
  );

  const top = probs[0] ?? 1;

  const low = top > 0.62;

  const landAt = 118;

  const rollT = clamp01((frame - 82) / (landAt - 82));

  const rolled = frame >= landAt;

  const rollAngle = rolled ? 0 : rollT * 720;

  const sinceLand = frame - landAt;

  const hop = rolled ? -30 * Math.sin(clamp01(sinceLand / 13) * Math.PI) : 0;

  const punch = rolled ? Math.max(0, spring({ frame: sinceLand, fps, config: { damping: 8, stiffness: 220 } })) : 0;

  const diceFace = rolled ? 6 : 1 + (Math.floor(frame / 4) % 5);

  const ballT = spring({ frame: frame - (landAt + 12), fps, config: { damping: 7.5, stiffness: 150 } });

  const ballY = -170 * (1 - Math.max(0, ballT));

  const selected = frame >= landAt + 24;

  return (
    <>
      <Background />
      <Hud realSeconds={start + frame / fps} />
      <Header step="6" title="温度与抽签" />

      {/* ---------------- probability panel ---------------- */}
      <div
        style={{
          position: "absolute",
          left: PANEL_X,
          top: PANEL_Y,
          width: PANEL_W,
          height: PANEL_H,
          borderRadius: 34,
          backgroundColor: "rgba(255,255,255,0.76)",
          border: `3px solid ${C.line}`,
          boxShadow: `0 12px 0 ${C.line}`,
          opacity: panelIn,
          scale: 0.97 + 0.03 * panelIn,
          transformOrigin: "0% 0%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: PAD,
            top: 22,
            width: PANEL_W - PAD * 2,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            fontWeight: 700,
            color: C.muted,
          }}
        >
          <span>下一个词的概率</span>
          <span>5 个候选 · 合计 100%</span>
        </div>

        {CANDS.map((c, i) => {
          const p = probs[i] ?? 0;

          const rowIn = easeOut(clamp01((frame - 10 - i * 4) / 14));

          const isTop = i === 0;

          const y = ROW_Y0 + i * ROW_H;

          const width = Math.max(20, BAR_W * p + 14);

          return (
            <div key={c.w}>
              <div
                style={{
                  position: "absolute",
                  left: PAD,
                  top: y + 2,
                  width: BAR_LABEL_W,
                  textAlign: "right",
                  fontSize: 29,
                  fontWeight: 700,
                  color: C.ink,
                  whiteSpace: "nowrap",
                  opacity: rowIn,
                }}
              >
                {c.w}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: BAR_X,
                  top: y,
                  width: BAR_W,
                  height: BAR_H + 4,
                  borderRadius: 22,
                  backgroundColor: "#eef5fd",
                  border: `2px solid ${C.line}`,
                  opacity: rowIn,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: BAR_X,
                  top: y + 3,
                  width,
                  height: BAR_H - 2,
                  borderRadius: 19,
                  backgroundColor: c.color,
                  opacity: rowIn * (isTop ? 1 : 0.8),
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: BAR_X + BAR_W + 14,
                  top: y + 2,
                  width: 80,
                  fontSize: 27,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: isTop ? C.ink : C.muted,
                  opacity: rowIn,
                }}
              >
                {Math.round(p * 100)}%
              </div>
            </div>
          );
        })}

        {/* temperature slider — its own band under the bars */}
        <div
          style={{
            position: "absolute",
            left: PAD,
            top: SLIDER_Y,
            width: PANEL_W - PAD * 2,
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: easeOut(clamp01((frame - 20) / 14)),
          }}
        >
          <span style={{ fontSize: 27, fontWeight: 700, color: C.inkSoft, whiteSpace: "nowrap" }}>温度</span>
          <div
            style={{
              position: "relative",
              flex: 1,
              height: 20,
              borderRadius: 10,
              background: `linear-gradient(90deg, ${C.mint}, ${C.butter} 55%, ${C.pink})`,
            }}
          >
            {[0.25, 0.5, 0.75].map((k) => (
              <div
                key={String(k)}
                style={{
                  position: "absolute",
                  left: `${k * 100}%`,
                  top: -5,
                  width: 3,
                  height: 30,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.8)",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: `${tNorm * 100}%`,
                top: -14,
                width: 48,
                height: 48,
                translate: "-50% 0",
                borderRadius: 24,
                backgroundColor: C.card,
                border: `5px solid ${C.ink}`,
                boxShadow: `0 6px 0 ${C.line}`,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: C.ink,
              fontVariantNumeric: "tabular-nums",
              width: 62,
              textAlign: "right",
            }}
          >
            {temperature.toFixed(1)}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: PAD,
            top: CAPTION_ROW_Y,
            width: PANEL_W - PAD * 2,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: C.muted,
            fontWeight: 700,
          }}
        >
          <span>低温：总选最高的</span>
          <span>高温：更愿意冒险</span>
        </div>
      </div>

      {/* ---------------- robot ---------------- */}
      <div
        style={{
          position: "absolute",
          left: 1226,
          top: 250,
          opacity: easeOut(clamp01((frame - 10) / 14)),
        }}
      >
        <Bot size={104} mood={frame < landAt ? "think" : "happy"} frame={frame} />
      </div>

      {/* ---------------- the die ---------------- */}
      <div
        style={{
          position: "absolute",
          left: DICE_CX,
          top: DICE_CY + hop,
          width: DICE_S,
          height: DICE_S,
          translate: "-50% -50%",
          rotate: `${rollAngle}deg`,
          scale: 1 + 0.14 * punch,
          borderRadius: 32,
          backgroundColor: C.card,
          border: `5px solid ${C.ink}`,
          boxShadow: `0 12px 0 ${C.line}`,
          display: "grid",
          gridTemplateColumns: "repeat(3, 26px)",
          gridTemplateRows: "repeat(3, 26px)",
          gap: 12,
          placeContent: "center",
        }}
      >
        {(DICE_PIPS[diceFace] ?? DICE_PIPS[6] ?? []).map((on, k) => (
          <div
            key={String(k)}
            style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: on ? C.ink : "transparent" }}
          />
        ))}
      </div>

      {/* ---------------- slot 1 + the ball ---------------- */}
      <div
        style={{
          position: "absolute",
          left: SLOT_X,
          top: SLOT_Y,
          width: SLOT_W,
          height: SLOT_H,
          borderRadius: 24,
          backgroundColor: low ? C.mintSoft : C.butterSoft,
          border: `4px solid ${low ? C.mint : C.butter}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: easeOut(clamp01((frame - 26) / 12)),
        }}
      >
        <span style={{ fontSize: 27, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>1 号格</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>
          抽中率 {Math.round(top * 100)}%
        </span>
      </div>

      {frame >= landAt + 10 ? (
        <div
          style={{
            position: "absolute",
            left: SLOT_X + SLOT_W / 2,
            top: SLOT_Y - 26 + ballY,
            width: 46,
            height: 46,
            translate: "-50% -50%",
            borderRadius: 23,
            background: `radial-gradient(circle at 34% 30%, #ffffff, ${C.sky})`,
            border: `4px solid ${C.sky}`,
            boxShadow: `0 10px 18px ${C.sky}55`,
          }}
        />
      ) : null}

      {/* ---------------- the selected word ---------------- */}
      <div
        style={{
          position: "absolute",
          left: 1430,
          top: 712,
          translate: "-50% -50%",
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: selected ? 1 : 0,
          scale: 0.75 + 0.25 * Math.max(0, spring({ frame: frame - (landAt + 22), fps, config: { damping: 9, stiffness: 170 } })),
        }}
      >
        <div
          style={{
            padding: "8px 30px",
            borderRadius: 22,
            background: `linear-gradient(135deg, ${C.mint}, ${C.sky})`,
            color: "#fff",
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 2,
            whiteSpace: "nowrap",
            boxShadow: `0 9px 0 #33bfa3`,
          }}
        >
          尊敬
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, color: C.muted, whiteSpace: "nowrap" }}>抽中的词</span>
      </div>

      {/* ---------------- callouts ---------------- */}
      <Callout
        a={easeOut(clamp01((frame - 34) / 12))}
        x={PANEL_X + PANEL_W - 40}
        y={PANEL_Y + ROW_Y0 - 18}
        side="down"
        textAlign="right"
        text={low ? "低温：最高分更突出" : "高温：大家更平均"}
        color={low ? C.mint : C.pink}
        leader={14}
      />
      <Callout
        a={easeOut(clamp01((frame - 88) / 12))}
        x={DICE_CX + DICE_S / 2 + 6}
        y={DICE_CY - DICE_S / 2 + 14}
        side="right"
        text="摇个随机数"
        color={C.lilac}
        leader={18}
      />
      <Callout
        a={easeOut(clamp01((frame - (landAt + 30)) / 12))}
        x={1430}
        y={776}
        side="down"
        textAlign="center"
        text="概率越大，越容易被抽中"
        color={C.mint}
        leader={16}
      />

      <Caption>温度调高调低，抽签的结果会变</Caption>
    </>
  );
};
