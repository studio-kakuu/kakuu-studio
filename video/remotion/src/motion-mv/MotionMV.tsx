// 作品004「MOTION 100」— 歌われる技名を、その技の動きで巨大な文字として出す MV(1080×1920・約126秒)
// 動きの定義は Web 図鑑と共用(works/motion-zukan/motions.js)。時刻・絵の割り当ては cuts.json(台本4章から生成)
import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { M, EXTRA, C, ease, type Ctx, type Out, type Style } from "../../../../works/motion-zukan/motions.js";
import data from "./cuts.json";
import { Closing, UrlNotice } from "../scenes/Overlays";

loadFont({ family: "Anton", url: staticFile("fonts/Anton-Regular.ttf"), weight: "400" });
loadFont({ family: "Zen Kaku Gothic New", url: staticFile("fonts/ZenKakuGothicNew-Black.ttf"), weight: "900" });

const EN = `"Anton", sans-serif`;
const JA = `"Zen Kaku Gothic New", sans-serif`;
const W = 1080;
const { oc, ic, cl, lerp, rnd } = ease as unknown as Record<string, (...a: number[]) => number>;

type Cut = (typeof data.cuts)[number];
const CUTS: Cut[] = data.cuts;
export type Platform = "instagram" | "tiktok" | "x";
const CLOSING: Record<Platform, string> = {
  instagram: "コメントで『モーション』と送ってね\nモーション図鑑の URL をお届けします",
  tiktok: "Instagram(@studio_kakuu)の投稿に\n『モーション』とコメントすると届きます",
  x: "URLは\nプロフィールのリンクから",
};

// ── 曲調ごとの地の色(5章)──
type Mode = "pop" | "cyber" | "disco" | "outro" | "end";
const SEC = { pre: 34.294, chorus: 54.294, v2: 82.294, outro: 106.294, shut: 114.294, endWall: 116.6, song: 120.06 };
const modeAt = (t: number): Mode => (t < SEC.pre ? "pop" : t < SEC.v2 ? "cyber" : t < SEC.outro ? "disco" : t < SEC.shut ? "outro" : "end");
const dark = (m: Mode) => m === "cyber" || m === "end";
const pal = (m: Mode): Ctx & { bg: string } => {
  const d = dark(m);
  return { n: 0, bg: d ? C.black : C.off, ink: d ? C.off : C.black, paper: d ? C.black : C.off, lime: C.lime, paperAlt: C.black, dim: d ? "rgba(242,240,233,.16)" : "rgba(14,14,14,.12)" };
};

// 1語の中で1文字だけライム(真ん中寄りの文字)
const accentIndex = (w: string) => {
  const idx = [...w].map((c, i) => (/[A-Z0-9]/.test(c) ? i : -1)).filter((i) => i >= 0);
  return idx[Math.floor(idx.length * 0.5)] ?? -1;
};
// 長い語は2〜3段に積む
const splitLines = (w: string): string[] => {
  const words = w.split(" ");
  if (w.length <= 9 || words.length === 1) return [w];
  if (words.length === 2) return words;
  if (words.length === 3 && w.length > 14) return [words[0], words[1], words[2]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
};
const fontFor = (lines: string[], max = 360) => Math.min(max, 1000 / (Math.max(...lines.map((l) => l.length)) * 0.47), 860 / (lines.length * 0.93));

// ── 背景 ──
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const Background: React.FC<{ t: number }> = ({ t }) => {
  const m = modeAt(t);
  const p = pal(m);
  const f = Math.floor(t * 30);
  const beat = (t - 0.294) / 0.5;
  return (
    <AbsoluteFill style={{ background: p.bg }}>
      {m === "disco" && (
        <>
          <div style={{ position: "absolute", left: -200, right: -200, top: 1240, height: 420, background: C.lime, rotate: "-6deg" }} />
          <div style={{ position: "absolute", left: 620, top: -160, width: 640, height: 640, borderRadius: "50%", background: C.lime, overflow: "hidden" }}>
            {Array.from({ length: 36 }, (_, k) => {
              const a = (k / 36) * Math.PI * 2 + t * 0.9;
              const r = 200 + (k % 3) * 60;
              return <div key={k} style={{ position: "absolute", left: 320 + Math.cos(a) * r - 14, top: 320 + Math.sin(a) * r * 0.55 - 14, width: 28, height: 28, borderRadius: "50%", background: C.black, opacity: Math.cos(a) > -0.2 ? 1 : 0.25 }} />;
            })}
          </div>
        </>
      )}
      {m === "cyber" && (
        <>
          <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(242,240,233,.05) 0 2px, transparent 2px 6px)" }} />
          {Math.floor(beat) % 8 === 7 && beat % 1 < 0.15 && <div style={{ position: "absolute", left: 0, right: 0, top: 300 + rnd(f) * 1200, height: 10, background: C.lime, opacity: 0.8 }} />}
        </>
      )}
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundPosition: `${(f * 37) % 320}px ${(f * 53) % 320}px`, opacity: dark(m) ? 0.07 : 0.11, mixBlendMode: dark(m) ? "screen" : "multiply" }} />
    </AbsoluteFill>
  );
};

