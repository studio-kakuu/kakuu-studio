// 作品006 v2「ドット絵アクション」:8シーン(各8秒=192コマ、24fps)の絵づくり。React を使わない(Node の確認用書き出しと Remotion で共用)。
// drawFrame(f) が 180×320 の絵とカメラ(位置・ズーム・揺れ)・白フラッシュ・黒帯・暗転を返し、compose() で 1080×1920 に拡大する。
import { Buf, dither, hash, hex } from "./px";
import { cloudHole, drawLayers, fog, forest, FOREST_GROUND, lightRays, sky, vista } from "./bg";
import { barrier, beam, burst, chain, COL, disc, glow, iceBlock, line, magicCircle, ring, slashArc, slashLine, snow, speedLines, streaks, veil } from "./fx";
import { K, M, W, WW, knight, mage, wolf, type Sprite } from "./poses";
import { MENU, TITLE } from "./glyphs";

export const SW = 180;
export const SH = 320;
export const FPS = 24;
export const SCENE = 192;
export const TOTAL = SCENE * 8;

export type Cam = { x: number; y: number; z: number };
export type Frame = { buf: Buf; cam: Cam; flash: string | null; bars: number; fade: number };

// ---------------- 小さな道具 ----------------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const E = {
  lin: (x: number) => x,
  out: (x: number) => 1 - (1 - x) ** 3,
  in: (x: number) => x * x * x,
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
};
/** l が a→b の間に x→y へ(前後は止まる) */
const tw = (l: number, a: number, b: number, x: number, y: number, e: (t: number) => number = E.lin) => lerp(x, y, e(clamp01((l - a) / (b - a))));
const cyc = <T,>(arr: T[], l: number, every = 3) => arr[((Math.floor(l / every) % arr.length) + arr.length) % arr.length];

const rotCache = new Map<Buf, Buf>();
const rot180 = (b: Buf) => {
  if (!rotCache.has(b)) {
    const r = new Buf(b.w, b.h);
    for (let i = 0; i < b.d.length; i++) r.d[b.d.length - 1 - i] = b.d[i];
    rotCache.set(b, r);
  }
  return rotCache.get(b)!;
};
/** 絵を置く。(x, y) は足元。flip で左向き、a は半透明(間引き)、rot で上下さかさま */
const put = (dst: Buf, sp: Sprite, x: number, y: number, o: { flip?: boolean; a?: number; rot?: boolean } = {}) => {
  let buf = sp.buf;
  let ox = sp.ox;
  let oy = sp.oy;
  if (o.rot) {
    buf = rot180(buf);
    ox = buf.w - 1 - ox;
    oy = buf.h - 1 - oy;
  }
  const x0 = o.flip ? x - (buf.w - 1 - ox) : x - ox;
  dst.blit(buf, x0, y - oy, o.flip, o.a ?? 1);
};
/** 絵の中の点(足元からの相対)を画面の位置に */
const ptOf = (rel: number[] | undefined, x: number, y: number, flip = false, rot = false) => {
  const r = rel ?? [0, 0];
  const dx = rot ? -r[0] : r[0];
  const dy = rot ? -r[1] : r[1];
  return [x + (flip ? -dx : dx), y + dy];
};

type Ghost = { sp: (l: number) => Sprite; ghost: (l: number) => Sprite; x: (l: number) => number; y: (l: number) => number; flip?: boolean; rot?: boolean };
/** 残像つきで置く(2〜3枚) */
const withGhosts = (dst: Buf, g: Ghost, l: number, on: boolean, n = 3, gap = 2) => {
  if (on)
    for (let i = n; i >= 1; i--) {
      const ll = l - i * gap;
      put(dst, g.ghost(ll), g.x(ll), g.y(ll), { flip: g.flip, a: [0, 0.55, 0.35, 0.18][i], rot: g.rot });
    }
  put(dst, g.sp(l), g.x(l), g.y(l), { flip: g.flip, rot: g.rot });
};

// 全体の揺れ・白フラッシュ(コマ番号で決める)
const HITS: number[] = [];
const SHAKES: [number, number][] = [];
const hitAt = (f: number, shake = 5) => {
  HITS.push(f);
  SHAKES.push([f, shake]);
};
const shakeAt = (f: number, s: number) => SHAKES.push([f, s]);

// 狼の色(残像など)
const KG = { silhouette: "#ffe08a" };
const WG = { silhouette: "#8a3cf0" };

