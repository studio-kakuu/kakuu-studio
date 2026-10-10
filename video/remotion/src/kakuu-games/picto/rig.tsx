// KAKUU GAMES のピクトグラム(コマ型)— 2D の骨組みと描画、動きの道具、演出の部品。
// 頭はコマのモニター(角の丸い四角に黒い画面とライムの丸い目2つ、アンテナ)。体は単色のシンプルな人型。
// 角度は「真下 = 0°、体の前の方向へ回すと +」。胴だけは「真上 = 0°、前に倒すと +」。
import React from "react";

export const C = { ink: "#0E0E0E", off: "#F2F0E9", lime: "#C6FF3D" };

// ── 体の寸法(単位:体の高さ ≒ 1)──
export const L = { torso: 0.3, ua: 0.155, la: 0.15, th: 0.215, sh: 0.215, headW: 0.215, headH: 0.165, gap: 0.03, limb: 0.07, body: 0.112 };

export type Pose = {
  x: number; y: number; // 腰の位置(地面が y=0、上がマイナス)
  t: number; h: number; // 胴の傾き・頭の傾き
  a1: number; a1l: number; a2: number; a2l: number; // 手前の腕(上腕・前腕)/奥の腕
  l1: number; l1l: number; l2: number; l2l: number; // 手前の脚(もも・すね)/奥の脚
  fr: number; // 0=横向き 1=正面
};
export const STAND: Pose = { x: 0, y: -(L.th + L.sh), t: 0, h: 0, a1: 8, a1l: 8, a2: -8, a2l: -8, l1: 4, l1l: 4, l2: -4, l2l: -4, fr: 0 };
export const P = (p: Partial<Pose>): Pose => ({ ...STAND, ...p });
const KEYS = Object.keys(STAND) as (keyof Pose)[];

