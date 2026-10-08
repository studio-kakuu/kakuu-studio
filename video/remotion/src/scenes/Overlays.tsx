// 枠・テロップ類(すべて KAKUU STUDIO の3色と2フォント)
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, BLACK, FONT, FONT_EN, FONT_JA, WHITE, white } from "../brand";
import { COMMON, TL } from "../config";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const IN = Easing.bezier(0.7, 0, 0.84, 0);

// 1文字ずつ、ばねで立ち上がる文字
export const Rhythm: React.FC<{ text: string; start: number; step?: number; style?: React.CSSProperties; accent?: string }> = ({ text, start, step = 2, style, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = [...text];
  const accentFrom = accent ? text.indexOf(accent) : -1;
  return (
    <span style={{ display: "inline-block", whiteSpace: "nowrap", ...style }}>
      {chars.map((c, i) => {
        const k = spring({ frame: frame - start - i * step, fps, config: { damping: 16, stiffness: 170, mass: 0.7 } });
        const isAccent = accentFrom >= 0 && i >= accentFrom && i < accentFrom + (accent?.length ?? 0);
        return (
          <span key={i} style={{ display: "inline-block", opacity: Math.min(1, k * 1.4), translate: `0px ${(1 - k) * 0.55}em`, color: isAccent ? ACCENT : undefined }}>
            {c === " " ? " " : c}
          </span>
        );
      })}
    </span>
  );
};

// 背景:黒地に大きな輪郭数字と細い罫線(白の不透明度のみ)
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const label = t >= TL.step3[0] && t < TL.complete[0] ? "03" : t >= TL.step2[0] && t < TL.step3[0] ? "02" : t >= TL.step1[0] && t < TL.step2[0] ? "01" : "";
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      {[380, 1540].map((y) => (
        <div key={y} style={{ position: "absolute", left: 0, right: 0, top: y, height: 1, background: white(0.08) }} />
      ))}
      {label && (
        <div
          style={{
            position: "absolute", right: -40, bottom: 120, fontFamily: FONT_EN, fontWeight: 700, fontSize: 760, lineHeight: 1,
            color: "transparent", WebkitTextStroke: `2px ${white(0.07)}`, letterSpacing: "-0.04em",
            translate: `${interpolate(t % 12.5, [0, 12.5], [40, -40])}px 0px`,
          }}
        >
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};

// 上部ラベル(STEPチップ+見出し)と進捗バー
export const Header: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const steps = COMMON.steps;
  let chip = "", title = "", segStart = 0;
  if ((t >= TL.intro[0] && t < TL.step1[0]) || (t >= TL.complete[0] && t < TL.closing[0])) {
    chip = "COMPLETE"; title = "完成"; segStart = t < TL.step1[0] ? TL.intro[0] : TL.complete[0];
  }
  steps.forEach((s) => {
    const seg = TL[s.id as "step1"];
    if (t >= seg[0] && t < seg[1]) { chip = s.label; title = s.title; segStart = seg[0]; }
  });
  if (!chip) return null;
  const local = frame - Math.round(segStart * fps) - (chip === "COMPLETE" ? 0 : Math.round(0.55 * fps));
  const showBars = t >= TL.step1[0] && t < TL.step3[1];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 80, top: 100, display: "flex", alignItems: "center", gap: 24, opacity: interpolate(local, [0, 8], [0, 1], clamp) }}>
        <span style={{ background: ACCENT, color: BLACK, fontFamily: FONT_EN, fontWeight: 700, fontSize: 34, letterSpacing: "0.06em", lineHeight: 1, padding: "11px 22px", borderRadius: 999 }}>{chip}</span>
        <Rhythm text={title} start={Math.round(segStart * fps) + (chip === "COMPLETE" ? 0 : Math.round(0.55 * fps))} step={3} style={{ fontFamily: FONT_JA, fontWeight: 700, fontSize: 60, letterSpacing: "0.08em", color: WHITE, lineHeight: 1 }} />
      </div>
      {showBars && (
        <div style={{ position: "absolute", left: 80, right: 80, top: 232, display: "flex", gap: 12 }}>
          {steps.map((s) => {
            const seg = TL[s.id as "step1"];
            return (
              <div key={s.id} style={{ flex: 1, height: 4, borderRadius: 2, background: white(0.18), overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: ACCENT, transformOrigin: "0 50%", scale: `${interpolate(t, [seg[0], seg[1]], [0, 1], clamp)} 1` }} />
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

// STEP 切り替えのカード(黒い幕が横切り、大きな文字が刻まれる)
export const StepCard: React.FC<{ at: number; label: string; title: string }> = ({ at, label, title }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f0 = Math.round(at * fps);
  const local = frame - f0;
  if (local < -12 || local > 30) return null;
  const enter = interpolate(local, [-11, 0], [width, 0], { ...clamp, easing: OUT });
  const exit = interpolate(local, [17, 29], [0, -width], { ...clamp, easing: IN });
  const x = local < 17 ? enter : exit;
  return (
    <AbsoluteFill style={{ translate: `${x}px 0px`, background: BLACK }}>
      <div style={{ position: "absolute", left: -8, top: 0, bottom: 0, width: 8, background: ACCENT }} />
      <div style={{ position: "absolute", left: 80, top: 760 }}>
        <Rhythm text={label} start={f0 - 6} step={2} style={{ fontFamily: FONT_EN, fontWeight: 700, fontSize: 190, letterSpacing: "-0.02em", lineHeight: 1, color: WHITE }} />
        <div style={{ height: 10, width: interpolate(local, [-4, 10], [0, 220], { ...clamp, easing: OUT }), background: ACCENT, margin: "34px 0 40px" }} />
        <Rhythm text={title} start={f0} step={3} style={{ fontFamily: FONT_JA, fontWeight: 700, fontSize: 120, letterSpacing: "0.06em", lineHeight: 1, color: WHITE }} />
      </div>
    </AbsoluteFill>
  );
};

// 「完成サイトのURLは最後に」:右下固定、全作品で同じ位置・フォント・色
export const UrlNotice: React.FC<{ text?: string; at?: readonly [number, number] }> = ({ text = COMMON.urlNotice, at = TL.urlNotice }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [a, b] = at;
  const o = Math.min(interpolate(t, [a, a + 0.3], [0, 1], clamp), interpolate(t, [b - 0.3, b], [1, 0], clamp));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 56, bottom: 56, fontFamily: FONT_JA, fontWeight: 700, fontSize: 34, lineHeight: 1, letterSpacing: "0.04em", color: ACCENT, opacity: o }}>
      {text}
    </div>
  );
};

const lines = (s: string) => s.split("\n");
// 文字間(letter-spacing 0.03em)の分も見込んで、1行が area に収まる大きさにする
const fitSize = (ls: string[], max: number, area = 900) =>
  Math.min(max, Math.floor(area / Math.max(...ls.map((l) => [...l].reduce((w, c) => w + (c.charCodeAt(0) < 0x2000 ? 0.62 : 1) + 0.03, 0)))));

// 冒頭のフック
export const Hook: React.FC<{ text: string; accent: string; endSec?: number }> = ({ text, accent, endSec = TL.hook[1] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = Math.round(endSec * fps);
  const ls = lines(text);
  const size = fitSize(ls, 112);
  if (frame > end + 12) return null;
  const leave = interpolate(frame, [end - 8, end + 10], [0, 1], { ...clamp, easing: IN });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: 1 - leave, translate: `0px ${-leave * 80}px` }}>
      <Img src={staticFile("brand/logo.svg")} style={{ position: "absolute", top: 150, left: "50%", width: 330, marginLeft: -165 }} />
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.42, letterSpacing: "0.03em", color: WHITE, textAlign: "center", scale: String(interpolate(frame, [0, end], [1.06, 1], { ...clamp, easing: OUT })) }}>
        {ls.map((l, i) => (
          <div key={i} style={{ overflow: "hidden", paddingBottom: 6 }}>
            {/* 0コマ目から全文読めるよう、文字は最初から表示。分数だけ弾ませる */}
            <Rhythm text={l} start={-40} step={1} accent={l.includes(accent) ? accent : undefined} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// 締め(媒体別)
export const Closing: React.FC<{ text: string; keyword: string; handle: string; sub?: string }> = ({ text, keyword, handle, sub }) => {
  const frame = useCurrentFrame();
  // Sequence の中なので frame は締めの開始からの相対コマ数
  const f0 = Math.round(useVideoConfig().fps / 3);
  const ls = lines(text);
  const size = fitSize(ls, 72);
  const kw = `『${keyword}』`;
  const fade = interpolate(frame, [f0 + 20, f0 + 34], [0, 1], { ...clamp, easing: OUT });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1010, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.55, letterSpacing: "0.03em", color: WHITE, textAlign: "center" }}>
        {ls.map((l, i) => (
          <div key={i}><Rhythm text={l} start={f0 + i * 8} step={1} accent={l.includes(kw) ? kw : undefined} /></div>
        ))}
      </div>
      {sub && <div style={{ position: "absolute", left: 0, right: 0, top: 1330, textAlign: "center", fontFamily: FONT_EN, fontWeight: 500, fontSize: 32, letterSpacing: "0.22em", color: ACCENT, opacity: fade }}>{sub}</div>}
      <Img src={staticFile("brand/logo.svg")} style={{ position: "absolute", top: 1560, left: "50%", width: 360, marginLeft: -180, opacity: fade }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1650, textAlign: "center", fontFamily: FONT_EN, fontWeight: 500, fontSize: 34, letterSpacing: "0.08em", color: white(0.7), opacity: fade }}>{handle}</div>
    </AbsoluteFill>
  );
};
