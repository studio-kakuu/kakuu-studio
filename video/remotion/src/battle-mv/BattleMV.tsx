// 作品006「アニメ戦闘MV」— 素材画像をコードで動かすモーションコミック(縦 1080×1920・24fps・64秒・効果音のみ)
// 8シーン × 8秒(192コマ)。キャラは画像なので手足は動かさず、移動・拡大・回転・残像・モーションブラー・集中線でスピードを出す。
// 色:魔法使い=緑の風と氷/騎士=金の光/狼=紫と黒の結晶。斬撃の軌跡は 0.5 秒(12コマ)で消える。血の表現はしない。
import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, Easing } from "remotion";
import { Audio } from "@remotion/media";
import meta from "../../public/battle-mv/meta.json";

export const BMV_FPS = 24;
export const SCENE = 192; // 8秒
export const BMV_FRAMES = SCENE * 8; // 64秒

const W = 1080;
const H = 1920;
const SIZES = meta.sizes as Record<string, number[]>;
const src = (n: string) => staticFile(`battle-mv/${n}.webp`);

// 剣の長さ(切り抜き画像の元のピクセル)。画像ごとに剣の大きさが違うので、表示の大きさをこれでそろえる
const SWORD: Record<string, number> = {
  knight_idle_front: 840,
  knight_overhead_swing: 760,
  knight_dive_thrust: 500,
  knight_back_leap: 863,
  knight_diagonal_slash: 840,
  knight_kneel_sword: 1090,
};
/** 画面上の剣の長さが swordPx になる表示の高さ */
const kh = (name: string, swordPx = 560) => (SIZES[name][1] * swordPx) / SWORD[name];

// ---------- 小さな道具 ----------
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lin = (f: number, a: number, b: number, x: number, y: number, ease?: (t: number) => number) =>
  interpolate(f, [a, b], [x, y], ease ? { ...clamp, easing: ease } : clamp);
const out3 = Easing.out(Easing.cubic);
const in3 = Easing.in(Easing.cubic);
const io = Easing.inOut(Easing.cubic);
const rnd = (s: string | number) => random(`bmv-${s}`);

const GOLD = "#ffd36a";
const GOLD_HOT = "#fff3c4";
const GREEN = "#5dffb0";
const ICE = "#bff4ff";
const PURPLE = "#b45cff";

// ---------- 画面の揺れ・白フラッシュ ----------
// 揺れ:[コマ, 強さ]。8コマで収まる
const SHAKES: [number, number][] = [
  [112, 34], [118, 18], [130, 22], [168, 26],
  [192 + 44, 46], [192 + 96, 18], [192 + 112, 14],
  [384 + 62, 40], [384 + 70, 16],
  [576 + 30, 22], [576 + 80, 22], [576 + 130, 30],
  [768 + 40, 20], [768 + 56, 36], [768 + 132, 22], [768 + 162, 22],
  [960 + 80, 16], [960 + 100, 10],
  [1152 + 58, 60], [1152 + 66, 24],
];
// 白フラッシュは1コマだけ(シーン2・3・7)
const FLASHES = [192 + 44, 384 + 62, 1152 + 58];

const shakeAt = (f: number) => {
  let x = 0;
  let y = 0;
  let r = 0;
  for (const [s, a] of SHAKES) {
    const t = f - s;
    if (t < 0 || t > 10) continue;
    const k = a * Math.pow(1 - t / 10, 2);
    x += (rnd(`sx${s}-${f}`) - 0.5) * 2 * k;
    y += (rnd(`sy${s}-${f}`) - 0.5) * 2 * k;
    r += (rnd(`sr${s}-${f}`) - 0.5) * k * 0.05;
  }
  return { x, y, r };
};

// ---------- 絵(切り抜き画像) ----------
type SP = {
  name: string;
  x: number; // 中心
  y: number;
  h: number; // 表示の高さ
  r?: number;
  o?: number;
  flip?: boolean;
  blur?: "" | "h" | "v" | "h2" | "v2";
  glow?: string; // 光のふち
  filter?: string;
  z?: number;
};
const Sprite: React.FC<SP> = ({ name, x, y, h, r = 0, o = 1, flip, blur = "", glow, filter = "" }) => {
  const [sw, sh] = SIZES[name];
  const w = (h * sw) / sh;
  const blurF = blur ? `url(#mb-${blur}) ` : "";
  const glowF = glow ? `drop-shadow(0 0 18px ${glow}) drop-shadow(0 0 4px ${glow}) ` : "";
  if (o <= 0.001) return null;
  return (
    <Img
      src={src(name)}
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        opacity: o,
        transform: `rotate(${r}deg) scaleX(${flip ? -1 : 1})`,
        filter: (blurF + glowF + filter).trim() || undefined,
      }}
    />
  );
};

/** 残像:fn(コマ) の位置を少し前のコマで2〜3枚重ねる */
const Ghosts: React.FC<{ f: number; fn: (f: number) => SP; n?: number; gap?: number; tint?: string; on?: boolean }> = ({
  f, fn, n = 3, gap = 2, tint = "#ffffff", on = true,
}) => {
  const now = fn(f);
  return (
    <>
      {on &&
        Array.from({ length: n }, (_, i) => n - i).map((i) => {
          const p = fn(f - i * gap);
          return (
            <Sprite key={i} {...p} o={(p.o ?? 1) * [0, 0.42, 0.26, 0.14][i]} glow={undefined}
              filter={`brightness(1.5) drop-shadow(0 0 10px ${tint})`} blur={p.blur} />
          );
        })}
      <Sprite {...now} />
    </>
  );
};

// ---------- 背景 ----------
const Bg: React.FC<{ name: string; s?: number; x?: number; y?: number; r?: number; o?: number; dark?: number; blur?: SP["blur"]; filter?: string }> = ({
  name, s = 1.1, x = 0, y = 0, r = 0, o = 1, dark = 0, blur = "", filter = "",
}) => {
  const bw = W;
  const bh = (W * 2576) / 1438;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Img
        src={src(name)}
        style={{
          position: "absolute",
          left: (W - bw) / 2,
          top: (H - bh) / 2,
          width: bw,
          height: bh,
          transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`,
          filter: ((blur ? `url(#mb-${blur}) ` : "") + filter).trim() || undefined,
        }}
      />
      {dark > 0 && <AbsoluteFill style={{ background: `rgba(6,4,14,${dark})` }} />}
    </AbsoluteFill>
  );
};

/** カメラ:中の要素をまとめてズーム・パン・回転 */
const Cam: React.FC<{ s?: number; x?: number; y?: number; r?: number; children: React.ReactNode }> = ({ s = 1, x = 0, y = 0, r = 0, children }) => (
  <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, transformOrigin: "50% 50%" }}>
    {children}
  </AbsoluteFill>
);

const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

// ---------- エフェクト ----------
/** 集中線(中心へ向かう線)。2コマごとに並びが変わる */
const SpeedLines: React.FC<{ f: number; cx?: number; cy?: number; n?: number; inner?: number; color?: string; o?: number; seed?: string }> = ({
  f, cx = W / 2, cy = H / 2, n = 70, inner = 330, color = "#fff", o = 1, seed = "sl",
}) => {
  if (o <= 0) return null;
  const k = Math.floor(f / 2);
  return (
    <Svg>
      {Array.from({ length: n }, (_, i) => {
        const a = rnd(`${seed}a${i}-${k}`) * Math.PI * 2;
        const r0 = inner + rnd(`${seed}r${i}-${k}`) * 420;
        const r1 = 1500;
        const wdt = 2 + rnd(`${seed}w${i}-${k}`) * 9;
        const p = (r: number, d = 0) => `${cx + Math.cos(a + d) * r},${cy + Math.sin(a + d) * r}`;
        const d = wdt / r1;
        return <polygon key={i} points={`${p(r0)} ${p(r1, d)} ${p(r1, -d)}`} fill={color} opacity={o * (0.35 + rnd(`${seed}o${i}-${k}`) * 0.6)} />;
      })}
    </Svg>
  );
};

