// KAKUU GAMES — 場面C:スケボー(149〜160拍)/サーフィン(160〜172)/水泳(172〜180)/ラグビー(180〜188)/バドミントン(188〜196)/BMX(196〜204)
//                  クライマックス(204〜216:20競技が並ぶ)/締め(216〜228:主催者のコマ)
import React from "react";
import { C, Figure, P, Prims, type Pose, fk, mix, poseAt, toolPrims, ballPrims, boardPrims, bikePrims, runPose, SIGS, sigPrims, type V, type Key, clamp01, hash, E } from "./rig";
import { BEAT, HB, S, hs, ez, lerp, age, shakeAt, camKeys, camT, type Out, Burst, Shock, FocusLines, SpeedStreaks } from "./stage";

const K = (b: number, p: Partial<Pose>, e?: Key["e"]): Key => ({ b, p: P(p), e });
const at = (p: Pose, x: number, y = 0): Pose => ({ ...p, x: p.x + x, y: p.y + y });
const hd = (j: ReturnType<typeof fk>): V => [j.ha1[0] - j.el1[0], j.ha1[1] - j.el1[1]];
const flash = (B: number, r: number, color: string) => (B >= r && age(B, r) < 0.034 ? <rect width={1080} height={1920} fill={color} opacity={0.8} /> : null);
const focus = (B: number, r: number, cx: number, cy: number, color: string) => (B >= r && age(B, r) < 0.45 ? <FocusLines cx={cx} cy={cy} o={0.85 * (1 - ez((age(B, r) - 0.1) / 0.35))} seed={Math.floor(B * 6) + r} color={color} inner={380} /> : null);
const boom = (B: number, r: number, p: V, color: string, line: string, k = 1) => (B >= r && age(B, r) < 0.5 ? (
  <g><Burst x={p[0] * S} y={p[1] * S} r={(0.12 + 0.5 * k * ez(age(B, r) / 0.2, "out")) * S} n={13} color={color} stroke={C.ink} sw={5} seed={r} rot={B} /><Shock x={p[0] * S} y={p[1] * S} age={age(B, r)} color={line} max={650 * k} life={0.42} w={18} /></g>
) : null);
const Trail: React.FC<{ pf: (b: number) => Pose; B: number; n?: number; dt?: number; color: string; bg: string }> = ({ pf, B, n = 3, dt = 0.07, color, bg }) => (
  <>{Array.from({ length: n }, (_, i) => n - i).map((k) => <Figure key={k} p={pf(B - k * dt)} S={S} color={color} bg={bg} opacity={0.14 * (n + 1 - k)} />)}</>
);
const arc = (a: V, b: V, h: number, s: number): V => [lerp(a[0], b[0], s), lerp(a[1], b[1], s) - h * 4 * s * (1 - s)];
// 地面の目盛り(流れる)
const Ticks: React.FC<{ d: number; color: string; y?: number }> = ({ d, color, y = 14 }) => <>{Array.from({ length: 12 }, (_, i) => { const x = (((i * 1.2 - d) % 14.4) + 14.4) % 14.4 - 6; return <rect key={i} x={x * S} y={y} width={0.3 * S} height={12} fill={color} opacity={0.35} />; })}</>;
const Droplets: React.FC<{ B: number; r: number; p: V; color: string; n?: number; spread?: number; up?: number }> = ({ B, r, p, color, n = 14, spread = 1, up = 1 }) => {
  const a = age(B, r); if (a < 0 || a > 0.9) return null;
  return <g fill={color}>{Array.from({ length: n }, (_, i) => { const ang = -Math.PI / 2 + (hash(i + r) - 0.5) * 2.4 * spread, v = 2.2 + 2.4 * hash(i * 3 + r); const x = p[0] + Math.cos(ang) * v * a * 0.6, y = p[1] + Math.sin(ang) * v * a * up + 4.9 * a * a; return <circle key={i} cx={x * S} cy={y * S} r={(6 + 10 * hash(i * 7 + r)) * (1 - a / 0.9)} />; })}</g>;
};