// ================= 冒頭(0〜2.5秒):決め技 → 巻き戻し → タイトル画面 =================
export const OPEN = 60;
const CLIMAX_END = 29; // 0〜1.2秒:シーン7の縦一閃を先に見せる
const REWIND_END = 37; // 1.2秒〜:ドットが崩れて巻き戻る
const DECIDE = 52; // タイトル画面で「はじめから」を決定(ピコッ)
const BRAND = { black: hex("#0E0E0E"), white: hex("#F2F0E9"), lime: hex("#C6FF3D"), limeD: hex("#5f7a1c"), gray: hex("#2a2a26") };
const glyph = (b: Buf, rows: string[], x: number, y: number, c: number, t = 1, seed = 1) => {
  // t<1 のときはドットが散った所から集まってくる
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      if (r[i] !== "#") continue;
      const sx = hash(seed, i, j) * SW;
      const sy = hash(seed, j, i, 2) * SH;
      const k = E.out(clamp01(t));
      b.set(Math.round(lerp(sx, x + i, k)), Math.round(lerp(sy, y + j, k)), c);
    }
  });
};
const Title = (b: Buf, t: number): Partial<Frame> => {
  b.clear(BRAND.black);
  // ゆっくり上る小さな光(ライム)
  for (let i = 0; i < 18; i++) {
    const y = SH - ((hash(i, 21) * SH + t * (1 + hash(i, 22))) % SH);
    b.set(Math.floor(hash(i, 23) * SW), Math.floor(y), i % 3 ? BRAND.limeD : BRAND.lime);
  }
  const k = clamp01(t / 6);
  const tx = Math.round((SW - TITLE[0].length) / 2);
  const ty = 92;
  // 角のかぎ(画面の枠)
  if (k >= 1) {
    for (const [cx, cy, dx, dy] of [[14, 70, 1, 1], [SW - 15, 70, -1, 1], [14, 236, 1, -1], [SW - 15, 236, -1, -1]]) {
      line(b, cx, cy, cx + dx * 12, cy, BRAND.lime, 1);
      line(b, cx, cy, cx, cy + dy * 12, BRAND.lime, 1);
    }
  }
  // タイトル「影狼の森」:白の文字にライムの影(右下に2ドット)
  glyph(b, TITLE, tx + 2, ty + 2, BRAND.lime, k, 3);
  glyph(b, TITLE, tx, ty, BRAND.white, k, 4);
  // 下の飾り線と、まん中のひし形
  if (k >= 1) {
    const w = Math.round(tw(t, 6, 10, 0, TITLE[0].length / 2, E.out));
    line(b, SW / 2 - w, ty + 42, SW / 2 + w, ty + 42, BRAND.lime, 1);
    for (let j = -2; j <= 2; j++) line(b, SW / 2 - (2 - Math.abs(j)), ty + 42 + j, SW / 2 + (2 - Math.abs(j)), ty + 42 + j, BRAND.lime, 1);
  }
  // 選択肢「はじめから」とカーソル
  const mx = Math.round((SW - MENU[0].length) / 2) + 4;
  const my = 196;
  if (t >= 7) {
    const decided = t >= DECIDE - REWIND_END;
    const blinkOn = decided ? (t - (DECIDE - REWIND_END)) % 2 === 0 : true;
    glyph(b, MENU, mx, my, decided && blinkOn ? BRAND.lime : BRAND.white);
    const cursorOn = decided || Math.floor(t / 3) % 2 === 0;
    if (cursorOn) for (let j = 0; j < 7; j++) line(b, mx - 10, my + 3 + j, mx - 10 + (3 - Math.abs(j - 3)), my + 3 + j, BRAND.lime, 1);
  }
  // 決定のあと、ドットが消えていく(次のシーンへ)
  if (t >= 20) veil(b, hex("#000000"), tw(t, 20, 23, 0, 1));
  return { cam: { x: 90, y: 160, z: 1 } };
};
const Opening = (b: Buf, f: number): Partial<Frame> => {
  if (f < CLIMAX_END) {
    const r = S7(b, 46 + f); // f=14 で縦一閃
    return { ...r, flash: null };
  }
  if (f < REWIND_END) {
    // 巻き戻し:絵を逆回しにしながら、行がずれ、ドットが散り、ノイズがふえる
    const o = f - CLIMAX_END;
    const tmp = new Buf(SW, SH);
    tmp.clear(hex("#000000"));
    const r = S7(tmp, 46 + 28 - o * 5);
    const kk = (o + 1) / 8;
    for (let y = 0; y < SH; y++) {
      const shift = hash(y >> 2, o, 5) < 0.2 + kk * 0.5 ? Math.round((hash(y >> 2, o, 6) - 0.5) * 30 * kk) : 0;
      for (let x = 0; x < SW; x++) {
        let c = tmp.get(x - shift, y);
        if (hash(x >> 1, y >> 1, o) < kk * 0.7) c = tmp.get(x + Math.round((hash(x, y, o, 7) - 0.5) * 40 * kk), y + Math.round((hash(x, y, o, 8) - 0.5) * 40 * kk));
        if (hash(x, y, o, 9) < kk * 0.45) c = [BRAND.white, BRAND.gray, BRAND.lime, hex("#000000")][Math.floor(hash(x, y, o, 10) * 4)];
        b.set(x, y, c || hex("#000000"));
      }
    }
    const cam = r.cam ?? { x: 90, y: 160, z: 1 };
    return { cam: { x: lerp(cam.x, 90, kk), y: lerp(cam.y, 160, kk), z: lerp(cam.z, 1, kk) }, bars: (r.bars ?? 0) * (1 - kk) };
  }
  return Title(b, f - REWIND_END);
};

// ================= シーン 1:森の遺跡での奇襲(冒頭のあと 5.5 秒) =================
// 霧の中で影狼の赤い目が光る所から始め、暗いだけの時間を作らない
const S1 = (b: Buf, l: number): Partial<Frame> => {
  drawLayers(b, forest(), 40 + l * 0.5);
  fog(b, l, 0.35, "#5a7a74", 130, 250);
  // 茂みの奥の赤い目(すぐ光る。途中で1回まばたき)
  if (l < 42 && !(l > 14 && l < 18)) {
    for (const ex of [146, 156]) {
      b.set(ex, 206, COL.red);
      b.set(ex + 1, 206, COL.red);
      glow(b, ex + 0.5, 206.5, l < 3 ? l + 1 : 3.5, COL.red, 0.6);
    }
  }
  // 二人が走ってきて構える
  const kx = tw(l, 8, 34, -20, 56, E.out);
  const mx = tw(l, 12, 38, -30, 32, E.out);
  const running = l < 34;
  if (l > 6) {
    put(b, mage(running ? M.float : l > 104 ? M.cast : M.ready), mx, FOREST_GROUND - (running ? 2 : 0));
    put(b, knight(running ? cyc(K.run, l, 2) : K.ready), kx, FOREST_GROUND);
  }
  // 狼が飛び出す(放物線)→ 着地して大きく吠える → 走りよる
  const J0 = 44;
  const LAND = 58;
  const jump = (ll: number) => clamp01((ll - J0) / (LAND - J0));
  const wx = (ll: number) => lerp(210, 142, E.out(jump(ll)));
  const wy = (ll: number) => (ll < J0 ? 400 : lerp(170, FOREST_GROUND, jump(ll)) - Math.sin(jump(ll) * Math.PI) * 40);
  if (l >= J0) {
    const airborne = l < LAND;
    const RUN = 110;
    const pose = airborne ? W.pounce : l < 90 ? W.roar : l < RUN ? W.ready : cyc(W.run, l, 2);
    const x = l < RUN ? wx(l) : wx(l) - (l - RUN) * 3;
    withGhosts(b, { sp: () => wolf(pose), ghost: () => wolf(W.pounce, WG), x: (ll) => (ll < RUN ? wx(Math.max(J0, ll)) : x), y: (ll) => wy(Math.max(J0, ll)), flip: true }, l, airborne);
    if (l >= LAND + 2 && l < 88) {
      const mouth = ptOf(wolf(W.roar).mouth, x, FOREST_GROUND, true);
      for (let k = 0; k < 3; k++) ring(b, mouth[0], mouth[1], ((l - LAND + k * 5) % 15) * 4, COL.purpleHi, 1, 0.5);
    }
  }
  burst(b, 142, FOREST_GROUND, l - LAND, "stone", { n: 18, speed: 3.2, life: 26, seed: 11, dir: -Math.PI / 2, cone: 2.6, grav: 0.18, size: 2 });
  burst(b, 142, FOREST_GROUND - 6, l - LAND, "spark", { n: 14, speed: 4, life: 12, seed: 12 });
  if (l > J0 && l < LAND) speedLines(b, 128, 220, l, COL.white, 0.8, 40);
  if (l >= LAND && l < 88) speedLines(b, 128, 200, l, hex("#c8a0ff"), 0.5, 55);
  // 次の場面へ:石の破片がカメラに飛んでくる
  burst(b, 110, 230, l - 116, "stone", { n: 22, speed: 3, life: 16, seed: 13, size: 3, toCam: true, grav: 0 });
  const cam: Cam =
    l < 12 ? { x: 146, y: 204, z: tw(l, 0, 12, 2.6, 2.3) }
      : l < 36 ? { x: tw(l, 12, 34, 146, 74, E.io), y: tw(l, 12, 34, 204, 214, E.io), z: tw(l, 12, 34, 2.3, 1.7, E.io) }
        : l < LAND ? { x: tw(l, 36, LAND, 74, 98, E.io), y: tw(l, 36, LAND, 214, 212), z: tw(l, 36, LAND, 1.7, 1.45) }
          : { x: 98, y: 212, z: 1.45 + tw(l, LAND, LAND + 4, 0.15, 0) };
  return { cam };
};
const S1x = (b: Buf, l: number): Partial<Frame> => (l < OPEN ? Opening(b, l) : S1(b, l - OPEN));
hitAt(14, 10); // 冒頭の縦一閃
hitAt(OPEN + 58, 6);
shakeAt(OPEN + 62, 4);
shakeAt(OPEN + 70, 3);

