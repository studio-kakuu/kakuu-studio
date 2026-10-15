// 作品006 v2:選ばれたデザイン(騎士B・精霊術師B・影狼C・翼の影狼C)と、各キャラのポーズ。
// 角度は「真下 = 0°、前(右)へ +、真上 = 180°」。走る・羽ばたくはコマを切り替える(ドット絵らしく 4〜6 コマで回す)
import { drawHuman, drawWolf, hp, humanDesign, wolfDesign, wp, type HPose, type WPose } from "./chars";
import { Buf } from "./px";

export const KNIGHT = humanDesign("knight", "B");
export const MAGE = humanDesign("mage", "B");
export const WOLF = wolfDesign("C");

// ---------------- 騎士 ----------------
export const K = {
  ready: hp({ y: 1, lean: 8, fa1: 35, fa2: 85, w: 115, ba1: -20, ba2: 15, fl1: 24, fl2: -4, bl1: -24, bl2: -12, cape: 0.25 }),
  // 走る:8コマ。脚の振りとひざの曲げ、体の上下(1〜2ドット)、前のめりのゆれ、腕とマントのゆれ
  run: Array.from({ length: 8 }, (_, i) => {
    const ph = (i / 8) * Math.PI * 2;
    const leg = (p: number) => {
      const th = 42 * Math.sin(p);
      return [th, th - 12 - 62 * Math.max(0, -Math.sin(p - 0.7))];
    };
    const [fl1, fl2] = leg(ph);
    const [bl1, bl2] = leg(ph + Math.PI);
    return hp({ y: Math.round(1 - 2.4 * Math.abs(Math.cos(ph))), lean: 20 + 4 * Math.sin(ph * 2), fa1: -38 + 10 * Math.sin(ph), fa2: -12 + 8 * Math.sin(ph), w: -112 + 6 * Math.sin(ph),
      ba1: 35 + 28 * Math.sin(ph + Math.PI), ba2: 70 + 20 * Math.sin(ph + Math.PI), fl1, fl2, bl1, bl2, cape: 0.72 + 0.12 * Math.sin(ph * 2), capeUp: 0.08 * Math.cos(ph * 2) });
  }),
  windup: hp({ y: 1, lean: -8, fa1: 165, fa2: 205, w: 230, ba1: 150, ba2: 190, fl1: 30, fl2: 0, bl1: -30, bl2: -10, cape: 0.35 }),
  // 3連撃:横なぎ → 斬り上げ → 斬り下ろし
  slash1: hp({ y: 2, lean: 22, fa1: 90, fa2: 92, w: 92, ba1: -50, ba2: -20, fl1: 48, fl2: 4, bl1: -42, bl2: -22, cape: 0.65 }),
  slash2: hp({ y: -1, lean: -12, fa1: 150, fa2: 165, w: 160, ba1: -40, ba2: -60, fl1: 20, fl2: -10, bl1: -35, bl2: -40, cape: 0.5, capeUp: 0.2 }),
  slash3: hp({ y: 3, lean: 34, fa1: 62, fa2: 35, w: 28, ba1: -60, ba2: -40, fl1: 55, fl2: 10, bl1: -48, bl2: -20, cape: 0.85 }),
  jump: hp({ y: -2, lean: 10, fa1: 105, fa2: 135, w: 140, ba1: -60, ba2: -30, fl1: 65, fl2: -25, bl1: 20, bl2: -65, cape: 0.5, capeUp: -0.3 }),
  airGuard: hp({ y: -2, lean: -6, fa1: 60, fa2: 125, w: 172, ba1: 55, ba2: 120, fl1: 55, fl2: -45, bl1: 25, bl2: -60, cape: 0.6, capeUp: 0.4 }),
  raise: hp({ y: 0, lean: 0, fa1: 176, fa2: 180, w: 180, ba1: -18, ba2: -5, fl1: 10, fl2: 0, bl1: -12, bl2: -4, cape: 0.35 }),
  // 真下に急降下:剣を頭の上へまっすぐ構えた形を描き、描いたあと 180° 回す
  dive: hp({ y: 0, lean: 0, fa1: 178, fa2: 180, w: 180, ba1: 176, ba2: 180, fl1: 4, fl2: 0, bl1: -4, bl2: 0, cape: 0.05, capeUp: -0.6 }),
  land: hp({ y: 5, lean: 28, fa1: 62, fa2: 40, w: 58, ba1: -45, ba2: -20, fl1: 70, fl2: -15, bl1: -55, bl2: -100, cape: 0.45, capeUp: 0.3 }),
  sheathe: hp({ y: 0, lean: 2, fa1: -25, fa2: 5, w: 6, ba1: -5, ba2: 25, fl1: 8, fl2: 0, bl1: -8, bl2: 0, cape: 0.2 }),
};

