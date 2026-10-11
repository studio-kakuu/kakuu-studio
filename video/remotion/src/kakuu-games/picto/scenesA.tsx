// KAKUU GAMES — 場面A:フェンシング(38〜44拍)/剣道(44〜52)/空手(52〜64)/柔道(64〜72)/ボクシング(72〜80)/体操(80〜92)
import React from "react";
import { C, Figure, P, Prims, type Pose, fk, mix, poseAt, toolPrims, type V, type Key, E, clamp01, hash } from "./rig";
import { BEAT, HB, S, hs, ez, lerp, age, shakeAt, camKeys, type Out, Burst, Shock, FocusLines } from "./stage";

const K = (b: number, p: Partial<Pose>, e?: Key["e"]): Key => ({ b, p: P(p), e });
// 竹刀の向き:前腕の向きを、腕の角度に合わせて上へ起こす(構えは剣先が相手の喉、振りかぶりは後ろ)
const shinaiDir = (p: Pose, j: ReturnType<typeof fk>, f = 1): V => {
  const d = hd(j), a = p.a1l;
  const off = (a <= 96 ? lerp(-48, -10, clamp01((a - 60) / 36)) : lerp(-10, 25, clamp01((a - 96) / 104))) * f;
  const r = (off * Math.PI) / 180;
  return [d[0] * Math.cos(r) - d[1] * Math.sin(r), d[0] * Math.sin(r) + d[1] * Math.cos(r)];
};
const hd = (j: ReturnType<typeof fk>, n = 1): V => (n === 1 ? [j.ha1[0] - j.el1[0], j.ha1[1] - j.el1[1]] : [j.ha2[0] - j.el2[0], j.ha2[1] - j.el2[1]]);
const at = (p: Pose, x: number, y = 0): Pose => ({ ...p, x: p.x + x, y: p.y + y });
// 残像:pf(拍)の姿勢を少し前の拍で描く
const Trail: React.FC<{ pf: (b: number) => Pose; B: number; n?: number; dt?: number; color: string; bg: string; f?: number; glove?: boolean }> = ({ pf, B, n = 3, dt = 0.07, color, bg, f = 1, glove }) => (
  <>{Array.from({ length: n }, (_, i) => n - i).map((k) => <Figure key={k} p={pf(B - k * dt)} S={S} f={f} color={color} bg={bg} glove={glove} opacity={0.14 * (n + 1 - k)} />)}</>
);
const flash = (B: number, r: number, color: string) => (B >= r && age(B, r) < 0.034 ? <rect width={1080} height={1920} fill={color} opacity={0.8} /> : null);
const focus = (B: number, r: number, cx: number, cy: number, color: string) => (B >= r && age(B, r) < 0.45 ? <FocusLines cx={cx} cy={cy} o={0.85 * (1 - ez((age(B, r) - 0.1) / 0.35))} seed={Math.floor(B * 6) + r} color={color} inner={380} /> : null);

