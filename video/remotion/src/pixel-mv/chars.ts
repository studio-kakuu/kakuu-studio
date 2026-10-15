// 作品006 v2:キャラのドット絵(騎士・精霊術師・影狼・翼の影狼)。デザインは A・B・C の3案ずつ。
// 体は「関節の角度」で組み立てる(ポーズを切り替えて動かす)。頭は文字の地図で手描き。
// 向きは右向きが基本(左向きは描いたあとで左右反転)。角度は「真下 = 0°、前(右)へ回すと +」。
import { Buf, dither, hex } from "./px";

export type Variant = "A" | "B" | "C";
type Pal = Record<string, string>;
const P = (p: Pal) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, hex(v)]));

// ---------------- 人のポーズ ----------------
export type HPose = {
  y: number; // 腰の上下(+ で下がる)
  lean: number; // 胴の傾き(+ で前のめり)
  fa1: number; fa2: number; // 手前の腕(上腕・前腕)
  ba1: number; ba2: number; // 奥の腕
  fl1: number; fl2: number; // 手前の脚(もも・すね)
  bl1: number; bl2: number; // 奥の脚
  w: number; // 武器(剣・杖)の向き
  cape: number; // マント・髪のなびき(0=垂れる、1=後ろへ大きく)
  capeUp: number; // なびく向き(+ で上へ。落下中など)
  head: number; // 頭の上下のずれ
};
export const HSTAND: HPose = { y: 0, lean: 0, fa1: 20, fa2: 50, ba1: -10, ba2: 10, fl1: 6, fl2: 0, bl1: -6, bl2: 0, w: 135, cape: 0.15, capeUp: 0, head: 0 };
export const hp = (p: Partial<HPose>): HPose => ({ ...HSTAND, ...p });

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (a: number) => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: number[], a: number, l: number) => {
  const d = dir(a);
  return [p[0] + d[0] * l, p[1] + d[1] * l];
};

type HumanDesign = {
  kind: "knight" | "mage";
  v: Variant;
  head: string[];
  neck: [number, number]; // 頭の地図の中で首がつく位置
  legU: number; legL: number; torso: number; arm1: number; arm2: number;
  limb: number; shoulderW: number; hipW: number;
  pal: Pal; // 体の色(頭の地図の文字もここ)
  outline: string;
  detail: number; // 0〜2(描き込みの細かさ)
};

// ---------- 頭の地図 ----------
// k=線 H/h/L=髪(基本/影/光) S/s=肌 W=白目 E/e=瞳 C/c=サークレット G=宝石 m=口 R=耳 F/f=花 V=葉
const KNIGHT_HEAD: Record<Variant, string[]> = {
  A: [
    "......hhHHHh....",
    "....hHHLLLLHHh..",
    "...hHHLLHHHHHHh.",
    "..hHHHHHHHHHHHHh",
    "..hHcCCCCCGCCCHh",
    ".hHHhHHHhHHHhHHh",
    ".hHHHhHHHhHHHhHh",
    ".hHHhHSHhSHHShHh",
    ".hHHhSSkkSSSkkHh",
    ".hHHhSWEeSSWEeHh",
    ".hHhhSWEeSSWEeSh",
    ".hHhhSSSSSSSSSh.",
    "..hHhsSSSSmmSSh.",
    "..hHhhsSSSSSsh..",
    "...hh..ssSSs....",
    "........sS......",
  ],
  B: [
    "....hhHHh...",
    "..hHHLLLHHh.",
    ".hHHLHHHHHHh",
    ".hHcCCCGCCHh",
    "hHHhHHhHHhHh",
    "hHHHhHHhHHhh",
    "hHhHSkkSSkkh",
    "hHhSSWESSWEh",
    "hHhhSWeSSWeS",
    ".hHhSSSSSSSh",
    ".hhhsSSSmSS.",
    "..hh.sSSSs..",
    "......sS....",
  ],
  C: [
    "...hhHHh..",
    ".hHHLLLHh.",
    "hHHLHHHHHh",
    "hHcCCGCCch",
    "hHhHhHHhHh",
    "hHHhHSHhHh",
    "hHhSkkSkkS",
    "hHhSWeSWeS",
    "hHhhSSSSSs",
    ".hhhsSSmSs",
    ".h..ssSSs.",
    "......sS..",
  ],
};
const MAGE_HEAD: Record<Variant, string[]> = {
  A: [
    "....VFfVVFV.....",
    "...FfHHLLHHFf...",
    "..VHHLLLHHHHHV..",
    "..hHHLHHHHHHHHh.",
    ".hHHHHHHHHHHHHh.",
    ".hHHhHHHhHHHhHHh",
    ".hHHHhHHHhHHHhHh",
    "RhHHhHSHhSHHShHh",
    ".RhHhSSkkSSSkkHh",
    ".hHHhSWEeSSWEeHh",
    ".hHhhSWEeSSWEeSh",
    ".hHhhSSSSSSSSSh.",
    ".hHHhsSSSSmSSSh.",
    ".hHHhhsSSSSSsh..",
    ".hHHh..ssSSs....",
    "..hHh...sS......",
  ],
  B: [
    "...VFfVFV...",
    "..FHHLLHHFf.",
    ".hHHLHHHHHHh",
    ".hHHHHHHHHHh",
    "hHHhHHhHHhHh",
    "hHHHhHHhHHhh",
    "RHhHSkkSSkkh",
    "hRhSSWESSWEh",
    "hHhhSWeSSWeS",
    "hHHhSSSSSSSh",
    "hHhhsSSSmSS.",
    "hHhh.sSSSs..",
    ".hh...sS....",
  ],
  C: [
    "..VFfVFV..",
    ".FHHLLHHf.",
    "hHHLHHHHHh",
    "hHHHHHHHHh",
    "hHhHhHHhHh",
    "RHHhHSHhHh",
    "hRhSkkSkkS",
    "hHhSWeSWeS",
    "hHhhSSSSSs",
    "hHhhsSSmSs",
    "hHh.ssSSs.",
    ".hh...sS..",
  ],
};

