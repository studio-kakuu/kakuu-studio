// KAKUU GAMES — 1競技ぶんの映像(縦 1080×1920 / 30fps / テーマ曲 130BPM:1拍 0.4615 秒・1小節 1.846 秒・10小節)
// コマはなめらかな3Dモデル(トゥーンの塗り+黒い輪郭線)。モーションキャプチャ(CMU)の骨の動きで部品を動かす。体は崩さない。
// 力が解放される瞬間(小節の1拍目)は、3コマの止め・衝撃波の輪・スピード線・破片とほこり・カメラの寄り引きとわずかな揺れ。
// 背景はくすんだ単色の壁と床。壁は拍で伸び縮みする棒の列(イコライザー)、床は拍ごとの同心円の波紋。
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildBall, buildKoma3D, COL, outlineMat, type V3 } from "./koma3d";
import basketball from "./data/basketball.json";

loadFont({ family: "Anton", url: staticFile("fonts/Anton-Regular.ttf"), weight: "400" });
loadFont({ family: "Zen Kaku Gothic New", url: staticFile("fonts/ZenKakuGothicNew-Black.ttf"), weight: "900" });

type Motion = {
  fps: number; dur: number; beat: number; joints: string[]; rest: Record<string, V3>;
  pos: number[][]; quat: number[][]; ball: number[][]; ballVis: number[]; ballForm: number[]; cam: number[][]; hipsY: number[];
  releases: { t: number; power: number; name: string; jp: string }[]; ballR: number;
};
type CamKey = { b: number; hold?: boolean; d: number; az: number; y: number; look: number; ease?: "io" | "in" | "out" | "hold" };
type EventDef = {
  id: string; no: number; ep: string; en: string; jp: string; motion: Motion;
  wall: string; floor: string; bar: string; ring: string; ink: string; cams: CamKey[];
};

export const EVENTS: Record<string, EventDef> = {
  basketball: {
    id: "basketball", no: 1, ep: "EP.1 球技", en: "BASKETBALL", jp: "バスケットボール", motion: basketball as unknown as Motion,
    wall: "#B3A289", floor: "#A08F76", bar: "#C3B49B", ring: "#CFC2AB", ink: "#0E0E0E",
    // カメラ(拍で指定。hold は止めの3コマ)
    cams: [
      { b: 0, d: 6.2, az: -30, y: 0.35, look: 1.0 },
      { b: 8, d: 5.6, az: -6, y: 0.4, look: 1.0, ease: "io" },
      { b: 12, d: 4.2, az: 10, y: 0.25, look: 1.15, ease: "in" },
      { b: 12, hold: true, d: 4.25, az: 10, y: 0.25, look: 1.15, ease: "hold" },
      { b: 13.5, d: 6.8, az: 14, y: 0.5, look: 1.15, ease: "out" },
      { b: 20, d: 5.8, az: -30, y: 0.45, look: 1.0, ease: "io" },
      { b: 24, d: 4.3, az: -18, y: 0.25, look: 1.15, ease: "in" },
      { b: 24, hold: true, d: 4.35, az: -18, y: 0.25, look: 1.15, ease: "hold" },
      { b: 25.5, d: 7.0, az: -12, y: 0.5, look: 1.15, ease: "out" },
      { b: 30, d: 6.0, az: 8, y: 0.4, look: 1.0, ease: "io" },
      { b: 36, d: 4.5, az: 22, y: 0.18, look: 1.3, ease: "in" },
      { b: 36, hold: true, d: 4.55, az: 22, y: 0.18, look: 1.3, ease: "hold" },
      { b: 37.6, d: 7.6, az: 30, y: 0.6, look: 1.2, ease: "out" },
      { b: 40, d: 6.4, az: 38, y: 0.5, look: 1.05, ease: "io" },
    ],
  },
};