// ═══ スケボー(見せ場)═══
const RIDE = P({ y: -0.4, t: 10, h: -4, a1: 40, a1l: 50, a2: -40, a2l: -30, l1: 20, l1l: 0, l2: -25, l2l: -20 });
const PUSH = P({ y: -0.36, t: 24, h: -8, a1: 50, a1l: 60, a2: -50, a2l: -40, l1: 28, l1l: -6, l2: -38, l2l: -30 });
const SCROUCH = P({ y: -0.27, t: 30, h: -10, a1: 70, a1l: 40, a2: -55, a2l: -20, l1: 78, l1l: -40, l2: 42, l2l: -62 });
const OLLIE = P({ y: -0.7, t: 14, h: -6, a1: 105, a1l: 80, a2: -85, a2l: -60, l1: 98, l1l: -12, l2: 62, l2l: -72 });
const BIGAIR = P({ y: -0.72, t: 8, h: -10, a1: 140, a1l: 120, a2: -120, a2l: -100, l1: 105, l1l: -20, l2: 75, l2l: -80 });
function skate(B: number): Out {
  const R1 = 152, R2 = 156;
  const Bh = hs(hs(B, R1), R2);
  const keys: Key[] = [K(149, RIDE), K(149.4, PUSH), K(149.8, RIDE), K(150.2, PUSH), K(150.6, RIDE), K(151.85, SCROUCH, "io"), K(152, OLLIE, "snap"), K(152.6, OLLIE), K(153, { ...SCROUCH, y: -0.33 }, "in"), K(153.4, RIDE, "out"),
    K(155.85, SCROUCH, "io"), K(156, BIGAIR, "snap"), K(157.6, BIGAIR), K(158, { ...SCROUCH, y: -0.3 }, "in"), K(158.5, RIDE, "out"), K(160, { ...RIDE, t: 20, a1: 80, a1l: 70, a2: -70, a2l: -80, l1: 50, l1l: -10, l2: -30, l2l: -30, y: -0.34 })];
  const pf = (b: number) => poseAt(keys, b);
  const air = (b: number) => (b >= R1 && b < 153 ? Math.sin(clamp01((b - R1) / 1) * Math.PI) * 0.45 : b >= R2 && b < 158 ? Math.sin(clamp01((b - R2) / 2) * Math.PI) * 1.1 : 0);
  const p = at(pf(Bh), 0, -air(Bh));
  const j = fk(p);
  const pushing = Bh < 150.8;
  const boardLift = Bh >= R1 && Bh < 152.8 ? 0.04 : Bh >= R2 && Bh < 157.8 ? 0.06 : 0;
  const tilt = Bh >= R1 && Bh < 152.8 ? Math.sin(clamp01((Bh - R1) / 0.8) * Math.PI) * -22 : 0;
  const flip = Bh >= R2 && Bh < 157.4 ? ((Bh - R2) / 1.4) * 360 : 0;
  const fa = pushing ? j.ft1 : j.ft1, fb = pushing ? [j.ft1[0] - 0.4, j.ft1[1]] as V : j.ft2;
  const board = boardPrims("board", fa, fb, S, C.ink, C.lime, tilt, -boardLift).map((q) => (flip && "tr" in q && q.tr ? { ...q, tr: q.tr + ` scale(1 ${Math.cos((flip * Math.PI) / 180).toFixed(3)})` } : q));
  const dist = (B - 149) * 1.6;
  const split = B >= 156.15 && B < 157.6;
  const cam = camKeys([
    [149, { cx: 0.1 * S, cy: -520, z: 1.0, rot: 0 }],
    [151.85, { cx: 0.15 * S, cy: -440, z: 1.3, rot: -5 }, "in"],
    [152.05, { cx: 0.1 * S, cy: -700, z: 0.95, rot: 3 }, "snap"],
    [154, { cx: 0.1 * S, cy: -540, z: 1.0, rot: -2 }],
    [155.85, { cx: 0.2 * S, cy: -420, z: 1.4, rot: 6 }, "in"],
    [156.05, { cx: 0.1 * S, cy: -1000, z: 0.8, rot: -8 }, "snap"],
    [158, { cx: 0.1 * S, cy: -560, z: 1.0, rot: 0 }],
    [160, { cx: 0.2 * S, cy: -600, z: 0.9, rot: -14 }, "in"],
  ], B);
  const wave = ez((B - 158.6) / 1.4, "io");
  const fgc = B >= 159.4 ? C.off : C.ink;
  return {
    bg: C.lime, fg: fgc, tone: B >= 159.4 ? C.ink : C.lime, cam, no: 15, far: "stripes", stream: 1, shake: shakeAt(B, [R1, R2, 158], 18),
    under: (
      <>
        <SpeedStreaks t={(B - 149) * BEAT} speed={1800} color={C.ink} o={0.18} seed={5} y0={300} y1={1700} />
        {B >= 158.6 && <path d={`M-200,${2100} L-200,${1920 - 2300 * wave} Q${540},${1920 - 2600 * wave} ${1300},${1920 - 1500 * wave} L1300,2100 Z`} fill={C.ink} />}
      </>
    ),
    world: split ? null : (
      <>
        <line x1={-4000} y1={0} x2={4000} y2={0} stroke={C.ink} strokeWidth={6} opacity={0.5} />
        <Ticks d={dist} color={C.ink} />
        {B >= 153.5 && B < 158.5 && <path d={`M${(2.2 - (B - 153.5) * 1.6) * S},0 Q${(3.4 - (B - 153.5) * 1.6) * S},0 ${(3.5 - (B - 153.5) * 1.6) * S},${-1.2 * S}`} fill="none" stroke={C.ink} strokeWidth={14} opacity={0.6} />}
        {(Bh >= 151.9 && Bh < 152.8) || (Bh >= 155.9 && Bh < 157.6) ? <Trail pf={(b) => at(pf(b), 0, -air(b))} B={Bh} color={C.off} bg={C.lime} n={4} dt={0.06} /> : null}
        <Figure p={p} S={S} color={fgc} bg={B >= 159.4 ? C.ink : C.lime} />
        <Prims list={board} />
        {boom(B, R1, [j.ft1[0], 0], C.off, C.ink, 0.7)}
        {boom(B, R2, [(j.ft1[0] + j.ft2[0]) / 2, j.ft1[1] + 0.05], C.off, C.ink, 1.2)}
        {B >= 158 && age(B, 158) < 0.5 && <Shock x={0} y={0} age={age(B, 158)} color={C.ink} max={700} life={0.5} w={10} squash={0.2} />}
      </>
    ),
    screen: (
      <>
        {split && [0, 1, 2].map((k) => {
          const inK = ez((B - 156.15 - k * 0.2) / 0.4, "back");
          const bc = (q: V) => [q[0] * S, q[1] * S];
          const mid = bc([(j.ft1[0] + j.ft2[0]) / 2, j.ft1[1]]);
          const c = k === 0 ? { cx: mid[0], cy: mid[1] + 30, z: 2.6, rot: -8 } : k === 1 ? { cx: j.hip[0] * S, cy: j.hip[1] * S + 40, z: 0.85, rot: 0 } : { cx: j.head[0] * S, cy: j.head[1] * S, z: 2.4, rot: 6 };
          const y0 = k * 640;
          return (
            <g key={k}>
              <clipPath id={`sk${k}`}><rect x={0} y={y0} width={1080} height={640} /></clipPath>
              <g clipPath={`url(#sk${k})`} transform={`translate(${(1 - inK) * (k % 2 ? 1080 : -1080)} 0)`}>
                <rect x={0} y={y0} width={1080} height={640} fill={k === 1 ? C.ink : C.lime} />
                <g transform={`translate(0 ${y0 + 320 - 960}) ${camT(c)}`}>
                  <Figure p={p} S={S} color={k === 1 ? C.off : C.ink} bg={k === 1 ? C.ink : C.lime} />
                  <Prims list={boardPrims("board", j.ft1, j.ft2, S, k === 1 ? C.lime : C.ink, k === 1 ? C.ink : C.lime, 0, -0.06).map((q) => (flip && "tr" in q && q.tr ? { ...q, tr: q.tr + ` scale(1 ${Math.cos((flip * Math.PI) / 180).toFixed(3)})` } : q))} />
                </g>
              </g>
              <rect x={0} y={y0 + 636} width={1080} height={8} fill={C.ink} />
            </g>
          );
        })}
        {focus(B, R1, 540, 900, C.ink)}{focus(B, R2, 540, 760, C.ink)}{flash(B, R2, C.off)}
      </>
    ),
  };
}