// ═══ フェンシング ═══
const EG = P({ y: -0.36, t: 6, h: -4, a1: 72, a1l: 84, a2: -125, a2l: -175, l1: 38, l1l: -4, l2: -42, l2l: -14 });
const FENCE: Key[] = [
  K(38, EG), K(38.4, at(EG, 0.18, 0.02), "back"), K(39, at(EG, 0.18)), K(39.4, at(EG, 0.36, 0.02), "back"),
  K(39.85, { ...at(EG, 0.3, 0.04), t: -4, l1: 30, l1l: -12, l2: -32, l2l: -20 }, "io"),
  K(40, P({ x: 0.75, y: -0.3, t: 18, h: -8, a1: 92, a1l: 92, a2: -100, a2l: -95, l1: 72, l1l: 8, l2: -62, l2l: -66 }), "snap"),
  K(41.2, P({ x: 0.78, y: -0.3, t: 16, h: -8, a1: 92, a1l: 92, a2: -100, a2l: -95, l1: 70, l1l: 8, l2: -62, l2l: -66 })),
  K(42, at(EG, 0.6), "back"), K(44, at(EG, 0.6)),
];
const KAMAE = P({ y: -0.41, a1: 55, a1l: 70, a2: 60, a2l: 72, l1: 14, l1l: 8, l2: -16, l2l: -20 });
const KRAISE = P({ y: -0.43, t: -6, a1: 175, a1l: 200, a2: 178, a2l: 205, l1: 10, l1l: 8, l2: -16, l2l: -20 });
const KMEN = P({ y: -0.4, t: 10, h: -4, a1: 98, a1l: 96, a2: 100, a2l: 98, l1: 42, l1l: 8, l2: -40, l2l: -48 });
function fencing(B: number): Out {
  const R = 40, Bh = hs(B, R);
  const p = poseAt(FENCE, Bh);
  const j = fk(p);
  const tipDir = hd(j);
  const foil = toolPrims("foil", j.ha1, tipDir, S, C.ink, C.lime);
  const tip: V = [j.ha1[0] + tipDir[0] / Math.hypot(...tipDir) * 0.7, j.ha1[1] + tipDir[1] / Math.hypot(...tipDir) * 0.7];
  // 剣道の人が右から来て、竹刀で剣を払う(43拍目)
  const xk = 0.6 + 1.25;
  const kp = B < 42.6 ? mix(KAMAE, KRAISE, ez((B - 42.1) / 0.5)) : mix(KRAISE, { ...KMEN, x: -0.12 }, ez((B - 42.6) / 0.4, "snap"));
  const kj = fk(kp, -1);
  const kIn = ez((B - 41.8) / 0.5, "out");
  const clash: V = [0.6 + 0.62, -0.68];
  const orbit = ez((B - 43) / 1.0, "io"); // カメラが回り込む(sx 1→-1)
  const sx = Math.cos(orbit * Math.PI);
  const flipped = sx < 0;
  const cam = camKeys([
    [38, { cx: 0.2 * S, cy: -470, z: 1, rot: 0 }],
    [39.85, { cx: 0.35 * S, cy: -450, z: 1.12, rot: -3 }],
    [40, { cx: 0.7 * S, cy: -520, z: 1.35, rot: 2 }, "snap"],
    [41, { cx: 0.75 * S, cy: -480, z: 0.95, rot: 0 }, "out"],
    [42.6, { cx: 1.15 * S, cy: -500, z: 0.9, rot: -2 }],
    [43, { cx: clash[0] * S, cy: clash[1] * S, z: 1.25, rot: 0 }, "in"],
    [44, { cx: (0.6 + 1.25 - 0.15) * S, cy: -470, z: 1.3, rot: 0 }, "out"],
  ], B);
  cam.sx = sx;
  const bgNow = flipped ? C.ink : C.lime;
  return {
    bg: bgNow, fg: flipped ? C.off : C.ink, cam, no: 3, far: "stripes", shake: shakeAt(B, [R, 43], 14),
    world: (
      <>
        <line x1={-4000} y1={0} x2={6000} y2={0} stroke={flipped ? C.off : C.ink} strokeWidth={5} opacity={0.4} />
        {!flipped && B >= 39.8 && B < 40.6 && <Trail pf={(b) => poseAt(FENCE, b)} B={Bh} color={C.off} bg={C.lime} n={3} dt={0.06} />}
        {!flipped && <><Figure p={p} S={S} color={C.ink} bg={C.lime} /><Prims list={foil} /></>}
        {B >= R && age(B, R) < 0.5 && <><Burst x={tip[0] * S} y={tip[1] * S} r={(0.15 + 0.5 * ez(age(B, R) / 0.2, "out")) * S} n={12} color={C.off} stroke={C.ink} sw={6} seed={3} rot={B} /><Shock x={tip[0] * S} y={tip[1] * S} age={age(B, R)} color={C.ink} max={600} life={0.4} w={18} /></>}
        {B >= 41.8 && (
          <g transform={`translate(${(xk + (1 - kIn) * 1.2) * S} 0)`}>
            <Figure p={kp} S={S} f={-1} color={flipped ? C.off : C.ink} bg={flipped ? C.ink : C.lime} />
            <Prims list={toolPrims("shinai", kj.ha1, shinaiDir(kp, kj, -1), S, flipped ? C.off : C.ink, flipped ? C.ink : C.lime)} />
          </g>
        )}
        {B >= 43 && age(B, 43) < 0.45 && <><Burst x={clash[0] * S} y={clash[1] * S} r={(0.12 + 0.45 * ez(age(B, 43) / 0.2, "out")) * S} n={14} color={C.lime} stroke={C.ink} sw={5} seed={7} rot={-B} /><Shock x={clash[0] * S} y={clash[1] * S} age={age(B, 43)} color={flipped ? C.off : C.ink} max={700} life={0.42} w={16} /></>}
      </>
    ),
    screen: <>{focus(B, R, 700, 860, C.ink)}{flash(B, 43, C.off)}</>,
  };
}

