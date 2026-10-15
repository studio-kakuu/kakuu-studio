// 作品006 v2:背景のドット絵(すべてコードで描く)。奥・中・手前の層に分け、動く速さを変えて奥行きを出す。
// 層は横につながる(左右の端がつながる)幅で作り、スクロールしても切れ目が出ないようにする。
import { Buf, dither, hex, rand } from "./px";

const C = (s: string) => hex(s);

/** 縦のグラデーションを間引き(ディザ)でつなぐ */
const gradient = (b: Buf, y0: number, y1: number, cols: string[]) => {
  const cs = cols.map(C);
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * (cs.length - 1);
    const i = Math.min(cs.length - 2, Math.floor(t));
    const k = t - i;
    for (let x = 0; x < b.w; x++) b.set(x, y, dither(x, y, k) ? cs[i + 1] : cs[i]);
  }
};
/** 横につながる位置で描く(x を幅で回す) */
const wrapSet = (b: Buf, x: number, y: number, c: number) => b.set(((Math.floor(x) % b.w) + b.w) % b.w, y, c);
const wrapDisc = (b: Buf, cx: number, cy: number, r: number, c: number, a = 1) => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r && (a >= 1 || dither(x, y, a))) wrapSet(b, x, y, c);
};
const wrapRect = (b: Buf, x: number, y: number, w: number, h: number, c: number) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) wrapSet(b, i, j, c);
};

export type Layer = { buf: Buf; speed: number; y: number };
const cache = new Map<string, Layer[]>();
const once = (k: string, make: () => Layer[]) => {
  if (!cache.has(k)) cache.set(k, make());
  return cache.get(k)!;
};