// ═══ サーフィン(見せ場)═══
// 波の面:2次ベジェ(唇 L=(-2.6,-2.4)→ 制御 (-0.6,-0.1) → 底 (2.4,0))
const WL: V = [-2.6, -2.4], WC: V = [-0.6, -0.1], WB: V = [2.4, 0];
const qb = (t: number): V => [(1 - t) ** 2 * WL[0] + 2 * (1 - t) * t * WC[0] + t * t * WB[0], (1 - t) ** 2 * WL[1] + 2 * (1 - t) * t * WC[1] + t * t * WB[1]];
const qd = (t: number): V => [2 * (1 - t) * (WC[0] - WL[0]) + 2 * t * (WB[0] - WC[0]), 2 * (1 - t) * (WC[1] - WL[1]) + 2 * t * (WB[1] - WC[1])];
const STANCE = P({ y: -0.34, t: 20, h: -10, a1: 80, a1l: 70, a2: -70, a2l: -80, l1: 50, l1l: -10, l2: -30, l2l: -30 });
const TURN = P({ y: -0.26, t: 42, h: -20, a1: 112, a1l: 82, a2: -92, a2l: -104, l1: 72, l1l: -42, l2: -12, l2l: -62 });
const AIR = P({ y: -0.6, t: 4, h: 5, a1: 150, a1l: 162, a2: -122, a2l: -132, l1: 72, l1l: -32, l2: -20, l2l: -72 });
function surf(B: number): Out {
  const R1 = 164, R2 = 168;
  const Bh = hs(hs(B, R1), R2);
  // 面の上の位置 t(0=唇 1=底)
  const tt = valT(Bh);
  const s = qb(tt), d = qd(tt), ang = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
  const airUp = Bh >= R2 && Bh < 169.6 ? Math.sin(clamp01((Bh - R2) / 1.6) * Math.PI) * 0.9 : 0;
  const keys: Key[] = [K(160, STANCE), K(163.8, { ...STANCE, y: -0.3 }), K(164, TURN, "snap"), K(165, TURN), K(166, STANCE, "out"), K(167.85, { ...TURN, t: 30 }, "io"), K(168, AIR, "snap"), K(169.4, AIR), K(169.8, STANCE, "in"), K(172, STANCE)];
  const pose = poseAt(keys, Bh);
  const rr = ang * 0.6 + (Bh >= R2 && Bh < 169.6 ? -25 * Math.sin(clamp01((Bh - R2) / 1.6) * Math.PI) : 0);
  const p: Pose = { ...pose, x: s[0], y: s[1] + pose.y - airUp, r: rr };
  const j = fk(p);
  const board = boardPrims("surf", j.ft1, j.ft2, S, C.ink, C.off, ang * 0.9 + (airUp ? -15 : 0), 0);
  // 唇が丸まって画面をおおう(170〜172)
  const crash = ez((B - 170) / 1.8, "in");
  const curl = Math.sin(B * 0.9) * 0.05;
  const lip: V = [WL[0] + 0.5 + crash * 4.5, WL[1] - 0.2 + crash * 2.6];
  const waveD = `M${-6 * S},${0.2 * S} L${-6 * S},${(WL[1] + 0.1) * S} Q${(WL[0] - 0.3) * S},${(WL[1] - 0.5 + curl) * S} ${lip[0] * S},${lip[1] * S} Q${(WL[0] + 0.25) * S},${(WL[1] + 0.35) * S} ${WL[0] * S},${WL[1] * S} Q${WC[0] * S},${WC[1] * S} ${WB[0] * S},${WB[1] * S} L${6 * S},${0.2 * S} Z`;
  const cam = camKeys([
    [160, { cx: -0.6 * S, cy: -1.2 * S, z: 0.82, rot: -14 }],
    [163.8, { cx: 0.6 * S, cy: -0.45 * S, z: 1.0, rot: -6 }],
    [164.05, { cx: 0.8 * S, cy: -0.5 * S, z: 0.85, rot: 6 }, "snap"],
    [167.8, { cx: -1.6 * S, cy: -1.8 * S, z: 0.9, rot: -18 }],
    [168.05, { cx: -1.4 * S, cy: -2.3 * S, z: 0.72, rot: 8 }, "snap"],
    [170, { cx: -0.8 * S, cy: -1.4 * S, z: 0.85, rot: -4 }],
    [172, { cx: 0.2 * S, cy: -0.5 * S, z: 1.0, rot: 0 }, "io"],
  ], B);
  // 波の上の動きを追う:カメラを腰へ寄せる(拍 161〜170)
  const follow = clamp01(Math.min((B - 160.5) / 1.5, (171 - B) / 1.2));
  if (follow > 0) { cam.cx = lerp(cam.cx, j.hip[0] * S + 60, follow * 0.85); cam.cy = lerp(cam.cy, j.hip[1] * S - 60, follow * 0.85); }
  const tail: V = [(j.ft1[0] + j.ft2[0]) / 2 - 0.35, Math.max(j.ft1[1], j.ft2[1]) + 0.02];
  const cover = ez((B - 170.8) / 0.9, "in");
  const limeK = ez((B - 171.2) / 0.8, "out");
  return {
    bg: C.ink, fg: C.off, tone: B >= 171.4 ? C.lime : C.ink, cam, no: 16, far: "rings", shake: shakeAt(B, [R1, R2], 18),
    world: (
      <>
        <path d={waveD} fill={C.off} />
        {Array.from({ length: 5 }, (_, i) => { const t0 = (i * 0.2 + B * 0.07) % 1, a = qb(t0), b = qb(Math.min(1, t0 + 0.12)); return <line key={i} x1={a[0] * S + 40} y1={a[1] * S + 60} x2={b[0] * S + 40} y2={b[1] * S + 60} stroke={C.ink} strokeWidth={5} opacity={0.18} strokeLinecap="round" />; })}
        <Figure p={p} S={S} color={C.ink} bg={C.off} />
        <Prims list={board} />
        {/* しぶき */}
        <Droplets B={B} r={R1} p={tail} color={C.off} n={22} spread={1.2} />
        <Droplets B={B} r={R2} p={tail} color={C.off} n={26} spread={1.4} up={1.3} />
        {Array.from({ length: 10 }, (_, i) => { const b0 = Math.floor(B * 4) / 4 - i * 0.25, a2 = (B - b0) * BEAT; const q: V = [tail[0] - a2 * 0.8 - hash(i + b0) * 0.2, tail[1] - a2 * 0.6 + 4.9 * a2 * a2 * 0.3]; return a2 < 0.6 ? <circle key={i} cx={q[0] * S} cy={q[1] * S} r={(5 + 7 * hash(i * 3 + b0)) * (1 - a2 / 0.6)} fill={airUp ? C.off : C.ink} opacity={0.7} /> : null; })}
        {boom(B, R1, tail, C.lime, C.ink, 0.9)}
        {boom(B, R2, [j.hip[0], j.hip[1]], C.lime, C.off, 1.2)}
      </>
    ),
    screen: (
      <>
        {B >= 170.8 && <g>{Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(i % 5) * 270 + 20} cy={1920 - 2200 * cover + Math.floor(i / 5) * 260} r={260 + 80 * hash(i)} fill={C.off} />)}<rect x={0} y={1920 - 2200 * cover + 200} width={1080} height={2400} fill={C.off} /></g>}
        {B >= 171.2 && <circle cx={540} cy={1000} r={2400 * limeK} fill={C.lime} />}
        {B >= 171.2 && <Droplets B={B} r={171.3} p={[0.9, 1.6]} color={C.ink} n={24} spread={1.5} />}
        {focus(B, R1, 600, 900, C.off)}{focus(B, R2, 540, 800, C.off)}{flash(B, R2, C.off)}
      </>
    ),
  };
}
function valT(b: number) {
  return b < 164 ? lerp(0.32, 0.93, E.io(clamp01((b - 160) / 4))) : b < 168 ? lerp(0.93, 0.12, E.io(clamp01((b - 164) / 3.85))) : b < 170 ? 0.12 : lerp(0.12, 0.5, E.io(clamp01((b - 170) / 2)));
}

