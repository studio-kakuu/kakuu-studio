// KAKUU GAMES — 1競技ぶんの映像(縦 1080×1920 / 30fps / 120BPM:1拍0.5秒・1小節2秒)
// コマはキューブの粒。モーションキャプチャ(CMU)の骨の動きで粒を動かし、力が解放される瞬間(小節の1拍目)に粒がはじけて戻る。
// 背景はくすんだ単色の壁と床。壁は拍で伸び縮みする棒の列(イコライザー)、床は拍ごとの同心円の波紋。
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildBall, buildKoma, PALETTE, type V3 } from "./koma";
import basketball from "./data/basketball.json";

loadFont({ family: "Anton", url: staticFile("fonts/Anton-Regular.ttf"), weight: "400" });
loadFont({ family: "Zen Kaku Gothic New", url: staticFile("fonts/ZenKakuGothicNew-Black.ttf"), weight: "900" });

type Motion = {
  fps: number; dur: number; joints: string[]; rest: Record<string, V3>;
  pos: number[][]; quat: number[][]; ball: number[][]; ballVis: number[]; ballForm: number[]; cam: number[][]; hipsY: number[];
  releases: { t: number; power: number; name: string; jp: string }[]; ballR: number;
};
type CamKey = { t: number; d: number; az: number; y: number; look: number; ease?: "io" | "in" | "out" | "hold" };
type EventDef = {
  id: string; no: number; ep: string; en: string; jp: string; motion: Motion;
  wall: string; floor: string; bar: string; ring: string; ink: string; cams: CamKey[];
};

export const EVENTS: Record<string, EventDef> = {
  basketball: {
    id: "basketball", no: 1, ep: "EP.1 球技", en: "BASKETBALL", jp: "バスケットボール", motion: basketball as unknown as Motion,
    wall: "#B3A289", floor: "#A08F76", bar: "#C3B49B", ring: "#CFC2AB", ink: "#0E0E0E",
    cams: [
      { t: 0, d: 6.4, az: -30, y: 0.35, look: 1.0 },
      { t: 4.0, d: 5.8, az: -6, y: 0.4, look: 1.0, ease: "io" },
      { t: 6.0, d: 4.3, az: 10, y: 0.25, look: 1.15, ease: "in" },
      { t: 6.1, d: 4.35, az: 10, y: 0.25, look: 1.15, ease: "hold" },
      { t: 6.75, d: 7.0, az: 14, y: 0.5, look: 1.15, ease: "out" },
      { t: 10.0, d: 6.0, az: -30, y: 0.45, look: 1.0, ease: "io" },
      { t: 12.0, d: 4.4, az: -18, y: 0.25, look: 1.15, ease: "in" },
      { t: 12.1, d: 4.45, az: -18, y: 0.25, look: 1.15, ease: "hold" },
      { t: 12.75, d: 7.2, az: -12, y: 0.5, look: 1.15, ease: "out" },
      { t: 14.0, d: 6.2, az: 8, y: 0.4, look: 1.0, ease: "io" },
      { t: 16.0, d: 4.6, az: 22, y: 0.18, look: 1.3, ease: "in" },
      { t: 16.1, d: 4.65, az: 22, y: 0.18, look: 1.3, ease: "hold" },
      { t: 16.85, d: 8.0, az: 30, y: 0.6, look: 1.2, ease: "out" },
      { t: 18.0, d: 6.6, az: 38, y: 0.5, look: 1.05, ease: "io" },
    ],
  },
};

// ── 小さな道具 ──
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const outC = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const inOutC = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const BEAT = 0.5;

function camAt(keys: CamKey[], t: number) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[i + 1];
  const x = clamp01((t - a.t) / (b.t - a.t));
  const e = b.ease === "in" ? x * x * x : b.ease === "out" ? outC(x) : b.ease === "hold" ? x : inOutC(x);
  const L = (k: keyof CamKey) => (a[k] as number) + ((b[k] as number) - (a[k] as number)) * e;
  return { d: L("d"), az: L("az"), y: L("y"), look: L("look") };
}

// 粒がはじける量(0..1)。止めの間は少しだけ、そのあと大きく広がって、体に戻る
function burstEnv(a: number) {
  if (a < 0 || a > 1.05) return 0;
  if (a < 0.1) return 0.3 * (a / 0.1);
  if (a < 0.32) return 0.3 + 0.7 * outC((a - 0.1) / 0.22);
  return 1 - inOutC((a - 0.32) / 0.73);
}

