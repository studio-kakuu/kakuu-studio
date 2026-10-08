import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useAnimationFrame, useReducedMotion } from 'motion/react';
import stats from './stats.json';

// ---------- 本物の数字(scripts/collect-stats.mjs がリポジトリから集計) ----------
const pad = (n) => String(n).padStart(2, '0');
const mmss = (s) => `${Math.floor(s / 60)}分${pad(s % 60)}秒`;
const site = stats.measured.find((m) => m.slug === 'cafe');

const UNITS = [
  { code: 'PLANNING', ja: '企画', done: stats.works, doneLabel: '公開', queue: stats.inProgress, queueLabel: '制作中',
    logs: ['toolbox/README.md → 道具を選ぶ', null] },
  { code: 'DESIGN', ja: 'デザイン', done: stats.designs, doneLabel: '完了', queue: null,
    logs: ['frontend-design', '色と文字を作品ごとに決める'] },
  { code: 'BUILD', ja: '制作', done: stats.pages, doneLabel: 'ページ', queue: null,
    logs: ['GSAP 3.15 + Lenis 1.3', site ? `cafe v2 実測 ${mmss(site.seconds)}` : 'HTML / CSS / SVG'] },
  { code: 'MOTION', ja: '映像', done: stats.videos, doneLabel: '動画', queue: stats.worksWithoutVideo, queueLabel: '待機',
    logs: ['Remotion 4.0', 'Playwright で1コマずつ撮影'] },
  { code: 'PUBLISH', ja: '公開', done: stats.mergedPRs, doneLabel: 'PR', queue: null,
    logs: ['GitHub Pages', `PR ${stats.prRange} merged`] },
  { code: 'REACH', ja: '届ける', done: stats.captions, doneLabel: '投稿文', queue: 0, queueLabel: '承認待ち',
    logs: [stats.platformNames.map((p) => ({ instagram: 'Instagram', tiktok: 'TikTok', x: 'X' }[p] || p)).join(' / '), 'ManyChat:コメント → DM'] },
];
const DEMO_TEXT = '架空のカフェのサイトを作って';

// 効果音のタイミング記録(動画の撮影スクリプトが読む。画面では音は鳴らさない)
const sfx = (type, unit) => { (window.__sfx ||= []).push({ type, unit, t: performance.now() }); };

const STATE_LABEL = { idle: 'STANDBY', proc: 'PROCESSING', done: 'DONE', await: 'AWAITING', approved: 'APPROVED' };

// ---------- 中央コア ----------
function Core({ lit, reduce }) {
  const R = 92;
  const segs = UNITS.map((_, i) => {
    const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2 + 0.06, a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2 - 0.06;
    const r = 78;
    return `M ${100 + r * Math.cos(a0)} ${100 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${100 + r * Math.cos(a1)} ${100 + r * Math.sin(a1)}`;
  });
  const spin = (dur, dir = 1) => (reduce ? {} : { animate: { rotate: 360 * dir }, transition: { duration: dur, ease: 'linear', repeat: Infinity } });
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="cg"><stop offset="0" stopColor="#C6FF3D" stopOpacity=".16" /><stop offset="1" stopColor="#C6FF3D" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#cg)" />
      <motion.g style={{ originX: '100px', originY: '100px' }} {...spin(60)}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(198,255,61,.35)" strokeWidth="1" strokeDasharray="1 5.2" />
        {[0, 90, 180, 270].map((d) => (
          <rect key={d} x="99" y={100 - R - 4} width="2" height="8" fill="#C6FF3D" transform={`rotate(${d} 100 100)`} />
        ))}
      </motion.g>
      <motion.g style={{ originX: '100px', originY: '100px' }} {...spin(24, -1)}>
        <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" strokeDasharray="40 14 4 14" />
      </motion.g>
      {segs.map((d, i) => (
        <motion.path key={i} d={d} fill="none" strokeWidth="3" strokeLinecap="round"
          animate={{ stroke: lit[i] ? '#C6FF3D' : 'rgba(255,255,255,.16)', opacity: lit[i] ? 1 : 0.9 }} transition={{ duration: 0.4 }}
          style={{ filter: lit[i] ? 'drop-shadow(0 0 4px rgba(198,255,61,.8))' : 'none' }} />
      ))}
      <motion.circle cx="100" cy="100" r="62" fill="none" stroke="rgba(198,255,61,.5)" strokeWidth=".8"
        animate={reduce ? {} : { opacity: [0.25, 0.9, 0.25], scale: [1, 1.03, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '100px', originY: '100px' }} />
    </svg>
  );
}

