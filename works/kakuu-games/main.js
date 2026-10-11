// KAKUU GAMES ピクトグラム図鑑 — 動画と同じ骨組み(picto.js)で、20競技の決めの動きを描く
import { C, SIGS, sigPrims, primsToSVG } from './picto.js';

const BEAT = 60 / 130; // テーマ曲と同じ 130BPM
const S = 300;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const THEMES = { ink: { bg: C.ink, fg: C.off }, off: { bg: C.off, fg: C.ink }, lime: { bg: C.lime, fg: C.ink } };
let theme = 'ink';
const REST = 2.05; // 止まっている時は、解放の瞬間の形

const svgFor = (sig, b, w = 400, h = 500, bgRect = false) => {
  const { bg, fg } = THEMES[theme];
  const body = primsToSVG(sigPrims(sig, b, S, fg, bg));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -430 400 500" width="${w}" height="${h}">${bgRect ? `<rect x="-200" y="-430" width="400" height="500" fill="${bg}"/>` : ''}<line x1="-180" y1="0" x2="180" y2="0" stroke="${fg}" stroke-width="3" opacity=".25"/>${body}</svg>`;
};

// ── 20競技のカード ──
const list = document.getElementById('list');
const cards = SIGS.map((sig, i) => {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <button type="button" class="stage" aria-label="${sig.jp}の動きを見る"><span class="no">${String(i + 1).padStart(2, '0')}</span><span class="fig"></span></button>
    <div class="meta">
      <span class="en">${sig.en}</span>
      <p class="jp">${sig.jp}</p>
      <div class="save"><button type="button" data-f="svg" aria-label="${sig.jp}を SVG で保存">SVG保存</button><button type="button" data-f="png" aria-label="${sig.jp}を PNG で保存">PNG保存</button></div>
    </div>`;
  list.appendChild(card);
  const fig = card.querySelector('.fig');
  const draw = (b) => { fig.innerHTML = svgFor(sig, Math.max(0, b)); };
  draw(REST);
  let raf = 0;
  card.querySelector('.stage').addEventListener('click', () => {
    cancelAnimationFrame(raf);
    if (reduce) { draw(REST); return; }
    const t0 = performance.now();
    const step = (now) => {
      const b = (now - t0) / 1000 / BEAT;
      if (b >= 4) { draw(REST); return; }
      draw(b); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
  card.querySelectorAll('.save button').forEach((btn) => btn.addEventListener('click', () => save(sig, i, btn.dataset.f)));
  return { draw };
});

// ── 保存(決めのポーズ・地の色つき)──
function save(sig, i, f) {
  const name = `kakuu-games_${String(i + 1).padStart(2, '0')}_${sig.id}_${theme}`;
  const svg = svgFor(sig, REST, 1200, 1500, true);
  if (f === 'svg') return download(new Blob([svg], { type: 'image/svg+xml' }), `${name}.svg`);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 1500;
    cv.getContext('2d').drawImage(img, 0, 0, 1200, 1500);
    cv.toBlob((b) => b && download(b, `${name}.png`), 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── 地の色 ──
document.querySelectorAll('.sw').forEach((b) => b.addEventListener('click', () => {
  theme = b.dataset.t;
  document.body.dataset.theme = theme;
  document.querySelectorAll('.sw').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  cards.forEach((c) => c.draw(REST));
  drawHero(heroB);
}));

// ── 冒頭:1小節ごとに競技が入れ替わる ──
const hero = document.getElementById('heroFig');
const heroNow = document.getElementById('heroNow');
let heroB = REST;
const drawHero = (b) => {
  const k = Math.floor(b / 4) % SIGS.length, sig = SIGS[k];
  const { bg, fg } = THEMES[theme];
  hero.innerHTML = `<line x1="-280" y1="0" x2="280" y2="0" stroke="${fg}" stroke-width="5" opacity=".3"/>${primsToSVG(sigPrims(sig, b % 4, 520, fg, bg))}`;
  heroNow.textContent = `${String(k + 1).padStart(2, '0')} ${sig.en}`;
};
if (reduce) drawHero(REST);
else {
  const t0 = performance.now();
  const loop = (now) => { heroB = Math.max(0, (now - t0) / 1000 / BEAT); drawHero(heroB); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
