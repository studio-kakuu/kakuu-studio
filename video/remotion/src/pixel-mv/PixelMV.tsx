// 作品006 v2「ドット絵アクション」の Remotion 部分。絵づくりは scenes.ts(180×320 で描いて 1080×1920 にぼかさず拡大)。
// withText=true のとき、冒頭 1.5 秒以内に制作方法の文字を出す(CLAUDE.md のフック)。文字なし版も同じ絵。
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { compose, drawFrame, FPS, TOTAL } from "./scenes";

export const PMV_FPS = FPS;
export const PMV_FRAMES = TOTAL;
const OW = 1080;
const OH = 1920;

loadFont({ family: "Zen Kaku Gothic New", url: staticFile("fonts/ZenKakuGothicNew-Black.ttf"), weight: "900" });

// 冒頭の文字(画面の文字・一字一句)
export const HOOK = ["AIとコードだけで", "ドット絵バトルを作った"];

const Hook: React.FC<{ f: number }> = ({ f }) => {
  // 冒頭の決め技(0〜1.2秒)の上にだけ出し、巻き戻しが始まる 29 コマ目で消す
  if (f >= 29) return null;
  const o = 1;
  const shadow = [-6, 0, 6].flatMap((x) => [-6, 0, 6].map((y) => `${x}px ${y}px 0 #000`)).join(",");
  return (
    <AbsoluteFill style={{ opacity: o, alignItems: "center", paddingTop: 300 }}>
      {HOOK.map((t, i) => (
        <div key={i} style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: i === 0 ? 70 : 84, color: i === 0 ? "#ffe066" : "#ffffff",
          textShadow: shadow, letterSpacing: 2, lineHeight: 1.3, transform: `translateY(${f < 4 ? (4 - f) * 6 : 0}px)` }}>
          {t}
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const PixelMV: React.FC<{ withText?: boolean; withAudio?: boolean }> = ({ withText = false, withAudio = true }) => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const out = compose(drawFrame(f), OW, OH);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(out.buffer as ArrayBuffer), OW, OH), 0, 0);
  }, [f]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={OW} height={OH} style={{ width: OW, height: OH }} />
      {withText && <Hook f={f} />}
      {withAudio && <Audio src={staticFile("pixel-mv/sfx_mix.wav")} />}
    </AbsoluteFill>
  );
};
