// KAKUU GAMES — 場面B:バレー(92〜100拍)/バスケ(100〜116、112〜116はブレイクで止める)/サッカー(116〜124)/野球(124〜132)/テニス(132〜140)/卓球(140〜149)
import React from "react";
import { C, Figure, P, Prims, type Pose, fk, mix, poseAt, toolPrims, ballPrims, boardPrims, runPose, type V, type Key, clamp01, hash, type PropKind } from "./rig";
import { HB, S, hs, ez, lerp, age, shakeAt, camKeys, type Out, Burst, Shock, FocusLines } from "./stage";

const K = (b: number, p: Partial<Pose>, e?: Key["e"]): Key => ({ b, p: P(p), e });
const at = (p: Pose, x: number, y = 0): Pose => ({ ...p, x: p.x + x, y: p.y + y });
const hd = (j: ReturnType<typeof fk>, n = 1): V => (n === 1 ? [j.ha1[0] - j.el1[0], j.ha1[1] - j.el1[1]] : [j.ha2[0] - j.el2[0], j.ha2[1] - j.el2[1]]);
const flash = (B: number, r: number, color: string) => (B >= r && age(B, r) < 0.034 ? <rect width={1080} height={1920} fill={color} opacity={0.8} /> : null);
const focus = (B: number, r: number, cx: number, cy: number, color: string) => (B >= r && age(B, r) < 0.45 ? <FocusLines cx={cx} cy={cy} o={0.85 * (1 - ez((age(B, r) - 0.1) / 0.35))} seed={Math.floor(B * 6) + r} color={color} inner={380} /> : null);
const Ball: React.FC<{ kind: PropKind; p: V; color: string; bg: string; spin?: number; scale?: number }> = ({ kind, p, color, bg, spin = 0, scale = 1 }) => (
  <g transform={`translate(${p[0] * S} ${p[1] * S}) scale(${scale}) translate(${-p[0] * S} ${-p[1] * S})`}><Prims list={ballPrims(kind, p, S, color, bg, spin)} /></g>
);
const Trail: React.FC<{ pf: (b: number) => Pose; B: number; n?: number; dt?: number; color: string; bg: string; f?: number }> = ({ pf, B, n = 3, dt = 0.07, color, bg, f = 1 }) => (
  <>{Array.from({ length: n }, (_, i) => n - i).map((k) => <Figure key={k} p={pf(B - k * dt)} S={S} f={f} color={color} bg={bg} opacity={0.14 * (n + 1 - k)} />)}</>
);
const boom = (B: number, r: number, p: V, color: string, line: string, k = 1) => (B >= r && age(B, r) < 0.5 ? (
  <g><Burst x={p[0] * S} y={p[1] * S} r={(0.12 + 0.5 * k * ez(age(B, r) / 0.2, "out")) * S} n={13} color={color} stroke={C.ink} sw={5} seed={r} rot={B} /><Shock x={p[0] * S} y={p[1] * S} age={age(B, r)} color={line} max={650 * k} life={0.42} w={18} /></g>
) : null);
// 放物線
const arc = (a: V, b: V, h: number, s: number): V => [lerp(a[0], b[0], s), lerp(a[1], b[1], s) - h * 4 * s * (1 - s)];