// ================= シーン 2:バリアで防御・氷の足場 =================
const S2 = (b: Buf, l: number): Partial<Frame> => {
  drawLayers(b, forest(), 80 + l * 0.2);
  fog(b, l + 200, 0.3, "#5a7a74", 140, 250);
  const bx = 80;
  const by = FOREST_GROUND - 22;
  const bp = tw(l, 8, 22, 0, 1);
  const burstAt = 96;
  // 精霊術師(杖を突く → 詠唱)と後ろの騎士
  const mPose = l < 8 ? M.ready : l < 30 ? M.strike : l < 100 ? M.cast : l < 112 ? M.strike : M.cast;
  put(b, mage(mPose), 58, FOREST_GROUND);
  if (l > 6 && l < 20) ring(b, 66, FOREST_GROUND, (l - 6) * 3, COL.green, 1, 1 - (l - 6) / 14, 0.3);
  // 狼:飛びかかって爪でバリアをたたく
  const hit1 = 30;
  const wx = (ll: number) => (ll < hit1 ? lerp(210, 132, E.in(clamp01((ll - 6) / 24))) : ll < burstAt ? 132 + Math.sin(ll * 0.8) * 1.5 : 132 + tw(ll, burstAt, burstAt + 14, 0, 30, E.out));
  const wy = (ll: number) => (ll < hit1 ? lerp(150, FOREST_GROUND - 6, E.in(clamp01((ll - 6) / 24))) : ll < burstAt ? FOREST_GROUND - 6 : FOREST_GROUND - 6 + tw(ll, burstAt, burstAt + 8, 0, -16, E.out) + tw(ll, burstAt + 8, burstAt + 16, 0, 22));
  const hits = [hit1, 48, 66, 82];
  const wPose = l < hit1 ? W.pounce : l < burstAt ? (hits.some((h) => l >= h - 4 && l < h + 3) ? W.claw : W.pounce) : l < 130 ? W.recoil : W.ready;
  if (l < 160) withGhosts(b, { sp: () => wolf(wPose), ghost: () => wolf(W.pounce, WG), x: wx, y: wy, flip: true }, l, l < hit1);
  // バリア
  if (l >= 8 && l < burstAt + 4) {
    const last = hits.filter((h) => l >= h).pop();
    barrier(b, bx, by, bp, l, last !== undefined ? l - last : -1);
  }
  for (const h of hits) {
    burst(b, bx + 26, by - 6, l - h, "green", { n: 12, speed: 2.4, life: 14, seed: h });
    burst(b, bx + 28, by - 8, l - h, "crystal", { n: 6, speed: 2, life: 14, seed: h + 1, size: 1.5 });
    if (l - h >= 0 && l - h < 10) ring(b, bx + 26, by - 6, (l - h) * 4, COL.greenHi, 1, 1 - (l - h) / 10);
  }
  // バリアがはじけて狼を押し返す
  for (let k = 0; k < 3; k++) if (l - burstAt - k * 3 >= 0 && l - burstAt - k * 3 < 14) ring(b, bx, by, 36 + (l - burstAt - k * 3) * 5, COL.green, 2, 1 - (l - burstAt - k * 3) / 14);
  burst(b, bx, by, l - burstAt, "green", { n: 24, speed: 3.5, life: 18, seed: 77 });
  // 氷の足場
  const ice = tw(l, 104, 116, 0, 1, E.out);
  if (ice > 0) {
    iceBlock(b, 66, 192, Math.round(40 * ice), 7, 1);
    burst(b, 86, 194, l - 104, "ice", { n: 14, speed: 2, life: 16, seed: 91, size: 1.5 });
  }
  // 騎士:後ろで構え → 走って跳び、氷の足場に乗る
  const kx = (ll: number) => (ll < 130 ? 34 : ll < 150 ? lerp(34, 70, (ll - 130) / 20) : lerp(70, 84, E.out(clamp01((ll - 150) / 12))));
  const ky = (ll: number) => (ll < 150 ? FOREST_GROUND : ll < 162 ? lerp(FOREST_GROUND, 192, E.out((ll - 150) / 12)) - Math.sin(((ll - 150) / 12) * Math.PI) * 14 : 192);
  const kPose = l < 130 ? K.ready : l < 150 ? cyc(K.run, l) : l < 162 ? K.jump : l < 166 ? K.land : K.ready;
  withGhosts(b, { sp: () => knight(kPose), ghost: () => knight(K.jump, KG), x: kx, y: ky }, l, l >= 150 && l < 164);
  if (l >= 162 && l < 172) burst(b, kx(l), 192, l - 162, "ice", { n: 8, speed: 1.5, life: 10, seed: 93, dir: -Math.PI / 2, cone: 2.4, size: 1 });
  burst(b, 90, 200, l - 178, "ice", { n: 22, speed: 3, life: 16, seed: 95, size: 3, toCam: true, grav: 0 });
  const cam: Cam =
    l < 30 ? { x: tw(l, 0, 30, 70, 96), y: 214, z: tw(l, 0, 30, 1.6, 1.9, E.io) }
      : l < 96 ? { x: 98, y: 214, z: 2.0 + Math.sin(l * 0.1) * 0.03 }
        : l < 130 ? { x: tw(l, 96, 112, 98, 84), y: tw(l, 96, 112, 214, 200), z: tw(l, 96, 112, 2.0, 1.6) }
          : { x: tw(l, 130, 166, 84, 80), y: tw(l, 130, 166, 210, 180, E.io), z: tw(l, 150, 180, 1.6, 2.0, E.io) };
  return { cam };
};
hitAt(SCENE + 30, 7);
shakeAt(SCENE + 48, 3);
shakeAt(SCENE + 66, 3);
shakeAt(SCENE + 82, 3);
shakeAt(SCENE + 96, 6);

