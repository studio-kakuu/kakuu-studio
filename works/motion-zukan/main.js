// MOTION 100 モーション図鑑 — 名前を押すと、その技の動きで名前が動く
// 動きの中身は MV と共用の motions.js(進み p と経過秒 t からスタイルを返す関数)。ここでは GSAP で p と t を進めて、DOM に当てるだけ
import { M, C } from './motions.js';
import { GROUPS, ITEMS } from './data.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DARK = new Set(['out', 'tr1', 'loop']);           // MV で黒い地だったグループ
const pad = (n) => String(n).padStart(3, '0');
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const set = (node, st) => { node.removeAttribute('style'); if (st) Object.assign(node.style, st); };

const splitLines = (w) => {
  const ws = w.split(' ');
  if (w.length <= 9 || ws.length === 1) return [w];
  if (ws.length === 2) return ws;
  if (ws.length === 3 && w.length > 14) return ws;
  const mid = Math.ceil(ws.length / 2);
  return [ws.slice(0, mid).join(' '), ws.slice(mid).join(' ')];
};
const accentIndex = (w) => { const idx = [...w].map((c, i) => (/[A-Z0-9]/.test(c) ? i : -1)).filter((i) => i >= 0); return idx[Math.floor(idx.length / 2)] ?? -1; };

