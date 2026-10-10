// KAKUU GAMES — 20競技のアニメーションするピクトグラム(1本の動画・ワンカットのようにつなぐ)
// テーマ曲 strike_at_the_summit(130BPM:1拍 0.4615 秒・1小節 1.846 秒・1小節目の頭 0.09 秒)
// 時間はすべて「拍」B で考える(B=0 が曲の1小節目の頭)。小節 k の頭は B=4k。
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { Burst, C, E, FocusLines, Figure, P, type Pose, Shock, SpeedStreaks, valAt, clamp01, mix, fk, hash } from "./rig";

loadFont({ family: "Anton", url: staticFile("fonts/Anton-Regular.ttf"), weight: "400" });
loadFont({ family: "Zen Kaku Gothic New", url: staticFile("fonts/ZenKakuGothicNew-Black.ttf"), weight: "900" });

export const BPM = 130;
export const BEAT = 60 / BPM;
export const T0 = 0.09;
const HB = 0.1 / BEAT; // 止め(3コマ)を拍で
const S = 600; // ピクトグラムの大きさ(体の高さ ≒ 560px)

// 止め:解放の拍 r から3コマ止めて、そのあとは跳ぶ
const hs = (B: number, r: number) => (B >= r && B < r + HB ? r : B);
const ease = (x: number, e: keyof typeof E = "io") => E[e](clamp01(x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

type Cam = { cx: number; cy: number; z: number; rot: number };
const camT = (c: Cam, shake = { x: 0, y: 0 }) => `translate(${540 + shake.x} ${960 + shake.y}) rotate(${c.rot}) scale(${c.z}) translate(${-c.cx} ${-c.cy})`;
const shakeAt = (B: number, rels: number[], amp = 14) => {
  let x = 0, y = 0;
  for (const r of rels) { const a = (B - r) * BEAT; if (a >= 0 && a < 0.35) { const k = amp * Math.exp(-a / 0.09); x += k * Math.sin(a * 110); y += k * Math.cos(a * 83); } }
  return { x, y };
};

// ── 背景:さりげないイコライザーの棒と、拍の波紋 ──
const BeatBars: React.FC<{ B: number; color: string; o?: number }> = ({ B, color, o = 0.1 }) => {
  const age = ((B % 1) + 1) % 1, kick = Math.exp(-age * BEAT / 0.12) * (Math.floor(B) % 4 === 0 ? 1.3 : 1);
  const n = 30, out = [];
  for (let i = 0; i < n; i++) {
    const v = 0.35 + 0.35 * Math.sin(i * 1.7 + B * 1.3) + 0.3 * Math.sin(i * 0.61 - B * 2.1);
    const h = 40 + 260 * v * (0.4 + 0.6 * kick);
    out.push(<rect key={i} x={i * 36 + 4} y={1920 - h} width={22} height={h} rx={4} />);
  }
  return <g fill={color} opacity={o}>{out}</g>;
};
const Ripples: React.FC<{ B: number; x: number; y: number; color: string; o?: number }> = ({ B, x, y, color, o = 0.1 }) => {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const b = Math.floor(B) - k, age = (B - b) * BEAT;
    if (age < 0 || age > 1.8) continue;
    out.push(<circle key={b} cx={x} cy={y} r={80 + age * 620} fill="none" stroke={color} strokeWidth={b % 4 === 0 ? 6 : 3} opacity={(1 - age / 1.8) * o} />);
  }
  return <g>{out}</g>;
};

// ── 画面の文字 ──
const SportTitle: React.FC<{ B: number; at: number; en: string; jp: string; color: string; accent: string; no: number; top?: number }> = ({ B, at, en, jp, color, accent, no, top = 250 }) => {
  const a = (B - at) * BEAT;
  if (a < 0 || a > 1.9) return null;
  const pop = a < 0.1 ? 1.12 : 1 + 0.12 * Math.exp(-(a - 0.1) / 0.06);
  const gone = ease((a - 1.5) / 0.35, "in");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", transform: `translateY(${-gone * 120}px) scale(${pop})`, opacity: 1 - gone }}>
      <div style={{ fontFamily: "Anton", fontSize: Math.min(250, 1900 / en.length), lineHeight: 0.92, color, letterSpacing: 4, whiteSpace: "pre" }}>
        {en.split("").map((ch, i) => { const p = ease((a - i * 0.025) / 0.18, "back"); return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 90}px)`, opacity: clamp01(p * 2) }}>{ch}</span>; })}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 18, marginTop: 14, fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 52, color, letterSpacing: 6, opacity: ease((a - 0.12) / 0.15) }}>
        <span style={{ fontFamily: "Anton", fontWeight: 400, fontSize: 40, background: accent, color: C.ink, padding: "2px 12px", letterSpacing: 2 }}>{String(no).padStart(2, "0")}</span>{jp}
      </div>
    </div>
  );
};
const Header: React.FC<{ color: string; no: number; o?: number }> = ({ color, no, o = 1 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", justifyContent: "space-between", fontFamily: "Anton", fontSize: 40, letterSpacing: 5, color, opacity: o }}>
    <span>KAKUU GAMES</span>
    <span>{String(no).padStart(2, "0")}<span style={{ opacity: 0.45 }}> / 20</span></span>
  </div>
);

// ── 姿勢 ──
const ORGANIZER = P({ fr: 1, a1: 14, a1l: 10, a2: 14, a2l: 10, l1: 4, l1l: 4, l2: 4, l2l: 4 });
const MARKS = P({ y: -0.24, t: 78, h: -12, a1: -2, a1l: 0, a2: 4, a2l: 2, l1: 70, l1l: -40, l2: -10, l2l: -95 });
const SET = P({ y: -0.36, t: 100, h: -25, a1: 0, a1l: 0, a2: 3, a2l: 2, l1: 43, l1l: -24, l2: -37, l2l: -42 });
const LAUNCH = P({ y: -0.36, t: 52, h: -8, a1: 75, a1l: 115, a2: -75, a2l: -40, l1: 80, l1l: -5, l2: -45, l2l: -48 });
// 走りの1サイクル(1拍で2歩):接地→押し出し→空中→反対の足が接地。手で作ったキーポーズを補間
type Leg = [number, number];
const LEAD: [number, Leg][] = [[0, [35, 12]], [0.4, [-5, -12]], [0.75, [-40, -58]], [1, [-25, -112]]];
const TRAIL: [number, Leg][] = [[0, [-25, -112]], [0.4, [58, -48]], [0.75, [72, 18]], [1, [35, 12]]];
const legAt = (k: [number, Leg][], s: number): Leg => {
  for (let i = 0; i < k.length - 1; i++) if (s <= k[i + 1][0]) { const x = E.io((s - k[i][0]) / (k[i + 1][0] - k[i][0])); return [lerp(k[i][1][0], k[i + 1][1][0], x), lerp(k[i][1][1], k[i + 1][1][1], x)]; }
  return k[k.length - 1][1];
};
function run(ph: number, lean: number): Pose {
  const u = (((ph / (Math.PI * 2)) % 1) + 1) % 1;
  const half = u >= 0.5, s = (u % 0.5) / 0.5;
  const A = legAt(LEAD, s), Bl = legAt(TRAIL, s);
  const sw = E.io(s);
  const armF: Leg = [lerp(62, -58, sw), lerp(150, 12, sw)], armB: Leg = [lerp(-58, 62, sw), lerp(12, 150, sw)];
  const [n, f] = half ? [Bl, A] : [A, Bl];
  const [an, af] = half ? [armF, armB] : [armB, armF];
  const y = -0.4 - 0.03 * Math.sin(clamp01((s - 0.4) / 0.6) * Math.PI);
  return P({ y, t: lean, h: -lean * 0.45, a1: an[0], a1l: an[1], a2: af[0], a2l: af[1], l1: n[0], l1l: n[1], l2: f[0], l2l: f[1] });
}
const DIP = P({ y: -0.4, t: 48, h: -10, a1: -80, a1l: -60, a2: -95, a2l: -70, l1: 55, l1l: 5, l2: -40, l2l: -75 });
const DRAW1 = P({ y: -0.43, t: 0, a1: 88, a1l: 90, a2: -40, a2l: 100, l1: 13, l1l: 13, l2: -13, l2l: -13 });
const KAI = P({ y: -0.43, t: 0, a1: 90, a1l: 90, a2: -112, a2l: 86, l1: 13, l1l: 13, l2: -13, l2l: -13 });
const ZANSHIN = P({ y: -0.43, t: -2, h: -3, a1: 90, a1l: 90, a2: -92, a2l: -95, l1: 13, l1l: 13, l2: -13, l2l: -13 });
const ENGARDE = P({ y: -0.36, t: 6, h: -4, a1: 72, a1l: 84, a2: -125, a2l: -175, l1: 38, l1l: -4, l2: -42, l2l: -14 });

// 弓:握り(手前の手)を中心に、上が長い
function bowGeom(p: Pose, drawn: number, f = 1) {
  const j = fk(p, f);
  const g = j.ha1; // 弓を持つ手
  const top: [number, number] = [g[0] - 0.03 * f, g[1] - 0.66], bot: [number, number] = [g[0] - 0.03 * f, g[1] + 0.3];
  const bulge = 0.16 + 0.07 * drawn;
  const ctrl: [number, number] = [g[0] + bulge * f * 1.35, g[1] - 0.18];
  return { top, bot, ctrl, hand: j.ha2, grip: g };
}

// ═════════ 場面 ═════════

// 0〜11.9拍:主催者のコマ(正面)。あいさつ→タイトル→モニターの画面の中へ
const Opening: React.FC<{ B: number; t: number }> = ({ B }) => {
  let p = ORGANIZER;
  // 1小節目:手を振る/2小節目の頭:両手を上げて開会
  if (B >= 3.5 && B < 8) {
    const wave = Math.sin((B - 4) * Math.PI) * 22;
    const up = ease((B - 3.5) / 0.5, "back");
    p = mix(p, P({ ...ORGANIZER, a1: 150, a1l: 160 + wave }), up);
  } else if (B >= 8) {
    p = mix(P({ ...ORGANIZER, a1: 150, a1l: 160 }), P({ ...ORGANIZER, a1: 140, a1l: 165, a2: 140, a2l: 165, y: -0.45 }), ease((B - 7.7) / 0.35, "back"));
  }
  const blink = B > 2 && (B % 4) > 3.82 ? 1 : 0;
  const eyeOn = B < -0.05 ? 0 : B < 0.4 ? (Math.floor(B * 18) % 2 ? 0.3 : 1) : 1;
  // カメラ:9.5拍から、モニターの画面へ一気に寄る
  const j = fk(p);
  const hx = j.head[0] * S, hy = (j.head[1] - 0.004) * S;
  const zk = ease((B - 9.4) / 2.6, "in");
  const z = Math.exp(Math.log(46) * zk);
  const cam: Cam = { cx: lerp(0, hx, ease((B - 9.4) / 2.2)), cy: lerp(-330, hy, ease((B - 9.4) / 2.2)), z, rot: lerp(0, -8, zk) };
  return (
    <svg width={1080} height={1920}>
      <rect width={1080} height={1920} fill={C.ink} />
      <BeatBars B={B} color={C.off} o={B < 4 ? 0.04 : 0.08} />
      <g transform={camT(cam)}>
        <ellipse cx={0} cy={6} rx={170} ry={18} fill={C.off} opacity={0.08} />
        <Figure p={p} S={S} color={C.off} bg={C.ink} blink={blink} eyeOn={eyeOn} />
      </g>
    </svg>
  );
};

// 12〜27.9拍:陸上(短距離)— 位置について→用意→16拍目のスタートの爆発→疾走→ゴールテープ
// 28〜35.9拍:弓道 — テープが弓に変わる→会→32拍目の離れ→矢を追う
// 36〜:フェンシングへ(矢が剣になる)
const Track: React.FC<{ B: number }> = ({ B }) => {
  const R1 = 16, R2 = 32; // スタート・離れ
  const Bh = hs(hs(B, R1), R2);
  // ── 走る人の姿勢 ──
  let p: Pose;
  let echo = 0;
  if (Bh < 14) p = MARKS;
  else if (Bh < R1) p = mix(MARKS, SET, ease((Bh - 14) / 0.6, "back"));
  else if (Bh < 16.5) p = mix(LAUNCH, run(0, 40), ease((Bh - R1 - HB) / 0.4));
  else if (Bh < 27.2) {
    const lean = valAt([[16.5, 42], [20, 26], [27.2, 22]], Bh);
    p = run((Bh - 16) * Math.PI * 2, lean);
    echo = 1;
  } else if (Bh < 28) p = mix(run((27.2 - 16) * Math.PI * 2, 22), DIP, ease((Bh - 27.2) / 0.55, "snap"));
  else if (Bh < 29) p = mix(DIP, DRAW1, ease(Bh - 28, "back"));
  else if (Bh < 31) p = mix(DRAW1, KAI, ease((Bh - 29) / 2, "io"));
  else if (Bh < R2) p = KAI;
  else p = mix(KAI, ZANSHIN, ease((Bh - R2 - HB) / 0.35, "snap"));
  if (Bh >= 31 && Bh < R2) p = { ...p, a2: p.a2 + Math.sin(Bh * 40) * 0.6 }; // 会の震え
  if (Bh >= R1 - 0.01 && Bh < R1 + HB) p = LAUNCH;

  // ── 色(陸上は黒い地、弓道はオフホワイトの地)──
  const wipe = ease((B - 28) / 0.7, "out"); // テープの所から丸く広がる
  const inKyudo = B >= 28;
  const fg = inKyudo ? C.ink : C.off, bgc = inKyudo ? C.off : C.ink;

  // ── カメラ ──
  const split = B >= 20 && B < 22;
  const lanes = B >= 22 && B < 24;
  let cam: Cam = { cx: 60, cy: -300, z: 1, rot: 0 };
  if (B < 16) cam = { cx: lerp(160, 120, ease((B - 12) / 4)), cy: -240, z: lerp(1.08, 1.22, ease((B - 12) / 4, "in")), rot: lerp(0, -2, ease((B - 12) / 4)) };
  else if (B < 20) cam = { cx: lerp(120, 40, ease((B - 16) / 1.2, "out")), cy: lerp(-240, -320, ease((B - 16) / 2)), z: lerp(1.22, 0.92, ease((B - 16) / 0.8, "snap")), rot: lerp(-2, 4, ease((B - 16) / 4)) };
  else if (B < 28) cam = { cx: lerp(40, 60, ease((B - 24) / 2)), cy: lerp(-320, -330, ease((B - 24) / 3)), z: lerp(1.25, 1.05, ease((B - 24) / 3.5)), rot: lerp(-9, -3, ease((B - 24) / 3.5)) };
  if (B >= 27 && B < 36) {
    const k = ease((B - 27) / 2);
    cam = { cx: lerp(cam.cx, 90, k), cy: lerp(cam.cy, -470, k), z: lerp(cam.z, 1.0, k), rot: lerp(cam.rot, 0, k) };
    if (B >= 29 && B < R2) { const pk = ease((B - 29) / 3, "in"); cam = { ...cam, z: lerp(1.0, 1.28, pk), cx: lerp(90, 40, pk), cy: lerp(-470, -640, pk), rot: lerp(0, 3, pk) }; }
  }
  // 矢を追う(離れのあと)
  const arrowStop = 16; // 36拍目に止まる所(体の単位)
  const arrowX = B < R2 ? 0 : (() => { const a = clamp01((B - R2 - HB) / (36 - R2 - HB)); return lerp(fk(KAI).ha2[0] + 0.92, arrowStop, 1 - (1 - a) ** 2.2); })();
  if (B >= R2) {
    const follow = ease((B - R2 - 0.35) / 1.0, "in");
    const ax = (B < 36 ? arrowX : arrowStop) * S;
    const settle = ease((B - 35) / 1.4, "io");
    const fx = (arrowStop - 0.92 - fk(ENGARDE).ha1[0] + 0.2) * S;
    cam = { cx: lerp(lerp(40, ax - 230, follow), fx, settle), cy: lerp(-640, -470, ease((B - R2) / 2)), z: lerp(1.28, 1.0, ease((B - R2) / 1.2, "out")), rot: lerp(3, 0, ease((B - R2) / 1)) };
  }
  const shake = shakeAt(B, [R1, R2], B < 20 ? 22 : 12);

  // ── 地面が流れる(走っている間)──
  const dist = B < R1 ? 0 : (B - R1) * 1.25 + Math.max(0, B - R1 - 1) * 0.25; // 体の単位

  // ── ゴールテープ:右から来て、胸で弓なりに曲がる ──
  const tapeX = B < 25 ? 3 : lerp(3, 0.36, ease((B - 25) / 2.25, "lin"));
  const bend = ease((B - 27.25) / 0.6, "back");
  const bw = bowGeom(B < 28 ? KAI : p, B < 32 ? 1 : 0);
  const morph = ease((B - 28) / 1.0, "back");
  const finishTop: [number, number] = [tapeX, -1.12], finishBot: [number, number] = [tapeX, 0], finishCtrl: [number, number] = [tapeX + 0.32 * bend, -0.62];
  const top = [lerp(finishTop[0], bw.top[0], morph), lerp(finishTop[1], bw.top[1], morph)];
  const bot = [lerp(finishBot[0], bw.bot[0], morph), lerp(finishBot[1], bw.bot[1], morph)];
  const ctl = [lerp(finishCtrl[0], bw.ctrl[0], morph), lerp(finishCtrl[1], bw.ctrl[1], morph)];
  const showBow = B >= 25 && B < 34;
  // 弦:引いている間は手に掛かり、離れで真っすぐに戻って震える
  const drawHand = fk(p).ha2;
  const strungK = B < 28.6 ? 0 : B < R2 ? ease((B - 28.6) / 0.6) : 0;
  const vib = B >= R2 ? Math.sin((B - R2) * 60) * Math.exp(-(B - R2) * 3) * 0.05 : 0;
  const strMid = [lerp((top[0] + bot[0]) / 2 + vib, drawHand[0], strungK), lerp((top[1] + bot[1]) / 2, drawHand[1], strungK)];
  const sw = (n: number[]) => `${n[0] * S},${n[1] * S}`;

  // ── 矢 ──
  const arrowLen = 0.92;
  const arrowTail = B < R2 ? drawHand[0] : arrowX - arrowLen;
  const EG = fk(ENGARDE).ha1;
  const arrowY = B < R2 ? drawHand[1] : lerp(-0.74, EG[1], ease((B - 34.4) / 1.6, "io"));
  const showArrow = B >= 29.3 && B < 36;

  // ── フェンシング(36拍目〜):矢が剣に変わる。地がライムに ──
  const fenceX = arrowStop - arrowLen - EG[0];
  const fenceIn = ease((B - 35.4) / 0.6, "out");
  const limeWipe = ease((B - 34.6) / 1.3, "io");

  const runner = (pp: Pose, color: string, bg: string, o = 1) => <Figure p={pp} S={S} color={color} bg={bg} opacity={o} />;
  const echoes = echo ? [2, 1].map((k) => {
    const bb = Bh - k * 0.11, lean = valAt([[16.5, 40], [20, 18], [27.2, 15]], bb);
    return <g key={k} transform={`translate(${-k * 70} 0)`}>{runner(run((bb - 16) * Math.PI * 2, lean), C.lime, bgc, 0.22 * (3 - k))}</g>;
  }) : null;

  const world = (withEcho = true) => (
    <>
      {/* 地面と、流れる目盛り */}
      <line x1={-3000} y1={0} x2={3000 + arrowStop * S} y2={0} stroke={fg} strokeWidth={5} opacity={0.5} />
      {B < 28 && Array.from({ length: 10 }, (_, i) => { const x = (((i * 1.2 - dist) % 12) + 12) % 12 - 5; return <rect key={i} x={x * S} y={14} width={0.28 * S} height={12} fill={fg} opacity={0.35} />; })}
      {B >= 12 && B < 17 && (
        <g fill={fg} opacity={0.85}>
          <polygon points={`${-0.33 * S},0 ${-0.22 * S},0 ${-0.22 * S},${-0.07 * S}`} />
          <polygon points={`${0.0 * S},0 ${0.11 * S},0 ${0.11 * S},${-0.06 * S}`} transform={`translate(${-dist * S} 0)`} />
        </g>
      )}
      {withEcho && echoes}
      {B < 28 ? runner(p, C.off, C.ink) : runner(p, C.ink, C.off)}
      {showBow && (
        <g>
          <path d={`M${sw(top)} Q${sw(ctl)} ${sw(bot)}`} fill="none" stroke={C.lime} strokeWidth={0.03 * S} strokeLinecap="round" />
          {B >= 25 && B < 28.3 && <path d={`M${sw(top)} Q${sw(ctl)} ${sw(bot)}`} fill="none" stroke={bgc} strokeWidth={0.008 * S} strokeLinecap="round" opacity={0.35} />}
          {B >= 28.3 && <polyline points={`${sw(top)} ${sw(strMid)} ${sw(bot)}`} fill="none" stroke={fg} strokeWidth={0.008 * S} />}
        </g>
      )}
      {showArrow && (
        <g>
          {B >= R2 && <rect x={(arrowTail - 2.4) * S} y={arrowY * S - 0.012 * S} width={2.4 * S} height={0.024 * S} fill={fg} opacity={0.18} />}
          <line x1={arrowTail * S} y1={arrowY * S} x2={(arrowTail + arrowLen) * S} y2={arrowY * S} stroke={fg} strokeWidth={0.014 * S} strokeLinecap="round" />
          <polygon points={`${(arrowTail + arrowLen + 0.05) * S},${arrowY * S} ${(arrowTail + arrowLen - 0.02) * S},${(arrowY - 0.022) * S} ${(arrowTail + arrowLen - 0.02) * S},${(arrowY + 0.022) * S}`} fill={fg} />
          <polygon points={`${arrowTail * S},${arrowY * S} ${(arrowTail + 0.1) * S},${(arrowY - 0.03) * S} ${(arrowTail + 0.13) * S},${arrowY * S} ${(arrowTail + 0.1) * S},${(arrowY + 0.03) * S}`} fill={C.lime} />
        </g>
      )}
    </>
  );

  const startX = 0.25 * S, startY = -0.3 * S; // スタートの爆発の位置
  const relAge = (r: number) => (B - r) * BEAT;
  const Rpt = fk(KAI).ha2;
  return (
    <svg width={1080} height={1920}>
      <rect width={1080} height={1920} fill={C.ink} />
      {/* 弓道へ:テープの所から、オフホワイトが丸く広がる */}
      {inKyudo && <circle cx={540} cy={820} r={2400 * wipe} fill={C.off} />}
      {B >= 34.6 && <rect x={0} y={960 - 1100 * limeWipe} width={1080} height={2200 * limeWipe} fill={C.lime} />}
      <BeatBars B={B} color={B >= 35.6 ? C.ink : inKyudo ? C.ink : C.off} o={0.07} />
      {B >= R1 && B < 28 && <SpeedStreaks t={(B - R1) * BEAT} speed={2600} color={C.off} o={B < 20 ? 0.32 : 0.18} seed={3} y0={500} y1={1500} />}

      {/* 1画面 */}
      {!split && !lanes && (
        <g transform={camT(cam, shake)}>
          {B >= 12 && B < 28 && <Ripples B={B} x={0} y={0} color={C.off} o={0.08} />}
          {/* スタートの爆発 */}
          {B >= R1 && relAge(R1) < 0.5 && (
            <g>
              <Burst x={startX - 0.15 * S} y={startY} r={(0.5 + 1.6 * E.out(clamp01(relAge(R1) / 0.3))) * S} n={16} inner={0.4} color={C.lime} rot={B} seed={4} />
              <Burst x={startX - 0.15 * S} y={startY} r={(0.3 + 0.9 * E.out(clamp01(relAge(R1) / 0.3))) * S} n={12} inner={0.5} color={C.off} rot={-B} seed={9} />
              <Shock x={startX} y={startY} age={relAge(R1)} color={C.off} max={1400} life={0.5} w={40} />
            </g>
          )}
          {world()}
          {/* 離れ:衝撃波 */}
          {B >= R2 && <Shock x={Rpt[0] * S} y={Rpt[1] * S} age={relAge(R2)} color={C.ink} max={700} life={0.42} w={22} />}
          {B >= R2 && <Shock x={Rpt[0] * S} y={Rpt[1] * S} age={relAge(R2) - 0.06} color={C.lime} max={520} life={0.38} w={14} />}
          {/* フェンシングの人(矢が剣になる)*/}
          {B >= 35.4 && (
            <g transform={`translate(${(fenceX + 0.9 * (1 - fenceIn)) * S} 0)`} opacity={clamp01(fenceIn * 3)}>
              <Figure p={ENGARDE} S={S} color={C.ink} bg={C.lime} />
            </g>
          )}
          {B >= 36 && (() => {
            const j = fk(ENGARDE); const hx = fenceX + j.ha1[0], hy = j.ha1[1];
            const k = ease((B - 36) / 0.5, "back");
            const tipX = hx + lerp(0.92, 0.66, k), ang = lerp(0, -0.1, k);
            return (
              <g>
                <line x1={hx * S} y1={hy * S} x2={tipX * S} y2={(hy + ang) * S} stroke={C.ink} strokeWidth={0.012 * S} strokeLinecap="round" />
                <path d={`M${(hx + 0.03) * S},${(hy - 0.055) * S} A${0.055 * S},${0.055 * S} 0 0 1 ${(hx + 0.03) * S},${(hy + 0.055) * S}`} fill="none" stroke={C.ink} strokeWidth={0.02 * S} />
              </g>
            );
          })()}
        </g>
      )}

      {/* 画面を3つに分ける(20〜21.9拍):顔・全身・足 */}
      {split && [0, 1, 2].map((k) => {
        const inK = ease((B - 20 - k * 0.25) / 0.45, "back");
        const c: Cam = k === 0 ? { cx: 170, cy: -520, z: 2.4, rot: -6 } : k === 1 ? { cx: 60, cy: -300, z: 0.95, rot: 0 } : { cx: 40, cy: -150, z: 2.1, rot: 5 };
        const y0 = k * 640;
        return (
          <g key={k}>
            <clipPath id={`band${k}`}><rect x={0} y={y0} width={1080} height={640} /></clipPath>
            <g clipPath={`url(#band${k})`} transform={`translate(${(1 - inK) * (k % 2 ? -1080 : 1080)} 0)`}>
              <rect x={0} y={y0} width={1080} height={640} fill={k === 1 ? C.lime : C.ink} />
              <SpeedStreaks t={(B - R1) * BEAT} speed={3200} color={k === 1 ? C.ink : C.off} o={0.25} seed={k * 7} y0={y0} y1={y0 + 640} n={10} />
              <g transform={`translate(0 ${y0 + 320 - 960}) ${camT(c)}`}>
                <line x1={-3000} y1={0} x2={3000} y2={0} stroke={k === 1 ? C.ink : C.off} strokeWidth={5} opacity={0.5} />
                <Figure p={p} S={S} color={k === 1 ? C.ink : C.off} bg={k === 1 ? C.lime : C.ink} />
              </g>
            </g>
            <rect x={0} y={y0 + 636} width={1080} height={8} fill={C.ink} />
          </g>
        );
      })}

      {/* 同じ人型のくり返し(22〜23.9拍):5レーン。ライムの目のコマが前へ */}
      {lanes && (
        <g transform={`rotate(-7 540 960)`}>
          {[0, 1, 2, 3, 4].map((k) => {
            const ahead = k === 2 ? ease((B - 22) / 2) * 260 : -40 * hash(k) * (B - 22);
            const ph = (B - 16) * Math.PI * 2 + k * 0.7;
            const y = 330 + k * 330;
            return (
              <g key={k}>
                <line x1={-200} y1={y + 6} x2={1300} y2={y + 6} stroke={C.off} strokeWidth={3} opacity={0.3} />
                <g transform={`translate(${430 + ahead} ${y}) scale(0.5)`}>
                  <Figure p={run(ph, 16)} S={S} color={k === 2 ? C.off : "#5A5A57"} bg={C.ink} eyes={k === 2 ? C.lime : "#5A5A57"} />
                </g>
              </g>
            );
          })}
        </g>
      )}

      {/* 集中線 */}
      <FocusLines cx={540} cy={900} o={B >= R1 && relAge(R1) < 0.45 ? 0.9 * (1 - ease((relAge(R1) - 0.1) / 0.35)) : 0} seed={Math.floor(B * 6)} color={C.off} inner={380} />
      <FocusLines cx={560} cy={760} o={B >= R2 && relAge(R2) < 0.45 ? 0.85 * (1 - ease((relAge(R2) - 0.1) / 0.35)) : 0} seed={Math.floor(B * 6) + 50} color={C.ink} inner={360} />
      {/* スタートの瞬間の白い光(1コマ)*/}
      {B >= R1 && relAge(R1) < 0.034 && <rect width={1080} height={1920} fill={C.off} opacity={0.85} />}
    </svg>
  );
};

