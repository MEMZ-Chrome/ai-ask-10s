import { staticFile } from "remotion";
import type { SfxName } from "./cueTypes";

export const cueSrc = (name: SfxName) => staticFile(`sfx/${name}.wav`);
