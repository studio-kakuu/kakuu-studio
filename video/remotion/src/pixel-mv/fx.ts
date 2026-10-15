// 作品006 v2:エフェクトのドット絵(斬撃・集中線・破片・バリア・ビーム・魔法陣・鎖・氷)。
// 半透明はすべて間引き(ディザ)で表す。色:精霊術師=緑と氷/騎士=金/狼=紫と黒
import { Buf, dither, hash, hex } from "./px";

export const COL = {
  gold: hex("#ffd040"), goldHi: hex("#fff6c8"), goldD: hex("#c08010"), white: hex("#ffffff"),
  green: hex("#5cf0a0"), greenHi: hex("#d8fff0"), greenD: hex("#1f9a5c"),
  ice: hex("#bff4ff"), iceHi: hex("#ffffff"), iceD: hex("#5ab8e0"), iceG: hex("#8ef0c8"),
  purple: hex("#a050ff"), purpleHi: hex("#e8c8ff"), purpleD: hex("#4a1688"), black: hex("#0c0812"),
  stone: hex("#6a7670"), stoneD: hex("#3c4642"), red: hex("#ff3040"),
};

const plot = (b: Buf, x: number, y: number, c: number, a = 1) => {
  if (a >= 1 || dither(Math.floor(x), Math.floor(y), a)) b.set(x, y, c);
};
export const glow = (b: Buf, cx: number, cy: number, r: number, c: number, a = 1) => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d <= 1) plot(b, x, y, c, a * (1 - d) * 1.4);
    }
};
export const disc = (b: Buf, cx: number, cy: number, r: number, c: number, a = 1) => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) plot(b, x, y, c, a);
};
export const line = (b: Buf, x0: number, y0: number, x1: number, y1: number, c: number, t = 1, a = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    if (t <= 1) plot(b, x, y, c, a);
    else disc(b, x, y, t / 2, c, a);
  }
};
export const ring = (b: Buf, cx: number, cy: number, r: number, c: number, t = 1, a = 1, squash = 1) => {
  const n = Math.max(12, Math.ceil(r * 7));
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r * squash;
    if (t <= 1) plot(b, x, y, c, a);
    else disc(b, x, y, t / 2, c, a);
  }
};

/**
 * 剣の軌跡(弧)。age はコマ数。2コマで振り抜き、12コマ(0.5秒)で消える。
 * a0→a1 は角度(度、右=0、下=90)
 */
export const slashArc = (b: Buf, cx: number, cy: number, r: number, a0: number, a1: number, age: number, w = 5) => {
  if (age < 0 || age >= 12) return;
  const draw = Math.min(1, (age + 1) / 3);
  const fade = age < 3 ? 1 : 1 - (age - 3) / 9;
  const n = Math.ceil(Math.abs(a1 - a0) * r * 0.05) + 8;
  for (let i = 0; i <= n * draw; i++) {
    const k = i / n;
    const a = ((a0 + (a1 - a0) * k) * Math.PI) / 180;
    const ww = w * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.4 + 0.6 * fade);
    for (let j = -ww; j <= ww; j += 0.5) {
      const rr = r + j;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const core = Math.abs(j) < ww * 0.35;
      plot(b, x, y, core ? COL.goldHi : Math.abs(j) < ww * 0.75 ? COL.gold : COL.goldD, fade * (core ? 1 : 0.9));
    }
  }
};
/** まっすぐな斬撃(縦一閃など) */
export const slashLine = (b: Buf, x0: number, y0: number, x1: number, y1: number, age: number, w = 6) => {
  if (age < 0 || age >= 12) return;
  const draw = Math.min(1, (age + 1) / 2);
  const fade = age < 2 ? 1 : 1 - (age - 2) / 10;
  const ww = w * (0.3 + 0.7 * fade);
  const xe = x0 + (x1 - x0) * draw;
  const ye = y0 + (y1 - y0) * draw;
  line(b, x0, y0, xe, ye, COL.goldD, ww + 2, fade * 0.7);
  line(b, x0, y0, xe, ye, COL.gold, ww, fade);
  line(b, x0, y0, xe, ye, COL.goldHi, Math.max(1, ww * 0.4), 1);
};

/** 集中線(画面の外側から中心へ) */
export const speedLines = (b: Buf, cx: number, cy: number, f: number, c: number, a = 1, inner = 60) => {
  const k = Math.floor(f / 2);
  for (let i = 0; i < 46; i++) {
    const ang = hash(i, k, 1) * Math.PI * 2;
    const r0 = inner + hash(i, k, 2) * 50;
    const r1 = 260;
    const t = 1 + (hash(i, k, 3) > 0.7 ? 1 : 0);
    line(b, cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, c, t, a * (0.5 + hash(i, k, 4) * 0.5));
  }
};
/** 流線(横・縦にスピードを出す) */
export const streaks = (b: Buf, f: number, dirX: number, dirY: number, c: number, a = 0.8, n = 30, speed = 12) => {
  for (let i = 0; i < n; i++) {
    const len = 10 + hash(i, 5) * 30;
    if (dirY === 0) {
      const y = Math.floor(hash(i, 1) * b.h);
      const x = (((hash(i, 2) * 400 - f * speed * dirX * (0.6 + hash(i, 3))) % 400) + 400) % 400 - 60;
      line(b, x, y, x + len, y, c, 1, a);
    } else {
      const x = Math.floor(hash(i, 1) * b.w);
      const y = (((hash(i, 2) * 560 - f * speed * dirY * (0.6 + hash(i, 3))) % 560) + 560) % 560 - 80;
      line(b, x, y, x, y + len, c, 1, a);
    }
  }
};