// ================= シーン 3:跳躍斬り =================
const S3 = (b: Buf, l: number): Partial<Frame> => {
  drawLayers(b, forest(), 120);
  fog(b, l + 400, 0.25, "#5a7a74", 140, 250);
  iceBlock(b, 66, 192, 40, 7, l < 40 ? 1 : 1 - (l - 40) / 20);
  const hit = 46;
  // 狼:立ち上がって爪をふりあげる → 首を斬られてのけぞる
  const wx = 128 + tw(l, hit, hit + 12, 0, 12, E.out) - tw(l, 110, 150, 0, 8);
  const wPose = l < hit ? W.claw : l < 120 ? W.recoil : W.ready;
  put(b, wolf(wPose, l >= hit && l < hit + 2 ? { flash: true } : {}), wx, FOREST_GROUND, { flip: true });
  // 騎士:氷の足場から高く跳ぶ → 空中で振りかぶる → 斜めに斬りおろす → 着地
  const kx = (ll: number) => (ll < 30 ? lerp(84, 88, ll / 30) : ll < hit ? lerp(88, 112, E.in((ll - 30) / (hit - 30))) : ll < 64 ? lerp(112, 96, E.out((ll - hit) / 18)) : 96);
  const ky = (ll: number) => (ll < 30 ? lerp(192, 92, E.out(ll / 30)) : ll < hit ? lerp(92, 176, E.in((ll - 30) / (hit - 30))) : ll < 64 ? lerp(176, FOREST_GROUND, E.in((ll - hit) / 18)) : FOREST_GROUND);
  const kPose = l < 22 ? K.jump : l < 38 ? K.windup : l < hit + 8 ? K.slash3 : l < 64 ? K.airGuard : l < 76 ? K.land : K.ready;
  withGhosts(b, { sp: () => knight(kPose), ghost: (ll) => knight(ll < 30 ? K.jump : K.slash3, KG), x: kx, y: ky }, l, (l < 30) || (l >= 36 && l < 60));
  // 首の位置に金の斬撃
  const neck = ptOf(wolf(W.claw).neck, 128, FOREST_GROUND, true);
  slashArc(b, neck[0] - 18, neck[1] - 30, 34, -40, 80, l - hit + 2, 4);
  burst(b, neck[0], neck[1], l - hit, "crystal", { n: 26, speed: 3.2, life: 30, seed: 31, grav: 0.15, size: 2 });
  burst(b, neck[0], neck[1], l - hit, "gold", { n: 14, speed: 3, life: 14, seed: 32, size: 1 });
  if (l - hit >= 0 && l - hit < 12) ring(b, neck[0], neck[1], (l - hit) * 5, COL.goldHi, 1, 1 - (l - hit) / 12);
  if (l >= hit && l < hit + 14) speedLines(b, neck[0], neck[1], l, COL.goldHi, 0.8, 30);
  if (l < 26) streaks(b, l, 0, 1, COL.white, 0.6, 26, 16);
  if (l >= 64 && l < 74) burst(b, 96, FOREST_GROUND, l - 64, "stone", { n: 10, speed: 1.5, life: 10, seed: 33, dir: -Math.PI / 2, cone: 3, size: 1 });
  // ゆっくり舞う結晶片 → 次へ
  burst(b, neck[0], neck[1] - 20, l - 90, "crystal", { n: 12, speed: 0.6, life: 70, seed: 34, grav: 0.01, size: 1.5 });
  burst(b, 120, 210, l - 176, "crystal", { n: 24, speed: 3, life: 16, seed: 35, size: 3, toCam: true, grav: 0 });
  const cam: Cam =
    l < 30 ? { x: 88, y: tw(l, 0, 30, 186, 120, E.out), z: 1.8 }
      : l < hit ? { x: tw(l, 30, hit, 88, 112), y: tw(l, 30, hit, 120, 176, E.in), z: tw(l, 30, hit, 1.8, 2.2) }
        : l < 90 ? { x: tw(l, hit, 70, 112, 110), y: tw(l, hit, 70, 176, 206), z: tw(l, hit, hit + 4, 2.5, 2.0) }
          : { x: 110, y: 206, z: tw(l, 90, 190, 2.0, 1.5) };
  return { cam };
};
hitAt(SCENE * 2 + 46, 8);
shakeAt(SCENE * 2 + 64, 3);

// ================= シーン 4:並走しながら3連撃 =================
const S4 = (b: Buf, l: number): Partial<Frame> => {
  const scroll = l * 5;
  drawLayers(b, forest(), 200 + scroll);
  streaks(b, l, 1, 0, COL.white, 0.55, 26, 14);
  // 氷の道(精霊術師の魔法)
  for (let x = 0; x < SW; x++) {
    const y = FOREST_GROUND - 1;
    b.set(x, y, COL.iceHi);
    b.set(x, y + 1, (x + scroll) % 9 < 2 ? COL.iceHi : COL.ice);
    b.set(x, y + 2, COL.iceD);
  }
  // 後ろから精霊術師が浮いてついてくる
  put(b, mage(M.float), 26 + Math.sin(l * 0.1) * 4, 196 + Math.sin(l * 0.13) * 3);
  burst(b, 34, 190, l % 24, "green", { n: 4, speed: 0.6, life: 24, seed: 41 + Math.floor(l / 24), grav: -0.02, size: 1 });
  const hits = [40, 90, 140];
  const slashes = [K.slash1, K.slash2, K.slash3];
  // 狼(右側を並んで走る)
  const knock = (ll: number) => hits.reduce((s, h) => s + (ll >= h && ll < h + 10 ? (1 - (ll - h) / 10) * (h === 140 ? 14 : 6) : 0), 0);
  const wx = 122 + Math.sin(l * 0.07) * 4 + knock(l) + tw(l, 140, 170, 0, 20);
  const wPose = l >= 140 ? W.recoil : hits.some((h) => l >= h && l < h + 6) ? W.recoil : cyc(W.run, l, 3);
  put(b, wolf(wPose, hits.includes(l) || hits.includes(l - 1) ? { flash: true } : {}), wx, FOREST_GROUND + (wPose === W.recoil ? 0 : 0), { flip: false });
  // 騎士:走る → 斬りかかる(前へ跳ぶ)→ 戻る
  const lunge = (ll: number) => hits.reduce((s, h) => s + (ll >= h - 8 && ll < h + 14 ? Math.sin(((ll - h + 8) / 22) * Math.PI) : 0), 0);
  const kx = (ll: number) => 46 + lunge(ll) * 42;
  const ky = (ll: number) => FOREST_GROUND - lunge(ll) * 22;
  const active = hits.findIndex((h) => l >= h - 8 && l < h + 10);
  const kPose = active >= 0 ? (l < hits[active] - 2 ? K.windup : slashes[active]) : cyc(K.run, l);
  withGhosts(b, { sp: () => knight(kPose), ghost: (ll) => knight(cyc(K.run, ll), KG), x: kx, y: ky }, l, true, 3, 2);
  // 金の斬撃(横なぎ・斬り上げ・斬り下ろし)
  slashArc(b, 96, 214, 30, 150, 30, l - hits[0] + 1, 4);
  slashArc(b, 100, 220, 32, 120, -60, l - hits[1] + 1, 4);
  slashArc(b, 92, 196, 36, -100, 70, l - hits[2] + 1, 5);
  hits.forEach((h, i) => {
    burst(b, 112, 210, l - h, "crystal", { n: 18 + i * 8, speed: 2.8 + i * 0.5, life: 22, seed: 50 + i, grav: 0.16, size: 1.6 });
    burst(b, 110, 210, l - h, "gold", { n: 10, speed: 3, life: 10, seed: 60 + i, size: 1 });
    if (l - h >= 0 && l - h < 10) ring(b, 112, 210, (l - h) * 4, COL.goldHi, 1, 1 - (l - h) / 10);
  });
  if (l >= 140 && l < 156) speedLines(b, 112, 210, l, COL.goldHi, 0.8, 34);
  // 紫の光が出はじめる(変身の前ぶれ)
  if (l > 166) glow(b, wx + 10, 220, tw(l, 166, 192, 10, 60), COL.purple, tw(l, 166, 192, 0.2, 0.9));
  const zoomHit = hits.reduce((s, h) => s + (l >= h && l < h + 6 ? (1 - (l - h) / 6) * 0.25 : 0), 0);
  return { cam: { x: 92, y: 214, z: 1.7 + zoomHit } };
};
[40, 90, 140].forEach((h, i) => hitAt(SCENE * 3 + h, i === 2 ? 8 : 5));

