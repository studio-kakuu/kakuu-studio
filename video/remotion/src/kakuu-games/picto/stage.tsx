// KAKUU GAMES — 画面の層(地の色/奥の層/巨大な競技名/拍の棒と波紋/カメラ/手前の層/紙のざらつき)と、共通の道具
import React from "react";
import { staticFile } from "remotion";
import { C, E, clamp01, hash, Prims, SIGS, sigPrims, type Ease } from "./rig";

export const BPM = 130;
export const BEAT = 60 / BPM;
export const T0 = 0.09;
export const HB = 0.1 / BEAT; // 止め(3コマ)
export const S = 600;
export const hs = (B: number, r: number) => (B >= r && B < r + HB ? r : B);
export const ez = (x: number, e: Ease = "io") => E[e](clamp01(x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const age = (B: number, r: number) => (B - r) * BEAT; // 秒

export type Cam = { cx: number; cy: number; z: number; rot: number; sx?: number };
export const camT = (c: Cam, sh = { x: 0, y: 0 }) => `translate(${540 + sh.x} ${960 + sh.y}) rotate(${c.rot}) scale(${c.z * (c.sx ?? 1)} ${c.z}) translate(${-c.cx} ${-c.cy})`;
export const mixCam = (a: Cam, b: Cam, k: number): Cam => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k), rot: lerp(a.rot, b.rot, k), sx: lerp(a.sx ?? 1, b.sx ?? 1, k) });
export function camKeys(keys: [number, Cam, Ease?][], B: number): Cam {
  if (B <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [b0, c0] = keys[i], [b1, c1, e] = keys[i + 1]; if (B <= b1) return mixCam(c0, c1, ez((B - b0) / (b1 - b0), e ?? "io")); }
  return keys[keys.length - 1][1];
}
export const shakeAt = (B: number, rels: number[], amp = 14) => {
  let x = 0, y = 0;
  for (const r of rels) { const a = age(B, r); if (a >= 0 && a < 0.35) { const k = amp * Math.exp(-a / 0.09); x += k * Math.sin(a * 110); y += k * Math.cos(a * 83); } }
  return { x, y };
};
// いつも少し動くカメラ(ゆっくり回る・呼吸する・小節の頭で少し寄る)
export const drift = (c: Cam, B: number): Cam => {
  const bar = ((B % 4) + 4) % 4, pulse = Math.exp(-bar * BEAT / 0.25) * 0.018;
  return { ...c, rot: c.rot + 1.1 * Math.sin(B * 0.33) + 0.5 * Math.sin(B * 0.91), z: c.z * (1 + 0.022 * Math.sin(B * 0.27) + pulse), cx: c.cx + 14 * Math.sin(B * 0.21), cy: c.cy + 10 * Math.cos(B * 0.17) };
};

export type Far = "rings" | "stripes" | "dots" | "lanes" | "grid" | "none";
export type Out = { bg: string; tone?: string; fg: string; cam: Cam; world: React.ReactNode; under?: React.ReactNode; over?: React.ReactNode; screen?: React.ReactNode; far?: Far; no: number; noDrift?: boolean; shake?: { x: number; y: number }; stream?: number };

// 地の色に合わせた差し色(巨大な文字などに使う)
export const accentOn = (bg: string) => (bg === C.ink ? C.lime : bg === C.lime ? C.off : C.ink);

// ── 奥の層:大きな形がゆっくり流れる(カメラの 0.25 倍)──
export const FarLayer: React.FC<{ kind: Far; cam: Cam; B: number; color: string }> = ({ kind, cam, B, color }) => {
  if (kind === "none") return null;
  const ox = -cam.cx * 0.25 * cam.z, oy = -cam.cy * 0.12 * cam.z;
  const g = (n: React.ReactNode) => <g opacity={0.09} transform={`translate(${ox % 2160} ${oy % 1920})`}>{n}</g>;
  if (kind === "rings") return g(Array.from({ length: 9 }, (_, i) => <circle key={i} cx={540 - ox % 2160} cy={900} r={160 + i * 150 + (B * 20) % 150} fill="none" stroke={color} strokeWidth={14} />));
  if (kind === "stripes") return g(<g transform="rotate(-24 540 960)">{Array.from({ length: 30 }, (_, i) => <rect key={i} x={-2400 + i * 180 + ((B * 30) % 180)} y={-1200} width={60} height={4400} fill={color} />)}</g>);
  if (kind === "dots") return g(Array.from({ length: 16 * 24 }, (_, i) => { const x = (i % 16) * 150 - 600, y = Math.floor(i / 16) * 110 - 300; return <circle key={i} cx={x + (Math.floor(i / 16) % 2) * 75} cy={y} r={10 + 8 * Math.sin(i * 0.37 + B * 0.6)} fill={color} />; }));
  if (kind === "grid") return g(<g>{Array.from({ length: 16 }, (_, i) => <rect key={`v${i}`} x={-800 + i * 220} y={-600} width={4} height={3200} fill={color} />)}{Array.from({ length: 20 }, (_, i) => <rect key={`h${i}`} x={-800} y={-600 + i * 220} width={3600} height={4} fill={color} />)}</g>);
  return g(Array.from({ length: 8 }, (_, i) => <rect key={i} x={-1200} y={300 + i * 200} width={4600} height={6} fill={color} />));
};