const KNIGHT: Record<Variant, Omit<HumanDesign, "head" | "neck">> = {
  A: {
    kind: "knight", v: "A", legU: 4, legL: 4, torso: 8, arm1: 4, arm2: 4, limb: 3.4, shoulderW: 11, hipW: 8, outline: "#2a2034", detail: 0,
    pal: { H: "#ffd860", h: "#e0a030", L: "#fff4b0", S: "#ffdcbc", s: "#f0a888", W: "#ffffff", E: "#3a8cff", e: "#1a3a8a", k: "#4a3020", m: "#d06060",
      C: "#f4f8ff", c: "#a8b4cc", G: "#3a8cff", A: "#cfd8ea", a: "#8a98b6", B: "#4a8cf0", b: "#2a5ab8", K: "#ffffff", Q: "#c8d6ec", Y: "#ffd040", y: "#c08a18", X: "#ffffff", x: "#a8b6d0", N: "#6a4a30" },
  },
  B: {
    kind: "knight", v: "B", legU: 6, legL: 6, torso: 11, arm1: 5, arm2: 5, limb: 3.4, shoulderW: 12, hipW: 8, outline: "#1c1424", detail: 1,
    pal: { H: "#f2c84a", h: "#c08a28", L: "#fbe9a0", S: "#f8d0b0", s: "#d8a080", W: "#ffffff", E: "#3070e0", e: "#183070", k: "#3a2418", m: "#b85050",
      C: "#e8eef8", c: "#8c98b0", G: "#3070e0", A: "#d4dcec", a: "#8692b0", B: "#2f63c0", b: "#1f3f80", K: "#ffffff", Q: "#dde3ec", Y: "#ffc83a", y: "#b07a14", X: "#f4f8ff", x: "#9aa6be", N: "#5a3a24", Z: "#ffffff" },
  },
  C: {
    kind: "knight", v: "C", legU: 7, legL: 8, torso: 13, arm1: 6, arm2: 6, limb: 3.4, shoulderW: 12, hipW: 8, outline: "#120c18", detail: 2,
    pal: { H: "#e8b840", h: "#a06c18", L: "#f8e090", S: "#f0c4a0", s: "#c88a68", W: "#f4f4ff", E: "#2a5cc8", e: "#122a60", k: "#2a1810", m: "#a04848",
      C: "#d8e0ec", c: "#6c7890", G: "#3a74e0", A: "#aab6cc", a: "#5e6a86", B: "#24489a", b: "#142a60", K: "#e4e8f0", Q: "#9aa4b8", Y: "#e0b030", y: "#8a5a10", X: "#f4f8ff", x: "#7c88a0", N: "#4a2a18" },
  },
};
const MAGE: Record<Variant, Omit<HumanDesign, "head" | "neck">> = {
  A: {
    kind: "mage", v: "A", legU: 4, legL: 4, torso: 8, arm1: 4, arm2: 4, limb: 3, shoulderW: 7, hipW: 6, outline: "#1e2a24", detail: 0,
    pal: { H: "#f0f4fa", h: "#b4bccc", L: "#ffffff", S: "#ffe2cc", s: "#f2b498", W: "#ffffff", E: "#18d08a", e: "#0a7050", k: "#5a4a5a", m: "#e07070", R: "#ffd2b8",
      F: "#ffffff", f: "#ffe060", V: "#58cc6a", A: "#46c070", a: "#268a48", B: "#f6fff8", b: "#c8e4d0", N: "#9a6a38", n: "#6a4220", O: "#7aeaa0" },
  },
  B: {
    kind: "mage", v: "B", legU: 6, legL: 6, torso: 11, arm1: 5, arm2: 5, limb: 3, shoulderW: 8, hipW: 6, outline: "#16201c", detail: 1,
    pal: { H: "#e4e8f0", h: "#a8b0c4", L: "#ffffff", S: "#fad6bc", s: "#dca486", W: "#ffffff", E: "#12b878", e: "#085c40", k: "#4a3a48", m: "#c86060", R: "#f2c6aa",
      F: "#ffffff", f: "#ffd848", V: "#48b058", A: "#3a9f58", a: "#216e3a", B: "#eef8f0", b: "#b4d2bc", N: "#8a5a30", n: "#5a3418", O: "#6ad890" },
  },
  C: {
    kind: "mage", v: "C", legU: 7, legL: 8, torso: 13, arm1: 6, arm2: 6, limb: 3, shoulderW: 8, hipW: 6, outline: "#0e1612", detail: 2,
    pal: { H: "#d4dae6", h: "#8a94aa", L: "#f8fbff", S: "#f2caae", s: "#c89276", W: "#f4fff8", E: "#0ea06a", e: "#064a34", k: "#3a2a38", m: "#a85050", R: "#e6b89c",
      F: "#f8f8f0", f: "#f0c838", V: "#3c9a4c", A: "#2e8a4c", a: "#185a2e", B: "#e2f0e6", b: "#98b8a2", N: "#7a4e28", n: "#4a2a12", O: "#58c47e" },
  },
};

const headNeck = (rows: string[]): [number, number] => {
  // 一番下の行の肌の位置を首にする
  const last = rows[rows.length - 1];
  const i = last.search(/[sS]/);
  return [i + 1, rows.length - 1];
};
export const humanDesign = (kind: "knight" | "mage", v: Variant): HumanDesign => {
  const base = kind === "knight" ? KNIGHT[v] : MAGE[v];
  const head = kind === "knight" ? KNIGHT_HEAD[v] : MAGE_HEAD[v];
  return { ...base, head, neck: headNeck(head) };
};

// ---------------- 人を描く ----------------
export type HumanOpts = { glow?: string; silhouette?: string; weapon?: boolean; flash?: boolean };
/**
 * ポーズの人を新しい小さな絵(Buf)に描いて返す。足元の中心は (ox, oy)。
 * 戻り値の hand は剣・杖の先の位置(エフェクトを出すため)
 */