// ================= シーン 5:翼の影狼に変身して雲の上へ・氷の階段とビーム =================
const STEPS = Array.from({ length: 7 }, (_, i) => ({ x: 16 + i * 22 + (i % 2) * 6, y: 288 - i * 30 }));
const S5 = (b: Buf, l: number): Partial<Frame> => {
  const morph = 48;
  const toSky = 80;
  if (l < toSky) {
    drawLayers(b, forest(), 300, 0);
    veil(b, COL.purpleD, tw(l, 0, morph, 0.1, 0.45));
  } else {
    drawLayers(b, sky(), l * 0.8, 0);
  }
  // 変身:紫の光に包まれる → 翼の影狼
  if (l < morph) {
    glow(b, 96, 220, tw(l, 0, morph, 20, 70), COL.purple, 0.8);
    const sil = l > 24 && l % 4 < 2 ? { silhouette: "#c070ff" } : {};
    put(b, wolf(l < 24 ? W.recoil : W.roar, sil), 100 + Math.sin(l * 1.7) * tw(l, 10, morph, 0, 2), FOREST_GROUND, { flip: true });
    for (let k = 0; k < 10; k++) {
      const a = hash(k, 3) * Math.PI * 2 + l * 0.05;
      const r = 70 * (1 - ((l + k * 5) % 24) / 24);
      disc(b, 96 + Math.cos(a) * r, 210 + Math.sin(a) * r, 1.2, COL.purpleHi);
    }
  }
  burst(b, 96, 210, l - morph, "crystal", { n: 30, speed: 3.4, life: 24, seed: 71, size: 2 });
  if (l >= morph && l < morph + 12) ring(b, 96, 210, (l - morph) * 7, COL.purpleHi, 2, 1 - (l - morph) / 12);
  // 上昇
  if (l >= morph && l < toSky) {
    const wy = (ll: number) => FOREST_GROUND - E.in(clamp01((ll - morph) / 30)) * 330;
    withGhosts(b, { sp: (ll) => wolf(cyc(WW.rise, ll, 2), { winged: true }), ghost: () => wolf(WW.rise[0], { winged: true, ...WG }), x: () => 96, y: wy, flip: true }, l, l > morph + 6);
    streaks(b, l, 0, -1, COL.purpleHi, 0.5, 24, 18);
  }
  // 雲を突き抜ける(白い流線で場面を切りかえる)
  if (l >= 72 && l < 90) {
    // 雲を突き抜ける:白で画面を埋めず、雲のかたまりが下へ流れていく(白フラッシュではない)
    for (let k = 0; k < 9; k++) {
      const cy = ((hash(k, 31) * 400 + (l - 72) * 26) % 420) - 60;
      const cx = hash(k, 32) * SW;
      disc(b, cx, cy, 14 + hash(k, 33) * 16, hex("#e8f2fc"), 0.85);
      disc(b, cx - 3, cy - 3, 8 + hash(k, 33) * 10, COL.white, 0.9);
    }
    streaks(b, l, 0, 1, hex("#d8e8f8"), 0.8, 30, 20);
  }
  let follow: number[] | null = null;
  if (l >= toSky) {
    // 氷の階段が1段ずつ現れる
    const broken = [[3, 126], [5, 156]];
    STEPS.forEach((s, i) => {
      const t0 = toSky + 6 + i * 6;
      if (l < t0) return;
      const br = broken.find(([k]) => k === i);
      if (br && l >= br[1] + 3) return;
      iceBlock(b, s.x - 12, s.y, Math.round(24 * tw(l, t0, t0 + 4, 0.3, 1)), 6, 1);
    });
    broken.forEach(([k, t], j) => burst(b, STEPS[k].x, STEPS[k].y, l - t - 3, "ice", { n: 18, speed: 2.6, life: 18, seed: 80 + j, size: 2 }));
    // 翼の影狼:上で羽ばたき、ビームを吐く
    const wx = 64 + Math.sin(l * 0.05) * 5;
    const wy = 100 + Math.sin(l * 0.11) * 4;
    const beams = [120, 150];
    const shooting = beams.some((t) => l >= t - 6 && l < t + 10);
    const sp = shooting ? wolf(WW.beam, { winged: true }) : wolf(cyc(WW.rise, l, 3), { winged: true });
    put(b, sp, wx, wy);
    const mouth = ptOf(sp.mouth, wx, wy);
    beams.forEach((t, j) => {
      if (l >= t - 6 && l < t) glow(b, mouth[0], mouth[1], (l - t + 7) * 1.6, COL.purpleHi, 0.9);
      const tgt = STEPS[broken[j][0]];
      beam(b, mouth[0], mouth[1], tgt.x, tgt.y, l - t, 5);
    });
    // 騎士:段を駆け上がる。ビームの直前に横へ跳んでかわす
    const kStep = (ll: number) => clamp01((ll - toSky - 16) / (180 - toSky - 16)) * (STEPS.length - 1);
    const kx = (ll: number) => {
      const k = kStep(ll);
      const i = Math.min(STEPS.length - 2, Math.floor(k));
      const t = k - i;
      const dodge = beams.reduce((s, bt) => s + (ll >= bt - 8 && ll < bt + 10 ? Math.sin(((ll - bt + 8) / 18) * Math.PI) * -22 : 0), 0);
      return lerp(STEPS[i].x, STEPS[i + 1].x, t) + dodge;
    };
    const ky = (ll: number) => {
      const k = kStep(ll);
      const i = Math.min(STEPS.length - 2, Math.floor(k));
      const t = k - i;
      const dodge = beams.reduce((s, bt) => s + (ll >= bt - 8 && ll < bt + 10 ? Math.sin(((ll - bt + 8) / 18) * Math.PI) * 10 : 0), 0);
      return lerp(STEPS[i].y, STEPS[i + 1].y, t) - Math.sin(t * Math.PI) * 10 - dodge;
    };
    const dodging = beams.some((bt) => l >= bt - 8 && l < bt + 10);
    const kPose = l < toSky + 16 ? K.ready : dodging ? K.airGuard : (kStep(l) % 1) < 0.5 ? K.jump : cyc(K.run, l);
    if (l >= toSky + 4) withGhosts(b, { sp: () => knight(kPose), ghost: () => knight(K.jump, KG), x: kx, y: ky }, l, dodging || l % 12 < 6, 2, 2);
    // カメラは騎士を大きく追う(はねる動きでゆれないよう、少し前のコマと平均する)
    let ax = 0;
    let ay = 0;
    for (let q = 0; q < 8; q++) {
      ax += kx(l - q);
      ay += ky(l - q);
    }
    follow = [ax / 8, ay / 8];
  }
  if (l >= 180) veil(b, COL.greenHi, tw(l, 180, 192, 0, 0.6));
  const cam: Cam =
    l < morph ? { x: 96, y: 206, z: tw(l, 0, morph, 1.6, 2.0, E.io) }
      : l < toSky ? { x: 96, y: tw(l, morph, toSky, 206, 120, E.in), z: 1.6 }
        : follow
          ? (() => {
              // 最初のビームの前に一度、上の翼の影狼を見せる
              const look = tw(l, 100, 106, 0, 1, E.io) - tw(l, 112, 118, 0, 1, E.io);
              return { x: lerp(follow[0] + 10, 70, look), y: lerp(follow[1] - 34, 70, look), z: lerp(tw(l, toSky, toSky + 16, 1.5, 2.4, E.io), 1.6, look) };
            })()
          : { x: 90, y: 250, z: 1.5 };
  return { cam, flash: l === morph ? "#e0b0ff" : null };
};
shakeAt(SCENE * 4 + 48, 6);
shakeAt(SCENE * 4 + 123, 4);
shakeAt(SCENE * 4 + 153, 4);