/** 平行の流線(横や縦に流れるスピード感) */
const Streaks: React.FC<{ f: number; angle?: number; n?: number; color?: string; o?: number; speed?: number; seed?: string }> = ({
  f, angle = 0, n = 46, color = "#fff", o = 0.7, speed = 140, seed = "st",
}) => {
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ transform: `rotate(${angle}deg) scale(1.6)`, transformOrigin: "50% 50%" }}>
      <Svg>
        {Array.from({ length: n }, (_, i) => {
          const y = rnd(`${seed}y${i}`) * H;
          const len = 160 + rnd(`${seed}l${i}`) * 520;
          const x = W + 600 - ((rnd(`${seed}x${i}`) * 2400 + f * speed * (0.6 + rnd(`${seed}v${i}`))) % 2400);
          return <rect key={i} x={x} y={y} width={len} height={1.5 + rnd(`${seed}h${i}`) * 4} rx={2} fill={color} opacity={o * (0.3 + rnd(`${seed}o${i}`) * 0.7)} />;
        })}
      </Svg>
    </AbsoluteFill>
  );
};

/** 雨粒 */
const Rain: React.FC<{ f: number; o: number }> = ({ f, o }) => {
  if (o <= 0) return null;
  return (
    <Svg>
      {Array.from({ length: 150 }, (_, i) => {
        const x = rnd(`rx${i}`) * (W + 300) - 150;
        const sp = 70 + rnd(`rv${i}`) * 50;
        const y = ((rnd(`ry${i}`) * 2300 + f * sp) % 2300) - 200;
        const len = 40 + rnd(`rl${i}`) * 70;
        return <line key={i} x1={x} y1={y} x2={x - len * 0.18} y2={y + len} stroke="#d8f0ff" strokeWidth={1.4 + rnd(`rw${i}`) * 1.6} opacity={o * (0.25 + rnd(`ro${i}`) * 0.5)} />;
      })}
    </Svg>
  );
};

/** 霧(ゆっくり流れる白いもや) */
const Fog: React.FC<{ f: number; o?: number; color?: string }> = ({ f, o = 0.35, color = "220,235,235" }) => (
  <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
    {[0, 1, 2, 3].map((i) => {
      const x = ((rnd(`fx${i}`) * 1400 + f * (1.2 + i * 0.6)) % 1800) - 600;
      const y = 500 + rnd(`fy${i}`) * 1100;
      return (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: 900, height: 420, borderRadius: "50%",
          background: `radial-gradient(ellipse at center, rgba(${color},0.55), rgba(${color},0) 70%)` }} />
      );
    })}
  </AbsoluteFill>
);

type BurstKind = "stone" | "crystal" | "ice" | "gold" | "green";
const BURST_STYLE: Record<BurstKind, { fill: string[]; stroke: string; glow?: string }> = {
  stone: { fill: ["#5b5f63", "#6f7477", "#46494c", "#82878a"], stroke: "#1c1d1f" },
  crystal: { fill: ["#1a0f26", "#2b1640", "#3a1d5a", "#120a1c"], stroke: "#c48bff", glow: PURPLE },
  ice: { fill: ["#e6fbff", "#bff4ff", "#9fe7ff", "#ffffff"], stroke: "#ffffff", glow: "#7fe3ff" },
  gold: { fill: ["#fff3c4", "#ffd36a", "#ffe9a0"], stroke: "#fff", glow: GOLD },
  green: { fill: ["#c8ffe6", "#5dffb0", "#9dffd2"], stroke: "#fff", glow: GREEN },
};
/**
 * 破片の飛び散り。toCam=true は破片がカメラに向かって大きくなる(画面を横切って場面のつなぎを隠す)
 */
const Burst: React.FC<{ f: number; start: number; dur?: number; n?: number; cx: number; cy: number; kind: BurstKind; spread?: number; size?: number; toCam?: boolean; seed?: string; dir?: number; cone?: number; gravity?: number }> = ({
  f, start, dur = 26, n = 24, cx, cy, kind, spread = 900, size = 40, toCam = false, seed = "b", dir, cone = Math.PI * 2, gravity = 0,
}) => {
  const t = (f - start) / dur;
  if (t < 0 || t > 1) return null;
  const st = BURST_STYLE[kind];
  return (
    <Svg style={st.glow ? { filter: `drop-shadow(0 0 8px ${st.glow})` } : undefined}>
      {Array.from({ length: n }, (_, i) => {
        const a = dir === undefined ? rnd(`${seed}a${i}`) * Math.PI * 2 : dir + (rnd(`${seed}a${i}`) - 0.5) * cone;
        const v = 0.35 + rnd(`${seed}v${i}`) * 0.65;
        const e = out3(t);
        const dist = (toCam ? Math.pow(t, 1.6) * 1.4 : e) * spread * v;
        const x = cx + Math.cos(a) * dist;
        const y = cy + Math.sin(a) * dist + gravity * t * t;
        const s = size * (0.4 + rnd(`${seed}s${i}`) * 0.9) * (toCam ? 0.3 + Math.pow(t, 2.2) * 9 : 1 - t * 0.4);
        const rot = rnd(`${seed}r${i}`) * 360 + t * 400 * (rnd(`${seed}d${i}`) - 0.5);
        const k = 5 + Math.floor(rnd(`${seed}k${i}`) * 3);
        const pts = Array.from({ length: k }, (_, j) => {
          const aa = (j / k) * Math.PI * 2;
          const rr = s * (0.55 + rnd(`${seed}p${i}-${j}`) * 0.6) * (kind === "crystal" || kind === "ice" ? (j % 2 ? 0.45 : 1.25) : 1);
          return `${Math.cos(aa) * rr},${Math.sin(aa) * rr}`;
        }).join(" ");
        const o = toCam ? lin(t, 0, 0.1, 0, 1) : lin(t, 0.6, 1, 1, 0);
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
            <polygon points={pts} fill={st.fill[i % st.fill.length]} stroke={st.stroke} strokeWidth={kind === "stone" ? 3 : 1.6} strokeLinejoin="round" />
          </g>
        );
      })}
    </Svg>
  );
};

/** 衝撃波(広がる輪) */
const Ring: React.FC<{ f: number; start: number; cx: number; cy: number; r?: number; color?: string; dur?: number; w?: number; squash?: number }> = ({
  f, start, cx, cy, r = 700, color = "#fff", dur = 14, w = 40, squash = 1,
}) => {
  const t = (f - start) / dur;
  if (t < 0 || t > 1) return null;
  const rr = out3(t) * r;
  return (
    <Svg style={{ filter: `drop-shadow(0 0 14px ${color})` }}>
      <ellipse cx={cx} cy={cy} rx={rr} ry={rr * squash} fill="none" stroke={color} strokeWidth={w * (1 - t) + 1} opacity={1 - t} />
      <ellipse cx={cx} cy={cy} rx={rr * 0.82} ry={rr * 0.82 * squash} fill="none" stroke="#fff" strokeWidth={(w * (1 - t)) / 3 + 1} opacity={(1 - t) * 0.8} />
    </Svg>
  );
};

/** 斬撃の軌跡(金)。3コマで振り抜き、12コマ(0.5秒)で消える */
const Slash: React.FC<{ f: number; start: number; d: string; len?: number; w?: number; color?: string }> = ({ f, start, d, len = 1600, w = 34, color = GOLD }) => {
  const t = f - start;
  if (t < 0 || t >= 12) return null;
  const draw = lin(t, 0, 3, 0, 1, out3);
  const fade = lin(t, 3, 12, 1, 0);
  const thin = lin(t, 2, 12, 1, 0.25);
  return (
    <Svg style={{ filter: `drop-shadow(0 0 22px ${color}) drop-shadow(0 0 6px ${color})` }}>
      <path d={d} fill="none" stroke={color} strokeWidth={w * thin} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} opacity={fade} />
      <path d={d} fill="none" stroke={GOLD_HOT} strokeWidth={w * thin * 0.4} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} opacity={fade} />
    </Svg>
  );
};