// ═══ 水泳 ═══
const swimSig = SIGS.find((s) => s.id === "swimming")!;
function swim(B: number): Out {
  const R = 176, Bh = hs(B, R);
  const X = B < R ? (B - 172) * 0.55 : 2.2;
  const wallX = 2.2 + 0.62;
  const sw = poseAt(swimSig.keys, ((Bh - 172) * 2) % 4);
  const touch = P({ y: -0.2, t: 90, h: -60, a1: 180, a1l: 180, a2: 178, a2l: 180, l1: -88, l1l: -90, l2: -86, l2l: -88 });
  const STANDUP = P({ y: -0.42, t: 6, a1: 20, a1l: 30, a2: -20, a2l: -10 });
  let p: Pose = B < 175.6 ? sw : B < R + 0.6 ? mix(sw, touch, ez((Bh - 175.6) / 0.4, "snap")) : B < 178 ? mix(touch, STANDUP, ez((B - 176.6) / 1.4, "out")) : at(runPose((B - 178) * 1, 24), (B - 178) * 0.6);
  p = { ...p, x: p.x + X };
  const j = fk(p);
  const waterY = -0.17 + Math.sin(B * 2) * 0.01;
  const strokes = [172.5, 173.5, 174.5, 175.5];
  const drain = ez((B - 177.2) / 1.6, "io");
  const cam = camKeys([
    [172, { cx: 0.2 * S, cy: -0.5 * S, z: 1.0, rot: 0 }],
    [174, { cx: 1.2 * S, cy: -0.25 * S, z: 1.15, rot: -3 }],
    [175.85, { cx: 2.0 * S, cy: -0.2 * S, z: 1.35, rot: 4 }, "in"],
    [176.05, { cx: 2.3 * S, cy: -0.4 * S, z: 0.95, rot: -2 }, "snap"],
    [178, { cx: 2.6 * S, cy: -0.5 * S, z: 1.0, rot: 0 }],
    [180, { cx: 3.9 * S, cy: -0.55 * S, z: 1.0, rot: 0 }],
  ], B);
  const fg = C.ink, bg = B >= 178.4 ? C.off : C.lime;
  return {
    bg: C.lime, fg, tone: B >= 178.4 ? C.off : C.lime, cam, no: 17, far: "lanes", shake: shakeAt(B, [R], 14),
    under: B >= 177.2 ? <rect x={0} y={1920 * drain} width={1080} height={1920} fill={C.lime} /> : null,
    over: null,
    world: (
      <>
        {B >= 177.2 && <rect x={-4000} y={-6000} width={12000} height={6000 + waterY * S * 0} fill={C.off} opacity={drain} />}
        <path d={Array.from({ length: 60 }, (_, i) => `${i ? "L" : "M"}${(-3 + i * 0.2) * S},${(waterY + Math.sin(i * 0.9 + B * 3) * 0.012) * S}`).join(" ")} fill="none" stroke={C.ink} strokeWidth={8} opacity={1 - drain} />
        {/* コースロープ → ラグビーのトライライン */}
        {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(-3 + i * 0.22) * S} cy={lerp(0.06, 0, drain) * S} r={lerp(12, 6, drain)} fill={i % 3 === 0 ? C.ink : C.lime} stroke={C.ink} strokeWidth={4} opacity={1} />)}
        {B >= 178.4 && <line x1={(4.6) * S} y1={0} x2={(4.6) * S} y2={-0.02 * S} stroke={C.lime} strokeWidth={30} />}
        {B < 177.4 && <rect x={wallX * S} y={-0.9 * S} width={40} height={1.1 * S} fill={C.ink} />}
        <Figure p={p} S={S} color={fg} bg={bg} />
        {strokes.map((r) => <Droplets key={r} B={B} r={r} p={[j.ha1[0], waterY]} color={C.ink} n={10} spread={0.8} up={0.7} />)}
        <Droplets B={B} r={R} p={[wallX - 0.05, waterY]} color={C.ink} n={24} spread={1.4} />
        {boom(B, R, [wallX - 0.05, -0.3], C.off, C.ink, 0.9)}
      </>
    ),
    screen: <>{focus(B, R, 640, 900, C.ink)}{flash(B, R, C.off)}</>,
  };
}