// ================= シーン 6:魔法陣と鎖で拘束・剣に光を溜める =================
const S6 = (b: Buf, l: number): Partial<Frame> => {
  drawLayers(b, sky(), 300 + l * 0.6, 0);
  const wx = 112;
  const wy = 150;
  const mc = { x: 106, y: 120 };
  // 魔法陣(線を描いて現れ、回る)
  magicCircle(b, mc.x, mc.y + 30, 62, l * 0.04, tw(l, 6, 26, 0, 1));
  magicCircle(b, mc.x, mc.y - 6, 40, -l * 0.06, tw(l, 16, 34, 0, 1), 0.7);
  // もがく翼の影狼
  const sp = wolf(cyc(WW.struggle, l, l < 30 ? 3 : 4), { winged: true });
  put(b, sp, wx + (l > 30 ? Math.round(Math.sin(l * 1.3)) : 0), wy, { flip: true });
  // 鎖(魔法陣の縁から体へ)
  const ends = [[60, 92], [152, 88], [52, 150], [160, 152], [74, 186], [140, 190]];
  const body = [[100, 112], [124, 110], [96, 128], [126, 130], [104, 140], [120, 142]];
  ends.forEach((e, i) => chain(b, e[0], e[1], body[i][0], body[i][1], tw(l, 30 + i * 6, 40 + i * 6, 0, 1, E.out), Math.sin(l * 0.4 + i) * tw(l, 40, 120, 3, 1)));
  ends.forEach((e, i) => {
    if (l - 30 - i * 6 >= 0 && l - 30 - i * 6 < 8) glow(b, e[0], e[1], 6, COL.greenHi, 1 - (l - 30 - i * 6) / 8);
  });
  // 精霊術師(左下の雲の上)と騎士(右下の氷の段の上)
  put(b, mage(l < 20 ? M.float : M.raise), 38, 262 + Math.sin(l * 0.1) * 2);
  if (l < 40) glow(b, 40, 222, 8, COL.green, 0.6);
  iceBlock(b, 128, 266, 30, 6, 1);
  const kPose = l < 64 ? K.ready : K.raise;
  const ks = knight(kPose);
  put(b, ks, 142, 266);
  const tip = ptOf(ks.tip, 142, 266);
  const ch = tw(l, 70, 170, 0, 1);
  if (l >= 64) {
    for (let k = 0; k < 16; k++) {
      const life = 18;
      const t = ((l + k * 7) % life) / life;
      const a = hash(k, 9) * Math.PI * 2;
      const r = (1 - t) * (24 + hash(k, 10) * 30);
      disc(b, tip[0] + Math.cos(a) * r, tip[1] + Math.sin(a) * r, 0.8, COL.goldHi);
    }
    glow(b, tip[0], tip[1], 4 + ch * 16 + Math.sin(l * 0.9) * 2 * ch, COL.gold, 0.9);
    disc(b, tip[0], tip[1], 1 + ch * 3, COL.goldHi);
    if (ch > 0.6) for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + l * 0.1;
      line(b, tip[0], tip[1], tip[0] + Math.cos(a) * (8 + ch * 14), tip[1] + Math.sin(a) * (8 + ch * 14), COL.goldHi, 1, 0.8);
    }
  }
  const cam: Cam =
    l < 60 ? { x: tw(l, 0, 60, 100, 104), y: tw(l, 0, 60, 150, 160), z: tw(l, 0, 60, 1.25, 1.35) }
      : l < 150 ? { x: tw(l, 60, 150, 104, 120), y: tw(l, 60, 150, 160, 200), z: tw(l, 60, 150, 1.35, 1.5) }
        : { x: tw(l, 150, 186, 120, 140, E.io), y: tw(l, 150, 186, 200, 236, E.io), z: tw(l, 150, 186, 1.5, 2.6, E.in) };
  return { cam, bars: tw(l, 150, 166, 0, 1, E.out) };
};
shakeAt(SCENE * 5 + 80, 2);