// ═══ バレー ═══
export const APPROACH_V = P({ y: -0.38, t: 22, a1: -60, a1l: -50, a2: 40, a2l: 90, l1: 40, l1l: -10, l2: -30, l2l: -80 });
const VSWING = P({ y: -0.3, t: 32, h: -10, a1: -75, a1l: -65, a2: -80, a2l: -70, l1: 55, l1l: -30, l2: 20, l2l: -50 });
const VJUMP = P({ y: -0.85, t: -6, a1: 160, a1l: 170, a2: 150, a2l: 160, l1: 20, l1l: -40, l2: 0, l2l: -50 });
const VCOCK = P({ y: -0.95, t: -18, h: -12, a1: 188, a1l: 218, a2: 150, a2l: 140, l1: 35, l1l: -70, l2: 10, l2l: -65 });
const VHIT = P({ y: -0.92, t: 18, h: 8, a1: 100, a1l: 92, a2: 55, a2l: 35, l1: 45, l1l: -30, l2: 15, l2l: -45 });
const DRIB = P({ y: -0.38, t: 18, h: -6, a1: 28, a1l: 52, a2: -25, a2l: 20, l1: 32, l1l: -12, l2: -26, l2l: -38 });
const NETX = 1.45;
function volleyball(B: number): Out {
  const R = 96, Bh = hs(B, R);
  const keys: Key[] = [
    ...Array.from({ length: 9 }, (_, i) => ({ b: 92 + i * 0.25, p: at(runPose(i * 0.25, 22), i * 0.09), e: "lin" as const })),
    K(94.25, at(VSWING, 0.8)), K(95, at(VJUMP, 0.88), "out"), K(95.75, at(VCOCK, 0.9), "io"), K(96, at(VHIT, 0.95), "snap"), K(96.6, at(VHIT, 0.97, 0.3), "in"),
    K(97.1, at(P({ y: -0.34, t: 20, a1: 30, a1l: 40, a2: 20, a2l: 30, l1: 40, l1l: -20, l2: 10, l2l: -40 }), 0.98), "out"),
    K(98.5, at(DRIB, 0.6), "io"), K(100, DRIB),
  ];
  const pf = (b: number) => poseAt(keys, b);
  const p = pf(Bh), j = fk(p);
  const hit: V = (() => { const jj = fk(at(VHIT, 0.95)); return [jj.ha1[0] + 0.06, jj.ha1[1] - 0.06]; })();
  // ボール:上から落ちてきて→スパイク→床で跳ねるたびに小さく→バスケのボールに
  const dj = fk(DRIB);
  const dribHand: V = [dj.ha1[0] + 0.02, dj.ha1[1] + 0.09];
  let ball: V, kind: PropKind = "vball", sc = 1;
  const pts: [number, V][] = [[R + HB, hit], [96.55, [2.3, -0.085]], [98, [0.9, -0.085]], [99.1, [0.4, -0.085]], [100, dribHand]];
  if (B < R) ball = arc([0.6, -2.9], hit, -0.2, clamp01((B - 93.5) / (R - 93.5)));
  else {
    let i = 0; while (i < pts.length - 2 && B > pts[i + 1][0]) i++;
    const [b0, p0] = pts[i], [b1, p1] = pts[i + 1];
    const s = clamp01((B - b0) / (b1 - b0));
    ball = i === 0 ? [lerp(p0[0], p1[0], s), lerp(p0[1], p1[1], s * s)] : arc(p0, p1, i === 1 ? 1.0 : i === 2 ? 0.55 : 0.3, s);
    if (B > 98.6) { kind = "bball"; }
    sc = B > 98.6 ? 1 : lerp(1.1, 0.9, ez((B - 97) / 1.6));
  }
  const cam = camKeys([
    [92, { cx: 0.1 * S, cy: -520, z: 1.0, rot: 0 }],
    [94.25, { cx: 0.6 * S, cy: -560, z: 1.12, rot: 4 }],
    [95.75, { cx: 0.9 * S, cy: -980, z: 0.95, rot: 8 }, "io"],
    [96.05, { cx: 1.3 * S, cy: -760, z: 0.82, rot: 3 }, "snap"],
    [97.5, { cx: 1.4 * S, cy: -540, z: 0.9, rot: -3 }],
    [100, { cx: 0.15 * S, cy: -520, z: 1.1, rot: 0 }, "io"],
  ], B);
  const dark = ez((B - 98.7) / 0.9, "in");
  const fg = B >= 99.1 ? C.off : C.ink;
  return {
    bg: C.lime, fg, tone: B >= 99.1 ? C.ink : C.lime, cam, no: 9, far: "grid", shake: shakeAt(B, [R, 96.55], 14),
    under: B >= 98.7 ? <circle cx={480} cy={1240} r={2400 * dark} fill={C.ink} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={4000} y2={0} stroke={fg} strokeWidth={5} opacity={0.4} />
        {B < 99.4 && (
          <g opacity={1 - ez((B - 98.6) / 0.6)}>
            <line x1={NETX * S} y1={0} x2={NETX * S} y2={-1.5 * S} stroke={C.ink} strokeWidth={10} />
            <rect x={NETX * S - 10} y={-1.48 * S} width={20} height={0.48 * S} fill="none" stroke={C.ink} strokeWidth={4} />
            {Array.from({ length: 7 }, (_, i) => <line key={i} x1={NETX * S - 10} y1={(-1.48 + i * 0.08) * S} x2={NETX * S + 10} y2={(-1.48 + i * 0.08) * S} stroke={C.ink} strokeWidth={2} />)}
            <rect x={NETX * S - 14} y={-1.5 * S} width={28} height={16} fill={C.off} stroke={C.ink} strokeWidth={4} />
          </g>
        )}
        {[96.55, 98, 99.1].map((r) => (B >= r && age(B, r) < 0.5 ? <Shock key={r} x={(r === 96.55 ? 2.3 : r === 98 ? 0.9 : 0.4) * S} y={0} age={age(B, r)} color={fg} max={r === 96.55 ? 700 : 300} life={0.5} w={10} squash={0.2} /> : null))}
        {B >= 95.6 && B < 96.4 && <Trail pf={pf} B={Bh} color={C.off} bg={C.lime} n={3} dt={0.05} />}
        <Figure p={p} S={S} color={fg} bg={B >= 99.1 ? C.ink : C.lime} />
        {B >= 93.5 && <Ball kind={kind} p={ball} color={fg} bg={B >= 99.1 ? C.ink : C.lime} spin={B * 140} scale={sc} />}
        {B >= R && B < R + 0.8 && <line x1={hit[0] * S} y1={hit[1] * S} x2={ball[0] * S} y2={ball[1] * S} stroke={C.off} strokeWidth={16} strokeLinecap="round" opacity={0.7} />}
        {boom(B, R, hit, C.off, C.ink, 1)}
      </>
    ),
    screen: <>{focus(B, R, 640, 700, C.ink)}{flash(B, R, C.off)}</>,
  };
  void j;
}