/** 三日月の斬撃(飛んでいく金の三日月) */
const Crescent: React.FC<{ f: number; start: number; x0: number; y0: number; x1: number; y1: number; size?: number; rot?: number }> = ({ f, start, x0, y0, x1, y1, size = 380, rot = 0 }) => {
  const t = f - start;
  if (t < 0 || t >= 12) return null;
  const p = lin(t, 0, 7, 0, 1, out3);
  const x = x0 + (x1 - x0) * p;
  const y = y0 + (y1 - y0) * p;
  const o = lin(t, 6, 12, 1, 0);
  const s = size * lin(t, 0, 4, 0.5, 1);
  const d = `M 0 ${-s} A ${s} ${s} 0 0 1 0 ${s} A ${s * 0.72} ${s * 0.9} 0 0 0 0 ${-s} Z`;
  return (
    <Svg style={{ filter: `drop-shadow(0 0 24px ${GOLD}) drop-shadow(0 0 6px ${GOLD})` }}>
      <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
        <path d={d} fill={GOLD} />
        <path d={d} fill={GOLD_HOT} transform="scale(0.8 0.92)" />
      </g>
    </Svg>
  );
};

/** 六角形のバリア(5層)。hit のコマで波打つ */
const hexPts = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(" ");
const Barrier: React.FC<{ f: number; start: number; cx: number; cy: number; hits: number[]; fadeAt: number }> = ({ f, start, cx, cy, hits, fadeAt }) => {
  if (f < start) return null;
  const fade = lin(f, fadeAt, fadeAt + 16, 1, 0);
  if (fade <= 0) return null;
  const cell = 34;
  return (
    <Svg style={{ filter: `drop-shadow(0 0 16px ${GREEN})` }}>
      <defs>
        <pattern id="hexcell" width={cell * 1.732} height={cell * 3} patternUnits="userSpaceOnUse">
          <polygon points={hexPts(cell * 0.866, cell, cell * 0.95)} fill="none" stroke={GREEN} strokeWidth={2} />
          <polygon points={hexPts(0, cell * 2.5, cell * 0.95)} fill="none" stroke={GREEN} strokeWidth={2} />
          <polygon points={hexPts(cell * 1.732, cell * 2.5, cell * 0.95)} fill="none" stroke={GREEN} strokeWidth={2} />
        </pattern>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const ap = lin(f, start + i * 3, start + i * 3 + 8, 0, 1, out3);
        let pulse = 0;
        for (const h of hits) {
          const t = f - h - i * 1.5;
          if (t >= 0 && t < 14) pulse += Math.sin(t * 1.2) * 18 * (1 - t / 14) * (5 - i) * 0.3;
        }
        const r = (260 + i * 62) * ap + pulse;
        const o = (0.95 - i * 0.12) * fade;
        return (
          <g key={i} opacity={o}>
            <polygon points={hexPts(cx, cy, r)} fill={`rgba(93,255,176,${0.05 + 0.03 * (4 - i)})`} stroke={i === 4 ? "#eafff5" : GREEN} strokeWidth={i === 4 ? 6 : 3.5} />
            {i === 4 && <polygon points={hexPts(cx, cy, r)} fill="url(#hexcell)" opacity={0.55} />}
          </g>
        );
      })}
    </Svg>
  );
};

/** 氷の台(足元にできる結晶の板) */
const IcePlate: React.FC<{ f: number; start: number; cx: number; cy: number; w?: number; o?: number }> = ({ f, start, cx, cy, w = 860, o = 1 }) => {
  const p = lin(f, start, start + 12, 0, 1, out3);
  if (p <= 0 || o <= 0) return null;
  const hw = (w / 2) * p;
  const top = 46;
  const bot = 120 * p;
  const pts = `${cx - hw},${cy} ${cx - hw * 0.8},${cy - top} ${cx - hw * 0.2},${cy - top - 18} ${cx + hw * 0.5},${cy - top - 6} ${cx + hw},${cy - 6} ${cx + hw * 0.7},${cy + bot * 0.6} ${cx + hw * 0.1},${cy + bot} ${cx - hw * 0.6},${cy + bot * 0.7}`;
  const spikes = Array.from({ length: 9 }, (_, i) => {
    const x = cx - hw * 0.85 + (i / 8) * hw * 1.7;
    const hh = (40 + rnd(`ips${i}`) * 110) * p;
    return `${x - 18},${cy - top + 8} ${x + (rnd(`ipx${i}`) - 0.5) * 30},${cy - top - hh} ${x + 18},${cy - top + 8}`;
  });
  return (
    <Svg style={{ filter: "drop-shadow(0 0 14px #7fe3ff)", opacity: o }}>
      {spikes.map((s, i) => <polygon key={i} points={s} fill="rgba(200,245,255,0.55)" stroke="#fff" strokeWidth={2} />)}
      <polygon points={pts} fill="rgba(170,235,255,0.6)" stroke="#ffffff" strokeWidth={4} />
      <polyline points={`${cx - hw * 0.6},${cy - 20} ${cx - hw * 0.2},${cy + 30} ${cx + hw * 0.3},${cy - 10} ${cx + hw * 0.6},${cy + 40}`} fill="none" stroke="#fff" strokeWidth={2} opacity={0.8} />
    </Svg>
  );
};

/** 縦の光の柱(変身・溜め) */
const Pillars: React.FC<{ f: number; o: number; color: string; cx: number; seed?: string }> = ({ f, o, color, cx, seed = "pl" }) => {
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o, mixBlendMode: "screen" }}>
      {Array.from({ length: 9 }, (_, i) => {
        const x = cx + (rnd(`${seed}x${i}`) - 0.5) * 760;
        const w = 20 + rnd(`${seed}w${i}`) * 90;
        const fl = 0.5 + 0.5 * Math.sin(f * 0.7 + i * 1.7);
        return <div key={i} style={{ position: "absolute", left: x - w / 2, top: 0, width: w, height: H, opacity: 0.25 + fl * 0.5,
          background: `linear-gradient(to top, ${color}, rgba(255,255,255,0) 85%)`, filter: "blur(6px)" }} />;
      })}
    </AbsoluteFill>
  );
};

/** 光の玉(放射状のグロー) */
const Glow: React.FC<{ x: number; y: number; r: number; color: string; o?: number }> = ({ x, y, r, color, o = 1 }) =>
  o <= 0 ? null : (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", opacity: o, mixBlendMode: "screen",
      background: `radial-gradient(circle, #ffffff 0%, ${color} 22%, rgba(0,0,0,0) 70%)` }} />
  );

/** 氷の階段(緑の半透明)。i 段目は start + i*gap で現れる */
const STAIRS = Array.from({ length: 8 }, (_, i) => ({ x: 300 + (i % 2 ? 360 : 0) + (i % 4 === 3 ? -120 : 0), y: 1760 - i * 200 }));
const IceStairs: React.FC<{ f: number; start: number; gap: number; broken: Record<number, number> }> = ({ f, start, gap, broken }) => (
  <Svg style={{ filter: `drop-shadow(0 0 12px ${GREEN})` }}>
    {STAIRS.map((s, i) => {
      const p = lin(f, start + i * gap, start + i * gap + 6, 0, 1, out3);
      const b = broken[i] !== undefined ? lin(f, broken[i], broken[i] + 6, 1, 0) : 1;
      if (p <= 0 || b <= 0) return null;
      const w = 300 * p;
      return (
        <g key={i} opacity={b}>
          <polygon points={`${s.x - w / 2},${s.y} ${s.x - w / 2 + 40},${s.y - 34} ${s.x + w / 2 + 40},${s.y - 34} ${s.x + w / 2},${s.y} ${s.x + w / 2 - 20},${s.y + 70 * p} ${s.x - w / 2 + 30},${s.y + 50 * p}`}
            fill="rgba(110,255,190,0.38)" stroke="#e8fff4" strokeWidth={3} />
          <line x1={s.x - w / 2 + 10} y1={s.y - 6} x2={s.x + w / 2 + 20} y2={s.y - 26} stroke="#fff" strokeWidth={2} opacity={0.8} />
        </g>
      );
    })}
  </Svg>
);

