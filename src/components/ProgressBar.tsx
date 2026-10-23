import { useCurrentFrame } from "remotion";
import { C, SCENE_TOTAL_FRAMES } from "../lib/theme";

/** Thin rainbow progress line at the very bottom. */
export const ProgressBar = () => {
  const frame = useCurrentFrame();

  const progress = Math.min(1, Math.max(0, frame / Math.max(1, SCENE_TOTAL_FRAMES - 1)));

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        bottom: 24,
        height: 10,
        borderRadius: 5,
        backgroundColor: "rgba(199, 218, 240, 0.55)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          borderRadius: 5,
          background: `linear-gradient(90deg, ${C.sky}, ${C.mint}, ${C.butter})`,
        }}
      />
    </div>
  );
};