// ═══ バスケ(見せ場)+ブレイクで止める+ダンク ═══
const HOOP = { x: 3.05, y: -1.8 };
const CROSS = P({ y: -0.33, t: 24, h: -8, a1: -15, a1l: 20, a2: 35, a2l: 55, l1: 48, l1l: -10, l2: -40, l2l: -55 });
const GATHER = P({ y: -0.3, t: 25, h: -10, a1: 60, a1l: 100, a2: 55, a2l: 105, l1: 52, l1l: -40, l2: -10, l2l: -60 });
const RISEUP = P({ y: -1.3, t: 4, h: -10, a1: 162, a1l: 168, a2: 120, a2l: 140, l1: 50, l1l: -60, l2: -10, l2l: -30 });
const SLAM = P({ y: -1.2, t: 10, h: 4, a1: 130, a1l: 110, a2: 100, a2l: 120, l1: 40, l1l: -40, l2: -5, l2l: -20 });
function bballPose(Bh: number): Pose {
  if (Bh < 104) { const k = Math.abs(Math.sin((Bh - 100) * Math.PI)); return at({ ...DRIB, a1: DRIB.a1 - 12 * k, a1l: DRIB.a1l - 30 * k }, (Bh - 100) * 0.03, 0.01 * k); }
  if (Bh < 104.4) return at(mix(DRIB, CROSS, ez((Bh - 103.8) / 0.5, "snap")), 0.12);
  if (Bh < 106) return at(mix(CROSS, { ...DRIB, a1: -25, a1l: 20, a2: 28, a2l: 52 }, ez((Bh - 104.4) / 0.6)), 0.12);
  if (Bh < 108) { const u = (Bh - 106) * 1; return at(runPose(u, 26), 0.12 + (Bh - 106) * 0.55); }
  if (Bh < 109.7) return at(mix(runPose(2, 26), GATHER, ez((Bh - 108) / 1.4)), 1.22 + (Bh - 108) * 0.35);
  if (Bh < 112) return at(mix(GATHER, RISEUP, ez((Bh - 109.7) / 2.3, "out")), lerp(1.82, 2.45, ez((Bh - 109.7) / 2.3, "out")));
  if (Bh < 116) return at(RISEUP, 2.45);
  if (Bh < 116.6) return at(mix(RISEUP, SLAM, ez((Bh - 116 - HB) / 0.2, "snap")), 2.5);
  return at(mix(SLAM, P({ y: -0.36, t: 15, a1: 40, a1l: 60, a2: 30, a2l: 50, l1: 40, l1l: -20, l2: -10, l2l: -40 }), ez((Bh - 116.6) / 0.5, "in")), lerp(2.5, 2.35, ez((Bh - 116.6) / 0.5)));
}
function bballBall(Bh: number, p: Pose): V | null {
  const j = fk(p);
  if (Bh < 104) { const ph = (((Bh - 100) % 1) + 1) % 1, k = Math.abs(Math.cos(ph * Math.PI)); return [j.ha1[0] + 0.03, lerp(-0.085, j.ha1[1] + 0.09, k)]; }
  if (Bh < 104.5) { const s = ez((Bh - 104) / 0.5); return arc([j.ha1[0], j.ha1[1] + 0.1], [j.ha2[0], j.ha2[1] + 0.1], -0.25, s); }
  if (Bh < 108) { const ph = (((Bh - 104.5) % 1) + 1) % 1, k = Math.abs(Math.cos(ph * Math.PI)); const h = Bh < 106 ? j.ha2 : j.ha1; return [h[0] + 0.04, lerp(-0.085, h[1] + 0.09, k)]; }
  if (Bh < 116) return [(j.ha1[0] + (Bh < 110 ? j.ha2[0] : j.ha1[0])) / 2 + 0.03, (j.ha1[1] + (Bh < 110 ? j.ha2[1] : j.ha1[1])) / 2 - 0.08];
  return null;
}
function basketball(B: number): Out {
  const R1 = 104, R2 = 116;
  const frozen = B >= 112 && B < 116;
  const Bh = frozen ? 112 : hs(hs(B, R1), R2);
  const p = bballPose(Bh);
  const ballP = bballBall(Bh, p);
  const after = B >= 116;
  // ダンク後のボール:リングを抜けて床へ
  const dunkBall: V = B < 116.1 + HB ? [HOOP.x - 0.05, HOOP.y - 0.05] : B < 117 ? [HOOP.x - 0.05 - (B - 116.2) * 0.12, lerp(HOOP.y + 0.05, -0.085, ez((B - 116.2) / 0.8, "in"))] : [2.88, -0.085];
  const inv = frozen || after; // ブレイク以降はオフホワイトの地
  const fg = inv ? C.ink : C.off, bg = inv ? C.off : C.ink;
  const cam = camKeys([
    [100, { cx: 0.15 * S, cy: -520, z: 1.1, rot: 0 }],
    [103.8, { cx: 0.2 * S, cy: -480, z: 1.22, rot: -4 }],
    [104.1, { cx: 0.25 * S, cy: -420, z: 1.45, rot: 4 }, "snap"],
    [106, { cx: 0.6 * S, cy: -500, z: 1.0, rot: -2 }, "out"],
    [108, { cx: 1.5 * S, cy: -560, z: 0.95, rot: 3 }],
    [109.7, { cx: 2.0 * S, cy: -620, z: 1.05, rot: -3 }],
    [112, { cx: 2.65 * S, cy: -1.2 * S, z: 0.82, rot: -8 }, "out"],
    [116, { cx: 2.7 * S, cy: -1.25 * S, z: 0.95, rot: 2 }, "lin"],
    [116.15, { cx: 2.7 * S, cy: -1.1 * S, z: 1.15, rot: -3 }, "snap"],
    [117, { cx: 2.75 * S, cy: -620, z: 1.0, rot: 0 }],
  ], B);
  const rimDip = B >= 116 && B < 117 ? Math.sin(clamp01((B - 116) / 0.6) * Math.PI) * 0.06 * Math.exp(-(B - 116) * 2) : 0;
  return {
    bg, fg, cam, no: 10, far: frozen ? "rings" : "dots", shake: shakeAt(B, [R1, R2], 22),
    world: (
      <>
        <line x1={-4000} y1={0} x2={6000} y2={0} stroke={fg} strokeWidth={5} opacity={0.4} />
        {B >= 106 && (
          <g>
            <rect x={(HOOP.x + 0.22) * S} y={(HOOP.y - 0.5) * S} width={14} height={0.62 * S} fill={fg} />
            <rect x={(HOOP.x + 0.24) * S} y={(HOOP.y - 0.5) * S} width={14} height={2.0 * S} fill={fg} opacity={0.5} />
            <line x1={(HOOP.x - 0.24) * S} y1={(HOOP.y + rimDip) * S} x2={(HOOP.x + 0.22) * S} y2={HOOP.y * S} stroke={C.lime} strokeWidth={14} strokeLinecap="round" />
            {Array.from({ length: 5 }, (_, i) => { const x0 = HOOP.x - 0.22 + i * 0.11; return <line key={i} x1={x0 * S} y1={(HOOP.y + rimDip) * S} x2={(x0 + (2 - i) * 0.02) * S} y2={(HOOP.y + 0.24 + rimDip) * S} stroke={fg} strokeWidth={3} />; })}
          </g>
        )}
        {(B >= 103.8 && B < 104.8) || (B >= 109.6 && B < 112) ? <Trail pf={bballPose} B={Bh} color={C.lime} bg={bg} n={4} dt={0.06} /> : null}
        <Figure p={p} S={S} color={fg} bg={bg} />
        {ballP && <Ball kind="bball" p={ballP} color={fg} bg={bg} spin={B * 120} />}
        {after && <Ball kind={B > 116.9 ? "ball" : "bball"} p={dunkBall} color={fg} bg={bg} spin={B * 200} />}
        {boom(B, R1, [p.x + 0.1, -0.3], C.lime, fg, 0.7)}
        {boom(B, R2, [HOOP.x, HOOP.y], C.lime, fg, 1.3)}
        {B >= 116.9 && age(B, 116.9) < 0.5 && <Shock x={2.88 * S} y={0} age={age(B, 116.9)} color={fg} max={500} life={0.5} w={10} squash={0.2} />}
      </>
    ),
    screen: (
      <>
        {frozen && <FocusLines cx={540} cy={820} o={0.35} seed={7} color={C.ink} inner={520} n={90} />}
        {focus(B, R1, 520, 900, fg)}{focus(B, R2, 600, 700, C.ink)}{flash(B, R2, C.ink)}{flash(B, 112, C.ink)}
      </>
    ),
  };
}