// 下の帯の小さな文字の壁(Verse 1 / Verse 2)
const TextWall: React.FC<{ t: number }> = ({ t }) => {
  const m = modeAt(t);
  if (m !== "pop" && m !== "disco") return null;
  const sec = m === "pop" ? "Verse 1" : "Verse 2";
  const words = CUTS.filter((c) => c.sec === sec).map((c) => c.en).join("  ·  ");
  const ink = m === "pop" ? "rgba(14,14,14,.22)" : "rgba(14,14,14,.4)";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1580, height: 300, overflow: "hidden", fontFamily: `"Space Grotesk", sans-serif`, fontWeight: 700, fontSize: 40, letterSpacing: "0.06em", color: ink, whiteSpace: "nowrap" }}>
      {[0, 1, 2, 3].map((r) => (
        <div key={r} style={{ translate: `${-((t * (60 + r * 18)) % 2400) - r * 300}px ${Math.sin(t * 2 + r) * 6}px`, lineHeight: "64px" }}>{words}  ·  {words}</div>
      ))}
    </div>
  );
};

// ── 絵 ──
const artSrc = (n: number, variant: "" | "_ol" | "_inv") => staticFile(`motion-mv/art/p${String(n).padStart(2, "0")}${variant}.png`);
const INV = new Set(["LINE DRAWING", "NEON GLOW", "GRADIENT SHIFT", "GLITCH LOOP"]);
const LIME_SIL = new Set(["ZOOM OUT", "PARALLAX", "FADE OUT"]);
const MASK = new Set(["MASK REVEAL", "LETTER SPACING", "IRIS IN", "TEXT REVEAL"]);
const FRONT = new Set(["DROP IN", "STAGGER IN", "SHAKE", "SYNC AND LIVE!", "ANIMATION OVERDRIVE!", "HOVER SCALE", "ORBIT", "3D TILT", "CONFETTI", "SLIDE DOWN"]);
type Layout = "back" | "front" | "side" | "close" | "small";
const layoutFor = (c: Cut, i: number): Layout => {
  if (FRONT.has(c.en)) return "front";
  if (c.pics[0] === 4 || c.pics[0] === 8) return "back";
  return (["back", "side", "close", "small", "back", "side"] as Layout[])[i % 6];
};