const Scene: React.FC<{ ev: EventDef; frame: number }> = ({ ev, frame }) => {
  const M = ev.motion;
  const t = frame / 30;
  const f = Math.min(M.pos.length - 1, frame);
  const nJ = M.joints.length;
  const { camera, scene } = useThree();

  const vox = useMemo(() => buildKoma(M.rest, M.joints), [M]);
  const ballVox = useMemo(() => buildBall(M.ballR), [M]);
  const komaRef = useRef<THREE.InstancedMesh>(null);
  const ballRef = useRef<THREE.InstancedMesh>(null);
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wallRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const NB = 44;

  // ── カメラ(少し下から。ためで寄り、解放で引く。ゆっくり回る)──
  const hipsS = (() => { let s = 0, n = 0; for (let k = -8; k <= 8; k++) { const i = Math.min(M.hipsY.length - 1, Math.max(0, f + k)); s += M.hipsY[i]; n++; } return s / n; })();
  const ck = camAt(ev.cams, t);
  const az = (ck.az * Math.PI) / 180;
  const tx = M.cam[f][0], tz = M.cam[f][1];
  const look = ck.look + 0.75 * Math.max(0, hipsS - 1.02);
  let shx = 0, shy = 0;
  for (const r of M.releases) {
    const a = t - r.t;
    if (a >= 0 && a < 0.5) { const k = r.power * 0.045 * Math.exp(-a / 0.12); shx += k * Math.sin(a * 95); shy += k * Math.cos(a * 71); }
  }

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 40; cam.near = 0.05; cam.far = 80;
    cam.position.set(tx + Math.sin(az) * ck.d + shx, ck.y + (look - 1) * 0.5 + shy, tz + Math.cos(az) * ck.d);
    cam.lookAt(tx + shx * 0.5, look + shy * 0.5, tz);
    cam.updateProjectionMatrix();
    scene.background = new THREE.Color(ev.wall);

    // ── コマの粒 ──
    const P = M.pos[f], Q = M.quat[f];
    const jp = (j: number) => new THREE.Vector3(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]);
    const jq = (j: number) => new THREE.Quaternion(Q[j * 4], Q[j * 4 + 1], Q[j * 4 + 2], Q[j * 4 + 3]);
    const qs = Array.from({ length: nJ }, (_, j) => jq(j)), ps = Array.from({ length: nJ }, (_, j) => jp(j));
    const hips = ps[M.joints.indexOf("Hips")];
    const center = hips.clone().add(new THREE.Vector3(0, 0.3, 0));
    // いま効いている解放(はじける中心は、上にある方の手)
    const active = M.releases.map((r) => {
      const a = t - r.t; const env = burstEnv(a);
      if (env <= 0) return null;
      const fr = Math.round(r.t * 30), PP = M.pos[fr];
      const hand = (n: string) => { const j = M.joints.indexOf(n); return new THREE.Vector3(PP[j * 3], PP[j * 3 + 1], PP[j * 3 + 2]); };
      const R = hand("RightHand"), L = hand("LeftHand");
      return { env: env * r.power, hand: R.y > L.y ? R : L, seed: r.t };
    }).filter(Boolean) as { env: number; hand: THREE.Vector3; seed: number }[];
    const m = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), d = new THREE.Vector3(), rnd = new THREE.Vector3();
    const tumble = new THREE.Quaternion(), axis = new THREE.Vector3();
    const mesh = komaRef.current!;
    vox.forEach((vx, i) => {
      const j = vx.j, rj = M.rest[M.joints[j]];
      v.set(vx.p[0] - rj[0], vx.p[1] - rj[1], vx.p[2] - rj[2]).applyQuaternion(qs[j]).add(ps[j]);
      q.copy(qs[j]);
      let sc = vx.s * 0.86;
      rnd.set(hash(i * 3.1) - 0.5, hash(i * 7.7) - 0.5, hash(i * 1.9) - 0.5).normalize();
      // 冒頭:足元から粒が集まって組み上がる
      const delay = 0.45 * clamp01(vx.p[1] / 1.9) + 0.12 * hash(i * 5.3);
      const asm = 1 - outC((t - delay) / 0.42);
      if (asm > 0) { v.addScaledVector(rnd, asm * (0.4 + 0.8 * hash(i * 2.2))); v.y += asm * 0.25; sc *= 1 - 0.5 * asm; }
      // 解放:粒がはじけて、また体に戻る
      for (const a of active) {
        d.copy(v).sub(center).normalize().multiplyScalar(0.6).addScaledVector(rnd, 0.55).normalize();
        const far = hash(i * 9.1 + a.seed) < 0.1 ? 2.6 : 1;
        const dist = (0.1 + 0.45 * hash(i * 4.4 + a.seed) ** 2) * far;
        const w = 0.25 + 0.75 * Math.exp(-v.distanceTo(a.hand) / 0.4);
        v.addScaledVector(d, dist * a.env * w);
        axis.set(hash(i * 6.6), hash(i * 2.9), hash(i * 8.3)).normalize();
        tumble.setFromAxisAngle(axis, a.env * w * 7 * hash(i * 3.3 + 1));
        q.multiply(tumble);
      }
      s.setScalar(sc);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;

    // ── ボール ──
    const bm = ballRef.current!;
    const B = M.ball[f], vis = M.ballVis[f] > 0.5, form = M.ballForm[f];
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0.35).normalize(), -t * 9);
    ballVox.forEach((bv, i) => {
      v.set(bv.p[0], bv.p[1], bv.p[2]).applyQuaternion(spin).add(new THREE.Vector3(B[0], B[1], B[2]));
      rnd.set(hash(i * 3.7 + 9) - 0.5, hash(i * 1.3 + 9) - 0.5, hash(i * 5.1 + 9) - 0.5).normalize();
      if (form > 0) v.addScaledVector(rnd, form ** 1.5 * (0.6 + 1.2 * hash(i * 2.7)));
      s.setScalar(vis ? bv.s * 0.86 * (1 - 0.6 * form) : 0);
      m.compose(v, spin, s);
      bm.setMatrixAt(i, m);
    });
    bm.instanceMatrix.needsUpdate = true;

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
      // 太さは半径に対する割合で
      const g = rm.geometry as THREE.RingGeometry;
      const want = 1 - r.w / r.r;
      if (Math.abs(g.parameters.innerRadius - want) > 0.002) { rm.geometry.dispose(); rm.geometry = new THREE.RingGeometry(Math.max(0.5, want), 1, 128); }
    });

    // ── 影を落とす光は、コマについていく ──
    const L = lightRef.current!;
    L.position.set(tx - 2.2, 5.5, tz + 3.2);
    L.target.position.set(tx, 0.8, tz);
    L.target.updateMatrixWorld();
  });

  const colors = useMemo(() => PALETTE.map((c) => new THREE.Color(c)), []);
  const setColors = (mesh: THREE.InstancedMesh | null, list: { c: number }[]) => {
    if (!mesh || mesh.userData.colored) return;
    list.forEach((x, i) => mesh.setColorAt(i, colors[x.c]));
    mesh.instanceColor!.needsUpdate = true;
    mesh.userData.colored = true;
  };

  return (
    <>
      <hemisphereLight args={["#ffffff", ev.floor, 1.25]} />
      <directionalLight ref={lightRef} intensity={2.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={0.5} shadow-camera-far={20} shadow-bias={-0.0004} />
      <ambientLight intensity={0.35} />
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
      <instancedMesh ref={(r) => { (komaRef as React.MutableRefObject<THREE.InstancedMesh | null>).current = r; setColors(r, vox); }} args={[undefined, undefined, vox.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={(r) => { (ballRef as React.MutableRefObject<THREE.InstancedMesh | null>).current = r; setColors(r, ballVox); }} args={[undefined, undefined, ballVox.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </>
  );
};

// ── 画面の文字 ──
const Overlay: React.FC<{ ev: EventDef; t: number }> = ({ ev, t }) => {
  const ink = ev.ink;
  const en = ev.en.split("");
  // 競技名:1小節目に下から1文字ずつ(1拍目に始まり、2小節目の終わりで下へ消える)
  const out = smooth((t - 3.55) / 0.4);
  const label = smooth((t - 3.9) / 0.35);
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
      {t < 4 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 270, textAlign: "center", transform: `translateY(${-out * 140}px)`, opacity: 1 - out }}>
          <div style={{ fontSize: 190, lineHeight: 0.95, letterSpacing: 4, whiteSpace: "pre" }}>
            {en.map((ch, i) => {
              const p = outC((t - 0.08 - i * 0.045) / 0.35);
              return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 120}px)`, opacity: p }}>{ch}</span>;
            })}
          </div>
          <div style={{ fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 64, marginTop: 18, letterSpacing: 8, opacity: smooth((t - 0.5) / 0.25), transform: `translateY(${(1 - outC((t - 0.5) / 0.3)) * 30}px)` }}>{ev.jp}</div>
        </div>
      )}
      {t >= 3.9 && (
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
      <Overlay ev={ev} t={t} />
      {withAudio && <Audio src={staticFile(`kakuu-games/temp-${event}.mp3`)} />}
    </AbsoluteFill>
  );
};

export const eventFrames = (event: string) => Math.round(EVENTS[event].motion.dur * 30);
