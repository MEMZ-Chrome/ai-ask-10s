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
            backgroundColor: "rgba(243,249,255,0.88)",
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
type Pill = { w: string; score: number; color: string };

/** 12 candidates on the ellipse; the winner sits at the bottom. */
const CANDIDATES: readonly Pill[] = [
  { w: "亲爱的", score: 0.21, color: C.pink },
  { w: "您好", score: 0.35, color: C.sky },
  { w: "各位", score: 0.18, color: C.lilac },
  { w: "打扰", score: 0.06, color: C.butter },
  { w: "同事", score: 0.05, color: C.sky },
  { w: "领导", score: 0.24, color: C.sky },
  { w: "尊敬的", score: 0.71, color: C.mint },
  { w: "明天", score: 0.09, color: C.lilac },
  { w: "汇报", score: 0.12, color: C.butter },
  { w: "申请", score: 0.15, color: C.pink },
  { w: "此致", score: 0.04, color: C.butter },
  { w: "谢谢", score: 0.07, color: C.mint },
];

const READ_SO_FAR = ["帮我", "写", "一封", "简短", "的", "请假", "邮件"];

const WINNER_I = 6;

const CX = 740;
const CY = 500;
const RX = 358;
const RY = 236;

/** where the winning word lands, under the ring. */
const WINNER_Y = 726;

const pillPos = (i: number) => {
  const a = (i / CANDIDATES.length) * Math.PI * 2;
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) };
};