// ================= シーン 7:目のアップ → 急降下の縦一閃 → 氷の粒になって消える =================
const EYES = [
  "HHHHHHhHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHhHHHHHHHHHHHH",
  "HHHHHhHHHHHHhHHHHHHHhHHHHHHHHHHHHHHHhHHHHHHHhHHHHHhHHHHHHHH",
  "HHHhHHHHHHhHHHHHHHhHHHHHSSSSSSSSSHHHhHHHHHHhHHHHHHHhHHHHHHH",
  "HhHHHHHHhHHHHHHHhHSSSSSSSSSSSSSSSSSSSHHHHHhHHHHHHHHHhHHHHHH",
  "HHHHHHhHHSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSHHHHHHHHHhHHHH",
  "HHHHhSSSSSSkkkkkkkkSSSSSSSSSSSSSSSSSSSSkkkkkkkkSSSSSSHHHHHHH",
  "HHhSSSSSkkkkkkkkkkkkSSSSSSSSSSSSSSSSSkkkkkkkkkkkkSSSSSSHHhHH",
  "HhSSSSSSSSSSSSSSSSSSSSSSSSSsSSSSSSSSSSSSSSSSSSSSSSSSSSSSHHHH",
  "HSSSSSkkkkkkkkkkkkkSSSSSSSSsSSSSSSSSSkkkkkkkkkkkkkSSSSSSSHhH",
  "HSSSSkWWWWEEEEEWWWkkSSSSSSSsSSSSSSSkkWWWEEEEEWWWWkSSSSSSSSHH",
  "SSSSkWWWWEEeeeEEWWWkSSSSSSSsSSSSSSSkWWWEEeeeEEWWWWkSSSSSSSSH",
  "SSSSkWWWEEeeOeeEEWWkSSSSSSSsSSSSSSSkWWEEeeOeeEEWWWkSSSSSSSSS",
  "SSSSkWWWEEeeeeeEEWWkSSSSSSSssSSSSSSkWWEEeeeeeEEWWWkSSSSSSSSS",
  "SSSSSkWWWEEeeeEEWWkSSSSSSSSssSSSSSSSkWWEEeeeEEWWWkSSSSSSSSSS",
  "SSSSSSkkWWEEEEEWWkkSSSSSSSssSSSSSSSSkkWWEEEEEWWkkSSSSSSSSSSS",
  "SSSSSSSSkkkkkkkkkSSSSSSSSsssSSSSSSSSSSkkkkkkkkkSSSSSSSSSSSSS",
  "sSSSSSSSSSSSSSSSSSSSSSSSssssSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSs",
  "ssSSSSSSSSSSSSSSSSSSSSSsssssSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSss",
];
const EYE_PAL = { H: hex("#f2c84a"), h: hex("#c08a28"), S: hex("#f8d0b0"), s: hex("#d8a080"), k: hex("#3a2418"), W: hex("#ffffff"), E: hex("#3070e0"), e: hex("#183070"), O: hex("#e8f4ff") };
const DIS = (() => {
  // 翼の影狼の絵から、粒の位置と色を拾う
  const sp = wolf(WW.struggle[0], { winged: true });
  const pts: number[][] = [];
  for (let y = 0; y < sp.buf.h; y += 2) for (let x = 0; x < sp.buf.w; x += 2) if (sp.buf.d[y * sp.buf.w + x]) pts.push([x - sp.ox, y - sp.oy]);
  return pts;
})();
const S7 = (b: Buf, l: number): Partial<Frame> => {
  if (l < 12) {
    // 目のアップで 0.5 秒止める(黒帯)
    b.clear(hex("#000000"));
    for (let j = 0; j < EYES.length; j++)
      for (let i = 0; i < EYES[j].length; i++) {
        const c = (EYE_PAL as Record<string, number>)[EYES[j][i]];
        for (let q = 0; q < 9; q++) b.set(1 + i * 3 + (q % 3), 133 + j * 3 + Math.floor(q / 3), c);
      }
    return { cam: { x: 90, y: 160, z: 1 }, bars: 1 };
  }
  const hit = 60;
  const z = tw(l, 12, hit, 1.1, 1.5, E.in) - tw(l, hit, 120, 0, 0.3, E.out);
  // 雲の切れ間(真上から見下ろす)。ズームで落ちていく感じ
  const layers = cloudHole();
  const tmp = new Buf(SW, SH);
  drawLayers(tmp, layers, 40, 50, [0.6, 1], 0, 0);
  b.blit(tmp, 0, 0);
  const wx = 90;
  const wy = 238;
  const dis = tw(l, hit + 2, hit + 40, 0, 1);
  // 縛られた翼の影狼(鎖の残り)
  if (dis < 1) {
    if (l < hit + 4) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => chain(b, wx + sx * 90, wy - 40 + sy * 70, wx + sx * 14, wy - 40 + sy * 10, 1, 2));
    const sp = l < hit ? wolf(cyc(WW.struggle, l, 4), { winged: true }) : wolf(WW.struggle[0], { winged: true, silhouette: "#9ad8ff" });
    put(b, sp, wx, wy, { flip: true, a: 1 - dis });
  }
  // 氷の粒になって消える
  if (l >= hit) {
    DIS.forEach(([dx, dy], i) => {
      const delay = (1 - (dy + 110) / 110) * 18 + hash(i, 1) * 8;
      const t = l - hit - delay;
      if (t < 0) return;
      const a = hash(i, 2) * Math.PI * 2;
      const v = 0.3 + hash(i, 3) * 0.9;
      const x = wx - dx + Math.cos(a) * v * t + Math.sin(t * 0.1 + i) * 2;
      const y = wy + dy + Math.sin(a) * v * t - t * 0.5;
      const al = t < 50 ? 1 : 1 - (t - 50) / 40;
      if (al > 0) disc(b, x, y, hash(i, 4) > 0.8 ? 1.2 : 0.6, i % 3 ? COL.iceHi : COL.ice, al);
    });
  }
  // 騎士:真下に急降下(さかさまの絵)
  const ky = (ll: number) => lerp(-60, 196, E.in(clamp01((ll - 14) / (hit - 14))));
  if (l < hit + 6) withGhosts(b, { sp: () => knight(K.dive), ghost: () => knight(K.dive, KG), x: () => 90, y: ky, rot: true }, l, true, 3, 2);
  if (l >= 14 && l < hit) {
    streaks(b, l, 0, -1, COL.white, 0.8, 34, 24);
    speedLines(b, 90, 220, l, COL.white, 0.6, 60);
  }
  // 縦一閃と金の同心円
  slashLine(b, 90, 0, 90, SH, l - hit, 7);
  for (let k = 0; k < 4; k++) {
    const t = l - hit - k * 4;
    if (t >= 0 && t < 22) ring(b, wx, wy - 40, t * 5, COL.gold, 2, 1 - t / 22, 0.7);
  }
  burst(b, wx, wy - 40, l - hit, "gold", { n: 24, speed: 4, life: 16, seed: 97, size: 1 });
  // 斬ったあと、騎士がゆっくり雲の切れ間へ降りていく(剣が金に光る)
  if (l >= hit + 6) {
    const ky2 = tw(l, hit + 6, 192, 200, 300, E.io);
    const sp = knight(K.raise);
    glow(b, 90, ky2 - 30, 14 + Math.sin(l * 0.3) * 2, COL.gold, tw(l, hit + 6, hit + 20, 0, 0.6));
    put(b, sp, 90, ky2, { a: tw(l, hit + 6, hit + 12, 0, 1) });
  }
  if (l > 90) snow(b, l, tw(l, 90, 140, 0, 1));
  return { cam: { x: 90, y: tw(l, 12, hit, 150, 200) + tw(l, hit + 20, 192, 0, 60, E.io), z }, bars: tw(l, 12, 30, 1, 0.6) - tw(l, hit + 20, hit + 40, 0, 0.6) };
};
hitAt(SCENE * 6 + 60, 10);
shakeAt(SCENE * 6 + 66, 5);