// ═══ サッカー(バスケの続きの同じ場所)═══
const TRAP = P({ y: -0.42, t: -14, h: -12, a1: 40, a1l: 60, a2: -40, a2l: -30, l1: 10, l1l: 5, l2: -12, l2l: -5 });
const KNEE = P({ y: -0.43, t: -4, h: -18, a1: 30, a1l: 20, a2: -30, a2l: -20, l1: 85, l1l: -20, l2: -4, l2l: -4 });
const VLOAD = P({ y: -0.42, t: -10, h: -6, a1: 60, a1l: 70, a2: -60, a2l: -40, l1: 5, l1l: 5, l2: -75, l2l: -135 });
const VOLLEY = P({ y: -0.44, t: -24, h: 8, a1: -40, a1l: -30, a2: 75, a2l: 85, l1: -2, l1l: -2, l2: 88, l2l: 86, r: -8 });
function soccer(B: number): Out {
  const R = 120, Bh = hs(B, R);
  const X = 2.3;
  const keys: Key[] = [K(116, P({ y: -0.36, t: 15, a1: 40, a1l: 60, a2: 30, a2l: 50, l1: 40, l1l: -20, l2: -10, l2l: -40 })), K(117, at(P({}), -0.0)), K(117.5, TRAP, "io"), K(117.9, { ...TRAP, t: -6 }, "out"), K(118.5, KNEE, "back"), K(118.9, P({}), "out"), K(119.75, VLOAD, "io"), K(120, VOLLEY, "snap"), K(121, VOLLEY), K(122, P({ y: -0.42, t: 10, a1: 40, a1l: 60, a2: -20, a2l: 10 }), "out"), K(124, P({}))];
  const p = at(poseAt(keys, Bh), X);
  const j = fk(p);
  const chest: V = [j.neck[0] + 0.12, j.neck[1] + 0.07];
  const knee: V = [j.kn1[0] + 0.02, j.kn1[1] - 0.1];
  const foot: V = (() => { const jj = fk(at(VOLLEY, X)); return [jj.ft2[0] + 0.07, jj.ft2[1] - 0.02]; })();
  let ball: V;
  if (B < 116.9) ball = [2.88, -0.085];
  else if (B < 117.6) ball = arc([2.88, -0.085], chest, 0.5, ez((B - 116.9) / 0.7, "lin"));
  else if (B < 118.5) ball = arc(chest, knee, 0.25, (B - 117.6) / 0.9);
  else if (B < R) ball = arc(knee, foot, 0.55, (B - 118.5) / 1.5);
  else { const s = Math.max(0, Bh - R - HB); ball = [foot[0] + s * 2.4, foot[1] - s * 0.55]; }
  const sc = B < R ? 1 : lerp(1, 0.45, ez((B - R) / 2.5));
  const cam = camKeys([
    [116, { cx: 2.75 * S, cy: -620, z: 1.0, rot: 0 }],
    [117.6, { cx: 2.5 * S, cy: -560, z: 1.25, rot: -3 }],
    [119.7, { cx: 2.45 * S, cy: -420, z: 1.35, rot: 5 }, "io"],
    [120.05, { cx: 2.7 * S, cy: -520, z: 0.95, rot: -2 }, "snap"],
    [124, { cx: (X + 4.8) * S, cy: -700, z: 1.0, rot: -4 }, "in"],
  ], B);
  const lime = ez((B - 122.4) / 1.4, "io");
  return {
    bg: C.off, fg: C.ink, tone: B >= 123 ? C.lime : C.off, cam, no: 11, far: "stripes", shake: shakeAt(B, [R], 16),
    under: B >= 122.4 ? <rect x={1080 * (1 - lime)} y={0} width={1080} height={1920} fill={C.lime} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={9000} y2={0} stroke={C.ink} strokeWidth={5} opacity={0.4} />
        <g opacity={1 - ez((B - 117) / 1.5)}>
          <rect x={(HOOP.x + 0.22) * S} y={(HOOP.y - 0.5) * S} width={14} height={0.62 * S} fill={C.ink} />
          <rect x={(HOOP.x + 0.24) * S} y={(HOOP.y - 0.5) * S} width={14} height={2.0 * S} fill={C.ink} opacity={0.5} />
          <line x1={(HOOP.x - 0.24) * S} y1={HOOP.y * S} x2={(HOOP.x + 0.22) * S} y2={HOOP.y * S} stroke={C.lime} strokeWidth={14} strokeLinecap="round" />
        </g>
        {B >= 119.6 && B < 120.6 && <Trail pf={(b) => at(poseAt(keys, b), X)} B={Bh} color={C.lime} bg={C.off} n={3} dt={0.05} />}
        <Figure p={p} S={S} color={C.ink} bg={C.off} />
        {B >= R && <line x1={foot[0] * S} y1={foot[1] * S} x2={ball[0] * S} y2={ball[1] * S} stroke={C.ink} strokeWidth={10} opacity={0.18} strokeLinecap="round" />}
        <Ball kind={B > 121.5 ? "sball" : "ball"} p={ball} color={B > 121.5 ? C.off : C.ink} bg={B > 121.5 ? C.ink : C.off} spin={B * 260} scale={sc} />
        {boom(B, R, foot, C.lime, C.ink, 1)}
      </>
    ),
    screen: <>{focus(B, R, 520, 960, C.ink)}{flash(B, R, C.ink)}</>,
  };
}