// ── 手前の層:大きなぼやけた粒と細かいちり(カメラの 1.6 倍で流れる)──
export const NearLayer: React.FC<{ cam: Cam; B: number; color: string; stream?: number }> = ({ cam, B, color, stream = 0 }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const big = i < 4;
    const W = 1600, H = 2400;
    const x = ((((hash(i * 3.1) * W - cam.cx * 1.6 * cam.z - stream * B * (big ? 900 : 500)) % W) + W) % W) - 260;
    const y = ((((hash(i * 7.7) * H - cam.cy * 1.3 * cam.z + B * 18 * (i % 3)) % H) + H) % H) - 240;
    out.push(big
      ? <circle key={i} cx={x} cy={y} r={90 + 140 * hash(i * 9)} fill={color} opacity={0.05} />
      : <rect key={i} x={x} y={y} width={4 + 6 * hash(i)} height={4 + 6 * hash(i + 2)} fill={color} opacity={0.35} transform={`rotate(${i * 37 + B * 20} ${x} ${y})`} />);
  }
  return <g>{out}</g>;
};

// ── 拍の棒と波紋(さりげなく)──
export const BeatBars: React.FC<{ B: number; color: string; o?: number }> = ({ B, color, o = 0.1 }) => {
  const a = ((B % 1) + 1) % 1, kick = Math.exp(-a * BEAT / 0.12) * (Math.floor(B) % 4 === 0 ? 1.3 : 1);
  const out = [];
  for (let i = 0; i < 30; i++) {
    const v = 0.35 + 0.35 * Math.sin(i * 1.7 + B * 1.3) + 0.3 * Math.sin(i * 0.61 - B * 2.1);
    const h = 40 + 260 * v * (0.4 + 0.6 * kick);
    out.push(<rect key={i} x={i * 36 + 4} y={1920 - h} width={22} height={h} rx={4} />);
  }
  return <g fill={color} opacity={o}>{out}</g>;
};
export const Ripples: React.FC<{ B: number; x: number; y: number; color: string; o?: number; sq?: number }> = ({ B, x, y, color, o = 0.1, sq = 1 }) => {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const b = Math.floor(B) - k, a = (B - b) * BEAT;
    if (a < 0 || a > 1.8) continue;
    out.push(<ellipse key={b} cx={x} cy={y} rx={80 + a * 620} ry={(80 + a * 620) * sq} fill="none" stroke={color} strokeWidth={b % 4 === 0 ? 6 : 3} opacity={(1 - a / 1.8) * o} />);
  }
  return <g>{out}</g>;
};