const Art: React.FC<{ c: Cut; i: number; t: number; m: Mode; res: Out; layout: Layout }> = ({ c, i, t, m, res, layout }) => {
  if (!c.pics.length) return null;
  const many = c.pics.length > 1;
  const variant = INV.has(c.en) ? "_inv" : dark(m) ? "_ol" : "";
  const enter = oc(cl(t / 0.35));
  return (
    <>
      {c.pics.map((n, k) => {
        const flip = c.flip || (many && k === 1) || (!many && i % 5 === 3);
        let st: React.CSSProperties = { position: "absolute", height: 1500, left: "50%", top: 330, marginLeft: -419 };
        if (layout === "side") st = { position: "absolute", height: 1380, left: i % 2 ? -120 : 380, top: 420 };
        if (layout === "close") st = { position: "absolute", height: 2700, left: "50%", marginLeft: -754, top: 120 };
        if (layout === "small") st = { position: "absolute", height: 900, left: i % 2 ? 60 : 560, top: 940 };
        if (layout === "front") st = { position: "absolute", height: 1300, left: "50%", marginLeft: -363, top: 820 };
        if (many) st = { position: "absolute", height: 1000, left: 40 + k * 340, top: 640 + (k % 2) * 120 };
        const sil = LIME_SIL.has(c.en);
        return (
          <div key={k} style={{ ...st, aspectRatio: "765 / 1373", opacity: interpolate(enter, [0, 1], [0, 1]), translate: `0 ${lerp(60, 0, enter)}px`, ...(res.art as React.CSSProperties) }}>
            {sil ? (
              <div style={{ width: "100%", height: "100%", background: C.lime, WebkitMaskImage: `url(${artSrc(n, "")})`, WebkitMaskSize: "100% 100%", scale: flip ? "-1 1" : undefined }} />
            ) : (
              <Img src={artSrc(n, variant)} style={{ width: "100%", height: "100%", scale: flip ? "-1 1" : undefined }} />
            )}
          </div>
        );
      })}
    </>
  );
};

