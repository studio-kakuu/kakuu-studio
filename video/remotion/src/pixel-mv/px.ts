// 作品006 v2「ドット絵アクション」の描画の芯。React も DOM も使わない(Node での確認用の書き出しと Remotion で共用)。
// 画面は 180×320 ドットの小さな絵として描き、最後にぼかさず 6 倍に拡大する(1080×1920)。
// 色は "#rrggbb" の文字列。透明は 0。

export const SW = 180;
export const SH = 320;

export const hex = (c: string): number => {
  const v = parseInt(c.slice(1), 16);
  // RGBA を 1 つの数に(A=255)。リトルエンディアンの ImageData にそのまま入る並び
  return (0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)) >>> 0;
};

export class Buf {
  w: number;
  h: number;
  d: Uint32Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.d = new Uint32Array(w * h);
  }
  get(x: number, y: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[y * this.w + x];
  }
  set(x: number, y: number, c: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    this.d[y * this.w + x] = c;
  }
  clear(c = 0) {
    this.d.fill(c);
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = Math.floor(y); j < Math.floor(y + h); j++) for (let i = Math.floor(x); i < Math.floor(x + w); i++) this.set(i, j, c);
  }
  /** 多角形を塗る(ドットの中心で判定。ぼかしなし) */
  poly(pts: number[][], c: number) {
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + ((cy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  /** 太さのある線(両端は丸い) */
  line(x0: number, y0: number, x1: number, y1: number, c: number, t = 1) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      if (t <= 1) this.set(x, y, c);
      else this.disc(x, y, t / 2, c);
    }
  }
  disc(cx: number, cy: number, r: number, c: number) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
      }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }
  ring(cx: number, cy: number, r: number, c: number, t = 1) {
    for (let y = Math.floor(cy - r - t); y <= Math.ceil(cy + r + t); y++)
      for (let x = Math.floor(cx - r - t); x <= Math.ceil(cx + r + t); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d >= r - t / 2 && d <= r + t / 2) this.set(x, y, c);
      }
  }
  /** 文字の地図で描く。pal の文字 → 色。'.' と ' ' は透明 */
  map(rows: string[], pal: Record<string, number>, x: number, y: number, flip = false) {
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const c = pal[r[i]];
        if (c) this.set(flip ? x + w - 1 - i : x + i, y + j, c);
      }
    });
  }
  /** 別の絵を重ねる(透明は飛ばす)。flip で左右反転、alpha は 0〜1 を市松の間引きで表す(ドット絵らしい半透明) */
  blit(b: Buf, x: number, y: number, flip = false, alpha = 1) {
    x = Math.round(x);
    y = Math.round(y);
    for (let j = 0; j < b.h; j++)
      for (let i = 0; i < b.w; i++) {
        const c = b.d[j * b.w + i];
        if (!c) continue;
        const X = flip ? x + b.w - 1 - i : x + i;
        const Y = y + j;
        if (alpha < 1 && !dither(X, Y, alpha)) continue;
        this.set(X, Y, c);
      }
  }
  /** 絵の外側に 1 ドットの輪郭線をつける */
  outline(c: number) {
    const out = this.d.slice();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.d[y * this.w + x]) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) out[y * this.w + x] = c;
      }
    this.d = out;
  }
  /**
   * 輪郭のふちの光:輪郭線の内側(上・左・右)の体の色を inner に、輪郭線の外側を outer(間引き)にする。
   * 暗い背景でも形が沈まないように使う(影狼)
   */
  rim(line: number, body: number[], inner: number, outer: number) {
    const src = this.d.slice();
    const g = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[y * this.w + x]);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = src[y * this.w + x];
        if (c === 0) {
          if ((g(x, y - 1) === line || g(x - 1, y) === line || g(x + 1, y) === line || g(x, y + 1) === line) && (x + y) % 2 === 0) this.d[y * this.w + x] = outer;
        } else if (body.includes(c) && g(x, y - 1) === line && (x + y) % 3 !== 0) this.d[y * this.w + x] = inner;
      }
  }
  /** 全部の色を 1 色に(白フラッシュの点滅・シルエット) */
  tint(c: number) {
    for (let i = 0; i < this.d.length; i++) if (this.d[i]) this.d[i] = c;
  }
}

// 4×4 のベイヤー配列で半透明を間引きに置きかえる
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const dither = (x: number, y: number, a: number) => a > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

/** 色を混ぜる(パレットの中間色づくり) */
export const mix = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return "#" + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0");
};

/** 決まった乱数(同じ種なら毎回同じ) */
export const rand = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
};
export const hash = (...n: number[]) => {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000) | 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 100000) / 100000;
};
