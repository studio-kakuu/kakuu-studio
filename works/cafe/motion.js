// YUGE — motion (STEP 3)
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ヒーロータイトルを1文字ずつに分割
  const title = document.querySelector('.hero-title');
  if (title) {
    let i = 0;
    const split = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach((c) => {
            const s = document.createElement('span');
            s.className = 'ch';
            s.style.setProperty('--i', i++);
            s.textContent = c;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else split(n);
      });
    };
    split(title);
  }

  // 同じ親の中で少しずつ遅らせる
  document.querySelectorAll('.steps, .space-grid, .menu-cols, .hero-copy').forEach((group) => {
    group.querySelectorAll(':scope > [data-reveal]').forEach((el, idx) => {
      el.style.setProperty('--d', `${idx * 0.12}s`);
    });
  });

  // スクロールで表示
  const targets = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  // 数字のカウントアップ
  const counters = document.querySelectorAll('.concept-figures b');
  const countUp = (el) => {
    const textNode = el.firstChild;
    const to = parseInt(textNode.textContent, 10);
    if (reduce || Number.isNaN(to)) return;
    const start = performance.now();
    const dur = 1400;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      textNode.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const figs = document.querySelector('.concept-figures');
  if (figs && 'IntersectionObserver' in window) {
    const fio = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { counters.forEach(countUp); fio.disconnect(); }
    }, { threshold: 0.6 });
    fio.observe(figs);
  }

  // スクロール進捗バー + ヒーローの軽いパララックス
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);
  const cup = document.querySelector('.hero-visual svg');
  let ticking = false;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const y = scrollY;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (cup && !reduce && y < innerHeight * 1.2) cup.style.transform = `translateY(${y * 0.08}px)`;
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
})();
