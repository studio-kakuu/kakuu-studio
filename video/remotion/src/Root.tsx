import React from "react";
import { type CalculateMetadataFunction, Composition, Folder } from "remotion";
import { Process } from "./Process";
import { COMMON, TL, processSchema, type ProcessProps } from "./config";
import cafe from "../../themes/cafe.json";
import { MotionMV } from "./motion-mv/MotionMV";

// 尺は _common.json の timeline.closing[1](61〜75秒)
const DURATION = Math.round(TL.closing[1] * COMMON.fps);
// テーマに duration(61〜75秒)があればその長さにする
const calculateMetadata: CalculateMetadataFunction<ProcessProps> = ({ props }) =>
  props.duration ? { durationInFrames: Math.round(props.duration * COMMON.fps) } : {};

// 作品ごとの値は render スクリプトが --props で上書きする(既定値はカフェ)
export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Folder name="MOTION-100">
      {(["instagram", "tiktok", "x"] as const).map((p) => (
        <Composition key={p} id={`MotionMV-${p}`} component={MotionMV} durationInFrames={Math.round(126.06 * 30)} fps={30} width={1080} height={1920} defaultProps={{ platform: p }} />
      ))}
    </Folder>
    <Folder name="KAKUU-STUDIO">
      <Composition
        id="Process-instagram"
        component={Process}
        schema={processSchema}
        durationInFrames={DURATION}
        calculateMetadata={calculateMetadata}
        fps={COMMON.fps}
        width={COMMON.width}
        height={COMMON.height}
        defaultProps={{ slug: cafe.slug, theme: cafe.theme, keyword: cafe.keyword, minutes: 8, platform: "instagram" as const }}
      />
      <Composition
        id="Process-tiktok"
        component={Process}
        schema={processSchema}
        durationInFrames={DURATION}
        calculateMetadata={calculateMetadata}
        fps={COMMON.fps}
        width={COMMON.width}
        height={COMMON.height}
        defaultProps={{ slug: cafe.slug, theme: cafe.theme, keyword: cafe.keyword, minutes: 8, platform: "tiktok" as const }}
      />
      <Composition
        id="Process-x"
        component={Process}
        schema={processSchema}
        durationInFrames={DURATION}
        calculateMetadata={calculateMetadata}
        fps={COMMON.fps}
        width={COMMON.width}
        height={COMMON.height}
        defaultProps={{ slug: cafe.slug, theme: cafe.theme, keyword: cafe.keyword, minutes: 8, platform: "x" as const }}
      />
    </Folder>
    </>
  );
};