export type ShardKind = "stone" | "crystal" | "ice" | "gold" | "green" | "spark";
const SHARD: Record<ShardKind, number[]> = {
  stone: [COL.stone, COL.stoneD, hex("#8a968e")],
  crystal: [COL.purple, COL.black, COL.purpleHi, COL.purpleD],
  ice: [COL.ice, COL.iceHi, COL.iceD],
  gold: [COL.gold, COL.goldHi],
  green: [COL.green, COL.greenHi, COL.iceG],
  spark: [COL.white, COL.goldHi],
};
/**
 * 破片の飛び散り。age はコマ数、life で消える。toCam=true は大きくなりながら画面の外へ(場面のつなぎ)
 */
export const burst = (b: Buf, cx: number, cy: number, age: number, kind: ShardKind, o: { n?: number; speed?: number; life?: number; seed?: number; dir?: number; cone?: number; grav?: number; size?: number; toCam?: boolean } = {}) => {
  const { n = 16, speed = 3, life = 20, seed = 1, dir, cone = Math.PI * 2, grav = 0.12, size = 2, toCam = false } = o;
  if (age < 0 || age > life) return;
  const cols = SHARD[kind];
  for (let i = 0; i < n; i++) {
    const ang = dir === undefined ? hash(seed, i, 1) * Math.PI * 2 : dir + (hash(seed, i, 1) - 0.5) * cone;
    const v = speed * (0.4 + hash(seed, i, 2) * 0.9);
    const t = toCam ? age * (1 + age * 0.08) : age;
    const x = cx + Math.cos(ang) * v * t;
    const y = cy + Math.sin(ang) * v * t + grav * age * age;
    const s = toCam ? size * (1 + age * 0.35) : size * (0.6 + hash(seed, i, 3) * 0.8) * (1 - (age / life) * 0.5);
    const a = toCam ? 1 : age > life * 0.6 ? 1 - (age - life * 0.6) / (life * 0.4) : 1;
    const c = cols[i % cols.length];
    if (kind === "spark") plot(b, x, y, c, a);
    else if (kind === "crystal" || kind === "ice") {
      // ひし形
      for (let j = -s; j <= s; j++) {
        const w = s - Math.abs(j);
        for (let q = -w * 0.5; q <= w * 0.5; q++) plot(b, x + q, y + j, j < 0 && q < 0 ? cols[2] ?? c : c, a);
      }
    } else for (let j = 0; j < s; j++) for (let q = 0; q < s; q++) plot(b, x + q, y + j, c, a);
  }
};

/** 六角形(とがった方が上) */
export const hexagon = (b: Buf, cx: number, cy: number, r: number, c: number, t = 1, a = 1) => {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const ang = (Math.PI / 3) * i - Math.PI / 2;
    return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
  });
  for (let i = 0; i < 6; i++) line(b, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, t, a);
};
/** 緑の六角形バリア(5層)。p=出る具合 0〜1、hit=当たってからのコマ(揺れ) */
export const barrier = (b: Buf, cx: number, cy: number, p: number, f: number, hit = -1, a = 1) => {
  for (let i = 0; i < 5; i++) {
    const pi = Math.max(0, Math.min(1, p * 5 - i));
    if (pi <= 0) continue;
    const wob = hit >= 0 && hit < 14 ? Math.sin(hit * 1.4 + i) * (14 - hit) * 0.18 : 0;
    const r = (14 + i * 6) * pi + wob;
    hexagon(b, cx, cy, r, i === 4 ? COL.greenHi : COL.green, i === 4 ? 2 : 1, a * (0.95 - i * 0.08));
    // 内側のハニカム模様(いちばん外の層だけ)
    if (i === 4 && pi >= 1) {
      for (let k = 0; k < 18; k++) {
        const ang = hash(k, 7) * Math.PI * 2;
        const rr = hash(k, 8) * r * 0.8;
        hexagon(b, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 3, COL.green, 1, a * 0.35 * (0.6 + 0.4 * Math.sin(f * 0.3 + k)));
      }
    }
  }
};

/** 氷のブロック(緑がかった半透明)。足場・階段 */
export const iceBlock = (b: Buf, x: number, y: number, w: number, h: number, a = 1, green = true) => {
  const body = green ? COL.iceG : COL.ice;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const edge = j === 0 || i === 0 || i === w - 1 || j === h - 1;
      plot(b, x + i, y + j, j === 0 ? COL.iceHi : edge ? COL.iceD : body, edge ? a : a * 0.6);
    }
  line(b, x + 2, y + 2, x + Math.min(6, w - 2), y + 2, COL.iceHi, 1, a);
  // 下にとがった氷柱
  for (let i = 2; i < w - 2; i += 5) line(b, x + i, y + h, x + i + 1, y + h + 3 + (i % 3), COL.iceD, 1, a);
};

