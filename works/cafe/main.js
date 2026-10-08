/* YUGE 湯気と珈琲 — motion (GSAP + ScrollTrigger + SplitText + DrawSVG + Lenis)
   ページ全体を「一杯の湯気が消えるまでの三分」として演出する。
   ?capture を付けると Lenis を使わない(動画撮影用。スクロール位置を直接指定するため)。 */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;

  document.documentElement.classList.add('motion');
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  const capture = new URLSearchParams(location.search).has('capture');

  // ---------- Lenis(なめらかなスクロール) ----------
  if (!capture && window.Lenis) {
    const lenis = new Lenis({ autoRaf: false, lerp: 0.085 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault(); lenis.scrollTo(a.getAttribute('href'), { duration: 1.4 });
    }));
  }

  // ---------- 湯気(Canvas) ----------
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('steam');
  const ctx = canvas.getContext('2d');
  const cupEl = hero.querySelector('.cup');
  const steam = { intensity: 1 };   // スクロールで増減
  let W = 0, H = 0, dpr = 1, ox = 0, oy = 0;

  // 決まった乱数(撮影のたびに同じ湯気になるように)
  let seed = 20261008;
  const rand = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // やわらかい丸のスプライト
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 128;
  const sg = sprite.getContext('2d');
  const grad = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 128, 128);

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hr = hero.getBoundingClientRect(), cr = cupEl.getBoundingClientRect();
    ox = cr.left - hr.left + cr.width * 0.5;
    oy = cr.top - hr.top + cr.height * 0.2;
  };
  resize();
  window.addEventListener('resize', resize);

  const parts = [];
  const MAX = W < 700 ? 170 : 240;
  let acc = 0, last = 0, heroVisible = true;
  const spawn = () => {
    parts.push({
      x: ox + (rand() - 0.5) * W * 0.12, y: oy,
      vy: 50 + rand() * 46, life: 0, max: 4.5 + rand() * 3,
      s0: 10 + rand() * 12, ph: rand() * Math.PI * 2, amp: 22 + rand() * 34,
    });
  };
  const draw = (time) => {
    const dt = Math.min(time - last, 0.05); last = time;
    if (!heroVisible) return;
    acc += dt * 30 * steam.intensity;
    while (acc > 1) { acc -= 1; if (parts.length < MAX * steam.intensity) spawn(); }
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life > p.max) { parts.splice(i, 1); continue; }
      const k = p.life / p.max;
      p.y -= p.vy * dt * (0.7 + steam.intensity * 0.3);
      const sway = Math.sin(p.y * 0.011 + time * 0.55 + p.ph) * p.amp + Math.sin(p.y * 0.027 - time * 0.8 + p.ph * 1.7) * p.amp * 0.4;
      const s = p.s0 + k * (70 + steam.intensity * 70);
      ctx.globalAlpha = Math.pow(Math.sin(Math.PI * k), 1.3) * 0.12 * Math.min(steam.intensity, 2.4);
      ctx.drawImage(sprite, p.x + sway * k * 1.6 - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  };
  gsap.ticker.add(draw);

  // ---------- 残り時間(ページ全体 = 三分) ----------
  const timer = document.getElementById('timer');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const sec = Math.round(180 * (1 - self.progress));
      timer.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    },
  });

  const init = () => {
    // ---------- 1. 開幕:文字が湯気から結露するように ----------
    const title = SplitText.create('.hero-title span', { type: 'chars', tag: 'span', charsClass: 'ch' });
    gsap.set('.hero-title', { autoAlpha: 1 });
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .from(steam, { intensity: 0.2, duration: 2.4, ease: 'sine.out' }, 0)
      .from(cupEl, { y: 40, autoAlpha: 0, duration: 1.4 }, 0)
      .from(title.chars, { autoAlpha: 0, y: 26, filter: 'blur(14px)', duration: 1.5, stagger: 0.07 }, 0.5)
      .from('.hero-meta', { autoAlpha: 0, y: 12, duration: 1 }, 1.6);

    // 湯気が立ちこめて、霧の朝へ
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=130%', scrub: true, pin: true,
        onToggle: (self) => { heroVisible = self.isActive || self.progress < 1; } },
    })
      .to(steam, { intensity: 3.4, ease: 'power1.in', duration: 1 }, 0)
      .to(title.chars, { y: -50, autoAlpha: 0, filter: 'blur(10px)', stagger: { each: 0.02, from: 'end' }, duration: 0.35 }, 0.05)
      .to('.hero-meta', { autoAlpha: 0, duration: 0.2 }, 0.05)
      .to(cupEl, { y: 30, scale: 0.94, duration: 0.6 }, 0.1)
      .to('.veil', { opacity: 1, duration: 0.4, ease: 'power1.in' }, 0.6);

    // ---------- 2. 坂:線で描かれていく ----------
    const slopeTitle = SplitText.create('#slope-title', { type: 'chars', tag: 'span', charsClass: 'ch' });
    gsap.from(slopeTitle.chars, {
      autoAlpha: 0, y: -8, filter: 'blur(6px)', stagger: 0.08, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '.slope', start: 'top 70%' },
    });
    gsap.from('.slope-head p', { autoAlpha: 0, duration: 1, scrollTrigger: { trigger: '.slope', start: 'top 55%' } });
    gsap.timeline({ scrollTrigger: { trigger: '.slope-art', start: 'top 85%', end: 'bottom 40%', scrub: 0.6 } })
      .from('.slope-art .draw', { drawSVG: '0%', duration: 1, stagger: 0.06, ease: 'none' })
      .from('.slope-art .noren', { scaleY: 0, transformOrigin: '50% 0%', duration: 0.3 }, '-=0.3')
      .from('.slope-art .glow', { scale: 0, transformOrigin: '50% 50%', duration: 0.2 }, '<');

    // ---------- 3. 一杯ができるまで(固定して4手順を順に) ----------
    const steps = gsap.utils.toArray('.step');
    const bars = gsap.utils.toArray('.step-bar b');
    gsap.set(steps.slice(1), { autoAlpha: 0, y: 18 });
    gsap.set('.pour .coffee', { scaleY: 0, svgOrigin: '100 280' });
    gsap.set('.pour .stream', { drawSVG: '0%' });
    const ritual = gsap.timeline({
      scrollTrigger: { trigger: '.ritual', start: 'top top', end: '+=320%', scrub: 0.5, pin: true },
      defaults: { ease: 'none' },
    });
    ritual.to(bars[0], { scaleX: 1, duration: 1 }, 0);
    steps.slice(1).forEach((s, i) => {
      const at = i + 1;
      ritual
        .to(steps[i], { autoAlpha: 0, y: -18, duration: 0.25, ease: 'power1.in' }, at)
        .to(s, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power1.out' }, at + 0.15)
        .to(bars[at], { scaleX: 1, duration: 1 }, at);
    });
    ritual
      .to('.pour .stream:not(.drip)', { drawSVG: '100%', duration: 0.3 }, 2)
      .to('.pour .drip', { drawSVG: '100%', duration: 0.4 }, 2.2)
      .to('.pour .coffee', { scaleY: 1, duration: 1.4 }, 2.3)
      .to('.pour .stream', { drawSVG: '100% 100%', duration: 0.3 }, 3.4);

    // ---------- 4. お品書き(横に流れる木札。速さで揺れる) ----------
    const tags = document.querySelector('.tags');
    const dist = () => Math.max(0, tags.scrollWidth - window.innerWidth);
    const swing = gsap.utils.toArray('.tag').map((t) => gsap.quickTo(t, 'rotation', { duration: 0.8, ease: 'elastic.out(1, 0.35)' }));
    gsap.to(tags, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.menu', start: 'top top', end: () => `+=${dist() + window.innerHeight * 0.3}`,
        scrub: 0.4, pin: true, invalidateOnRefresh: true,
        onUpdate: (self) => { const r = gsap.utils.clamp(-9, 9, self.getVelocity() / -160); swing.forEach((q) => q(r)); },
      },
    });
    gsap.from('.tag', {
      y: -60, rotation: -6, autoAlpha: 0, stagger: 0.06, duration: 1.1, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: '.menu', start: 'top 60%' },
    });

    // ---------- 5. 八席:席がひとつずつ灯る ----------
    const seats = gsap.utils.toArray('.plan .seat');
    const num = document.getElementById('seat-num');
    const counter = { n: 0 };
    gsap.timeline({ scrollTrigger: { trigger: '.plan', start: 'top 80%', end: 'center 40%', scrub: 0.5 } })
      .from(seats, { scale: 0, transformOrigin: '50% 50%', stagger: 0.12, duration: 0.3, ease: 'back.out(2)' }, 0)
      .to(counter, { n: 8, duration: seats.length * 0.12 + 0.18, ease: 'none', onUpdate: () => { num.textContent = Math.round(counter.n); } }, 0);

    // ---------- 6. 行き方:道順が描かれる ----------
    gsap.timeline({ scrollTrigger: { trigger: '.map', start: 'top 80%', end: 'center 45%', scrub: 0.5 } })
      .from('.map .route', { drawSVG: '0%', duration: 1, ease: 'none' })
      .from('.map .pin', { y: -24, autoAlpha: 0, duration: 0.3, ease: 'back.out(2)' });

    // ---------- 7. 湯気がやんだら ----------
    const endTitle = SplitText.create('.end h2', { type: 'chars', tag: 'span', charsClass: 'ch' });
    gsap.from(endTitle.chars, {
      autoAlpha: 0, filter: 'blur(8px)', stagger: 0.09, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: '.end', start: 'top 65%' },
    });

    ScrollTrigger.refresh();
    window.__yugeReady = true;
  };

  gsap.set('.hero-title', { autoAlpha: 0 });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(init);
})();
