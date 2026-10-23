import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import type { SfxName } from "../lib/cueTypes";
import { CUE_LIST } from "../lib/cues";
import type { SfxTimeline } from "../lib/sfxTimeline";
import { cueSrc } from "../lib/audioSrc";

/** 单个音效的预览：注册成一个 Composition 导出，就能听到。 */
export const SfxPreview = ({ name }: { readonly name: SfxName }) => <Audio src={cueSrc(name)} />;

/**
 * 全片音效轨：每个音效是一个独立的 <Audio>，
 * 依次从上一个结束处开始，排成一条连续的音轨。
 * （数据由 calculateSfxMetadata 读出 WAV 真实时长后填入。）
 */
export const SfxTrack = ({ sfx }: { readonly sfx: SfxTimeline }) => {
  const { fps } = useVideoConfig();

  return (
    <>
      {CUE_LIST.map((cue, i) => (
        <Audio
          key={`${String(i)}-${cue.src}`}
          src={cueSrc(cue.src)}
          from={Math.round((sfx.offsets[i] ?? 0) * fps)}
          volume={0.85}
        />
      ))}
    </>
  );
};

/** 背景：轻柔音乐循环 + 思考段的铺垫音。 */
export const MusicBed = () => {
  const { fps } = useVideoConfig();

  return (
    <>
      <Audio name="背景音乐" src={staticFile("sfx/music-loop.wav")} loop volume={0.12} />
      <Audio
        name="思考铺垫音"
        src={staticFile("sfx/think-loop.wav")}
        from={Math.round(4.55 * fps)}
        durationInFrames={Math.round(6.6 * fps)}
        loop
        volume={0.18}
      />
    </>
  );
};
