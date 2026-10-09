/* くものこ もこ — さわれる えほん(GSAP + SplitText + DrawSVG)
   タップ/クリック/→キー/左スワイプで ページを めくる。
   ?demo=1     最初から最後まで自動再生(撮影用)
   ?demo=touch 1ページ目でタップしてめくる様子だけ(撮影用)
   ?page=N     N ページ目から始める      ?style=line|flat  線だけ/色だけ(動きなし)の見比べ用 */
(() => {
  if (!window.gsap) return;
  gsap.registerPlugin(SplitText, DrawSVGPlugin);
  const q = new URLSearchParams(location.search);
  const demo = q.get('demo');
  const style = q.get('style');
  const startPage = Math.max(0, Number(q.get('page') || (q.get('demo') === 'touch' ? 1 : 0)));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (style) document.body.classList.add(`style-${style}`);
  if (demo) document.body.classList.add('demo');

  const $ = (id) => document.getElementById(id);
  const sfx = (type) => { (window.__sfx ||= []).push({ type, t: performance.now() }); };
  const C = { ink: '#6A564C', gold: '#F6C65B', pink: '#F6A6BA', wilt: '#E3C9CC' };

  const book = $('book'), world = $('world'), sky = $('sky');
  const moko = $('mokoWrap'), mokoSvg = $('moko'), flower = $('flower'), head = $('head');
  const petals = gsap.utils.toArray('#petals ellipse');
  const textEl = $('text'), burstEl = $('burst'), titleEl = $('title'), ending = $('ending');
  const wordsEl = $('words'), floodEl = $('flood'), tapsEl = $('taps'), dotsEl = $('dots');

  // 決まった乱数(撮影のたびに同じ絵になるように)
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------- 雨粒 ----------
  const drops = $('drops');
  for (let i = 0; i < 26; i++) {
    const x = 24 + rand() * 152, y = rand() * 260, len = 14 + rand() * 12;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} l-3 ${len.toFixed(1)}`);
    drops.appendChild(p);
  }

  // ---------- 光の粒・花びら(前景) ----------
  const cv = $('motes'), ctx = cv.getContext('2d');
  const motes = { density: 0.6, petals: 0, speed: 1 };
  let W = 0, H = 0;
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  resize(); addEventListener('resize', resize);
  const parts = Array.from({ length: 70 }, (_, i) => ({ x: rand(), y: rand(), r: 2 + rand() * 4, s: 0.2 + rand() * 0.6, ph: rand() * 6.28, c: i % 3 === 0 ? C.pink : C.gold, petal: i % 4 === 0 }));
  gsap.ticker.add((time) => {
    ctx.clearRect(0, 0, W, H);
    if (reduce) return;
    const n = Math.round(parts.length * Math.min(1, motes.density));
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      const y = ((p.y - time * 0.018 * p.s * motes.speed) % 1 + 1) % 1;
      const x = p.x + Math.sin(time * 0.6 + p.ph) * 0.02;
      if (motes.petals && p.petal) {
        ctx.save(); ctx.translate(x * W, (1 - y) * H); ctx.rotate(time + p.ph);
        ctx.globalAlpha = 0.85 * motes.petals; ctx.fillStyle = C.pink;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r * 2.2, p.r * 1.2, 0, 0, 6.283); ctx.fill(); ctx.restore();
        continue;
      }
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + p.ph * 3);
      const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, p.r * 3);
      g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.35 + 0.5 * tw; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x * W, y * H, p.r * 3, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  // ---------- 背景いっぱいの擬音 ----------
  let wordsTl = null;
  const showWords = (list) => {
    wordsTl?.kill(); wordsEl.innerHTML = '';
    if (!list) return;
    const spots = [[8, 12], [56, 8], [22, 38], [68, 34], [4, 62], [52, 60], [30, 84], [74, 82]];
    const spans = spots.map(([x, y], i) => {
      const s = document.createElement('span');
      s.textContent = list[i % list.length];
      s.style.left = `${x}%`; s.style.top = `${y}%`;
      wordsEl.appendChild(s); return s;
    });
    wordsTl = gsap.timeline({ repeat: -1 });
    spans.forEach((s, i) => {
      wordsTl.fromTo(s, { opacity: 0, scale: 0.6, rotation: (i % 2 ? -1 : 1) * 10 }, { opacity: 0.6, scale: 1, rotation: 0, duration: 0.9, ease: 'power2.out' }, i * 0.35)
        .to(s, { opacity: 0, scale: 1.5, rotation: (i % 2 ? 1 : -1) * 14, duration: 1.4, ease: 'power1.in' }, i * 0.35 + 1.1);
    });
  };

  // ---------- 文章:1文字ずつ、インクがにじむように ----------
  let split = null;
  const say = (text, at = 0.25) => {
    split?.revert();
    textEl.innerHTML = text.split('\n').map((l) => `<span class="ln">${l}</span>`).join('');
    split = SplitText.create(textEl, { type: 'chars', charsClass: 'ch', tag: 'span' });
    const tl = gsap.timeline();
    tl.to(textEl, { opacity: 1, duration: 0.3 }, at)
      .from(split.chars, { opacity: 0, y: 6, filter: 'blur(7px)', color: C.gold, duration: 0.7, stagger: 0.055, ease: 'power2.out' }, at + 0.1);
    return tl;
  };
  const hideText = () => gsap.to(textEl, { opacity: 0, duration: 0.3 });

  // ---------- 場面転換:光の粒があふれて画面を覆い、引くと次の場面 ----------
  const blobs = Array.from({ length: 28 }, (_, i) => {
    const b = document.createElement('i');
    const size = 38 + rand() * 46;
    b.style.width = b.style.height = `${size}vmax`;
    b.style.left = `${rand() * 100 - size / 2}vw`; b.style.top = `${rand() * 100 - size / 2}vh`;
    floodEl.appendChild(b); return b;
  });
  const flood = (onMid) => {
    sfx('sparkle');
    const tl = gsap.timeline();
    tl.set(blobs, { opacity: 1 })
      .fromTo(blobs, { scale: 0 }, { scale: 1, duration: 0.5, ease: 'power2.out', stagger: { each: 0.006, from: 'center' } })
      .call(onMid)
      .to(blobs, { opacity: 0, scale: 1.2, duration: 0.42, ease: 'power1.out', stagger: { each: 0.004, from: 'random' } }, '+=0.05');
    return tl;
  };

  // ---------- もこ:2〜3秒でふわふわ揺れる ----------
  gsap.to(mokoSvg, { y: -10, rotation: 2, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.sun .rays', { rotation: 360, duration: 40, repeat: -1, ease: 'none', svgOrigin: '100 100' });
  const rainLoop = gsap.fromTo('#drops path', { y: -40, opacity: 0 }, { y: 120, opacity: 1, duration: 0.7, stagger: { each: 0.05, repeat: -1 }, ease: 'none', paused: true });

  // ---------- 各ページの状態 ----------
  const skyTo = (s1, s2, s3, d = 1.2) => gsap.to(sky, { '--s1': s1, '--s2': s2, '--s3': s3, duration: d });
  gsap.set(sky, { '--s1': '#8ED0EA', '--s2': '#BFE5F4', '--s3': '#FFF6E6' });
  sky.style.background = 'linear-gradient(180deg, var(--s1) 0%, var(--s2) 45%, var(--s3) 82%)';

  const resetWorld = () => {
    gsap.killTweensOf([world, '#far', '#hills', '#field', moko, flower, head, petals, '#dry', '#buds g', '#rain', '#sun', '#rainbow', '.rb', '#mokoBrows', '#mokoEyes', '#mokoMouth']);
    gsap.set(world, { scale: 1, x: 0, y: 0 });
    gsap.set(['#far', '#hills', '#field'], { xPercent: 0 });
    gsap.set(moko, { x: 0, y: 0, scale: 1, opacity: 1 });
    gsap.set('#mokoBrows', { opacity: 0 }); gsap.set('#mokoEyes', { y: 0 });
    gsap.set('#mokoMouth', { attr: { d: 'M95 96 q7 6 14 0' } });
    gsap.set('#rain', { opacity: 0 }); rainLoop.pause(); gsap.set(mokoSvg, { scaleX: 1, scaleY: 1 });
    gsap.set('#sun', { opacity: 0, scale: 0.6 });
    gsap.set('#rainbow', { opacity: 0 });
    gsap.set('#dry', { opacity: 0 });
    gsap.set('#buds g', { scale: 1, transformOrigin: '50% 50%' });
    gsap.set(flower, { opacity: 0 });
    gsap.set(head, { rotation: 0, svgOrigin: '80 128' });
    gsap.set(petals, { fill: C.pink });
    gsap.set('.eye-sad', { opacity: 1 }); gsap.set(['.eye-happy', '.mouth-happy'], { opacity: 0 });
    gsap.set([burstEl, titleEl], { opacity: 0 }); burstEl.innerHTML = '';
    gsap.set(ending, { autoAlpha: 0 });
    motes.density = 0.6; motes.petals = 0; motes.speed = 1;
  };

  const zoomTo = (el, scale, d) => {
    const w = world.getBoundingClientRect(), r = el.getBoundingClientRect();
    gsap.set(world, { transformOrigin: `${r.left - w.left + r.width / 2}px ${r.top - w.top + r.height / 2}px` });
    return gsap.to(world, { scale, duration: d, ease: 'power3.inOut' });
  };

  const PAGES = [
    { // 0 タイトル
      words: null,
      enter() {
        gsap.set(titleEl, { opacity: 1 });
        const sp = SplitText.create(titleEl.querySelectorAll('span'), { type: 'chars', charsClass: 'ch', tag: 'span' });
        sfx('title');
        motes.density = 1;
        return gsap.timeline()
          .from(moko, { y: -60, opacity: 0, duration: 1.4, ease: 'power3.out' }, 0)
          .from(sp.chars, { opacity: 0, scale: 0.4, y: 20, filter: 'blur(10px)', duration: 0.9, stagger: 0.09, ease: 'back.out(1.8)' }, 0.3);
      },
    },
    { // 1 平穏
      words: ['ふわふわ', 'ぷかぷか', 'ふわふわ'],
      enter() {
        sfx('wind');
        return gsap.timeline()
          .fromTo(moko, { x: '-14vw' }, { x: '4vw', duration: 8, ease: 'sine.inOut' }, 0)
          .to('#far', { xPercent: -5, duration: 8, ease: 'none' }, 0)
          .to('#hills', { xPercent: -10, duration: 8, ease: 'none' }, 0)
          .to('#field', { xPercent: -16, duration: 8, ease: 'none' }, 0)
          .add(say('もこは、ちいさな くもの こ。\nきょうも そらを ふわふわ おさんぽ。'), 0.2);
      },
    },
    { // 2 気づき
      words: null,
      enter() {
        sfx('soft');
        gsap.set(flower, { opacity: 1 });
        gsap.set(head, { rotation: 112 }); gsap.set(petals, { fill: C.wilt });
        gsap.set('#dry', { opacity: 1 }); gsap.set('#buds g', { scale: 0 });
        gsap.set(['#far', '#hills', '#field'], { xPercent: (i) => [-5, -10, -16][i] });
        return gsap.timeline()
          .add(skyTo('#F3DFA8', '#F8ECC8', '#FFF6E6', 1.4), 0)
          .to('#sun', { opacity: 1, scale: 1, duration: 1.2, ease: 'back.out(1.6)' }, 0.1)
          .to('#mokoEyes', { y: 3, duration: 0.6 }, 0.6)
          .to(head, { rotation: 118, duration: 1.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.4)
          .add(zoomTo(flower, 1.12, 2.6), 0.3)
          .add(say('あれ? のはらが からから。\nおはなが、げんきが ない。'), 0.3);
      },
    },
    { // 3 展開:文字が一気に広がる
      words: null,
      enter() {
        hideText();
        gsap.set(flower, { opacity: 1 }); gsap.set(head, { rotation: 112 }); gsap.set(petals, { fill: C.wilt });
        gsap.set('#dry', { opacity: 1 }); gsap.set('#buds g', { scale: 0 }); gsap.set('#sun', { opacity: 1, scale: 1 });
        gsap.set(sky, { '--s1': '#F3DFA8', '--s2': '#F8ECC8', '--s3': '#FFF6E6' });
        gsap.set(['#far', '#hills', '#field'], { xPercent: (i) => [-5, -10, -16][i] });
        burstEl.innerHTML = '<p>ぼくが、<br>あめに なる!</p>';
        const sp = SplitText.create(burstEl.querySelector('p'), { type: 'chars', charsClass: 'ch', tag: 'span' });
        gsap.set(burstEl, { opacity: 1 });
        return gsap.timeline()
          .to('#mokoBrows', { opacity: 1, duration: 0.2 }, 0)
          .to('#mokoMouth', { attr: { d: 'M96 98 q6 -3 12 0' }, duration: 0.3 }, 0)
          .to(moko, { scale: 1.15, duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out' }, 0)
          .call(() => { sfx('burst'); motes.density = 1; motes.speed = 4; }, null, 0.25)
          // 0.5秒で一気に広がり、ゆっくり止まる
          .from(sp.chars, { opacity: 0, scale: 0.15, x: () => (rand() - 0.5) * 120, y: () => (rand() - 0.5) * 120, duration: 1.1, ease: 'expo.out', stagger: { each: 0.03, from: 'center' } }, 0.25)
          .to(sp.chars, { scale: 1.06, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.4)
          .call(() => { motes.speed = 1.2; }, null, 2.2);
      },
    },
    { // 4 クライマックス:もこが雨になる
      words: ['ポツポツ', 'ぽつ ぽつ', 'しとしと'],
      enter() {
        sfx('rain');
        gsap.set(flower, { opacity: 1 }); gsap.set(head, { rotation: 112 }); gsap.set(petals, { fill: C.wilt });
        gsap.set('#dry', { opacity: 1 }); gsap.set('#buds g', { scale: 0 }); gsap.set('#mokoBrows', { opacity: 1 });
        gsap.set(['#far', '#hills', '#field'], { xPercent: (i) => [-5, -10, -16][i] });
        rainLoop.play(0);
        return gsap.timeline()
          .add(skyTo('#9FC3D9', '#C6DCE8', '#F3EEE2', 1.2), 0)
          .to('#sun', { opacity: 0, scale: 0.6, duration: 0.8 }, 0)
          .add(zoomTo(moko, 1.38, 1.6), 0)
          .to('#rain', { opacity: 1, duration: 0.6 }, 0.6)
          .to(mokoSvg, { scaleX: 1.08, scaleY: 0.86, transformOrigin: '50% 100%', duration: 0.5, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.8)
          .to('#dry', { opacity: 0.35, duration: 5, ease: 'none' }, 1.5)
          .add(say('ぽつ、ぽつ、ぽつ。\nもこは、あめに なって ふった。'), 0.6);
      },
    },
    { // 5 結末:花が咲き、虹が出る
      words: ['キラキラ', 'にこにこ', 'キラキラ'],
      enter() {
        sfx('bloom');
        gsap.set(flower, { opacity: 1 }); gsap.set(head, { rotation: 112 }); gsap.set(petals, { fill: C.wilt });
        gsap.set('#dry', { opacity: 0.35 }); gsap.set('#buds g', { scale: 0 });
        gsap.set(['#far', '#hills', '#field'], { xPercent: (i) => [-5, -10, -16][i] });
        gsap.set(sky, { '--s1': '#9FC3D9', '--s2': '#C6DCE8', '--s3': '#F3EEE2' });
        motes.petals = 1;
        return gsap.timeline()
          .add(skyTo('#8ED0EA', '#BFE5F4', '#FFF6E6', 1.4), 0)
          .to('#dry', { opacity: 0, duration: 1.4 }, 0)
          .to(head, { rotation: 0, duration: 1.4, ease: 'back.out(1.4)' }, 0.2)
          .to(petals, { fill: C.pink, duration: 1 }, 0.4)
          .fromTo(petals, { scale: 0.7, transformOrigin: '50% 100%' }, { scale: 1.12, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.06 }, 0.5)
          .to('.eye-sad', { opacity: 0, duration: 0.2 }, 0.9).to(['.eye-happy', '.mouth-happy'], { opacity: 1, duration: 0.3 }, 0.9)
          .to('#buds g', { scale: 1, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.12 }, 0.9)
          .to('#rainbow', { opacity: 1, duration: 0.3 }, 1.2)
          .from('.rb', { drawSVG: '0%', duration: 1.6, ease: 'power2.out', stagger: 0.12 }, 1.2)
          .to('#mokoBrows', { opacity: 0, duration: 0.3 }, 0.6)
          .to(moko, { scale: 0.62, y: '-8vh', x: '-10vw', duration: 2.6, ease: 'power2.inOut' }, 0.6)
          .add(say('おはなが にこっと わらった。\n「ありがとう、もこ!」'), 1.6);
      },
    },
    { // 6 おしまい
      words: null,
      enter() {
        sfx('title');
        hideText();
        gsap.set(flower, { opacity: 1 }); gsap.set(['.eye-happy', '.mouth-happy'], { opacity: 1 }); gsap.set('.eye-sad', { opacity: 0 });
        gsap.set('#rainbow', { opacity: 1 }); gsap.set(moko, { scale: 0.62, y: '-8vh', x: '-10vw' });
        gsap.set(['#far', '#hills', '#field'], { xPercent: (i) => [-5, -10, -16][i] });
        motes.petals = 1; motes.density = 1;
        const sp = SplitText.create(ending.querySelector('.owari'), { type: 'chars', charsClass: 'ch', tag: 'span' });
        return gsap.timeline()
          .to(ending, { autoAlpha: 1, duration: 0.4 }, 0)
          .from(sp.chars, { opacity: 0, scale: 0.5, filter: 'blur(8px)', duration: 0.8, stagger: 0.12, ease: 'back.out(1.8)' }, 0.1)
          .from(['.again', '.credit'], { opacity: 0, y: 10, duration: 0.6, stagger: 0.15 }, 0.8);
      },
    },
  ];

  // ---------- ページ送り ----------
  let page = -1, pageTl = null, busy = false;
  dotsEl.innerHTML = PAGES.map(() => '<i></i>').join('');
  const dots = [...dotsEl.children];
  const apply = (n) => {
    pageTl?.kill(); hideText();
    resetWorld();
    page = n;
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    showWords(reduce ? null : PAGES[n].words);
    pageTl = PAGES[n].enter();
    if (reduce) pageTl.progress(1);
  };
  const goTo = (n) => {
    if (busy || n === page) return;
    busy = true;
    flood(() => apply(n)).call(() => { busy = false; });
  };
  const next = () => { if (page < PAGES.length - 1) { sfx('page'); goTo(page + 1); } };

  const ripple = (x, y) => {
    sfx('tap');
    const r = document.createElement('i');
    r.style.left = `${x}px`; r.style.top = `${y}px`;
    tapsEl.appendChild(r);
    gsap.fromTo(r, { scale: 0.3, opacity: 1 }, { scale: 1.4, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => r.remove() });
  };

  if (!demo && !style) {
    let sx = null;
    book.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    book.addEventListener('pointerup', (e) => {
      if (e.target.closest('button, a')) return;
      if (sx !== null && Math.abs(e.clientX - sx) > 40 && e.clientX > sx) return; // 右スワイプは無視
      ripple(e.clientX, e.clientY); next();
    });
    addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
    $('next').addEventListener('click', (e) => { e.stopPropagation(); next(); });
    $('again').addEventListener('click', (e) => { e.stopPropagation(); sfx('page'); goTo(0); });
  }

  const start = () => {
    apply(Math.min(startPage, PAGES.length - 1));
    if (style) {
      // 見比べ用:そのページの完成した状態で止める
      pageTl.progress(1); wordsTl?.progress(0.3).pause();
      gsap.globalTimeline.pause();
      return;
    }
    if (demo === '1') {
      // 撮影用の自動再生(ページが切り替わる時刻:3.0 / 11.5 / 15.5 / 19.5 / 27.5 / 33.5 秒)
      [3.0, 11.5, 15.5, 19.5, 27.5, 33.5].forEach((t, i) => gsap.delayedCall(t - 0.68, () => goTo(i + 1)));
    }
    if (demo === 'touch') {
      gsap.delayedCall(1.6, () => { ripple(innerWidth * 0.68, innerHeight * 0.62); next(); });
    }
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