// ═══ 野球(打者は左向き)═══
const BX = 8.4;
const STANCE = P({ y: -0.4, t: 10, h: 4, a1: -40, a1l: 120, a2: -20, a2l: 140, l1: 15, l1l: 5, l2: -18, l2l: -10 });
const LEGKICK = P({ y: -0.44, t: -6, h: 4, a1: -75, a1l: 120, a2: -55, a2l: 140, l1: 70, l1l: -45, l2: -6, l2l: -6 });
const STRIDE = P({ y: -0.36, t: 2, h: 2, a1: -80, a1l: 110, a2: -60, a2l: 130, l1: 38, l1l: 4, l2: -28, l2l: -30 });
const SWING = P({ y: -0.38, t: 22, h: -10, a1: 82, a1l: 96, a2: 80, a2l: 90, l1: 36, l1l: 5, l2: -30, l2l: -42, r: 2 });
const FOLLOW = P({ y: -0.4, t: 26, h: -6, a1: 172, a1l: 228, a2: 160, a2l: 214, l1: 34, l1l: 5, l2: -26, l2l: -42 });
const FORE = P({ y: -0.4, t: 18, h: -4, a1: 150, a1l: 205, a2: 60, a2l: 40, l1: 30, l1l: 5, l2: -30, l2l: -40 });
const BKEYS: Key[] = [K(124, STANCE), K(125, { ...STANCE, a1l: 128 }), K(125.5, STANCE), K(126, { ...STANCE, a1l: 128 }), K(127.2, LEGKICK, "io"), K(127.8, STRIDE, "in"), K(128, SWING, "snap"), K(128.6, FOLLOW, "out"), K(130, FOLLOW), K(131.4, { ...SWING, a1: 60, a1l: 80 }, "io"), K(132, FORE, "snap")];
function baseball(B: number): Out {
  const R = 128, Bh = hs(B, R);
  const pf = (b: number) => at(poseAt(BKEYS, b), BX);
  const p = pf(Bh), j = fk(p, -1);
  const isRacket = B >= 131.2;
  const tool = (pp: Pose) => { const jj = fk(pp, -1); return toolPrims(isRacket ? "racket" : "bat", jj.ha1, hd(jj), S, C.ink, C.lime); };
  const contact: V = (() => { const jj = fk(at(SWING, BX), -1), d = hd(jj), l = Math.hypot(...d); return [jj.ha1[0] + d[0] / l * 0.45, jj.ha1[1] + d[1] / l * 0.45]; })();
  // ボール:左上から近づいて、打たれて右上へ
  let ball: V | null = null;
  if (B >= 125.8 && B < R) ball = arc([BX - 3.2, -1.5], contact, 0.3, ez((B - 125.8) / (R - 125.8), "lin"));
  else if (B >= R) { const s = Math.max(0, Bh - R - HB); ball = [contact[0] - s * 3.2, contact[1] - s * 2.2]; }
  // 振りの軌跡(バットの先の通り道)
  const swPath = (b0: number, b1: number) => { const pts: string[] = []; for (let k = 0; k <= 12; k++) { const b = lerp(b0, b1, k / 12), jj = fk(pf(b), -1), d = hd(jj), l = Math.hypot(...d); pts.push(`${(jj.ha1[0] + d[0] / l * 0.6) * S},${(jj.ha1[1] + d[1] / l * 0.6) * S}`); } return pts; };
  const showArc = B >= 127.9 && B < 129.2;
  const cam = camKeys([
    [124, { cx: (BX - 0.6) * S, cy: -700, z: 1.0, rot: -4 }],
    [126, { cx: (BX - 0.3) * S, cy: -540, z: 1.2, rot: 2 }],
    [127.8, { cx: (BX - 0.2) * S, cy: -500, z: 1.4, rot: -5 }, "in"],
    [128.05, { cx: (BX - 0.45) * S, cy: -620, z: 0.95, rot: 4 }, "snap"],
    [130, { cx: (BX - 0.2) * S, cy: -620, z: 1.05, rot: 0 }],
    [132, { cx: (BX - 0.15) * S, cy: -560, z: 1.25, rot: 22 }, "in"],
  ], B);
  const black = ez((B - 130.6) / 1.4, "in");
  const fg = B >= 131.4 ? C.off : C.ink, bg = B >= 131.4 ? C.ink : C.lime;
  return {
    bg: C.lime, fg, tone: B >= 131.4 ? C.ink : C.lime, cam, no: 12, far: "rings", shake: shakeAt(B, [R], 18),
    under: B >= 130.6 ? <path d={`M540,960 L${540 + 2600 * Math.cos(-2.2 + black * 6.3)},${960 + 2600 * Math.sin(-2.2 + black * 6.3)} A2600,2600 0 ${black > 0.5 ? 1 : 0} 0 ${540 + 2600 * Math.cos(-2.2)},${960 + 2600 * Math.sin(-2.2)} Z`} fill={C.ink} /> : null,
    world: (
      <>
        <line x1={0} y1={0} x2={14000} y2={0} stroke={fg} strokeWidth={5} opacity={0.4} />
        <polygon points={`${(BX - 0.15) * S},0 ${(BX + 0.15) * S},0 ${(BX + 0.15) * S},${-0.03 * S} ${BX * S},${-0.06 * S} ${(BX - 0.15) * S},${-0.03 * S}`} fill={fg} opacity={0.6} />
        {showArc && <polyline points={swPath(127.85, Math.min(Bh, 129)).join(" ")} fill="none" stroke={C.off} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />}
        {B >= 130.4 && <polyline points={swPath(130.4, Math.min(Bh, 132)).join(" ")} fill="none" stroke={C.lime} strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />}
        <Figure p={p} S={S} f={-1} color={fg} bg={bg} />
        <Prims list={isRacket ? toolPrims("racket", j.ha1, hd(j), S, fg, bg) : tool(p)} />
        {ball && <Ball kind="sball" p={ball} color={C.off} bg={C.ink} spin={B * 300} />}
        {boom(B, R, contact, C.off, C.ink, 1.1)}
      </>
    ),
    screen: <>{focus(B, R, 470, 800, C.ink)}{flash(B, R, C.off)}</>,
  };
}