/** 紫のビーム。from から to へ伸びて 10コマで消える */
const Beam: React.FC<{ f: number; start: number; x0: number; y0: number; x1: number; y1: number }> = ({ f, start, x0, y0, x1, y1 }) => {
  const t = f - start;
  if (t < 0 || t > 14) return null;
  const p = lin(t, 0, 3, 0, 1, out3);
  const o = lin(t, 8, 14, 1, 0);
  const x = x0 + (x1 - x0) * p;
  const y = y0 + (y1 - y0) * p;
  const w = 70 * (1 + 0.15 * Math.sin(t * 2.3));
  return (
    <Svg style={{ filter: `drop-shadow(0 0 30px ${PURPLE}) drop-shadow(0 0 8px ${PURPLE})` }}>
      <g opacity={o}>
        <line x1={x0} y1={y0} x2={x} y2={y} stroke={PURPLE} strokeWidth={w} strokeLinecap="round" />
        <line x1={x0} y1={y0} x2={x} y2={y} stroke="#f3e2ff" strokeWidth={w * 0.35} strokeLinecap="round" />
      </g>
    </Svg>
  );
};

/** 魔法陣(緑・回転)。線を描いて現れる */
const MagicCircle: React.FC<{ f: number; start: number; cx: number; cy: number; r: number; o?: number }> = ({ f, start, cx, cy, r, o = 1 }) => {
  const t = f - start;
  if (t < 0) return null;
  const draw = lin(t, 0, 20, 0, 1, out3);
  const rot = t * 1.2;
  const C = 2 * Math.PI;
  const ring = (rr: number, w: number, dash?: string, key?: string) => (
    <circle key={key} cx={cx} cy={cy} r={rr} fill="none" stroke={GREEN} strokeWidth={w} strokeDasharray={dash ?? `${C * rr}`} strokeDashoffset={dash ? 0 : C * rr * (1 - draw)} />
  );
  const tri = (rr: number, a0: number) =>
    [0, 1, 2].map((i) => `${cx + Math.cos(a0 + (i * C) / 3) * rr},${cy + Math.sin(a0 + (i * C) / 3) * rr}`).join(" ");
  return (
    <Svg style={{ filter: `drop-shadow(0 0 18px ${GREEN}) drop-shadow(0 0 4px ${GREEN})`, opacity: o }}>
      <circle cx={cx} cy={cy} r={r} fill="rgba(93,255,176,0.06)" />
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        {ring(r, 8)}
        {ring(r * 0.93, 3)}
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * C;
          const l = i % 6 === 0 ? 34 : 14;
          return <line key={i} x1={cx + Math.cos(a) * r * 0.93} y1={cy + Math.sin(a) * r * 0.93} x2={cx + Math.cos(a) * (r * 0.93 - l)} y2={cy + Math.sin(a) * (r * 0.93 - l)} stroke={GREEN} strokeWidth={3} opacity={draw} />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * C;
          const x = cx + Math.cos(a) * r * 0.8;
          const y = cy + Math.sin(a) * r * 0.8;
          return <polygon key={i} points={`${x},${y - 22} ${x + 13},${y} ${x},${y + 22} ${x - 13},${y}`} fill="none" stroke="#dfffee" strokeWidth={3} opacity={draw} />;
        })}
      </g>
      <g transform={`rotate(${-rot * 1.6} ${cx} ${cy})`} opacity={draw}>
        {ring(r * 0.68, 4, "18 12", "d1")}
        <polygon points={tri(r * 0.62, -Math.PI / 2)} fill="none" stroke={GREEN} strokeWidth={4} />
        <polygon points={tri(r * 0.62, Math.PI / 2)} fill="none" stroke={GREEN} strokeWidth={4} />
        {ring(r * 0.3, 5, undefined, "c3")}
      </g>
    </Svg>
  );
};

/** 緑の鎖。from から to へ、p(0〜1)の分だけ伸びる */
const Chain: React.FC<{ x0: number; y0: number; x1: number; y1: number; p: number; sway: number }> = ({ x0, y0, x1, y1, p, sway }) => {
  if (p <= 0) return null;
  const len = Math.hypot(x1 - x0, y1 - y0) * p;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const link = 46;
  const n = Math.floor(len / (link * 0.78));
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const d = i * link * 0.78;
        const bend = Math.sin((d / Math.max(len, 1)) * Math.PI) * sway;
        const x = x0 + Math.cos(ang) * d - Math.sin(ang) * bend;
        const y = y0 + Math.sin(ang) * d + Math.cos(ang) * bend;
        const flat = i % 2 === 0;
        return (
          <ellipse key={i} cx={x} cy={y} rx={link / 2} ry={flat ? 15 : 4} transform={`rotate(${(ang * 180) / Math.PI} ${x} ${y})`}
            fill="none" stroke={flat ? GREEN : "#d9ffef"} strokeWidth={flat ? 7 : 9} />
        );
      })}
    </g>
  );
};

/** 粒が中心へ集まる(剣に光が溜まる) */
const Converge: React.FC<{ f: number; start: number; end: number; x: number; y: number; color: string; n?: number }> = ({ f, start, end, x, y, color, n = 60 }) => {
  if (f < start || f > end + 10) return null;
  return (
    <Svg style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
      {Array.from({ length: n }, (_, i) => {
        const life = 22;
        const born = start + rnd(`cvb${i}`) * (end - start);
        const t = ((f - born) % life + life) % life / life;
        if (f < born) return null;
        const a = rnd(`cva${i}`) * Math.PI * 2;
        const r0 = 300 + rnd(`cvr${i}`) * 500;
        const r = r0 * (1 - in3(t));
        return <circle key={i} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r} r={3 + rnd(`cvs${i}`) * 6} fill={GOLD_HOT} opacity={lin(t, 0, 0.2, 0, 1) * (f > end ? lin(f, end, end + 10, 1, 0) : 1)} />;
      })}
    </Svg>
  );
};

/** 氷の粒(雪のように降る/翼の狼が崩れて舞う) */
const Snow: React.FC<{ f: number; o: number; n?: number; seed?: string }> = ({ f, o, n = 110, seed = "sn" }) => {
  if (o <= 0) return null;
  return (
    <Svg style={{ filter: "drop-shadow(0 0 6px #9fe7ff)" }}>
      {Array.from({ length: n }, (_, i) => {
        const sp = 2.5 + rnd(`${seed}v${i}`) * 4;
        const y = ((rnd(`${seed}y${i}`) * 2100 + f * sp) % 2100) - 90;
        const x = rnd(`${seed}x${i}`) * W + Math.sin(f * 0.05 + i) * 30;
        const s = 3 + rnd(`${seed}s${i}`) * 7;
        return <polygon key={i} points={`${x},${y - s} ${x + s * 0.6},${y} ${x},${y + s} ${x - s * 0.6},${y}`} fill={i % 3 ? "#e9fbff" : ICE} opacity={o * (0.4 + rnd(`${seed}o${i}`) * 0.6)} />;
      })}
    </Svg>
  );
};

// ================= シーン =================
// それぞれ l = シーン内のコマ(0〜191)

