import { Composition, Folder } from "remotion";
import { Video } from "./Video";
import { SCENE_TOTAL_FRAMES } from "./lib/theme";
import { DEFAULT_TIMELINE, calculateSfxMetadata } from "./lib/sfxTimeline";
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
import { SfxPreview } from "./components/SfxTrack";

const UNIFORM = { width: 1920, height: 1080, fps: 30 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        {...UNIFORM}
        id="AiAnswer10s"
        component={Video}
        durationInFrames={SCENE_TOTAL_FRAMES}
        defaultProps={{ sfx: DEFAULT_TIMELINE }}
        calculateMetadata={calculateSfxMetadata}
      />

      <Folder name="Scenes">
        <Composition {...UNIFORM} id="Intro" component={Intro} durationInFrames={135} defaultProps={{ start: 0 }} />
        <Composition {...UNIFORM} id="Tokenize" component={Tokenize} durationInFrames={225} defaultProps={{ start: 0.8 }} />
        <Composition {...UNIFORM} id="Embed" component={Embed} durationInFrames={210} defaultProps={{ start: 2.0 }} />
        <Composition
          {...UNIFORM}
          id="Transformer"
          component={Transformer}
          durationInFrames={285}
          defaultProps={{ start: 3.0 }}
        />
        <Composition {...UNIFORM} id="Think" component={Think} durationInFrames={195} defaultProps={{ start: 4.6 }} />
        <Composition {...UNIFORM} id="NextToken" component={NextToken} durationInFrames={180} defaultProps={{ start: 5.4 }} />
        <Composition {...UNIFORM} id="Predict" component={Predict} durationInFrames={195} defaultProps={{ start: 6.8 }} />
        <Composition {...UNIFORM} id="Decode" component={Decode} durationInFrames={210} defaultProps={{ start: 8.0 }} />
        <Composition {...UNIFORM} id="Stream" component={Stream} durationInFrames={180} defaultProps={{ start: 8.8 }} />
        <Composition {...UNIFORM} id="Outro" component={Outro} durationInFrames={240} defaultProps={{ start: 9.2 }} />
      </Folder>

      <Folder name="Audio">
        <Composition
          {...UNIFORM}
          id="SfxPreview"
          component={SfxPreview}
          durationInFrames={120}
          defaultProps={{ name: "finale" }}
        />
      </Folder>
    </>
  );
};