// ═══ 剣道 ═══
const KENDO: Key[] = [
  K(44, KAMAE), K(44.5, at(KAMAE, 0.1, 0.01), "back"), K(45, at(KAMAE, 0.1)), K(45.5, at(KAMAE, 0.2, 0.01), "back"), K(46, at(KAMAE, 0.2)),
  K(47.75, at(KRAISE, 0.2), "io"), K(48, at(KMEN, 0.55), "snap"), K(48.6, at(KMEN, 0.62)), K(50, at({ ...KMEN, a1: 92, a2: 94 }, 1.0), "out"),
  K(51.4, at(KRAISE, 1.0), "io"), K(52, at({ ...KMEN, a1: 60, a1l: 40, a2: 62, a2l: 42, t: 25 }, 1.05), "snap"),
];
function kendo(B: number): Out {
  const R = 48, Bh = hs(B, R);
  const pf = (b: number) => poseAt(KENDO, b);
  const p = pf(Bh), j = fk(p);
  const sh = (pp: Pose, col: string, bg: string) => { const jj = fk(pp); return toolPrims("shinai", jj.ha1, shinaiDir(pp, jj), S, col, bg); };
  const d = shinaiDir(p, j), dl = Math.hypot(...d);
  const tip: V = [j.ha1[0] + d[0] / dl * 0.7, j.ha1[1] + d[1] / dl * 0.7];
  const foot = j.ft1;
  // 52拍目へ:振り下ろしの軌跡(ライム)がオフホワイトの地になる
  const sweep = ez((B - 51.45) / 0.55, "in");
  const wedge = (() => {
    if (B < 51.4) return null;
    const pts: string[] = [];
    for (let k = 0; k <= 10; k++) { const b = lerp(51.4, Math.min(B, 52), k / 10), pp = pf(b), jj = fk(pp), dd = shinaiDir(pp, jj), l = Math.hypot(...dd); pts.push(`${(jj.ha1[0] + dd[0] / l * 0.75) * S},${(jj.ha1[1] + dd[1] / l * 0.75) * S}`); }
    const jj = fk(pf(Math.min(B, 52)));
    return <polygon points={`${jj.ha1[0] * S},${jj.ha1[1] * S} ${pts.join(" ")}`} fill={C.lime} opacity={0.85} />;
  })();
  const cam = camKeys([
    [44, { cx: 0.15 * S, cy: -470, z: 1.3, rot: 0 }],
    [46, { cx: 0.3 * S, cy: -520, z: 1.25, rot: 3 }],
    [47.8, { cx: 0.35 * S, cy: -700, z: 1.55, rot: -4 }, "in"],
    [48.05, { cx: 0.7 * S, cy: -560, z: 1.0, rot: 2 }, "snap"],
    [50, { cx: 1.0 * S, cy: -540, z: 1.1, rot: -2 }],
    [52, { cx: 1.2 * S, cy: -560, z: 1.35, rot: 4 }, "in"],
  ], B);
  return {
    bg: C.ink, fg: C.off, cam, no: 4, far: "grid", shake: shakeAt(B, [R, 52], 18),
    under: B >= 51.6 ? <circle cx={760} cy={1200} r={2600 * ez((B - 51.6) / 0.45, "in")} fill={C.off} /> : null,
    world: (
      <>
        <line x1={-3000} y1={0} x2={4000} y2={0} stroke={C.off} strokeWidth={5} opacity={0.4} />
        {B >= R && age(B, R) < 0.6 && <Shock x={foot[0] * S} y={0} age={age(B, R)} color={C.off} max={900} life={0.5} w={14} squash={0.18} />}
        {(B >= 47.9 && B < 48.6) || B >= 51.6 ? <Trail pf={pf} B={Bh} color={C.lime} bg={C.ink} n={4} dt={0.05} /> : null}
        {wedge}
        <Figure p={p} S={S} color={sweep > 0.5 ? C.ink : C.off} bg={sweep > 0.5 ? C.off : C.ink} />
        <Prims list={sh(p, sweep > 0.5 ? C.ink : C.off, sweep > 0.5 ? C.off : C.ink)} />
        {B >= R && age(B, R) < 0.5 && <><Burst x={tip[0] * S} y={tip[1] * S} r={(0.15 + 0.55 * ez(age(B, R) / 0.2, "out")) * S} n={14} color={C.lime} stroke={C.ink} sw={5} seed={11} rot={B} /><Shock x={tip[0] * S} y={tip[1] * S} age={age(B, R)} color={C.off} max={700} life={0.42} w={18} /></>}
      </>
    ),
    screen: <>{focus(B, R, 640, 760, C.off)}{flash(B, R, C.off)}</>,
  };
}