// 1. 奇襲:霧の森。目のアップを素早く切り替え → 雨粒 → 狼の顔が飛び込み、石の破片がカメラへ
const S1: React.FC<{ l: number }> = ({ l }) => {
  const eyeCuts: [number, number, string][] = [[0, 10, "knight"], [10, 19, "mage"], [19, 26, "knight"], [26, 32, "mage"], [32, 37, "knight"], [37, 42, "mage"]];
  const eye = eyeCuts.find(([a, b]) => l >= a && l < b);
  const wolfIn = 108;
  const wp = (ff: number): SP => {
    const t = ff - wolfIn;
    const s = t < 10 ? lin(t, 0, 10, 0.12, 1.12, out3) : 1.12 + (t - 10) * 0.0025;
    return { name: "wolf_roar_closeup", x: 540, y: 960 + lin(t, 0, 10, -200, 0, out3), h: 1500 * s, r: lin(t, 0, 10, -14, 0, out3), o: t < 0 ? 0 : 1, blur: t < 8 ? "v" : "" };
  };
  const camS = lin(l, 42, 192, 1.18, 1.42);
  return (
    <AbsoluteFill style={{ background: "#05060a" }}>
      <Cam s={camS} y={lin(l, 42, 192, 0, -60)} r={lin(l, 42, 192, -1, 1.5)}>
        <Bg name="bg_forest_ruins" dark={lin(l, 100, 112, 0.15, 0.55)} filter={`saturate(${lin(l, 100, 112, 1, 0.6)})`} />
        <Fog f={l} o={0.45} />
      </Cam>
      {/* 霧の奥に赤い目が2つ光る(気配) */}
      {[388, 692].map((x, i) => <Glow key={i} x={540 + (x - 540) * 0.25} y={900} r={lin(l, 84, 104, 0, 46)} color="#ff2a3a" o={lin(l, 84, 96, 0, 0.9) * lin(l, 104, 108, 1, 0)} />)}
      <Rain f={l} o={lin(l, 44, 60, 0, 1) * lin(l, 150, 175, 1, 0.5)} />
      <SpeedLines f={l} o={lin(l, wolfIn, wolfIn + 4, 0, 1) * lin(l, 140, 160, 1, 0.25)} color="#e8e4ff" seed="s1" />
      <AbsoluteFill style={{ filter: `drop-shadow(0 0 40px rgba(150,60,255,0.6))` }}>
        <Ghosts f={l} fn={wp} on={l < wolfIn + 14} tint={PURPLE} />
      </AbsoluteFill>
      <Burst f={l} start={124} dur={34} n={22} cx={540} cy={1050} kind="stone" spread={900} size={34} toCam seed="s1a" />
      <Burst f={l} start={162} dur={30} n={30} cx={560} cy={980} kind="stone" spread={1000} size={40} toCam seed="s1b" />
      {/* 目のアップ(冒頭) */}
      {eye && (
        <AbsoluteFill style={{ background: "#020203" }}>
          <Img src={src(eye[2] === "knight" ? "knight_eyes_closeup" : "mage_eyes_closeup")}
            style={{ position: "absolute", left: -60, width: W + 120, top: 960 - ((W + 120) * SIZES[`${eye[2]}_eyes_closeup`][1]) / SIZES[`${eye[2]}_eyes_closeup`][0] / 2,
              transform: `scale(${lin(l, eye[0], eye[1], 1.0, 1.1)}) translateX(${lin(l, eye[0], eye[0] + 3, eye[2] === "knight" ? -50 : 50, 0, out3)}px)` }} />
          <AbsoluteFill style={{ background: eye[2] === "knight" ? "rgba(255,200,80,0.08)" : "rgba(80,255,170,0.08)" }} />
        </AbsoluteFill>
      )}
      {l === 42 && <AbsoluteFill style={{ background: "rgba(255,255,255,0.5)" }} />}
    </AbsoluteFill>
  );
};

// 2. 防御:石畳。上から爪を振り下ろす狼 vs 下で杖を突く魔法使い。5層のバリア、衝撃、足元に氷の台
const S2: React.FC<{ l: number }> = ({ l }) => {
  const hit = 44;
  const wolf = (ff: number): SP => {
    let y = lin(ff, 0, hit, -700, 420, in3);
    if (ff >= hit) y = 420 - lin(ff, hit, hit + 10, 0, 90, out3) + lin(ff, hit + 30, 96, 0, 110, in3) - lin(ff, 96, 104, 0, 60, out3);
    if (ff >= 140) y -= lin(ff, 140, 160, 0, 1500, in3);
    return { name: "wolf_charge_front", x: 540 + lin(ff, 0, hit, -140, 0), y, h: 1300, r: lin(ff, 0, hit, -16, 4), blur: ff < hit || ff > 140 ? "v" : "", glow: "rgba(150,60,255,0.7)" };
  };
  const mageY = lin(l, 0, 14, 1900, 1430, out3);
  return (
    <AbsoluteFill>
      <Cam s={lin(l, 0, 192, 1.22, 1.08) + lin(l, hit, hit + 6, 0.06, 0)} r={lin(l, 0, 192, -2.5, 2)} y={lin(l, 150, 192, 0, -120, in3)}>
        <Bg name="bg_ruins_stone_floor" dark={0.2} />
        <Fog f={l + 60} o={0.3} color="200,210,215" />
        <Ghosts f={l} fn={wolf} tint={PURPLE} on={l < hit + 2 || l > 140} />
        <Barrier f={l} start={18} cx={540} cy={1240} hits={[hit, 96]} fadeAt={150} />
        <Ring f={l} start={16} cx={560} cy={1880} r={500} color={GREEN} squash={0.25} dur={14} />
        <Burst f={l} start={16} dur={20} n={18} cx={560} cy={1870} kind="green" spread={420} size={12} dir={-Math.PI / 2} cone={2.4} seed="s2g" />
        <IcePlate f={l} start={108} cx={560} cy={1880} w={980} />
        <Sprite name="mage_staff_strike" x={540} y={mageY} h={1060} glow="rgba(93,255,176,0.6)" />
        <Ring f={l} start={hit} cx={540} cy={720} r={900} color="#eafff5" dur={16} w={60} />
        <Ring f={l} start={96} cx={540} cy={760} r={600} color={GREEN} dur={14} />
        <Burst f={l} start={hit} dur={22} n={26} cx={540} cy={720} kind="green" spread={700} size={14} seed="s2h" />
        <Burst f={l} start={hit} dur={22} n={14} cx={540} cy={700} kind="crystal" spread={600} size={22} seed="s2c" />
        <Burst f={l} start={108} dur={22} n={20} cx={560} cy={1820} kind="ice" spread={520} size={18} dir={-Math.PI / 2} cone={2.6} seed="s2i" />
      </Cam>
      <SpeedLines f={l} o={lin(l, hit, hit + 2, 0, 0.9) * lin(l, hit + 2, hit + 16, 1, 0)} cx={540} cy={720} inner={260} seed="s2s" />
      <Streaks f={l} angle={90} o={lin(l, 140, 150, 0, 0.6)} color="#dfe8ff" seed="s2v" speed={-180} />
      <Burst f={l} start={170} dur={22} n={26} cx={540} cy={1500} kind="ice" spread={900} size={30} toCam seed="s2t" />
    </AbsoluteFill>
  );
};

