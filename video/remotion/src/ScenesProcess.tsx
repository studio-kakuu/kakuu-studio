// scenes 方式のテンプレート:場面・素材・テロップ・効果音をテーマJSONで決める(KAKUU OS から)。
import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { ACCENT, BLACK, FONT, FONT_EN, FONT_JA, WHITE, white } from "./brand";
import { COMMON, fill, type ProcessProps } from "./config";
import { Phone, type Clip } from "./scenes/Phone";
import { FullScreen, type FullClip } from "./scenes/FullScreen";
import { scenePose, type SceneSpec } from "./scenes/camera";
import { Closing, Hook, Rhythm, UrlNotice } from "./scenes/Overlays";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const OUT = Easing.bezier(0.16, 1, 0.3, 1);

// 効果音の音量(すべて自作の合成音。public/sfx/*.wav、作り方は scripts/make-sfx.py)
// 素材は -6dBFS にそろえてある。BGM を後から重ねても邪魔にならないよう全体は控えめ
const VOLUME: Record<string, number> = {
  panel: 0.4, key: 0.3, send: 0.55, pulse: 0.8, tick: 0.4, done: 0.45, alert: 0.6, approve: 0.65,
  whoosh: 0.5, hit: 0.85, hook: 0.6, close: 0.55,
  // 絵本(くものこ もこ)
  ehon_wind: 0.45, ehon_page: 0.4, ehon_sparkle: 0.42, ehon_title: 0.5, ehon_soft: 0.45, ehon_burst: 0.55,
  ehon_rain: 0.5, ehon_bloom: 0.55, ehon_tap: 0.5,
};

type Scene = { from: number; to: number; chip: string; title: string; camera: SceneSpec["camera"] };

// 左上のラベル(場面ごとに切り替わる)
const SceneHeader: React.FC<{ scenes: Scene[]; soft?: boolean }> = ({ scenes, soft }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sc = scenes.find((s) => t >= s.from && t < s.to);
  if (!sc || !sc.chip) return null;
  const f0 = Math.round(sc.from * fps);
  const o = Math.min(interpolate(frame, [f0, f0 + 8], [0, 1], clamp), interpolate(frame, [Math.round(sc.to * fps) - 6, Math.round(sc.to * fps)], [1, 0], clamp));
  return (
    <>
    {/* スマホに寄ったときも読めるよう、ラベルの後ろを暗くする */}
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: soft ? 240 : 300, background: soft ? "linear-gradient(rgba(14,14,14,.55) 0%, rgba(14,14,14,.3) 50%, rgba(14,14,14,0) 100%)" : `linear-gradient(${BLACK} 0%, rgba(14,14,14,.85) 45%, rgba(14,14,14,0) 100%)`, opacity: o }} />
    <div style={{ position: "absolute", left: 80, top: 100, display: "flex", alignItems: "center", gap: 24, opacity: o }}>
      <span style={{ background: ACCENT, color: BLACK, fontFamily: FONT_EN, fontWeight: 700, fontSize: 34, letterSpacing: "0.06em", lineHeight: 1, padding: "11px 22px", borderRadius: 999, translate: `${interpolate(frame, [f0, f0 + 10], [-30, 0], { ...clamp, easing: OUT })}px 0px` }}>{sc.chip}</span>
      <Rhythm key={sc.from} text={sc.title} start={f0 + 3} step={2} style={{ fontFamily: FONT_JA, fontWeight: 700, fontSize: 58, letterSpacing: "0.06em", color: WHITE, lineHeight: 1 }} />
    </div>
    </>
  );
};

