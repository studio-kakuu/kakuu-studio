// コマ(KAKUU のオリジナルのアンドロイド)の、なめらかな3Dモデル。アニメ調の塗り(トゥーン)+黒い輪郭線。
// 骨格の「休みの姿勢」(足は床 y=0、正面は +Z、コマの左手が +X)で部品を置き、各部品を1本の骨にくっつける(体は崩れない)。
// 設定画:白い枠の角の丸いモニターの頭/つやのある黒い画面にライムの丸い目2つ/アンテナ(先にライムの玉)/首に黒いヘッドホン/
//        黒いパーカー(前が開いて、内側とファスナーのフチがライム、ライムのひも)/黒い細身のパンツ/厚底スニーカーにライムの線/手はロボット
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type V3 = [number, number, number];

export const COL = {
  jacket: "#2C2C2E",
  rib: "#1E1E20",
  shirt: "#111112",
  pants: "#232325",
  robot: "#4A4A4E",
  shoe: "#252527",
  sole: "#141415",
  phones: "#1C1C1E",
  monitor: "#F2F0E9",
  monitorBack: "#DCD8CC",
  screen: "#0E0E0E",
  lime: "#C6FF3D",
  ink: "#0E0E0E",
};

// トゥーンの段(暗い所・中間・明るい所の3段)
const gradient = (() => {
  const d = new Uint8Array([70, 150, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const toonCache = new Map<string, THREE.MeshToonMaterial>();
const toon = (c: string) => {
  if (!toonCache.has(c)) toonCache.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: gradient }));
  return toonCache.get(c)!;
};
const flatCache = new Map<string, THREE.MeshBasicMaterial>();
const flat = (c: string, opacity = 1) => {
  const k = `${c}/${opacity}`;
  if (!flatCache.has(k)) flatCache.set(k, new THREE.MeshBasicMaterial({ color: c, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  return flatCache.get(k)!;
};
// 輪郭線:裏面だけを、法線の向きに少しふくらませて黒で描く
const outlineCache = new Map<number, THREE.MeshBasicMaterial>();
export const outlineMat = (w: number) => {
  if (!outlineCache.has(w)) {
    const m = new THREE.MeshBasicMaterial({ color: COL.ink, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `vec3 transformed = position + normalize(normal) * ${w.toFixed(4)};`);
    };
    m.customProgramCacheKey = () => `outline${w}`;
    outlineCache.set(w, m);
  }
  return outlineCache.get(w)!;
};

// 両端の太さが違うカプセル(Y 方向に長さ L)
function taperCapsule(r0: number, r1: number, L: number) {
  const pts: THREE.Vector2[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (Math.PI / 2) * (i / n); pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
  for (let i = 0; i <= n; i++) { const a = (Math.PI / 2) * (i / n); pts.push(new THREE.Vector2(Math.cos(a) * r1, L + Math.sin(a) * r1)); }
  pts[0].x = 0.0001; pts[pts.length - 1].x = 0.0001;
  const g = new THREE.LatheGeometry(pts, 24);
  g.computeVertexNormals();
  return g;
}
const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 8);
};

export type KomaRig = { root: THREE.Group; groups: Map<number, THREE.Group> };

export function buildKoma3D(rest: Record<string, V3>, joints: string[]): KomaRig {
  const root = new THREE.Group();
  const groups = new Map<number, THREE.Group>();
  const R = (n: string) => new THREE.Vector3(...rest[n]);
  const G = (n: string) => {
    const j = joints.indexOf(n);
    if (!groups.has(j)) { const g = new THREE.Group(); groups.set(j, g); root.add(g); }
    return groups.get(j)!;
  };
  // 部品を置く(位置は休みの姿勢の世界座標)。outline>0 なら輪郭線もつける
  const put = (joint: string, geo: THREE.BufferGeometry, mat: THREE.Material, pos: THREE.Vector3, quat = new THREE.Quaternion(), outline = 0.009, shadow = true) => {
    const g = G(joint);
    const local = pos.clone().sub(R(joint));
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(local); m.quaternion.copy(quat); m.castShadow = shadow;
    g.add(m);
    if (outline > 0) {
      const o = new THREE.Mesh(geo, outlineMat(outline));
      o.position.copy(local); o.quaternion.copy(quat);
      g.add(o);
    }
    return m;
  };
  const limb = (joint: string, a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, color: string, outline = 0.009) => {
    const d = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    put(joint, taperCapsule(r0, r1, d.length()), toon(color), a, q, outline);
  };
  const box = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 4, r);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const hips = R("Hips");

  // ── 腰とパンツ ──
  put("Hips", box(0.29, 0.17, 0.19, 0.07), toon(COL.pants), V(hips.x, hips.y - 0.04, hips.z));
  for (const s of ["Left", "Right"]) {
    limb(`${s}UpLeg`, R(`${s}UpLeg`), R(`${s}Leg`), 0.07, 0.056, COL.pants);
    limb(`${s}Leg`, R(`${s}Leg`), R(`${s}Foot`), 0.056, 0.046, COL.pants);
    // ── 厚底スニーカー(底は厚く、外側にライムの線)──
    const ank = R(`${s}Foot`), side = s === "Left" ? 1 : -1;
    const cz = ank.z + 0.07;
    put(`${s}Foot`, box(0.125, 0.085, 0.31, 0.04), toon(COL.shoe), V(ank.x, 0.085, cz));
    put(`${s}Foot`, box(0.135, 0.05, 0.33, 0.022), toon(COL.sole), V(ank.x, 0.026, cz + 0.005));
    put(`${s}Foot`, new THREE.BoxGeometry(0.004, 0.012, 0.28), flat(COL.lime), V(ank.x + side * 0.0685, 0.047, cz + 0.005), undefined, 0, false);
    put(`${s}Foot`, new THREE.BoxGeometry(0.004, 0.012, 0.28), flat(COL.lime), V(ank.x - side * 0.0685, 0.047, cz + 0.005), undefined, 0, false);
    // 横のライムの流れる線(かかとから斜め上へ)
    const sw = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.45, 0, 0));
    put(`${s}Foot`, new THREE.BoxGeometry(0.004, 0.016, 0.13), flat(COL.lime), V(ank.x + side * 0.064, 0.095, cz + 0.02), sw, 0, false);
    limb(`${s}Foot`, V(ank.x, 0.1, ank.z - 0.01), V(ank.x, 0.15, ank.z - 0.01), 0.05, 0.048, COL.rib, 0.007); // はき口
  }

  // ── パーカー(前が開いている)──
  const spine = R("Spine"), chest = R("Spine1"), neck = R("Neck1");
  put("LowerBack", box(0.37, 0.07, 0.235, 0.03), toon(COL.rib), V(hips.x, hips.y - 0.0, hips.z)); // すそのリブ
  put("LowerBack", box(0.385, 0.2, 0.245, 0.08), toon(COL.jacket), V(hips.x, hips.y + 0.1, hips.z));
  put("Spine1", box(0.43, 0.25, 0.26, 0.1), toon(COL.jacket), V(chest.x, chest.y + 0.01, chest.z - 0.005));
  // 前の開き:中の黒いシャツと、両側のライムのフチ(骨ごとに分けて、曲げても浮かないように)
  const front = (joint: string, y0: number, y1: number, z: number) => {
    const h = y1 - y0, cy = (y0 + y1) / 2;
    put(joint, box(0.1, h, 0.02, 0.008), toon(COL.shirt), V(hips.x, cy, z), undefined, 0, false);
    for (const sx of [-1, 1]) put(joint, new THREE.BoxGeometry(0.014, h, 0.012), flat(COL.lime), V(hips.x + sx * 0.057, cy, z + 0.004), undefined, 0, false);
  };
  front("LowerBack", hips.y - 0.02, spine.y + 0.04, hips.z + 0.122);
  front("Spine1", spine.y + 0.04, chest.y + 0.13, chest.z + 0.127);
  // フード(首の後ろ。内側はライム)
  const hood = new THREE.TorusGeometry(0.125, 0.045, 12, 32, Math.PI * 1.45);
  const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI * 0.275 + Math.PI));
  put("Spine1", hood, toon(COL.jacket), V(neck.x, neck.y + 0.0, neck.z - 0.02), hq);
  put("Spine1", new THREE.TorusGeometry(0.098, 0.026, 10, 32, Math.PI * 1.35), flat(COL.lime), V(neck.x, neck.y + 0.025, neck.z - 0.02),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI * 0.325 + Math.PI)), 0, false);
  // ひも(ライム)
  for (const sx of [-1, 1]) {
    put("Spine1", new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), flat(COL.lime), V(hips.x + sx * 0.04, chest.y + 0.04, chest.z + 0.138), undefined, 0, false);
    put("Spine1", new THREE.CylinderGeometry(0.009, 0.009, 0.022, 8), toon(COL.ink), V(hips.x + sx * 0.04, chest.y - 0.045, chest.z + 0.138), undefined, 0, false);
  }

  // ── 腕(袖)と、ロボットの手 ──
  for (const s of ["Left", "Right"]) {
    const sh = R(`${s}Arm`), el = R(`${s}ForeArm`), wr = R(`${s}Hand`), tip = R(`${s}HandIndex1_end`);
    const dir = s === "Left" ? 1 : -1;
    put(`${s}Arm`, new THREE.SphereGeometry(0.085, 24, 16), toon(COL.jacket), sh.clone().add(V(-dir * 0.01, 0, 0)));
    limb(`${s}Arm`, sh, el, 0.078, 0.068, COL.jacket);
    limb(`${s}ForeArm`, el, wr.clone().add(V(-dir * 0.03, 0, 0)), 0.068, 0.06, COL.jacket);
    put(`${s}ForeArm`, new THREE.CylinderGeometry(0.056, 0.056, 0.045, 20), toon(COL.rib), wr.clone().add(V(-dir * 0.035, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), 0.007);
    // 手首(ロボット)
    limb(`${s}Hand`, wr.clone().add(V(-dir * 0.02, 0, 0)), wr.clone().add(V(dir * 0.015, 0, 0)), 0.022, 0.022, COL.robot, 0.006);
    // 手のひら+指
    const palm = wr.clone().lerp(tip, 0.35);
    put(`${s}Hand`, box(0.07, 0.026, 0.07, 0.012), toon(COL.robot), palm, undefined, 0.006);
    for (let k = 0; k < 4; k++) {
      const z = palm.z - 0.026 + k * 0.0175;
      const a = palm.clone().add(V(dir * 0.035, -0.004, z - palm.z));
      limb(`${s}Hand`, a, a.clone().add(V(dir * 0.045, -0.018, 0)), 0.0075, 0.0068, COL.robot, 0.004);
    }
    const ta = palm.clone().add(V(dir * 0.005, -0.006, 0.038));
    limb(`${s}Hand`, ta, ta.clone().add(V(dir * 0.03, -0.012, 0.022)), 0.009, 0.008, COL.robot, 0.004);
  }

  // ── 首(ロボット)とヘッドホン ──
  limb("Neck1", neck.clone().add(V(0, -0.03, 0)), R("Head").add(V(0, 0.02, 0)), 0.036, 0.032, COL.robot, 0.007);
  const ph = new THREE.TorusGeometry(0.098, 0.02, 10, 32, Math.PI * 1.5);
  put("Neck1", ph, toon(COL.phones), V(neck.x, neck.y + 0.0, neck.z - 0.005), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI * 0.75)));
  for (const sx of [-1, 1]) {
    const cq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
    put("Neck1", new THREE.CylinderGeometry(0.048, 0.048, 0.04, 24), toon(COL.phones), V(neck.x + sx * 0.1, neck.y + 0.0, neck.z + 0.02), cq);
    put("Neck1", new THREE.CylinderGeometry(0.03, 0.03, 0.044, 20), toon(COL.robot), V(neck.x + sx * 0.1, neck.y + 0.0, neck.z + 0.02), cq, 0, false);
  }

  // ── 頭:角の丸いモニター ──
  const hd = R("Head");
  const C = V(hd.x, hd.y + 0.13, hd.z + 0.03);
  const W = 0.4, H = 0.31, D = 0.19;
  put("Head", box(W, H, D, 0.05), toon(COL.monitor), C, undefined, 0.011);
  put("Head", box(0.28, 0.22, 0.12, 0.045), toon(COL.monitorBack), C.clone().add(V(0, -0.005, -D / 2 - 0.045)), undefined, 0.01);
  put("Head", box(0.03, 0.1, 0.08, 0.012), toon(COL.monitorBack), C.clone().add(V(W / 2 + 0.008, 0.01, -0.02)), undefined, 0.006); // 横のつまみ
  const fz = C.z + D / 2 + 0.0015;
  // 黒い画面(少しつや:左上に白い光の筋)
  put("Head", roundedRect(W - 0.07, H - 0.075, 0.035), flat(COL.screen), V(C.x, C.y + 0.006, fz), undefined, 0, false);
  const gl = roundedRect(0.1, 0.012, 0.006);
  put("Head", gl, flat("#FFFFFF", 0.22), V(C.x - 0.09, C.y + 0.085, fz + 0.0006), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12)), 0, false);
  // ライムの丸い目(まわりにうすい光)
  for (const ex of [-0.072, 0.072]) {
    put("Head", new THREE.CircleGeometry(0.052, 40), flat(COL.lime, 0.18), V(C.x + ex, C.y + 0.016, fz + 0.0008), undefined, 0, false);
    put("Head", new THREE.CircleGeometry(0.035, 40), flat(COL.lime), V(C.x + ex, C.y + 0.016, fz + 0.0012), undefined, 0, false);
  }
  // 右下の細いすき間
  put("Head", roundedRect(0.045, 0.008, 0.003), flat(COL.ink), V(C.x + W / 2 - 0.06, C.y - H / 2 + 0.02, fz), undefined, 0, false);
  // アンテナ(先にライムの玉)
  const ab = C.clone().add(V(-0.02, H / 2, 0));
  limb("Head", ab, ab.clone().add(V(0.004, 0.16, -0.01)), 0.0055, 0.0045, COL.robot, 0.004);
  put("Head", new THREE.SphereGeometry(0.026, 20, 14), flat(COL.lime), ab.clone().add(V(0.004, 0.175, -0.01)), undefined, 0.006);

  return { root, groups };
}

// バスケットボール(くすんだ橙に黒い線)
export function buildBall(r: number) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 32, 20);
  const m = new THREE.Mesh(geo, toon("#C26A33")); m.castShadow = true; g.add(m);
  g.add(new THREE.Mesh(geo, outlineMat(0.007)));
  const line = (q: THREE.Quaternion, rr = r * 1.002) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0035, 6, 64), flat(COL.ink)); t.quaternion.copy(q); g.add(t);
  };
  line(new THREE.Quaternion());
  line(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.0035, 6, 64), flat(COL.ink));
    t.rotation.set(0, Math.PI / 2, 0); t.position.x = sx * r * 0.69; g.add(t);
  }
  return g;
}