// ═══ ラグビー ═══
const DIVE = P({ y: -0.2, t: 95, h: -12, a1: 100, a1l: 95, a2: 110, a2l: 100, l1: -80, l1l: -84, l2: -94, l2l: -96 });
const GROUND = P({ y: -0.1, t: 92, h: -10, a1: 96, a1l: 92, a2: 104, a2l: 98, l1: -86, l1l: -88, l2: -92, l2l: -94 });
const KICKLOAD = P({ y: -0.42, t: -6, a1: 70, a1l: 80, a2: -50, a2l: -40, l1: 4, l1l: 4, l2: -60, l2l: -110 });
const PUNT = P({ y: -0.46, t: -22, h: -14, a1: -40, a1l: -20, a2: 80, a2l: 90, l1: -2, l1l: -2, l2: 120, l2l: 118 });
function rugby(B: number): Out {
  const R = 184, Bh = hs(B, R);
  const lineX = 4.6;
  // 走る(180〜183)→ステップ→飛び込んでトライ(184)→起きて高く蹴る(186)
  let p: Pose;
  let x: number;
  if (Bh < 183.6) { x = 3.9 + (Bh - 180) * 0.1 - 0.3; p = runPose((Bh - 180) * 1, 24); if (Bh > 182 && Bh < 183) p = { ...p, x: Math.sin((Bh - 182) * Math.PI) * 0.18 }; }
  else if (Bh < R + 0.6) { x = lerp(4.0, lineX - 0.45, ez((Bh - 183.6) / 0.6, "out")); p = Bh < R ? mix(runPose(3.6, 24), { ...DIVE, y: -0.42 }, ez((Bh - 183.6) / 0.4)) : mix(DIVE, GROUND, ez((Bh - R - HB) / 0.4, "in")); }
  else if (Bh < 185.4) { x = lineX - 0.45; p = GROUND; }
  else if (Bh < 185.85) { x = lineX - 0.4; p = mix(GROUND, KICKLOAD, ez((Bh - 185.4) / 0.45, "out")); }
  else { x = lineX - 0.4; p = mix(KICKLOAD, PUNT, ez((Bh - 185.85) / 0.25, "snap")); }
  p = { ...p, x: p.x + x };
  const j = fk(p);
  const ballHeld: V = Bh < 183.6 ? [j.neck[0] * 0.4 + j.ha1[0] * 0.6 + 0.05, j.neck[1] * 0.4 + j.ha1[1] * 0.6] : [j.ha1[0] + 0.05, j.ha1[1]];
  const kickPt: V = (() => { const jj = fk({ ...PUNT, x: PUNT.x + lineX - 0.4 }); return [jj.ft2[0] + 0.06, jj.ft2[1] - 0.04]; })();
  let ball: V;
  if (B < 185.85) ball = Bh >= R + 0.6 && Bh < 185.4 ? [lineX - 0.02, -0.06] : Bh >= 185.4 ? arc([lineX - 0.02, -0.06], kickPt, 0.2, ez((Bh - 185.4) / 0.45)) : ballHeld;
  else { const s = Math.max(0, B - 186); ball = [kickPt[0] + s * 0.35, kickPt[1] - s * 2.6 + s * s * 0.25]; }
  const shuttle = B >= 187.4;
  const cam = camKeys([
    [180, { cx: 3.9 * S, cy: -0.55 * S, z: 1.0, rot: 0 }],
    [182, { cx: 3.8 * S, cy: -0.45 * S, z: 1.2, rot: -5 }],
    [183.6, { cx: 3.9 * S, cy: -0.35 * S, z: 1.3, rot: 6 }, "io"],
    [184.05, { cx: 4.2 * S, cy: -0.3 * S, z: 0.9, rot: -3 }, "snap"],
    [185.8, { cx: 4.3 * S, cy: -0.6 * S, z: 1.0, rot: 0 }],
    [188, { cx: 4.5 * S, cy: -3.6 * S, z: 1.0, rot: 8 }, "in"],
  ], B);
  const black = ez((B - 186.6) / 1.4, "in");
  const fg = B >= 187.4 ? C.off : C.ink, bg = B >= 187.4 ? C.ink : C.off;
  return {
    bg: C.off, fg, tone: B >= 187.4 ? C.ink : C.off, cam, no: 18, far: "lanes", stream: B < 183.6 ? 1 : 0, shake: shakeAt(B, [R, 186], 18),
    under: B >= 186.6 ? <rect x={0} y={0} width={1080} height={1920 * black} fill={C.ink} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={9000} y2={0} stroke={fg} strokeWidth={5} opacity={0.4} />
        <Ticks d={B < 183.6 ? (B - 180) * 1.3 : 3.6 * 1.3} color={fg} />
        <line x1={lineX * S} y1={0} x2={lineX * S} y2={-12} stroke={C.lime} strokeWidth={30} />
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1={(lineX + 0.6 + i * 0.4) * S} y1={0} x2={(lineX + 0.6 + i * 0.4) * S} y2={-10} stroke={fg} strokeWidth={6} opacity={0.4} />)}
        {Bh >= 183.6 && Bh < 184.6 && <Trail pf={(b) => ({ ...mix(runPose(3.6, 24), { ...DIVE, y: -0.42 }, ez((b - 183.6) / 0.4)), x: lerp(4.0, lineX - 0.45, ez((b - 183.6) / 0.6, "out")) })} B={Bh} color={C.lime} bg={C.off} n={4} dt={0.06} />}
        <Figure p={p} S={S} color={fg} bg={bg} />
        <Prims list={ballPrims(shuttle ? "shuttle" : "oval", ball, S, fg, bg, shuttle ? 90 : B * (B > 186 ? 400 : 0))} />
        {B >= R + 0.3 && age(B, R + 0.3) < 0.6 && [-1, 1].map((k) => <Burst key={k} x={(lineX - 0.2 + k * 0.4) * S} y={-14} r={(0.04 + 0.14 * ez(age(B, R + 0.3) / 0.3, "out")) * S * (1 - ez((age(B, R + 0.3) - 0.3) / 0.3))} n={8} inner={0.5} color={C.lime} stroke={C.ink} sw={4} seed={k + 7} rot={k} />)}
        {boom(B, R, [lineX - 0.1, -0.15], C.lime, C.ink, 1.0)}
        {boom(B, 186, kickPt, C.lime, C.ink, 0.6)}
      </>
    ),
    screen: <>{focus(B, R, 600, 1000, C.ink)}{flash(B, R, C.ink)}</>,
  };
}