// ---------------- 1. 霧の森と遺跡 ----------------
export const forest = () =>
  once("forest", () => {
    const r = rand(11);
    const W = 360;
    // 空(夜明け前の青緑)
    const sky = new Buf(W, 320);
    gradient(sky, 0, 320, ["#0c1618", "#13262a", "#1d3a3c", "#2c5048"]);
    // 遠い木々(シルエット)
    const far = new Buf(W, 320);
    for (let i = 0; i < 26; i++) {
      const x = i * 14 + r() * 8;
      const w = 4 + r() * 3;
      wrapRect(far, Math.floor(x), 40, Math.floor(w), 200, C("#183230"));
      for (let k = 0; k < 6; k++) wrapDisc(far, x + (r() - 0.5) * 26, 30 + r() * 70, 10 + r() * 10, C(k % 2 ? "#1c3a36" : "#16302c"));
    }
    for (let y = 150; y < 240; y++) for (let x = 0; x < W; x++) if (dither(x, y, (y - 150) / 120)) far.set(x, y, C("#2f5450"));
    // 中景:遺跡のアーチ・柱・太い木
    const mid = new Buf(W, 320);
    const stone = C("#6a7670");
    const stoneD = C("#46524c");
    const stoneL = C("#8a968e");
    const moss = C("#3e6a38");
    const mossL = C("#5a8c46");
    const trunk = C("#2e3c30");
    const trunkL = C("#46584a");
    const arch = (x: number, base: number, w: number, h: number) => {
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const inner = i > 4 && i < w - 5 && j > 10 && !(j < 10 + (w - 10) / 2 && Math.hypot(i - w / 2, j - 10 - (w - 10) / 2) > (w - 10) / 2);
          if (inner) continue;
          const brick = ((j >> 2) + ((i + ((j >> 2) % 2) * 3) >> 3)) % 2;
          wrapSet(mid, x + i, base - h + j, (i + j) % 7 === 0 ? stoneD : brick ? stone : C("#62706a"));
          if (j % 4 === 0) wrapSet(mid, x + i, base - h + j, stoneD);
        }
      for (let i = 0; i < w; i++) if (r() < 0.7) wrapRect(mid, x + i, base - h - 1, 1, 1 + Math.floor(r() * 4), r() < 0.5 ? moss : mossL);
      for (let k = 0; k < 4; k++) {
        const vx = x + Math.floor(r() * w);
        for (let j = 0; j < 6 + r() * 14; j++) wrapSet(mid, vx + Math.round(Math.sin(j * 0.6)), base - h + j, moss);
      }
    };
    const pillar = (x: number, base: number, h: number) => {
      wrapRect(mid, x, base - h, 9, h, stone);
      wrapRect(mid, x, base - h, 2, h, stoneL);
      wrapRect(mid, x + 7, base - h, 2, h, stoneD);
      for (let j = 0; j < h; j += 5) wrapRect(mid, x, base - h + j, 9, 1, stoneD);
      wrapRect(mid, x - 1, base - h, 11, 2, moss);
    };
    const tree = (x: number, base: number, w: number) => {
      for (let y = 0; y < base; y++) {
        const sw = w + (y > base - 18 ? (y - (base - 18)) * 0.6 : 0);
        wrapRect(mid, Math.floor(x - sw / 2), y, Math.ceil(sw), 1, trunk);
        wrapSet(mid, Math.floor(x - sw / 2) + 1, y, trunkL);
        if (y % 9 === 0) wrapSet(mid, Math.floor(x), y, C("#243028"));
      }
      for (let k = 0; k < 4; k++) {
        const ry = 60 + r() * 120;
        for (let j = 0; j < 30; j++) wrapSet(mid, x - w / 2 - 1 + Math.round(Math.sin(j * 0.5)), ry + j, k % 2 ? moss : mossL);
      }
    };
    tree(40, 250, 12);
    arch(70, 246, 44, 70);
    pillar(130, 248, 50);
    tree(178, 250, 16);
    pillar(220, 248, 34);
    arch(246, 246, 36, 56);
    tree(318, 250, 10);
    // 手前:地面(石畳と苔と草)
    const near = new Buf(W, 320);
    for (let y = 244; y < 320; y++)
      for (let x = 0; x < W; x++) {
        const tile = ((y - 244) % 9 === 0) || ((x + ((((y - 244) / 9) | 0) % 2) * 7) % 15 === 0);
        near.set(x, y, tile ? C("#2e3632") : (x * 7 + y * 13) % 11 === 0 ? C("#56605a") : C("#48524c"));
      }
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(r() * W);
      const y = 244 + Math.floor(r() * 70);
      wrapDisc(near, x, y, 1 + r() * 3, r() < 0.5 ? moss : C("#355c32"));
    }
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(r() * W);
      const h = 2 + Math.floor(r() * 5);
      for (let j = 0; j < h; j++) wrapSet(near, x + (j % 2), 245 - j, r() < 0.5 ? mossL : moss);
    }
    // いちばん手前の葉(画面の端を暗く)
    const fg = new Buf(W, 320);
    for (let i = 0; i < 9; i++) {
      const x = i * 42 + r() * 10;
      const y = 6 + r() * 34;
      for (let k = 0; k < 5; k++) wrapDisc(fg, x + (r() - 0.5) * 20, y + (r() - 0.5) * 20, 6 + r() * 6, C(k % 2 ? "#0a1410" : "#0e1a14"));
    }
    return [
      { buf: sky, speed: 0, y: 0 },
      { buf: far, speed: 0.25, y: 0 },
      { buf: mid, speed: 0.6, y: 0 },
      { buf: near, speed: 1, y: 0 },
      { buf: fg, speed: 1.6, y: 0 },
    ];
  });
export const FOREST_GROUND = 250;

// ---------------- 2. 雲の上 ----------------
const cloud = (b: Buf, x: number, y: number, w: number, r: () => number, cols: string[]) => {
  const [hi, mid, lo, sh] = cols.map(C);
  const puffs: number[][] = [];
  for (let i = 0; i < Math.max(3, w / 6); i++) puffs.push([x + (i / Math.max(3, w / 6)) * w + (r() - 0.5) * 4, y - r() * w * 0.18, 4 + r() * w * 0.16]);
  for (const [px, py, pr] of puffs) wrapDisc(b, px, py + 2, pr, sh);
  for (const [px, py, pr] of puffs) wrapDisc(b, px, py, pr, lo);
  for (const [px, py, pr] of puffs) wrapDisc(b, px - 1, py - 1.5, pr * 0.8, mid);
  for (const [px, py, pr] of puffs) wrapDisc(b, px - 2, py - 3, pr * 0.45, hi);
  wrapRect(b, Math.floor(x - 2), Math.floor(y), Math.ceil(w + 4), 4, lo);
};
export const sky = () =>
  once("sky", () => {
    const r = rand(23);
    const W = 360;
    const s = new Buf(W, 320);
    gradient(s, 0, 320, ["#2456c8", "#3a78e0", "#62a2f0", "#9ccdf8", "#d8eefc"]);
    // 太陽(右上)
    wrapDisc(s, 150, 40, 14, C("#fff4c8"), 0.5);
    wrapDisc(s, 150, 40, 9, C("#fffbe8"));
    const far = new Buf(W, 320);
    for (let i = 0; i < 10; i++) cloud(far, i * 38 + r() * 10, 190 + r() * 14, 24 + r() * 20, r, ["#ffffff", "#e8f2fc", "#c8dcf4", "#a8c4ec"]);
    const mid = new Buf(W, 320);
    for (let i = 0; i < 7; i++) cloud(mid, i * 54 + r() * 16, 236 + r() * 16, 40 + r() * 20, r, ["#ffffff", "#f0f6fe", "#d4e4f8", "#aac6ec"]);
    for (let y = 244; y < 320; y++) for (let x = 0; x < W; x++) mid.set(x, y, dither(x, y, 0.35) ? C("#d4e4f8") : C("#f0f6fe"));
    const near = new Buf(W, 320);
    for (let i = 0; i < 5; i++) cloud(near, i * 76 + r() * 20, 292 + r() * 14, 60 + r() * 20, r, ["#ffffff", "#f6faff", "#dceaf8", "#b4cdee"]);
    for (let y = 300; y < 320; y++) for (let x = 0; x < W; x++) near.set(x, y, C("#f6faff"));
    return [
      { buf: s, speed: 0, y: 0 },
      { buf: far, speed: 0.3, y: 0 },
      { buf: mid, speed: 0.6, y: 0 },
      { buf: near, speed: 1.1, y: 0 },
    ];
  });

