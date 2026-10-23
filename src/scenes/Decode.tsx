import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Bot, Mark } from "../components/cast";
import { Background, Hud } from "../components/chrome";
import { clamp01, easeOut } from "../lib/motion";
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
type Draft = { text: string; ok: boolean };

const DRAFTS: readonly Draft[] = [
  { text: "尊敬的领导：", ok: true },
  { text: "嗨领导，请个假", ok: false },
  { text: "明天我不来了", ok: false },
];

const LAMPS = ["格式", "语气", "信息", "安全", "长度"];

const LANE_Y = [420, 540, 660] as const;

const LANE_H = 74;

const START_X = 236;

const GATE_X = 1010;
const GATE_W = 120;
const GATE_CX = GATE_X + GATE_W / 2;
const EXIT_X = 1300;
const TEXT_W = 236;

/** frame at which each draft starts / reaches the gate / is judged. */
const GO = [24, 104, 144] as const;

const PASS = [40, 120, 160] as const;

const VERDICT = [52, 130, 170] as const;

const SKIP = 34;

const xAt = (frame: number, go: number, pass: number, verdict: number) => {
  if (frame < go) {
    return START_X;
  }
  if (frame < pass) {
    return START_X + (GATE_X - START_X) * easeOut(clamp01((frame - go) / (pass - go)));
  }
  if (frame < verdict) {
    return GATE_X;
  }
  return GATE_X + (EXIT_X - GATE_X) * easeOut(clamp01((frame - verdict) / 24));
};

