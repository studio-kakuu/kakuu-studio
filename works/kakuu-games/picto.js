// KAKUU GAMES のピクトグラム(動画と同じ芯)。video/remotion/src/kakuu-games/picto/rigcore.ts から esbuild で書き出したもの(手で直さない)
// src/kakuu-games/picto/rigcore.ts
var C = { ink: "#0E0E0E", off: "#F2F0E9", lime: "#C6FF3D" };
var L = { torso: 0.3, ua: 0.155, la: 0.15, th: 0.215, sh: 0.215, headW: 0.215, headH: 0.165, gap: 0.03, limb: 0.07, body: 0.112 };
var STAND = { x: 0, y: -(L.th + L.sh), t: 0, h: 0, a1: 8, a1l: 8, a2: -8, a2l: -8, l1: 4, l1l: 4, l2: -4, l2l: -4, fr: 0, r: 0 };
var P = (p) => ({ ...STAND, ...p });
var KEYS = Object.keys(STAND);
var clamp01 = (x) => Math.min(1, Math.max(0, x));
var lerp = (a, b, k) => a + (b - a) * k;
var E = {
  lin: (x) => x,
  io: (x) => x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2,
  out: (x) => 1 - (1 - x) ** 3,
  in: (x) => x * x * x,
  snap: (x) => x >= 1 ? 1 : 1 - 2 ** (-10 * x),
  back: (x) => {
    const c = 2.2;
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
  },
  antic: (x) => {
    const c = 1.9;
    return (c + 1) * x * x * x - c * x * x;
  },
  hold: (x) => x >= 1 ? 1 : 0
};
var ease = (x, e = "io") => E[e](clamp01(x));
var mix = (a, b, k) => {
  const o = { ...a };
  for (const n of KEYS) o[n] = a[n] + (b[n] - a[n]) * k;
  return o;
};
function poseAt(keys, b) {
  var _a;
  if (b <= keys[0].b) return keys[0].p;
  for (let i = 0; i < keys.length - 1; i++) {
    const A = keys[i], B = keys[i + 1];
    if (b <= B.b) return mix(A.p, B.p, E[(_a = B.e) != null ? _a : "io"](clamp01((b - A.b) / (B.b - A.b))));
  }
  return keys[keys.length - 1].p;
}
function valAt(keys, b) {
  if (b <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [b0, v0] = keys[i], [b1, v1, e] = keys[i + 1];
    if (b <= b1) return v0 + (v1 - v0) * E[e != null ? e : "io"](clamp01((b - b0) / (b1 - b0)));
  }
  return keys[keys.length - 1][1];
}
var hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
var rad = (d) => d * Math.PI / 180;
function fk(p, f = 1) {
  const fr = p.fr;
  const dir = (a, side) => [Math.sin(rad(a)) * f * (fr > 0.5 ? side : 1), Math.cos(rad(a))];
  const hip = [p.x, p.y];
  const tv = [Math.sin(rad(p.t)) * f, -Math.cos(rad(p.t))];
  const neck = [hip[0] + tv[0] * L.torso, hip[1] + tv[1] * L.torso];
  const sho = [hip[0] + tv[0] * L.torso * 0.9, hip[1] + tv[1] * L.torso * 0.9];
  const sw = fr * 0.13;
  const shoN = [sho[0] + sw * f, sho[1]], shoF = [sho[0] - sw * f, sho[1]];
  const hipN = [hip[0] + fr * 0.06 * f, hip[1]], hipF = [hip[0] - fr * 0.06 * f, hip[1]];
  const seg = (o, a, l, side) => {
    const d = dir(a, side);
    return [o[0] + d[0] * l, o[1] + d[1] * l];
  };
  const el1 = seg(shoN, p.a1, L.ua, 1), ha1 = seg(el1, p.a1l, L.la, 1);
  const el2 = seg(shoF, p.a2, L.ua, -1), ha2 = seg(el2, p.a2l, L.la, -1);
  const kn1 = seg(hipN, p.l1, L.th, 1), ft1 = seg(kn1, p.l1l, L.sh, 1);
  const kn2 = seg(hipF, p.l2, L.th, -1), ft2 = seg(kn2, p.l2l, L.sh, -1);
  const ht = p.t + p.h;
  const hv = [Math.sin(rad(ht)) * f, -Math.cos(rad(ht))];
  const head = [neck[0] + hv[0] * (L.gap + L.headH / 2), neck[1] + hv[1] * (L.gap + L.headH / 2)];
  const J = { hip, neck, shoN, shoF, hipN, hipF, el1, ha1, el2, ha2, kn1, ft1, kn2, ft2, head, headRot: ht * f };
  if (p.r) {
    const c = Math.cos(rad(p.r * f)), s = Math.sin(rad(p.r * f));
    for (const k of Object.keys(J)) {
      if (k === "headRot" || k === "hip") continue;
      const q = J[k];
      const dx = q[0] - hip[0], dy = q[1] - hip[1];
      J[k] = [hip[0] + dx * c - dy * s, hip[1] + dx * s + dy * c];
    }
    J.headRot += p.r * f;
  }
  return J;
}
function figurePrims(p, o) {
  const { S, f = 1, color, bg, screen = C.ink, eyes = C.lime, blink = 0, eyeOn = 1 } = o;
  const j = fk(p, f);
  const s = (q) => [q[0] * S, q[1] * S];
  const lw = L.limb * S, bw = L.body * S, g = 0.022 * S;
  const out = [];
  const limb = (a, b, c, w = lw) => {
    out.push({ k: "pl", pts: [s(a), s(b), s(c)], w: w + g * 2, c: bg });
    out.push({ k: "pl", pts: [s(a), s(b), s(c)], w, c: color });
  };
  const top = [j.hip[0] + (j.neck[0] - j.hip[0]) * 0.86, j.hip[1] + (j.neck[1] - j.hip[1]) * 0.86];
  limb(j.shoF, j.el2, j.ha2);
  limb(j.hipF, j.kn2, j.ft2);
  out.push({ k: "pl", pts: [s(j.hip), s(top)], w: bw + g * 2, c: bg });
  out.push({ k: "pl", pts: [s(j.hip), s(top)], w: bw, c: color });
  limb(j.hipN, j.kn1, j.ft1);
  limb(j.shoN, j.el1, j.ha1);
  if (o.glove) for (const h of [j.ha2, j.ha1]) {
    out.push({ k: "el", cx: h[0] * S, cy: h[1] * S, rx: 0.058 * S, ry: 0.058 * S, fill: bg });
    out.push({ k: "el", cx: h[0] * S, cy: h[1] * S, rx: 0.045 * S, ry: 0.045 * S, fill: color });
  }
  if (!o.noHead) {
    const hw = L.headW * S, hh = L.headH * S;
    const tr = `translate(${j.head[0] * S} ${j.head[1] * S}) rotate(${j.headRot})`;
    out.push({ k: "path", d: `M${-0.03 * S * f},${-hh / 2} L${-0.045 * S * f},${-hh / 2 - 0.075 * S}`, stroke: color, sw: 0.012 * S, tr });
    out.push({ k: "el", cx: -0.045 * S * f, cy: -hh / 2 - 0.08 * S, rx: 0.02 * S, ry: 0.02 * S, fill: eyes, stroke: bg, sw: 8e-3 * S, o: eyeOn, tr });
    out.push({ k: "rect", x: -hw / 2 - g, y: -hh / 2 - g, w: hw + g * 2, h: hh + g * 2, rx: 0.05 * S, fill: bg, tr });
    out.push({ k: "rect", x: -hw / 2, y: -hh / 2, w: hw, h: hh, rx: 0.04 * S, fill: color, tr });
    out.push({ k: "rect", x: -hw / 2 + 0.022 * S, y: -hh / 2 + 0.022 * S, w: hw - 0.044 * S, h: hh - 0.05 * S, rx: 0.024 * S, fill: screen, tr });
    const ex = (0.035 + (1 - p.fr) * 0.02) * S, ec = (1 - p.fr) * 0.028 * S, er = 0.026 * S;
    for (const k of [-1, 1]) out.push({ k: "el", cx: (ec + k * ex * 0.62) * f, cy: -4e-3 * S, rx: er * (1 - p.fr * 0.1), ry: er * Math.max(0.12, 1 - blink), fill: eyes, o: eyeOn, tr });
  }
  return out;
}
var dirOf = (a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};
function stickPrims(from, along, len, w, S, color, bg) {
  const d = dirOf([0, 0], along), to = [from[0] + d[0] * len, from[1] + d[1] * len];
  return [{ k: "pl", pts: [[from[0] * S, from[1] * S], [to[0] * S, to[1] * S]], w: (w + 0.02) * S, c: bg }, { k: "pl", pts: [[from[0] * S, from[1] * S], [to[0] * S, to[1] * S]], w: w * S, c: color }];
}
function ballPrims(kind, at, S, color, bg, spin = 0) {
  const r = (kind === "tball" ? 0.035 : kind === "sball" ? 0.05 : kind === "shuttle" ? 0.04 : 0.085) * S;
  const x = at[0] * S, y = at[1] * S;
  const tr = `translate(${x} ${y}) rotate(${spin})`;
  if (kind === "shuttle") return [
    { k: "path", d: `M0,${-r * 0.4} L${-r * 1.6},${-r * 1.4} L${-r * 1.6},${r * 1.4} L0,${r * 0.4} Z`, fill: color, stroke: bg, sw: 8e-3 * S, tr },
    { k: "el", cx: r * 0.3, cy: 0, rx: r * 0.55, ry: r * 0.55, fill: color, stroke: bg, sw: 8e-3 * S, tr }
  ];
  if (kind === "oval") return [
    { k: "el", cx: 0, cy: 0, rx: r * 1.35, ry: r * 0.85, fill: color, stroke: bg, sw: 0.012 * S, tr },
    { k: "path", d: `M${-r * 0.5},0 L${r * 0.5},0`, stroke: bg, sw: 0.01 * S, tr }
  ];
  const out = [{ k: "el", cx: 0, cy: 0, rx: r, ry: r, fill: color, stroke: bg, sw: 0.012 * S, tr }];
  if (kind === "bball") out.push({ k: "path", d: `M${-r},0 L${r},0 M0,${-r} L0,${r} M${-r * 0.7},${-r * 0.7} Q0,0 ${-r * 0.7},${r * 0.7} M${r * 0.7},${-r * 0.7} Q0,0 ${r * 0.7},${r * 0.7}`, stroke: bg, sw: 9e-3 * S, tr });
  if (kind === "vball") out.push({ k: "path", d: `M${-r},0 Q0,${-r * 0.6} ${r},0 M${-r * 0.3},${-r * 0.95} Q${r * 0.3},0 ${-r * 0.3},${r * 0.95} M${r * 0.5},${-r * 0.85} Q${r * 0.1},${r * 0.3} ${r * 0.6},${r * 0.8}`, stroke: bg, sw: 9e-3 * S, tr });
  if (kind === "ball") out.push({ k: "path", d: `M0,${-r * 0.35} L${r * 0.33},${-r * 0.1} L${r * 0.2},${r * 0.3} L${-r * 0.2},${r * 0.3} L${-r * 0.33},${-r * 0.1} Z`, fill: bg, tr });
  if (kind === "sball") out.push({ k: "path", d: `M${-r * 0.6},${-r * 0.75} Q${-r * 0.1},0 ${-r * 0.6},${r * 0.75} M${r * 0.6},${-r * 0.75} Q${r * 0.1},0 ${r * 0.6},${r * 0.75}`, stroke: bg, sw: 7e-3 * S, tr });
  return out;
}
function toolPrims(kind, hand, dir, S, color, bg) {
  const d = dirOf([0, 0], dir), n = [-d[1], d[0]];
  const at = (k, m = 0) => [hand[0] + d[0] * k + n[0] * m, hand[1] + d[1] * k + n[1] * m];
  const sp = (q) => `${q[0] * S},${q[1] * S}`;
  if (kind === "bat") return stickPrims(at(-0.05), d, 0.62, 0.035, S, color, bg);
  if (kind === "shinai") return [...stickPrims(at(-0.12), d, 0.82, 0.026, S, color, bg), { k: "pl", pts: [[at(0.08, -0.05)[0] * S, at(0.08, -0.05)[1] * S], [at(0.08, 0.05)[0] * S, at(0.08, 0.05)[1] * S]], w: 0.02 * S, c: color }];
  if (kind === "foil") return [...stickPrims(at(0), d, 0.7, 0.012, S, color, bg), { k: "path", d: `M${sp(at(0.03, -0.055))} Q${sp(at(0.09))} ${sp(at(0.03, 0.055))}`, stroke: color, sw: 0.02 * S, fill: "none" }];
  if (kind === "racket" || kind === "paddle") {
    const handle = kind === "racket" ? 0.22 : 0.07, rr = kind === "racket" ? 0.1 : 0.075, c = at(handle + rr);
    return [
      ...stickPrims(at(-0.02), d, handle + 0.01, 0.022, S, color, bg),
      { k: "el", cx: c[0] * S, cy: c[1] * S, rx: rr * S * (kind === "racket" ? 1.15 : 1), ry: rr * S * (kind === "racket" ? 0.85 : 1), fill: kind === "paddle" ? color : "none", stroke: color, sw: 0.018 * S, tr: `rotate(${Math.atan2(d[1], d[0]) * 180 / Math.PI} ${c[0] * S} ${c[1] * S})` }
    ];
  }
  return [];
}
function boardPrims(kind, a, b, S, color, bg, tilt = 0, lift = 0) {
  const cx = (a[0] + b[0]) / 2, cy = Math.max(a[1], b[1]) + 0.035 - lift;
  const len = kind === "surf" ? 0.95 : 0.62;
  const tr = `translate(${cx * S} ${cy * S}) rotate(${tilt})`;
  const out = [{ k: "path", d: kind === "surf" ? `M${-len / 2 * S},0 Q${-len / 2 * S},${-0.03 * S} ${-len / 3 * S},${-0.03 * S} L${len / 2.4 * S},${-0.03 * S} Q${len / 2 * S},${-0.02 * S} ${len / 2 * S},${-5e-3 * S} Q${len / 2.2 * S},${0.03 * S} ${len / 3 * S},${0.03 * S} L${-len / 3 * S},${0.03 * S} Q${-len / 2 * S},${0.03 * S} ${-len / 2 * S},0 Z` : `M${-len / 2 * S},${-0.03 * S} Q${-len / 2 * S},0 ${-len / 2.6 * S},0 L${len / 2.6 * S},0 Q${len / 2 * S},0 ${len / 2 * S},${-0.03 * S}`, fill: kind === "surf" ? color : "none", stroke: kind === "surf" ? bg : color, sw: (kind === "surf" ? 0.012 : 0.03) * S, tr }];
  if (kind === "board") for (const k of [-1, 1]) out.push({ k: "el", cx: k * len * 0.3 * S, cy: 0.04 * S, rx: 0.028 * S, ry: 0.028 * S, fill: color, stroke: bg, sw: 8e-3 * S, tr });
  return out;
}
function bikePrims(at, S, color, bg, wheel, tilt = 0) {
  const tr = `translate(${at[0] * S} ${at[1] * S}) rotate(${tilt})`;
  const R = 0.2 * S, wb = 0.36 * S;
  const out = [];
  for (const k of [-1, 1]) {
    out.push({ k: "el", cx: k * wb, cy: 0, rx: R, ry: R, fill: "none", stroke: bg, sw: 0.05 * S, tr });
    out.push({ k: "el", cx: k * wb, cy: 0, rx: R, ry: R, fill: "none", stroke: color, sw: 0.03 * S, tr });
    const a = wheel + k;
    out.push({ k: "path", d: `M${k * wb + Math.cos(a) * R},${Math.sin(a) * R} L${k * wb - Math.cos(a) * R},${-Math.sin(a) * R} M${k * wb + Math.cos(a + 1.57) * R},${Math.sin(a + 1.57) * R} L${k * wb - Math.cos(a + 1.57) * R},${-Math.sin(a + 1.57) * R}`, stroke: color, sw: 8e-3 * S, tr });
  }
  out.push({ k: "path", d: `M${-wb},0 L${-0.05 * S},${-0.02 * S} L${0.17 * S},${-0.2 * S} L${wb},0 M${-0.05 * S},${-0.02 * S} L${-0.1 * S},${-0.26 * S} M${0.17 * S},${-0.2 * S} L${0.13 * S},${-0.34 * S} L${0.24 * S},${-0.36 * S}`, stroke: color, sw: 0.03 * S, fill: "none", tr });
  return out;
}
var K = (b, p, e) => ({ b, p: P(p), e });
var RUN = (u, lean = 20) => {
  const lead = [[0, [35, 12]], [0.4, [-5, -12]], [0.75, [-40, -58]], [1, [-25, -112]]];
  const trail = [[0, [-25, -112]], [0.4, [58, -48]], [0.75, [72, 18]], [1, [35, 12]]];
  const at = (k, s2) => {
    for (let i = 0; i < k.length - 1; i++) if (s2 <= k[i + 1][0]) {
      const x = E.io((s2 - k[i][0]) / (k[i + 1][0] - k[i][0]));
      return [lerp(k[i][1][0], k[i + 1][1][0], x), lerp(k[i][1][1], k[i + 1][1][1], x)];
    }
    return k[k.length - 1][1];
  };
  const uu = (u % 1 + 1) % 1, half = uu >= 0.5, s = uu % 0.5 / 0.5;
  const A = at(lead, s), B = at(trail, s), sw = E.io(s);
  const aF = [lerp(62, -58, sw), lerp(150, 12, sw)], aB = [lerp(-58, 62, sw), lerp(12, 150, sw)];
  const [n, f] = half ? [B, A] : [A, B], [an, af] = half ? [aF, aB] : [aB, aF];
  return P({ y: -0.4 - 0.03 * Math.sin(clamp01((s - 0.4) / 0.6) * Math.PI), t: lean, h: -lean * 0.45, a1: an[0], a1l: an[1], a2: af[0], a2l: af[1], l1: n[0], l1l: n[1], l2: f[0], l2l: f[1] });
};
var runPose = RUN;
var runKeys = (n = 16, lean = 22) => Array.from({ length: n + 1 }, (_, i) => ({ b: i / n * 4, p: RUN(i / n * 4, lean), e: "lin" }));
var handDir = (j, n = 1) => n === 1 ? [j.ha1[0] - j.el1[0], j.ha1[1] - j.el1[1]] : [j.ha2[0] - j.el2[0], j.ha2[1] - j.el2[1]];
var SIGS = [
  { id: "sprint", en: "SPRINT", jp: "\u9678\u4E0A(\u77ED\u8DDD\u96E2)", keys: runKeys() },
  {
    id: "kyudo",
    en: "KYUDO",
    jp: "\u5F13\u9053",
    keys: [K(0, { a1: 88, a1l: 90, a2: -40, a2l: 100, l1: 13, l1l: 13, l2: -13, l2l: -13 }), K(1.6, { a1: 90, a1l: 90, a2: -112, a2l: 86, l1: 13, l1l: 13, l2: -13, l2l: -13 }), K(2, { a1: 90, a1l: 90, a2: -112, a2l: 86, l1: 13, l1l: 13, l2: -13, l2l: -13 }, "hold"), K(2.25, { a1: 90, a1l: 90, a2: -92, a2l: -95, l1: 13, l1l: 13, l2: -13, l2l: -13 }, "snap"), K(4, { a1: 88, a1l: 90, a2: -40, a2l: 100, l1: 13, l1l: 13, l2: -13, l2l: -13 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p), g = j.ha1, top = [g[0] - 0.03, g[1] - 0.66], bot = [g[0] - 0.03, g[1] + 0.3], ctrl = [g[0] + 0.3, g[1] - 0.18];
      const drawn = b < 2.05;
      const mid = drawn ? j.ha2 : [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2];
      const sp = (q) => `${q[0] * S},${q[1] * S}`;
      return { front: [{ k: "path", d: `M${sp(top)} Q${sp(ctrl)} ${sp(bot)}`, stroke: C.lime, sw: 0.03 * S, fill: "none" }, { k: "path", d: `M${sp(top)} L${sp(mid)} L${sp(bot)}`, stroke: c, sw: 8e-3 * S, fill: "none" }, ...drawn ? stickPrims([j.ha2[0], j.ha2[1]], [1, 0], 0.9, 0.012, S, c, bg) : []] };
    }
  },
  {
    id: "fencing",
    en: "FENCING",
    jp: "\u30D5\u30A7\u30F3\u30B7\u30F3\u30B0",
    keys: [K(0, { y: -0.36, t: 6, h: -4, a1: 72, a1l: 84, a2: -125, a2l: -175, l1: 38, l1l: -4, l2: -42, l2l: -14 }), K(1.5, { y: -0.33, t: -4, h: 2, a1: 60, a1l: 70, a2: -125, a2l: -175, l1: 30, l1l: -10, l2: -30, l2l: -18 }, "io"), K(2, { x: 0.25, y: -0.3, t: 18, h: -8, a1: 92, a1l: 92, a2: -100, a2l: -95, l1: 72, l1l: 8, l2: -62, l2l: -66 }, "snap"), K(3, { x: 0.25, y: -0.3, t: 18, h: -8, a1: 92, a1l: 92, a2: -100, a2l: -95, l1: 72, l1l: 8, l2: -62, l2l: -66 }), K(4, { y: -0.36, t: 6, h: -4, a1: 72, a1l: 84, a2: -125, a2l: -175, l1: 38, l1l: -4, l2: -42, l2l: -14 })],
    draw: (p, _b, S, c, bg) => {
      const j = fk(p);
      return { front: toolPrims("foil", j.ha1, handDir(j), S, c, bg) };
    }
  },
  {
    id: "kendo",
    en: "KENDO",
    jp: "\u5263\u9053",
    keys: [K(0, { y: -0.41, a1: 55, a1l: 70, a2: 60, a2l: 72, l1: 14, l1l: 8, l2: -16, l2l: -20 }), K(1.6, { y: -0.43, t: -6, a1: 175, a1l: 200, a2: 178, a2l: 205, l1: 10, l1l: 8, l2: -16, l2l: -20 }, "out"), K(2, { x: 0.2, y: -0.4, t: 10, h: -4, a1: 98, a1l: 96, a2: 100, a2l: 98, l1: 42, l1l: 8, l2: -40, l2l: -48 }, "snap"), K(3, { x: 0.2, y: -0.4, t: 10, a1: 98, a1l: 96, a2: 100, a2l: 98, l1: 42, l1l: 8, l2: -40, l2l: -48 }), K(4, { y: -0.41, a1: 55, a1l: 70, a2: 60, a2l: 72, l1: 14, l1l: 8, l2: -16, l2l: -20 })],
    draw: (p, _b, S, c, bg) => {
      const j = fk(p);
      return { front: toolPrims("shinai", j.ha1, handDir(j), S, c, bg) };
    }
  },
  { id: "karate", en: "KARATE", jp: "\u7A7A\u624B", keys: [K(0, { y: -0.38, a1: 40, a1l: 120, a2: 20, a2l: 140, l1: 28, l1l: 0, l2: -28, l2l: -8 }), K(1.6, { y: -0.4, t: -10, a1: 0, a1l: 120, a2: 30, a2l: 150, l1: 75, l1l: -40, l2: -8, l2l: -8 }, "io"), K(2, { y: -0.43, t: -22, h: 10, a1: -20, a1l: 60, a2: 60, a2l: 130, l1: 100, l1l: 95, l2: -6, l2l: -6 }, "snap"), K(2.8, { y: -0.43, t: -22, h: 10, a1: -20, a1l: 60, a2: 60, a2l: 130, l1: 100, l1l: 95, l2: -6, l2l: -6 }), K(4, { y: -0.38, a1: 40, a1l: 120, a2: 20, a2l: 140, l1: 28, l1l: 0, l2: -28, l2l: -8 })] },
  {
    id: "judo",
    en: "JUDO",
    jp: "\u67D4\u9053",
    keys: [K(0, { y: -0.4, t: 12, a1: 70, a1l: 85, a2: 75, a2l: 95, l1: 20, l1l: 5, l2: -22, l2l: -10 }), K(1.6, { y: -0.3, t: 40, h: -20, a1: 110, a1l: 160, a2: 60, a2l: 30, l1: 45, l1l: -30, l2: -10, l2l: -40 }, "io"), K(2, { y: -0.32, t: 75, h: -30, a1: 40, a1l: 20, a2: 20, a2l: 10, l1: 50, l1l: -20, l2: -30, l2l: -30 }, "snap"), K(3, { y: -0.32, t: 75, h: -30, a1: 40, a1l: 20, a2: 20, a2l: 10, l1: 50, l1l: -20, l2: -30, l2l: -30 }), K(4, { y: -0.4, t: 12, a1: 70, a1l: 85, a2: 75, a2l: 95, l1: 20, l1l: 5, l2: -22, l2l: -10 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const th = b < 1.6 ? 0 : b < 2 ? lerp(0, 120, E.in((b - 1.6) / 0.4)) : b < 3 ? lerp(120, 200, E.out(b - 2)) : lerp(200, 360, E.io(b - 3));
      const op = P({ a1: 70, a1l: 85, a2: 75, a2l: 95, l1: 10, l1l: 5, l2: -10, l2l: -5, r: -th });
      const o = fk(op, -1);
      const dx = j.neck[0] + 0.12 - o.hip[0] * 0, dy = j.neck[1] - 0.05;
      return { back: figurePrims({ ...op, x: dx, y: dy }, { S, f: -1, color: bg === C.ink ? "#6B6B66" : "#FFFFFF", bg, eyes: C.lime }).map((q) => q) };
    }
  },
  { id: "boxing", en: "BOXING", jp: "\u30DC\u30AF\u30B7\u30F3\u30B0", glove: true, keys: [K(0, { y: -0.4, t: 8, a1: 40, a1l: 150, a2: 30, a2l: 160, l1: 22, l1l: 6, l2: -22, l2l: -12 }), K(0.5, { x: 0.05, y: -0.4, t: 12, a1: 85, a1l: 88, a2: 30, a2l: 160, l1: 22, l1l: 6, l2: -22, l2l: -12 }, "snap"), K(1, { y: -0.4, t: 8, a1: 40, a1l: 150, a2: 30, a2l: 160, l1: 22, l1l: 6, l2: -22, l2l: -12 }), K(1.7, { y: -0.33, t: 20, a1: 30, a1l: 160, a2: -10, a2l: 60, l1: 35, l1l: -15, l2: -30, l2l: -30 }), K(2, { y: -0.43, t: -8, h: 8, a1: 40, a1l: 150, a2: 150, a2l: 175, l1: 15, l1l: 5, l2: -10, l2l: -15 }, "snap"), K(2.8, { y: -0.43, t: -8, a1: 40, a1l: 150, a2: 150, a2l: 175, l1: 15, l1l: 5, l2: -10, l2l: -15 }), K(4, { y: -0.4, t: 8, a1: 40, a1l: 150, a2: 30, a2l: 160, l1: 22, l1l: 6, l2: -22, l2l: -12 })] },
  { id: "gymnastics", en: "GYMNASTICS", jp: "\u4F53\u64CD", keys: [K(0, { a1: 175, a1l: 178, a2: 175, a2l: 178 }), K(1.5, { y: -0.32, t: 15, a1: -30, a1l: -20, a2: -30, a2l: -20, l1: 50, l1l: -40, l2: 50, l2l: -40 }, "io"), K(2, { y: -0.75, t: -10, a1: 170, a1l: 175, a2: 170, a2l: 175, l1: 0, l1l: 0, l2: 0, l2l: 0, r: 0 }, "snap"), K(2.6, { y: -0.85, t: 0, a1: 120, a1l: 60, a2: 120, a2l: 60, l1: 110, l1l: -20, l2: 110, l2l: -20, r: -200 }, "lin"), K(3.2, { y: -0.6, t: 0, a1: 150, a1l: 170, a2: 150, a2l: 170, l1: 0, l1l: 0, l2: 0, l2l: 0, r: -360 }, "out"), K(3.5, { y: -0.36, t: 10, a1: 150, a1l: 160, a2: 150, a2l: 160, l1: 40, l1l: -20, l2: 40, l2l: -20, r: -360 }, "out"), K(4, { a1: 175, a1l: 178, a2: 175, a2l: 178, r: -360 })] },
  {
    id: "volleyball",
    en: "VOLLEYBALL",
    jp: "\u30D0\u30EC\u30FC",
    keys: [K(0, { y: -0.36, t: 20, a1: -70, a1l: -60, a2: -75, a2l: -65, l1: 40, l1l: -20, l2: -20, l2l: -50 }), K(1.6, { y: -0.75, t: -15, h: -12, a1: 185, a1l: 215, a2: 150, a2l: 160, l1: 30, l1l: -60, l2: 10, l2l: -60 }, "out"), K(2, { y: -0.73, t: 15, h: 8, a1: 100, a1l: 90, a2: 60, a2l: 40, l1: 40, l1l: -30, l2: 15, l2l: -45 }, "snap"), K(2.8, { y: -0.43, t: 10, a1: 40, a1l: 30, a2: 30, a2l: 30, l1: 20, l1l: 0, l2: -10, l2l: -10 }, "in"), K(4, { y: -0.36, t: 20, a1: -70, a1l: -60, a2: -75, a2l: -65, l1: 40, l1l: -20, l2: -20, l2l: -50 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const at = b < 2 ? [j.ha1[0] + 0.05, j.ha1[1] - 0.1] : [j.ha1[0] + 0.1 + (b - 2) * 0.8, j.ha1[1] + (b - 2) * 1.2];
      return { front: b < 3 ? ballPrims("vball", at, S, c, bg, b * 120) : [] };
    }
  },
  {
    id: "basketball",
    en: "BASKETBALL",
    jp: "\u30D0\u30B9\u30B1",
    keys: [K(0, { y: -0.36, t: 15, a1: 30, a1l: 60, a2: -20, a2l: 10, l1: 35, l1l: -15, l2: -20, l2l: -40 }), K(1.5, { y: -0.3, t: 25, a1: 60, a1l: 100, a2: 60, a2l: 110, l1: 50, l1l: -40, l2: 20, l2l: -50 }, "io"), K(2, { y: -0.85, t: -5, h: -10, a1: 175, a1l: 180, a2: 160, a2l: 175, l1: 30, l1l: -50, l2: 5, l2l: -40 }, "snap"), K(2.8, { y: -0.6, t: 0, a1: 150, a1l: 160, a2: 120, a2l: 140, l1: 20, l1l: -20, l2: 0, l2l: -20 }, "in"), K(4, { y: -0.36, t: 15, a1: 30, a1l: 60, a2: -20, a2l: 10, l1: 35, l1l: -15, l2: -20, l2l: -40 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const bounce = b < 1.3 ? Math.abs(Math.sin(b * Math.PI * 1.5)) : 1;
      const at = b < 1.3 ? [j.ha1[0] + 0.03, lerp(-0.09, j.ha1[1] + 0.09, bounce)] : b < 2.1 ? [j.ha1[0] + 0.04, j.ha1[1] - 0.08] : [j.ha1[0] + 0.15 + (b - 2.1) * 0.5, j.ha1[1] - 0.1 - (b - 2.1) * 0.4];
      return { front: b < 3.2 ? ballPrims("bball", at, S, c, bg, b * 90) : [] };
    }
  },
  {
    id: "soccer",
    en: "SOCCER",
    jp: "\u30B5\u30C3\u30AB\u30FC",
    keys: [K(0, { y: -0.42, a1: 20, a1l: 20, a2: -20, a2l: -20, l1: 10, l1l: 5, l2: -10, l2l: -5 }), K(1.6, { y: -0.4, t: -12, a1: 60, a1l: 70, a2: -60, a2l: -40, l1: 5, l1l: 5, l2: -75, l2l: -130 }, "io"), K(2, { y: -0.42, t: -18, h: 6, a1: -40, a1l: -30, a2: 70, a2l: 80, l1: 0, l1l: 0, l2: 85, l2l: 80 }, "snap"), K(2.8, { y: -0.42, t: -18, a1: -40, a1l: -30, a2: 70, a2l: 80, l1: 0, l1l: 0, l2: 85, l2l: 80 }), K(4, { y: -0.42, a1: 20, a1l: 20, a2: -20, a2l: -20, l1: 10, l1l: 5, l2: -10, l2l: -5 })],
    draw: (_p, b, S, c, bg) => {
      const at = b < 2 ? [0.32, -0.085] : [0.32 + (b - 2) * 1.2, -0.085 - (b - 2) * 0.3];
      return { front: b < 3 || b > 3.9 ? ballPrims("ball", at, S, c, bg, b * 200) : [] };
    }
  },
  {
    id: "baseball",
    en: "BASEBALL",
    jp: "\u91CE\u7403",
    keys: [K(0, { y: -0.4, t: 10, a1: -40, a1l: 120, a2: -20, a2l: 140, l1: 15, l1l: 5, l2: -18, l2l: -10 }), K(1.6, { y: -0.43, t: -5, a1: -70, a1l: 120, a2: -50, a2l: 140, l1: 60, l1l: -40, l2: -10, l2l: -10 }, "io"), K(2, { y: -0.38, t: 20, h: -10, a1: 80, a1l: 95, a2: 80, a2l: 90, l1: 35, l1l: 5, l2: -30, l2l: -40 }, "snap"), K(2.5, { y: -0.38, t: 25, a1: 170, a1l: 220, a2: 160, a2l: 210, l1: 35, l1l: 5, l2: -30, l2l: -40 }, "out"), K(4, { y: -0.4, t: 10, a1: -40, a1l: 120, a2: -20, a2l: 140, l1: 15, l1l: 5, l2: -18, l2l: -10 })],
    draw: (p, _b, S, c, bg) => {
      const j = fk(p);
      return { front: toolPrims("bat", j.ha1, handDir(j), S, c, bg) };
    }
  },
  {
    id: "tennis",
    en: "TENNIS",
    jp: "\u30C6\u30CB\u30B9",
    keys: [K(0, { y: -0.42, a1: 30, a1l: 40, a2: 40, a2l: 50, l1: 15, l1l: 5, l2: -15, l2l: -10 }), K(1.6, { y: -0.4, t: -20, h: -20, a1: -150, a1l: 160, a2: 175, a2l: 180, l1: 20, l1l: -20, l2: -10, l2l: -30 }, "io"), K(2, { y: -0.47, t: 15, h: 5, a1: 160, a1l: 170, a2: 60, a2l: 40, l1: 10, l1l: 5, l2: -40, l2l: -60 }, "snap"), K(2.5, { y: -0.42, t: 30, a1: 40, a1l: -20, a2: 20, a2l: 10, l1: 30, l1l: 5, l2: -40, l2l: -60 }, "out"), K(4, { y: -0.42, a1: 30, a1l: 40, a2: 40, a2l: 50, l1: 15, l1l: 5, l2: -15, l2l: -10 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const ball = b < 2 ? [0.15, -1.2 + Math.abs(b - 1.6) * 0.4] : [0.4 + (b - 2) * 1.5, -1.15 + (b - 2) * 0.5];
      return { front: [...toolPrims("racket", j.ha1, handDir(j), S, c, bg), ...b > 0.8 && b < 2.8 ? ballPrims("sball", ball, S, C.lime, bg) : []] };
    }
  },
  {
    id: "tabletennis",
    en: "TABLE TENNIS",
    jp: "\u5353\u7403",
    keys: [K(0, { y: -0.36, t: 25, a1: 40, a1l: 80, a2: 20, a2l: 90, l1: 30, l1l: -10, l2: -25, l2l: -30 }), K(1.6, { y: -0.35, t: 15, a1: -40, a1l: 20, a2: 20, a2l: 90, l1: 30, l1l: -10, l2: -25, l2l: -30 }, "io"), K(2, { y: -0.37, t: 35, a1: 110, a1l: 150, a2: 0, a2l: 60, l1: 35, l1l: -5, l2: -30, l2l: -35 }, "snap"), K(4, { y: -0.36, t: 25, a1: 40, a1l: 80, a2: 20, a2l: 90, l1: 30, l1l: -10, l2: -25, l2l: -30 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const ball = b < 2 ? [0.5 - b / 2 * 0.2, -0.6 - Math.sin(b / 2 * Math.PI) * 0.15] : [0.35 + (b - 2) * 1.2, -0.75 + (b - 2) * 0.2];
      return { front: [...toolPrims("paddle", j.ha1, handDir(j), S, c, bg), ...b < 3 ? ballPrims("tball", ball, S, C.lime, bg) : []] };
    }
  },
  {
    id: "skateboard",
    en: "SKATEBOARD",
    jp: "\u30B9\u30B1\u30DC\u30FC",
    keys: [K(0, { y: -0.4, t: 10, a1: 40, a1l: 50, a2: -40, a2l: -30, l1: 20, l1l: 0, l2: -25, l2l: -20 }), K(1.6, { y: -0.27, t: 30, a1: 60, a1l: 30, a2: -50, a2l: -20, l1: 75, l1l: -40, l2: 40, l2l: -60 }, "io"), K(2, { y: -0.72, t: 15, a1: 100, a1l: 80, a2: -80, a2l: -60, l1: 95, l1l: -10, l2: 60, l2l: -70 }, "snap"), K(2.8, { y: -0.62, t: 15, a1: 110, a1l: 100, a2: -90, a2l: -80, l1: 90, l1l: -20, l2: 50, l2l: -70 }), K(3.4, { y: -0.3, t: 25, a1: 60, a1l: 40, a2: -50, a2l: -20, l1: 70, l1l: -40, l2: 35, l2l: -60 }, "in"), K(4, { y: -0.4, t: 10, a1: 40, a1l: 50, a2: -40, a2l: -30, l1: 20, l1l: 0, l2: -25, l2l: -20 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const flip = b >= 2 && b < 3 ? (b - 2) * 360 : 0;
      return { front: boardPrims("board", j.ft1, j.ft2, S, c, bg, b >= 2 && b < 3.2 ? Math.sin((b - 2) * Math.PI) * -18 : 0).map((q) => flip && "tr" in q && q.tr ? { ...q, tr: q.tr + ` scale(1 ${Math.cos(flip * Math.PI / 180)})` } : q) };
    }
  },
  {
    id: "surfing",
    en: "SURFING",
    jp: "\u30B5\u30FC\u30D5\u30A3\u30F3",
    keys: [K(0, { y: -0.34, t: 20, h: -10, fr: 0, a1: 80, a1l: 70, a2: -70, a2l: -80, l1: 50, l1l: -10, l2: -30, l2l: -30 }), K(1.6, { y: -0.26, t: 40, h: -20, a1: 110, a1l: 80, a2: -90, a2l: -100, l1: 70, l1l: -40, l2: -10, l2l: -60 }, "io"), K(2, { y: -0.6, t: 5, h: 5, a1: 150, a1l: 160, a2: -120, a2l: -130, l1: 70, l1l: -30, l2: -20, l2l: -70, r: -15 }, "snap"), K(2.8, { y: -0.55, t: 10, a1: 140, a1l: 150, a2: -110, a2l: -120, l1: 70, l1l: -30, l2: -20, l2l: -70, r: -25 }), K(4, { y: -0.34, t: 20, h: -10, a1: 80, a1l: 70, a2: -70, a2l: -80, l1: 50, l1l: -10, l2: -30, l2l: -30 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      return { front: boardPrims("surf", j.ft1, j.ft2, S, c, bg, b >= 2 && b < 3 ? -20 : -4) };
    }
  },
  {
    id: "swimming",
    en: "SWIMMING",
    jp: "\u6C34\u6CF3",
    keys: Array.from({ length: 9 }, (_, i) => {
      const u = i / 8 * 4, ph = u * Math.PI;
      return { b: u, p: P({ y: -0.2, t: 90 + Math.sin(ph) * 12, h: -70 + Math.sin(ph) * 20, a1: 180 + 160 * Math.sin(ph / 1), a1l: 180 + 160 * Math.sin(ph / 1) + 20, a2: 180 + 160 * Math.sin(ph / 1) - 10, a2l: 180 + 160 * Math.sin(ph / 1) + 10, l1: -80 + Math.sin(ph * 2) * 20, l1l: -95 + Math.sin(ph * 2) * 30, l2: -80 + Math.sin(ph * 2) * 20, l2l: -95 + Math.sin(ph * 2) * 30 }), e: "lin" };
    }),
    draw: (_p, b, S, c) => ({ front: [{ k: "path", d: Array.from({ length: 13 }, (_, i) => `${i ? "L" : "M"}${(-0.9 + i * 0.15) * S},${(-0.17 + Math.sin(i * 1.2 + b * 3) * 0.015) * S}`).join(" "), stroke: c, sw: 0.012 * S, fill: "none", o: 0.8 }] })
  },
  {
    id: "rugby",
    en: "RUGBY",
    jp: "\u30E9\u30B0\u30D3\u30FC",
    keys: [...runKeys(8, 25).filter((k) => k.b <= 1.5), K(1.8, { y: -0.36, t: 50, a1: 100, a1l: 120, a2: 90, a2l: 120, l1: 60, l1l: -20, l2: -40, l2l: -70 }, "io"), K(2, { y: -0.22, t: 95, h: -10, a1: 175, a1l: 175, a2: 170, a2l: 175, l1: -20, l1l: -20, l2: -40, l2l: -40 }, "snap"), K(3, { y: -0.12, t: 92, h: -10, a1: 178, a1l: 178, a2: 172, a2l: 176, l1: -20, l1l: -20, l2: -40, l2l: -40 }, "out"), K(4, RUN(0, 25))],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const at = b < 1.8 ? [j.ha1[0] * 0.5 + j.neck[0] * 0.5 + 0.06, j.ha1[1] * 0.5 + j.neck[1] * 0.5] : [j.ha1[0] + 0.05, j.ha1[1]];
      return { front: ballPrims("oval", at, S, c, bg, b < 1.8 ? -20 : 0) };
    }
  },
  {
    id: "badminton",
    en: "BADMINTON",
    jp: "\u30D0\u30C9\u30DF\u30F3\u30C8\u30F3",
    keys: [K(0, { y: -0.4, t: 10, a1: 40, a1l: 60, a2: 30, a2l: 60, l1: 25, l1l: 0, l2: -25, l2l: -15 }), K(1.6, { y: -0.68, t: -18, h: -25, a1: -160, a1l: 150, a2: 160, a2l: 170, l1: 30, l1l: -50, l2: 0, l2l: -60 }, "out"), K(2, { y: -0.7, t: 20, h: 10, a1: 150, a1l: 120, a2: 40, a2l: 20, l1: 50, l1l: -20, l2: 10, l2l: -60 }, "snap"), K(2.8, { y: -0.43, t: 20, a1: 40, a1l: -10, a2: 20, a2l: 10, l1: 35, l1l: 0, l2: -25, l2l: -30 }, "in"), K(4, { y: -0.4, t: 10, a1: 40, a1l: 60, a2: 30, a2l: 60, l1: 25, l1l: 0, l2: -25, l2l: -15 })],
    draw: (p, b, S, c, bg) => {
      const j = fk(p);
      const sh = b < 2 ? [0.3, -1.6 + b * 0.25] : [0.4 + (b - 2) * 1.4, -1.1 + (b - 2) * 1];
      return { front: [...toolPrims("racket", j.ha1, handDir(j), S, c, bg), ...b < 3 ? ballPrims("shuttle", sh, S, c, bg, b < 2 ? 90 : 35) : []] };
    }
  },
  {
    id: "bmx",
    en: "BMX",
    jp: "BMX",
    keys: [K(0, { y: -0.62, t: 45, h: -25, a1: 95, a1l: 70, a2: 90, a2l: 65, l1: 40, l1l: -60, l2: 90, l2l: 0 }), K(1, { y: -0.62, t: 45, h: -25, a1: 95, a1l: 70, a2: 90, a2l: 65, l1: 90, l1l: 0, l2: 40, l2l: -60 }), K(1.7, { y: -0.55, t: 55, h: -25, a1: 100, a1l: 80, a2: 95, a2l: 75, l1: 60, l1l: -40, l2: 60, l2l: -40 }), K(2, { y: -1, t: 20, h: -5, a1: 150, a1l: 160, a2: -120, a2l: -130, l1: 60, l1l: -40, l2: 60, l2l: -40 }, "snap"), K(3, { y: -1, t: 20, a1: 150, a1l: 160, a2: -120, a2l: -130, l1: 60, l1l: -40, l2: 60, l2l: -40 }), K(4, { y: -0.62, t: 45, h: -25, a1: 95, a1l: 70, a2: 90, a2l: 65, l1: 40, l1l: -60, l2: 90, l2l: 0 })],
    draw: (p, b, S, c, bg) => {
      const lift = b >= 1.8 && b < 3.4 ? Math.sin(clamp01((b - 1.8) / 1.6) * Math.PI) * 0.4 : 0;
      return { back: bikePrims([p.x + 0.05, -0.2 - lift], S, c, bg, b * 6, b >= 2 && b < 3 ? -12 : 0) };
    }
  }
];
function sigPrims(sig, b, S, color, bg) {
  var _a, _b;
  const bb = (b % 4 + 4) % 4;
  const p = poseAt(sig.keys, bb);
  const d = sig.draw ? sig.draw(p, bb, S, color, bg) : {};
  return [...(_a = d.back) != null ? _a : [], ...figurePrims(p, { S, color, bg, glove: sig.glove }), ...(_b = d.front) != null ? _b : []];
}
function primsToSVG(list) {
  const a = (o) => o != null && o < 1 ? ` opacity="${o.toFixed(3)}"` : "";
  return list.map((q) => {
    var _a, _b, _c, _d, _e;
    if (q.k === "pl") return `<polyline points="${q.pts.map((v) => `${v[0].toFixed(1)},${v[1].toFixed(1)}`).join(" ")}" fill="none" stroke="${q.c}" stroke-width="${q.w.toFixed(1)}" stroke-linecap="${(_a = q.cap) != null ? _a : "round"}" stroke-linejoin="round"${a(q.o)}/>`;
    if (q.k === "rect") return `<rect x="${q.x.toFixed(1)}" y="${q.y.toFixed(1)}" width="${q.w.toFixed(1)}" height="${q.h.toFixed(1)}" rx="${q.rx.toFixed(1)}" fill="${q.fill}"${q.tr ? ` transform="${q.tr}"` : ""}${a(q.o)}/>`;
    if (q.k === "el") return `<ellipse cx="${q.cx.toFixed(1)}" cy="${q.cy.toFixed(1)}" rx="${q.rx.toFixed(1)}" ry="${q.ry.toFixed(1)}" fill="${(_b = q.fill) != null ? _b : "none"}"${q.stroke ? ` stroke="${q.stroke}" stroke-width="${((_c = q.sw) != null ? _c : 1).toFixed(1)}"` : ""}${q.tr ? ` transform="${q.tr}"` : ""}${a(q.o)}/>`;
    return `<path d="${q.d}" fill="${(_d = q.fill) != null ? _d : "none"}"${q.stroke ? ` stroke="${q.stroke}" stroke-width="${((_e = q.sw) != null ? _e : 1).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"` : ""}${q.tr ? ` transform="${q.tr}"` : ""}${a(q.o)}/>`;
  }).join("");
}
export {
  C,
  E,
  L,
  P,
  SIGS,
  STAND,
  ballPrims,
  bikePrims,
  boardPrims,
  clamp01,
  ease,
  figurePrims,
  fk,
  hash,
  lerp,
  mix,
  poseAt,
  primsToSVG,
  runPose,
  sigPrims,
  stickPrims,
  toolPrims,
  valAt
};