// 1枚の見本(ステージ)。MV の描き方と同じ部品を DOM で持つ
class Specimen {
  constructor(stage, word, { dark = false, art = null, prev = null } = {}) {
    this.stage = stage; this.word = word; this.prevWord = prev; this.dark = dark;
    this.ctx = { n: word.length, ink: dark ? C.off : C.black, paper: dark ? C.black : C.off, lime: C.lime, paperAlt: dark ? C.off : C.black, dim: dark ? 'rgba(242,240,233,.16)' : 'rgba(14,14,14,.12)' };
    const L = (cls) => stage.appendChild(el('div', `layer ${cls}`));
    this.artBox = art ? stage.appendChild(el('div', 'art')) : null;
    if (art) { const im = el('img'); im.src = art; im.alt = ''; im.loading = 'lazy'; this.artBox.appendChild(im); }
    this.under = L('under');
    this.kal = L('kal');
    this.center = L('center');
    this.fx = L('fx');
    this.text = null; this.build(word);
  }
  build(text) {
    this.center.textContent = '';
    this.lines = splitLines(text);
    const max = Math.max(...this.lines.map((l) => l.length));
    this.size = Math.min(word2(text), 92 / (max * 0.47), 50 / (this.lines.length * 0.93));
    const mk = (cls) => { const w = this.center.appendChild(el('div', `word ${cls}`)); w.style.fontSize = `${this.size}cqw`; return w; };
    this.prevEl = mk('prev'); this.echoBox = this.center.appendChild(el('div', 'echoes'));
    this.twinEl = mk('twin'); this.ghostEl = mk('ghost'); this.main = mk('main'); this.shineEl = mk('shine');
    this.pixEl = this.center.appendChild(el('div', 'pix')); this.slatEl = this.center.appendChild(el('div', 'slats'));
    const ai = accentIndex(this.word);
    this.spans = [];
    for (const w of [this.twinEl, this.ghostEl, this.main, this.shineEl]) {
      const arr = []; let pos = 0;
      for (const l of this.lines) {
        const line = w.appendChild(el('div'));
        const start = text.indexOf(l, pos); pos = start + l.length;
        [...l].forEach((ch, k) => { const s = line.appendChild(el('span', '', ch)); s.dataset.acc = String(start + k === ai && text === this.word); arr.push(s); });
      }
      if (w === this.main) this.spans = arr; else w._spans = arr;
    }
    if (this.prevWord) { for (const l of splitLines(this.prevWord)) this.prevEl.appendChild(el('div', '', l)); this.prevEl.style.fontSize = `${Math.min(word2(this.prevWord), 92 / (Math.max(...splitLines(this.prevWord).map((l) => l.length)) * 0.47))}cqw`; }
    this.text = text;
  }
  render(mo, p, t) {
    const r = mo.f(p, t, this.ctx, this.word) || {};
    const text = r.text ?? (r.marquee ? `${this.word}  ${this.word}` : this.word);
    if (text !== this.text) this.build(text);
    const base = { fontSize: `${this.size}cqw`, color: r.filmText ? C.off : r.onLime && this.dark ? C.black : this.ctx.ink };
    set(this.main, { ...base, ...r.box });
    this.main.querySelectorAll('span').forEach((s, i) => {
      const st = r.ch ? r.ch(i, this.spans.length) : null;
      set(s, st);
      if (s.dataset.acc === 'true' && !r.box?.WebkitBackgroundClip) s.style.color = C.lime;
    });
    set(this.twinEl, r.twin ? { ...base, ...r.box, ...r.twin } : { display: 'none' });
    set(this.ghostEl, r.ghost ? { ...base, ...r.ghost } : { display: 'none' });
    set(this.prevEl, r.prev && this.prevWord ? { fontSize: this.prevEl.style.fontSize, color: this.ctx.ink, ...r.prev } : { display: 'none' });
    if (r.prev && this.prevWord) this.prevEl.style.fontSize = `${Math.min(this.size, 18)}cqw`;
    set(this.shineEl, typeof r.shine === 'number' ? { ...base, backgroundImage: `linear-gradient(105deg, transparent ${r.shine * 100 - 8}%, ${C.off} ${r.shine * 100}%, transparent ${r.shine * 100 + 8}%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { display: 'none' });
    this.echoBox.textContent = '';
    (r.echoes || []).forEach((e) => { const d = this.echoBox.appendChild(el('div', 'word', this.word)); set(d, { ...base, ...e }); });
    const boxes = (host, arr) => { host.textContent = ''; (arr || []).forEach((st) => { const d = host.appendChild(el('i')); set(d, st); }); };
    boxes(this.under, r.under);
    boxes(this.fx, [...(r.fx || []), ...(r.cover || [])]);
    // モザイク:荒い四角を重ねる
    this.pixEl.textContent = '';
    if (r.pixel) {
      const s = Math.max(4, r.pixel * 55);
      for (let y = 0; y < 100; y += s * 1.6) for (let x = 0; x < 100; x += s) {
        const v = Math.abs(Math.sin(x * 12.9 + y * 78.2) * 43758.5) % 1;
        if (v < r.pixel * 3.2) { const d = this.pixEl.appendChild(el('i')); set(d, { left: `${x}%`, top: `${y}%`, width: `${s}%`, height: `${s * 1.6}%`, background: v < r.pixel * 1.6 ? this.ctx.ink : this.ctx.paper }); }
      }
    }
    this.slatEl.textContent = '';
    if (r.slats > 0.001) for (let k = 0; k < 8; k++) { const d = this.slatEl.appendChild(el('i')); set(d, { top: `${k * 12.5}%`, height: '12.6%', left: 0, right: 0, background: this.ctx.paper, transformOrigin: '50% 0%', transform: r.slatRotate ? `perspective(800px) rotateX(${-90 * (1 - r.slats)}deg)` : `scaleY(${r.slats})` }); }
    this.kal.textContent = '';
    if (r.kaleido) for (let k = 0; k < 6; k++) { const d = this.kal.appendChild(el('i', 'wedge')); set(d, { rotate: `${k * 60 + r.kaleido.spin}deg`, opacity: r.kaleido.open, scale: String(0.4 + 0.6 * r.kaleido.open), background: k % 2 ? C.lime : this.ctx.paper }); }
    if (this.artBox) set(this.artBox, r.art || null);
  }
}
const word2 = (w) => (w.length <= 4 ? 30 : 24);

// 再生(GSAP で p と t を進める)
const running = new WeakMap();
function play(spec, name, onEnd) {
  const mo = M[name];
  const prev = running.get(spec); if (prev) prev.kill();
  const st = { p: mo.kind === 'out' ? 0 : 0, t: 0 };
  const draw = () => spec.render(mo, st.p, st.t);
  const tl = gsap.timeline({ onUpdate: draw, onComplete: () => { running.delete(spec); onEnd?.(); } });
  if (reduce) {
    gsap.set(st, { p: mo.kind === 'out' ? 0 : 1, t: 0 }); draw();
    tl.fromTo(spec.center, { opacity: 0.2 }, { opacity: 1, duration: 0.3 });
  } else if (mo.kind === 'loop') {
    st.p = 1; tl.to(st, { t: 2.6, duration: 2.6, ease: 'none' }).set(st, { t: 0 });
  } else if (mo.kind === 'out') {
    tl.to(st, { t: 0.35, duration: 0.35, ease: 'none' })
      .to(st, { p: 1, t: 0.35 + mo.d, duration: mo.d, ease: 'none' })
      .to(st, { t: '+=0.5', duration: 0.5 })
      .set(st, { p: 0, t: 0 });
  } else {
    st.p = 0; draw();
    tl.to(st, { p: 1, t: Math.max(mo.d, 0.6), duration: Math.max(mo.d, 0.6) * (mo.d < 0.5 ? 1.25 : 1), ease: 'none' });
  }
  running.set(spec, tl);
}
const rest = (spec, name) => { const mo = M[name]; spec.render(mo, mo.kind === 'out' ? 0 : 1, 0); };

// ── 一覧を作る ──
const nav = document.getElementById('groups');
const list = document.getElementById('list');
const specs = [];
for (const g of GROUPS) {
  const items = ITEMS.filter((it) => it.g === g.id);
  const a = nav.appendChild(el('a', 'g', null)); a.href = `#g-${g.id}`;
  a.append(el('span', 'g-jp', g.jp), el('span', 'g-n', `${items.length}`));
  const sec = list.appendChild(el('section', `group ${DARK.has(g.id) ? 'dark' : ''} ${g.id === 'tr2' ? 'disco' : ''}`));
  sec.id = `g-${g.id}`;
  const h = sec.appendChild(el('h2'));
  h.append(el('span', 'h-jp', g.jp), el('span', 'h-en', g.en.toLowerCase()), el('span', 'h-range', `${pad(items[0].no)}–${pad(items[items.length - 1].no)}`));
  const grid = sec.appendChild(el('div', 'grid'));
  items.forEach((it) => {
    const card = grid.appendChild(el('article', 'card'));
    const stage = card.appendChild(el('button', 'stage'));
    stage.type = 'button';
    stage.setAttribute('aria-label', `${it.en}(${it.jp})の動きを見る`);
    stage.appendChild(el('span', 'no', pad(it.no)));
    const prevItem = ITEMS[it.no - 2];
    const spec = new Specimen(stage, it.en, { dark: DARK.has(g.id), art: it.pic ? `img/p${String(it.pic).padStart(2, '0')}.png` : null, prev: prevItem ? prevItem.en : 'MOTION' });
    stage.appendChild(el('span', 'tap', '押すと動く'));
    const meta = card.appendChild(el('div', 'meta'));
    meta.append(el('h3', 'jp', it.jp), el('p', 'desc', it.desc));
    rest(spec, it.en);
    stage.addEventListener('click', () => { card.classList.add('played'); play(spec, it.en, () => rest(spec, it.en)); });
    specs.push({ spec, it, card });
  });
}

// ── 冒頭:「MOTION 100」が1回だけ、いくつかの動きで出てくる ──
const heroStage = document.getElementById('heroStage');
const hero = new Specimen(heroStage, 'MOTION 100', {});
const heroSeq = ['STAGGER IN', 'GLITCH LOOP', 'WAVE', 'MAGNET'];
let hi = 0;
const heroNext = () => { const name = heroSeq[hi % heroSeq.length]; hi++; play(hero, name, () => rest(hero, 'STAGGER IN')); };
rest(hero, 'STAGGER IN');
if (!reduce) setTimeout(heroNext, 300);
heroStage.parentElement.addEventListener('click', heroNext);