// ── 小さな道具 ──
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const outC = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const inOutC = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const outBack = (x: number) => { const t = clamp01(x), c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const HOLD = 0.1; // 止め(3コマ)

function camAt(keys: CamKey[], t: number, beat: number) {
  const T = (k: CamKey) => k.b * beat + (k.hold ? HOLD : 0);
  let i = 0;
  while (i < keys.length - 2 && T(keys[i + 1]) <= t) i++;
  const a = keys[i], b = keys[i + 1];
  const x = clamp01((t - T(a)) / (T(b) - T(a)));
  const e = b.ease === "in" ? x * x * x : b.ease === "out" ? outC(x) : b.ease === "hold" ? x : inOutC(x);
  const L = (k: keyof CamKey) => (a[k] as number) + ((b[k] as number) - (a[k] as number)) * e;
  return { d: L("d"), az: L("az"), y: L("y"), look: L("look") };
}


const Scene: React.FC<{ ev: EventDef; frame: number }> = ({ ev, frame }) => {
  const M = ev.motion;
  const BEAT = M.beat;
  const t = frame / 30;
  const f = Math.min(M.pos.length - 1, frame);
  const { camera, scene } = useThree();

  const rig = useMemo(() => buildKoma3D(M.rest, M.joints), [M]);
  const ball = useMemo(() => buildBall(M.ballR), [M]);
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const waveRefs = useRef<(THREE.Mesh | null)[]>([]);
  const starRef = useRef<THREE.Group>(null);
  const shardRef = useRef<THREE.InstancedMesh>(null);
  const shardOlRef = useRef<THREE.InstancedMesh>(null);
  const dustRef = useRef<THREE.InstancedMesh>(null);
  const dustOlRef = useRef<THREE.InstancedMesh>(null);
  const wallRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const NB = 44, NS = 42, ND = 16;

  // 解放の瞬間の情報(上にある方の手・足元)
  const rels = useMemo(() => M.releases.map((r) => {
    const fr = Math.round(r.t * 30), P = M.pos[fr];
    const J = (n: string) => { const j = M.joints.indexOf(n); return new THREE.Vector3(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]); };
    const R = J("RightHandIndex1"), L = J("LeftHandIndex1");
    return { ...r, hand: R.y > L.y ? R : L, feet: J("Hips").setY(0) };
  }), [M]);

  // ── カメラ(少し下から。ためで寄り、解放で引く。ゆっくり回る)──
  const hipsS = (() => { let s = 0, n = 0; for (let k = -8; k <= 8; k++) { const i = Math.min(M.hipsY.length - 1, Math.max(0, f + k)); s += M.hipsY[i]; n++; } return s / n; })();
  const ck = camAt(ev.cams, t, BEAT);
  const az = (ck.az * Math.PI) / 180;
  const tx = M.cam[f][0], tz = M.cam[f][1];
  const look = ck.look + 0.75 * Math.max(0, hipsS - 1.02);
  let shx = 0, shy = 0;
  for (const r of M.releases) {
    const a = t - r.t;
    if (a >= 0 && a < 0.5) { const k = r.power * 0.04 * Math.exp(-a / 0.12); shx += k * Math.sin(a * 95); shy += k * Math.cos(a * 71); }
  }

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 40; cam.near = 0.05; cam.far = 80;
    cam.position.set(tx + Math.sin(az) * ck.d + shx, ck.y + (look - 1) * 0.5 + shy, tz + Math.cos(az) * ck.d);
    cam.lookAt(tx + shx * 0.5, look + shy * 0.5, tz);
    cam.updateProjectionMatrix();
    scene.background = new THREE.Color(ev.wall);

    // ── コマ:骨ごとの部品を、その骨の位置と回転に置く ──
    const P = M.pos[f], Q = M.quat[f];
    rig.groups.forEach((g, j) => {
      g.position.set(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]);
      g.quaternion.set(Q[j * 4], Q[j * 4 + 1], Q[j * 4 + 2], Q[j * 4 + 3]);
    });

    // ── ボール(放ったあと、次は小さく弾んで現れる)──
    const B = M.ball[f], vis = M.ballVis[f] > 0.5, form = M.ballForm[f];
    ball.position.set(B[0], B[1], B[2]);
    ball.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0.35).normalize(), -t * 9);
    ball.scale.setScalar(vis ? (form > 0 ? Math.max(0.001, outBack(1 - form)) : 1) : 0.001);
    ball.visible = vis;

    // ── 壁(いつもカメラの向こう側に立つ背景)とイコライザー ──
    const back = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az));
    const wc = new THREE.Vector3(tx, 0, tz).addScaledVector(back, 3.6);
    wallRef.current!.position.set(wc.x, 6, wc.z);
    wallRef.current!.rotation.set(0, az, 0);
    const beatAge = t % BEAT, beatNo = Math.floor(t / BEAT);
    const kick = Math.exp(-beatAge / 0.13) * (beatNo % 4 === 0 ? 1.35 : beatNo % 2 === 0 ? 1.0 : 0.75);
    let rel = 0;
    for (const r of M.releases) { const a = t - r.t; if (a >= 0) rel = Math.max(rel, r.power * Math.exp(-a / 0.35)); }
    const side = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    const m = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    const bars = barsRef.current!;
    for (let i = 0; i < NB; i++) {
      const u = i / (NB - 1) - 0.5;
      const prof = 0.45 + 0.55 * Math.cos(u * Math.PI * 1.15) ** 2;
      const n = 0.5 + 0.25 * Math.sin(i * 1.71 + t * 3.1) + 0.25 * Math.sin(i * 0.53 - t * 5.3 + beatNo * 1.3);
      const h = 0.12 + 3.2 * prof * (0.25 * n + 0.75 * n * Math.min(1.6, kick)) * 0.55 + 4.2 * rel * (0.55 + 0.45 * hash(i + beatNo));
      v.copy(wc).addScaledVector(side, u * 13.5).addScaledVector(back, -0.06);
      v.y = h / 2;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), az);
      s.set(0.15, h, 0.05);
      m.compose(v, q, s);
      bars.setMatrixAt(i, m);
    }
    bars.instanceMatrix.needsUpdate = true;

    // ── 床の波紋(拍ごとに、コマの足元から広がる同心円)──
    const hj = M.joints.indexOf("Hips");
    const rings: { x: number; z: number; r: number; o: number; w: number; c: string }[] = [];
    for (let b = beatNo; b >= Math.max(0, beatNo - 4); b--) {
      const age = t - b * BEAT; if (age < 0) continue;
      const fr = Math.min(M.pos.length - 1, Math.round(b * BEAT * 30));
      const strong = b % 4 === 0;
      rings.push({ x: M.pos[fr][hj * 3], z: M.pos[fr][hj * 3 + 2], r: 0.3 + age * (strong ? 3.2 : 2.4), o: (1 - age / 2) * (strong ? 0.9 : 0.55), w: strong ? 0.05 : 0.03, c: ev.ring });
    }
    for (const r of M.releases) {
      for (let k = 0; k < 3; k++) {
        const age = t - r.t - k * 0.09; if (age < 0 || age > 1.6) continue;
        const fr = Math.round(r.t * 30);
        rings.push({ x: M.pos[fr][hj * 3], z: M.pos[fr][hj * 3 + 2], r: 0.4 + age * (5.5 - k), o: (1 - age / 1.6) * r.power, w: 0.09 - k * 0.02, c: "#F2F0E9" });
      }
    }
    ringRefs.current.forEach((rm, k) => {
      if (!rm) return;
      const r = rings[k];
      rm.visible = !!r && r.o > 0.01;
      if (!r) return;
      rm.position.set(r.x, 0.003 + k * 0.0004, r.z);
      rm.scale.setScalar(r.r);
      const mat = rm.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, r.o); mat.color.set(r.c);
      const g = rm.geometry as THREE.RingGeometry;
      const want = 1 - r.w / r.r;
      if (Math.abs(g.parameters.innerRadius - want) > 0.002) { rm.geometry.dispose(); rm.geometry = new THREE.RingGeometry(Math.max(0.5, want), 1, 128); }
    });

    // ── 解放の瞬間の演出 ──
    const camQ = cam.quaternion;
    const act = rels.filter((r) => t - r.t >= 0 && t - r.t < 1.2);
    // 衝撃波の輪:手の所でカメラに向く輪2本+体のまわりを水平に広がる輪1本
    waveRefs.current.forEach((w, k) => {
      if (!w) return;
      const r = act[act.length - 1];
      const kind = k % 3, a = r ? t - r.t - (kind === 1 ? 0.07 : 0) : -1;
      const life = kind === 2 ? 0.55 : 0.38;
      w.visible = !!r && a >= 0 && a < life;
      if (!w.visible || !r) return;
      const p = outC(a / life);
      const mat = w.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - p) * (kind === 1 ? 0.7 : 1);
      if (kind === 2) {
        w.position.set(r.feet.x, Math.max(0.6, r.hand.y * 0.75), r.feet.z);
        w.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        w.scale.setScalar((0.35 + 2.2 * p) * (0.8 + 0.2 * r.power));
      } else {
        w.position.copy(r.hand);
        w.quaternion.copy(camQ);
        w.scale.setScalar((0.12 + (kind === 1 ? 1.5 : 1.15) * p) * (0.8 + 0.25 * r.power));
      }
    });
    // 止めの間だけ出る、ギザギザの光(白に黒のふち)
    const st = starRef.current!;
    const sr = act.find((r) => t - r.t < HOLD + 0.07);
    st.visible = !!sr;
    if (sr) { st.position.copy(sr.hand); st.quaternion.copy(camQ); st.rotateZ(frame * 0.4); st.scale.setScalar(0.2 * (0.85 + 0.3 * sr.power) * (frame % 2 ? 1 : 1.12)); }
    // 小さな破片(手から飛び散って落ちる)とほこり(足元から床を這って広がる)
    const sh = shardRef.current!, sho = shardOlRef.current!;
    for (let i = 0; i < NS; i++) {
      const r = act[act.length - 1];
      const a = r ? Math.max(0, t - r.t - HOLD) : 0;
      const alive = r && t - r.t >= 0 && a < 0.95;
      if (!alive || !r) { s.setScalar(0); m.compose(v.set(0, -5, 0), q.identity(), s); sh.setMatrixAt(i, m); sho.setMatrixAt(i, m); continue; }
      const seed = i * 13.7 + r.t * 3.1;
      const dir = new THREE.Vector3(hash(seed) - 0.5, hash(seed + 1) * 0.9 - 0.2, hash(seed + 2) - 0.5).normalize();
      const sp = (2.2 + 3.2 * hash(seed + 3)) * (0.7 + 0.4 * r.power);
      v.copy(r.hand).addScaledVector(dir, sp * a * (1 - a * 0.35));
      v.y -= 4.9 * a * a * 0.6;
      q.setFromEuler(new THREE.Euler(a * 14 * hash(seed + 4), a * 11 * hash(seed + 5), a * 9));
      s.setScalar((0.018 + 0.022 * hash(seed + 6)) * (1 - smooth((a - 0.55) / 0.4)));
      m.compose(v, q, s); sh.setMatrixAt(i, m); sho.setMatrixAt(i, m);
    }
    sh.instanceMatrix.needsUpdate = true; sho.instanceMatrix.needsUpdate = true;
    const du = dustRef.current!, duo = dustOlRef.current!;
    for (let i = 0; i < ND; i++) {
      const r = act[act.length - 1];
      const a = r ? t - r.t : -1;
      if (!r || a < 0 || a > 1.0) { s.setScalar(0); m.compose(v.set(0, -5, 0), q.identity(), s); du.setMatrixAt(i, m); duo.setMatrixAt(i, m); continue; }
      const ang = (i / ND) * Math.PI * 2 + hash(i + r.t) * 0.4;
      const rad = 0.25 + (0.9 + 0.5 * hash(i * 3 + r.t)) * outC(a / 0.8) * (0.7 + 0.4 * r.power);
      v.set(r.feet.x + Math.cos(ang) * rad, 0.04 + 0.12 * outC(a / 0.9) * hash(i * 5 + 1), r.feet.z + Math.sin(ang) * rad);
      const sz = (0.035 + 0.04 * hash(i * 7 + r.t)) * Math.sin(Math.PI * clamp01(a / 1.0)) * (0.8 + 0.4 * r.power);
      s.set(Math.max(0, sz) * 1.4, Math.max(0, sz) * 0.7, Math.max(0, sz) * 1.4);
      m.compose(v, q.identity(), s); du.setMatrixAt(i, m); duo.setMatrixAt(i, m);
    }
    du.instanceMatrix.needsUpdate = true; duo.instanceMatrix.needsUpdate = true;

    // ── 影を落とす光は、コマについていく ──
    const L = lightRef.current!;
    L.position.set(tx - 2.2, 5.5, tz + 3.2);
    L.target.position.set(tx, 0.8, tz);
    L.target.updateMatrixWorld();
  });

  const shardColors = useMemo(() => ["#0E0E0E", "#F2F0E9", "#C6FF3D"].map((c) => new THREE.Color(c)), []);
  const starGeo = useMemo(() => {
    const sh = new THREE.Shape();
    const n = 10;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? 0.32 + 0.12 * hash(i) : 1, a = (i / (n * 2)) * Math.PI * 2;
      if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ShapeGeometry(sh);
  }, []);

  return (
    <>
      <hemisphereLight args={["#ffffff", ev.floor, 1.6]} />
      <directionalLight ref={lightRef} intensity={2.4} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={0.5} shadow-camera-far={20} shadow-bias={-0.0004} />
      <ambientLight intensity={0.5} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={ev.floor} roughness={1} />
      </mesh>
      <mesh ref={wallRef}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color={ev.wall} roughness={1} />
      </mesh>
      <instancedMesh ref={barsRef} args={[undefined, undefined, NB]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ev.bar} roughness={1} />
      </instancedMesh>
      {Array.from({ length: 10 }, (_, k) => (
        <mesh key={k} ref={(r) => { ringRefs.current[k] = r; }} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <ringGeometry args={[0.97, 1, 128]} />
          <meshBasicMaterial transparent depthWrite={false} color={ev.ring} />
        </mesh>
      ))}
      <primitive object={rig.root} />
      <primitive object={ball} />
      {Array.from({ length: 3 }, (_, k) => (
        <mesh key={k} ref={(r) => { waveRefs.current[k] = r; }} renderOrder={3}>
          <ringGeometry args={[k === 2 ? 0.94 : 0.9, 1, 96]} />
          <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} color={k === 1 ? COL.ink : "#F2F0E9"} />
        </mesh>
      ))}
      <group ref={starRef} renderOrder={4}>
        <mesh geometry={starGeo} scale={1.18} position={[0, 0, -0.002]}><meshBasicMaterial color={COL.ink} depthTest={false} /></mesh>
        <mesh geometry={starGeo}><meshBasicMaterial color="#F2F0E9" depthTest={false} /></mesh>
      </group>
      <instancedMesh ref={(r) => { (shardRef as React.MutableRefObject<THREE.InstancedMesh | null>).current = r; if (r && !r.userData.c) { for (let i = 0; i < NS; i++) r.setColorAt(i, shardColors[i % 3]); r.userData.c = 1; } }} args={[undefined, undefined, NS]} frustumCulled={false}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshToonMaterial />
      </instancedMesh>
      <instancedMesh ref={shardOlRef} args={[undefined, undefined, NS]} frustumCulled={false} material={outlineMat(0.35)}>
        <tetrahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <instancedMesh ref={dustRef} args={[undefined, undefined, ND]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshToonMaterial color={ev.ring} />
      </instancedMesh>
      <instancedMesh ref={dustOlRef} args={[undefined, undefined, ND]} frustumCulled={false} material={outlineMat(0.18)}>
        <icosahedronGeometry args={[1, 1]} />
      </instancedMesh>
    </>
  );
};

