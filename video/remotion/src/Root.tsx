import React from "react";
import { Composition, Folder } from "remotion";
import { Process } from "./Process";
import { COMMON, TL, processSchema } from "./config";
import cafe from "../../themes/cafe.json";

// 尺は _common.json の timeline.closing[1](61〜75秒)
const DURATION = Math.round(TL.closing[1] * COMMON.fps);

// 作品ごとの値は render スクリプトが --props で上書きする(既定値はカフェ)
export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="KAKUU-STUDIO">
      <Composition
        id="Process-instagram"
        component={Process}
        schema={processSchema}
        durationInFrames={DURATION}
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
        fps={COMMON.fps}
        width={COMMON.width}
        height={COMMON.height}
        defaultProps={{ slug: cafe.slug, theme: cafe.theme, keyword: cafe.keyword, minutes: 8, platform: "x" as const }}
      />
    </Folder>
  );
};