// 3. 跳躍斬り:騎士の後ろ姿が氷の台から上へ → のけぞる狼の首に金の斬撃、白フラッシュ、黒い結晶片
const S3: React.FC<{ l: number }> = ({ l }) => {
  const hit = 62;
  const knight = (ff: number): SP => ({
    name: "knight_back_leap",
    x: lin(ff, 0, hit, 420, 520) + lin(ff, hit, hit + 20, 0, 160, out3),
    y: lin(ff, 0, 40, 2400, 1080, out3) + lin(ff, 40, hit, 0, -120) + lin(ff, hit, hit + 26, 0, -1500, in3),
    h: kh("knight_back_leap", 470),
    r: lin(ff, 40, hit, 0, -10) + lin(ff, hit, hit + 20, 0, -18),
    blur: ff < 30 || ff > hit + 6 ? "v" : "",
    glow: "rgba(255,211,106,0.55)",
  });
  const wolf = (ff: number): SP => ({
    name: "wolf_recoil",
    x: lin(ff, 24, 46, 1400, 640, out3) + lin(ff, hit, hit + 18, 0, 70, out3) + lin(ff, hit + 18, 192, 0, -110),
    y: 900 + lin(ff, hit, hit + 18, 0, -140, out3),
    h: 1250 + lin(ff, hit + 18, 192, 0, 120),
    r: lin(ff, hit, hit + 18, 0, 14, out3) + Math.sin(ff * 0.9) * (ff > hit ? lin(ff, hit, hit + 40, 3, 0) : 0),
    glow: "rgba(150,60,255,0.6)",
    blur: ff < 40 ? "h" : "",
  });
  // 首のあたり(wolf_recoil の切り抜きで 0.778, 0.239)
  const wp = wolf(hit);
  const ww = (wp.h * SIZES.wolf_recoil[0]) / SIZES.wolf_recoil[1];
  const nx = wp.x - ww / 2 + ww * 0.778;
  const ny = wp.y - wp.h / 2 + wp.h * 0.239;
  return (
    <AbsoluteFill>
      <Cam s={1.12 + lin(l, hit, hit + 5, 0.08, 0)} r={lin(l, 0, 192, 3, -2)}>
        <Bg name="bg_ruins_stone_floor" s={1.25} y={lin(l, 0, 70, -620, 380, io)} dark={0.32} />
        <Fog f={l + 120} o={0.25} color="200,210,215" />
        <IcePlate f={l} start={-30} cx={540} cy={1900} w={980} o={lin(l, 0, 30, 1, 0)} />
        <Ghosts f={l} fn={wolf} tint={PURPLE} on={l < 46 || (l > hit && l < hit + 18)} />
        <Ghosts f={l} fn={knight} tint={GOLD} on={l < 40 || l > hit} />
        <Slash f={l} start={hit - 3} d={`M ${nx - 520} ${ny + 360} Q ${nx - 40} ${ny + 60} ${nx + 360} ${ny - 340}`} w={46} />
        <Glow x={nx} y={ny} r={lin(l, hit, hit + 3, 80, 260) * lin(l, hit + 3, hit + 14, 1, 0.2)} color={GOLD} o={l >= hit ? lin(l, hit + 6, hit + 18, 1, 0) : 0} />
        <Burst f={l} start={hit} dur={34} n={34} cx={nx} cy={ny} kind="crystal" spread={900} size={30} gravity={500} seed="s3c" />
        <Burst f={l} start={hit} dur={22} n={16} cx={nx} cy={ny} kind="gold" spread={600} size={10} seed="s3g" />
        <Ring f={l} start={hit} cx={nx} cy={ny} r={700} color={GOLD} dur={14} />
      </Cam>
      <Streaks f={l} angle={90} o={lin(l, 0, 6, 0, 0.8) * lin(l, 36, 48, 1, 0)} color="#e6f7ff" seed="s3v" speed={-220} />
      <SpeedLines f={l} o={lin(l, hit, hit + 2, 0, 1) * lin(l, hit + 4, hit + 20, 1, 0)} cx={nx} cy={ny} inner={240} color={GOLD_HOT} seed="s3s" />
      {/* 結晶の破片がゆっくり漂う */}
      <Burst f={l} start={100} dur={80} n={20} cx={640} cy={600} kind="crystal" spread={700} size={20} gravity={300} seed="s3d" />
      <Burst f={l} start={172} dur={22} n={30} cx={600} cy={800} kind="crystal" spread={900} size={34} toCam seed="s3t" />
    </AbsoluteFill>
  );
};

// 4. 並走連撃:斜め構図。走る狼と横斬りの騎士が並んで高速移動。金の三日月×3、氷の道、結晶の破片
const S4: React.FC<{ l: number }> = ({ l }) => {
  const hits = [34, 84, 134];
  const lunge = (ff: number) => hits.reduce((a, h) => a + (ff >= h - 4 && ff < h + 14 ? Math.sin(((ff - h + 4) / 18) * Math.PI) * 90 : 0), 0);
  const knight = (ff: number): SP => ({
    name: "knight_diagonal_slash", x: 400 + lunge(ff) + Math.sin(ff * 0.21) * 20, y: 1260 + Math.abs(Math.sin(ff * 0.42)) * -24,
    h: kh("knight_diagonal_slash", 360), glow: "rgba(255,211,106,0.5)",
  });
  const wolf = (ff: number): SP => {
    const hitK = hits.reduce((a, h) => a + (ff >= h && ff < h + 10 ? (1 - (ff - h) / 10) * 40 : 0), 0);
    return { name: "wolf_run_side", x: 650 + hitK + Math.sin(ff * 0.17) * 30, y: 700 + Math.abs(Math.sin(ff * 0.5)) * -40 - hitK * 0.5, h: 600, r: hitK * 0.15, glow: "rgba(150,60,255,0.7)" };
  };
  const scroll = (l * 60) % (W * 1.6);
  return (
    <AbsoluteFill style={{ background: "#0a0c10" }}>
      <AbsoluteFill style={{ transform: `rotate(-20deg) scale(1.3) translateY(${lin(l, 0, 192, 40, -40)}px)`, transformOrigin: "50% 50%" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: (i - 1) * W * 1.6 - scroll + W * 0.8 - W * 0.8, top: 0, width: W * 1.6, height: H, transform: i === 1 ? "scaleX(-1)" : undefined }}>
            <Bg name="bg_forest_ruins" s={1.6} blur="h2" dark={0.38} />
          </div>
        ))}
        <Streaks f={l} angle={0} o={0.75} color="#e9f3ff" speed={160} seed="s4a" />
        {/* 氷の道 */}
        <AbsoluteFill>
          <div style={{ position: "absolute", left: -400, width: W + 800, top: 1840, height: 120, background: "linear-gradient(to bottom, rgba(220,250,255,0.85), rgba(140,220,255,0.35))",
            boxShadow: "0 0 40px #7fe3ff", borderTop: "4px solid #fff" }} />
          <Svg>
            {Array.from({ length: 16 }, (_, i) => {
              const x = W + 400 - ((i * 160 + l * 70) % (W + 800));
              return <line key={i} x1={x} y1={1850} x2={x - 90} y2={1950} stroke="#fff" strokeWidth={3} opacity={0.7} />;
            })}
          </Svg>
        </AbsoluteFill>
        <Burst f={l} start={0} dur={192} n={30} cx={-200} cy={1880} kind="ice" spread={1600} size={10} dir={0} cone={0.3} seed="s4i" />
        <Ghosts f={l} fn={wolf} tint={PURPLE} gap={2} />
        <Ghosts f={l} fn={knight} tint={GOLD} gap={2} />
        {hits.map((h, i) => (
          <React.Fragment key={h}>
            <Crescent f={l} start={h} x0={480} y0={1150} x1={680} y1={720} size={300} rot={-50 + i * 30} />
            <Burst f={l} start={h + 3} dur={26} n={22} cx={660} cy={700} kind="crystal" spread={700} size={24} gravity={400} seed={`s4c${i}`} />
            <Ring f={l} start={h + 3} cx={660} cy={700} r={420} color={GOLD} dur={10} w={26} />
          </React.Fragment>
        ))}
      </AbsoluteFill>
      <Glow x={540} y={960} r={900} color={PURPLE} o={lin(l, 168, 192, 0, 0.9)} />
      <Burst f={l} start={174} dur={20} n={26} cx={600} cy={760} kind="crystal" spread={900} size={34} toCam seed="s4t" />
    </AbsoluteFill>
  );
};

