/* くものこ もこ v3 — うごく えほんスライド(GSAP)
   絵(art/*.jpg)を ゆっくり寄る・引く・横に流すカメラで動かし、ひらがなの文字を 読まれる速さで1文字ずつ出す。
   ページごとの「よみきかせ」ボタンで、1回通しで録った声をページごとに切り出したもの(voice/pages)が流れる(自動では鳴らさない)。
   時刻・文字・カットは book.js(voice/build.py が作る)。
   ?demo=video 動画の撮影用:動画の時刻表どおりに自動でめくる(音は鳴らさない)
   ?page=N     N ページ目から始める */
(() => {
  if (!window.gsap || !window.MOKO) return;
  const M = window.MOKO;
  const q = new URLSearchParams(location.search);
  const video = q.get('demo') === 'video';
  const reduce = !video && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (video) document.documentElement.classList.add('video');

  const $ = (id) => document.getElementById(id);
  const book = $('book'), frame = $('frame'), backdrop = $('backdrop');
  const shots = [$('shotA'), $('shotB')].map((el) => ({ el, cam: el.querySelector('.cam'), img: el.querySelector('img') }));
  const story = $('story'), burst = $('burst'), owari = $('owari'), title = $('title'), wordsEl = $('words');
  const floodEl = $('flood'), dotsEl = $('dots'), readBtn = $('read'), nextBtn = $('next'), credit = $('credit');
  const PAGES = M.pages;
  const src = (id) => `art/${id}.jpg`;

  // 決まった乱数(撮影のたびに同じ絵になるように)
  let seed = 11;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------- カメラ(カットごと)。s=倍率、x/y=ずらす量(%)、o=寄る中心 ----------
  const CAM = {
    p00: { s: [1.10, 1.0], ease: 'sine.out' },
    p01: { s: [1.12, 1.12], x: [4.2, -4.2], ease: 'sine.inOut' },
    p02a: { s: [1.12, 1.12], x: [4.5, -4.5], gust: 'びゅうっ' },   // 「びゅうっ」で右へ すばやく流す
    p02b: { s: [1.0, 1.06], o: '50% 48%', ease: 'power2.out' },
    p03: { s: [1.0, 1.12], o: '52% 62%' },
    p04: { s: [1.0, 1.15], o: '42% 45%' },
    p05a: { s: [1.12, 1.14], y: [5, 5] },                         // もこを少し下げて、上の大きな文字に重ねない
    p05b: { s: [1.16, 1.2], y: [7.5, 7.5], pop: 'あめ' },            // 「あめに なる!」で少し寄って止まる
    p06a: { s: [1.12, 1.12], y: [4.5, 0.5], ease: 'sine.in' },     // 上から下へ
    p06b: { s: [1.06, 1.06], y: [3, 0.5], ease: 'sine.out' },      // もこが文字の箱の裏に入らないよう、振りは小さく
    p07a: { s: [1.14, 1.0], o: '50% 50%' },
    p07b: { s: [1.08, 1.0], o: '50% 55%' },
    p08: { s: [1.12, 1.12], y: [-4.5, 4.5] },                      // 下から上へ
    owari: { s: [1.12, 1.0], o: '50% 42%' },
  };
  // 光の粒(motes)と雨(rain)の量。ページごと・カットごと
  const FX = { cover: [0.7, 0], sanpo: [0.35, 0], kaze: [0, 0], karakara: [0, 0], mayou: [0, 0], kimeta: [0, 0], ame: [0, 0.45], warau: [0.5, 0], modoru: [0.85, 0], owari: [0.6, 0] };
  // 背景いっぱいの擬音(3か所だけ)。[左%, 上%]。もこ・花・文字の箱に重ねない
  const WORDS = { kaze: { cut: 0, spots: [[5, 63], [55, 68]] }, ame: { cut: 0, spots: [[2, 65], [63, 64]] }, warau: { cut: 1, spots: [[60, 36], [3, 60]] } };

  // ---------- 光の粒・雨(キャンバス) ----------
  const cv = $('fx'), ctx = cv.getContext('2d');
  const fx = { motes: 0, rain: 0, speed: 1 };
  let W = 0, H = 0;
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); W = frame.clientWidth; H = frame.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  resize(); addEventListener('resize', resize);
  const motes = Array.from({ length: 60 }, (_, i) => ({ x: rand(), y: rand(), r: 1.6 + rand() * 3.2, s: 0.3 + rand() * 0.7, ph: rand() * 6.28, c: i % 3 ? '#F6C65B' : '#F6A6BA' }));
  const drops = Array.from({ length: 90 }, () => ({ x: rand(), y: rand(), l: 0.018 + rand() * 0.016, s: 0.55 + rand() * 0.35 }));
  let ft = 0;
  gsap.ticker.add((time, dt) => {
    const k = Math.min(dt, 50) / 1000;
    ft += k * fx.speed;
    ctx.clearRect(0, 0, W, H);
    if (reduce) return;
    const nm = Math.round(motes.length * fx.motes);
    for (let i = 0; i < nm; i++) {
      const p = motes[i];
      const y = ((p.y - ft * 0.02 * p.s) % 1 + 1) % 1, x = p.x + Math.sin(time * 0.5 + p.ph) * 0.015;
      const tw = 0.5 + 0.5 * Math.sin(time * 1.6 + p.ph * 3);
      const r = p.r * (W / 540);
      const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * 3);
      g.addColorStop(0, p.c); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 0.3 + 0.45 * tw; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x * W, y * H, r * 3, 0, 6.283); ctx.fill();
    }
    const nd = Math.round(drops.length * fx.rain);
    if (nd) {
      ctx.globalAlpha = 0.55; ctx.strokeStyle = '#8EC8E2'; ctx.lineWidth = Math.max(1.5, W / 300); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < nd; i++) {
        const d = drops[i];
        const y = 0.3 + ((d.y + ft * d.s) % 1) * 0.62;   // 上の文字の帯(〜3割)には降らせない
        ctx.moveTo(d.x * W, y * H); ctx.lineTo(d.x * W - W * 0.006, (y + d.l) * H);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  // ---------- 文字を1文字ずつの <span> に ----------
  const spell = (el, text, rim) => {
    el.innerHTML = '';
    const out = [];
    let line = null;
    const newLine = () => { line = document.createElement('span'); line.className = 'ln'; el.appendChild(line); };
    newLine();
    [...text].forEach((c) => {
      if (c === '\n') { out.push(null); newLine(); return; }
      const s = document.createElement('span'); s.className = 'ch'; s.textContent = c === ' ' ? ' ' : c;
      line.appendChild(s); out.push(s);
    });
    if (rim) el.querySelectorAll('.ln').forEach((ln) => ln.dataset.t = ln.textContent);
    return out;
  };

  // ---------- 場面転換:光の粒があふれて覆い、引くと次の場面 ----------
  const FLOOD_MID = 0.6;
  const blobs = Array.from({ length: 26 }, () => {
    const b = document.createElement('i');
    const size = 40 + rand() * 46;
    b.style.width = b.style.height = `${size}vmax`;
    b.style.left = `${rand() * 100 - size / 2}vw`; b.style.top = `${rand() * 100 - size / 2}vh`;
    floodEl.appendChild(b); return b;
  });
  const flood = (onMid) => gsap.timeline()
    .set(blobs, { opacity: 1 })
    .fromTo(blobs, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'power2.out', stagger: { each: 0.005, from: 'center' } })
    .call(onMid, null, FLOOD_MID)
    .to(blobs, { opacity: 0, scale: 1.2, duration: 0.42, ease: 'power1.out', stagger: { each: 0.004, from: 'random' } }, FLOOD_MID + 0.05);

  // ---------- 1ページ分の動き ----------
  const camTl = (cam, key, d, info, t0 = 0) => {   // t0 = このカメラが始まる、ページの中の秒
    const c = CAM[key];
    const from = { scale: c.s[0], xPercent: c.x ? c.x[0] : 0, yPercent: c.y ? c.y[0] : 0, transformOrigin: c.o || '50% 50%' };
    const to = { scale: c.s[1], xPercent: c.x ? c.x[1] : 0, yPercent: c.y ? c.y[1] : 0 };
    const tl = gsap.timeline();
    tl.set(cam, from);
    if (c.gust) {
      const g = info.when(c.gust) - t0;
      tl.to(cam, { xPercent: -1.5, duration: 0.6, ease: 'power3.out' }, Math.max(0, g - 0.1))
        .to(cam, { xPercent: to.xPercent, duration: Math.max(0.5, d - g - 0.5), ease: 'sine.out' }, g + 0.5);
    } else if (c.pop) {
      tl.to(cam, { scale: to.scale, duration: 0.5, ease: 'power3.out' }, Math.max(0, info.when(c.pop) - t0 - 0.05));
    } else {
      tl.to(cam, { ...to, duration: d, ease: c.ease || 'sine.inOut' }, 0);
    }
    return tl;
  };
  const inkIn = (tl, el, at) => tl.from(el, { opacity: 0, y: 6, filter: 'blur(6px)', duration: 0.5, ease: 'power2.out' }, at);
  const popIn = (tl, el, at, big) => tl.from(el, { opacity: 0, scale: big ? 0.2 : 0.5, y: big ? 0 : 10, duration: big ? 1.0 : 0.7, ease: big ? 'expo.out' : 'back.out(1.8)' }, at);

  let page = -1, pageTl = null, busy = false;
  const apply = (n) => {
    stopReading();
    pageTl?.kill();
    gsap.killTweensOf([story, burst, owari, title, wordsEl, ...shots.map((s) => s.el), ...shots.map((s) => s.cam)]);
    page = n;
    const P = PAGES[n];
    const shift = video ? 0 : 1.0 - P.parts[0].v0;   // Web では、ページを開いて約1秒で文字が出はじめる
    const T = (t) => t + shift;
    const dur = T(P.video.dur) + 0.8;
    const info = {
      when: (w) => {   // 画面の文字のうち、ある言葉が出る時刻(ページの中の秒)
        for (const part of P.parts) { const flat = part.screen; const i = flat.indexOf(w); if (i >= 0) return T(part.times[i]); }
        return 0;
      },
    };
    // 絵
    const cutKey = (i) => (P.id === 'owari' ? 'owari' : P.cuts[i].img);
    shots[0].img.src = src(P.cuts[0].img); shots[1].img.src = P.cuts[1] ? src(P.cuts[1].img) : '';
    gsap.set(shots[0].el, { opacity: 1 }); gsap.set(shots[1].el, { opacity: 0 });
    backdrop.style.backgroundImage = `url(${src(P.cuts[0].img)})`;
    // 文字・題字・擬音を消す
    gsap.set([story, burst, owari, wordsEl], { opacity: 0 }); story.innerHTML = ''; burst.innerHTML = ''; owari.innerHTML = ''; wordsEl.innerHTML = '';
    gsap.set(title, { opacity: P.id === 'cover' ? 1 : 0 });
    fx.motes = FX[P.id][0]; fx.rain = FX[P.id][1]; fx.speed = 1;
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    nextBtn.textContent = n === PAGES.length - 1 ? 'もういちど よむ' : 'つぎへ';
    credit.classList.toggle('on', false);

    const tl = gsap.timeline();
    const c1 = P.cuts[1] ? T(P.cuts[1].at) : null;
    tl.add(camTl(shots[0].cam, cutKey(0), c1 ? c1 + 0.25 : dur, info), 0);
    if (c1 !== null) {
      tl.add(camTl(shots[1].cam, cutKey(1), dur - c1 + 0.25, info, c1 - 0.25), c1 - 0.25)
        .to(shots[1].el, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, c1 - 0.25)
        .call(() => { backdrop.style.backgroundImage = `url(${src(P.cuts[1].img)})`; }, null, c1);
      if (P.id === 'ame') tl.call(() => { fx.rain = 1; }, null, c1);
    }
    // 文字
    P.parts.forEach((part, k) => {
      const times = part.times.map((t) => (t === null ? null : T(t)));
      const first = Math.min(...times.filter((t) => t !== null));
      if (part.kind === 'box') {
        const spans = spell(story, part.screen);
        tl.to(story, { opacity: 1, duration: 0.3 }, Math.max(0, first - 0.3));
        spans.forEach((s, i) => s && inkIn(tl, s, times[i]));
        if (P.parts[k + 1]) tl.to(story, { opacity: 0, duration: 0.4 }, T(part.v1) + 0.6);
      } else if (part.kind === 'burst') {
        const spans = spell(burst, part.screen);
        const b = part.screen.indexOf('ぼ');
        tl.set(burst, { opacity: 1 }, 0);
        spans.forEach((s, i) => s && popIn(tl, s, times[i], i >= b));
        const go = info.when('あめ');
        tl.call(() => { fx.motes = 1; fx.speed = 5; }, null, go).call(() => { fx.speed = 1.4; fx.motes = 0.6; }, null, go + 1.4);
      } else if (part.kind === 'end') {
        const spans = spell(owari, part.screen);
        tl.set(owari, { opacity: 1 }, Math.max(0, first - 0.1));
        spans.forEach((s, i) => s && popIn(tl, s, times[i], false));
        if (!video) tl.call(() => credit.classList.add('on'), null, first + 1.2);
      }
    });
    // 背景いっぱいの擬音
    const wd = WORDS[P.id];
    if (wd && !reduce) {
      const from = wd.cut ? c1 : T(P.parts[0].times.find((t) => t !== null));
      const to = wd.cut ? dur : c1 - 0.2;
      const spans = wd.spots.map(([x, y]) => { const s = document.createElement('span'); s.textContent = P.word; s.style.left = `${x}%`; s.style.top = `${y}%`; wordsEl.appendChild(s); return s; });
      tl.set(wordsEl, { opacity: 1 }, from);
      spans.forEach((s, i) => {
        tl.fromTo(s, { opacity: 0, scale: 0.7, rotation: i % 2 ? -6 : 6 }, { opacity: 0.85, scale: 1, rotation: 0, duration: 0.8, ease: 'power2.out' }, from + i * 0.45)
          .to(s, { opacity: 0, scale: 1.25, duration: 1.0, ease: 'power1.in' }, Math.max(from + i * 0.45 + 1.4, to - 1.0));
      });
    }
    pageTl = tl;
    if (reduce) tl.progress(1);
  };

  // ---------- よみきかせ(ボタンを押したときだけ。ページをめくったら止める) ----------
  let reading = null;
  function stopReading() {
    if (!reading) return;
    reading.pause(); reading.currentTime = 0; reading = null;
    readBtn.classList.remove('playing'); readBtn.setAttribute('aria-pressed', 'false');
  }
  const readPage = () => {
    if (reading) { stopReading(); return; }
    const a = new Audio(PAGES[page].audio);
    reading = a;
    readBtn.classList.add('playing'); readBtn.setAttribute('aria-pressed', 'true');
    a.onended = () => { if (reading === a) stopReading(); };
    a.play().catch(() => stopReading());
  };

  // ---------- ページ送り ----------
  dotsEl.innerHTML = PAGES.map(() => '<i></i>').join('');
  const dots = [...dotsEl.children];
  const goTo = (n) => {
    if (busy || n === page) return;
    busy = true;
    if (reduce) { apply(n); busy = false; return; }
    flood(() => apply(n)).call(() => { busy = false; });
  };
  const next = () => goTo(page < PAGES.length - 1 ? page + 1 : 0);
  const prev = () => { if (page > 0) goTo(page - 1); };

  if (!video) {
    let sx = null;
    book.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    book.addEventListener('pointerup', (e) => {
      if (e.target.closest('button, a')) return;
      if (sx !== null && e.clientX - sx > 40) { prev(); return; }   // 右へスワイプで まえのページ
      next();
    });
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('button, a')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); next(); });
    readBtn.addEventListener('click', (e) => { e.stopPropagation(); readPage(); });
  }

  const start = () => {
    window.__mokoReady = true;   // 撮影(capture.mjs の waitFor)は、字体と絵を読みこみ終えて始まるまで待つ
    resize();
    apply(Math.min(Math.max(0, Number(q.get('page') || 0)), PAGES.length - 1));
    if (video) PAGES.forEach((p, i) => { if (i > 0) gsap.delayedCall(p.video.start - FLOOD_MID, () => goTo(i)); });
  };
  // 丸ゴシックは文字ごとに分けて配信されるので、使う文字を先に全部読みこむ。絵も先に読みこむ
  const ALL = [...new Set([...document.body.innerText, ...PAGES.flatMap((p) => p.parts.map((x) => x.screen)).join(''), 'びゅうっポツポツキラキラもういちどよむ'])].join('');
  const imgs = [...new Set(PAGES.flatMap((p) => p.cuts.map((c) => c.img)))].map((id) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = src(id); }));
  const fonts = document.fonts ? Promise.all(['700', '900'].map((w) => document.fonts.load(`${w} 1em "Zen Maru Gothic"`, ALL))) : Promise.resolve();
  Promise.race([Promise.all([fonts, ...imgs]), new Promise((r) => setTimeout(r, 4000))]).then(() => document.fonts?.ready).then(start, start);
})();
