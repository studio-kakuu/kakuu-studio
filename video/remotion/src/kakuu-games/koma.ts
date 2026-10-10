// コマ(KAKUU のオリジナルのアンドロイド)を、小さなキューブの粒で組み立てる。
// 骨格の「休みの姿勢」(T ポーズ寄り、足は床 y=0、正面は +Z、コマの左手が +X)で粒を置き、各粒を1本の骨にくっつける。
// 設定画:白い枠の角の丸いモニターの頭/黒い画面にライムの丸い目2つ/アンテナ1本(先にライムの玉)/首に黒いヘッドホン/
//        黒いパーカー(前が開いていて、内側とフチがライム、ライムのひも)/黒い細身のパンツ/黒い靴にライムの差し色/手はロボット

export type V3 = [number, number, number];
export type Voxel = { p: V3; j: number; c: number; s: number };

// 色(粒の色は黒・白・ライムが基本。黒の中に少し明るさの違いをつけて形を読ませる)
export const PALETTE = [
  "#161616", // 0 パーカー
  "#0B0B0B", // 1 中のシャツ
  "#C6FF3D", // 2 ライム
  "#F2F0E9", // 3 オフホワイト(モニターの枠)
  "#0E0E0E", // 4 画面
  "#2E2E2E", // 5 ロボットの手・首(濃いグレー)
  "#232323", // 6 袖口・すそのリブ
  "#121212", // 7 パンツ・靴
  "#D8D4C8", // 8 モニターの後ろ(少し影)
  "#1C1C1C", // 9 ヘッドホン
];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.sqrt(dot(a, a));

