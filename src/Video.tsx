import "./lib/font";

import { Interactive, Sequence, useVideoConfig } from "remotion";
import { MusicBed, SfxTrack } from "./components/SfxTrack";
import { ProgressBar } from "./components/ProgressBar";
import { Watermark } from "./components/Watermark";
import { SCENES } from "./lib/theme";
import { DEFAULT_TIMELINE } from "./lib/sfxTimeline";
import { Intro } from "./scenes/Intro";
import { Tokenize } from "./scenes/Tokenize";
import { Embed } from "./scenes/Embed";
import { Transformer } from "./scenes/Transformer";
import { Think } from "./scenes/Think";
import { NextToken } from "./scenes/NextToken";
import { Predict } from "./scenes/Predict";
import { Decode } from "./scenes/Decode";
import { Stream } from "./scenes/Stream";
import { Outro } from "./scenes/Outro";
import type { SfxTimeline } from "./lib/sfxTimeline";

const len = (seconds: number, fps: number) => Math.round(seconds * fps);

/** Frame at which the scene with index `n` starts (cumulative, at 30 fps). */
const startOf = (n: number) =>
  SCENES.slice(0, n).reduce((sum, s) => sum + Math.round(s.seconds * 30), 0);

type VideoProps = { readonly sfx: SfxTimeline };

const VideoInner = ({ sfx }: VideoProps) => {
  const timeline = sfx ?? DEFAULT_TIMELINE;

  const { fps } = useVideoConfig();

  return (
    <>
      <Sequence name="00 按下发送" layout="none" from={startOf(0)} durationInFrames={len(SCENES[0].seconds, fps)}>
        <Intro start={0} />
      </Sequence>
      <Sequence name="01 切成小词" layout="none" from={startOf(1)} durationInFrames={len(SCENES[1].seconds, fps)}>
        <Tokenize start={0.8} />
      </Sequence>
      <Sequence name="02 变成数字" layout="none" from={startOf(2)} durationInFrames={len(SCENES[2].seconds, fps)}>
        <Embed start={2.0} />
      </Sequence>
      <Sequence name="03 层层阅读" layout="none" from={startOf(3)} durationInFrames={len(SCENES[3].seconds, fps)}>
        <Transformer start={3.0} />
      </Sequence>
      <Sequence name="04 打个草稿" layout="none" from={startOf(4)} durationInFrames={len(SCENES[4].seconds, fps)}>
        <Think start={4.6} />
      </Sequence>
      <Sequence name="05 猜下一个词" layout="none" from={startOf(5)} durationInFrames={len(SCENES[5].seconds, fps)}>
        <NextToken start={5.4} />
      </Sequence>
      <Sequence name="06 掷骰子" layout="none" from={startOf(6)} durationInFrames={len(SCENES[6].seconds, fps)}>
        <Predict start={6.8} />
      </Sequence>
      <Sequence name="07 检查" layout="none" from={startOf(7)} durationInFrames={len(SCENES[7].seconds, fps)}>
        <Decode start={8.0} />
      </Sequence>
      <Sequence name="08 送出" layout="none" from={startOf(8)} durationInFrames={len(SCENES[8].seconds, fps)}>
        <Stream start={8.8} />
      </Sequence>
      <Sequence name="09 总结" layout="none" from={startOf(9)} durationInFrames={len(SCENES[9].seconds, fps)}>
        <Outro start={9.2} />
      </Sequence>

      <ProgressBar />
      <Watermark />

      <SfxTrack sfx={timeline} />
      <MusicBed />
    </>
  );
};

export const Video = Interactive.create({
  Component: VideoInner,
  layout: "absolute-fill",
});

/** Composition props exposed to `<Composition defaultProps>`. */
export type { VideoProps };
