// スマホ枠のカメラワーク(傾き・寄り・引き)。秒 → ポーズ。
// 区間の切れ目(STEPカードで画面が隠れている瞬間)ではポーズが飛んでよい。
import { Easing, interpolate } from "remotion";
import { TL } from "../config";

export type Pose = { rx: number; ry: number; rz: number; s: number; ty: number; dim: number };

const P = (rx: number, ry: number, rz: number, s: number, ty: number, dim = 0): Pose => ({ rx, ry, rz, s, ty, dim });
const settle = Easing.bezier(0.16, 1, 0.3, 1);   // 素早く入ってゆっくり止まる
const glide = Easing.bezier(0.45, 0, 0.55, 1);   // ゆるやかに

const mix = (a: Pose, b: Pose, k: number): Pose => ({
  rx: a.rx + (b.rx - a.rx) * k,
  ry: a.ry + (b.ry - a.ry) * k,
  rz: a.rz + (b.rz - a.rz) * k,
  s: a.s + (b.s - a.s) * k,
  ty: a.ty + (b.ty - a.ty) * k,
  dim: a.dim + (b.dim - a.dim) * k,
});
// t が [t0, t1] のあいだ a → b
const seg = (t: number, t0: number, t1: number, a: Pose, b: Pose, easing = glide) =>
  mix(a, b, interpolate(t, [t0, t1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing }));

export const poseAt = (t: number): Pose => {
  const [, introEnd] = TL.intro;
  const s1 = TL.step1[0], s2 = TL.step2[0], s3 = TL.step3[0], c = TL.complete[0], cl = TL.closing[0];

  if (t < TL.hook[1]) return P(16, -30, 6, 0.84, 110, 0.55);
  if (t < s1) {
    const a = seg(t, TL.intro[0], TL.intro[0] + 2.6, P(16, -30, 6, 0.84, 110, 0.55), P(5, -9, 1, 1, 30), settle);
    return t < TL.intro[0] + 2.6 ? a : seg(t, TL.intro[0] + 2.6, introEnd, P(5, -9, 1, 1, 30), P(1, 7, 0, 1.02, 20));
  }
  if (t < s2) {
    return t < s1 + 2.4
      ? seg(t, s1 + 0.5, s1 + 2.4, P(10, 26, -3, 0.9, 40), P(3, 6, 0, 1, 24), settle)
      : seg(t, s1 + 2.4, s2, P(3, 6, 0, 1, 24), P(1, -9, 0, 1.01, 20));
  }
  if (t < s3) {
    return t < s2 + 2.4
      ? seg(t, s2 + 0.5, s2 + 2.4, P(10, -26, 3, 0.9, 40), P(3, -6, 0, 1, 24), settle)
      : seg(t, s2 + 2.4, s3, P(3, -6, 0, 1, 24), P(1, 9, 0, 1.01, 20));
  }
  if (t < c) {
    // 寄りで湯気を見せてから、引いて全体へ
    if (t < s3 + 4.2) return seg(t, s3 + 0.5, s3 + 4.2, P(4, 0, 0, 1.5, 520), P(0, 0, 0, 1.42, 470));
    if (t < s3 + 7) return seg(t, s3 + 4.2, s3 + 7, P(0, 0, 0, 1.42, 470), P(2, -5, 0, 1, 24), settle);
    return seg(t, s3 + 7, c, P(2, -5, 0, 1, 24), P(1, 8, 0, 1.01, 20));
  }
  if (t < cl) return seg(t, c + 0.5, cl, P(6, 18, -2, 0.94, 30), P(1, -6, 0, 1.03, 20));
  return seg(t, cl, cl + 1.3, P(1, -6, 0, 1.03, 20), P(16, -18, 4, 0.6, -360, 0.62), settle);
};

// ---------- テーマの scenes から作るカメラ(作品ごとに自由に組める) ----------
// camera: { to: [rx, ry, rz, scale, ty, dim], from?: [...], move?: 秒, ease?: "settle" | "glide", drift?: [rx, ry, rz, scale, ty, dim] }
//   from を省くと前の場面の終わりのポーズから動き出す。move 秒かけて to へ。drift があれば残りの時間で to → drift へゆっくり流れる。
export type SceneCamera = { to: number[]; from?: number[]; move?: number; ease?: "settle" | "glide"; drift?: number[] };
export type SceneSpec = { from: number; to: number; camera: SceneCamera };
const arr = (a: number[]) => P(a[0], a[1], a[2], a[3], a[4], a[5] ?? 0);
export const scenePose = (scenes: SceneSpec[]) => (t: number): Pose => {
  let prev: Pose = P(0, 0, 0, 1, 0);
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const c = sc.camera;
    const start = c.from ? arr(c.from) : prev;
    const target = arr(c.to);
    const end = c.drift ? arr(c.drift) : target;
    const move = Math.min(c.move ?? sc.to - sc.from, sc.to - sc.from);
    if (t < sc.to || i === scenes.length - 1) {
      if (t < sc.from + move) return seg(t, sc.from, sc.from + move, start, target, c.ease === "glide" ? glide : settle);
      return c.drift ? seg(t, sc.from + move, sc.to, target, end, glide) : target;
    }
    prev = end;
  }
  return prev;
};