// ═══ バドミントン ═══
const BREADY = P({ y: -0.4, t: 10, a1: 40, a1l: 60, a2: 30, a2l: 60, l1: 25, l1l: 0, l2: -25, l2l: -15 });
const BCROUCH = P({ y: -0.3, t: 18, h: -20, a1: 20, a1l: 80, a2: 60, a2l: 120, l1: 50, l1l: -30, l2: 10, l2l: -50 });
const BCOCK = P({ y: -0.72, t: -20, h: -28, a1: -165, a1l: 150, a2: 165, a2l: 172, l1: 30, l1l: -55, l2: 0, l2l: -62 });
const BSMASH = P({ y: -0.74, t: 22, h: 10, a1: 155, a1l: 125, a2: 40, a2l: 20, l1: 52, l1l: -22, l2: 10, l2l: -62 });
function badminton(B: number): Out {
  const R = 192, Bh = hs(B, R);
  const X = 4.6;
  const keys: Key[] = [K(188, BREADY), K(188.5, at(BREADY, 0.12, -0.02), "back"), K(189, at(BREADY, 0.12)), K(189.5, at(BREADY, 0.24, -0.02), "back"), K(190, at(BREADY, 0.24)), K(191.1, at(BCROUCH, 0.3), "io"), K(191.7, at(BCOCK, 0.32), "out"), K(192, at(BSMASH, 0.34), "snap"), K(192.7, at(BSMASH, 0.36, 0.25), "in"), K(193.3, at(BREADY, 0.38), "out"), K(196, at(BREADY, 0.38))];
  const pf = (b: number) => at(poseAt(keys, b), X);
  const p = pf(Bh), j = fk(p);
  const contact: V = (() => { const jj = fk(at(at(BSMASH, 0.34), X)), d = hd(jj), l = Math.hypot(...d); return [jj.ha1[0] + d[0] / l * 0.42, jj.ha1[1] + d[1] / l * 0.42]; })();
  let sh: V;
  if (B < R) { const s = clamp01((B - 187.4) / (R - 187.4)); sh = [lerp(X + 0.4, contact[0], s) + Math.sin(B * 3) * 0.05, lerp(-3.6, contact[1], E.out(s))]; }
  else { const s = Math.max(0, Bh - R - HB); sh = [contact[0] + s * 3.0, contact[1] + s * 2.0]; }
  const streakEnd: V = [contact[0] + 3.3, 0];
  const ramp = ez((B - 193.6) / 1.6, "io");
  const cam = camKeys([
    [188, { cx: (X + 0.45) * S, cy: -3.6 * S, z: 1.0, rot: 8 }],
    [189.5, { cx: (X + 0.4) * S, cy: -1.2 * S, z: 0.9, rot: -3 }, "out"],
    [191.7, { cx: (X + 0.5) * S, cy: -1.25 * S, z: 1.1, rot: 6 }, "io"],
    [192.05, { cx: (X + 1.2) * S, cy: -0.9 * S, z: 0.8, rot: -4 }, "snap"],
    [194, { cx: (X + 1.6) * S, cy: -0.6 * S, z: 0.9, rot: 0 }],
    [196, { cx: (X + 3.2) * S, cy: -0.55 * S, z: 1.0, rot: 0 }, "io"],
  ], B);
  const lime = ez((B - 194.3) / 1.5, "io");
  const fg = B >= 195 ? C.ink : C.off, bg = B >= 195 ? C.lime : C.ink;
  return {
    bg: C.ink, fg, tone: B >= 195 ? C.lime : C.ink, cam, no: 19, far: "dots", shake: shakeAt(B, [R], 18),
    under: B >= 194.3 ? <polygon points={`0,${1920} 0,${1920 - 2600 * lime} 1080,${1920 - 1400 * lime} 1080,1920`} fill={C.lime} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={12000} y2={0} stroke={fg} strokeWidth={5} opacity={0.4} />
        {B >= 191.6 && B < 192.6 && <Trail pf={pf} B={Bh} color={C.lime} bg={C.ink} n={4} dt={0.05} />}
        <g opacity={1 - ez((B - 195.2) / 0.6)}>
          <Figure p={p} S={S} color={fg} bg={bg} />
          <Prims list={toolPrims("racket", j.ha1, hd(j), S, fg, bg)} />
        </g>
        {B >= R && (
          <line x1={contact[0] * S} y1={contact[1] * S} x2={lerp(Math.min(sh[0], streakEnd[0]), streakEnd[0] + 0.6, ramp) * S} y2={lerp(Math.min(sh[1], 0), -0.55, ramp) * S} stroke={C.lime} strokeWidth={lerp(16, 26, ramp)} strokeLinecap="round" />
        )}
        {B < R + 0.5 && <Prims list={ballPrims("shuttle", sh, S, fg, bg, B < R ? 90 + Math.sin(B * 5) * 30 : 34)} />}
        {boom(B, R, contact, C.lime, C.off, 1.1)}
      </>
    ),
    screen: <>{focus(B, R, 560, 760, C.off)}{flash(B, R, C.off)}</>,
  };
}