// ── 巨大な競技名(MOTION 100 のように、画面からはみ出す)──
export type WordStyle = "bleed" | "stack" | "inside" | "outline";
export type Rel = { B: number; no: number; en: string; jp: string; style: WordStyle; until: number; sig: string; y?: number; rot?: number };
export const GiantWord: React.FC<{ r: Rel; B: number; bg: string; fg: string }> = ({ r, B, bg, fg }) => {
  if (B < r.B || B > r.until + 0.6) return null;
  const a = age(B, r.B);
  const slam = a < 0.1 ? 1.35 : 1 + 0.35 * Math.exp(-(a - 0.1) / 0.07);
  const out = ez((B - r.until) / 0.6, "in");
  const ac = bg === C.ink ? C.lime : C.ink;
  const n = r.en.length;
  const drift = -a * 40;
  const y = r.y ?? 980, rot = r.rot ?? 0;
  const o = 1 - out;
  if (r.style === "stack") {
    const letters = r.en.replace(/ /g, "").split("");
    const size = Math.min(520, 1900 / letters.length * 1.05);
    return (
      <g opacity={o} transform={`translate(${-out * 600} 0)`}>
        {letters.map((ch, i) => {
          const p = ez((a - i * 0.03) / 0.22, "back");
          return <text key={i} x={70 + (i % 2) * 18} y={60 + (i + 1) * size * 0.86 + drift * 0.5} fontFamily="Anton" fontSize={size} fill={ac} opacity={0.95} transform={`translate(${(1 - p) * -500} 0)`}>{ch}</text>;
        })}
      </g>
    );
  }
  if (r.style === "outline") {
    const size = Math.min(900, 2000 / n * 1.6);
    return (
      <g opacity={o} transform={`translate(540 ${y}) rotate(${rot}) scale(${slam}) translate(${drift - out * 900} 0)`}>
        <text x={0} y={size * 0.36} textAnchor="middle" fontFamily="Anton" fontSize={size} fill="none" stroke={ac} strokeWidth={7} letterSpacing={-4}>{r.en}</text>
      </g>
    );
  }
  if (r.style === "inside") {
    const lines = r.en.split(" ");
    const size = Math.min(640, (1180 / (Math.max(...lines.map((l) => l.length)) * 0.43)));
    const sig = SIGS.find((s) => s.id === r.sig)!;
    const id = `gw-${r.no}`;
    const fill = fg === C.lime ? C.ink : fg;
    const ins = [];
    for (let i = 0; i < 40; i++) {
      const cx = (i % 8) * 150 + ((Math.floor(i / 8) % 2) * 75) - 40 + ((a * 60) % 150), cy = Math.floor(i / 8) * 190 + 170;
      ins.push(<g key={i} transform={`translate(${cx} ${cy})`}><Prims list={sigPrims(sig, B + (i % 4) * 0.25, 120, bg, fill)} /></g>);
    }
    return (
      <g opacity={o} transform={`translate(540 ${y}) rotate(${rot}) scale(${slam}) translate(${-out * 900} 0)`}>
        <defs><clipPath id={id}>{lines.map((l, k) => <text key={k} x={0} y={(k - (lines.length - 1) / 2) * size * 0.88 + size * 0.36} textAnchor="middle" fontFamily="Anton" fontSize={size}>{l}</text>)}</clipPath></defs>
        <g clipPath={`url(#${id})`}>
          <rect x={-900} y={-900} width={1800} height={1800} fill={fill} />
          <g transform="translate(-600 -560)">{ins}</g>
        </g>
      </g>
    );
  }
  const size = Math.min(1000, 2200 / n * 1.55);
  return (
    <g opacity={o} transform={`translate(540 ${y}) rotate(${rot}) scale(${slam})`}>
      <text x={drift * 2 - out * 1400} y={size * 0.36} textAnchor="middle" fontFamily="Anton" fontSize={size} fill={ac} letterSpacing={-6}>{r.en}</text>
    </g>
  );
};

// 番号+日本語のラベル(解放の瞬間に)
export const Label: React.FC<{ r: Rel; B: number; color: string }> = ({ r, B, color }) => {
  if (B < r.B || B > r.until + 0.4) return null;
  const a = age(B, r.B);
  const p = ez(a / 0.25, "back"), out = ez((B - r.until) / 0.4, "in");
  return (
    <div style={{ position: "absolute", left: 60, top: 140, display: "flex", alignItems: "center", gap: 18, transform: `translateX(${(1 - p) * -300 - out * 400}px)`, opacity: 1 - out }}>
      <span style={{ fontFamily: "Anton", fontSize: 64, lineHeight: 1, background: C.lime, color: C.ink, padding: "4px 14px", border: `4px solid ${C.ink}` }}>{String(r.no).padStart(2, "0")}</span>
      <span style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 60, color, letterSpacing: 6, lineHeight: 1 }}>{r.jp}</span>
    </div>
  );
};

// ── 紙のざらつき(2コマごとに粒が動く)──
export const Grain: React.FC<{ frame: number; dark: boolean }> = ({ frame, dark }) => {
  const k = Math.floor(frame / 2);
  const gx = Math.floor(hash(k) * 512), gy = Math.floor(hash(k + 7) * 512);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${staticFile("kakuu-games/paper.png")})`, backgroundSize: "1024px 1024px", mixBlendMode: "multiply", opacity: dark ? 0.0 : 1 }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${staticFile("kakuu-games/grain.png")})`, backgroundPosition: `${gx}px ${gy}px`, mixBlendMode: dark ? "screen" : "overlay", opacity: dark ? 0.06 : 0.2 }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.28) 100%)" }} />
    </>
  );
};

// ── 演出:ギザギザの光・衝撃波・集中線・スピード線(rig から)──
export { Burst, Shock, FocusLines, SpeedStreaks } from "./rig";
export { C };