// 5. 変身・上昇:狼が紫の光に包まれ翼の狼へ → 雲の上へ上昇。緑の氷の階段を、紫のビームを避けながら騎士が駆け上がる
const S5: React.FC<{ l: number }> = ({ l }) => {
  const morph = 56;
  const sky = lin(l, 70, 100, 0, 1, io);
  const beams = [128, 158];
  // 騎士が段を上がる(i 段目に l = 104 + i*10 で乗る)。ビームの直前に横へ跳んでかわす
  const knight = (ff: number): SP => {
    const k = lin(ff, 100, 186, 0, STAIRS.length - 1);
    const i = Math.floor(k);
    const a = STAIRS[Math.min(i, STAIRS.length - 1)];
    const b = STAIRS[Math.min(i + 1, STAIRS.length - 1)];
    const t = k - i;
    const hop = Math.sin(t * Math.PI) * 90;
    const dodge = beams.reduce((s, bm) => s + (ff > bm - 6 && ff < bm + 10 ? Math.sin(((ff - bm + 6) / 16) * Math.PI) * 220 : 0), 0);
    return { name: "knight_back_leap", x: a.x + (b.x - a.x) * t + dodge + 40, y: a.y + (b.y - a.y) * t - hop - 280, h: kh("knight_back_leap", 300), r: dodge * 0.04, o: lin(ff, 98, 104, 0, 1), blur: dodge > 30 ? "h" : "", glow: "rgba(255,211,106,0.6)" };
  };
  const bw = { x: 600, y: lin(l, 104, 124, -500, 330, out3) + Math.sin(l * 0.1) * 16 };
  const bwh = 860;
  const mouth = { x: bw.x, y: bw.y - bwh / 2 + bwh * 0.22 };
  return (
    <AbsoluteFill style={{ background: "#07050c" }}>
      <Cam s={1.12} r={lin(l, 0, 60, -2, 2)}>
        <Bg name="bg_ruins_stone_floor" dark={lin(l, 0, 50, 0.35, 0.7)} y={lin(l, 60, 100, 0, 1400, in3)} o={1 - sky} filter="hue-rotate(20deg)" />
        <Bg name="bg_sky_above_clouds" y={lin(l, 70, 192, -420, 0, out3)} o={sky} s={1.45} />
      </Cam>
      <Pillars f={l} o={lin(l, 6, 40, 0, 0.9) * lin(l, morph + 4, morph + 20, 1, 0)} color={PURPLE} cx={540} />
      <Glow x={540} y={980} r={lin(l, 0, morph, 200, 800)} color={PURPLE} o={lin(l, 0, 30, 0, 1) * lin(l, morph, morph + 20, 1, 0)} />
      <Sprite name="wolf_recoil_alt" x={540 + Math.sin(l * 2.1) * lin(l, 20, morph, 0, 12)} y={1000} h={1350}
        o={lin(l, morph - 2, morph + 2, 1, 0)} filter={`brightness(${lin(l, 20, morph, 1, 0.3)}) drop-shadow(0 0 ${lin(l, 0, morph, 10, 60)}px ${PURPLE})`} />
      <Ghosts f={l} tint={PURPLE} on={l > morph + 6} fn={(ff) => ({
        name: "wingwolf_rise", x: 540, y: 980 - lin(ff, morph + 6, 100, 0, 2400, in3), h: 1500 * lin(ff, morph - 2, morph + 6, 0.8, 1, out3),
        o: lin(ff, morph - 2, morph + 2, 0, 1), blur: ff > morph + 8 ? "v2" : "", glow: "rgba(180,92,255,0.8)",
      })} />
      <Burst f={l} start={morph} dur={30} n={36} cx={540} cy={900} kind="crystal" spread={1000} size={26} seed="s5m" />
      <Ring f={l} start={morph} cx={540} cy={950} r={1000} color={PURPLE} dur={16} w={60} />
      {l === morph && <AbsoluteFill style={{ background: "rgba(220,170,255,0.75)" }} />}
      <Streaks f={l} angle={90} o={lin(l, morph + 6, morph + 14, 0, 0.8) * lin(l, 92, 104, 1, 0)} color="#efe0ff" speed={-240} seed="s5v" />
      {/* 空:氷の階段・ビーム・駆け上がる騎士 */}
      <IceStairs f={l} start={96} gap={8} broken={{ 2: 132, 5: 162 }} />
      <AbsoluteFill style={{ opacity: lin(l, 100, 112, 0, 1) }}>
        <Sprite name="wingwolf_breath_beam" x={bw.x} y={bw.y} h={bwh} glow="rgba(180,92,255,0.8)" />
      </AbsoluteFill>
      <Ghosts f={l} fn={knight} tint={GOLD} />
      {beams.map((b, i) => {
        const tgt = STAIRS[i === 0 ? 2 : 5];
        return (
          <React.Fragment key={b}>
            <Glow x={mouth.x} y={mouth.y} r={lin(l, b - 10, b, 30, 160)} color={PURPLE} o={lin(l, b - 10, b - 2, 0, 1) * lin(l, b + 6, b + 12, 1, 0)} />
            <Beam f={l} start={b} x0={mouth.x} y0={mouth.y} x1={tgt.x + 60} y1={tgt.y + 40} />
            <Burst f={l} start={b + 3} dur={22} n={22} cx={tgt.x + 60} cy={tgt.y} kind="green" spread={500} size={20} seed={`s5b${i}`} />
            <Burst f={l} start={b + 3} dur={22} n={12} cx={tgt.x + 60} cy={tgt.y} kind="crystal" spread={420} size={16} seed={`s5p${i}`} />
          </React.Fragment>
        );
      })}
      <Glow x={540} y={960} r={1100} color={GREEN} o={lin(l, 178, 192, 0, 0.95)} />
    </AbsoluteFill>
  );
};

// 6. 拘束:雲の上。杖を掲げる魔法使い、回る魔法陣、緑の鎖がもがく翼の狼を縛る。騎士の剣に金の光が溜まる
const S6: React.FC<{ l: number }> = ({ l }) => {
  const struggle = l > 30 ? Math.sin(l * 0.9) * lin(l, 30, 90, 6, 2.5) : 0;
  const wolf: SP = { name: "wingwolf_slashed", x: 540 + struggle * 4, y: 700 + Math.sin(l * 0.6) * 10, h: 1150, r: struggle, glow: "rgba(180,92,255,0.8)" };
  const ww = (wolf.h * SIZES.wingwolf_slashed[0]) / SIZES.wingwolf_slashed[1];
  const body = [[0.36, 0.42], [0.62, 0.4], [0.45, 0.6], [0.6, 0.62], [0.3, 0.75], [0.55, 0.85]].map(([u, v]) => [wolf.x - ww / 2 + ww * u, wolf.y - wolf.h / 2 + wolf.h * v]);
  const rim = [200, 330, 160, 20, 220, 340].map((deg, i) => [540 + Math.cos((deg * Math.PI) / 180) * 520 * (i % 2 ? 1 : 0.98), 760 + Math.sin((deg * Math.PI) / 180) * 520]);
  const kx = 770;
  const ky = 1400;
  const khh = kh("knight_overhead_swing", 400);
  const kw = (khh * SIZES.knight_overhead_swing[0]) / SIZES.knight_overhead_swing[1];
  const tip = { x: kx - kw / 2 + kw * 0.124, y: ky - khh / 2 + khh * 0.04 };
  const charge = lin(l, 60, 186, 0, 1);
  return (
    <AbsoluteFill>
      <Cam s={lin(l, 0, 192, 1.05, 1.16) + lin(l, 150, 192, 0, 0.1, in3)} r={lin(l, 0, 192, -3, 3)} x={lin(l, 150, 192, 0, -120, in3)} y={lin(l, 150, 192, 0, -160, in3)}>
        <Bg name="bg_sky_above_clouds" s={1.2} y={lin(l, 0, 192, 40, -40)} dark={lin(l, 0, 40, 0, 0.3)} filter="saturate(0.85)" />
        <MagicCircle f={l} start={4} cx={540} cy={760} r={520} />
        <Sprite {...wolf} />
        <Svg style={{ filter: `drop-shadow(0 0 12px ${GREEN})` }}>
          {rim.map(([x0, y0], i) => (
            <Chain key={i} x0={x0} y0={y0} x1={body[i][0]} y1={body[i][1]} p={lin(l, 30 + i * 7, 40 + i * 7, 0, 1, out3)} sway={Math.sin(l * 0.5 + i) * lin(l, 40 + i * 7, 120, 30, 6)} />
          ))}
        </Svg>
        <Sprite name="mage_staff_raise" x={lin(l, 0, 18, -300, 270, out3)} y={1400} h={920} glow="rgba(93,255,176,0.7)" />
        <Sprite name="knight_overhead_swing" x={lin(l, 8, 28, 1400, kx, out3)} y={ky} h={khh} glow={`rgba(255,211,106,${0.4 + charge * 0.6})`}
          filter={`brightness(${1 + charge * 0.25})`} />
        <Converge f={l} start={64} end={186} x={tip.x} y={tip.y} color={GOLD} />
        <Glow x={tip.x} y={tip.y} r={60 + charge * 320 + Math.sin(l * 0.8) * 20 * charge} color={GOLD} o={lin(l, 60, 80, 0, 1)} />
      </Cam>
      <Burst f={l} start={20} dur={60} n={24} cx={250} cy={900} kind="ice" spread={700} size={10} dir={-Math.PI / 2} cone={1.6} seed="s6i" />
      <Glow x={540} y={960} r={1200} color={GOLD} o={lin(l, 182, 192, 0, 1)} />
    </AbsoluteFill>
  );
};