// ═══ テニス(左向き)═══
const TREADY = P({ y: -0.4, t: 14, a1: 40, a1l: 70, a2: 35, a2l: 55, l1: 25, l1l: -5, l2: -25, l2l: -20 });
const TOSS = P({ y: -0.44, t: -8, h: -18, a1: -40, a1l: 60, a2: 172, a2l: 178, l1: 18, l1l: 0, l2: -14, l2l: -14 });
const TROPHY = P({ y: -0.42, t: -24, h: -24, a1: -140, a1l: 160, a2: 168, a2l: 176, l1: 25, l1l: -25, l2: -10, l2l: -35 });
const SERVE = P({ y: -0.5, t: 16, h: 4, a1: 168, a1l: 172, a2: 70, a2l: 40, l1: 8, l1l: 4, l2: -40, l2l: -62 });
const TFOLLOW = P({ y: -0.4, t: 34, h: -6, a1: 30, a1l: -30, a2: 20, a2l: 10, l1: 34, l1l: 4, l2: -40, l2l: -60 });
function tennis(B: number): Out {
  const R = 136, Bh = hs(B, R);
  const keys: Key[] = [K(132, FORE), K(133.2, TREADY, "out"), K(134, TREADY), K(134.8, TOSS, "io"), K(135.85, TROPHY, "io"), K(136, SERVE, "snap"), K(136.7, TFOLLOW, "out"), K(138, TFOLLOW), K(140, TREADY, "io")];
  const pf = (b: number) => at(poseAt(keys, b), BX);
  const p = pf(Bh), j = fk(p, -1);
  const contact: V = (() => { const jj = fk(at(SERVE, BX), -1), d = hd(jj), l = Math.hypot(...d); return [jj.ha1[0] + d[0] / l * 0.42, jj.ha1[1] + d[1] / l * 0.42]; })();
  let ball: V | null = null;
  const tossFrom: V = (() => { const jj = fk(at(TOSS, BX), -1); return [jj.ha2[0], jj.ha2[1]]; })();
  if (B >= 134.6 && B < R) ball = arc(tossFrom, contact, 0.5, ez((B - 134.6) / (R - 134.6), "lin"));
  else if (B >= R) { const s = Math.max(0, Bh - R - HB); ball = [contact[0] - s * 2.6, contact[1] + s * 1.0]; }
  const sc = B < 137 ? 1 : lerp(1, 0.55, ez((B - 137) / 2));
  const cam = camKeys([
    [132, { cx: (BX - 0.15) * S, cy: -560, z: 1.25, rot: 22 }],
    [133.2, { cx: (BX - 0.1) * S, cy: -560, z: 1.05, rot: 0 }, "out"],
    [135.85, { cx: (BX + 0.0) * S, cy: -1000, z: 0.95, rot: 6 }, "io"],
    [136.05, { cx: (BX - 0.4) * S, cy: -800, z: 0.85, rot: -4 }, "snap"],
    [138, { cx: (BX - 1.6) * S, cy: -560, z: 1.0, rot: 0 }],
    [140, { cx: (BX - 2.5) * S, cy: -520, z: 1.6, rot: 0 }, "in"],
  ], B);
  const table = ez((B - 138.6) / 1.4, "in");
  const bp = ball ?? [0, 0];
  return {
    bg: C.ink, fg: C.off, tone: B >= 139.3 ? C.off : C.ink, cam, no: 13, far: "dots", shake: shakeAt(B, [R], 16),
    under: B >= 138.6 ? <rect x={540 - 620 * table * 1.2} y={960 - 1100 * table} width={1240 * table * 1.2} height={2200 * table} rx={60 * (1 - table)} fill={C.off} /> : null,
    world: (
      <>
        <line x1={0} y1={0} x2={14000} y2={0} stroke={C.off} strokeWidth={5} opacity={0.4} />
        {B >= 135.8 && B < 136.6 && <Trail pf={pf} B={Bh} f={-1} color={C.lime} bg={C.ink} n={4} dt={0.05} />}
        <g opacity={1 - ez((B - 139) / 0.6)}>
          <Figure p={p} S={S} f={-1} color={C.off} bg={C.ink} />
          <Prims list={toolPrims("racket", j.ha1, hd(j), S, C.off, C.ink)} />
        </g>
        {ball && <Ball kind={B > 138.4 ? "tball" : "sball"} p={bp} color={C.lime} bg={C.ink} spin={B * 300} scale={sc} />}
        {B >= R && B < 138 && <line x1={contact[0] * S} y1={contact[1] * S} x2={bp[0] * S} y2={bp[1] * S} stroke={C.lime} strokeWidth={14} strokeLinecap="round" opacity={0.6} />}
        {boom(B, R, contact, C.lime, C.off, 1.1)}
      </>
    ),
    screen: <>{focus(B, R, 560, 620, C.off)}{flash(B, R, C.off)}</>,
  };
}

