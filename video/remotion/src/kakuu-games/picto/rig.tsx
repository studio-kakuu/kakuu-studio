// KAKUU GAMES のピクトグラム — React で描く部分と、演出の部品。芯(骨組み・ポーズ・道具・決めの動き)は rigcore.ts。
import React from "react";
import { E, figurePrims, hash, type FigOpt, type Pose, type Prim } from "./rigcore";
export * from "./rigcore";

export const Prims: React.FC<{ list: Prim[]; opacity?: number }> = ({ list, opacity = 1 }) => (
  <g opacity={opacity}>
    {list.map((q, i) => {
      if (q.k === "pl") return <polyline key={i} points={q.pts.map((v) => `${v[0]},${v[1]}`).join(" ")} fill="none" stroke={q.c} strokeWidth={q.w} strokeLinecap={q.cap ?? "round"} strokeLinejoin="round" opacity={q.o} />;
      if (q.k === "rect") return <rect key={i} x={q.x} y={q.y} width={q.w} height={q.h} rx={q.rx} fill={q.fill} transform={q.tr} opacity={q.o} />;
      if (q.k === "el") return <ellipse key={i} cx={q.cx} cy={q.cy} rx={q.rx} ry={q.ry} fill={q.fill ?? "none"} stroke={q.stroke} strokeWidth={q.sw} transform={q.tr} opacity={q.o} />;
      return <path key={i} d={q.d} fill={q.fill ?? "none"} stroke={q.stroke} strokeWidth={q.sw} strokeLinecap="round" strokeLinejoin="round" transform={q.tr} opacity={q.o} />;
    })}
  </g>
);
export const Figure: React.FC<{ p: Pose; opacity?: number } & FigOpt> = ({ p, opacity = 1, ...o }) => <Prims list={figurePrims(p, o)} opacity={opacity} />;

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