// ═══ 空手(見せ場)═══
const KZ = P({ y: -0.38, a1: 40, a1l: 120, a2: 20, a2l: 140, l1: 28, l1l: 0, l2: -28, l2l: -8 }); // 構え
const PUNCH = (n: number) => P({ x: 0.08, y: -0.36, t: 6, a1: n ? 90 : -55, a1l: n ? 90 : 85, a2: n ? -55 : 90, a2l: n ? 85 : 90, l1: 40, l1l: 5, l2: -38, l2l: -40 });
const MAEGERI = P({ y: -0.43, t: -14, h: 8, a1: 30, a1l: 120, a2: 10, a2l: 130, l1: 92, l1l: 88, l2: -4, l2l: -4 });
const CHAMBER = P({ y: -0.42, t: -10, a1: 0, a1l: 120, a2: 30, a2l: 150, l1: 75, l1l: -40, l2: -8, l2l: -8 });
const MAWASHI = P({ y: -0.43, t: -26, h: 12, a1: -25, a1l: 60, a2: 65, a2l: 130, l1: 102, l1l: 98, l2: -6, l2l: -6, r: -6 });
const SHUTO = P({ y: -0.4, t: 12, a1: 70, a1l: 50, a2: -50, a2l: 80, l1: 35, l1l: 0, l2: -30, l2l: -30 });
const KARATE: Key[] = [
  K(52, SHUTO), K(52.5, KZ, "back"), K(53, PUNCH(1), "snap"), K(53.5, KZ), K(54, PUNCH(0), "snap"), K(54.5, KZ), K(55, PUNCH(1), "snap"), K(55.5, KZ),
  K(55.85, CHAMBER, "io"), K(56, MAEGERI, "snap"), K(56.8, MAEGERI), K(57.5, KZ, "out"), K(59, KZ),
  K(59.85, CHAMBER, "io"), K(60, MAWASHI, "snap"), K(61, MAWASHI), K(61.8, KZ, "out"), K(62.4, KZ),
  K(62.9, CHAMBER, "io"), K(63.2, { ...MAWASHI, l1: 95, l1l: 90 }, "snap"), K(64, { ...MAWASHI, l1: 95, l1l: 90 }),
];
function karate(B: number): Out {
  const pf = (b: number) => poseAt(KARATE, hs(hs(b, 56), 60));
  const three = B < 57.5;
  const sideK = ez((B - 56.6) / 1.2, "in");
  const cam = camKeys([
    [52, { cx: 0.1 * S, cy: -470, z: 0.62, rot: 3 }],
    [55.8, { cx: 0.1 * S, cy: -450, z: 0.7, rot: -2 }],
    [56.05, { cx: 0.15 * S, cy: -520, z: 0.82, rot: 2 }, "snap"],
    [58, { cx: 0.05 * S, cy: -480, z: 1.1, rot: -3 }],
    [59.85, { cx: 0.15 * S, cy: -560, z: 1.35, rot: -6 }, "in"],
    [60.05, { cx: 0.3 * S, cy: -600, z: 1.0, rot: 4 }, "snap"],
    [62.5, { cx: 0.25 * S, cy: -520, z: 1.05, rot: -2 }],
    [64, { cx: 0.45 * S, cy: -560, z: 1.0, rot: 0 }],
  ], B);
  const figs = three ? [-0.8, 0, 0.8] : [0];
  const p0 = pf(B);
  const j0 = fk(p0);
  // 足をつかむ相手(柔道)— 63拍目から右から入る
  const opIn = ez((B - 62.6) / 0.6, "out");
  const opP = P({ y: -0.4, t: 12, a1: 75, a1l: 70, a2: 80, a2l: 75, l1: 18, l1l: 5, l2: -20, l2l: -10 });
  const catchX = j0.ft1[0] + 0.32;
  const lime = ez((B - 63.3) / 0.7, "in");
  return {
    bg: C.off, fg: C.ink, cam, no: 5, far: "dots", shake: shakeAt(B, [56, 60, 63.2], 16),
    under: B >= 63.3 ? <rect x={0} y={1920 * (1 - lime)} width={1080} height={1920} fill={C.lime} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={4000} y2={0} stroke={C.ink} strokeWidth={5} opacity={0.35} />
        {figs.map((x, i) => {
          const off = three ? Math.abs(i - 1) * 0.1 : 0;
          const pp = pf(B - off);
          const xs = three && i !== 1 ? x * (1 + sideK * 1.4) : x;
          const o = three && i !== 1 ? 1 - sideK : 1;
          return (
            <g key={i} transform={`translate(${xs * S} 0)`} opacity={o}>
              {(B >= 59.8 && B < 60.7) && <Trail pf={pf} B={B} color={C.lime} bg={C.off} n={4} dt={0.05} />}
              <Figure p={pp} S={S} color={C.ink} bg={C.off} />
              {[53, 54, 55].map((r) => { if (B < r - off || age(B, r - off) > 0.25) return null; const jj = fk(pp); const h = jj.ha1[0] > jj.ha2[0] ? jj.ha1 : jj.ha2; return <Shock key={r} x={h[0] * S} y={h[1] * S} age={age(B, r - off)} color={C.ink} max={180} life={0.25} w={8} />; })}
            </g>
          );
        })}
        {[56, 60].map((r) => (B >= r && age(B, r) < 0.5 ? <g key={r}><Burst x={j0.ft1[0] * S} y={j0.ft1[1] * S} r={(0.12 + 0.5 * ez(age(B, r) / 0.2, "out")) * S} n={13} color={C.lime} stroke={C.ink} sw={5} seed={r} rot={B} /><Shock x={j0.ft1[0] * S} y={j0.ft1[1] * S} age={age(B, r)} color={C.ink} max={650} life={0.42} w={18} /></g> : null))}
        {B >= 62.6 && (
          <g transform={`translate(${(catchX + 0.35 + (1 - opIn) * 1.2) * S} 0)`}>
            <Figure p={opP} S={S} f={-1} color={lime > 0.5 ? C.off : "#6B6B66"} bg={lime > 0.5 ? C.lime : C.off} />
          </g>
        )}
      </>
    ),
    screen: <>{focus(B, 56, 560, 900, C.ink)}{focus(B, 60, 600, 780, C.ink)}{flash(B, 60, C.ink)}</>,
  };
}