// ---------------- 精霊術師 ----------------
export const M = {
  ready: hp({ fa1: 28, fa2: 18, w: 176, ba1: -12, ba2: 10, cape: 0.25 }),
  raise: hp({ fa1: 172, fa2: 178, w: 180, ba1: -40, ba2: -65, cape: 0.45, capeUp: 0.2 }),
  strike: hp({ y: 1, lean: 14, fa1: 62, fa2: 42, w: 172, ba1: -30, ba2: -10, fl1: 20, bl1: -16, cape: 0.4 }),
  cast: hp({ lean: 6, fa1: 82, fa2: 102, w: 150, ba1: 70, ba2: 95, cape: 0.55, capeUp: 0.1 }),
  float: hp({ y: -2, fa1: 62, fa2: 92, w: 158, ba1: -55, ba2: -40, fl1: 10, fl2: 20, bl1: -6, bl2: 28, cape: 0.35, capeUp: 0.55 }),
};

// ---------------- 影狼 ----------------
export const W = {
  ready: wp({ y: 3, tilt: -5, neck: 18, jaw: 0.4, fl1: 26, fl2: -22, fl3: 22, fb1: -6, fb2: -10, fb3: 26, hl1: -30, hl2: 46, hl3: -30, hb1: -16, hb2: 40, hb3: -28 }),
  run: [] as WPose[],
  pounce: wp({ y: -6, tilt: 14, neck: 6, jaw: 1, fl1: 84, fl2: -8, fl3: 20, fb1: 72, fb2: -4, fb3: 18, hl1: -84, hl2: 8, hl3: -6, hb1: -72, hb2: 10, hb3: -8 }),
  claw: wp({ y: -8, tilt: 30, neck: 2, jaw: 0.9, fl1: 150, fl2: -30, fl3: -20, fb1: 70, fb2: -20, fb3: 10, hl1: -14, hl2: 34, hl3: -24, hb1: -2, hb2: 30, hb3: -24 }),
  recoil: wp({ y: -2, tilt: 24, neck: 62, jaw: 1.5, headRot: -38, fl1: -12, fl2: -24, fl3: 30, fb1: 22, fb2: -30, fb3: 40, hl1: -34, hl2: 54, hl3: -30, hb1: -20, hb2: 48, hb3: -30 }),
  roar: wp({ y: 1, tilt: 6, neck: 46, jaw: 1.7, headRot: -24, fl1: 32, fl2: -22, fl3: 20, fb1: -22, fb2: -8, fb3: 24, hl1: -30, hl2: 46, hl3: -30, hb1: -14, hb2: 40, hb3: -28 }),
};

