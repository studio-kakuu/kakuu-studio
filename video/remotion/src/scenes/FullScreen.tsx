// 全画面モード:撮影した画面を 9:16 いっぱいに流す(絵本など、作品そのものを大きく見せたいとき)
// wipe: true の素材は、右から左へ「めくる」ように前の素材を置き換える(ビフォーアフターの見比べ)
import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { BLACK, WHITE } from "../brand";
import type { Pose } from "./camera";

// 前の素材は、次の素材が wipe で入りきるまで下に残す
const WIPE = 0.5;

export type FullClip = { id: string; from: number; seconds: number; trimBefore?: number; playbackRate?: number; wipe?: boolean };

const Wipe: React.FC<{ children: React.ReactNode; enabled?: boolean }> = ({ children, enabled }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  if (!enabled) return <AbsoluteFill>{children}</AbsoluteFill>;
  const k = interpolate(frame, [0, Math.round(WIPE * fps)], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${k}%)` }}>{children}</AbsoluteFill>
      {k > 0 && k < 100 && <div style={{ position: "absolute", top: 0, bottom: 0, left: (width * k) / 100 - 3, width: 6, background: WHITE, boxShadow: "0 0 24px rgba(0,0,0,.35)" }} />}
    </AbsoluteFill>
  );
};

export const FullScreen: React.FC<{ slug: string; clips: FullClip[]; pose: (t: number) => Pose }> = ({ slug, clips, pose }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pose(frame / fps);
  return (
    <AbsoluteFill style={{ background: BLACK, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: String(p.s), translate: `${p.tx}px ${p.ty}px` }}>
        {clips.map((c, i) => (
          <Sequence key={`${c.id}-${c.from}`} name={`full:${c.id}`} from={Math.round(c.from * fps)} durationInFrames={Math.round((c.seconds + (clips[i + 1]?.wipe ? WIPE : 0)) * fps)} premountFor={fps}>
            <Wipe enabled={c.wipe}>
              <Video src={staticFile(`${slug}/${c.id}.mp4`)} trimBefore={c.trimBefore ? Math.round(c.trimBefore * fps) : undefined} playbackRate={c.playbackRate ?? 1} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Wipe>
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: BLACK, opacity: p.dim }} />
    </AbsoluteFill>
  );
};