// ---------------- 3. 雲の切れ間から見下ろす森(真上から) ----------------
export const cloudHole = () =>
  once("hole", () => {
    const r = rand(37);
    const W = 260;
    const H = 420;
    const g = new Buf(W, H);
    // 森の木々(真上から見た丸いこずえ)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g.set(x, y, C("#1e4a26"));
    for (let i = 0; i < 1300; i++) {
      const x = r() * W;
      const y = r() * H;
      const rr = 2 + r() * 4;
      g.disc(x + 1, y + 1, rr, C("#163a1e"));
      g.disc(x, y, rr, C(i % 3 ? "#2e6a32" : "#3a7a38"));
      g.disc(x - 1, y - 1, rr * 0.45, C("#5a9a48"));
    }
    // 川
    for (let y = 0; y < H; y++) {
      const x = W / 2 + Math.sin(y * 0.03) * 40 + Math.sin(y * 0.011) * 30;
      g.line(x - 3, y, x + 3, y, C("#3a78b8"), 1);
      g.set(x - 1 + Math.round(Math.sin(y)), y, C("#9ad0f0"));
    }
    // まわりの雲(真ん中に穴)
    const cl = new Buf(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x - W / 2) / (W * 0.36);
        const dy = (y - H / 2) / (H * 0.36);
        const d = Math.hypot(dx, dy) + Math.sin(Math.atan2(dy, dx) * 7) * 0.07;
        if (d > 1.05) cl.set(x, y, C("#f4f8fe"));
        else if (d > 0.98) cl.set(x, y, dither(x, y, (d - 0.98) / 0.07) ? C("#f4f8fe") : C("#c4d8f0"));
        else if (d > 0.9 && dither(x, y, (d - 0.9) / 0.15)) cl.set(x, y, C("#dce8f6"));
      }
    for (let i = 0; i < 120; i++) {
      const a = r() * Math.PI * 2;
      const rr = 0.95 + r() * 0.5;
      const x = W / 2 + Math.cos(a) * W * 0.36 * rr;
      const y = H / 2 + Math.sin(a) * H * 0.36 * rr;
      cl.disc(x, y, 6 + r() * 10, C("#c8dcf2"));
      cl.disc(x - 2, y - 2, 4 + r() * 8, C("#ffffff"));
    }
    return [
      { buf: g, speed: 0.6, y: 0 },
      { buf: cl, speed: 1, y: 0 },
    ];
  });