export const drawHuman = (d: HumanDesign, pose: HPose, opts: HumanOpts = {}) => {
  const W = 72;
  const H = 72;
  const b = new Buf(W, H);
  const pal = P(d.pal);
  const ox = 36;
  const oy = 62;
  const legLen = d.legU + d.legL;
  const hip = [ox, oy - legLen + pose.y];
  const neck = add(hip, 180 - pose.lean, d.torso);
  const td = dir(180 - pose.lean);
  const nx = -td[1]; // 胴の横向き(右向きの体の前方向)
  const ny = td[0];
  const sh = [neck[0] + td[0] * -1, neck[1] + td[1] * -1]; // 肩は首より少し下
  const shoulderF = [sh[0] + nx * 1, sh[1] + ny * 1];
  const shoulderB = [sh[0] - nx * 2, sh[1] - ny * 2];
  const hipF = [hip[0] + 1, hip[1]];
  const hipB = [hip[0] - 1, hip[1]];
  const limbT = d.limb;

  const leg = (p0: number[], a1: number, a2: number, c: number, boot: number) => {
    const knee = add(p0, a1, d.legU);
    const foot = add(knee, a2, d.legL);
    b.line(p0[0], p0[1], knee[0], knee[1], c, limbT + 0.6);
    b.line(knee[0], knee[1], foot[0], foot[1], boot, limbT);
    // 足先(前へ)
    b.line(foot[0] - 1, foot[1], foot[0] + 2, foot[1], boot, 2);
    return foot;
  };
  const arm = (p0: number[], a1: number, a2: number, c: number, hand: number) => {
    const el = add(p0, a1, d.arm1);
    const wr = add(el, a2, d.arm2);
    b.line(p0[0], p0[1], el[0], el[1], c, limbT);
    b.line(el[0], el[1], wr[0], wr[1], c, limbT - (d.kind === "mage" ? -1 : 0.4));
    b.disc(wr[0], wr[1], 1.4, hand);
    return wr;
  };

  // ---- 1. 後ろ:マント(騎士)/長い髪(精霊術師) ----
  if (d.kind === "knight") {
    const len = legLen + d.torso * 0.6;
    const back = 4 + pose.cape * 16;
    const up = pose.capeUp;
    const tip1 = [shoulderB[0] - back, shoulderB[1] + len - up * 10 - pose.cape * 6];
    const tip2 = [shoulderB[0] - back * 0.4 - 1, shoulderB[1] + len + 1 - up * 8];
    b.poly([[shoulderB[0] + 1, shoulderB[1] - 1], [shoulderF[0], shoulderF[1]], [tip2[0] + 3, tip2[1]], tip2, tip1, [shoulderB[0] - 3, shoulderB[1] + 2]], pal.K);
    b.line(shoulderB[0] - 1, shoulderB[1] + 2, (tip1[0] + tip2[0]) / 2, (tip1[1] + tip2[1]) / 2, pal.Q, d.detail > 0 ? 2 : 1);
    if (d.detail > 1) b.line(tip1[0], tip1[1], tip2[0], tip2[1], pal.Q, 1);
  } else {
    // 長いウェーブの髪:頭の後ろから腰の下まで流れる(外側だけ波打つ)
    const hx0 = Math.round(neck[0] - d.neck[0]);
    const hy0 = Math.round(neck[1] - d.neck[1] + pose.head);
    const hw0 = Math.max(...d.head.map((r) => r.length));
    const y0 = hy0 + 3;
    const len = d.head.length - 3 + d.torso + legLen * 0.45;
    for (let i = 0; i < len; i++) {
      const k = i / len;
      const flow = k * k * (2 + pose.cape * 14);
      const xr = hx0 + hw0 * 0.45 - k * 3 - flow * 0.6;
      const xl = hx0 + 1 - Math.sin(k * Math.PI) * (d.v === "A" ? 3 : 2.5) - flow + Math.sin(i * 0.55) * 1.2;
      const y = y0 + i - k * pose.capeUp * 10 - k * pose.cape * 5;
      for (let x = Math.floor(xl); x <= xr; x++) {
        const strand = d.detail > 0 && (x - Math.floor(xl) + Math.floor(i / 5)) % 3 === 0;
        b.set(x, y, strand ? pal.h : x === Math.floor(xl) + 1 && d.detail > 1 && i % 4 < 2 ? pal.L : pal.H);
      }
    }
  }

  // ---- 2. 奥の腕・奥の脚(少し暗い色) ----
  const dark = d.kind === "knight" ? pal.a : pal.a;
  const bootC = d.kind === "knight" ? pal.a : pal.n;
  if (d.kind === "knight") leg(hipB, pose.bl1, pose.bl2, pal.b, bootC);
  else leg(hipB, pose.bl1, pose.bl2, pal.b, pal.a);
  arm(shoulderB, pose.ba1, pose.ba2, d.kind === "knight" ? dark : pal.b, d.kind === "knight" ? pal.a : pal.s);

  // ---- 3. 胴 ----
  const tw = d.shoulderW / 2;
  const hw = d.hipW / 2;
  const P4 = (p: number[], s: number) => [p[0] + nx * s, p[1] + ny * s];
  if (d.kind === "knight") {
    // 鎧の胴(明るい銀)+青い前垂れ。マント(白)との境目に線を入れる
    const ol = hex(d.outline);
    b.poly([P4(add(neck, 180 - pose.lean, 1), -tw - 1), P4(add(neck, 180 - pose.lean, 1), tw + 1), P4(add(hip, 180 - pose.lean, -1), hw + 1), P4(add(hip, 180 - pose.lean, -1), -hw - 1)], ol);
    b.poly([P4(neck, -tw), P4(neck, tw), P4(hip, hw), P4(hip, -hw)], pal.A);
    b.poly([P4(neck, -tw + 1), P4(neck, -1), P4(hip, -1), P4(hip, -hw)], pal.a);
    const tab = add(hip, pose.fl1 * 0.5, d.legU + (d.detail > 0 ? 2 : 1));
    b.poly([P4(add(neck, 180 - pose.lean, -2), -1.5), P4(add(neck, 180 - pose.lean, -2), 2), [tab[0] + 2.5, tab[1]], [tab[0] - 1.5, tab[1]]], pal.B);
    if (d.detail > 0) b.line(...(P4(add(neck, 180 - pose.lean, -2), 0.5) as [number, number]), tab[0] + 0.5, tab[1], pal.b, 1);
    // ベルトと胸の金の飾り
    const belt = add(hip, 180 - pose.lean, 1);
    b.line(...(P4(belt, -hw) as [number, number]), ...(P4(belt, hw) as [number, number]), pal.N, 1);
    const chest = add(neck, 180 - pose.lean, -3);
    b.set(chest[0] + 0.5, chest[1], pal.Y);
    if (d.detail > 1) b.set(chest[0] + 0.5, chest[1] + 1, pal.y);
    // 肩当て
    // 胸の光(銀のつや)
    if (d.detail > 0) {
      const c0 = P4(add(neck, 180 - pose.lean, -1), tw - 2);
      b.line(c0[0], c0[1], c0[0] - td[0] * 3, c0[1] - td[1] * 3, pal.X, 1);
    }
  } else {
    // ドレス:緑の上衣+白い重ね布のスカート(地面近くまで)
    b.poly([P4(neck, -tw + 0.5), P4(neck, tw - 0.5), P4(hip, hw), P4(hip, -hw)], pal.A);
    const hem = oy + pose.y * 0.6 - 1;
    const flare = 4 + legLen * 0.35 + pose.cape * 3;
    const sway = -pose.cape * 4 - pose.lean * 0.05;
    b.poly([P4(hip, -hw - 0.5), P4(hip, hw + 0.5), [hip[0] + hw + flare * 0.6 + sway * 0.3, hem], [hip[0] - hw - flare + sway, hem + 1]], pal.B);
    b.poly([P4(hip, -1), P4(hip, hw), [hip[0] + hw + flare * 0.35, hem], [hip[0] - 2 + sway * 0.5, hem]], pal.A);
    if (d.detail > 0) b.line(hip[0] - hw - 1, hip[1], hip[0] + hw + 1, hip[1], pal.O, 1);
    if (d.detail > 1) b.line(hip[0], hip[1] + 2, hip[0] + hw + flare * 0.3, hem - 1, pal.a, 1);
  }

  // ---- 4. 手前の脚 ----
  if (d.kind === "knight") {
    const ol = hex(d.outline);
    const kn = add(hipF, pose.fl1, d.legU);
    const ft = add(kn, pose.fl2, d.legL);
    b.line(hipF[0], hipF[1], kn[0], kn[1], ol, limbT + 2);
    b.line(kn[0], kn[1], ft[0], ft[1], ol, limbT + 1.4);
    leg(hipF, pose.fl1, pose.fl2, pal.B, pal.A);
  }
  else {
    // スカートの下から足先だけ
    const knee = add(hipF, pose.fl1, d.legU);
    const foot = add(knee, pose.fl2, d.legL);
    if (pose.y < -3 || Math.abs(pose.fl1) > 30) b.line(knee[0], knee[1], foot[0], foot[1], pal.S, 2);
    b.line(foot[0] - 1, foot[1], foot[0] + 2, foot[1], pal.a, 2);
  }

  // ---- 5. 頭 ----
  const hx = Math.round(neck[0] - d.neck[0]);
  const hy = Math.round(neck[1] - d.neck[1] + pose.head);
  b.map(d.head, pal, hx, hy);

  // 剣:金のつば・青い柄・羽根の飾り・白銀の刃。体と重ならないよう、剣だけ別に輪郭をつけて重ねる
  const drawSword = () => {
    const sb = new Buf(W, H);
    const bladeL = d.v === "A" ? 13 : d.v === "B" ? 16 : 18;
    const base = add(wr0, pose.w, 2);
    const tp = add(base, pose.w, bladeL);
    const pom = add(wr0, pose.w, -3);
    const g = dir(pose.w + 90);
    // 刃(白銀+影の線)。先はとがる
    const nearTip = add(base, pose.w, bladeL - 2);
    sb.line(base[0], base[1], nearTip[0], nearTip[1], pal.X, 2.4);
    sb.line(nearTip[0], nearTip[1], tp[0], tp[1], pal.X, 1);
    sb.line(base[0] + g[0] * 0.6, base[1] + g[1] * 0.6, nearTip[0] + g[0] * 0.6, nearTip[1] + g[1] * 0.6, pal.x, 1);
    // 柄(青)と柄頭(金)
    sb.line(pom[0], pom[1], base[0], base[1], pal.B, 1.6);
    sb.disc(pom[0], pom[1], 1.1, pal.Y);
    // 羽根の飾り(白い羽根が左右に開く)
    const wing = (s: number) => {
      const w0 = [base[0] + g[0] * 3 * s, base[1] + g[1] * 3 * s];
      const back = dir(pose.w + 180);
      const w1 = [w0[0] + g[0] * 3 * s + back[0] * 1.5, w0[1] + g[1] * 3 * s + back[1] * 1.5];
      const w2 = [w0[0] + back[0] * 3.5 + g[0] * 1.5 * s, w0[1] + back[1] * 3.5 + g[1] * 1.5 * s];
      sb.poly([w0, w1, w2], pal.Z);
      sb.line(w0[0], w0[1], (w1[0] + w2[0]) / 2, (w1[1] + w2[1]) / 2, pal.Q, 1);
    };
    wing(1);
    wing(-1);
    // つば(金・太め)と青い宝石
    sb.line(base[0] - g[0] * 3.5, base[1] - g[1] * 3.5, base[0] + g[0] * 3.5, base[1] + g[1] * 3.5, pal.Y, 2.2);
    sb.line(base[0] - g[0] * 3, base[1] - g[1] * 3 + 0.8, base[0] + g[0] * 3, base[1] + g[1] * 3 + 0.8, pal.y, 1);
    sb.set(base[0], base[1], pal.G);
    sb.outline(hex(d.outline));
    b.blit(sb, 0, 0);
    b.disc(wr0[0], wr0[1], 1.4, pal.a); // 剣を握る手
  };

  // ---- 6. 武器と手前の腕 ----
  const wr0 = add(add(shoulderF, pose.fa1, d.arm1), pose.fa2, d.arm2);
  let tip = wr0;
  if (opts.weapon !== false) {
    if (d.kind === "knight") {
      const bladeL = d.v === "A" ? 13 : d.v === "B" ? 16 : 18;
      tip = add(add(wr0, pose.w, 2), pose.w, bladeL);
    } else {
      // 木の杖:手の位置から上下にのびる。先端は巻いて葉がつく
      const L1 = d.v === "A" ? 20 : d.v === "B" ? 24 : 27;
      const top = add(wr0, pose.w, L1 * 0.62);
      const bot = add(wr0, pose.w + 180, L1 * 0.38);
      tip = top;
      b.line(bot[0], bot[1], top[0], top[1], pal.N, 1.6);
      if (d.detail > 0) b.line(bot[0] + 0.5, bot[1], top[0] + 0.5, top[1], pal.n, 1);
      const c1 = add(top, pose.w + 60, 2);
      const c2 = add(c1, pose.w + 150, 2);
      b.line(top[0], top[1], c1[0], c1[1], pal.N, 1.6);
      b.line(c1[0], c1[1], c2[0], c2[1], pal.N, 1.4);
      b.set(top[0] - 1, top[1] + 1, pal.V);
      b.set(c1[0] + 1, c1[1], pal.V);
      if (d.detail > 0) b.set(c2[0], c2[1] + 1, pal.O);
    }
  }
  if (d.kind === "knight") {
    // 手前の腕は体と重なるので、先に線の色で一回り太く描いて輪郭を出す
    const ol = hex(d.outline);
    const el = add(shoulderF, pose.fa1, d.arm1);
    b.line(shoulderF[0], shoulderF[1], el[0], el[1], ol, limbT + 1.6);
    b.line(el[0], el[1], wr0[0], wr0[1], ol, limbT + 1.2);
    arm(shoulderF, pose.fa1, pose.fa2, pal.A, pal.a);
    b.disc(shoulderF[0], shoulderF[1] + 0.5, d.v === "A" ? 2.6 : 2.4, pal.A);
    b.set(shoulderF[0], shoulderF[1] - 1, pal.X);
    b.set(shoulderF[0] + 1, shoulderF[1] - 1, pal.X);
    if (opts.weapon !== false) drawSword();
  }
  else {
    // ゆったりした袖(白い布)
    const el = add(shoulderF, pose.fa1, d.arm1);
    const wr = add(el, pose.fa2, d.arm2);
    b.line(shoulderF[0], shoulderF[1], el[0], el[1], pal.A, 2.4);
    const sd = dir(pose.fa2 + 90);
    b.poly([[el[0] - sd[0], el[1] - sd[1]], [el[0] + sd[0], el[1] + sd[1]], [wr[0] + sd[0] * 2.2, wr[1] + sd[1] * 2.2], [wr[0] - sd[0] * 2.2, wr[1] - sd[1] * 2.2]], pal.B);
    b.disc(wr[0], wr[1], 1.2, pal.S);
  }

  if (opts.silhouette) b.tint(hex(opts.silhouette));
  b.outline(hex(opts.flash ? "#ffffff" : d.outline));
  if (opts.flash) b.tint(hex("#ffffff"));
  return { buf: b, ox, oy, tip: [tip[0] - ox, tip[1] - oy], hand: [wr0[0] - ox, wr0[1] - oy] };
};