// ── 語(巨大な英語)──
const Word: React.FC<{ word: string; res: Out; size: number; color: string; accent: string; extra?: Style; maskArt?: string }> = ({ word, res, size, color, accent, extra, maskArt }) => {
  const text = res.text ?? word;
  const lines = splitLines(text);
  const n = text.replace(/ /g, "").length;
  const ai = accentIndex(word);
  let gi = 0;
  const base: React.CSSProperties = {
    fontFamily: EN, fontSize: size, lineHeight: 0.94, color, textAlign: "center", whiteSpace: "pre", position: "relative",
    ...(maskArt ? { backgroundImage: `url(${maskArt}), linear-gradient(${color}, ${color})`, backgroundSize: "auto 260%, 100% 100%", backgroundPosition: "50% 18%, 0 0", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : {}),
    ...(res.box as React.CSSProperties), ...(extra as React.CSSProperties),
  };
  return (
    <div style={base}>
      {lines.map((l, li) => (
        <div key={li}>
          {[...l].map((ch, k) => {
            const idx = ch === " " ? -1 : gi++;
            const fullIdx = word.indexOf(l) + k;
            const st = res.ch ? (res.ch(idx < 0 ? 0 : idx, n) as React.CSSProperties) : {};
            const isAcc = !maskArt && !res.text && fullIdx === ai && base.color !== "transparent";
            return <span key={k} style={{ display: "inline-block", whiteSpace: "pre", ...st, ...(isAcc ? { color: accent } : {}) }}>{ch}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

// 1カット(1語)
const CutView: React.FC<{ c: Cut; i: number }> = ({ c, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;               // その語が出てからの秒
  const T = c.t + t;                   // 曲の中の秒
  const dur = c.end - c.t;
  const m = modeAt(c.t);
  const P = pal(m);
  const mo = M[c.en] ?? EXTRA[c.en];
  const D = Math.min(mo.d, dur * (mo.kind === "out" ? 0.6 : 0.7));
  const p = mo.kind === "loop" ? 1 : mo.kind === "out" ? cl((t - (dur - D - 0.06)) / D) : cl(t / D);
  const ctx: Ctx = { ...P, n: c.en.length };
  const res: Out = mo.f(p, t, ctx, c.en);
  const lines = splitLines(c.en);
  const hookTime = c.t < 1.5;
  const size = fontFor(lines, c.en.length <= 4 ? 520 : 380) * (hookTime ? 0.45 : 1);
  const layout = layoutFor(c, i);
  const centerY = hookTime ? 1240 : layout === "front" ? 690 : layout === "close" ? 1180 : 840;
  const prev = i > 0 ? CUTS[i - 1] : null;
  const color = res.filmText ? C.off : res.onLime && dark(m) ? C.black : P.ink;
  const band = m === "cyber" && c.sec === "Chorus" && i % 3 === 0;
  const full = ["CURTAIN REVEAL", "PAPER TEAR", "PAGE TURN", "SHATTER", "LENS FLASH", "LIGHT LEAK"].includes(c.en);
  const stage: React.CSSProperties = full ? { position: "absolute", inset: 0 } : { position: "absolute", left: 0, width: W, top: centerY - 304, height: 608 };
  const maskArt = MASK.has(c.en) && c.pics.length ? artSrc(c.pics[0], "") : undefined;
  const wordEl = (r: Out, extra?: Style, w = c.en) => <Word word={w} res={r} size={size} color={color} accent={C.lime} extra={extra} maskArt={maskArt} />;
  const layer = (arr: Style[] | undefined) => arr?.map((s, k) => <div key={k} style={{ position: "absolute", ...(s as React.CSSProperties) }} />);
  const showWord = !(T >= 76.294 && T < 78.294) && !(T >= 104.294 && T < 106.294) && !(T >= 112.794 && T < 114.294);
  // カウントダウンの数字は 0〜1.5 秒のフックの間は小さく下に
  return (
    <AbsoluteFill>
      {band && <div style={{ position: "absolute", left: -300, right: -300, top: centerY - 120, height: 240, background: C.lime, rotate: i % 2 ? "-14deg" : "11deg" }} />}
      {layout !== "front" && <Art c={c} i={i} t={t} m={m} res={res} layout={layout} />}
      {showWord && (
        <>
          <div style={stage}>{layer(res.under)}</div>
          {res.kaleido ? (
            <div style={{ position: "absolute", left: 0, width: W, top: centerY - 540, height: 1080 }}>
              {Array.from({ length: 6 }, (_, k) => (
                <div key={k} style={{ position: "absolute", inset: 0, clipPath: "polygon(50% 50%, 100% 21%, 100% 79%)", rotate: `${k * 60 + res.kaleido!.spin}deg`, opacity: res.kaleido!.open, scale: `${lerp(0.4, 1, res.kaleido!.open)}` }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 30, background: k % 2 ? C.lime : P.bg }}>
                    {c.pics[0] ? <Img src={artSrc(c.pics[0], "")} style={{ height: 760, scale: k % 2 ? "-1 1" : undefined }} /> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ ...stage, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            {res.prev && prev && <div style={{ position: "absolute", ...(res.prev as React.CSSProperties) }}><Word word={prev.en} res={{}} size={fontFor(splitLines(prev.en))} color={color} accent={C.lime} /></div>}
            {res.echoes?.map((e, k) => <div key={k} style={{ position: "absolute", ...(e as React.CSSProperties) }}>{wordEl({})}</div>)}
            {res.twin && <div style={{ position: "absolute" }}>{wordEl({ ...res, box: { ...res.box, ...res.twin } })}</div>}
            {res.ghost && <div style={{ position: "absolute", ...(res.ghost as React.CSSProperties) }}>{wordEl({})}</div>}
            {res.marquee ? (
              <div style={{ ...(res.box as React.CSSProperties) }}><Word word={c.en + "  " + c.en} res={{}} size={size} color={C.black} accent={C.black} /></div>
            ) : (
              wordEl(res)
            )}
            {typeof res.shine === "number" && <div style={{ position: "absolute" }}>{wordEl({}, { backgroundImage: `linear-gradient(105deg, transparent ${res.shine * 100 - 8}%, ${C.off} ${res.shine * 100}%, transparent ${res.shine * 100 + 8}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" })}</div>}
            {res.pixel ? <Pixels amount={res.pixel} seed={i} bg={P.bg} ink={P.ink} /> : null}
            {res.slats !== undefined && res.slats > 0.001 ? (
              <div style={{ position: "absolute", inset: 0 }}>
                {Array.from({ length: 8 }, (_, k) => <div key={k} style={{ position: "absolute", left: 0, right: 0, top: `${k * 12.5}%`, height: "12.6%", background: P.bg, transformOrigin: "50% 0%", transform: res.slatRotate ? `perspective(800px) rotateX(${-90 * (1 - res.slats!)}deg)` : `scaleY(${res.slats})` }} />)}
              </div>
            ) : null}
          </div>
          <div style={stage}>{layer(res.fx)}{layer(res.cover)}</div>
          {c.jp && !hookTime && c.t >= 6.29 && <Jp text={c.jp} y={centerY + lines.length * size * 0.47 + 40} t={t} ink={P.ink} dark={dark(m)} />}
        </>
      )}
      {layout === "front" && <Art c={c} i={i} t={t} m={m} res={res} layout={layout} />}
    </AbsoluteFill>
  );
};

const Pixels: React.FC<{ amount: number; seed: number; bg: string; ink: string }> = ({ amount, seed, bg, ink }) => {
  const s = Math.max(24, amount * 600);
  const cols = Math.ceil(W / s);
  const rows = Math.ceil(608 / s);
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const r = rnd(seed * 31 + x * 7 + y * 13);
    if (r < amount * 3.2) cells.push(<div key={`${x}-${y}`} style={{ position: "absolute", left: x * s, top: y * s, width: s, height: s, background: r < amount * 1.6 ? ink : bg }} />);
  }
  return <div style={{ position: "absolute", inset: 0 }}>{cells}</div>;
};

// 日本語の技名(英語の下に小さく)
const Jp: React.FC<{ text: string; y: number; t: number; ink: string; dark: boolean }> = ({ text, y, t, ink, dark: d }) => {
  const len = [...text].length;
  const size = Math.max(46, Math.min(78, 780 / len));
  return (
    <div style={{ position: "absolute", left: 70, width: 850, top: Math.min(y, 1380), textAlign: "center", fontFamily: JA, fontWeight: 900, fontSize: size, lineHeight: 1.25, color: ink, opacity: oc(cl(t / 0.2)), translate: `0 ${lerp(16, 0, oc(cl(t / 0.25)))}px` }}>
      <span style={{ background: d ? "rgba(14,14,14,.72)" : "rgba(242,240,233,.82)", padding: "4px 18px", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{text}</span>
    </div>
  );
};

// Intro〜BOUNCE:1拍ごとの所は、前の英語を上に小さく積み、日本語を下に積み上げる
const BeatStack: React.FC<{ T: number }> = ({ T }) => {
  if (T < 1.5 || T >= 6.294) return null;
  const done = CUTS.filter((c) => c.t <= T && c.t >= 0.29 && c.t < 6.29);
  const prevEn = done.slice(0, -1).slice(-3).reverse();
  const jps = CUTS.filter((c) => c.jp && c.t <= T && c.t < 6.29);
  const ink = C.black;
  return (
    <>
      {prevEn.map((c, k) => (
        <div key={c.no} style={{ position: "absolute", left: 0, right: 0, top: 330 + k * 0 - k * 90, textAlign: "center", fontFamily: EN, fontSize: 120 - k * 26, lineHeight: 1, color: ink, opacity: 0.55 - k * 0.15, translate: `0 ${k * 0}px` }}>{c.en}</div>
      ))}
      <div style={{ position: "absolute", left: 80, top: 1060, width: 840 }}>
        {jps.slice(-4).map((c, k, arr) => {
          const cur = k === arr.length - 1;
          return <div key={c.no} style={{ fontFamily: JA, fontWeight: 900, fontSize: cur ? 62 : 46, lineHeight: 1.5 }}><span style={{ background: "rgba(242,240,233,.88)", padding: "2px 14px", color: ink, opacity: cur ? 1 : 0.55 }}>{cur ? "▶ " : ""}{c.jp}</span></div>;
        })}
      </div>
    </>
  );
};

// ── 技名以外の場面 ──
const Hook: React.FC<{ T: number }> = ({ T }) => {
  if (T > 1.9) return null;
  const leave = ic(cl((T - 1.5) / 0.4));
  return (
    <AbsoluteFill style={{ translate: `0 ${-leave * 700}px`, opacity: 1 - leave }}>
      <div style={{ position: "absolute", left: 60, width: 860, top: 250, textAlign: "center", fontFamily: JA, fontWeight: 900, fontSize: 74, lineHeight: 1.3, color: C.black }}>
        AIで、モーション<span style={{ background: C.lime, padding: "0 10px" }}>100種</span>を<br />MVにした
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 520, textAlign: "center", fontFamily: EN, fontSize: 300, lineHeight: 0.9, color: C.black }}>
        <div>1<span style={{ color: C.lime, WebkitTextStroke: `6px ${C.black}`, paintOrder: "stroke fill" }}>0</span>0</div>
        <div>MOTIONS</div>
      </div>
    </AbsoluteFill>
  );
};

const Interludes: React.FC<{ T: number }> = ({ T }) => {
  // 76.29〜78.29:顔のアップ(文字なしの「間」)
  if (T >= 76.294 && T < 78.294) {
    const q = (T - 76.294) / 2;
    const lid = Math.abs(T - 77.3) < 0.09;
    return (
      <AbsoluteFill style={{ background: C.black, overflow: "hidden" }}>
        <Img src={artSrc(4, "")} style={{ position: "absolute", height: 4600, left: "50%", marginLeft: -1282, top: -1350, scale: `${lerp(1, 1.12, q)}` }} />
        {lid && <div style={{ position: "absolute", left: 0, right: 0, top: 640, height: 520, background: C.black }} />}
      </AbsoluteFill>
    );
  }
  // 104.29〜106.29:巻き戻しの予告(横すじ)
  if (T >= 104.294 && T < 106.294) {
    const f = Math.floor(T * 30);
    const words = CUTS.filter((c) => c.sec === "Verse 2").map((c) => c.en).reverse();
    return (
      <AbsoluteFill style={{ background: C.off, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 260 - ((T - 104.294) * 2600) % 1400, textAlign: "center", fontFamily: EN, fontSize: 130, lineHeight: 1.05, color: C.black, filter: "blur(2px)", opacity: 0.85 }}>
          {[...words, ...words].map((w, k) => <div key={k}>{w}</div>)}
        </div>
        {Array.from({ length: 10 }, (_, k) => <div key={k} style={{ position: "absolute", left: 0, right: 0, top: rnd(f + k * 3) * 1920, height: 6 + rnd(k + f) * 18, background: k % 3 ? C.black : C.lime, opacity: 0.6 }} />)}
      </AbsoluteFill>
    );
  }
  // 112.79〜114.29:電源が落ちたコマの「間」
  if (T >= 112.794 && T < 114.294) {
    const q = (T - 112.794) / 1.5;
    return (
      <AbsoluteFill style={{ background: C.off }}>
        <Img src={artSrc(6, "")} style={{ position: "absolute", height: 1700, left: "50%", marginLeft: -474, top: 200, scale: `${lerp(1.05, 1, q)}`, opacity: 0.9 + 0.1 * Math.sin(T * 6) }} />
      </AbsoluteFill>
    );
  }
  return null;
};

// 34.29 の反転・54.29 のパルス
const Transitions: React.FC<{ T: number }> = ({ T }) => {
  const els: React.ReactNode[] = [];
  if (T > 33.9 && T < SEC.pre + 0.05) {
    const q = oc(cl((T - 33.9) / 0.39));
    els.push(<div key="iris" style={{ position: "absolute", left: 540 - q * 1200, top: 960 - q * 1200, width: q * 2400, height: q * 2400, borderRadius: "50%", background: C.black }} />);
  }
  for (const b of [SEC.chorus - 0.5, SEC.chorus]) if (T >= b && T < b + 0.1) els.push(<div key={`p${b}`} style={{ position: "absolute", inset: 0, background: C.lime, opacity: 1 - (T - b) / 0.1 }} />);
  return <>{els}</>;
};

// 32.29〜34.29 は LETTER SPACING のまま、グリッチを拍ごとに強める(グリッチで暗転へ)
const GlitchToBlack: React.FC<{ T: number }> = ({ T }) => {
  if (T < 32.794 || T >= SEC.pre) return null;
  const k = Math.floor(T * 30);
  const amt = cl((T - 32.794) / 1.5);
  const bars = Math.floor(amt * 7) + 1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: bars }, (_, j) => (
        <div key={j} style={{ position: "absolute", left: (rnd(k + j) - 0.5) * 200 * amt, width: W, top: rnd(k * 3 + j) * 1700 + 100, height: 20 + rnd(k + j * 5) * 90 * amt, background: j % 2 ? C.black : C.lime, opacity: 0.85 }} />
      ))}
      {(k % 6 === 0 && amt > 0.5) && <AbsoluteFill style={{ background: C.black, opacity: 0.85 }} />}
    </AbsoluteFill>
  );
};

// 116.6〜120.06:END を大小くり返して並べる
const EndWall: React.FC<{ T: number }> = ({ T }) => {
  if (T < SEC.endWall || T >= SEC.song) return null;
  const sizes = [420, 120, 260, 70, 180, 340, 90, 150, 230, 60];
  const shown = Math.floor((T - SEC.endWall) / 0.25) + 1;
  return (
    <AbsoluteFill style={{ background: C.black, overflow: "hidden", padding: "180px 40px", display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: "0 24px" }}>
      {sizes.concat(sizes).slice(0, Math.min(20, shown)).map((s, k) => (
        <span key={k} style={{ fontFamily: EN, fontSize: s, lineHeight: 0.95, color: k === 2 || k === 11 ? C.lime : C.off }}>END</span>
      ))}
    </AbsoluteFill>
  );
};

const Shutdown: React.FC<{ T: number }> = ({ T }) => {
  if (T < SEC.shut || T >= SEC.endWall) return null;
  const q = cl((T - (SEC.endWall - 0.7)) / 0.6);
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <AbsoluteFill style={{ transform: `scaleY(${lerp(1, 0.004, ic(q))}) scaleX(${q > 0.8 ? lerp(1, 0, (q - 0.8) / 0.2) : 1})`, background: C.off, overflow: "hidden" }}>
        <Img src={artSrc(6, "")} style={{ position: "absolute", height: 1700, left: "50%", marginLeft: -474, top: 200 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 620, textAlign: "center", fontFamily: EN, fontSize: 250, color: C.black }}>SHUTD<span style={{ color: C.lime, WebkitTextStroke: `4px ${C.black}` }}>O</span>WN.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const MotionMV: React.FC<{ platform: Platform }> = ({ platform }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = frame / fps;
  return (
    <AbsoluteFill style={{ background: C.off }}>
      <Audio src={staticFile("motion-mv/song.mp3")} />
      <Background t={T} />
      <TextWall t={T} />
      {CUTS.filter((c) => c.en !== "SHUTDOWN.").map((c, i) => (
        <Sequence key={c.no} name={`${c.no} ${c.en}`} from={Math.round(c.t * fps)} durationInFrames={Math.max(1, Math.round(c.end * fps) - Math.round(c.t * fps))} layout="none">
          <CutView c={c} i={i} />
        </Sequence>
      ))}
      <BeatStack T={T} />
      <GlitchToBlack T={T} />
      <Transitions T={T} />
      <Interludes T={T} />
      <Shutdown T={T} />
      <EndWall T={T} />
      <Hook T={T} />
      <UrlNotice text="モーション図鑑の URL は最後に" at={[4.3, 7.3]} backing safe />
      <Sequence name="Closing" from={Math.round(SEC.song * fps)} layout="none">
        <AbsoluteFill style={{ background: C.black }}>
          <Closing text={CLOSING[platform]} keyword="モーション" handle="@studio_kakuu" safe />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