// ═══ BMX ═══
const PEDAL = (ph: number) => P({ y: -0.68, t: 42, h: -22, a1: 92, a1l: 70, a2: 88, a2l: 66, l1: 50 + 30 * Math.sin(ph), l1l: -30 + 40 * Math.sin(ph + 1.3), l2: 50 - 30 * Math.sin(ph), l2l: -30 - 40 * Math.sin(ph + 1.3) });
const NOHAND = P({ y: -0.95, t: 18, h: -6, a1: 150, a1l: 162, a2: -128, a2l: -138, l1: 62, l1l: -40, l2: 58, l2l: -42 });
function bmx(B: number): Out {
  const R = 200, Bh = hs(B, R);
  const X = 9.0;
  const lift = Bh >= 199.6 && Bh < 202 ? Math.sin(clamp01((Bh - 199.6) / 2.4) * Math.PI) * 1.3 : 0;
  const pose = Bh < 199.4 ? PEDAL((Bh - 196) * Math.PI) : Bh < R ? mix(PEDAL(10), { ...PEDAL(10), y: -0.55, t: 55 }, ez((Bh - 199.4) / 0.5)) : mix({ ...PEDAL(10), y: -0.55, t: 55 }, NOHAND, ez((Bh - R - HB) / 0.3, "snap"));
  const p = { ...pose, x: X, y: pose.y - lift };
  const tilt = Bh >= 199.4 && Bh < 202 ? -18 * Math.sin(clamp01((Bh - 199.4) / 2.6) * Math.PI) : 0;
  const bike = bikePrims([X + 0.05, -0.2 - lift], S, C.ink, C.lime, B * 6, tilt);
  // 手前へ飛んでくる(201〜204):カメラがどんどん寄って、タイヤの黒で画面がうまる
  const fly = ez((B - 201) / 2.8, "in");
  const cam = camKeys([
    [196, { cx: (X - 0.2) * S, cy: -0.55 * S, z: 1.0, rot: 0 }],
    [199.4, { cx: (X + 0.1) * S, cy: -0.5 * S, z: 1.25, rot: -6 }, "io"],
    [200.05, { cx: X * S, cy: -1.5 * S, z: 0.8, rot: 6 }, "snap"],
    [201, { cx: X * S, cy: -1.7 * S, z: 0.85, rot: 0 }],
    [204, { cx: (X + 0.4) * S, cy: -1.7 * S, z: 9, rot: -14 }, "in"],
  ], B);
  const dist = (B - 196) * 1.6;
  return {
    bg: C.lime, fg: C.ink, cam, no: 20, far: "stripes", stream: B < 200 ? 1 : 0, shake: shakeAt(B, [R], 20), noDrift: fly > 0.3,
    world: (
      <>
        <line x1={0} y1={0} x2={20000} y2={0} stroke={C.ink} strokeWidth={6} opacity={0.45} />
        <Ticks d={dist} color={C.ink} />
        {B < 200.5 && <polygon points={`${(X + 1.4 - Math.max(0, B - 197) * 0.45) * S},0 ${(X + 2.4 - Math.max(0, B - 197) * 0.45) * S},0 ${(X + 2.4 - Math.max(0, B - 197) * 0.45) * S},${-0.45 * S}`} fill={C.ink} opacity={0.85} />}
        {Bh >= 199.8 && Bh < 201 && <g opacity={0.3}><Prims list={bikePrims([X - 0.15, -0.1 - lift * 0.8], S, C.off, C.lime, B * 6, tilt)} /></g>}
        <Prims list={bike} />
        <Figure p={p} S={S} color={C.ink} bg={C.lime} />
        {boom(B, R, [X, -0.9 - lift], C.off, C.ink, 1.2)}
      </>
    ),
    screen: <>{focus(B, R, 540, 760, C.ink)}{flash(B, R, C.off)}{B >= 203.4 && <rect width={1080} height={1920} fill={C.ink} opacity={ez((B - 203.4) / 0.6)} />}</>,
  };
}

// ═══ クライマックス:20競技が並ぶ ═══
const COLS = 4, ROWS = 5, CW = 270, CH = 384;
const cellCol = (i: number) => { const k = (i % COLS + Math.floor(i / COLS)) % 3; return k === 0 ? { bg: C.ink, fg: C.off } : k === 1 ? { bg: C.off, fg: C.ink } : { bg: C.lime, fg: C.ink }; };
function climax(B: number): Out {
  const sync = B >= 212;
  const final = B >= 216 ? 216 : B;
  const zoom = ez((B - 204) / 2.2, "out");
  const z = lerp(4, 1, zoom), cx = lerp(3 * CW + CW / 2, 540, zoom), cy = lerp(4 * CH + CH / 2, 960, zoom);
  const cells = SIGS.map((s, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const { bg, fg } = cellCol(i);
    const off = sync ? 0 : (col + row) * 0.25;
    let b = final - 204 - off;
    if (sync) b = final - 212; // 214拍目(=4拍の2拍目)で全員が同時に決める
    const bb = B >= 216 ? 2.05 : b;
    return (
      <g key={s.id} transform={`translate(${col * CW} ${row * CH})`}>
        <rect width={CW} height={CH} fill={bg} />
        <g transform={`translate(${CW / 2} ${CH - 70})`}><Prims list={sigPrims(s, bb, 175, fg, bg)} /></g>
        <text x={14} y={34} fontFamily="Anton" fontSize={26} fill={fg} opacity={0.8}>{String(i + 1).padStart(2, "0")}</text>
        <text x={CW - 14} y={CH - 18} textAnchor="end" fontFamily="Anton" fontSize={28} fill={bg === C.lime ? C.ink : C.lime}>{s.en}</text>
      </g>
    );
  });
  const rot = Math.sin(B * 0.4) * 1.2 + (1 - zoom) * -10;
  return {
    bg: C.ink, fg: C.off, cam: { cx: 0, cy: 0, z: 1, rot: 0 }, no: 0, far: "none", noDrift: true,
    world: null,
    screen: (
      <g transform={`translate(540 960) rotate(${rot}) scale(${z * (1 + 0.012 * Math.sin(B * Math.PI * 2) * (B < 216 ? 1 : 0))}) translate(${-cx} ${-cy})`}>
        {cells}
        {Array.from({ length: COLS + 1 }, (_, i) => <rect key={`v${i}`} x={i * CW - 4} y={0} width={8} height={1920} fill={C.ink} />)}
        {Array.from({ length: ROWS + 1 }, (_, i) => <rect key={`h${i}`} x={0} y={i * CH - 4} width={1080} height={8} fill={C.ink} />)}
        {B >= 214 && age(B, 214) < 0.5 && <Shock x={540} y={960} age={age(B, 214)} color={C.lime} max={1400} life={0.5} w={40} />}
      </g>
    ),
  };
}