// ---------------- 影狼 ----------------
export type WPose = {
  y: number; // 体の上下(+ で下がる)
  tilt: number; // 体の傾き(+ で頭が上がる)
  fl1: number; fl2: number; fl3: number; // 前脚(手前):肩・ひじ・足首
  fb1: number; fb2: number; fb3: number; // 前脚(奥)
  hl1: number; hl2: number; hl3: number; // 後ろ脚(手前)
  hb1: number; hb2: number; hb3: number; // 後ろ脚(奥)
  jaw: number; // 口の開き 0〜1
  neck: number; // 首の角度(+ で上)
  tail: number; // しっぽのゆれ(位相)
  wing: number; // 翼の開き(-1 たたむ 〜 1 大きく上)
  headRot?: number; // 頭の回転(度。- で鼻先が上=のけぞる・吠える)
};
// 脚の角度は「真下 = 0°、前へ +」。3つの関節は親からの相対
export const WSTAND: WPose = { y: 0, tilt: 0, fl1: 10, fl2: -14, fl3: 30, fb1: -6, fb2: -8, fb3: 26, hl1: -24, hl2: 42, hl3: -30, hb1: -12, hb2: 38, hb3: -26, jaw: 0.2, neck: 30, tail: 0, wing: 0.3 };
export const wp = (p: Partial<WPose>): WPose => ({ ...WSTAND, ...p });