// ── イージング(溜め・一気の解放・行きすぎて戻る)──
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const E = {
  lin: (x: number) => x,
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  out: (x: number) => 1 - (1 - x) ** 3,
  in: (x: number) => x * x * x,
  snap: (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  back: (x: number) => { const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; },
  antic: (x: number) => { const c = 1.9; return (c + 1) * x * x * x - c * x * x; }, // 一度逆へ溜めてから
  hold: (x: number) => (x >= 1 ? 1 : 0),
};
export type Ease = keyof typeof E;
export type Key = { b: number; p: Pose; e?: Ease };

export const mix = (a: Pose, b: Pose, k: number): Pose => {
  const o = { ...a };
  for (const n of KEYS) o[n] = a[n] + (b[n] - a[n]) * k;
  return o;
};
// キーポーズの列から、拍 b の姿勢
export function poseAt(keys: Key[], b: number): Pose {
  if (b <= keys[0].b) return keys[0].p;
  for (let i = 0; i < keys.length - 1; i++) {
    const A = keys[i], B = keys[i + 1];
    if (b <= B.b) {
      const x = clamp01((b - A.b) / (B.b - A.b));
      return mix(A.p, B.p, E[B.e ?? "io"](x));
    }
  }
  return keys[keys.length - 1].p;
}
// 数値のキー列
export function valAt(keys: [number, number, Ease?][], b: number) {
  if (b <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [b0, v0] = keys[i], [b1, v1, e] = keys[i + 1];
    if (b <= b1) return v0 + (v1 - v0) * E[e ?? "io"](clamp01((b - b0) / (b1 - b0)));
  }
  return keys[keys.length - 1][1];
}
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ── 骨組み:姿勢 → 関節の位置 ──
const rad = (d: number) => (d * Math.PI) / 180;
export type Joints = ReturnType<typeof fk>;
export function fk(p: Pose, f = 1) {
  const fr = p.fr;
  const dir = (a: number, side: number) => { // 角度 → 向き(正面向きのとき、奥の手足は左右反転)
    const sx = Math.sin(rad(a)) * f * (fr > 0.5 ? side : 1);
    return [sx, Math.cos(rad(a))];
  };
  const hip: [number, number] = [p.x, p.y];
  const tv = [Math.sin(rad(p.t)) * f, -Math.cos(rad(p.t))];
  const neck: [number, number] = [hip[0] + tv[0] * L.torso, hip[1] + tv[1] * L.torso];
  const sho: [number, number] = [hip[0] + tv[0] * L.torso * 0.9, hip[1] + tv[1] * L.torso * 0.9];
  const sw = fr * 0.13; // 正面のときの肩幅・腰幅
  const shoN: [number, number] = [sho[0] + sw * f, sho[1]], shoF: [number, number] = [sho[0] - sw * f, sho[1]];
  const hipN: [number, number] = [hip[0] + fr * 0.06 * f, hip[1]], hipF: [number, number] = [hip[0] - fr * 0.06 * f, hip[1]];
  const seg = (o: [number, number], a: number, l: number, side: number): [number, number] => { const d = dir(a, side); return [o[0] + d[0] * l, o[1] + d[1] * l]; };
  const el1 = seg(shoN, p.a1, L.ua, 1), ha1 = seg(el1, p.a1l, L.la, 1);
  const el2 = seg(shoF, p.a2, L.ua, -1), ha2 = seg(el2, p.a2l, L.la, -1);
  const kn1 = seg(hipN, p.l1, L.th, 1), ft1 = seg(kn1, p.l1l, L.sh, 1);
  const kn2 = seg(hipF, p.l2, L.th, -1), ft2 = seg(kn2, p.l2l, L.sh, -1);
  const ht = p.t + p.h;
  const hv = [Math.sin(rad(ht)) * f, -Math.cos(rad(ht))];
  const head: [number, number] = [neck[0] + hv[0] * (L.gap + L.headH / 2), neck[1] + hv[1] * (L.gap + L.headH / 2)];
  return { hip, neck, shoN, shoF, hipN, hipF, el1, ha1, el2, ha2, kn1, ft1, kn2, ft2, head, headRot: ht * f };
}

// ── 描画 ──
// S = 1単位のピクセル数。color=体の色、bg=すき間の色(手足の重なりを読ませる)、frame=モニターの枠の色
export const Figure: React.FC<{
  p: Pose; S: number; f?: number; color: string; bg: string; screen?: string; eyes?: string; opacity?: number; blink?: number; eyeOn?: number; noHead?: boolean;
}> = ({ p, S, f = 1, color, bg, screen = C.ink, eyes = C.lime, opacity = 1, blink = 0, eyeOn = 1, noHead }) => {
  const j = fk(p, f);
  const s = (q: [number, number]) => `${q[0] * S},${q[1] * S}`;
  const lw = L.limb * S, bw = L.body * S, g = 0.022 * S;
  const limb = (a: [number, number], b: [number, number], c: [number, number], w = lw) => (
    <>
      <polyline points={`${s(a)} ${s(b)} ${s(c)}`} fill="none" stroke={bg} strokeWidth={w + g * 2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`${s(a)} ${s(b)} ${s(c)}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
  const torsoTop: [number, number] = [j.hip[0] + (j.neck[0] - j.hip[0]) * 0.86, j.hip[1] + (j.neck[1] - j.hip[1]) * 0.86];
  const hw = L.headW * S, hh = L.headH * S;
  // 目:横向きは前寄り、正面は中央
  const ex = (0.035 + (1 - p.fr) * 0.02) * S, ec = (1 - p.fr) * 0.028 * S;
  const er = 0.026 * S;
  return (
    <g opacity={opacity}>
      {limb(j.shoF, j.el2, j.ha2)}
      {limb(j.hipF, j.kn2, j.ft2)}
      <line x1={j.hip[0] * S} y1={j.hip[1] * S} x2={torsoTop[0] * S} y2={torsoTop[1] * S} stroke={bg} strokeWidth={bw + g * 2} strokeLinecap="round" />
      <line x1={j.hip[0] * S} y1={j.hip[1] * S} x2={torsoTop[0] * S} y2={torsoTop[1] * S} stroke={color} strokeWidth={bw} strokeLinecap="round" />
      {limb(j.hipN, j.kn1, j.ft1)}
      {limb(j.shoN, j.el1, j.ha1)}
      {!noHead && (
        <g transform={`translate(${j.head[0] * S} ${j.head[1] * S}) rotate(${j.headRot})`}>
          <line x1={-0.03 * S * f} y1={-hh / 2} x2={-0.045 * S * f} y2={-hh / 2 - 0.075 * S} stroke={color} strokeWidth={0.012 * S} strokeLinecap="round" />
          <circle cx={-0.045 * S * f} cy={-hh / 2 - 0.08 * S} r={0.02 * S} fill={eyes} stroke={bg} strokeWidth={0.008 * S} opacity={eyeOn} />
          <rect x={-hw / 2 - g} y={-hh / 2 - g} width={hw + g * 2} height={hh + g * 2} rx={0.05 * S} fill={bg} />
          <rect x={-hw / 2} y={-hh / 2} width={hw} height={hh} rx={0.04 * S} fill={color} />
          <rect x={-hw / 2 + 0.022 * S} y={-hh / 2 + 0.022 * S} width={hw - 0.044 * S} height={hh - 0.05 * S} rx={0.024 * S} fill={screen} />
          {[-1, 1].map((k) => (
            <ellipse key={k} cx={(ec + k * ex * 0.62) * f} cy={-0.004 * S} rx={er * (1 - p.fr * 0.1)} ry={er * Math.max(0.12, 1 - blink)} fill={eyes} opacity={eyeOn} />
          ))}
        </g>
      )}
    </g>
  );
};

// ── 演出の部品 ──
export const Burst: React.FC<{ x: number; y: number; r: number; n?: number; inner?: number; color: string; rot?: number; seed?: number; stroke?: string; sw?: number }> = ({ x, y, r, n = 14, inner = 0.45, color, rot = 0, seed = 1, stroke, sw = 0 }) => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + rot;
    const rr = i % 2 ? r * inner * (0.8 + 0.4 * hash(i + seed)) : r * (0.75 + 0.5 * hash(i * 3 + seed));
    pts.push(`${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`);
  }
  return <polygon points={pts.join(" ")} fill={color} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
};
// 衝撃波の輪(age 秒)
export const Shock: React.FC<{ x: number; y: number; age: number; color: string; max?: number; life?: number; w?: number; squash?: number }> = ({ x, y, age, color, max = 520, life = 0.45, w = 26, squash = 1 }) => {
  if (age < 0 || age > life) return null;
  const k = E.out(age / life);
  return <ellipse cx={x} cy={y} rx={30 + max * k} ry={(30 + max * k) * squash} fill="none" stroke={color} strokeWidth={w * (1 - k) + 1} opacity={1 - k * 0.6} />;
};
// 集中線(画面の外から中心へ)
export const FocusLines: React.FC<{ cx: number; cy: number; o: number; seed: number; color: string; inner?: number; n?: number }> = ({ cx, cy, o, seed, color, inner = 420, n = 70 }) => {
  if (o <= 0) return null;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (hash(i * 3.3 + seed) - 0.5) * 0.07;
    const r0 = inner + 300 * hash(i * 7.1 + seed), r1 = 2200, w = 4 + 12 * hash(i * 1.7 + seed);
    const c = Math.cos(a), s = Math.sin(a);
    out.push(<polygon key={i} points={`${cx + c * r0},${cy + s * r0} ${cx + c * r1 - s * w},${cy + s * r1 + c * w} ${cx + c * r1 + s * w},${cy + s * r1 - c * w}`} />);
  }
  return <g fill={color} opacity={o}>{out}</g>;
};
// 横のスピード線(流れる)
export const SpeedStreaks: React.FC<{ t: number; speed: number; color: string; o?: number; seed?: number; y0?: number; y1?: number; n?: number }> = ({ t, speed, color, o = 0.5, seed = 0, y0 = 0, y1 = 1920, n = 26 }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const len = 160 + 520 * hash(i * 5 + seed), y = y0 + (y1 - y0) * hash(i * 9.7 + seed), th = 3 + 7 * hash(i * 2.3 + seed);
    const span = 1080 + len + 200;
    const x = 1180 - ((t * speed * (0.7 + 0.6 * hash(i + seed)) + hash(i * 13 + seed) * span) % span);
    out.push(<rect key={i} x={x} y={y} width={len} height={th} rx={th / 2} />);
  }
  return <g fill={color} opacity={o}>{out}</g>;
};
