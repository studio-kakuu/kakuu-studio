/* くものこ もこ — よみきかせ付きの えほん(GSAP + SplitText + DrawSVG)
   タップ/クリック/→キー/左スワイプで ページを めくる。各ページの「よみきかせ」ボタンで そのページの こえが ながれる(自動では鳴らさない)。
   こえ と 1文字ずつの時刻は narration.js(audio/build-narration.py が作る)。
   ?demo=video 動画の撮影用:ナレーションの時刻表どおりに自動でめくり、文字を読まれるのと同時に出す(音は鳴らさない)
   ?page=N     N ページ目から始める */
(() => {
  if (!window.gsap) return;
  gsap.registerPlugin(SplitText, DrawSVGPlugin);
  const N = window.MOKO_NARRATION;
  const q = new URLSearchParams(location.search);
  const demo = q.get('demo');
  const video = demo === 'video';
  const startPage = Math.max(0, Number(q.get('page') || 0));
  const reduce = !video && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (demo) document.body.classList.add('demo');
  if (video) document.body.classList.add('video');

  const $ = (id) => document.getElementById(id);
  const C = { ink: '#6A564C', gold: '#F6C65B', pink: '#F6A6BA', wilt: '#E3C9CC' };

  const book = $('book'), world = $('world'), sky = $('sky');
  const moko = $('mokoWrap'), mokoSvg = $('moko'), flower = $('flower'), head = $('head');
  const petals = gsap.utils.toArray('#petals ellipse');
  const textEl = $('text'), burstEl = $('burst'), titleEl = $('title'), ending = $('ending');
  const wordsEl = $('words'), floodEl = $('flood'), tapsEl = $('taps'), dotsEl = $('dots'), gustsEl = $('gusts');
  const readBtn = $('read');

  // 決まった乱数(撮影のたびに同じ絵になるように)
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------- 時刻表(ナレーションから) ----------
  // 各ページ:入る時刻(場面転換の中間)、長さ、そのページで読む文(声の始まりはページに入ってからの秒)
  const VT = N.video;
  const pageInfo = N.pages.map((p, i) => {
    const t0 = VT.pages[i];
    const t1 = i + 1 < VT.pages.length ? VT.pages[i + 1] : VT.duration;
    const lines = p.lines.map((id) => {
      const v = VT.voice.find((x) => x.id === id);
      return { id, ...N.lines[id], at: v.at - t0, end: v.at - t0 + v.len };
    });
    return { id: p.id, dur: t1 - t0, lines, vStart: lines[0].at, vEnd: lines[lines.length - 1].end };
  });

  // ---------- 雨粒 ----------
  const drops = $('drops');
  for (let i = 0; i < 26; i++) {
    const x = 24 + rand() * 152, y = rand() * 260, len = 14 + rand() * 12;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} l-3 ${len.toFixed(1)}`);
    drops.appendChild(p);
  }

  // ---------- 強い風の線 ----------
  const gusts = Array.from({ length: 9 }, (_, i) => {
    const g = document.createElement('i');
    g.style.top = `${14 + i * 8.6 + rand() * 4}%`;
    g.style.width = `${30 + rand() * 30}vw`;
    gustsEl.appendChild(g); return g;
  });
  const blowGusts = (dur) => {
    const tl = gsap.timeline();
    gusts.forEach((g, i) => {
      tl.fromTo(g, { x: '-60vw', opacity: 0 }, { x: '130vw', opacity: 0.95, duration: 0.75 + rand() * 0.35, ease: 'power1.in', repeat: Math.max(0, Math.floor(dur / 1.1) - 1), repeatDelay: 0.25 + rand() * 0.3 }, rand() * 0.6);
    });
    return tl;
  };

  // ---------- もこの「ちいさく なった」想像(うすい影) ----------
  const ghost = document.createElement('div');
  ghost.className = 'ghost';
  ghost.appendChild(mokoSvg.cloneNode(true)).removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  world.appendChild(ghost);

  // ---------- 光の粒・花びら(前景) ----------
  const cv = $('motes'), ctx = cv.getContext('2d');
  const motes = { density: 0.6, petals: 0, speed: 1 };
  let W = 0, H = 0;
  const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  resize(); addEventListener('resize', resize);
  const parts = Array.from({ length: 70 }, (_, i) => ({ x: rand(), y: rand(), r: 2 + rand() * 4, s: 0.2 + rand() * 0.6, ph: rand() * 6.28, c: i % 3 === 0 ? C.pink : C.gold, petal: i % 4 === 0 }));
  let moteT = 0;
  gsap.ticker.add((time, dt) => {
    moteT += (dt / 1000) * motes.speed;
    ctx.clearRect(0, 0, W, H);
    if (reduce) return;
    const n = Math.round(parts.length * Math.min(1, motes.density));
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      const y = ((p.y - moteT * 0.018 * p.s) % 1 + 1) % 1;
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
  // 動画のときは SNS のボタンに重ならない範囲(右と下をあける)にだけ置く
  const SPOTS = video
    ? [[6, 30], [44, 26], [14, 46], [50, 44], [4, 62], [40, 64], [22, 74], [48, 76]]
    : [[8, 12], [56, 8], [22, 38], [68, 34], [4, 62], [52, 60], [30, 84], [74, 82]];
  let wordsTl = null;
  const showWords = (word) => {
    wordsTl?.kill(); wordsEl.innerHTML = '';
    if (!word) return;
    const spans = SPOTS.map(([x, y]) => {
      const s = document.createElement('span');
      s.textContent = word;
      s.style.left = `${x}%`; s.style.top = `${y}%`;
      wordsEl.appendChild(s); return s;
    });
    wordsTl = gsap.timeline({ repeat: -1 });
    spans.forEach((s, i) => {
      wordsTl.fromTo(s, { opacity: 0, scale: 0.6, rotation: (i % 2 ? -1 : 1) * 10 }, { opacity: 0.6, scale: 1, rotation: 0, duration: 0.9, ease: 'power2.out' }, i * 0.35)
        .to(s, { opacity: 0, scale: 1.5, rotation: (i % 2 ? 1 : -1) * 14, duration: 1.4, ease: 'power1.in' }, i * 0.35 + 1.1);
    });
  };

  // ---------- 文字を1文字ずつの <span> に(時刻と同じ並び) ----------
  const spell = (el, text) => {
    el.innerHTML = '';
    const out = [];
    let line = document.createElement('span'); line.className = 'ln'; el.appendChild(line);
    [...text].forEach((c) => {
      if (c === '\n') { out.push(null); line = document.createElement('span'); line.className = 'ln'; el.appendChild(line); return; }
      const s = document.createElement('span'); s.className = 'ch'; s.textContent = c === ' ' ? '\u00A0' : c;   // 空白は詰まらないように
      line.appendChild(s); out.push(s);
    });
    return out;   // text の1文字ごと(改行は null)
  };
  // 文字がインクのようににじみ出る。動画では読まれる時刻に、Web ではリズムよく順に
  const inkIn = (tl, span, at, extra = {}) => tl.from(span, { opacity: 0, y: 6, filter: 'blur(7px)', color: C.gold, duration: 0.55, ease: 'power2.out', ...extra }, at);
  const say = (info, at0 = 0.25) => {
    const text = info.lines.map((l) => l.screen).join('');
    const spans = spell(textEl, text);
    const tl = gsap.timeline();
    let k = 0, first = Infinity;
    info.lines.forEach((l) => {
      [...l.screen].forEach((c, i) => {
        const s = spans[k++];
        if (!s) return;
        const at = video ? l.at + l.times[i] : at0 + 0.1 + k * 0.055;
        first = Math.min(first, at);
        inkIn(tl, s, at);
      });
    });
    tl.to(textEl, { opacity: 1, duration: 0.3 }, Math.max(0, first - 0.3));
    return tl;
  };
  const hideText = () => gsap.to(textEl, { opacity: 0, duration: 0.3 });

  // ---------- 場面転換:光の粒があふれて画面を覆い、引くと次の場面 ----------
  const FLOOD_MID = 0.6;   // めくり始めから、画面が覆われる(場面が入れ替わる)までの秒
  const blobs = Array.from({ length: 28 }, () => {
    const b = document.createElement('i');
    const size = 38 + rand() * 46;
    b.style.width = b.style.height = `${size}vmax`;
    b.style.left = `${rand() * 100 - size / 2}vw`; b.style.top = `${rand() * 100 - size / 2}vh`;
    floodEl.appendChild(b); return b;
  });
  const flood = (onMid) => gsap.timeline()
    .set(blobs, { opacity: 1 })
    .fromTo(blobs, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'power2.out', stagger: { each: 0.005, from: 'center' } })
    .call(onMid, null, FLOOD_MID)
    .to(blobs, { opacity: 0, scale: 1.2, duration: 0.42, ease: 'power1.out', stagger: { each: 0.004, from: 'random' } }, FLOOD_MID + 0.05);

  // ---------- もこ:2〜3秒でふわふわ揺れる ----------
  gsap.to(mokoSvg, { y: -10, rotation: 2, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.sun .rays', { rotation: 360, duration: 40, repeat: -1, ease: 'none', svgOrigin: '100 100' });
  const rainLoop = gsap.fromTo('#drops path', { y: -40, opacity: 0 }, { y: 120, opacity: 1, duration: 0.7, stagger: { each: 0.05, repeat: -1 }, ease: 'none', paused: true });

  // ---------- カメラ(world を動かす):el を画面の (fx, fy) の位置に、倍率 s で ----------
  const cam = (el, s, d, fx = 0.5, fy = 0.5, ease = 'power2.inOut') => {
    const ws = gsap.getProperty(world, 'scale'), wr = world.getBoundingClientRect(), r = el.getBoundingClientRect();
    const cx = (r.left - wr.left + r.width / 2) / ws, cy = (r.top - wr.top + r.height / 2) / ws;
    return gsap.to(world, { scale: s, x: innerWidth * fx - s * cx, y: innerHeight * fy - s * cy, duration: d, ease });
  };
  const camHome = (d, ease = 'power2.inOut') => gsap.to(world, { scale: 1, x: 0, y: 0, duration: d, ease });

  // ---------- 各ページの状態 ----------
  const skyTo = (s1, s2, s3, d = 1.2) => gsap.to(sky, { '--s1': s1, '--s2': s2, '--s3': s3, duration: d });
  const SKY = { blue: ['#8ED0EA', '#BFE5F4', '#FFF6E6'], dry: ['#F3DFA8', '#F8ECC8', '#FFF6E6'], rain: ['#9FC3D9', '#C6DCE8', '#F3EEE2'] };
  const setSky = (k) => gsap.set(sky, { '--s1': SKY[k][0], '--s2': SKY[k][1], '--s3': SKY[k][2] });
  setSky('blue');
  sky.style.background = 'linear-gradient(180deg, var(--s1) 0%, var(--s2) 45%, var(--s3) 82%)';
  const BROWS = { sad: 'M80 73 l12 -3 M124 73 l-12 -3', firm: 'M80 70 l12 3 M124 70 l-12 3' };
  const MOUTH = { smile: 'M95 96 q7 6 14 0', o: 'M98 98 q4 -5 8 0 q-4 5 -8 0', firm: 'M96 98 q6 -3 12 0', worry: 'M96 99 q6 -4 12 0' };

  const resetWorld = () => {
    gsap.killTweensOf([world, '#far', '#hills', '#field', moko, flower, head, petals, '#dry', '#buds g', '#rain', '#sun', '#rainbow', '.rb', '#mokoBrows', '#mokoEyes', '#mokoMouth', ghost, gusts, sky, titleEl]);
    gsap.set(world, { scale: 1, x: 0, y: 0, transformOrigin: '0 0' });
    gsap.set(['#far', '#hills', '#field'], { xPercent: 0 });
    gsap.set(moko, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
    gsap.set('#mokoBrows', { opacity: 0, attr: { d: BROWS.firm } }); gsap.set('#mokoEyes', { x: 0, y: 0 });
    gsap.set('#mokoMouth', { attr: { d: MOUTH.smile } });
    gsap.set('#rain', { opacity: 0 }); rainLoop.pause(); gsap.set(mokoSvg, { scaleX: 1, scaleY: 1 });
    gsap.set('#sun', { opacity: 0, scale: 0.6 });
    gsap.set('#rainbow', { opacity: 0 }); gsap.set('.rb', { drawSVG: '100%' });
    gsap.set('#dry', { opacity: 0 });
    gsap.set('#buds g', { scale: 1, transformOrigin: '50% 50%' });
    gsap.set(flower, { opacity: 0 });
    gsap.set(head, { rotation: 0, svgOrigin: '80 128' });
    gsap.set(petals, { fill: C.pink, scale: 1 });
    gsap.set('.eye-sad', { opacity: 1 }); gsap.set(['.eye-happy', '.mouth-happy'], { opacity: 0 });
    gsap.set([burstEl, titleEl], { opacity: 0 }); burstEl.innerHTML = '';
    gsap.set(ending, { autoAlpha: 0 });
    gsap.set(gusts, { opacity: 0 }); gsap.set(ghost, { opacity: 0 });
    setSky('blue');
    motes.density = 0.6; motes.petals = 0; motes.speed = 1;
  };
  const LAYERS = ['#far', '#hills', '#field'];
  const settled = () => gsap.set(LAYERS, { xPercent: (i) => [-5, -10, -16][i] });
  // からからの のはら(3〜6ページで共通)
  const dryWorld = () => {
    settled(); setSky('dry');
    gsap.set(flower, { opacity: 1 }); gsap.set(head, { rotation: 112 }); gsap.set(petals, { fill: C.wilt });
    gsap.set('#dry', { opacity: 1 }); gsap.set('#buds g', { scale: 0 }); gsap.set('#sun', { opacity: 1, scale: 1 });
  };
  // 画面の文字のうち、ある言葉が読まれる時刻(ページの中の秒)
  const when = (info, word) => {
    // Web では読む速さの見込み(声の長さを文字数でわる)で
    for (const l of info.lines) { const i = l.screen.indexOf(word); if (i >= 0) return l.at + (video ? l.times[i] : (l.end - l.at) * i / l.screen.length); }
    return info.vStart;
  };

  const PAGES = [
    { // 0 表紙:題字と「AI と コードで つくった えほん」は最初のコマから見えている
      enter(info) {
        gsap.set(titleEl, { opacity: 1 });
        motes.density = 1;
        gsap.set(world, { scale: 1.08, x: -innerWidth * 0.04, y: -innerHeight * 0.03 });
        return gsap.timeline()
          .add(camHome(info.dur, 'sine.out'), 0)
          .fromTo(titleEl.querySelector('.t2'), { textShadow: '0 6px 0 rgba(106,86,76,.18), 0 0 20px rgba(246,198,91,.5)' }, { textShadow: '0 6px 0 rgba(106,86,76,.18), 0 0 46px rgba(246,198,91,.95)', duration: 1.2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0);
      },
    },
    { // 1 そらを おさんぽ
      word: 'ふわふわ',
      enter(info) {
        return gsap.timeline()
          .fromTo(moko, { x: '-14vw' }, { x: '4vw', duration: info.dur, ease: 'sine.inOut' }, 0)
          .to('#far', { xPercent: -5, duration: info.dur, ease: 'none' }, 0)
          .to('#hills', { xPercent: -10, duration: info.dur, ease: 'none' }, 0)
          .to('#field', { xPercent: -16, duration: info.dur, ease: 'none' }, 0)
          .add(say(info), 0);
      },
    },
    { // 2 かぜに とばされる:強い風で くるくる回りながら遠くへ。着いたところで ぽふっ
      word: 'びゅうっ',
      enter(info) {
        const land = info.vEnd + 0.6;
        gsap.set(LAYERS, { xPercent: (i) => [5, 10, 16][i] });
        return gsap.timeline()
          .add(blowGusts(land), 0)
          .to('#mokoMouth', { attr: { d: MOUTH.o }, duration: 0.2 }, 0.3)
          // 右へ飛ばされて消え、左から くるくる 回りながら戻ってくる
          .to(moko, { x: '75vw', y: '-6vh', rotation: 540, duration: 2.2, ease: 'power2.in' }, 0.4)
          .set(moko, { x: '-75vw', y: '4vh' }, 2.6)
          .to(moko, { x: '-6vw', y: '0vh', rotation: 1080, duration: land - 2.8, ease: 'power3.out' }, 2.6)
          .to(LAYERS, { xPercent: (i) => [-5, -10, -16][i], duration: land - 0.4, ease: 'power2.inOut' }, 0.4)
          .to(mokoSvg, { scaleX: 1.14, scaleY: 0.84, transformOrigin: '50% 100%', duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' }, land)
          .to('#mokoMouth', { attr: { d: MOUTH.smile }, duration: 0.3 }, land + 0.2)
          .add(say(info), 0);
      },
    },
    { // 3 からからの のはら
      enter(info) {
        dryWorld(); setSky('blue');
        gsap.set('#sun', { opacity: 0, scale: 0.6 }); gsap.set('#dry', { opacity: 0 }); gsap.set(petals, { fill: C.pink }); gsap.set(head, { rotation: 40 });
        gsap.set(moko, { x: '-6vw' });
        return gsap.timeline()
          .add(skyTo(...SKY.dry, 1.6), 0)
          .to('#dry', { opacity: 1, duration: 1.6 }, 0)
          .to('#sun', { opacity: 1, scale: 1, duration: 1.2, ease: 'back.out(1.6)' }, 0.2)
          .to(head, { rotation: 112, duration: 2.0, ease: 'power2.inOut' }, 0.3)
          .to(petals, { fill: C.wilt, duration: 1.6 }, 0.3)
          .to('#mokoEyes', { y: 3, duration: 0.6 }, 1.2)
          .add(cam(flower, 1.14, 3.2, 0.5, 0.58), 0.6)
          .to(head, { rotation: 118, duration: 1.6, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 2.4)
          .add(say(info), 0);
      },
    },
    { // 4 まよう:ちいさく なった じぶんを 想像して、すこし まよう
      enter(info) {
        dryWorld();
        gsap.set(moko, { x: '-6vw' }); gsap.set('#mokoEyes', { y: 3 });
        const small = when(info, 'ちいさく');
        const mr = moko.getBoundingClientRect(), wr = world.getBoundingClientRect();
        gsap.set(ghost, { left: mr.left - wr.left + mr.width * 0.62, top: mr.top - wr.top + mr.height * 0.42, width: mr.width * 0.5 });
        return gsap.timeline()
          .to('#mokoBrows', { opacity: 1, attr: { d: BROWS.sad }, duration: 0.4 }, 0.3)
          .to('#mokoMouth', { attr: { d: MOUTH.worry }, duration: 0.4 }, 0.3)
          .to('#mokoEyes', { x: 4, y: 4, duration: 0.6, ease: 'sine.inOut' }, 0.6)            // おはなを みる
          .to('#mokoEyes', { x: -3, y: 1, duration: 0.6, ease: 'sine.inOut' }, small - 0.4)  // じぶんを みる
          .fromTo(ghost, { opacity: 0, scale: 0.8 }, { opacity: 0.45, scale: 1, duration: 0.7, ease: 'power2.out' }, small)
          .to(ghost, { y: -8, duration: 1.2, yoyo: true, repeat: 1, ease: 'sine.inOut' }, small + 0.7)
          .to(ghost, { opacity: 0, duration: 0.9 }, small + 2.8)
          .to('#mokoEyes', { x: 4, y: 4, duration: 0.6, ease: 'sine.inOut' }, small + 3.4)
          .to(moko, { scale: 0.96, duration: 1.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, small + 3.6)
          .add(cam(moko, 1.22, info.dur - 0.6, 0.5, 0.42, 'sine.inOut'), 0.4)
          .add(say(info), 0);
      },
    },
    { // 5 きめた:「でも……」のあと、文字が画面いっぱいに広がり、光が弾ける
      enter(info) {
        dryWorld();
        gsap.set(moko, { x: '-6vw' }); gsap.set('#mokoBrows', { opacity: 1, attr: { d: BROWS.sad } }); gsap.set('#mokoMouth', { attr: { d: MOUTH.worry } });
        const l = info.lines[0];
        burstEl.innerHTML = '<p></p>';
        const spans = spell(burstEl.querySelector('p'), l.screen);
        gsap.set(burstEl, { opacity: 1 });
        const go = video ? when(info, 'ぼ') : 1.4;
        const tl = gsap.timeline();
        [...l.screen].forEach((c, i) => {
          const s = spans[i]; if (!s) return;
          const at = video ? l.at + l.times[i] : (c === 'ぼ' || i > l.screen.indexOf('ぼ') ? go : 0.3 + i * 0.12);
          if (i < l.screen.indexOf('ぼ')) inkIn(tl, s, at, { scale: 0.8 });
          else tl.from(s, { opacity: 0, scale: 0.15, x: (rand() - 0.5) * 120, y: (rand() - 0.5) * 120, duration: 1.1, ease: 'expo.out' }, at);
        });
        return tl
          .to('#mokoBrows', { attr: { d: BROWS.firm }, duration: 0.25 }, go - 0.2)
          .to('#mokoMouth', { attr: { d: MOUTH.firm }, duration: 0.25 }, go - 0.2)
          .to(moko, { scale: 1.15, duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out' }, go - 0.1)
          .call(() => { motes.density = 1; motes.speed = 4; }, null, go)
          .to(world, { scale: 1.08, x: -innerWidth * 0.04, y: -innerHeight * 0.03, duration: 0.5, ease: 'power3.out' }, go)
          .to(burstEl.querySelectorAll('.ch'), { scale: 1.06, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: 1 }, go + 1.1)
          .call(() => { motes.speed = 1.4; }, null, go + 1.6);
      },
    },
    { // 6 あめに なる:もこに寄り、雨と一緒に下の花へ降りる。声のあとも雨は降り続く
      word: 'ポツポツ',
      enter(info) {
        dryWorld();
        gsap.set(moko, { x: '-6vw' }); gsap.set('#mokoBrows', { opacity: 1, attr: { d: BROWS.firm } }); gsap.set('#mokoMouth', { attr: { d: MOUTH.firm } });
        rainLoop.play(0);
        const down = info.lines[1].at;
        return gsap.timeline()
          .add(skyTo(...SKY.rain, 1.2), 0)
          .to('#sun', { opacity: 0, scale: 0.6, duration: 0.8 }, 0)
          .to('#rain', { opacity: 1, duration: 0.5 }, 0.2)
          .add(cam(moko, 1.36, 1.6, 0.5, 0.42), 0)
          .to(mokoSvg, { scaleX: 1.08, scaleY: 0.86, transformOrigin: '50% 100%', duration: 0.5, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 0.6)
          .to(moko, { scale: 0.72, duration: info.dur - 1, ease: 'sine.inOut' }, 0.8)
          .add(cam(flower, 1.18, 3.0, 0.5, 0.6, 'sine.inOut'), down)
          .to('#dry', { opacity: 0.4, duration: info.dur - 1.5, ease: 'none' }, 1.2)
          .to(head, { rotation: 96, duration: info.dur - 2, ease: 'sine.inOut' }, 2)
          .add(say(info), 0);
      },
    },
    { // 7 おはなが わらう:花が顔を上げ、つぼみが次々ひらく。花から引いて野原全体へ
      word: 'キラキラ',
      enter(info) {
        settled(); setSky('rain');
        gsap.set(flower, { opacity: 1 }); gsap.set(head, { rotation: 96 }); gsap.set(petals, { fill: C.wilt });
        gsap.set('#dry', { opacity: 0.4 }); gsap.set('#buds g', { scale: 0 });
        gsap.set(moko, { x: '-14vw', y: '-6vh', scale: 0.72 });
        motes.petals = 1;
        cam(flower, 1.3, 0, 0.5, 0.55).progress(1);
        return gsap.timeline()
          .add(skyTo(...SKY.blue, 1.6), 0)
          .to('#dry', { opacity: 0, duration: 1.6 }, 0)
          .to(head, { rotation: 0, duration: 1.4, ease: 'back.out(1.4)' }, 0.2)
          .to(petals, { fill: C.pink, duration: 1 }, 0.4)
          .fromTo(petals, { scale: 0.7, transformOrigin: '50% 100%' }, { scale: 1.12, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.06 }, 0.5)
          .to('.eye-sad', { opacity: 0, duration: 0.2 }, 0.9).to(['.eye-happy', '.mouth-happy'], { opacity: 1, duration: 0.3 }, 0.9)
          .add(camHome(4.2), 1.2)
          .to('#buds g', { scale: 1, duration: 0.7, ease: 'back.out(2.4)', stagger: { each: (info.dur - 3) / 5 } }, 1.6)
          .to(head, { rotation: 6, duration: 1.2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 2.2)
          .add(say(info), 0);
      },
    },
    { // 8 もとの もこへ:おひさまが照らし、光の粒が空へのぼって、もこが ふわふわに戻る。虹がかかる
      enter(info) {
        settled();
        gsap.set(flower, { opacity: 1 }); gsap.set(['.eye-happy', '.mouth-happy'], { opacity: 1 }); gsap.set('.eye-sad', { opacity: 0 });
        gsap.set(moko, { x: '-14vw', y: '-6vh', scale: 0.72 });
        motes.petals = 1;
        const back = when(info, 'もどった');
        gsap.set(world, { scale: 1.16, x: -innerWidth * 0.08, y: -innerHeight * 0.2 });   // 地面のあたりから
        return gsap.timeline()
          .to('#sun', { opacity: 1, scale: 1, duration: 1.4, ease: 'back.out(1.6)' }, 0.2)
          .call(() => { motes.density = 1; motes.speed = 3; }, null, 0.4)
          .add(camHome(info.vEnd - 0.6, 'sine.inOut'), 0.3)                                      // 空へ、ゆっくり上へ
          .to(moko, { scale: 1.04, x: '-4vw', y: '0vh', duration: 1.6, ease: 'elastic.out(1, 0.55)' }, back - 0.3)
          .to(mokoSvg, { scaleX: 1.1, scaleY: 0.9, transformOrigin: '50% 100%', duration: 0.3, yoyo: true, repeat: 1 }, back + 0.2)
          .to('#rainbow', { opacity: 1, duration: 0.3 }, info.vEnd - 0.4)
          .fromTo('.rb', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.8, ease: 'power2.out', stagger: 0.14 }, info.vEnd - 0.4)
          .call(() => { motes.speed = 1.2; }, null, info.vEnd + 1.6)
          .add(say(info), 0);
      },
    },
    { // 9 おしまい
      enter(info) {
        settled();
        gsap.set(flower, { opacity: 1 }); gsap.set(['.eye-happy', '.mouth-happy'], { opacity: 1 }); gsap.set('.eye-sad', { opacity: 0 });
        gsap.set('#rainbow', { opacity: 1 }); gsap.set('#sun', { opacity: 1, scale: 1 }); gsap.set(moko, { scale: 1.04, x: '-4vw' });
        motes.petals = 1; motes.density = 1;
        const l = info.lines[0];
        const owari = ending.querySelector('.owari');
        const spans = spell(owari, l.screen);
        const tl = gsap.timeline().to(ending, { autoAlpha: 1, duration: 0.4 }, Math.max(0, (video ? l.at : 0.1) - 0.3));
        spans.forEach((s, i) => s && tl.from(s, { opacity: 0, scale: 0.5, filter: 'blur(8px)', duration: 0.8, ease: 'back.out(1.8)' }, video ? l.at + l.times[i] : 0.1 + i * 0.12));
        return tl.from(['.again', '.credit'], { opacity: 0, y: 10, duration: 0.6, stagger: 0.15 }, video ? l.end + 0.5 : 0.8)
          .to(world, { scale: 1.04, duration: info.dur, ease: 'sine.inOut' }, 0);
      },
    },
  ];

  // ---------- よみきかせ(ボタンを押したときだけ。ページをめくったら止める) ----------
  const audios = {};
  const audio = (id) => (audios[id] ||= Object.assign(new Audio(N.lines[id].file), { preload: 'none' }));
  let reading = null;
  const stopReading = () => {
    if (!reading) return;
    reading.cancelled = true;
    reading.timer && clearTimeout(reading.timer);
    Object.values(audios).forEach((a) => { a.pause(); a.currentTime = 0; });
    reading = null;
    readBtn.classList.remove('playing'); readBtn.setAttribute('aria-pressed', 'false');
  };
  const readPage = (n) => {
    if (reading) { stopReading(); return; }
    const ids = N.pages[n].lines;
    const job = (reading = { cancelled: false, timer: null });
    readBtn.classList.add('playing'); readBtn.setAttribute('aria-pressed', 'true');
    const play = (i) => {
      if (job.cancelled) return;
      if (i >= ids.length) { stopReading(); return; }
      const a = audio(ids[i]);
      a.currentTime = 0;
      a.onended = () => { job.timer = setTimeout(() => play(i + 1), 1200); };   // 「ぽつ、ぽつ、ぽつ。」のあとは 1.2 秒あける
      a.play().catch(() => stopReading());
    };
    play(0);
  };

  // ---------- ページ送り ----------
  let page = -1, pageTl = null, busy = false;
  dotsEl.innerHTML = PAGES.map(() => '<i></i>').join('');
  const dots = [...dotsEl.children];
  const apply = (n) => {
    stopReading();
    pageTl?.kill(); hideText();
    resetWorld();
    page = n;
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    showWords(reduce ? null : PAGES[n].word);
    pageTl = PAGES[n].enter(pageInfo[n]);
    if (reduce) pageTl.progress(1);
  };
  const goTo = (n) => {
    if (busy || n === page) return;
    busy = true;
    flood(() => apply(n)).call(() => { busy = false; });
  };
  const next = () => { if (page < PAGES.length - 1) goTo(page + 1); };

  const ripple = (x, y) => {
    const r = document.createElement('i');
    r.style.left = `${x}px`; r.style.top = `${y}px`;
    tapsEl.appendChild(r);
    gsap.fromTo(r, { scale: 0.3, opacity: 1 }, { scale: 1.4, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => r.remove() });
  };

  if (!demo) {
    let sx = null;
    book.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    book.addEventListener('pointerup', (e) => {
      if (e.target.closest('button, a')) return;
      if (sx !== null && Math.abs(e.clientX - sx) > 40 && e.clientX > sx) return; // 右スワイプは無視
      ripple(e.clientX, e.clientY); next();
    });
    addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { if (e.target.closest?.('button')) return; e.preventDefault(); next(); } });
    $('next').addEventListener('click', (e) => { e.stopPropagation(); next(); });
    readBtn.addEventListener('click', (e) => { e.stopPropagation(); readPage(page); });
    $('again').addEventListener('click', (e) => { e.stopPropagation(); goTo(0); });
  }

  const start = () => {
    apply(Math.min(startPage, PAGES.length - 1));
    if (video) {
      // 動画の撮影用:場面の切り替え(前の声の終わりと次の声の始まりの中間)で光があふれて覆うように
      VT.pages.forEach((t, i) => { if (i > 0) gsap.delayedCall(t - FLOOD_MID, () => goTo(i)); });
    }
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