// 走る:4つの決めポーズの間をうめて 8 コマに(体の上下と首のゆれも足す)
const WRUN_KEYS = [

    wp({ y: -3, tilt: 2, neck: 22, jaw: 0.4, fl1: 62, fl2: 0, fl3: 10, fb1: 48, fb2: -4, fb3: 14, hl1: -72, hl2: 18, hl3: -10, hb1: -58, hb2: 22, hb3: -14, tail: 0 }),
    wp({ y: 0, tilt: 0, neck: 20, jaw: 0.4, fl1: 20, fl2: -26, fl3: 30, fb1: 4, fb2: -20, fb3: 30, hl1: -20, hl2: 46, hl3: -26, hb1: -34, hb2: 40, hb3: -24, tail: 1 }),
    wp({ y: 2, tilt: -3, neck: 16, jaw: 0.4, fl1: -24, fl2: -40, fl3: 50, fb1: -36, fb2: -36, fb3: 46, hl1: 26, hl2: 32, hl3: -16, hb1: 14, hb2: 36, hb3: -20, tail: 2 }),
    wp({ y: 0, tilt: 0, neck: 20, jaw: 0.4, fl1: 8, fl2: -30, fl3: 36, fb1: 18, fb2: -24, fb3: 32, hl1: -4, hl2: 42, hl3: -24, hb1: -14, hb2: 44, hb3: -26, tail: 3 })
];
const lerpW = (a: WPose, b: WPose, k: number): WPose => {
  const o = { ...a } as Record<string, number>;
  for (const key of Object.keys(a)) o[key] = (a as unknown as Record<string, number>)[key] + ((b as unknown as Record<string, number>)[key] - (a as unknown as Record<string, number>)[key]) * k;
  return o as unknown as WPose;
};
W.run = Array.from({ length: 8 }, (_, i) => {
  const a = WRUN_KEYS[Math.floor(i / 2)];
  const b = WRUN_KEYS[(Math.floor(i / 2) + 1) % 4];
  const p = lerpW(a, b, (i % 2) * 0.5);
  return { ...p, y: p.y + (i % 2 ? -1 : 0), neck: p.neck + (i % 4 < 2 ? 3 : -3), headRot: i % 4 < 2 ? -4 : 3, tail: (i / 8) * Math.PI * 2 };
});

// ---------------- 翼の影狼 ----------------
const flapWing = [1, 0.4, -0.4, 0.2];
export const WW = {
  rise: flapWing.map((w, i) => wp({ y: -4, tilt: 22, neck: 30, jaw: 0.4, wing: w, fl1: 24, fl2: -16, fl3: 30, fb1: 10, fb2: -20, fb3: 30, hl1: -10, hl2: 26, hl3: -10, hb1: 0, hb2: 20, hb3: -10, tail: i })),
  beam: wp({ y: -2, tilt: -8, neck: -6, jaw: 1.5, headRot: 14, wing: 0.9, fl1: 40, fl2: -20, fl3: 20, fb1: 20, fb2: -20, fb3: 20, hl1: -24, hl2: 30, hl3: -20, hb1: -10, hb2: 30, hb3: -20 }),
  struggle: [0, 1, 2, 3].map((i) => wp({ y: -2 + (i % 2) * 2, tilt: [8, -6, 12, -2][i], neck: [40, 20, 50, 10][i], jaw: i % 2 ? 0.8 : 1.5, headRot: [-28, 6, -36, -8][i], wing: [0.9, 0.3, 1, 0.5][i], fl1: [60, 10, 80, 30][i], fl2: -30, fl3: 20, fb1: [20, 50, 0, 40][i], fb2: -20, fb3: 20, hl1: [-50, -20, -60, -30][i], hl2: 30, hl3: -20, hb1: [-30, -50, -20, -40][i], hb2: 30, hb3: -20, tail: i })),
};

// ---------------- 絵にする(同じポーズは作り直さない) ----------------
type Sprite = { buf: Buf; ox: number; oy: number; tip?: number[]; mouth?: number[]; neck?: number[] };
const cache = new Map<string, Sprite>();
const key = (o: unknown) => JSON.stringify(o);
export const knight = (p: HPose, o: { flash?: boolean; silhouette?: string } = {}): Sprite => {
  const k = "k" + key([p, o]);
  if (!cache.has(k)) cache.set(k, drawHuman(KNIGHT, p, o));
  return cache.get(k)!;
};
export const mage = (p: HPose, o: { flash?: boolean; silhouette?: string } = {}): Sprite => {
  const k = "m" + key([p, o]);
  if (!cache.has(k)) cache.set(k, drawHuman(MAGE, p, o));
  return cache.get(k)!;
};
export const wolf = (p: WPose, o: { winged?: boolean; flash?: boolean; silhouette?: string } = {}): Sprite => {
  const k = "w" + key([p, o]);
  if (!cache.has(k)) cache.set(k, drawWolf(WOLF, p, o));
  return cache.get(k)!;
};
export type { Sprite };