type WolfDesign = { v: Variant; head: string[]; jawRow: number; pal: Pal; outline: string; detail: number; spikes: number; L: number; BH: number; leg: number[]; thigh: number };
// 横顔(右向き)。B/b=黒い毛 D=毛の光 R=赤い目 r=目の光 T=歯 M=口の中 P/p/Q=結晶 n=鼻
const WOLF_HEAD: Record<Variant, string[]> = {
  A: [
    "..bb.....bb.........",
    "..bBb...bBBb........",
    "..bBBb.bBBBb........",
    "..bBBBbBBBBBb.......",
    ".bBBBBBBBBBBBb......",
    ".bBBBBBBRRrBBBb.....",
    "bBBDBBBBRRRBBBBBBb..",
    "bBBBBBBBBBBBBBBBBBn.",
    "bBBBBBBBBBBBBBBBBBnn",
    ".bBBBBBBMTMTMTMTMM..",
    ".bBBBBBBMMMMMMMMM...",
    "..bBBBBBBTMTMTMTM...",
    "...bBBBBBBBBBBBB....",
    "....bBBBBBBBBBb.....",
  ],
  B: [
    "..bb.....b..............",
    "..bBb...bBb.............",
    "..bBBb.bBBBb............",
    "..bBDBbBBDBBb...........",
    "..bBBBBBBBBBBb..........",
    ".bBBBBBBBBBBBBb.........",
    ".bBBBDBBBBRRrBBBb.......",
    "bBBBBBBBBBBRRBBBBBBBBb..",
    "bBBDBBBBBBBBBBBBBBBBBBn.",
    "bBBBBBDBBBBBBBBBBBBBBBnn",
    ".bBBBBBBBBBBBBBBBBBBBBB.",
    ".bBBBBBBBBTMTMTMTMTMM...",
    "..bBBBBBBBMMMMMMMMMM....",
    "..bBBBBBBBTMTMTMTMT.....",
    "...bBBBBBBBBBBBBBBB.....",
    "....bBBBBBBBBBBBB.......",
    ".....bBBBBBBBBb.........",
  ],
  C: [
    "..bb......b...............",
    "..bBb....bBb..............",
    "..bBBb..bBBBb.............",
    "..bBDBb.bBDBBb............",
    "..bBBDBbBBBDBBb...........",
    ".bBBBBBBBBBBBBBb..........",
    ".bBBDBBBBBQPBBBBb.........",
    ".bBBBBDBBBBBRRrBBBb.......",
    "bBBDBBBBBBBBBRRRBBBBBBBb..",
    "bBBBBDBBBBDBBBBBBBBBBBBBn.",
    "bBDBBBBBBBBBBBDBBBBBBBBBnn",
    ".bBBBDBBBBBBBBBBBBBBBBBBB.",
    ".bBBBBBBBBBBTMTMTMTMTMTM..",
    "..bBBDBBBBBBMMMMMMMMMMM...",
    "..bBBBBBBBBBMMMMMMMMMM....",
    "...bBBBBBBBBTMTMTMTMT.....",
    "...bBBDBBBBBBBBBBBBBB.....",
    "....bBBBBBBBBBBBBBB.......",
    ".....bbBBBBBBBBbb.........",
  ],
};
const WOLF: Record<Variant, Omit<WolfDesign, "head" | "jawRow">> = {
  // leg = [肩〜ひじ, ひじ〜足首, 足首〜足先]
  A: { v: "A", outline: "#22142e", detail: 0, spikes: 5, L: 40, BH: 24, leg: [13, 12, 6], thigh: 8,
    pal: { B: "#3a2c52", b: "#241a36", D: "#5a4880", R: "#ff4050", r: "#ffd0d6", T: "#f6f2ff", M: "#a03060", P: "#c070ff", p: "#8040d8", Q: "#f2d4ff", n: "#160c20", S: "#9a58f0", s: "#6630b8" } },
  B: { v: "B", outline: "#140a1e", detail: 1, spikes: 7, L: 46, BH: 26, leg: [15, 14, 6], thigh: 9,
    pal: { B: "#251c34", b: "#160f20", D: "#40345a", R: "#ff2a3a", r: "#ffb0b8", T: "#ece8f8", M: "#6a1f3a", P: "#9b4dff", p: "#5a1fa0", Q: "#e0b0ff", n: "#0a0610", S: "#7c40d8", s: "#46208c" } },
  C: { v: "C", outline: "#08050c", detail: 2, spikes: 9, L: 50, BH: 28, leg: [17, 15, 7], thigh: 10,
    pal: { B: "#1a1322", b: "#0d0913", D: "#382c4c", R: "#ff1830", r: "#ff9aa6", T: "#e2dcf0", M: "#5a1430", P: "#8a3cf0", p: "#4a1488", Q: "#d8a0ff", n: "#050308", S: "#6a30c8", s: "#34126e" } },
};
const RIM_IN: Record<Variant, string> = { A: "#6e48b0", B: "#5e3aa4", C: "#553496" };
const RIM_OUT: Record<Variant, string> = { A: "#6a32b8", B: "#5c28a8", C: "#52209c" };
export const wolfDesign = (v: Variant): WolfDesign => ({ ...WOLF[v], head: WOLF_HEAD[v], jawRow: WOLF_HEAD[v].findIndex((r) => r.includes("M")) });