// ---------------- 4. 光の差す森の全景 ----------------
export const vista = () =>
  once("vista", () => {
    const r = rand(53);
    const W = 360;
    const s = new Buf(W, 320);
    gradient(s, 0, 150, ["#7cb8ec", "#a8d4f6", "#d8eefa", "#fff4dc"]);
    for (let i = 0; i < 6; i++) cloud(s, i * 64 + r() * 20, 40 + r() * 40, 30 + r() * 26, r, ["#ffffff", "#fff8ec", "#e8e4ee", "#c8cce0"]);
    const far = new Buf(W, 320);
    // 遠い山(青み)
    for (let x = 0; x < W; x++) {
      const h = 128 + Math.sin(x * 0.035) * 10 + Math.sin(x * 0.11 + 1) * 4;
      for (let y = Math.floor(h); y < 180; y++) far.set(x, y, dither(x, y, (y - h) / 40) ? C("#6a98b8") : C("#8ab4d0"));
    }
    // 森の丘(緑の重なり)
    const mid = new Buf(W, 320);
    const hill = (base: number, amp: number, f: number, cols: string[]) => {
      for (let x = 0; x < W; x++) {
        const h = base + Math.sin(x * f) * amp + Math.sin(x * f * 2.7 + 2) * amp * 0.4;
        for (let y = Math.floor(h); y < 320; y++) mid.set(x, y, C(cols[(y - Math.floor(h)) < 3 ? 0 : 1]));
        if (x % 3 === 0) mid.disc(x, h, 2.5, C(cols[0]));
      }
    };
    hill(160, 6, 0.05, ["#5a9a5a", "#3e7a46"]);
    hill(184, 8, 0.04, ["#4a8a44", "#2e6a36"]);
    // 川(光る)
    for (let y = 186; y < 320; y++) {
      const x = 180 + Math.sin(y * 0.05) * 30 + (y - 186) * 0.4;
      const w = 2 + (y - 186) * 0.06;
      mid.line(x - w, y, x + w, y, C("#8ac8e8"), 1);
      if (y % 3 === 0) mid.set(x, y, C("#ffffff"));
    }
    const near = new Buf(W, 320);
    for (let i = 0; i < 420; i++) {
      const x = r() * W;
      const y = 215 + r() * 110;
      const rr = 3 + r() * 5 + (y - 215) * 0.04;
      wrapDisc(near, x + 1, y + 1, rr, C("#1e4a26"));
      wrapDisc(near, x, y, rr, C(i % 3 ? "#3a7a3a" : "#4a8c3e"));
      wrapDisc(near, x - 1, y - 1.5, rr * 0.45, C(i % 4 ? "#6aac4e" : "#9ccc5e"));
    }
    return [
      { buf: s, speed: 0.05, y: 0 },
      { buf: far, speed: 0.15, y: 0 },
      { buf: mid, speed: 0.4, y: 0 },
      { buf: near, speed: 1, y: 0 },
    ];
  });

/** 層を画面に重ねる。camX はカメラの横位置(層ごとに speed 倍で流れる)、camY は縦 */
export const drawLayers = (dst: Buf, layers: Layer[], camX: number, camY = 0, ySpeed?: number[], ox = 0, oy = 0) => {
  layers.forEach((L, i) => {
    const sx = Math.round(camX * L.speed);
    const sy = Math.round(camY * (ySpeed ? ySpeed[i] : L.speed));
    for (let y = 0; y < dst.h; y++) {
      const yy = y - oy + sy + L.y;
      if (yy < 0 || yy >= L.buf.h) continue;
      for (let x = 0; x < dst.w; x++) {
        const xx = (((x - ox + sx) % L.buf.w) + L.buf.w) % L.buf.w;
        const c = L.buf.d[yy * L.buf.w + xx];
        if (c) dst.d[y * dst.w + x] = c;
      }
    }
  });
};

/** 光の筋(斜めの間引きの帯) */
export const lightRays = (dst: Buf, f: number, a: number, color = "#fff6d0") => {
  const c = hex(color);
  for (let y = 0; y < dst.h; y++)
    for (let x = 0; x < dst.w; x++) {
      const u = x + y * 0.6;
      const band = Math.sin(u * 0.08 + f * 0.01) * Math.sin(u * 0.031 - f * 0.006);
      if (band > 0.55 && dither(x, y, a * (band - 0.55) * 2.2)) dst.d[y * dst.w + x] = c;
    }
};

/** 霧(流れる間引きの帯) */
export const fog = (dst: Buf, f: number, a: number, color = "#9ab8b0", y0 = 120, y1 = 260) => {
  const c = hex(color);
  for (let y = Math.max(0, y0); y < Math.min(dst.h, y1); y++)
    for (let x = 0; x < dst.w; x++) {
      const v = Math.sin((x + f * 0.6) * 0.045 + y * 0.07) + Math.sin((x - f * 0.35) * 0.02 - y * 0.05) * 0.8;
      if (v > 0.6 && dither(x, y, a * Math.min(1, (v - 0.6) * 1.5))) dst.d[y * dst.w + x] = c;
    }
};
