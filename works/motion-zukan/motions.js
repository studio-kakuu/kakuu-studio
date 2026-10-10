// MOTION 100 — 100種の動きの定義(動画 Remotion と Web 図鑑で共用。ライブラリに依存しない純粋な関数)
//
// 1つの技 = { kind, d, f(p, t, c) }
//   kind:'in'(出る)/'out'(消える)/'loop'(くり返し)/'tr'(切り替え・場面転換)
//   d   :主な動きの長さ(秒)。描く側が 0〜1 の進み p を計算して渡す('out' は p=0 が見えている状態、1 で消えきる)
//   t   :その語が出てからの秒(くり返しの動きに使う)
//   c   :{ n: 文字数, ink, paper, lime }(いまの地の色に合わせた3色)
// 返り値 { box, ch(i,n), fx[], text, under } はすべて CSS のスタイル(Remotion の style にも DOM の style にもそのまま入る)
//   box :語全体の箱 / ch:1文字ごと / fx:画面に重ねる四角い部品(position:absolute、単位は画面に対する %)
//   text:文字を差し替える(数字のカウント・文字のシャッフル)/ under:箱の後ろに敷く部品

export const C = { black: '#0E0E0E', off: '#F2F0E9', lime: '#C6FF3D' };

const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const oc = (p) => 1 - Math.pow(1 - cl(p), 3);            // 強い減速
const ic = (p) => Math.pow(cl(p), 3);                     // 加速
const io = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const back = (p, s = 1.8) => { const x = cl(p) - 1; return 1 + (s + 1) * x * x * x + s * x * x; };
const elastic = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1);
const bounce = (p) => {
  const n = 7.5625, d = 2.75; let x = cl(p);
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};
const stag = (p, i, n, spread = 0.5) => cl((p - (i / Math.max(1, n - 1)) * spread) / (1 - spread));
const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const pct = (v) => `${v}%`;
const deg = (v) => `${v}deg`;
const box = (x, y, w, h, st = {}) => ({ left: pct(x), top: pct(y), width: pct(w), height: pct(h), ...st });

// 文字のシャッフル(固定の乱数なので毎回同じ並び)
const scramble = (word, p, seed = 1) => {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@';
  return [...word].map((ch, i) => {
    if (ch === ' ') return ' ';
    const lock = (i + 1) / word.length * 0.85;
    if (p >= lock) return ch;
    return A[Math.floor(rnd(seed + i * 7 + Math.floor(p * 18)) * A.length)];
  }).join('');
};