/** 07 过一遍检查 — drafts go through the gate; only one gets through. */
export const Decode = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const gateIn = spring({ frame: frame - 4, fps, config: { damping: 200, stiffness: 60 } });

  return (
    <>
      <Background />
      <Hud realSeconds={Math.min(10, start + frame / (10 * fps))} />
      <Header step="7" title="过一遍检查" />

      {/* guide rails */}
      {LANE_Y.map((y, i) => (
        <div key={`rail-${String(i)}`}>
          <div
            style={{
              position: "absolute",
              left: START_X - 20,
              top: y - 4,
              width: GATE_X - START_X + 26,
              height: 5,
              borderRadius: 3,
              backgroundImage: `repeating-linear-gradient(90deg, ${C.lineStrong} 0 14px, transparent 14px 28px)`,
              opacity: 0.85,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: GATE_X + GATE_W,
              top: y - 4,
              width: EXIT_X - GATE_X - GATE_W,
              height: 5,
              borderRadius: 3,
              backgroundImage: `repeating-linear-gradient(90deg, ${C.lineStrong} 0 14px, transparent 14px 28px)`,
              opacity: 0.7,
            }}
          />
        </div>
      ))}

      {/* the gate posts */}
      <div
        style={{
          position: "absolute",
          left: GATE_X,
          top: 356,
          width: GATE_W,
          height: 372,
          translate: "0 -50%",
          opacity: gateIn,
          scale: `1 ${0.55 + 0.45 * gateIn}`,
          transformOrigin: "50% 0",
          borderRadius: 24,
          background: "linear-gradient(180deg, #ffffff, #e9f5ff)",
          border: `5px solid ${C.lineStrong}`,
          boxShadow: `0 14px 0 ${C.line}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: GATE_W / 2 - 3,
            top: 30,
            width: 6,
            height: 312,
            borderRadius: 3,
            backgroundImage: `repeating-linear-gradient(180deg, ${C.lineStrong} 0 12px, transparent 12px 24px)`,
            opacity: 0.9,
          }}
        />
      </div>

      {/* 5 check lamps on the gate posts + labels on the right */}
      {LAMPS.map((l, i) => {
        const at = (PASS[0] ?? 0) + 3 + i * 3;

        const lit = clamp01((frame - at) / 7);

        const y = 420 + i * 68;

        return (
          <div key={l}>
            <div
              style={{
                position: "absolute",
                left: GATE_CX - 24,
                top: y - 24,
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: lit > 0.5 ? C.mint : "#eaf2fb",
                border: `3px solid ${lit > 0.5 ? "#2fc4a5" : C.lineStrong}`,
                opacity: gateIn,
                boxShadow: lit > 0.5 ? `0 0 0 7px ${C.mintSoft}` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 8,
                  backgroundColor: lit > 0.5 ? "#ffffff" : C.faint,
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                left: GATE_X + GATE_W + 14,
                top: y - 18,
                width: 88,
                fontSize: 25,
                fontWeight: 700,
                color: lit > 0.5 ? C.ink : C.muted,
                opacity: gateIn,
              }}
            >
              {l}
            </div>
          </div>
        );
      })}

      {/* drafts */}
      {DRAFTS.map((d, i) => {
        const go = GO[i] ?? 0;

        const pass = PASS[i] ?? 0;

        const verdict = VERDICT[i] ?? 0;

        const y = LANE_Y[i] ?? 420;

        const startIn = spring({ frame: frame - i * 4, fps, config: { damping: 9, stiffness: 150 } });

        const x = xAt(frame, go, pass, verdict);

        const judged = frame >= verdict;

        if (!d.ok) {
          const bounce = easeOut(clamp01((frame - verdict - SKIP) / 20));

          const shake = judged ? Math.sin(frame * 1.7) * 7 * (1 - bounce) : 0;

          const goBack = bounce * (GATE_X - START_X) * 0.8;

          return (
            <div
              key={d.text}
              style={{
                position: "absolute",
                left: x + shake - goBack,
                top: y,
                width: TEXT_W,
                translate: "0 -50%",
                scale: startIn * (1 - bounce * 0.16),
                opacity: startIn * (1 - bounce * 0.5),
                padding: "12px 16px",
                borderRadius: 20,
                backgroundColor: judged ? "#fff2f4" : C.card,
                border: `3px solid ${judged ? C.red : C.line}`,
                boxShadow: `0 8px 0 ${judged ? "#ffdde3" : C.line}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 29, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{d.text}</span>
              <div
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  opacity: judged ? clamp01((frame - verdict) / 6) : 0,
                  scale: 0.4 + 0.6 * clamp01((frame - verdict) / 8),
                }}
              >
                <Mark size={34} ok={false} thickness={0.16} />
              </div>
            </div>
          );
        }

        const landed = frame >= verdict;

        const tick = Math.max(0, spring({ frame: frame - verdict, fps, config: { damping: 9, stiffness: 180 } }));

        return (
          <div key={d.text}>
            <div
              style={{
                position: "absolute",
                left: x - 14,
                top: y,
                width: EXIT_X - GATE_X + TEXT_W + 24,
                height: LANE_H + 20,
                translate: "0 -50%",
                scale: startIn,
                borderRadius: 26,
                border: `4px solid ${C.mint}`,
                backgroundColor: landed ? C.mintSoft : "transparent",
                opacity: startIn * (landed ? 1 : 0.22),
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: TEXT_W,
                translate: "0 -50%",
                scale: startIn,
                padding: "12px 16px",
                borderRadius: 20,
                backgroundColor: C.card,
                border: `3px solid ${C.mint}`,
                boxShadow: `0 8px 0 ${C.mintSoft}`,
              }}
            >
              <span style={{ fontSize: 29, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{d.text}</span>
            </div>
            <div
              style={{
                position: "absolute",
                left: x + TEXT_W + 30,
                top: y,
                translate: "0 -50%",
                opacity: landed ? clamp01((frame - verdict) / 5) : 0,
                scale: 0.3 + 0.7 * tick,
              }}
            >
              <Mark size={58} ok thickness={0.16} />
            </div>
          </div>
        );
      })}

      {/* robot, lower right, nods once the winner is through */}
      <div
        style={{
          position: "absolute",
          left: 1668,
          top: 620,
          width: 200,
          opacity: easeOut(clamp01((frame - 8) / 14)),
        }}
      >
        <Bot size={124} mood={frame < 96 ? "focus" : "happy"} frame={frame} />
      </div>

      {/* callouts, own column so nothing overlaps */}
      <Callout
        a={easeOut(clamp01((frame - 14) / 12))}
        x={GATE_CX}
        y={286}
        side="up"
        textAlign="center"
        text="5 项检查：格式/语气/信息/安全/长度"
        color={C.sky}
        leader={22}
      />
      <Callout
        a={easeOut(clamp01((frame - (VERDICT[1] + 8)) / 12))}
        x={520}
        y={LANE_Y[2] + 74}
        side="down"
        textAlign="center"
        text="不合格的，打回重写"
        color={C.red}
        leader={16}
      />
      <Callout
        a={easeOut(clamp01((frame - (VERDICT[0] + 16)) / 12))}
        x={EXIT_X + 12}
        y={LANE_Y[0] + LANE_H}
        side="down"
        textAlign="center"
        text="5 项全过，才发给你"
        color={C.mint}
        leader={20}
      />

      <Caption>写出来之前，先自己过一遍五项检查</Caption>
    </>
  );
};