// ── スピード線(解放の瞬間、画面の外側から中心へ向かう集中線)──
const SpeedLines: React.FC<{ ev: EventDef; t: number; frame: number }> = ({ ev, t, frame }) => {
  const r = ev.motion.releases.filter((x) => t - x.t >= 0 && t - x.t < 0.5).pop();
  if (!r) return null;
  const a = t - r.t;
  const o = a < HOLD + 0.03 ? 1 : 1 - smooth((a - HOLD) / 0.38);
  const seed = Math.floor(frame / 2);
  const cx = 540, cy = 860, lines = [];
  for (let i = 0; i < 64; i++) {
    const ang = (i / 64) * Math.PI * 2 + (hash(i * 3.3 + seed) - 0.5) * 0.08;
    const r0 = 430 + 260 * hash(i * 7.1 + seed) + (1 - o) * 160, r1 = 1500;
    const w = (3 + 9 * hash(i * 1.7 + seed)) * r.power;
    const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
    lines.push(<polygon key={i} points={`${cx + c * r0},${cy + s * r0} ${cx + c * r1 + nx * w},${cy + s * r1 + ny * w} ${cx + c * r1 - nx * w},${cy + s * r1 - ny * w}`} />);
  }
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o * 0.85 }}>
      <g fill="#F2F0E9">{lines}</g>
    </svg>
  );
};