// ═══ 締め:主催者のコマ ═══
const ORG = P({ fr: 1, a1: 14, a1l: 10, a2: 14, a2l: 10, l1: 4, l1l: 4, l2: 4, l2l: 4 });
function closing(B: number): Out {
  const bow = B >= 217.5 && B < 219.2 ? Math.sin(clamp01((B - 217.5) / 1.7) * Math.PI) : 0;
  const up = ez((B - 219.6) / 0.5, "back");
  const p = mix({ ...ORG, t: bow * 35, h: bow * 10 }, P({ ...ORG, a1: 150, a1l: 160 + Math.sin((B - 220) * Math.PI) * 18 }), up);
  const drop = ez((B - 216.2) / 0.8, "back");
  return {
    bg: C.ink, fg: C.off, cam: { cx: 0, cy: -0.72 * S - 120, z: 0.75 + 0.05 * ez((B - 216) / 12), rot: 0 }, no: 0, far: "rings",
    world: (
      <g transform={`translate(0 ${(1 - drop) * -1400})`}>
        <ellipse cx={0} cy={6} rx={170} ry={18} fill={C.off} opacity={0.1} />
        <Figure p={p} S={S} color={C.off} bg={C.ink} />
      </g>
    ),
    screen: B < 217 ? <rect width={1080} height={1920} fill={C.ink} opacity={1 - ez((B - 216) / 1)} /> : null,
  };
}

export const SCENES_C = [
  { from: 149, to: 160, fn: skate },
  { from: 160, to: 172, fn: surf },
  { from: 172, to: 180, fn: swim },
  { from: 180, to: 188, fn: rugby },
  { from: 188, to: 196, fn: badminton },
  { from: 196, to: 204, fn: bmx },
  { from: 204, to: 216.6, fn: climax },
  { from: 216.6, to: 999, fn: closing },
];

// クライマックスの大きな文字(DOM)
export const Climax: React.FC<{ B: number }> = ({ B }) => {
  if (B < 211.6 || B >= 216.8) return null;
  const a = age(B, 212);
  const pop = a < 0 ? 0 : a < 0.1 ? 1.25 : 1 + 0.25 * Math.exp(-(a - 0.1) / 0.07);
  const o = B < 212 ? 0 : 1 - ez((B - 216.2) / 0.6);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", transform: `scale(${pop})`, opacity: o }}>
      <div style={{ display: "inline-block", background: C.ink, padding: "18px 40px 26px", border: `8px solid ${C.lime}` }}>
        <div style={{ fontFamily: "Anton", fontSize: 190, lineHeight: 0.92, color: C.off, letterSpacing: 4 }}>KAKUU<br /><span style={{ color: C.lime }}>GAMES</span></div>
        <div style={{ fontFamily: "Anton", fontSize: 70, color: C.off, letterSpacing: 10, marginTop: 10 }}>20 SPORTS</div>
      </div>
    </div>
  );
};

export const Closing: React.FC<{ B: number; platform: string }> = ({ B, platform }) => {
  if (B < 217) return null;
  const k = (d: number) => ez((B - 217 - d) / 0.5, "back");
  const cta = platform === "tiktok" ? ["Instagram(@studio_kakuu)の投稿に", "『ゲームズ』とコメントすると届きます"] : platform === "x" ? ["ピクトグラム図鑑の URL は", "プロフィールのリンクから"] : ["コメントで『ゲームズ』と送ってね", "20競技のピクトグラム図鑑の URL をお届けします"];
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", color: C.off }}>
        <div style={{ fontFamily: "Anton", fontSize: 170, lineHeight: 0.92, letterSpacing: 6, transform: `translateY(${(1 - k(0)) * 80}px)`, opacity: clamp01(k(0) * 2) }}>KAKUU <span style={{ color: C.lime }}>GAMES</span></div>
        <div style={{ fontFamily: "Anton", fontSize: 64, letterSpacing: 8, marginTop: 18, opacity: clamp01(k(0.6) * 2) }}>20 SPORTS, ONE SONG.</div>
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 1440, textAlign: "center", fontFamily: "Zen Kaku Gothic New", fontWeight: 900, color: C.off, opacity: clamp01(k(2) * 2), transform: `translateY(${(1 - k(2)) * 40}px)` }}>
        <div style={{ display: "inline-block", background: C.lime, color: C.ink, fontSize: 54, padding: "10px 26px", letterSpacing: 2 }}>{cta[0]}</div>
        <div style={{ fontSize: 38, marginTop: 22, letterSpacing: 1, whiteSpace: "nowrap" }}>{cta[1]}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, textAlign: "center", fontFamily: "Zen Kaku Gothic New", fontWeight: 900, fontSize: 26, color: C.off, opacity: 0.7 * clamp01(k(3) * 2), letterSpacing: 1 }}>※AIとコードでつくった、実在の大会・団体とは関係のない架空の大会です</div>
    </>
  );
};
void toolPrims; void runPose; void HB;