// ═════════ 全体 ═════════
export const KakuuGamesFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const B = (t - T0) / BEAT;
  const hookOut = ease((B - 4) / 0.5, "in");
  const titleIn = (i: number) => ease((B - 4.4 - i * 0.5) / 0.4, "back");
  const titleOut = ease((B - 9.4) / 1.6, "in");
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {B < 12 ? <Opening B={B} t={t} /> : <Track B={B} />}

      {/* 冒頭 1.5 秒のフック(0コマ目から全部見える)*/}
      {B < 4.6 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center", color: C.off, transform: `translateY(${-hookOut * 260}px)`, opacity: 1 - hookOut }}>
          <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 66, lineHeight: 1.35, letterSpacing: 2 }}>AIとコードで、<br />架空のスポーツ大会をつくった</div>
          <div style={{ fontFamily: "Anton", fontSize: 230, lineHeight: 1, marginTop: 26, color: C.lime, letterSpacing: 4 }}>20 SPORTS</div>
          <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 54, marginTop: 8, letterSpacing: 6 }}>ピクトグラムで20競技</div>
        </div>
      )}
      {/* タイトル */}
      {B >= 4.3 && B < 12 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", color: C.off, transform: `scale(${1 + titleOut * 2.5}) translateY(${-titleOut * 120}px)`, opacity: 1 - titleOut }}>
          <div style={{ fontFamily: "Anton", fontSize: 200, lineHeight: 0.9, letterSpacing: 6 }}>
            {"KAKUU".split("").map((ch, i) => <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - titleIn(i * 0.25)) * 120}px)`, opacity: clamp01(titleIn(i * 0.25) * 2) }}>{ch}</span>)}
          </div>
          <div style={{ fontFamily: "Anton", fontSize: 200, lineHeight: 0.9, letterSpacing: 6, color: C.lime }}>
            {"GAMES".split("").map((ch, i) => <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - titleIn(2 + i * 0.25)) * 120}px)`, opacity: clamp01(titleIn(2 + i * 0.25) * 2) }}>{ch}</span>)}
          </div>
          <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 52, marginTop: 22, letterSpacing: 10, opacity: titleIn(4) }}>架空のスポーツ大会</div>
          <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 26, marginTop: 16, letterSpacing: 2, opacity: titleIn(4.5) * 0.7 }}>※実在の大会・団体とは関係のない、架空の大会です</div>
        </div>
      )}
      {/* 位置について/用意 */}
      {B >= 12 && B < 16 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 64, letterSpacing: 14, color: C.off }}>
          <span style={{ opacity: B < 14 ? ease((B - 12) / 0.3) : 0.25 }}>位置について</span><br />
          <span style={{ color: C.lime, opacity: ease((B - 14) / 0.3) }}>用意</span>
        </div>
      )}
      {B >= 16 && <Header color={B < 28 ? C.off : C.ink} no={B < 28 ? 1 : B < 36 ? 2 : 3} o={ease((B - 16.5) / 0.5)} />}
      <SportTitle B={B} at={16} en="SPRINT" jp="陸上(短距離)" color={C.off} accent={C.lime} no={1} top={250} />
      <SportTitle B={B} at={32} en="KYUDO" jp="弓道" color={C.ink} accent={C.lime} no={2} top={250} />
      <Audio src={staticFile("kakuu-games/strike_at_the_summit.mp3")} />
    </AbsoluteFill>
  );
};