/** 紫のビーム */
export const beam = (b: Buf, x0: number, y0: number, x1: number, y1: number, age: number, w = 6) => {
  if (age < 0 || age > 14) return;
  const p = Math.min(1, (age + 1) / 3);
  const a = age < 8 ? 1 : 1 - (age - 8) / 6;
  const xe = x0 + (x1 - x0) * p;
  const ye = y0 + (y1 - y0) * p;
  const ww = w * (1 + 0.2 * Math.sin(age * 2));
  line(b, x0, y0, xe, ye, COL.purpleD, ww + 4, a * 0.6);
  line(b, x0, y0, xe, ye, COL.purple, ww, a);
  line(b, x0, y0, xe, ye, COL.purpleHi, ww * 0.4, a);
  glow(b, x0, y0, ww * 1.6, COL.purpleHi, a);
};

/** 緑の魔法陣(回転) */
export const magicCircle = (b: Buf, cx: number, cy: number, r: number, rot: number, p = 1, a = 1) => {
  const n = Math.ceil(r * 7 * p);
  for (let i = 0; i < n; i++) {
    const ang = (i / Math.ceil(r * 7)) * Math.PI * 2 + rot;
    plot(b, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.55, COL.greenHi, a);
    plot(b, cx + Math.cos(ang) * (r - 3), cy + Math.sin(ang) * (r - 3) * 0.55, COL.green, a);
  }
  if (p < 1) return;
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2 + rot;
    const l = i % 3 === 0 ? 4 : 2;
    line(b, cx + Math.cos(ang) * (r - 3), cy + Math.sin(ang) * (r - 3) * 0.55, cx + Math.cos(ang) * (r - 3 - l), cy + Math.sin(ang) * (r - 3 - l) * 0.55, COL.green, 1, a);
  }
  // 内側の六芒星(逆回り)
  for (const off of [0, Math.PI]) {
    const pts = [0, 1, 2, 3].map((k) => {
      const ang = -rot * 1.5 + off + (k * Math.PI * 2) / 3 - Math.PI / 2;
      return [cx + Math.cos(ang) * r * 0.68, cy + Math.sin(ang) * r * 0.68 * 0.55];
    });
    for (let k = 0; k < 3; k++) line(b, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], COL.green, 1, a);
  }
  ring(b, cx, cy, r * 0.34, COL.greenHi, 1, a, 0.55);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 - rot * 0.7;
    const x = cx + Math.cos(ang) * r * 0.84;
    const y = cy + Math.sin(ang) * r * 0.84 * 0.55;
    plot(b, x, y - 1, COL.greenHi, a);
    plot(b, x - 1, y, COL.greenHi, a);
    plot(b, x + 1, y, COL.greenHi, a);
    plot(b, x, y + 1, COL.greenHi, a);
  }
};

/** 緑の鎖。p=伸びる具合 0〜1 */
export const chain = (b: Buf, x0: number, y0: number, x1: number, y1: number, p: number, sway = 0, a = 1) => {
  const len = Math.hypot(x1 - x0, y1 - y0) * p;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const n = Math.floor(len / 3);
  for (let i = 0; i < n; i++) {
    const d = i * 3;
    const bend = Math.sin((d / Math.max(1, len)) * Math.PI) * sway;
    const x = x0 + Math.cos(ang) * d - Math.sin(ang) * bend;
    const y = y0 + Math.sin(ang) * d + Math.cos(ang) * bend;
    if (i % 2 === 0) {
      ring(b, x, y, 1.6, COL.green, 1, a);
      plot(b, x - 1, y - 1, COL.greenHi, a);
    } else line(b, x - Math.cos(ang) * 1.5, y - Math.sin(ang) * 1.5, x + Math.cos(ang) * 1.5, y + Math.sin(ang) * 1.5, COL.greenHi, 1, a);
  }
};

/** 雪のように降る氷の粒 */
export const snow = (b: Buf, f: number, a: number, n = 70) => {
  for (let i = 0; i < n; i++) {
    const sp = 0.25 + hash(i, 1) * 0.5;
    const y = ((hash(i, 2) * 360 + f * sp) % 360) - 20;
    const x = hash(i, 3) * b.w + Math.sin(f * 0.04 + i) * 4;
    const big = hash(i, 4) > 0.75;
    plot(b, x, y, i % 3 ? COL.iceHi : COL.ice, a);
    if (big) {
      plot(b, x - 1, y, COL.ice, a);
      plot(b, x + 1, y, COL.ice, a);
      plot(b, x, y - 1, COL.ice, a);
      plot(b, x, y + 1, COL.ice, a);
    }
  }
};

/** 画面の色調を変える(暗く・色をかける)。k=0〜1 を間引きで */
export const veil = (b: Buf, c: number, k: number) => {
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (dither(x, y, k)) b.d[y * b.w + x] = c;
};