// ═══ 柔道 ═══
function judo(B: number): Out {
  const R = 68;
  const Bh = hs(B, R);
  // コマ:つかみ合い→回り込む(66.3〜66.7 は正面)→背負って投げる
  const grip = P({ y: -0.4, t: 12, a1: 72, a1l: 82, a2: 78, a2l: 92, l1: 20, l1l: 5, l2: -22, l2l: -10 });
  const sway = Math.sin((B - 64) * Math.PI) * 0.05;
  const load = P({ y: -0.3, t: 45, h: -20, a1: 120, a1l: 165, a2: 70, a2l: 40, l1: 40, l1l: -25, l2: -15, l2l: -40 });
  const thrown = P({ y: -0.33, t: 78, h: -30, a1: 40, a1l: 25, a2: 30, a2l: 15, l1: 50, l1l: -20, l2: -30, l2l: -30 });
  let p: Pose, f = 1;
  const pre = mix(P({ ...MAWASHI, l1: 95, l1l: 90 }), grip, ez((B - 64) / 0.8, "out"));
  if (B < 66.3) p = at(B < 64.8 ? pre : grip, sway);
  else if (B < 66.7) { p = { ...grip, fr: 1, a1: 30, a1l: 20, a2: 30, a2l: 20 }; }
  else { f = -1; p = Bh < 67.7 ? mix(grip, load, ez((Bh - 66.7) / 1.0)) : Bh < R ? load : mix(load, thrown, ez((Bh - R - HB) / 0.4, "snap")); p = { ...p, x: 0.35 }; }
  if (B >= 70) p = mix({ ...thrown, x: 0.35 }, { ...P({ y: -0.4, t: 8, a1: 40, a1l: 150, a2: 30, a2l: 160, l1: 22, l1l: 6, l2: -22, l2l: -12 }), x: 0.35 }, ez((B - 70) / 1.2, "out"));
  const pj = fk(p, f);
  // 相手:背中にのって、肩を中心に回って床へ
  const opBase = P({ y: -0.4, t: 12, a1: 75, a1l: 82, a2: 80, a2l: 90, l1: 18, l1l: 5, l2: -20, l2l: -10 });
  const th = Bh < 67.5 ? 0 : Bh < R ? lerp(0, 175, E.in(clamp01((Bh - 67.5) / 0.5))) : lerp(175, 262, ez((Bh - R - HB) / 0.45, "in"));
  const piv: V = B >= 66.7 ? [pj.shoN[0], pj.shoN[1]] : [0.6, -0.7];
  const opX = 0.62 - (B >= 66.5 ? ez((B - 66.5) / 0.6) * 0.25 : 0);
  const land = B >= R ? ez((Bh - R - HB) / 0.45, "in") : 0;
  const opFade = 1 - ez((B - 70) / 1.0);
  const cam = camKeys([
    [64, { cx: 0.45 * S, cy: -560, z: 1.0, rot: 0 }],
    [66, { cx: 0.4 * S, cy: -520, z: 1.15, rot: 3 }],
    [67.8, { cx: 0.35 * S, cy: -640, z: 1.25, rot: -6 }, "in"],
    [68.1, { cx: 0.2 * S, cy: -600, z: 0.95, rot: -40 }, "out"],
    [69, { cx: 0.1 * S, cy: -420, z: 0.9, rot: -8 }, "out"],
    [70.5, { cx: 0.25 * S, cy: -460, z: 1.0, rot: 0 }],
    [72, { cx: 0.35 * S, cy: -470, z: 1.05, rot: 0 }],
  ], B);
  const slam = R + HB + 0.45 / BEAT * 0.45;
  const black = ez((B - 70.2) / 1.4, "in");
  const rope = ez((B - 70.4) / 1.4, "io");
  return {
    bg: C.lime, fg: B >= 71.2 ? C.off : C.ink, tone: B >= 71.2 ? C.ink : C.lime, cam, no: 6, far: "rings", shake: shakeAt(B, [R, 68.5], 20),
    under: B >= 70.2 ? <rect x={0} y={1200 - 1300 * black} width={1080} height={2600 * black} fill={C.ink} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={4000} y2={0} stroke={C.ink} strokeWidth={5} opacity={0.35} />
        {B >= 68.4 && [0, 1, 2].map((k) => {
          const a = age(B, 68.5 + k * 0.15);
          if (a < 0) return null;
          const r = 120 + Math.min(a, 1.3) * 900;
          const y = lerp(0, -(0.35 + k * 0.27) * S, rope);
          return <ellipse key={k} cx={0.1 * S} cy={y} rx={lerp(r, 3000, rope)} ry={lerp(r * 0.18, 0, rope)} fill="none" stroke={rope > 0.5 ? C.off : C.ink} strokeWidth={lerp(14, 8, rope)} opacity={lerp(1 - Math.min(a, 1.3) / 1.6, 0.85, rope)} />;
        })}
        {B >= 64 && opFade > 0 && (
          <g transform={`rotate(${-th} ${piv[0] * S} ${piv[1] * S}) translate(0 ${land * 0.2 * S})`} opacity={opFade}>
            <Figure p={{ ...opBase, x: opX }} S={S} f={-1} color={C.off} bg={C.lime} />
          </g>
        )}
        {B >= 67.6 && B < 68.6 && <Trail pf={(b) => mix(load, thrown, ez((b - R - HB) / 0.4, "snap"))} B={Bh} f={-1} color={C.off} bg={C.lime} n={2} dt={0.08} />}
        <Figure p={p} S={S} f={f} color={B >= 71.2 ? C.off : C.ink} bg={B >= 71.2 ? C.ink : C.lime} />
        {B >= R && age(B, R) < 0.45 && <Burst x={piv[0] * S - 60} y={piv[1] * S - 160} r={(0.15 + 0.45 * ez(age(B, R) / 0.2, "out")) * S} n={12} color={C.off} stroke={C.ink} sw={6} seed={21} rot={B} />}
        {B >= slam && age(B, slam) < 0.5 && <Burst x={-0.4 * S} y={-20} r={(0.1 + 0.6 * ez(age(B, slam) / 0.25, "out")) * S} n={16} inner={0.3} color={C.ink} seed={23} rot={0} />}
      </>
    ),
    screen: <>{focus(B, R, 540, 760, C.ink)}{flash(B, slam, C.off)}</>,
  };
}