export const M = {
  // ───────── 出る動き(Verse 1)─────────
  'FADE IN': { kind: 'in', d: 0.6, f: (p) => ({ box: { opacity: oc(p) } }) },
  'SLIDE IN': { kind: 'in', d: 0.45, f: (p) => ({ box: { transform: `translateX(${lerp(-120, 0, oc(p))}%)` } }) },
  'POP IN': { kind: 'in', d: 0.4, f: (p) => ({ box: { transform: `scale(${p <= 0 ? 0 : back(p, 2.6)})` } }) },
  'BOUNCE': { kind: 'in', d: 0.7, f: (p) => ({ box: { transform: `translateY(${lerp(-140, 0, bounce(p))}%)` } }) },
  'SLIDE UP': { kind: 'in', d: 0.5, f: (p, t, c) => ({ ch: (i, n) => ({ transform: `translateY(${lerp(120, 0, oc(stag(p, i, n, 0.4)))}%)`, opacity: stag(p, i, n, 0.4) > 0 ? 1 : 0 }), box: { clipPath: 'inset(-20% -5% -5% -5%)' } }) },
  'SLIDE DOWN': { kind: 'in', d: 0.5, f: (p) => ({ box: { transform: `translateY(${lerp(-120, 0, oc(p))}%)`, opacity: cl(p * 3) } }) },
  'SLIDE LEFT': { kind: 'in', d: 0.45, f: (p) => ({ box: { transform: `translateX(${lerp(130, 0, oc(p))}%)` } }) },
  'SLIDE RIGHT': { kind: 'in', d: 0.45, f: (p) => ({ box: { transform: `translateX(${lerp(-130, 0, oc(p))}%)` } }) },
  'ZOOM IN': { kind: 'in', d: 0.5, f: (p) => ({ box: { transform: `scale(${lerp(0.1, 1, oc(p))})`, opacity: cl(p * 4) } }) },
  'BLUR IN': { kind: 'in', d: 0.6, f: (p) => ({ box: { filter: `blur(${lerp(28, 0, oc(p))}px)`, opacity: cl(p * 2) } }) },
  'TYPEWRITER': { kind: 'in', d: 0.7, f: (p, t, c) => ({
    ch: (i, n) => ({ opacity: p * n > i ? 1 : 0 }),
    fx: [box(50 + lerp(-40, 40, cl(p)), 44, 1.6, 12, { background: c.lime, opacity: Math.floor(t * 4) % 2 ? 1 : 0.15 })],
  }) },
  'TEXT REVEAL': { kind: 'in', d: 0.55, f: (p, t, c) => ({ box: { clipPath: `inset(${lerp(100, -10, oc(p))}% -5% -10% -5%)`, transform: `translateY(${lerp(30, 0, oc(p))}%)` }, fx: [box(5, 62, 90, 0.8, { background: c.lime })] }) },
  'MASK REVEAL': { kind: 'in', d: 0.6, f: (p) => ({ box: { clipPath: `circle(${lerp(0, 75, oc(p))}% at 50% 50%)` } }) },
  'STAGGER IN': { kind: 'in', d: 0.6, f: (p) => ({ ch: (i, n) => { const q = stag(p, i, n, 0.6); return { opacity: q > 0 ? 1 : 0, transform: `translateY(${lerp(60, 0, back(q))}%) scale(${lerp(0.4, 1, oc(q))})` }; } }) },
  'COUNT UP': { kind: 'in', d: 0.6, f: (p, t, c) => ({ text: p < 0.7 ? String(Math.round(lerp(0, 100, oc(p / 0.7)))).padStart(3, '0') : null, box: { color: p < 0.7 ? c.lime : undefined } }) },
  'FLIP IN X': { kind: 'in', d: 0.55, f: (p) => ({ box: { transform: `perspective(900px) rotateX(${lerp(-90, 0, back(p, 1.2))}deg)`, opacity: p > 0 ? 1 : 0 } }) },
  'FLIP IN Y': { kind: 'in', d: 0.55, f: (p) => ({ box: { transform: `perspective(900px) rotateY(${lerp(90, 0, back(p, 1.2))}deg)`, opacity: p > 0 ? 1 : 0 } }) },
  'SPLIT REVEAL': { kind: 'in', d: 0.5, f: (p) => ({ ch: (i, n) => ({ transform: `translateY(${lerp(i % 2 ? 110 : -110, 0, oc(p))}%)` }), box: { clipPath: 'inset(0 -5%)' } }) },
  'DROP IN': { kind: 'in', d: 0.5, f: (p) => ({ box: { transform: `translateY(${p < 0.7 ? lerp(-260, 8, ic(p / 0.7)) : lerp(8, 0, oc((p - 0.7) / 0.3))}%) scaleY(${p > 0.68 && p < 0.85 ? 0.88 : 1})` } }) },
  'SPIN IN': { kind: 'in', d: 0.55, f: (p) => ({ box: { transform: `rotate(${lerp(-540, 0, oc(p))}deg) scale(${lerp(0.1, 1, oc(p))})`, opacity: cl(p * 3) } }) },
  'INK SPLASH': { kind: 'in', d: 0.55, f: (p, t, c) => {
    const r = lerp(0, 1, oc(p));
    const blobs = [[50, 50, 46], [30, 40, 24], [70, 58, 26], [44, 70, 18], [62, 30, 20], [20, 62, 12], [82, 42, 12]];
    return { box: { clipPath: `circle(${lerp(0, 80, oc(p))}% at 48% 52%)` },
      under: blobs.map(([x, y, s], k) => box(x - s * r / 2, y - s * r / 2 * 0.56, s * r, s * r * 0.56, { background: c.lime, borderRadius: '50%', transform: `rotate(${k * 37}deg)`, opacity: k ? 1 : 0.95 })) };
  } },
  'GLITCH IN': { kind: 'in', d: 0.5, f: (p, t, c) => {
    const j = p < 1 ? (rnd(Math.floor(t * 30)) - 0.5) * 30 * (1 - p) : 0;
    return { box: { transform: `translateX(${j}%)`, opacity: p > 0.05 ? 1 : 0, clipPath: p < 1 ? `inset(${rnd(Math.floor(t * 30) + 3) * 40}% 0 ${rnd(Math.floor(t * 30) + 9) * 40}% 0)` : 'none' },
      fx: p < 1 ? [box(0, 35 + rnd(Math.floor(t * 30)) * 30, 100, 3, { background: c.lime, opacity: 0.9 })] : [] };
  } },
  'LINE DRAWING': { kind: 'in', d: 0.7, f: (p, t, c) => ({ box: { color: 'transparent', WebkitTextStroke: `0.03em ${c.ink}`, clipPath: `inset(0 ${lerp(100, 0, io(cl(p / 0.75)))}% 0 0)` }, ghost: p > 0.7 ? { opacity: cl((p - 0.7) / 0.3) } : { opacity: 0 } }) },
  'CURTAIN REVEAL': { kind: 'in', d: 0.6, f: (p, t, c) => ({ fx: [box(lerp(0, -52, io(p)), 0, 51, 100, { background: c.ink }), box(lerp(49, 101, io(p)), 0, 51, 100, { background: c.ink })] }) },
  'WIPE IN': { kind: 'in', d: 0.5, f: (p, t, c) => ({ box: { clipPath: `inset(-10% ${lerp(100, -5, oc(p))}% -10% -5%)` }, fx: [box(lerp(0, 100, oc(p)) - 0.6, 0, 1.2, 100, { background: c.lime, opacity: p < 1 ? 1 : 0 })] }) },
  'IRIS IN': { kind: 'in', d: 0.55, f: (p, t, c) => ({ box: { clipPath: `circle(${lerp(0, 72, oc(p))}% at 50% 50%)` }, fx: [box(50 - lerp(0, 60, oc(p)), 50 - lerp(0, 60, oc(p)) * 0.5625, lerp(0, 120, oc(p)), lerp(0, 120, oc(p)) * 0.5625, { border: `0.5vmin solid ${c.lime}`, borderRadius: '50%', opacity: 1 - p })] }) },
  'ELASTIC IN': { kind: 'in', d: 0.8, f: (p) => ({ box: { transform: `scaleX(${lerp(0, 1, elastic(p))}) scaleY(${lerp(1.6, 1, elastic(p))})` } }) },
  'PIXEL IN': { kind: 'in', d: 0.6, f: (p) => ({ box: { filter: p < 1 ? `blur(${lerp(14, 0, p)}px) contrast(${lerp(8, 1, p)})` : 'none', opacity: cl(p * 2) }, pixel: lerp(0.18, 0, oc(p)) }) },
  'SCRAMBLE TEXT': { kind: 'in', d: 1.2, f: (p, t, c, w) => ({ text: p < 1 ? scramble(w, p, 3) : null }) },
  'LETTER SPACING': { kind: 'in', d: 1.4, f: (p) => ({ box: { letterSpacing: `${lerp(-0.12, 0.35, oc(p))}em`, opacity: cl(p * 3) } }) },

  // ───────── 消える動き(Pre-Chorus 前半)─────────
  'FADE OUT': { kind: 'out', d: 0.5, f: (p) => ({ box: { opacity: 1 - ic(p) } }) },
  'SLIDE OUT': { kind: 'out', d: 0.4, f: (p) => ({ box: { transform: `translateX(${lerp(0, 140, ic(p))}%)` } }) },
  'SHRINK OUT': { kind: 'out', d: 0.45, f: (p) => ({ box: { transform: `scale(${lerp(1, 0, ic(p))})` } }) },
  'ZOOM OUT': { kind: 'out', d: 0.5, f: (p) => ({ box: { transform: `scale(${lerp(1, 4, ic(p))})`, opacity: 1 - ic(p) } }) },
  'BLUR OUT': { kind: 'out', d: 0.5, f: (p) => ({ box: { filter: `blur(${lerp(0, 30, ic(p))}px)`, opacity: 1 - ic(p) } }) },
  'FLIP OUT': { kind: 'out', d: 0.45, f: (p) => ({ box: { transform: `perspective(900px) rotateY(${lerp(0, 90, ic(p))}deg)` } }) },
  'DROP OUT': { kind: 'out', d: 0.5, f: (p) => ({ box: { transform: `translateY(${lerp(0, 260, ic(p))}%) rotate(${lerp(0, 12, p)}deg)` } }) },
  'SPIN OUT': { kind: 'out', d: 0.5, f: (p) => ({ box: { transform: `rotate(${lerp(0, 540, ic(p))}deg) scale(${lerp(1, 0, ic(p))})` } }) },
  'WIPE OUT': { kind: 'out', d: 0.45, f: (p, t, c) => ({ box: { clipPath: `inset(-10% -5% -10% ${lerp(-5, 100, ic(p))}%)` }, fx: [box(lerp(0, 100, ic(p)) - 0.6, 0, 1.2, 100, { background: c.lime, opacity: p > 0 && p < 1 ? 1 : 0 })] }) },
  'IRIS OUT': { kind: 'out', d: 0.5, f: (p, t, c) => ({ box: { clipPath: `circle(${lerp(75, 0, ic(p))}% at 50% 50%)` } }) },
  'SLICE OUT': { kind: 'out', d: 0.5, f: (p, t, c) => ({
    box: { clipPath: 'polygon(0 0,100% 0,100% 38%,0 62%)', transform: `translate(${lerp(0, -30, ic(p))}%, ${lerp(0, -40, ic(p))}%)`, opacity: 1 - ic(p) },
    twin: { clipPath: 'polygon(0 62%,100% 38%,100% 100%,0 100%)', transform: `translate(${lerp(0, 30, ic(p))}%, ${lerp(0, 60, ic(p))}%)`, opacity: 1 - ic(p) },
    fx: p > 0 && p < 0.4 ? [box(0, 49, 100, 0.5, { background: c.lime, transform: 'rotate(-12deg)' })] : [],
  }) },
  'PIXEL OUT': { kind: 'out', d: 0.5, f: (p) => ({ box: { filter: p > 0 ? `blur(${lerp(0, 14, p)}px) contrast(${lerp(1, 8, p)})` : 'none', opacity: 1 - ic(p) }, pixel: lerp(0, 0.2, p) }) },
  'EVAPORATE': { kind: 'out', d: 0.6, f: (p, t, c) => ({
    box: { clipPath: `inset(0 -5% ${lerp(-10, 100, oc(p))}% -5%)`, filter: `blur(${lerp(0, 6, p)}px)` },
    fx: Array.from({ length: 14 }, (_, k) => box(15 + rnd(k) * 70, lerp(60, 20, oc(cl(p * 1.3 - rnd(k + 5) * 0.3))) , 1.2, 0.7, { background: c.ink, borderRadius: '50%', opacity: p > 0 ? (1 - p) * 0.8 : 0 })),
  }) },

  // ───────── 切り替え(Pre-Chorus 後半)─────────
  'CROSS DISSOLVE': { kind: 'tr', d: 0.7, f: (p) => ({ box: { opacity: io(p) }, prev: { opacity: 1 - io(p) } }) },
  'PUSH': { kind: 'tr', d: 0.45, f: (p) => ({ box: { transform: `translateX(${lerp(100, 0, io(p))}%)` }, prev: { transform: `translateX(${lerp(0, -100, io(p))}%)` } }) },
  'ZOOM PAN': { kind: 'tr', d: 0.9, f: (p) => ({ box: { transform: `translateX(${lerp(30, -2, io(p))}%) scale(${lerp(1.8, 1, io(p))})` }, art: { transform: `scale(${lerp(1.6, 1, io(p))}) translateY(${lerp(18, 0, io(p))}%)` } }) },
  'WHIP PAN': { kind: 'tr', d: 0.35, f: (p) => ({ box: { transform: `translateX(${lerp(160, 0, oc(p))}%)`, filter: p < 1 ? `blur(${lerp(24, 0, oc(p))}px)` : 'none' }, prev: { transform: `translateX(${lerp(0, -160, oc(p))}%)`, filter: `blur(${lerp(0, 24, oc(p))}px)` } }) },
  'MORPHING': { kind: 'tr', d: 0.7, f: (p, t, c) => ({ box: { clipPath: `circle(${lerp(9, 90, io(p))}% at 50% 50%)`, borderRadius: `${lerp(50, 0, io(p))}%` }, under: [box(50 - lerp(8, 0, io(p)), 50 - lerp(8, 0, io(p)) * 0.5625, lerp(16, 0, io(p)), lerp(16, 0, io(p)) * 0.5625, { background: c.lime, borderRadius: '50%' })] }) },
  'PARALLAX': { kind: 'tr', d: 1, f: (p, t, c) => ({ box: { transform: `translateX(${lerp(40, -6, oc(p))}%)` }, art: { transform: `translateX(${lerp(18, -3, oc(p))}%)` }, fx: [box(lerp(-10, -40, oc(p)), 78, 160, 4, { background: c.lime })] }) },
  'SEAMLESS ZOOM': { kind: 'tr', d: 1, f: (p) => ({ box: { transform: `scale(${lerp(1, 14, ic(p))})`, transformOrigin: '20% 50%', opacity: p > 0.92 ? 0 : 1 } }) },

  // ───────── くり返しの動き(Chorus)─────────
  'PULSE': { kind: 'loop', d: 0.3, f: (p, t) => ({ box: { transform: `scale(${1 + 0.12 * Math.exp(-((t % 0.5) * 10))})` } }) },
  'SHAKE': { kind: 'loop', d: 0.3, f: (p, t) => ({ box: { transform: `translate(${Math.sin(t * 70) * 3}%, ${Math.cos(t * 53) * 2}%)` } }) },
  'LOOP BOUNCE': { kind: 'loop', d: 0.3, f: (p, t) => ({ box: { transform: `translateY(${-Math.abs(Math.sin(t * Math.PI * 2)) * 22}%)` } }) },
  'HOVER SCALE': { kind: 'loop', d: 0.5, f: (p, t, c) => { const on = (t % 1) > 0.35; return { box: { transform: `scale(${on ? 1.12 : 1})`, transition: 'none' }, fx: [box(lerp(80, 56, cl((t % 1) / 0.35)), lerp(80, 58, cl((t % 1) / 0.35)), 5, 5, { background: c.ink, clipPath: 'polygon(0 0,0 100%,30% 72%,52% 100%,62% 92%,42% 66%,80% 66%)', border: 'none' })] }; } },
  'SHINE': { kind: 'loop', d: 0.6, f: (p, t, c) => ({ shine: ((t * 0.9) % 1.2) - 0.1 }) },
  'RIPPLE': { kind: 'loop', d: 0.6, f: (p, t, c) => ({ under: [0, 1, 2].map((k) => { const q = ((t + k / 3) % 1); return box(50 - q * 50, 50 - q * 50 * 0.5625, q * 100, q * 100 * 0.5625, { border: `0.4vmin solid ${c.lime}`, borderRadius: '50%', opacity: 1 - q }); }) }) },
  'FLOATING': { kind: 'loop', d: 0.5, f: (p, t) => ({ box: { transform: `translateY(${Math.sin(t * 2.4) * 8}%) rotate(${Math.sin(t * 1.7) * 2}deg)` } }) },
  'SWING': { kind: 'loop', d: 0.5, f: (p, t) => ({ box: { transform: `rotate(${Math.sin(t * 4) * 12}deg)`, transformOrigin: '50% -60%' } }) },
  'BLINK': { kind: 'loop', d: 0.2, f: (p, t) => ({ box: { opacity: (t % 0.5) < 0.12 ? 0.08 : 1 } }) },
  'HEARTBEAT': { kind: 'loop', d: 0.3, f: (p, t) => { const x = t % 1; const s = 1 + 0.14 * Math.exp(-x * 18) + 0.1 * Math.exp(-Math.max(0, x - 0.22) * 18) * (x > 0.22 ? 1 : 0); return { box: { transform: `scale(${s})` } }; } },
  'GLITCH LOOP': { kind: 'loop', d: 0.2, f: (p, t, c) => { const g = (t % 0.5) < 0.1; const k = Math.floor(t * 30); return { box: { transform: g ? `translateX(${(rnd(k) - 0.5) * 16}%)` : 'none' }, twin: g ? { color: c.lime, transform: `translateX(${(rnd(k + 2) - 0.5) * 10}%)`, mixBlendMode: 'normal', opacity: 0.85, clipPath: `inset(${rnd(k + 4) * 60}% 0 ${rnd(k + 6) * 30}% 0)` } : { opacity: 0 } }; } },
  'SPIN': { kind: 'loop', d: 0.3, f: (p, t) => ({ box: { transform: `perspective(1200px) rotateY(${(t * 360) % 360}deg)` } }) },
  'GRADIENT SHIFT': { kind: 'loop', d: 0.3, f: (p, t, c) => ({ box: { backgroundImage: `linear-gradient(100deg, ${c.ink} 0%, ${c.lime} 30%, ${C.off} 50%, ${c.lime} 70%, ${c.ink} 100%)`, backgroundSize: '300% 100%', backgroundPosition: `${(t * 60) % 100}% 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } }) },
  'NEON GLOW': { kind: 'loop', d: 0.3, f: (p, t, c) => { const on = !(t > 0.15 && t < 0.25) && !(t > 0.4 && t < 0.45); return { box: { color: c.lime, textShadow: on ? `0 0 0.06em ${C.lime}, 0 0 0.18em ${C.lime}, 0 0 0.4em ${C.lime}` : 'none', opacity: on ? 1 : 0.35 } }; } },
  'WAVE': { kind: 'loop', d: 0.3, f: (p, t) => ({ ch: (i) => ({ transform: `translateY(${Math.sin(t * 7 - i * 0.7) * 18}%)` }) }) },
  'JELLO': { kind: 'loop', d: 0.3, f: (p, t) => { const x = t % 1; const a = Math.exp(-x * 4) * Math.sin(x * 30); return { box: { transform: `skewX(${a * 14}deg) scaleY(${1 - a * 0.06})` } }; } },
  'WOBBLE': { kind: 'loop', d: 0.3, f: (p, t) => { const x = t % 1; const a = Math.exp(-x * 3) * Math.sin(x * 18); return { box: { transform: `translateX(${a * 10}%) rotate(${a * 8}deg)`, transformOrigin: '50% 100%' } }; } },
  'RUBBER BAND': { kind: 'loop', d: 0.3, f: (p, t) => { const x = t % 1; const s = x < 0.3 ? lerp(1, 1.45, oc(x / 0.3)) : 1 + 0.45 * Math.exp(-(x - 0.3) * 8) * Math.cos((x - 0.3) * 30); return { box: { transform: `scaleX(${s}) scaleY(${2 - s})` } }; } },
  'SQUASH AND STRETCH': { kind: 'loop', d: 0.3, f: (p, t) => { const x = t % 1; const y = -Math.abs(Math.sin(x * Math.PI)) * 28; const hit = x < 0.1 || x > 0.9; return { box: { transform: `translateY(${y}%) scale(${hit ? 1.25 : 0.88}, ${hit ? 0.72 : 1.14})`, transformOrigin: '50% 100%' } }; } },
  'BREATHING': { kind: 'loop', d: 0.3, f: (p, t) => ({ box: { transform: `scale(${1 + Math.sin(t * 2.6 - 1.57) * 0.06 + 0.06})`, opacity: 0.8 + Math.sin(t * 2.6) * 0.2 } }) },
  'ORBIT': { kind: 'loop', d: 0.3, f: (p, t) => ({ ch: (i, n) => { const a = t * 2.2 + (i / n) * Math.PI * 2; return { transform: `translate(${Math.cos(a) * 30 - (i - (n - 1) / 2) * 0}%, ${Math.sin(a) * 120}%)` }; } }) },
  'MARQUEE': { kind: 'loop', d: 0.3, f: (p, t, c) => ({ box: { transform: `translateX(${80 - ((t * 70) % 180)}%)`, whiteSpace: 'nowrap' }, under: [box(-5, 36, 110, 28, { background: c.lime })], marquee: true }) },

  // ───────── 場面転換(Verse 2)─────────
  'PAPER TEAR': { kind: 'tr', d: 0.6, f: (p, t, c) => {
    const q = io(p); const z = 'polygon(0 0,100% 0,100% 46%,92% 52%,84% 45%,75% 53%,66% 46%,57% 54%,48% 47%,39% 55%,30% 46%,21% 54%,12% 46%,4% 53%,0 47%)';
    const z2 = 'polygon(0 47%,4% 53%,12% 46%,21% 54%,30% 46%,39% 55%,48% 47%,57% 54%,66% 46%,75% 53%,84% 45%,92% 52%,100% 46%,100% 100%,0 100%)';
    return { cover: [box(0, lerp(0, -60, q), 100, 100, { background: c.paperAlt, clipPath: z }), box(0, lerp(0, 60, q), 100, 100, { background: c.paperAlt, clipPath: z2 })], box: { opacity: cl(p * 2) } };
  } },
  'FILM ROLL': { kind: 'tr', d: 0.7, f: (p, t, c) => ({
    box: { transform: `translateY(${lerp(-110, 0, oc(p))}%)` },
    under: [box(14, -20, 72, 140, { background: c.ink, transform: `translateY(${lerp(-30, 0, oc(p))}%)` }),
      ...Array.from({ length: 9 }, (_, k) => box(16, -18 + k * 16 + lerp(-30, 0, oc(p)) * 1.4, 3, 6, { background: c.paper })),
      ...Array.from({ length: 9 }, (_, k) => box(81, -18 + k * 16 + lerp(-30, 0, oc(p)) * 1.4, 3, 6, { background: c.paper }))],
    filmText: true,
  }) },
  'RGB SPLIT': { kind: 'tr', d: 0.5, f: (p, t) => { const s = (1 - oc(p)) * 8 + 1.2 * Math.abs(Math.sin(t * 6)); return { twin: { color: C.lime, transform: `translate(${-s}%, ${s * 0.3}%)`, opacity: 0.95 }, box: { transform: `translate(${s * 0.4}%, 0)` } }; } },
  'MOSAIC': { kind: 'tr', d: 0.6, f: (p) => ({ pixel: lerp(0.22, 0, oc(p)), box: { filter: p < 1 ? `contrast(${lerp(6, 1, oc(p))})` : 'none' } }) },
  'PAGE TURN': { kind: 'tr', d: 0.7, f: (p, t, c) => ({ box: { opacity: p > 0.45 ? 1 : 0 }, cover: [box(0, 0, 100, 100, { background: c.paperAlt, transformOrigin: '0% 50%', transform: `perspective(1400px) rotateY(${lerp(0, -100, io(p))}deg)`, boxShadow: `inset -2vmin 0 0 ${c.lime}` })] }) },
  'SHATTER': { kind: 'tr', d: 0.7, f: (p, t, c) => {
    const pieces = [[0, 0, 40, 30], [40, 0, 30, 45], [70, 0, 30, 35], [0, 30, 30, 40], [30, 45, 40, 25], [70, 35, 30, 35], [0, 70, 45, 30], [45, 70, 25, 30], [70, 70, 30, 30]];
    return { box: { opacity: p > 0.2 ? 1 : 0 }, cover: pieces.map(([x, y, w, h], k) => box(x, y + lerp(0, 140, ic(p)) * (0.6 + rnd(k) * 0.6), w, h, { background: c.paperAlt, border: `0.3vmin solid ${c.ink}`, transform: `rotate(${lerp(0, (rnd(k + 3) - 0.5) * 120, ic(p))}deg)`, opacity: p > 0 ? 1 : 0 })) };
  } },
  'ACCORDION': { kind: 'tr', d: 0.6, f: (p) => ({ box: { transform: `perspective(900px) scaleY(${lerp(0.05, 1, oc(p))}) rotateX(${lerp(70, 0, oc(p))}deg)` }, slats: lerp(1, 0, oc(p)) }) },
  'LENS FLASH': { kind: 'tr', d: 0.6, f: (p, t, c) => ({ box: { opacity: p > 0.25 ? 1 : 0 }, fx: [box(0, 0, 100, 100, { background: C.off, opacity: p < 0.35 ? cl(p / 0.12) : 1 - cl((p - 0.35) / 0.4) }), box(lerp(-20, 90, oc(p)) - 15, 30, 30, 30 * 1.78, { borderRadius: '50%', background: `radial-gradient(circle, ${C.lime} 0%, ${C.lime} 20%, transparent 62%)`, opacity: 0.9 }), box(lerp(-20, 120, oc(p)) - 40, 48, 80, 0.8, { background: C.lime, opacity: 1 - p })] }) },
  'DISTORTION WAVE': { kind: 'tr', d: 0.8, f: (p, t) => ({ ch: (i) => ({ transform: `translateY(${Math.sin(t * 9 + i) * 26 * (1 - oc(p)) + Math.sin(t * 5 + i) * 4}%) skewX(${Math.sin(t * 7 + i * 1.3) * 22 * (1 - oc(p))}deg) scaleY(${1 + Math.sin(t * 6 + i) * 0.25 * (1 - oc(p))})` }) }) },
  '3D CUBE': { kind: 'tr', d: 0.7, f: (p, t, c) => ({ box: { transform: `perspective(1600px) rotateY(${lerp(90, 0, io(p))}deg)`, transformOrigin: '0% 50%' }, prev: { transform: `perspective(1600px) rotateY(${lerp(0, -90, io(p))}deg)`, transformOrigin: '100% 50%' } }) },
  'SPLIT SLIDE': { kind: 'tr', d: 0.5, f: (p) => ({ box: { clipPath: 'inset(0 50% 0 0)', transform: `translateY(${lerp(-110, 0, oc(p))}%)` }, twin: { clipPath: 'inset(0 0 0 50%)', transform: `translateY(${lerp(110, 0, oc(p))}%)` } }) },
  'MATCH CUT': { kind: 'tr', d: 0.6, f: (p, t, c) => ({ box: { opacity: p > 0.5 ? 1 : 0 }, fx: p < 0.6 ? [box(50 - 9, 50 - 9 * 0.5625, 18, 18 * 0.5625, { borderRadius: '50%', background: c.lime, transform: `scale(${lerp(8, 1, oc(p / 0.6))})`, opacity: p < 0.5 ? 1 : 1 - (p - 0.5) * 10 })] : [] }) },
  'PROGRESS LINE': { kind: 'tr', d: 0.6, f: (p, t, c) => ({ box: { clipPath: `inset(-10% ${lerp(100, -5, oc(p))}% -10% -5%)` }, fx: [box(5, 64, 90, 1.2, { background: c.ink, opacity: 0.15 }), box(5, 64, 90 * oc(p), 1.2, { background: c.lime })] }) },
  'CIRCULAR PROGRESS': { kind: 'tr', d: 0.7, f: (p, t, c) => ({ box: { opacity: p > 0.6 ? 1 : cl(p * 0.6) }, under: [box(26, 50 - 48 * 0.5625 / 2 * 1.78 / 1.78, 48, 48 * 0.5625 * 1.78 / 1.78 * 1.778, { borderRadius: '50%', background: `conic-gradient(${C.lime} ${oc(p) * 360}deg, ${c.dim} 0deg)`, WebkitMask: 'radial-gradient(circle, transparent 60%, #000 61%)', mask: 'radial-gradient(circle, transparent 60%, #000 61%)' })] }) },
  '3D TILT': { kind: 'tr', d: 0.7, f: (p, t) => ({ box: { transform: `perspective(900px) rotateX(${lerp(55, 0, back(p, 1.4))}deg) rotateY(${Math.sin(t * 3) * 8}deg)` } }) },
  'MAGNET': { kind: 'tr', d: 0.7, f: (p) => ({ ch: (i, n) => { const q = back(stag(p, i, n, 0.3), 1.4); return { transform: `translate(${lerp((rnd(i + 1) - 0.5) * 900, 0, q)}%, ${lerp((rnd(i + 9) - 0.5) * 500, 0, q)}%) rotate(${lerp((rnd(i) - 0.5) * 180, 0, q)}deg)` }; } }) },
  'CLOCK WIPE': { kind: 'tr', d: 0.6, f: (p) => { const a = oc(p) * 360; return { box: { WebkitMask: `conic-gradient(#000 ${a}deg, transparent ${a}deg)`, mask: `conic-gradient(#000 ${a}deg, transparent ${a}deg)` } }; } },
  'VENETIAN BLINDS': { kind: 'tr', d: 0.6, f: (p) => ({ slats: 1 - oc(p), slatRotate: true }) },
  'KALEIDOSCOPE': { kind: 'tr', d: 0.8, f: (p, t) => ({ kaleido: { spin: t * 40, open: oc(p) }, box: { opacity: p > 0.7 ? cl((p - 0.7) / 0.3) : 0 } }) },
  'ZOOM BLUR': { kind: 'tr', d: 0.5, f: (p) => ({ box: { transform: `scale(${lerp(3, 1, oc(p))})`, filter: p < 1 ? `blur(${lerp(10, 0, oc(p))}px)` : 'none' }, echoes: p < 1 ? [1.15, 1.32, 1.5, 1.7].map((s, k) => ({ transform: `scale(${lerp(s * 2, s, oc(p))})`, opacity: (1 - oc(p)) * (0.4 - k * 0.08) })) : [] }) },
  'LIGHT LEAK': { kind: 'tr', d: 0.8, f: (p, t, c) => ({ box: { opacity: cl((p - 0.3) / 0.5) }, fx: [box(-30, -20, 90, 90, { borderRadius: '50%', background: `radial-gradient(circle, ${C.off} 0%, ${C.off} 25%, transparent 70%)`, opacity: Math.sin(cl(p) * Math.PI) * 0.95 + 0.05 }), box(55, 50, 70, 70, { borderRadius: '50%', background: `radial-gradient(circle, ${C.lime} 0%, transparent 65%)`, opacity: Math.sin(cl(p) * Math.PI) * 0.7 })] }) },
  'DOMINO': { kind: 'tr', d: 0.8, f: (p) => ({ ch: (i, n) => { const q = stag(p, i, n, 0.7); return { transform: `rotate(${lerp(-90, 0, bounce(q))}deg)`, transformOrigin: '100% 100%', opacity: q > 0 ? 1 : 0 }; } }) },

  // ───────── おわりの動き(Outro)─────────
  'BUBBLE POP': { kind: 'in', d: 0.7, f: (p, t, c) => ({
    box: { transform: `scale(${p < 0.55 ? 0 : back((p - 0.55) / 0.45, 2.4)})` },
    under: Array.from({ length: 8 }, (_, k) => { const a = k / 8 * Math.PI * 2; const r = lerp(30, 6, oc(cl(p / 0.55))); const s = 7 + rnd(k) * 5; return box(50 + Math.cos(a) * r - s / 2, 50 + Math.sin(a) * r * 0.56 - s * 0.28, s, s * 0.5625, { borderRadius: '50%', border: `0.35vmin solid ${c.ink}`, transform: `scale(${p > 0.55 ? 1 + (p - 0.55) * 6 : 1})`, opacity: p > 0.55 ? 1 - (p - 0.55) / 0.3 : 1 }); }),
  }) },
  'SMOKE DIFFUSION': { kind: 'out', d: 0.9, f: (p) => ({ ch: (i, n) => ({ transform: `translate(${(rnd(i) - 0.5) * 80 * oc(p)}%, ${-oc(p) * (60 + rnd(i + 4) * 80)}%) scale(${1 + oc(p) * 0.6})`, filter: `blur(${oc(p) * 18}px)`, opacity: 1 - oc(p) * 0.95 }) }) },
  'TOOLTIP POP': { kind: 'in', d: 0.45, f: (p, t, c) => ({ box: { transform: `translateY(${lerp(20, 0, back(p, 2.2))}%) scale(${p <= 0 ? 0 : back(p, 2.2)})`, transformOrigin: '50% 100%' }, under: [box(4, 26, 92, 46, { background: c.lime, borderRadius: '3vmin', transform: `scale(${p <= 0 ? 0 : back(p, 2.2)})`, transformOrigin: '50% 100%' }), box(46, 71, 8, 8, { background: c.lime, clipPath: 'polygon(0 0,100% 0,50% 100%)', transform: `scale(${p <= 0 ? 0 : back(p, 2.2)})` })], onLime: true }) },
  'PARTICLE BURST': { kind: 'out', d: 0.7, f: (p, t, c) => ({
    box: { opacity: p < 0.15 ? 1 : 0, transform: `scale(${1 + p * 0.3})` },
    fx: Array.from({ length: 26 }, (_, k) => { const a = rnd(k) * Math.PI * 2; const r = oc(p) * (30 + rnd(k + 3) * 40); const s = 1 + rnd(k + 7) * 1.6; return box(50 + Math.cos(a) * r - s / 2, 50 + Math.sin(a) * r * 0.9 - s / 2, s, s * 0.5625, { background: k % 3 ? c.ink : C.lime, borderRadius: '50%', opacity: p > 0 ? 1 - ic(p) : 0 }); }),
  }) },
  'CONFETTI': { kind: 'in', d: 1, f: (p, t, c) => ({
    box: { opacity: cl(p * 3), transform: `translateY(${lerp(-20, 0, oc(p))}%)` },
    fx: Array.from({ length: 30 }, (_, k) => { const x = rnd(k) * 100; const y = lerp(-10, 110, cl(t * (0.45 + rnd(k + 2) * 0.4) - rnd(k + 5) * 0.3)); return box(x, y, 1.6, 1.6 * 0.5625 * 1.8, { background: k % 2 ? C.lime : c.ink, transform: `rotate(${t * 300 * (rnd(k + 1) - 0.5)}deg)` }); }),
  }) },
  'REWIND': { kind: 'tr', d: 0.8, f: (p, t, c) => ({ ch: (i, n) => { const q = stag(1 - p, n - 1 - i, n, 0.6); return { transform: `translateX(${lerp(0, 300, oc(q))}%)`, opacity: 1 - q }; }, fx: p < 1 ? Array.from({ length: 6 }, (_, k) => box(0, rnd(k + Math.floor(t * 20)) * 100, 100, 0.6, { background: c.ink, opacity: 0.25 })) : [] }) },
};

// 技名ではない語(動画だけで使う)
export const EXTRA = {
  'THREE': { kind: 'in', d: 0.25, f: (p) => ({ box: { transform: `scale(${lerp(1.6, 1, oc(p))})`, opacity: cl(p * 3) } }) },
  'TWO': { kind: 'in', d: 0.25, f: (p) => ({ box: { transform: `scale(${lerp(1.6, 1, oc(p))})`, opacity: cl(p * 3) } }) },
  'ONE': { kind: 'in', d: 0.25, f: (p) => ({ box: { transform: `scale(${lerp(1.6, 1, oc(p))})`, opacity: cl(p * 3) } }) },
  'ANIMATION OVERDRIVE!': { kind: 'loop', d: 0.2, f: (p, t) => ({ box: { transform: `scale(${1 + 0.06 * Math.exp(-((t % 0.5) * 9))}) translateX(${Math.floor(t * 2) % 2 ? 2 : -2}%)` } }) },
  'SYNC AND LIVE!': { kind: 'loop', d: 0.2, f: (p, t) => ({ box: { transform: `scale(${1 + 0.1 * Math.exp(-((t % 0.5) * 9))})` } }) },
  'SHUTDOWN.': { kind: 'out', d: 0.6, f: (p) => ({ box: { transform: `scaleY(${lerp(1, 0.01, ic(p))}) scaleX(${p > 0.8 ? lerp(1, 0, (p - 0.8) / 0.2) : 1})` } }) },
};

export const ease = { oc, ic, io, back, elastic, bounce, cl, lerp, rnd };