// ================= シーン 8:粒が雪のように降る中で着地と納刀・2人が並んで全景へ =================
const S8 = (b: Buf, l: number): Partial<Frame> => {
  drawLayers(b, vista(), 0);
  lightRays(b, l, 0.5);
  // 手前の小さな丘(二人が立つ場所)
  for (let x = 0; x < SW; x++) {
    const h = 262 - Math.round(Math.sin((x - 20) * 0.03) * 6);
    for (let y = h; y < SH; y++) b.set(x, y, y === h ? hex("#9ccc5e") : y < h + 3 ? hex("#5aa04a") : (x + y) % 5 === 0 ? hex("#2e6a36") : hex("#3e7a46"));
  }
  const ground = (x: number) => 262 - Math.round(Math.sin((x - 20) * 0.03) * 6);
  // 騎士:上から降りてきて着地 → 剣を納める
  const kx = 104;
  const ky = (ll: number) => (ll < 24 ? lerp(-40, ground(kx), E.in(clamp01((ll - 6) / 18))) : ground(kx));
  const kPose = l < 24 ? K.airGuard : l < 44 ? K.land : l < 70 ? K.ready : K.sheathe;
  withGhosts(b, { sp: () => knight(kPose), ghost: () => knight(K.airGuard, KG), x: () => kx, y: ky }, l, l < 24);
  if (l >= 24 && l < 36) burst(b, kx, ground(kx), l - 24, "spark", { n: 12, speed: 1.6, life: 12, seed: 101, dir: -Math.PI / 2, cone: 3 });
  if (l >= 70 && l < 80) glow(b, kx + 4, ground(kx) - 14, 6, COL.goldHi, 1 - (l - 70) / 10);
  // 精霊術師:ふわっと降りてくる
  const mx = 74;
  const my = lerp(120, ground(mx), E.out(clamp01((l - 30) / 70)));
  put(b, mage(l < 100 ? M.float : M.ready), mx, my);
  if (l < 100) burst(b, mx, my - 10, l % 16, "green", { n: 4, speed: 0.5, life: 16, seed: 110 + Math.floor(l / 16), grav: 0.02, size: 1 });
  snow(b, l + 300, 1, 80);
  const z = tw(l, 0, 40, 2.6, 2.4) - tw(l, 90, 186, 0, 1.4, E.io);
  return { cam: { x: tw(l, 90, 186, 90, 90), y: tw(l, 0, 90, 236, 238) - tw(l, 90, 186, 0, 78, E.io), z }, fade: tw(l, 150, 190, 0, 1) };
};

const SCENES = [S1x, S2, S3, S4, S5, S6, S7, S8];

export const drawFrame = (f: number): Frame => {
  const i = Math.min(7, Math.floor(f / SCENE));
  const l = f - i * SCENE;
  const b = new Buf(SW, SH);
  b.clear(hex("#000000"));
  const r = SCENES[i](b, l);
  // 揺れ(整数ドット)
  let sx = 0;
  let sy = 0;
  for (const [s, a] of SHAKES) {
    const t = f - s;
    if (t < 0 || t > 8) continue;
    const k = a * (1 - t / 8);
    sx += Math.round((hash(f, s, 1) - 0.5) * 2 * k);
    sy += Math.round((hash(f, s, 2) - 0.5) * 2 * k);
  }
  const cam = r.cam ?? { x: 90, y: 160, z: 1 };
  return {
    buf: b,
    cam: { x: cam.x + sx / Math.max(1, cam.z), y: cam.y + sy / Math.max(1, cam.z), z: cam.z },
    flash: HITS.includes(f) ? "#ffffff" : r.flash ?? null,
    bars: r.bars ?? 0,
    fade: r.fade ?? 0,
  };
};

/** 180×320 の絵を、カメラで切り取って ow×oh に拡大する(ぼかさない)。黒帯・フラッシュ・暗転もここで */
export const compose = (fr: Frame, ow: number, oh: number, out?: Uint32Array) => {
  const o = out ?? new Uint32Array(ow * oh);
  const z = Math.max(1, fr.cam.z);
  // 見える範囲はドットの数を整数にし、切り取りの端もドットの境目にそろえる
  // (端にドットの細い切れはしが残って「帯」に見えるのを防ぐ)
  const vw = Math.max(1, Math.round(SW / z));
  const vh = Math.max(1, Math.round(SH / z));
  const x0 = Math.max(0, Math.min(SW - vw, Math.round(fr.cam.x - vw / 2)));
  const y0 = Math.max(0, Math.min(SH - vh, Math.round(fr.cam.y - vh / 2)));
  const sxs = new Int32Array(ow);
  for (let X = 0; X < ow; X++) sxs[X] = Math.min(SW - 1, Math.max(0, Math.floor(x0 + ((X + 0.5) / ow) * vw)));
  const barH = Math.round((fr.bars * 0.13 * oh) / 6) * 6;
  const flash = fr.flash ? hex(fr.flash) : 0;
  const fadeStep = Math.round(fr.fade * 4) / 4; // 4段階で暗くする(レトロゲーム風)
  const d = fr.buf.d;
  for (let Y = 0; Y < oh; Y++) {
    const sy = Math.min(SH - 1, Math.max(0, Math.floor(y0 + ((Y + 0.5) / oh) * vh)));
    const row = Y * ow;
    if (Y < barH || Y >= oh - barH) {
      o.fill(0xff000000, row, row + ow);
      continue;
    }
    if (flash) {
      o.fill(flash, row, row + ow);
      continue;
    }
    const srow = sy * SW;
    for (let X = 0; X < ow; X++) o[row + X] = d[srow + sxs[X]] || 0xff000000;
    if (fadeStep > 0) {
      const k = 1 - fadeStep;
      for (let X = 0; X < ow; X++) {
        const v = o[row + X];
        o[row + X] = 0xff000000 | (Math.round(((v >> 16) & 255) * k) << 16) | (Math.round(((v >> 8) & 255) * k) << 8) | Math.round((v & 255) * k);
      }
    }
  }
  return o;
};
export { dither };