// ── 画面の文字 ──
const Overlay: React.FC<{ ev: EventDef; t: number }> = ({ ev, t }) => {
  const ink = ev.ink;
  const en = ev.en.split("");
  // 競技名:1小節目に下から1文字ずつ(1拍目に始まり、2小節目の終わりで下へ消える)
  const bar = 4 * ev.motion.beat;
  const out = smooth((t - (2 * bar - 0.3)) / 0.35);
  const label = smooth((t - (2 * bar - 0.05)) / 0.35);
  const callout = ev.motion.releases.map((r) => ({ r, a: t - r.t })).filter((x) => x.a >= 0 && x.a < 1.9).pop();
  return (
    <AbsoluteFill style={{ fontFamily: "Anton", color: ink }}>
      <div style={{ position: "absolute", left: 64, top: 110, lineHeight: 1 }}>
        <div style={{ fontSize: 46, letterSpacing: 6 }}>KAKUU GAMES</div>
        <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 30, marginTop: 14, letterSpacing: 2 }}>{ev.ep}</div>
      </div>
      <div style={{ position: "absolute", right: 64, top: 110, fontSize: 46, letterSpacing: 4, lineHeight: 1 }}>
        {String(ev.no).padStart(2, "0")}<span style={{ opacity: 0.45 }}> / 14</span>
      </div>
      {t < 2 * bar + 0.1 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 270, textAlign: "center", transform: `translateY(${-out * 140}px)`, opacity: 1 - out }}>
          <div style={{ fontSize: 190, lineHeight: 0.95, letterSpacing: 4, whiteSpace: "pre" }}>
            {en.map((ch, i) => {
              const p = outC((t - 0.08 - i * 0.045) / 0.35);
              return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 120}px)`, opacity: p }}>{ch}</span>;
            })}
          </div>
          <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 64, marginTop: 18, letterSpacing: 8, opacity: smooth((t - ev.motion.beat) / 0.25), transform: `translateY(${(1 - outC((t - ev.motion.beat) / 0.3)) * 30}px)` }}>{ev.jp}</div>
        </div>
      )}
      {t >= 2 * bar - 0.05 && (
        <div style={{ position: "absolute", left: 64, bottom: 430, lineHeight: 1, opacity: label, transform: `translateX(${(1 - label) * -40}px)` }}>
          <div style={{ fontSize: 64, letterSpacing: 3 }}>{ev.en}</div>
          <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 30, marginTop: 10, letterSpacing: 4 }}>{ev.jp}</div>
        </div>
      )}
      {callout && (() => {
        const { r, a } = callout;
        const pop = a < 0.1 ? 1.18 : 1 + 0.18 * Math.exp(-(a - 0.1) / 0.08);
        const gone = smooth((a - 1.55) / 0.3);
        return (
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", transform: `scale(${pop}) translateY(${-gone * 60}px)`, opacity: 1 - gone }}>
            <div style={{ fontSize: Math.min(150, 1500 / r.name.length), lineHeight: 0.95, letterSpacing: 3, color: "#F2F0E9", WebkitTextStroke: `6px ${ink}`, paintOrder: "stroke" }}>{r.name}</div>
            <div style={{ display: "inline-block", fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 48, marginTop: 16, letterSpacing: 4, padding: "6px 18px", background: ink, color: "#C6FF3D" }}>{r.jp}</div>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

export const KakuuEvent: React.FC<{ event: string; withAudio?: boolean }> = ({ event, withAudio = true }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ev = EVENTS[event];
  const t = frame / 30;
  // 解放の瞬間、画面全体がほんの少しだけ明るく
  const flash = ev.motion.releases.reduce((m, r) => { const a = t - r.t; return a >= 0 && a < 0.2 ? Math.max(m, (1 - a / 0.2) * 0.18 * r.power) : m; }, 0);
  return (
    <AbsoluteFill style={{ background: ev.wall }}>
      <ThreeCanvas width={width} height={height} shadows flat gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Scene ev={ev} frame={frame} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "#F2F0E9", opacity: flash, mixBlendMode: "soft-light" }} />
      <SpeedLines ev={ev} t={t} frame={frame} />
      <Overlay ev={ev} t={t} />
      {withAudio && <Audio src={staticFile(`kakuu-games/song-${event}.mp3`)} />}
    </AbsoluteFill>
  );
};

export const eventFrames = (event: string) => Math.floor(EVENTS[event].motion.dur * 30);