// ═══ ボクシング ═══
const GUARD = P({ y: -0.4, t: 8, a1: 40, a1l: 150, a2: 30, a2l: 160, l1: 22, l1l: 6, l2: -22, l2l: -12 });
const JAB = P({ y: -0.4, t: 12, a1: 86, a1l: 88, a2: 30, a2l: 160, l1: 22, l1l: 6, l2: -22, l2l: -12 });
const DIP = P({ y: -0.32, t: 22, h: -6, a1: 30, a1l: 160, a2: -15, a2l: 55, l1: 38, l1l: -18, l2: -32, l2l: -32 });
const UPPER = P({ y: -0.44, t: -10, h: 10, a1: 40, a1l: 150, a2: 152, a2l: 176, l1: 14, l1l: 5, l2: -10, l2l: -14 });
const RISE = P({ y: -1.4, t: 0, a1: 176, a1l: 178, a2: 174, a2l: 178, l1: 2, l1l: 2, l2: -2, l2l: -2 });
function boxing(B: number): Out {
  const R = 76, Bh = hs(B, R);
  const keys: Key[] = [K(72, GUARD)];
  for (const b of [73, 73.5, 74, 74.5, 75]) keys.push(K(b - 0.05, GUARD), K(b, JAB, "snap"), K(b + 0.25, GUARD, "out"));
  keys.push(K(75.85, DIP, "io"), K(76, UPPER, "snap"), K(77.2, UPPER), K(78.2, { ...UPPER, y: -0.3, t: 20, a2: 160, a1: 150, a1l: 170, a2l: 175 }, "io"), K(80, RISE, "out"));
  let p = poseAt(keys, Bh);
  if (B < 75.8) p = at(p, Math.sin((B - 72) * Math.PI / 2) * 0.06, -Math.abs(Math.sin(B * Math.PI * 2)) * 0.015);
  const j = fk(p);
  const glove = B < 78.6;
  const cam = camKeys([
    [72, { cx: 0.35 * S, cy: -470, z: 1.05, rot: 0 }],
    [73, { cx: 0.3 * S, cy: -500, z: 1.2, rot: -3 }],
    [75, { cx: 0.25 * S, cy: -520, z: 1.3, rot: 4 }],
    [75.85, { cx: 0.15 * S, cy: -420, z: 1.45, rot: -5 }, "in"],
    [76.05, { cx: 0.1 * S, cy: -700, z: 1.0, rot: 3 }, "snap"],
    [78, { cx: 0.1 * S, cy: -760, z: 1.0, rot: 0 }],
    [80, { cx: 0.1 * S, cy: -1.4 * S + 0, z: 1.0, rot: 0 }, "io"],
  ], B);
  const white = ez((B - 78.6) / 1.2, "io");
  return {
    bg: C.ink, fg: B >= 79.3 ? C.ink : C.off, tone: B >= 79.3 ? C.off : C.ink, cam, no: 7, far: "stripes", shake: shakeAt(B, [73, 73.5, 74, 74.5, 75, R], 8),
    under: B >= 78.6 ? <rect x={0} y={0} width={1080} height={1920 * white} fill={C.off} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={4000} y2={0} stroke={C.off} strokeWidth={5} opacity={0.4} />
        {B < 79 && [0.35, 0.62, 0.9].map((y, i) => <line key={i} x1={-3000} y1={-y * S} x2={3000} y2={-y * S} stroke={C.off} strokeWidth={8} opacity={0.55} />)}
        {B < 79 && [-1.9, 2.2].map((x, i) => <rect key={i} x={x * S - 14} y={-1.0 * S} width={28} height={1.0 * S} fill={C.off} opacity={0.6} />)}
        {B >= 75.8 && B < 76.8 && <Trail pf={(b) => poseAt(keys, b)} B={Bh} color={C.lime} bg={C.ink} n={4} dt={0.05} glove />}
        <Figure p={p} S={S} color={B >= 79.3 ? C.ink : C.off} bg={B >= 79.3 ? C.off : C.ink} glove={glove} />
        {[73, 73.5, 74, 74.5, 75].map((r) => (B >= r && age(B, r) < 0.2 ? <Shock key={r} x={j.ha1[0] * S} y={j.ha1[1] * S} age={age(B, r)} color={C.lime} max={160} life={0.2} w={8} /> : null))}
        {B >= R && age(B, R) < 0.5 && <><Burst x={j.ha2[0] * S} y={j.ha2[1] * S} r={(0.15 + 0.55 * ez(age(B, R) / 0.2, "out")) * S} n={14} color={C.lime} stroke={C.ink} sw={5} seed={31} rot={B} /><Shock x={j.ha2[0] * S} y={j.ha2[1] * S} age={age(B, R)} color={C.off} max={760} life={0.45} w={20} /></>}
      </>
    ),
    screen: <>{focus(B, R, 560, 700, C.off)}{flash(B, R, C.off)}</>,
  };
}