/** 05 猜下一个词 — the hidden state fans out over the whole vocab, one word wins. */
export const NextToken = ({ start }: SceneProps) => {
  useFonts();

  const frame = useCurrentFrame();

  const { fps } = useVideoConfig();

  const ringIn = spring({ frame: frame - 2, fps, config: { damping: 200, stiffness: 60 } });

  const spread = spring({ frame: frame - 16, fps, config: { damping: 200, stiffness: 70 } });

  const score = spring({ frame: frame - 56, fps, config: { damping: 200, stiffness: 40 } });

  const collapse = spring({ frame: frame - 110, fps, config: { damping: 200, stiffness: 70 } });

  const bow = spring({ frame: frame - 126, fps, config: { damping: 8.5, stiffness: 170 } });

  const glow = 0.5 + 0.5 * Math.sin(frame / 6);

  return (
    <>
      <Background />
      <Hud realSeconds={Math.min(10, start + frame / (10 * fps))} />
      <Header step="5" title="猜下一个词" />

      {/* right: the sentence so far */}
      <RightColumn frame={frame} a={easeOut(clamp01((frame - 6) / 14))} revealed={collapse} />

      {/* centre: soft mint glow behind the winner */}
      <div
        style={{
          position: "absolute",
          left: CX - 155,
          top: WINNER_Y - 155,
          width: 310,
          height: 310,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.mint}66 0%, transparent 68%)`,
          opacity: clamp01((frame - 112) / 12) * (0.6 + 0.4 * glow),
        }}
      />

      {/* centre: ring + hub */}
      <div style={{ position: "absolute", left: CX, top: CY, width: 0, height: 0 }}>
        <div
          style={{
            position: "absolute",
            left: -RX,
            top: -RY,
            width: RX * 2,
            height: RY * 2,
            borderRadius: "50%",
            border: `3px dashed ${C.lineStrong}`,
            scale: ringIn * (1 - 0.3 * collapse),
            opacity: 0.9 * ringIn,
            rotate: `${frame * 0.12}deg`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -46,
            top: -46,
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.mint} 0%, ${C.mint} 40%, ${C.mintSoft} 48%, transparent 74%)`,
            scale: ringIn * (1 - 0.4 * collapse),
            opacity: 0.6 + 0.4 * glow,
          }}
        />
        {/* explanation that lives inside the ring, so it never touches a pill */}
        <div
          style={{
            position: "absolute",
            left: -150,
            top: -30,
            width: 300,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontSize: 26,
            lineHeight: 1.3,
            fontWeight: 700,
            color: C.inkSoft,
            textShadow: `0 0 12px ${C.bg}, 0 0 12px ${C.bg}`,
            opacity: clamp01((frame - 58) / 12) * (1 - clamp01((frame - 106) / 14)),
          }}
        >
          「邮件」后面
          <br />
          该接什么词？
        </div>
      </div>

      {/* lines + travelling beads */}
      {CANDIDATES.map((c, i) => {
        const p = pillPos(i);

        const travel = 1 - collapse * 0.92;

        const len = Math.hypot(p.x - CX, p.y - CY) * spread * travel;

        const rad = Math.atan2(p.y - CY, p.x - CX);

        const isWinner = i === WINNER_I;

        const beadT = ((((frame - 20 + i * 3.3) % 26) + 26) % 26) / 26;

        return (
          <div key={`l-${c.w}`}>
            <div
              style={{
                position: "absolute",
                left: CX,
                top: CY - 3,
                width: Math.max(0, len),
                height: 6,
                borderRadius: 3,
                backgroundColor: isWinner ? C.mint : C.lineStrong,
                opacity: (isWinner ? 0.95 : 0.55) * ringIn,
                transformOrigin: "0 50%",
                rotate: `${(rad * 180) / Math.PI}deg`,
              }}
            />
            {frame > 22 && spread > 0.08 ? (
              <div
                style={{
                  position: "absolute",
                  left: CX + Math.cos(rad) * len * beadT - 8,
                  top: CY + Math.sin(rad) * len * beadT - 8,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: isWinner ? C.mint : C.sky,
                  opacity: Math.sin(Math.PI * beadT) * ringIn * (1 - collapse),
                }}
              />
            ) : null}
          </div>
        );
      })}

      {/* candidate pills */}
      {CANDIDATES.map((c, i) => {
        const p = pillPos(i);

        const local = spring({ frame: frame - 16 - i * 2, fps, config: { damping: 8.5, stiffness: 150 } });

        const isWinner = i === WINNER_I;

        const shown = isWinner ? 1 : c.score * score;

        const beaten = !isWinner && shown > 0.5;

        const travel = 1 - collapse * 0.94;

        const focus = isWinner ? 1 - collapse : 1 - collapse * 0.82;

        const opacity = (0.34 + 0.66 * clamp01(shown + 0.06)) * focus;

        return (
          <div
            key={c.w}
            style={{
              position: "absolute",
              left: CX + (p.x - CX) * travel,
              top: CY + (p.y - CY) * travel,
              translate: "-50% -50%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px 8px 18px",
              borderRadius: 999,
              backgroundColor: C.card,
              border: `3px solid ${isWinner ? (collapse > 0.4 ? C.line : C.mint) : beaten ? c.color : C.line}`,
              opacity: isWinner ? local * 0.9 * (1 - clamp01((collapse - 0.2) * 2.6)) : local * opacity,
              scale: local * (isWinner ? 1 : 1 - collapse * 0.45),
              boxShadow: `0 8px 0 ${C.line}`,
            }}
          >
            <span style={{ fontSize: 31, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>{c.w}</span>
            <div style={{ position: "relative", width: 42, height: 40 }}>
              <div
                style={{
                  position: "absolute",
                  bottom: 2,
                  width: 38,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: C.line,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 2,
                  width: 38,
                  height: 7 + 29 * clamp01(shown),
                  borderRadius: 5,
                  backgroundColor: isWinner ? C.mint : `${c.color}cc`,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* winner landing under the ring */}
      {frame >= 112 ? (
        <div
          style={{
            position: "absolute",
            left: CX,
            top: WINNER_Y,
            translate: "-50% -50%",
            display: "flex",
            flexDirection: "column-reverse",
            alignItems: "center",
            gap: 12,
            opacity: clamp01((frame - 112) / 7),
            scale: 0.5 + 0.5 * Math.max(0, bow),
          }}
        >
          <div
            style={{
              padding: "12px 40px",
              borderRadius: 30,
              background: `linear-gradient(135deg, ${C.mint}, ${C.sky})`,
              color: "#fff",
              fontSize: 54,
              fontWeight: 700,
              letterSpacing: 3,
              whiteSpace: "nowrap",
              boxShadow: `0 12px 0 #33bfa3, 0 0 ${54 + 40 * glow}px ${C.mint}55`,
            }}
          >
            尊敬的
          </div>
          <div
            style={{
              padding: "4px 18px",
              borderRadius: 999,
              backgroundColor: C.card,
              border: `2.5px solid ${C.mint}`,
              fontSize: 27,
              fontWeight: 700,
              color: C.ink,
              whiteSpace: "nowrap",
              opacity: clamp01((frame - 124) / 10),
            }}
          >
            得分 0.71 · 最高
          </div>
        </div>
      ) : null}

      {/* confetti */}
      {frame >= 128
        ? Array.from({ length: 22 }, (_, i) => {
            const t = clamp01((frame - 128) / 34);

            const ang = (i / 22) * Math.PI * 2 + (i % 3) * 0.22;

            const d = (90 + ((i * 37) % 40) * 3.2) * easeOut(t);

            const s = 10 + ((i * 53) % 12);

            return (
              <div
                key={`cf-${String(i)}`}
                style={{
                  position: "absolute",
                  left: CX + Math.cos(ang) * d,
                  top: WINNER_Y + Math.sin(ang) * d * 0.62,
                  width: s,
                  height: s * (i % 2 === 0 ? 1 : 0.5),
                  borderRadius: i % 3 === 0 ? "50%" : 3,
                  backgroundColor: [C.butter, C.pink, C.mint, C.sky, C.lilac][i % 5],
                  rotate: `${t * 260 + i * 20}deg`,
                  opacity: 1 - t,
                }}
              />
            );
          })
        : null}

      {/* callout — pinned to the resting spot so it never jitters */}
      <Callout
        a={easeOut(clamp01((frame - 124) / 12))}
        x={CX + 150}
        y={WINNER_Y + 12}
        side="right"
        text="得分最高，就选它"
        color={C.mint}
        leader={24}
      />

      <Caption>整张词表挨个打分，挑出最顺的那个</Caption>
    </>
  );
};

/* ---------------- right column ---------------- */
const RightColumn = ({
  frame,
  a,
  revealed,
}: {
  readonly frame: number;
  readonly a: number;
  readonly revealed: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: 1210,
      top: 236,
      width: 470,
      opacity: a,
      translate: `${(1 - a) * 44}px 0px`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px",
        borderRadius: 28,
        backgroundColor: C.card,
        border: `3px solid ${C.line}`,
        boxShadow: `0 10px 0 ${C.line}`,
      }}
    >
      <Bot size={92} mood={frame < 140 ? "focus" : "happy"} frame={frame} />
      <div>
        <div style={{ fontSize: 22, color: C.muted, fontWeight: 700 }}>已经读到</div>
        <div style={{ fontSize: 30, color: C.ink, fontWeight: 700 }}>7 个词</div>
      </div>
    </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26 }}>
      {READ_SO_FAR.map((t, i) => {
        const r = easeOut(clamp01((frame - 10 - i * 3) / 12));

        const hot = i >= READ_SO_FAR.length - 2;

        return (
          <div
            key={`${t}-${String(i)}`}
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: C.ink,
              backgroundColor: hot ? C.skySoft : C.card,
              border: `2.5px solid ${hot ? C.sky : C.line}`,
              borderRadius: 14,
              padding: "4px 12px",
              opacity: r,
              scale: 0.6 + 0.4 * r,
            }}
          >
            {t}
          </div>
        );
      })}

      {[0, 1, 2].map((i) => {
        const filled = revealed > 0.5 && i === 0;

        const r = easeOut(clamp01((frame - 34 - i * 5) / 12));

        return (
          <div
            key={`q-${String(i)}`}
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: filled ? "#fff" : C.sky,
              backgroundColor: filled ? C.sky : C.skySoft,
              border: `2.5px dashed ${C.sky}`,
              borderRadius: 14,
              padding: "4px 14px",
              opacity: r,
              scale: (0.6 + 0.4 * r) * (filled ? 1.1 : 1),
            }}
          >
            {filled ? "尊敬" : "?"}
          </div>
        );
      })}

      <div
        style={{
          width: 5,
          height: 40,
          alignSelf: "center",
          borderRadius: 3,
          backgroundColor: C.sky,
          opacity: Math.floor(frame / 7) % 2 === 0 ? 1 : 0.12,
        }}
      />
    </div>

    <div
      style={{
        marginTop: 30,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderRadius: 22,
        backgroundColor: C.butterSoft,
        border: `2.5px dashed ${C.butter}`,
        opacity: easeOut(clamp01((frame - 150) / 12)),
      }}
    >
      <span style={{ fontSize: 26, fontWeight: 700, color: C.ink, whiteSpace: "nowrap" }}>
        写完称呼，拼成下一句
      </span>
    </div>
  </div>
);