export function buildKoma(rest: Record<string, V3>, joints: string[]): Voxel[] {
  const J = (n: string) => joints.indexOf(n);
  const R = (n: string) => rest[n];
  const out: Voxel[] = [];
  const seen = new Set<string>();
  const add = (p: V3, j: string, c: number, s: number) => {
    const k = `${Math.round(p[0] / (s * 0.5))},${Math.round(p[1] / (s * 0.5))},${Math.round(p[2] / (s * 0.5))}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ p, j: J(j), c, s });
  };
  // 格子の上を走査して、条件に合う所に粒を置く
  const fill = (min: V3, max: V3, v: number, f: (p: V3) => { j: string; c: number } | null) => {
    for (let x = Math.floor(min[0] / v) * v; x <= max[0]; x += v)
      for (let y = Math.floor(min[1] / v) * v; y <= max[1]; y += v)
        for (let z = Math.floor(min[2] / v) * v; z <= max[2]; z += v) {
          const p: V3 = [x, y, z];
          const r = f(p);
          if (r) add(p, r.j, r.c, v);
        }
  };
  // 骨のまわりの筒(殻だけ)
  const limb = (a: string, b: string, r0: number, r1: number, v: number, color: (t: number, p: V3) => number, joint = a, t0 = 0, t1 = 1) => {
    const A = R(a), B = R(b), d = sub(B, A), L = len(d);
    const m = Math.max(r0, r1) + v;
    const min: V3 = [Math.min(A[0], B[0]) - m, Math.min(A[1], B[1]) - m, Math.min(A[2], B[2]) - m];
    const max: V3 = [Math.max(A[0], B[0]) + m, Math.max(A[1], B[1]) + m, Math.max(A[2], B[2]) + m];
    fill(min, max, v, (p) => {
      const t = dot(sub(p, A), d) / (L * L);
      if (t < t0 || t > t1) return null;
      const q: V3 = [A[0] + d[0] * t, A[1] + d[1] * t, A[2] + d[2] * t];
      const r = r0 + (r1 - r0) * t, dist = len(sub(p, q));
      if (dist > r || dist < r - v * 1.3) return null;
      return { j: joint, c: color(t, p) };
    });
  };

  const VB = 0.026; // 体の粒
  const VH = 0.019; // 頭の粒(目を丸く見せるため細かく)
  const hips = R("Hips");

  // ── 胴(パーカー)──
  const chestY = R("Spine1")[1];
  const neckY = R("Neck1")[1];
  fill([hips[0] - 0.24, hips[1] - 0.1, hips[2] - 0.16], [hips[0] + 0.24, neckY + 0.02, hips[2] + 0.16], VB, (p) => {
    const y = p[1], x = p[0] - hips[0], z = p[2] - hips[2];
    const k = (y - (hips[1] - 0.1)) / (neckY + 0.02 - (hips[1] - 0.1)); // 0 すそ → 1 首元
    const w = 0.2 + 0.03 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.8) - (k > 0.86 ? (k - 0.86) * 0.9 : 0); // 肩に向かってすぼまる
    const dz = 0.115 + 0.01 * Math.sin(k * Math.PI);
    const e = (x / w) ** 2 + (z / dz) ** 2;
    if (e > 1 || e < 0.62) return null;
    const j = y < hips[1] + 0.06 ? "LowerBack" : y < chestY - 0.03 ? "Spine" : "Spine1";
    let c = 0;
    const front = z > 0.05;
    if (front && Math.abs(x) < 0.05) c = 1; // 前が開いて中のシャツが見える
    else if (front && Math.abs(x) < 0.075) c = 2; // ファスナーのフチ(ライム)
    if (k < 0.1) c = 6; // すそのリブ
    return { j, c };
  });
  // パーカーのひも(ライム)
  for (const sx of [-1, 1])
    for (let y = neckY - 0.02; y > chestY - 0.13; y -= VB * 0.8) add([hips[0] + sx * 0.06, y, hips[2] + 0.13], "Spine1", 2, VB * 0.7);
  // フード(首の後ろの盛り上がり、内側ライム)
  fill([hips[0] - 0.17, neckY - 0.04, hips[2] - 0.16], [hips[0] + 0.17, neckY + 0.11, hips[2] + 0.1], VB, (p) => {
    const x = p[0] - hips[0], y = p[1] - neckY, z = p[2] - hips[2];
    const rr = Math.sqrt(x * x + (z + 0.02) * (z + 0.02));
    if (rr > 0.16 || rr < 0.1) return null;
    if (z > 0.06 && Math.abs(x) < 0.09) return null; // 前は開ける
    const h = 0.05 + (z < -0.02 ? 0.05 : 0);
    if (y < -0.04 || y > h) return null;
    return { j: "Spine1", c: rr < 0.125 ? 2 : 0 };
  });

  // ── 首(ロボット)とヘッドホン ──
  limb("Neck1", "Head", 0.035, 0.032, VB * 0.8, () => 5, "Neck1");
  const hp = R("Neck1");
  for (let a = 0; a < Math.PI * 2; a += 0.12) {
    const x = Math.cos(a) * 0.105, z = Math.sin(a) * 0.09;
    if (z > 0.07) continue; // のどの前は空ける
    add([hp[0] + x, hp[1] + 0.01, hp[2] + z - 0.005], "Neck1", 9, VB * 0.8);
  }
  for (const sx of [-1, 1])
    fill([hp[0] + sx * 0.1 - 0.05, hp[1] - 0.05, hp[2] - 0.05], [hp[0] + sx * 0.1 + 0.05, hp[1] + 0.05, hp[2] + 0.05], VB * 0.8, (p) => {
      const dx = p[0] - (hp[0] + sx * 0.105), dy = p[1] - hp[1] - 0.005, dz = p[2] - hp[2] + 0.01;
      const r = Math.sqrt(dy * dy + dz * dz);
      return r < 0.048 && Math.abs(dx) < 0.03 ? { j: "Neck1", c: Math.abs(dx) < 0.012 && r < 0.03 ? 5 : 9 } : null;
    });

  // ── 腕(袖)と手(ロボット)──
  for (const s of ["Left", "Right"]) {
    limb(`${s}Arm`, `${s}ForeArm`, 0.072, 0.064, VB, () => 0);
    limb(`${s}ForeArm`, `${s}Hand`, 0.064, 0.056, VB, (t) => (t > 0.82 ? 6 : 0));
    limb(`${s}Hand`, `${s}HandIndex1_end`, 0.042, 0.036, VB * 0.75, () => 5, `${s}Hand`);
    // 肩を丸く
    const sh = R(`${s}Arm`);
    fill([sh[0] - 0.09, sh[1] - 0.09, sh[2] - 0.09], [sh[0] + 0.09, sh[1] + 0.09, sh[2] + 0.09], VB, (p) => {
      const d = len(sub(p, sh));
      return d < 0.085 && d > 0.085 - VB * 1.3 ? { j: `${s}Arm`, c: 0 } : null;
    });
  }

  // ── 脚(細身のパンツ)と靴 ──
  for (const s of ["Left", "Right"]) {
    limb(`${s}UpLeg`, `${s}Leg`, 0.078, 0.06, VB, () => 7);
    limb(`${s}Leg`, `${s}Foot`, 0.06, 0.047, VB, () => 7);
    const ank = R(`${s}Foot`), toe = R(`${s}ToeBase_end`);
    const side = s === "Left" ? 1 : -1;
    // 靴:かかと〜つま先の箱(底は厚め)、外側にライムの線
    const zMin = ank[2] - 0.07, zMax = toe[2] + 0.02;
    fill([ank[0] - 0.08, -0.005, zMin], [ank[0] + 0.08, ank[1] + 0.06, zMax], VB * 0.85, (p) => {
      const x = p[0] - ank[0], y = p[1], z = p[2];
      const k = (z - zMin) / (zMax - zMin);
      const top = 0.1 - 0.05 * Math.max(0, k - 0.45) / 0.55;
      const w = 0.055 + 0.01 * Math.sin(k * Math.PI);
      if (Math.abs(x) > w || y > top) return null;
      const inner = Math.abs(x) < w - VB && y > 0.02 && y < top - VB * 0.9;
      if (inner) return null;
      const swoosh = x * side > w - VB * 1.2 && Math.abs(y - (0.03 + 0.04 * k)) < 0.012 && k > 0.15 && k < 0.85;
      const j = k > 0.72 ? `${s}ToeBase` : `${s}Foot`;
      return { j, c: swoosh ? 2 : y < 0.022 ? 6 : 7 };
    });
  }

  // ── 頭:角の丸いモニター(白い枠/黒い画面/ライムの目)──
  const hd = R("Head");
  const C: V3 = [hd[0], hd[1] + 0.13, hd[2] + 0.03];
  const W = 0.2, H = 0.155, D0 = 0.1, D1 = -0.06, RC = 0.05; // 半幅・半高・前面z・背面z・角の丸み
  const inRound = (x: number, y: number, w: number, h: number, rc: number) => {
    const ax = Math.abs(x) - (w - rc), ay = Math.abs(y) - (h - rc);
    if (ax > 0 && ay > 0) return ax * ax + ay * ay <= rc * rc;
    return Math.abs(x) <= w && Math.abs(y) <= h;
  };
  fill([C[0] - W, C[1] - H, C[2] + D1], [C[0] + W, C[1] + H, C[2] + D0], VH, (p) => {
    const x = p[0] - C[0], y = p[1] - C[1], z = p[2] - C[2];
    if (!inRound(x, y, W, H, RC)) return null;
    const edge = !inRound(x, y, W - VH * 1.2, H - VH * 1.2, RC);
    const front = z > D0 - VH * 1.1, back = z < D1 + VH * 1.1;
    if (!edge && !front && !back) return null;
    let c = 3;
    if (front) {
      const scr = inRound(x, y + 0.008, W - 0.034, H - 0.034, 0.03);
      if (scr) {
        c = 4;
        for (const ex of [-0.072, 0.072]) if ((x - ex) ** 2 + (y - 0.012) ** 2 < 0.034 ** 2) c = 2;
      }
      if (y < -H + 0.022 && x > W - 0.075 && x < W - 0.03) c = 5; // 右下の細いすき間
    }
    return { j: "Head", c };
  });
  // 画面は少し奥に(枠の厚みが見えるように)…前面の画面の粒を一段下げる
  for (const v of out) {
    if (v.j === J("Head") && (v.c === 4 || v.c === 2) && v.p[2] > C[2] + D0 - VH * 1.1) v.p = [v.p[0], v.p[1], v.p[2] - VH * 0.6];
  }
  // モニターの後ろの出っぱり
  fill([C[0] - 0.14, C[1] - 0.11, C[2] + D1 - 0.08], [C[0] + 0.14, C[1] + 0.11, C[2] + D1], VH, (p) => {
    const x = p[0] - C[0], y = p[1] - C[1], z = p[2] - C[2];
    const k = (D1 - z) / 0.08; // 0..1 奥ほど小さく
    const w = 0.14 - 0.04 * k, h = 0.11 - 0.03 * k;
    if (!inRound(x, y, w, h, 0.04)) return null;
    const edge = !inRound(x, y, w - VH * 1.2, h - VH * 1.2, 0.04) || k > 0.85;
    return edge ? { j: "Head", c: 8 } : null;
  });
  // アンテナ(先にライムの玉)
  const ax = C[0] - 0.02;
  for (let y = C[1] + H; y < C[1] + H + 0.15; y += VH * 0.8) add([ax, y, C[2]], "Head", 5, VH * 0.7);
  const top: V3 = [ax, C[1] + H + 0.17, C[2]];
  fill([top[0] - 0.03, top[1] - 0.03, top[2] - 0.03], [top[0] + 0.03, top[1] + 0.03, top[2] + 0.03], VH * 0.8, (p) =>
    len(sub(p, top)) < 0.027 ? { j: "Head", c: 2 } : null,
  );

  return out;
}

// ボール(白い粒に黒い線)
export function buildBall(r: number): { p: V3; c: number; s: number }[] {
  const v = 0.022, out: { p: V3; c: number; s: number }[] = [];
  for (let x = -r; x <= r; x += v)
    for (let y = -r; y <= r; y += v)
      for (let z = -r; z <= r; z += v) {
        const d = Math.sqrt(x * x + y * y + z * z);
        if (d > r || d < r - v * 1.2) continue;
        const seam = Math.abs(x) < v * 0.6 || Math.abs(y) < v * 0.6 || Math.abs(Math.sqrt(x * x + z * z) - r * 0.72) < v * 0.55;
        out.push({ p: [x, y, z], c: seam ? 4 : 3, s: v });
      }
  return out;
}
