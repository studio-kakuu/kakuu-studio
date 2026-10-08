// 立体的なスマホ枠。中に撮影済みのサイト動画を区間ごとに差し替えて流す。
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { BLACK, white } from "../brand";
import { TL } from "../config";
import { poseAt, type Pose } from "./camera";

// 撮影素材 780x1688(390x844 の2倍)を幅600で表示
const SCREEN_W = 600;
const SCREEN_H = Math.round((SCREEN_W * 844) / 390);
const BEZEL = 16;
const W = SCREEN_W + BEZEL * 2;
const H = SCREEN_H + BEZEL * 2;

export type Clip = { id: string; from: number; seconds: number; trimBefore?: number; playbackRate?: number; src?: string };

// clips / pose を渡さない場合はカフェ版(STEP 1〜3)の既定の並びとカメラになる
export const Phone: React.FC<{ slug: string; clips?: Clip[]; pose?: (t: number) => Pose; hidden?: (t: number) => boolean }> = ({ slug, clips: customClips, pose, hidden }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const p = pose ? pose(t) : poseAt(t);

  // 区間の切れ目で素材を切り替える(切れ目はSTEPカードで隠れている)
  const clips: Clip[] = customClips ?? [
    { id: "intro", from: 0, seconds: TL.step1[0] },
    { id: "step1", from: TL.step1[0], seconds: TL.step2[0] - TL.step1[0] },
    { id: "step2", from: TL.step2[0], seconds: TL.step3[0] - TL.step2[0] },
    { id: "step3", from: TL.step3[0], seconds: TL.complete[0] - TL.step3[0] },
    { id: "complete", from: TL.complete[0], seconds: TL.closing[1] - TL.complete[0] },
  ];

  return (
    <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: "50% 40%", opacity: hidden?.(t) ? 0 : 1 }}>
      {/* 背面のほのかな光 */}
      <div
        style={{
          position: "absolute", left: width / 2 - 560 + p.tx, top: height / 2 - 700 + p.ty, width: 1120, height: 1400,
          background: `radial-gradient(closest-side, ${white(0.07)}, ${white(0)})`,
          scale: String(p.s),
        }}
      />
      <div
        style={{
          position: "absolute",
          left: (width - W) / 2,
          top: (height - H) / 2,
          width: W,
          height: H,
          transformStyle: "preserve-3d",
          translate: `${p.tx}px ${p.ty}px`,
          scale: String(p.s),
          rotate: `x ${p.rx}deg`,
          transform: `rotateY(${p.ry}deg) rotateZ(${p.rz}deg)`,
        }}
      >
        {/* 厚み(奥の面) */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 78, border: `2px solid ${white(0.22)}`, transform: "translateZ(-18px)", background: BLACK }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 78, border: `2px solid ${white(0.12)}`, transform: "translateZ(-9px)" }} />
        {/* 前面 */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 78, border: `2px solid ${white(1)}`, background: BLACK, padding: BEZEL - 2 }}>
          <div style={{ position: "relative", width: SCREEN_W, height: SCREEN_H, borderRadius: 62, overflow: "hidden", background: BLACK }}>
            {clips.map((c) => (
              <Sequence key={`${c.id}-${c.from}`} name={`screen:${c.id}`} from={Math.round(c.from * fps)} durationInFrames={Math.round(c.seconds * fps)} premountFor={fps}>
                <Video src={staticFile(c.src ?? `${slug}/${c.id}.mp4`)} trimBefore={c.trimBefore ? Math.round(c.trimBefore * fps) : undefined} playbackRate={c.playbackRate ?? 1} muted style={{ width: SCREEN_W, height: SCREEN_H, objectFit: "cover" }} />
              </Sequence>
            ))}
            {/* ガラスの映り込み */}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(120deg, ${white(0.1)} 0%, ${white(0)} 32%, ${white(0)} 70%, ${white(0.05)} 100%)` }} />
            <div style={{ position: "absolute", inset: 0, background: BLACK, opacity: p.dim }} />
          </div>
          <div style={{ position: "absolute", top: BEZEL + 16, left: "50%", width: 150, height: 40, marginLeft: -75, borderRadius: 20, background: BLACK }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