// 7. 決着:騎士の目で0.5秒止める → 雲の切れ間へ急降下 → 縦一閃、白フラッシュ、金の同心円、翼の狼が青い氷の粒になって消える
const DIS = meta.dissolve as number[][];
const S7: React.FC<{ l: number }> = ({ l }) => {
  const hit = 58;
  const wolf = { x: 540, y: 1260, h: 900 };
  const wwid = (wolf.h * SIZES.wingwolf_slashed[0]) / SIZES.wingwolf_slashed[1];
  const knight = (ff: number): SP => ({
    name: "knight_dive_thrust", x: 540 + lin(ff, 12, hit, -60, 0), y: lin(ff, 12, hit, -900, 760, in3) + lin(ff, hit, hit + 30, 0, 80, out3),
    o: lin(ff, hit + 8, hit + 30, 1, 0),
    h: kh("knight_dive_thrust", 600), r: lin(ff, 12, hit, -8, 0), blur: ff < hit ? "v2" : "", glow: "rgba(255,211,106,0.7)",
  });
  if (l < 12) {
    // 0.5秒止める(動かさない)
    const n = "knight_eyes_closeup";
    const hh = (W * 1.15 * SIZES[n][1]) / SIZES[n][0];
    return (
      <AbsoluteFill style={{ background: "#020203" }}>
        <Img src={src(n)} style={{ position: "absolute", left: -W * 0.075, width: W * 1.15, top: 960 - hh / 2, filter: "contrast(1.1) saturate(1.1)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,211,106,0) 40%, rgba(255,211,106,0.25))" }} />
      </AbsoluteFill>
    );
  }
  const dis = lin(l, hit + 2, hit + 50, 0, 1);
  return (
    <AbsoluteFill style={{ background: "#dfeef7" }}>
      <Cam s={lin(l, 12, hit, 1.0, 1.45, in3) + lin(l, hit, 192, 0, -0.2, out3)} r={lin(l, 12, hit, -4, 0)}>
        <Bg name="bg_cloud_hole_view" />
      </Cam>
      <Streaks f={l} angle={90} o={lin(l, 12, 16, 0, 0.9) * lin(l, hit - 2, hit + 2, 1, 0)} color="#ffffff" speed={-300} seed="s7v" />
      <SpeedLines f={l} cx={540} cy={1200} o={lin(l, 30, 40, 0, 0.8) * lin(l, hit, hit + 14, 1, 0)} color={GOLD_HOT} seed="s7s" />
      {/* 縛られた翼の狼(鎖の残り) */}
      <AbsoluteFill style={{ opacity: 1 - dis }}>
        <Svg style={{ filter: `drop-shadow(0 0 10px ${GREEN})` }}>
          {[[-1, -0.3], [1, -0.2], [-1, 0.3], [1, 0.35]].map(([sx, sy], i) => (
            <Chain key={i} x0={540 + sx * 700} y0={1260 + sy * 900} x1={540 + sx * 120} y1={1260 + sy * 200} p={1} sway={8} />
          ))}
        </Svg>
        <Sprite name="wingwolf_slashed" x={wolf.x + (l < hit ? Math.sin(l) * 6 : 0)} y={wolf.y} h={wolf.h} glow="rgba(180,92,255,0.8)"
          filter={`brightness(${1 + dis * 2}) hue-rotate(${dis * -60}deg)`} />
      </AbsoluteFill>
      {/* 氷の粒になって消える */}
      {l >= hit && (
        <Svg style={{ filter: "drop-shadow(0 0 8px #7fd8ff)" }}>
          {DIS.map(([u, v], i) => {
            const delay = (1 - v) * 20 + rnd(`dd${i}`) * 10;
            const t = Math.max(0, l - hit - delay);
            if (t <= 0 && dis < 0.05) return null;
            const x0 = wolf.x - wwid / 2 + wwid * u;
            const y0 = wolf.y - wolf.h / 2 + wolf.h * v;
            const a = rnd(`da${i}`) * Math.PI * 2;
            const sp = 2 + rnd(`ds${i}`) * 7;
            const x = x0 + Math.cos(a) * sp * t + Math.sin(t * 0.1 + i) * 10;
            const y = y0 + Math.sin(a) * sp * t - t * 3;
            const s = 3 + rnd(`dz${i}`) * 6;
            const o = lin(t, 0, 4, 0.2, 1) * lin(t, 60, 120, 1, 0);
            return <polygon key={i} points={`${x},${y - s} ${x + s * 0.6},${y} ${x},${y + s} ${x - s * 0.6},${y}`} fill={i % 3 ? "#e6f7ff" : "#7fd0ff"} opacity={o} />;
          })}
        </Svg>
      )}
      {l < hit + 32 && <Ghosts f={l} fn={knight} tint={GOLD} on={l < hit + 2} />}
      {/* 縦一閃 */}
      {l >= hit - 1 && l < hit + 12 && (
        <AbsoluteFill style={{ filter: `drop-shadow(0 0 30px ${GOLD})` }}>
          <div style={{ position: "absolute", left: 540 - lin(l, hit - 1, hit + 12, 46, 2) / 2, top: 0, width: lin(l, hit - 1, hit + 12, 46, 2), height: H,
            background: `linear-gradient(to right, ${GOLD}, ${GOLD_HOT}, ${GOLD})`, opacity: lin(l, hit + 4, hit + 12, 1, 0) }} />
        </AbsoluteFill>
      )}
      {[0, 4, 8, 12].map((d) => <Ring key={d} f={l} start={hit + d} cx={540} cy={1200} r={1300} color={GOLD} dur={20} w={30} />)}
      <Burst f={l} start={hit} dur={30} n={30} cx={540} cy={1200} kind="ice" spread={1000} size={16} seed="s7i" />
      <Snow f={l} o={lin(l, 120, 192, 0, 0.9)} seed="s7n" />
      <Glow x={540} y={900} r={1200} color="#e9fbff" o={lin(l, 176, 192, 0, 0.9)} />
    </AbsoluteFill>
  );
};

// 8. 余韻:粒が雪のように降る。片ひざで剣を納める騎士と、降りてくる魔法使い。光の差す森の全景へ引いてフェードアウト
const S8: React.FC<{ l: number }> = ({ l }) => {
  const pull = lin(l, 0, 192, 0, 1, io);
  const chars = lin(l, 110, 160, 1, 0);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Cam s={1.55 - pull * 0.5} y={lin(l, 0, 192, 200, 0)}>
        <Bg name="bg_aerial_forest_light" />
      </Cam>
      <Cam s={1.25 - pull * 0.5} y={lin(l, 0, 192, 60, 220)}>
        <AbsoluteFill style={{ opacity: chars }}>
          <Glow x={540} y={1300} r={700} color={GOLD} o={0.25} />
          <Sprite name="knight_kneel_sword" x={700} y={1360} h={kh("knight_kneel_sword", 560)} glow="rgba(255,211,106,0.55)" />
          <Sprite name="mage_float_idle" x={320} y={lin(l, 0, 110, 520, 1180, out3) + Math.sin(l * 0.08) * 12} h={1050} glow="rgba(93,255,176,0.55)" />
        </AbsoluteFill>
      </Cam>
      <Snow f={l + 192} o={lin(l, 0, 20, 0.9, 1)} n={140} seed="s7n" />
      <Glow x={540} y={960} r={1200} color="#e9fbff" o={lin(l, 0, 16, 0.9, 0)} />
      <AbsoluteFill style={{ background: "#000", opacity: lin(l, 150, 190, 0, 1, io) }} />
    </AbsoluteFill>
  );
};

const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8];

export const BattleMV: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame();
  const i = Math.min(7, Math.floor(f / SCENE));
  const Scene = SCENES[i];
  const sh = shakeAt(f);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="mb-h" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="14 0" /></filter>
          <filter id="mb-h2" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="26 0" /></filter>
          <filter id="mb-v" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="0 14" /></filter>
          <filter id="mb-v2" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="0 26" /></filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg) scale(1.05)` }}>
        <Scene l={f - i * SCENE} />
      </AbsoluteFill>
      {FLASHES.includes(f) && <AbsoluteFill style={{ background: "#fff" }} />}
      {withAudio && <Audio src={staticFile("battle-mv/sfx_mix.wav")} />}
    </AbsoluteFill>
  );
};