/** 影狼(winged=true で翼の影狼)を描く。足元の中心は (ox, oy)。fade(0〜1)で結晶の粒に崩れる */
export const drawWolf = (d: WolfDesign, pose: WPose, opts: { winged?: boolean; silhouette?: string; flash?: boolean; fade?: number; t?: number } = {}) => {
  const W = 200;
  const H = 170;
  const b = new Buf(W, H);
  const pal = P(d.pal);
  const ox = 96;
  const oy = 158;
  const { L, BH } = d;
  // 立ったときに足が地面に届く高さ
  const reach = (a1: number, a2: number, a3: number) => d.leg[0] * Math.cos(rad(a1)) + d.leg[1] * Math.cos(rad(a1 + a2)) + d.leg[2] * 0.3;
  const stand = reach(WSTAND.fl1, WSTAND.fl2, WSTAND.fl3);
  const cy = oy - stand - BH * 0.2 + pose.y;
  const along = dir(90 + pose.tilt);
  const upv = [-along[1] * -1, -along[0]]; // 体の上方向
  const at = (u: number, v: number) => [ox + along[0] * u + upv[0] * v, cy + along[1] * u + upv[1] * v];

  // しっぽ(紫の煙):おしりから後ろ上へうねって、先は薄く消える
  const tb = at(-L * 0.5, BH * 0.25);
  const puff = (x: number, y: number, r: number, c: number, a: number) => {
    for (let yy = Math.floor(y - r); yy <= y + r; yy++)
      for (let xx = Math.floor(x - r); xx <= x + r; xx++)
        if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r && dither(xx, yy, a)) b.set(xx, yy, c);
  };
  // ふさふさの根元 → 上へ立ちのぼってから後ろへ巻く煙。丸い煙のかたまりを間をあけて並べ、先は間引いて消える
  const n = 8;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const ph = pose.tail;
    const x = tb[0] - 3 - k * 36 + Math.sin(ph + k * 5) * 2;
    const y = tb[1] - 2 - Math.sin(k * Math.PI * 0.85) * 22 + Math.sin(ph * 1.4 + k * 4) * 3 * k;
    const r = k < 0.12 ? 4.5 : 2.6 + ((i * 7) % 3) * 0.8 + Math.sin(k * Math.PI) * 1.6;
    const a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.45;
    puff(x, y, r, k < 0.15 ? pal.B : i % 2 ? pal.S : pal.s, a);
    if (d.detail > 0 && k >= 0.15) puff(x - r * 0.35, y - r * 0.35, r * 0.45, pal.S, a);
    if (d.detail > 1 && k >= 0.15 && i % 2 === 0) b.set(x - r * 0.5, y - r * 0.6, pal.Q);
    // 細い煙の筋
    if (i > 1 && d.detail > 0) {
      const w = add([x, y], 240 + Math.sin(ph + i) * 30, r + 3);
      b.line(x, y, w[0], w[1], pal.s, 1);
    }
  }

  // 翼(結晶の羽根)
  // 翼:紫の結晶の羽根が1枚ずつすき間をあけて並ぶ(板に見えないように)
  const wing = (front: boolean) => {
    const root = at(L * 0.18 + (front ? 0 : -6), BH * 0.62 + (front ? 0 : 2));
    const sp = pose.wing;
    const a1 = 195 - sp * 40 + (front ? 0 : 16);
    const el = add(root, a1, 16 + (d.v === "C" ? 4 : d.v === "B" ? 2 : 0));
    const a2 = a1 + 40 - sp * 12;
    const tip = add(el, a2, 18 + (d.v === "C" ? 6 : d.v === "B" ? 3 : 0));
    const cMain = front ? pal.P : pal.p;
    const cEdge = front ? pal.Q : pal.P;
    const cDark = front ? pal.p : pal.s;
    const n = d.v === "A" ? 5 : d.v === "B" ? 6 : 7;
    // 骨(黒い腕)
    b.line(root[0], root[1], el[0], el[1], front ? pal.B : pal.b, 3.4);
    b.line(el[0], el[1], tip[0], tip[1], front ? pal.B : pal.b, 2.4);
    for (let i = n - 1; i >= 0; i--) {
      const k = i / (n - 1);
      const t = 0.15 + k * 0.85;
      const base = t < 0.42 ? [root[0] + (el[0] - root[0]) * (t / 0.42), root[1] + (el[1] - root[1]) * (t / 0.42)] : [el[0] + (tip[0] - el[0]) * ((t - 0.42) / 0.58), el[1] + (tip[1] - el[1]) * ((t - 0.42) / 0.58)];
      const fa = -2 - k * 62 - (1 - sp) * 18; // 内側は下へ、外側ほど後ろへ開く
      const len = 13 + k * 15 + (d.v === "A" ? 0 : 2);
      const ft = add(base, fa, len);
      const mid = add(base, fa, len * 0.42);
      const s2 = dir(fa + 90);
      const w = 3.2;
      // ひし形の結晶(片側が明るく、反対側が暗い)
      b.poly([base, [mid[0] + s2[0] * w, mid[1] + s2[1] * w], ft], cMain);
      b.poly([base, [mid[0] - s2[0] * w, mid[1] - s2[1] * w], ft], cDark);
      b.line(base[0], base[1], ft[0], ft[1], cEdge, 1);
      b.set(ft[0], ft[1], cEdge);
    }
    b.set(tip[0], tip[1], cEdge);
  };
  if (opts.winged) wing(false);

  // 脚(3つの関節)。太ももと肩の筋肉は丸で
  const legDraw = (p0: number[], a1: number, a2: number, a3: number, c: number, thick: number) => {
    const k1 = add(p0, a1, d.leg[0]);
    const k2 = add(k1, a1 + a2, d.leg[1]);
    const f = add(k2, a1 + a2 + a3, d.leg[2]);
    b.line(p0[0], p0[1], k1[0], k1[1], c, thick);
    b.line(k1[0], k1[1], k2[0], k2[1], c, thick * 0.6);
    b.line(k2[0], k2[1], f[0], f[1], c, thick * 0.5);
    b.line(f[0] - 1, f[1], f[0] + 3, f[1], c, 2.6);
    if (d.detail > 0 && c === pal.B) b.line(k1[0] + 1, k1[1] - 1, k2[0] + 1, k2[1] - 2, pal.D, 1);
    if (d.detail > 0) {
      b.set(f[0] + 4, f[1], pal.T);
      b.set(f[0] + 4, f[1] - 1, pal.T);
    }
  };
  const fShoulder = at(L * 0.3, -BH * 0.15);
  const hHip = at(-L * 0.36, BH * 0.0);
  legDraw(at(L * 0.26, -BH * 0.15), pose.fb1, pose.fb2, pose.fb3, pal.b, 6);
  legDraw(at(-L * 0.4, 0), pose.hb1, pose.hb2, pose.hb3, pal.b, 7);

  // 胴:胸が深く、腰に向かって細くなる
  const body = [
    at(-L * 0.52, BH * 0.32), at(-L * 0.2, BH * 0.48), at(L * 0.18, BH * 0.7), at(L * 0.42, BH * 0.62),
    at(L * 0.56, BH * 0.2), at(L * 0.52, -BH * 0.25), at(L * 0.36, -BH * 0.55), at(L * 0.08, -BH * 0.42),
    at(-L * 0.25, -BH * 0.18), at(-L * 0.5, -BH * 0.2),
  ];
  b.poly(body, pal.B);
  b.disc(hHip[0], hHip[1], d.thigh, pal.B);
  b.disc(fShoulder[0], fShoulder[1], d.thigh * 0.8, pal.B);
  // 胸と腹のギザギザの毛
  for (let i = 0; i < 7; i++) {
    const p = at(L * (0.45 - i * 0.1), -BH * (0.45 - Math.abs(i - 2) * 0.04));
    b.poly([[p[0] - 2, p[1] - 1], [p[0] + 2, p[1] - 1], [p[0] - 1, p[1] + 3]], pal.B);
  }
  if (d.detail > 0) {
    for (let i = 0; i < 8; i++) {
      const p = at(-L * 0.4 + i * L * 0.11, BH * (0.25 - (i % 3) * 0.12));
      b.line(p[0], p[1], p[0] - 2, p[1] + 2, pal.D, 1);
    }
    b.line(...(at(L * 0.4, -BH * 0.1) as [number, number]), ...(at(L * 0.3, -BH * 0.4) as [number, number]), pal.D, 1);
  }
  // 背中と肩の結晶のトゲ(肩が大きい)
  for (let i = 0; i < d.spikes; i++) {
    const k = i / (d.spikes - 1);
    const u = L * (0.34 - k * 0.8);
    const base = at(u, BH * (0.66 - k * 0.3));
    const h = (k < 0.4 ? 13 - k * 6 : 9 - k * 5) * (d.v === "A" ? 0.85 : 1);
    const lean = 200 - k * 15 - pose.tilt;
    const tip = add(base, lean, h);
    const s = dir(lean + 90);
    const wd = k < 0.4 ? 3.4 : 2.4;
    b.poly([[base[0] - s[0] * wd, base[1] - s[1] * wd], [base[0] + s[0] * wd, base[1] + s[1] * wd], tip], pal.P);
    if (d.detail > 1) b.poly([[base[0] - s[0] * wd, base[1] - s[1] * wd], base, tip], pal.p);
    b.line(base[0] + s[0], base[1] + s[1], tip[0], tip[1], d.detail > 0 ? pal.Q : pal.P, 1);
  }
  // 肩の結晶のかたまり
  const sc = at(L * 0.3, BH * 0.25);
  for (let i = 0; i < (d.detail + 2); i++) {
    const a = 150 + i * 35;
    const tip = add(sc, a, 7 + i);
    b.poly([[sc[0] - 2, sc[1]], [sc[0] + 2, sc[1]], tip], i % 2 ? pal.p : pal.P);
    if (d.detail > 0) b.line(sc[0], sc[1], tip[0], tip[1], pal.Q, 1);
  }

  // 手前の脚
  legDraw(at(L * 0.32, -BH * 0.2), pose.fl1, pose.fl2, pose.fl3, pal.B, 6);
  legDraw(at(-L * 0.36, -BH * 0.05), pose.hl1, pose.hl2, pose.hl3, pal.B, 7);

  // 首と頭(首は前上へ)
  const nb = at(L * 0.42, BH * 0.35);
  const na = 90 + pose.neck + pose.tilt;
  const hd = add(nb, na, 12);
  b.line(nb[0], nb[1], hd[0], hd[1], pal.B, 13);
  const rows = d.head.slice();
  if (pose.jaw > 0.5) {
    // 口を開く:口の中の行を足す(jaw が大きいほど大きく開く)。下あごの歯は下へずれる
    const extra = Math.round(pose.jaw * 3);
    for (let e = 0; e < extra; e++) rows.splice(d.jawRow + 1, 0, rows[d.jawRow + 1].replace(/T/g, "M"));
    if (pose.jaw >= 1.4) rows.splice(d.jawRow + 1, 0, rows[d.jawRow].replace(/M/g, "T")); // 上の牙を長く
  }
  const hw = Math.max(...rows.map((r) => r.length));
  const ax = hw * 0.3;
  const ay = rows.length * 0.6;
  const hx = Math.round(hd[0] - ax);
  const hy = Math.round(hd[1] - ay);
  const rot = pose.headRot ?? 0;
  let mouth = [hx + hw - 2 - ox, hy + d.jawRow + 1 - oy];
  if (Math.abs(rot) < 0.5) b.map(rows, pal, hx, hy);
  else {
    // 頭を首のつけねのまわりに回す(ぼかさず、いちばん近いドットを拾う)
    const hb = new Buf(hw, rows.length);
    hb.map(rows, pal, 0, 0);
    const c = Math.cos(rad(rot));
    const s2 = Math.sin(rad(rot));
    const R = Math.ceil(Math.hypot(hw, rows.length)) + 2;
    for (let y = -R; y <= R; y++)
      for (let x = -R; x <= R; x++) {
        const sx = c * x + s2 * y + ax;
        const sy = -s2 * x + c * y + ay;
        const col = hb.get(sx, sy);
        if (col) b.set(hd[0] + x, hd[1] + y, col);
      }
    const mx = hw - 2 - ax;
    const my = d.jawRow + 1 - ay;
    mouth = [hd[0] + c * mx - s2 * my - ox, hd[1] + s2 * mx + c * my - oy];
  }

  if (opts.winged) wing(true);

  if (opts.silhouette) b.tint(hex(opts.silhouette));
  b.outline(hex(opts.flash ? "#ffffff" : d.outline));
  if (opts.flash) b.tint(hex("#ffffff"));
  else if (!opts.silhouette) b.rim(hex(d.outline), [pal.B, pal.b, pal.D], hex(RIM_IN[d.v]), hex(RIM_OUT[d.v]));
  return { buf: b, ox, oy, mouth, neck: [nb[0] - ox, nb[1] - oy], top: Math.min(hy, cy - BH) - oy };
};
