import { useFonts } from "../lib/font";
import { C, LAYOUT } from "../lib/theme";

/**
 * Quiet brand mark in the bottom-right corner.
 *
 * Placement, tuned against the other bottom chrome and verified on a render
 * (rendered ink box: x 1463..1767, y 989..1019, 153px from the right edge):
 *  - ProgressBar: left/right 60, bottom 24, height 10 → its top edge is y=1046,
 *    so the mark sits ~89px above it.
 *  - Caption: centred between x=150 and x=1770, top y=905, ~94px tall. The mark
 *    starts at x≈1485; every caption pill is narrower than the 1500px max
 *    width, so it ends well left of the mark (verified on a render).
 */
export const Watermark = () => {
  useFonts();

  return (
    <div
      style={{
        position: "absolute",
        right: LAYOUT.padX,
        bottom: 56,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
        opacity: 0.8,
        pointerEvents: "none",
      }}
    >
      {/* glyph: two overlapping rounded squares — mint behind, sky in front */}
      <div
        style={{
          position: "relative",
          width: 34,
          height: 34,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 23,
            height: 23,
            borderRadius: 6,
            backgroundColor: C.mintSoft,
            border: `1.5px solid ${C.mint}`,
            boxSizing: "border-box",
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            width: 23,
            height: 23,
            borderRadius: 6,
            backgroundColor: "rgba(255,255,255,0.95)",
            border: `1.5px solid ${C.sky}`,
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 13.5,
            top: 13.5,
            width: 2.5,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: C.muted,
            opacity: 0.7,
          }}
        />
      </div>

      <div
        style={{
          height: 36,
          display: "flex",
          alignItems: "center",
          fontSize: 22,
          lineHeight: "36px",
          letterSpacing: 1.5,
          color: "#7e93b8",
          whiteSpace: "nowrap",
        }}
      >
        DSH · DeepSeek Harness
      </div>
    </div>
  );
};