// 「DAY 1 COMPLETE」:黒い幕が全面を覆い、大きな文字が刻まれる
const Finale: React.FC<{ from: number; to: number; big: string; small: string; sub?: string }> = ({ from, to, big, small, sub }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  if (frame < f0 - 12 || frame > f1 + 14) return null;
  const x = frame < f1 - 6
    ? interpolate(frame, [f0 - 11, f0], [width, 0], { ...clamp, easing: OUT })
    : interpolate(frame, [f1 - 6, f1 + 12], [0, -width], { ...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0) });
  const glow = interpolate(frame, [f0 + 10, f0 + 30], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ translate: `${x}px 0px`, background: BLACK }}>
      <div style={{ position: "absolute", left: -8, top: 0, bottom: 0, width: 8, background: ACCENT }} />
      {[620, 1300].map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: white(0.1) }} />)}
      <div style={{ position: "absolute", left: 80, right: 80, top: 690 }}>
        <Rhythm text={big} start={f0 - 4} step={3} style={{ fontFamily: FONT_EN, fontWeight: 700, fontSize: 250, letterSpacing: "-0.03em", lineHeight: 0.95, color: WHITE }} />
        <div style={{ height: 12, width: interpolate(frame, [f0 + 4, f0 + 22], [0, 920], { ...clamp, easing: OUT }), background: ACCENT, margin: "34px 0 30px", boxShadow: `0 0 ${30 * glow}px ${ACCENT}` }} />
        <Rhythm text={small} start={f0 + 10} step={2} style={{ fontFamily: FONT_EN, fontWeight: 700, fontSize: 132, letterSpacing: "0.02em", lineHeight: 1, color: ACCENT }} />
        {sub && <div style={{ marginTop: 44, fontFamily: FONT_JA, fontWeight: 700, fontSize: 46, color: white(0.75), opacity: interpolate(frame, [f0 + 30, f0 + 44], [0, 1], clamp) }}>{sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

// 早送りなどの表示(右上)
const Badges: React.FC<{ items: { from: number; to: number; text: string }[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const b = items.find((x) => t >= x.from && t < x.to);
  if (!b) return null;
  const o = Math.min(interpolate(t, [b.from, b.from + 0.2], [0, 1], clamp), interpolate(t, [b.to - 0.2, b.to], [1, 0], clamp));
  return (
    <div style={{ position: "absolute", right: 80, top: 96, display: "flex", alignItems: "center", gap: 14, opacity: o, fontFamily: FONT_EN, fontWeight: 700, fontSize: 44, color: ACCENT, letterSpacing: "0.04em" }}>
      <span style={{ display: "inline-flex", gap: 4 }}>{[0, 1].map((k) => <span key={k} style={{ width: 0, height: 0, borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderLeft: `20px solid ${ACCENT}`, opacity: 0.55 + 0.45 * ((Math.floor(t * 4) + k) % 2) }} />)}</span>
      {b.text}
    </div>
  );
};

// 画面下の小さな一言(small)/字幕(caption)
const Notes: React.FC<{ items: { from: number; to: number; text: string; size?: "small" | "caption" }[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const n = items.find((x) => t >= x.from && t < x.to);
  if (!n) return null;
  const o = Math.min(interpolate(t, [n.from, n.from + 0.25], [0, 1], clamp), interpolate(t, [n.to - 0.25, n.to], [1, 0], clamp));
  const cap = n.size === "caption";
  return (
    <>
      {cap && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 420, background: `linear-gradient(rgba(14,14,14,0), rgba(14,14,14,.92) 55%, ${BLACK})`, opacity: o }} />}
      <div style={{ position: "absolute", left: 80, right: 80, bottom: cap ? 150 : 70, textAlign: "center", opacity: o, translate: `0px ${(1 - o) * 12}px`,
        fontFamily: FONT, fontWeight: cap ? 700 : 500, fontSize: cap ? 50 : 28, lineHeight: 1.4, letterSpacing: cap ? "0.02em" : "0.1em", color: cap ? WHITE : white(0.6), whiteSpace: "pre-line" }}>
        {cap ? n.text.split("←").map((part, i) => i === 0 ? <span key={i}>{part}</span> : <span key={i} style={{ color: ACCENT }}>← {part.trim()}</span>) : n.text}
      </div>
    </>
  );
};

// 背景:黒地に細い罫線
const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: BLACK }}>
    {[380, 1540].map((y) => <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: white(0.08) }} />)}
  </AbsoluteFill>
);

export const ScenesProcess: React.FC<ProcessProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const scenes = props.scenes as Scene[];
  const pose = React.useMemo(() => scenePose(scenes), [scenes]);
  const closingStart = props.closingStart ?? 56;
  const closingTpl = props.closing?.[props.platform] ?? COMMON.closing[props.platform];
  const fin = props.finale;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      {props.frame === "full"
        ? <FullScreen slug={props.slug} clips={props.clips as FullClip[]} pose={pose} />
        : <Phone slug={props.slug} clips={props.clips as Clip[]} pose={pose} hidden={(t) => !!fin && t >= fin.from + 0.1 && t < fin.to - 0.4} />}
      <SceneHeader scenes={scenes} soft={props.frame === "full"} />
      {props.badges && <Badges items={props.badges} />}
      {props.notes && <Notes items={props.notes} />}
      {fin && <Finale {...fin} />}
      <Sequence name="Hook" durationInFrames={Math.round(((props.hookEnd ?? 2) + 0.5) * fps)} premountFor={fps}>
        <Hook text={fill(props.hook ?? COMMON.hookTemplate, props)} accent={props.hookAccent ?? `${props.minutes}分`} endSec={props.hookEnd ?? 2} />
      </Sequence>
      <Sequence name="Closing" from={Math.round(closingStart * fps)} durationInFrames={durationInFrames - Math.round(closingStart * fps)} layout="none">
        <Closing text={fill(closingTpl, props)} keyword={props.keyword} handle={COMMON.handle} sub={props.closingSub} />
      </Sequence>
      {props.urlNotice && <UrlNotice text={props.urlNotice} at={props.urlNoticeAt as unknown as readonly [number, number] | undefined} backing={props.frame === "full"} />}
      {(props.sfx ?? []).map((s, i) => (
        <Sequence key={i} name={`sfx:${s.type}`} from={Math.max(0, Math.round(s.at * fps))} durationInFrames={Math.round(3 * fps)} layout="none">
          <Audio src={staticFile(`sfx/${s.type}.wav`)} volume={VOLUME[s.type] ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