// ═══ 体操(見せ場)═══
const UPR = P({ y: -0.43, a1: 172, a1l: 176, a2: 172, a2l: 176 });
const SQ = P({ y: -0.32, t: 18, a1: 150, a1l: 160, a2: 150, a2l: 160, l1: 45, l1l: -30, l2: 45, l2l: -30 });
const CROUCH = P({ y: -0.3, t: 28, h: -10, a1: -45, a1l: -30, a2: -45, a2l: -30, l1: 55, l1l: -40, l2: 55, l2l: -40 });
const TUCK = P({ y: -1.1, t: 10, a1: 110, a1l: 60, a2: 110, a2l: 60, l1: 115, l1l: -30, l2: 115, l2l: -30 });
const LAYOUT = P({ y: -1.45, a1: 178, a1l: 180, a2: 178, a2l: 180, l1: 0, l1l: 0, l2: 0, l2l: 0 });
const STICK = P({ fr: 1, y: -0.43, a1: 150, a1l: 160, a2: 150, a2l: 160, l1: 6, l1l: 6, l2: 6, l2l: 6 });
const APPROACH = P({ y: -0.38, t: 22, a1: -60, a1l: -50, a2: 40, a2l: 90, l1: 40, l1l: -10, l2: -30, l2l: -80 });
function gymnastics(B: number): Out {
  const R1 = 84, R2 = 88;
  const Bh = hs(hs(B, R1), R2);
  const keys: Key[] = [
    K(80, { ...RISE, y: -1.4 }), K(80.9, { ...UPR, y: -0.48 }, "in"), K(81.15, SQ, "out"), K(81.6, { ...UPR, y: -0.62 }, "out"), K(82, SQ, "in"), K(82.5, { ...UPR, y: -0.66 }, "out"), K(83, SQ, "in"),
    K(83.85, CROUCH, "io"), K(84, { ...UPR, y: -0.75, t: -8 }, "snap"),
    K(84.6, { ...TUCK, r: -180 }, "lin"), K(85.3, { ...UPR, y: -0.7, r: -360 }, "lin"), K(85.6, { ...SQ, r: -360 }, "out"), K(86, { ...CROUCH, r: -360 }, "io"),
    K(86.4, { ...UPR, y: -0.9, r: -360 }, "out"), K(87.1, { ...LAYOUT, r: -540 }, "lin"), K(87.85, { ...UPR, y: -0.6, r: -720 }, "lin"), K(88, { ...STICK, r: -720, y: -0.4 }, "snap"),
    K(88.9, { ...STICK, r: -720 }), K(89.4, { ...CROUCH, r: -720 }, "io"), K(90, { ...UPR, y: -0.9, r: -720 }, "out"), K(90.8, { ...TUCK, y: -1.2, r: -900 }, "lin"), K(91.5, { ...APPROACH, y: -0.5, r: -1080 }, "lin"), K(92, { ...APPROACH, r: -1080 }, "out"),
  ];
  const pf = (b: number) => poseAt(keys, b);
  const p = pf(Bh);
  const flying = (Bh > 84 && Bh < 85.4) || (Bh > 86.3 && Bh < 87.9) || (Bh > 89.9 && Bh < 91.6);
  const cam = camKeys([
    [80, { cx: 0.1 * S, cy: -1.4 * S, z: 1.0, rot: 0 }],
    [81.2, { cx: 0.05 * S, cy: -520, z: 1.05, rot: -3 }, "io"],
    [83.85, { cx: 0.1 * S, cy: -420, z: 1.3, rot: 4 }],
    [84.05, { cx: 0.1 * S, cy: -620, z: 0.95, rot: -4 }, "snap"],
    [85.3, { cx: 0.05 * S, cy: -640, z: 0.85, rot: -24 }, "io"],
    [86, { cx: 0.05 * S, cy: -520, z: 1.05, rot: 0 }],
    [87.1, { cx: 0.05 * S, cy: -880, z: 0.8, rot: 30 }, "io"],
    [88.05, { cx: 0, cy: -520, z: 1.2, rot: 0 }, "snap"],
    [89.4, { cx: 0, cy: -480, z: 1.3, rot: 2 }],
    [90.8, { cx: 0.05 * S, cy: -760, z: 0.9, rot: -40 }, "io"],
    [92, { cx: 0.1 * S, cy: -520, z: 1.0, rot: 0 }, "out"],
  ], B);
  const pie = ez((B - 90) / 2, "io");
  const pieD = (() => { const a = pie * Math.PI * 2, R = 2400, x = 540 + Math.sin(a) * R, y = 960 - Math.cos(a) * R; return pie <= 0 ? "" : pie >= 1 ? `M0,0 H1080 V1920 H0 Z` : `M540,960 L540,${960 - R} A${R},${R} 0 ${pie > 0.5 ? 1 : 0} 1 ${x},${y} Z`; })();
  const fg = B >= 91 ? C.ink : C.ink;
  return {
    bg: C.off, fg, tone: B >= 91 ? C.lime : C.off, cam, no: 8, far: "rings", shake: shakeAt(B, [R1, R2], 16),
    under: pie > 0 ? <path d={pieD} fill={C.lime} /> : null,
    world: (
      <>
        <line x1={-4000} y1={0} x2={4000} y2={0} stroke={C.ink} strokeWidth={5} opacity={0.35} />
        {flying && <Trail pf={pf} B={Bh} color={C.lime} bg={C.off} n={5} dt={0.06} />}
        <Figure p={p} S={S} color={C.ink} bg={B >= 91 ? C.lime : C.off} />
        {[81.15, 85.6, R2].map((r) => (B >= r && age(B, r) < 0.55 ? <g key={r}>{[-1, 1].map((k) => <Burst key={k} x={k * 0.3 * S} y={-12} r={(0.03 + 0.11 * ez(age(B, r) / 0.3, "out")) * S * (r === R2 ? 1.5 : 1) * (1 - ez((age(B, r) - 0.25) / 0.3))} n={8} inner={0.5} color={C.lime} stroke={C.ink} sw={4} seed={r + k} rot={k} />)}<Shock x={0} y={0} age={age(B, r)} color={C.ink} max={r === R2 ? 1000 : 500} life={0.5} w={10} squash={0.18} /></g> : null))}
        {B >= R1 && age(B, R1) < 0.45 && <Shock x={0} y={-0.9 * S} age={age(B, R1)} color={C.lime} max={800} life={0.45} w={24} />}
      </>
    ),
    screen: <>{focus(B, R1, 540, 900, C.ink)}{focus(B, R2, 540, 860, C.ink)}{flash(B, R2, C.ink)}</>,
  };
}

export const SCENES_A = [
  { from: 38, to: 44, fn: fencing },
  { from: 44, to: 52, fn: kendo },
  { from: 52, to: 64, fn: karate },
  { from: 64, to: 72, fn: judo },
  { from: 72, to: 80, fn: boxing },
  { from: 80, to: 92, fn: gymnastics },
];
void hash; void BEAT;
