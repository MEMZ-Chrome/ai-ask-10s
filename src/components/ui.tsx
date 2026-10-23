import type { CSSProperties, ReactNode } from "react";
import { C, LAYOUT } from "../lib/theme";
import { FONT_FAMILY } from "../lib/font";

/**
 * 界面零件：场景标题、白卡片、底部一句话字幕、圆角小标签。
 * 全部只吃颜色和排版，动画由调用方用 frame 驱动；这里不写任何 transition。
 */

/** 场景标题：左边一个渐变圆形序号徽章，右边一行 52px 粗体。 */
export const Header = ({
  step,
  title,
}: {
  readonly step: string;
  readonly title: string;
}) => (
  <div
    style={{
      position: "absolute",
      left: LAYOUT.padX,
      top: LAYOUT.padTop,
      display: "flex",
      alignItems: "center",
      gap: 20,
      fontFamily: FONT_FAMILY,
    }}
  >
    <div
      style={{
        width: 62,
        height: 62,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: "0.01em",
        fontVariantNumeric: "tabular-nums",
        color: "#fff",
        background: `linear-gradient(145deg, ${C.mint} 0%, ${C.sky} 100%)`,
        boxShadow: `0 8px 0 rgba(199, 218, 240, 0.55), 0 14px 30px ${C.sky}38`,
      }}
    >
      {step}
    </div>
    <div
      style={{
        fontSize: 52,
        fontWeight: 700,
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
        color: C.ink,
        whiteSpace: "nowrap",
      }}
    >
      {title}
    </div>
  </div>
);

/** 白卡片：34px 圆角、3px 柔和描边、两层柔光阴影（落在纸面上，不是压上去的）。 */
export const Card = ({
  children,
  style,
  color = C.card,
}: {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  readonly color?: string;
}) => (
  <div
    style={{
      boxSizing: "border-box",
      background: color,
      border: `3px solid ${C.line}`,
      borderRadius: 34,
      boxShadow: `0 12px 0 rgba(199, 218, 240, 0.35), 0 28px 64px rgba(72, 168, 245, 0.14)`,
      fontFamily: FONT_FAMILY,
      ...style,
    }}
  >
    {children}
  </div>
);

/** 底部一行短字幕：白药丸、水平居中，以 LAYOUT.captionY 为垂直中心，最宽 1500。 */
export const Caption = ({ children }: { readonly children?: ReactNode }) => (
  <div
    style={{
      position: "absolute",
      left: LAYOUT.padX,
      right: LAYOUT.padX,
      top: LAYOUT.captionY,
      height: 0,
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        maxWidth: 1500,
        boxSizing: "border-box",
        // 以 captionY 为字幕的垂直中心：底部一行字永远落在同一基线上
        translate: "0 -50%",
        fontFamily: FONT_FAMILY,
        fontSize: 40,
        fontWeight: 400,
        lineHeight: 1.35,
        letterSpacing: "0em",
        color: C.ink,
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        padding: "14px 46px",
        borderRadius: 999,
        backgroundColor: "rgba(255, 255, 255, 0.94)",
        border: `2.5px solid ${C.line}`,
        boxShadow:
          "0 10px 0 rgba(199, 218, 240, 0.4), 0 18px 40px rgba(72, 168, 245, 0.12)",
        // 绝对定位 + 自动外边距 = 在父盒子里水平居中，且不会被 flex 拉满宽度
        position: "absolute",
        left: 0,
        right: 0,
        margin: "0 auto",
        width: "fit-content",
      }}
    >
      {children}
    </div>
  </div>
);

/**
 * 圆角小标签：3px 彩色描边 + 浅色填充 + 底部一道"键帽"影子。
 * 阴影随字号缩放；字号越大字距略收紧（小字保持 0）。
 */
export const Chip = ({
  label,
  color,
  soft,
  size = 44,
  style,
  icon,
}: {
  readonly label: ReactNode;
  readonly color: string;
  readonly soft: string;
  readonly size?: number;
  readonly style?: CSSProperties;
  readonly icon?: ReactNode;
}) => {
  const radius = Math.round(size * 0.34);
  const keycap = Math.max(3, Math.round(size * 0.11));
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(size * 0.2),
        boxSizing: "border-box",
        padding: `${Math.round(size * 0.16)}px ${Math.round(size * 0.4)}px`,
        borderRadius: radius,
        backgroundColor: soft,
        border: `3px solid ${color}`,
        color: C.ink,
        fontFamily: FONT_FAMILY,
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.15,
        letterSpacing: size >= 60 ? "-0.01em" : "0em",
        whiteSpace: "nowrap",
        boxShadow: `0 ${keycap}px 0 ${color}66`,
        ...style,
      }}
    >
      {icon ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: Math.round(size * 0.8),
          }}
        >
          {icon}
        </span>
      ) : null}
      {label}
    </div>
  );
};