// ---------- 波形(NEURAL ACTIVITY) ----------
function Wave({ energy }) {
  const ref = useRef(null);
  const e = useRef(energy);
  useEffect(() => { animate(e.current, energy, { duration: 0.8, onUpdate: (v) => { e.current = v; } }); }, [energy]);
  useAnimationFrame((t) => {
    if (!ref.current) return;
    const s = t / 1000, pts = [];
    for (let x = 0; x <= 300; x += 3) {
      const k = x / 300, env = Math.sin(Math.PI * k);
      const y = 17 + env * (e.current * 11) * (Math.sin(x * 0.09 + s * 5.2) * 0.6 + Math.sin(x * 0.23 - s * 8.1) * 0.3 + Math.sin(x * 0.041 + s * 2.3) * 0.4)
        + env * 1.4 * Math.sin(x * 0.5 + s * 11);
      pts.push(`${x},${y.toFixed(2)}`);
    }
    ref.current.setAttribute('points', pts.join(' '));
  });
  return (
    <svg className="wave" viewBox="0 0 300 34" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="17" x2="300" y2="17" stroke="rgba(198,255,61,.12)" />
      <polyline ref={ref} fill="none" stroke="#C6FF3D" strokeWidth="1.3" style={{ filter: 'drop-shadow(0 0 3px rgba(198,255,61,.7))' }} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---------- 部署カード ----------
function Unit({ u, i, state, task, countKey, onRef, reduce }) {
  const doneRef = useRef(null);
  useEffect(() => {
    if (!countKey || !doneRef.current) return;
    const c = animate(0, u.done, { duration: 2.2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { if (doneRef.current) doneRef.current.textContent = pad(Math.round(v)); } });
    return () => c.stop();
  }, [countKey, u.done]);
  const hot = state === 'proc' || state === 'await';
  const queue = u.code === 'REACH' ? (state === 'await' ? 1 : 0) : u.queue;
  const logs = [u.logs[0], u.logs[1] ?? (task ? `brief:「${task}」` : '次の依頼を待っています')];
  if (u.code === 'REACH' && state === 'await') logs[1] = '投稿の承認待ち(人が確認して投稿)';
  if (u.code === 'REACH' && state === 'approved') logs[1] = '承認済み → 投稿は人の手で';
  return (
    <motion.article ref={onRef} className={`unit${hot ? ' hot' : ''}`}
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.35 + i * 0.16, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
      {state === 'proc' && !reduce && (
        <motion.div className="scan" initial={{ top: '-40%' }} animate={{ top: '120%' }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }} />
      )}
      <div className="unit-top">
        <div>
          <div className="unit-name"><span>{pad(i + 1)}</span>{u.code}</div>
          <div className="unit-ja">{u.ja}</div>
        </div>
        <div className={`state${state !== 'idle' ? ' on' : ''}`}>
          <motion.i className={`dot${state === 'idle' ? ' off' : ''}`}
            animate={reduce ? {} : { opacity: hot ? [1, 0.15, 1] : [1, 0.55, 1] }}
            transition={{ duration: hot ? 0.5 : 2.2 + i * 0.25, repeat: Infinity }} />
          {STATE_LABEL[state]}
        </div>
      </div>
      <div className="nums">
        <div className="num"><b className="done" ref={doneRef}>{pad(u.done)}</b>{u.doneLabel}</div>
        <div className="num"><b>{queue === null ? '—' : pad(queue)}</b>{u.queueLabel || '待機'}</div>
      </div>
      {logs.map((l, k) => <div className="log" key={k}>{l}</div>)}
    </motion.article>
  );
}

export default function App() {
  const reduce = useReducedMotion();
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const [states, setStates] = useState(() => UNITS.map(() => 'idle'));
  const [counts, setCounts] = useState(() => UNITS.map(() => 0));
  const [phase, setPhase] = useState('idle');      // idle | pulse | run | await | approved
  const [text, setText] = useState('');
  const [task, setTask] = useState('');
  const [runId, setRunId] = useState(0);
  const [wires, setWires] = useState(null);
  const stageRef = useRef(null), coreRef = useRef(null), unitRefs = useRef([]);
  const timers = useRef([]);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  // 中央 → 6部署の配線を測る
  const measure = useCallback(() => {
    const s = stageRef.current?.getBoundingClientRect(), c = coreRef.current?.getBoundingClientRect();
    if (!s || !c) return;
    const from = { x: c.left - s.left + c.width / 2, y: c.top - s.top + c.height / 2 };
    const to = unitRefs.current.map((el) => { const r = el.getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 }; });
    setWires({ w: s.width, h: s.height, from, to });
  }, []);
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // 起動時のパネル出現音
  useEffect(() => { UNITS.forEach((_, i) => later(350 + i * 160, () => sfx('panel', i))); return () => timers.current.forEach(clearTimeout); }, []);

  const run = useCallback((input, speed) => {
    const t = input.trim();
    if (!t || (phase !== 'idle' && phase !== 'approved')) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    setTask(t); setText(''); setRunId((n) => n + 1);
    setStates(UNITS.map(() => 'idle')); setPhase('pulse');
    sfx('send'); sfx('pulse');
    const { pulse, gap, proc } = speed;
    UNITS.forEach((_, i) => {
      const start = pulse + i * gap;
      later(start, () => { setPhase('run'); setStates((s) => s.map((v, k) => (k === i ? 'proc' : v))); setCounts((c) => c.map((v, k) => (k === i ? v + 1 : v))); sfx('tick', i); });
      later(start + proc, () => {
        const last = i === UNITS.length - 1;
        setStates((s) => s.map((v, k) => (k === i ? (last ? 'await' : 'done') : v)));
        sfx(last ? 'alert' : 'done', i);
        if (last) setPhase('await');
      });
    });
  }, [phase]);

  const approve = useCallback(() => {
    if (phase !== 'await') return;
    sfx('approve');
    setPhase('approved');
    setStates((s) => s.map((v, k) => (k === UNITS.length - 1 ? 'approved' : v)));
  }, [phase]);

  // ?demo=1:入力から承認まで自動再生(撮影用)
  const runRef = useRef(run); runRef.current = run;
  const approveRef = useRef(approve); approveRef.current = approve;
  useEffect(() => {
    if (!demo) return;
    const T = [];
    const at = (ms, fn) => T.push(setTimeout(fn, ms));
    [...DEMO_TEXT].forEach((_, k) => at(6200 + k * 150, () => { setText(DEMO_TEXT.slice(0, k + 1)); sfx('key'); }));
    at(9000, () => runRef.current(DEMO_TEXT, { pulse: 1200, gap: 2700, proc: 3000 }));
    at(34000, () => approveRef.current());
    return () => T.forEach(clearTimeout);
  }, [demo]);

  const lit = states.map((s) => s === 'done' || s === 'await' || s === 'approved');
  const energy = phase === 'run' || phase === 'pulse' ? 1 : phase === 'await' ? 0.6 : 0.28;
  const echo = phase === 'idle'
    ? <>待機中 — 作りたいものを1行で入力</>
    : phase === 'approved' ? <><b>APPROVED</b> 承認しました。投稿は人が行います</>
    : phase === 'await' ? <><b>REACH</b> 6部署の処理が完了。投稿の承認待ち</>
    : <><b>&gt;</b> {task} — 6部署へ送信</>;

  return (
    <div className="os">
      <header className="hdr">
        <div className="logo"><i />KAKUU OS</div>
        <div className="day">DAY <b>{pad(stats.day)}</b></div>
        <div className="sys"><motion.i className="dot" animate={reduce ? {} : { opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />6/6 ONLINE</div>
      </header>

      <section className="stage" ref={stageRef}>
        <div className="core-row">
          <div className="chips">
            <div className="chip"><b>{pad(stats.works)}</b>WORKS<small>公開作品</small></div>
            <div className="chip"><b>{pad(stats.videos)}</b>VIDEOS<small>書き出した動画</small></div>
          </div>
          <div className="core" ref={coreRef}>
            <Core lit={lit} reduce={reduce} />
            <div className="core-center">
              <motion.div className="core-num" key={phase === 'pulse' ? runId : 'n'} initial={{ scale: phase === 'pulse' ? 1.25 : 1 }} animate={{ scale: 1 }} transition={{ duration: 0.6 }}>{pad(stats.mergedToday)}</motion.div>
              <div className="core-label">MERGED TODAY</div>
              <div className="core-sub">本日マージした変更</div>
            </div>
          </div>
          <div className="chips r">
            <div className="chip"><b>{stats.skills}</b>SKILLS<small>公式スキル</small></div>
            <div className="chip"><b>{stats.commits}</b>COMMITS<small>記録した変更</small></div>
          </div>
        </div>

        <div className="units">
          {[0, 1].map((col) => (
            <div className={`col ${col ? 'r' : 'l'}`} key={col}>
              {UNITS.slice(col * 3, col * 3 + 3).map((u, j) => {
                const i = col * 3 + j;
                return <Unit key={u.code} u={u} i={i} state={states[i]} task={task} countKey={counts[i]} reduce={reduce} onRef={(el) => { unitRefs.current[i] = el; }} />;
              })}
            </div>
          ))}
        </div>

        {wires && (
          <svg className="wires" viewBox={`0 0 ${wires.w} ${wires.h}`} aria-hidden="true">
            {wires.to.map((p, i) => (
              <line key={i} x1={wires.from.x} y1={wires.from.y} x2={p.x} y2={p.y} stroke="rgba(198,255,61,.12)" strokeDasharray="2 4" />
            ))}
            {phase === 'pulse' && wires.to.map((p, i) => (
              <g key={`${runId}-${i}`}>
                <motion.line x1={wires.from.x} y1={wires.from.y} x2={p.x} y2={p.y} stroke="#C6FF3D" strokeWidth="1.2"
                  initial={{ pathLength: 0, opacity: 0.9 }} animate={{ pathLength: 1, opacity: 0 }} transition={{ duration: 1.1, ease: [0.3, 0, 0.2, 1] }} />
                <motion.circle r="4" fill="#C6FF3D" style={{ filter: 'drop-shadow(0 0 6px #C6FF3D)' }}
                  initial={{ cx: wires.from.x, cy: wires.from.y, opacity: 1 }} animate={{ cx: p.x, cy: p.y, opacity: [1, 1, 0] }}
                  transition={{ duration: 1.0, ease: [0.5, 0, 0.2, 1] }} />
              </g>
            ))}
          </svg>
        )}
      </section>

      <div />

      <section className="console" aria-label="コンソール">
        <form className="prompt" onSubmit={(e) => { e.preventDefault(); run(text, { pulse: 900, gap: 650, proc: 1600 }); }}>
          <label htmlFor="cmd">&gt;</label>
          <input id="cmd" value={text} onChange={(e) => setText(e.target.value)} placeholder="例:架空のパン屋のサイトを作って" autoComplete="off" maxLength={40} readOnly={demo} />
          {demo && phase === 'idle' && <motion.i className="caret" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />}
          <button className="send" type="submit" disabled={!text.trim() || !(phase === 'idle' || phase === 'approved')}>SEND</button>
        </form>
        <div className="wave-row"><div className="wave-label">NEURAL<br />ACTIVITY</div><Wave energy={energy} /></div>
        <motion.button type="button" className={`approve${phase === 'await' ? ' armed' : phase === 'approved' ? ' done' : ''}`}
          onClick={approve} disabled={phase !== 'await'}
          animate={phase === 'await' && !reduce ? { boxShadow: ['0 0 0px rgba(198,255,61,0)', '0 0 34px rgba(198,255,61,.85)', '0 0 0px rgba(198,255,61,0)'] } : { boxShadow: '0 0 0px rgba(198,255,61,0)' }}
          transition={phase === 'await' ? { duration: 1.3, repeat: Infinity } : { duration: 0.3 }}>
          {phase === 'approved' ? 'APPROVED' : 'APPROVAL'}
          <small>{phase === 'await' ? '投稿を承認する' : phase === 'approved' ? '投稿は人が行います' : '最後は人が承認して投稿'}</small>
        </motion.button>
        <div className="echo">{echo}</div>
      </section>

      <footer className="foot">
        <span>VISUALIZATION — 実際の制作の流れを可視化した作品です。数字は {stats.asOf} 時点のリポジトリから集計(works.js / videos / captions / git log)</span>
        <span>A work by <a href="../../">KAKUU STUDIO</a></span>
      </footer>
    </div>
  );
}