// ═══ 卓球(上下の台・ラリーが速くなる)═══
const TT = { L: -1.25, R: 1.25, top: -0.45, half: 0.8 };
const HITS: number[] = (() => { const h = [140, 141, 142, 143]; for (let b = 144; b < 146; b += 0.5) h.push(b); for (let b = 146; b < 148; b += 0.25) h.push(b); h.push(148); return h; })();
function ttPlayer(B: number, side: 1 | -1): Pose {
  const mine = HITS.filter((h, i) => (i % 2 === 0) === (side === 1) && h <= B + 0.06);
  const last = mine.length ? mine[mine.length - 1] : -9;
  const k = Math.exp(-Math.max(0, B - last) * 6) * (B < last ? 0 : 1);
  const pre = HITS.find((h, i) => (i % 2 === 0) === (side === 1) && h > B);
  const wind = pre !== undefined ? clamp01(1 - (pre - B) / 0.4) : 0;
  const base = P({ y: -0.36, t: 25, h: -6, a1: 40, a1l: 80, a2: 20, a2l: 90, l1: 30, l1l: -10, l2: -25, l2l: -30 });
  const back = { ...base, a1: -30, a1l: 30, t: 18 };
  const hit = { ...base, a1: 105, a1l: 145, t: 32 };
  const pp = mix(mix(base, back, wind * (1 - k)), hit, k);
  return at(pp, (side === 1 ? TT.L : TT.R) + Math.sin(B * 2.1 + side) * 0.05);
}
function ttBall(B: number): V {
  let i = 0; while (i < HITS.length - 1 && B > HITS[i + 1]) i++;
  if (i >= HITS.length - 1) return [TT.R - 0.2, TT.top - 0.05];
  const b0 = HITS[i], b1 = HITS[i + 1], s = clamp01((B - b0) / (b1 - b0));
  const fromL = i % 2 === 0;
  const x0 = fromL ? TT.L + 0.4 : TT.R - 0.4, x1 = fromL ? TT.R - 0.4 : TT.L + 0.4;
  const xb = lerp(x0, x1, 0.65);
  if (s < 0.65) { const u = s / 0.65; return [lerp(x0, xb, u), lerp(-0.62, TT.top - 0.02, u) - 0.25 * 4 * u * (1 - u) * 0.6]; }
  const u = (s - 0.65) / 0.35; return [lerp(xb, x1, u), lerp(TT.top - 0.02, -0.66, u) - 0.12 * 4 * u * (1 - u)];
}
function tabletennis(B: number): Out {
  const R = 148, Bh = hs(B, R);
  const pl = ttPlayer(Bh, 1), pr = ttPlayer(Bh, -1);
  const jl = fk(pl), jr = fk(pr, -1);
  const ball = B < R ? ttBall(B) : (() => { const s = Math.max(0, Bh - R - HB); return [lerp(TT.L + 0.4, TT.R - 0.05, ez(s / 0.25)), lerp(-0.6, TT.top - 0.02, ez(s / 0.25))] as V; })();
  // 台がひっくり返ってスケボーに(148〜149)
  const flip = ez((B - 148.15) / 0.8, "io");
  const speed = B < 144 ? 0 : B < 146 ? 1 : 2;
  const cam = camKeys([
    [139.9, { cx: 0, cy: -540, z: 0.62, rot: 0 }],
    [144, { cx: 0, cy: -520, z: 0.66, rot: -3 }],
    [146, { cx: -0.1 * S, cy: -520, z: 0.74, rot: 3 }],
    [147.9, { cx: -0.4 * S, cy: -520, z: 0.86, rot: -5 }],
    [148.1, { cx: -0.2 * S, cy: -560, z: 0.7, rot: 3 }, "snap"],
    [149, { cx: (TT.L + 0.1) * S, cy: -520, z: 1.0, rot: 0 }, "io"],
  ], B);
  cam.rot += Math.sin(B * Math.PI * (1 + speed)) * speed * 1.2;
  const lime = ez((B - 148.2) / 0.7, "out");
  const deck = (() => {
    const L0: V = [TT.L + 0.1, TT.top], L1: V = [TT.R - 0.1, TT.top];
    const feet: V = [(jl.ft1[0] + jl.ft2[0]) / 2, Math.max(jl.ft1[1], jl.ft2[1]) + 0.03];
    const c: V = [lerp((L0[0] + L1[0]) / 2, feet[0], flip), lerp(TT.top, feet[1], flip)];
    const w = lerp(L1[0] - L0[0], 0.62, flip);
    return { c, w, rot: Math.sin(flip * Math.PI) * -160 };
  })();
  const plRide = B >= 148.6 ? at(P({ y: -0.4, t: 10, a1: 40, a1l: 50, a2: -40, a2l: -30, l1: 20, l1l: 0, l2: -25, l2l: -20 }), TT.L) : pl;
  const fg = C.ink, bg = B >= 148.6 ? C.lime : C.off;
  return {
    bg: C.off, fg, tone: B >= 148.6 ? C.lime : C.off, cam, no: 14, far: "grid", shake: shakeAt(B, [144, R], 12),
    under: B >= 148.2 ? <circle cx={720} cy={1000} r={2600 * lime} fill={C.lime} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={4000} y2={0} stroke={fg} strokeWidth={5} opacity={0.35} />
        {/* 台 */}
        <g opacity={1 - flip}>
          <line x1={(TT.L + 0.35) * S} y1={TT.top * S} x2={(TT.L + 0.35) * S} y2={0} stroke={fg} strokeWidth={10} />
          <line x1={(TT.R - 0.35) * S} y1={TT.top * S} x2={(TT.R - 0.35) * S} y2={0} stroke={fg} strokeWidth={10} />
          <line x1={0} y1={(TT.top - 0.1) * S} x2={0} y2={TT.top * S} stroke={fg} strokeWidth={8} />
        </g>
        <g transform={`translate(${deck.c[0] * S} ${deck.c[1] * S}) rotate(${deck.rot})`}>
          <rect x={-deck.w / 2 * S} y={-10} width={deck.w * S} height={lerp(22, 18, flip)} rx={lerp(2, 9, flip)} fill={fg} />
          {flip > 0.6 && [-1, 1].map((k) => <circle key={k} cx={k * 0.19 * S} cy={24} r={16} fill={fg} stroke={bg} strokeWidth={5} />)}
        </g>
        {/* 相手(灰色)*/}
        <g opacity={1 - flip}>
          <Figure p={pr} S={S} f={-1} color="#7A7A75" bg={C.off} eyes={C.off} />
          <Prims list={toolPrims("paddle", jr.ha1, hd(jr), S, "#7A7A75", C.off)} />
        </g>
        {speed > 0 && B < R && <Trail pf={(b) => ttPlayer(b, 1)} B={B} color={C.lime} bg={C.off} n={2} dt={0.05} />}
        <Figure p={plRide} S={S} color={fg} bg={bg} />
        {B < 148.6 && <Prims list={toolPrims("paddle", jl.ha1, hd(jl), S, fg, bg)} />}
        {B < 148.9 && <Ball kind="tball" p={ball} color={C.lime} bg={C.ink} />}
        {HITS.map((h) => (B >= h && age(B, h) < 0.15 && h < R ? <Shock key={h} x={ball[0] * S} y={ball[1] * S} age={age(B, h)} color={C.ink} max={120} life={0.15} w={6} /> : null))}
        {boom(B, R, [TT.L + 0.45, -0.62], C.lime, C.ink, 0.9)}
        {boom(B, 144, [0, -0.7], C.lime, C.ink, 0.5)}
      </>
    ),
    screen: <>{focus(B, R, 380, 820, C.ink)}{flash(B, R, C.ink)}</>,
  };
}

export const SCENES_B = [
  { from: 92, to: 100, fn: volleyball },
  { from: 100, to: 117, fn: basketball },
  { from: 117, to: 124, fn: soccer },
  { from: 124, to: 132, fn: baseball },
  { from: 132, to: 140, fn: tennis },
  { from: 140, to: 149, fn: tabletennis },
];
void boardPrims; void hash;
