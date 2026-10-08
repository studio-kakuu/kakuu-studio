// KAKUU STUDIO — 制作過程ショート動画レンダラー
// 使い方: node render.mjs --theme cafe [--platform instagram,tiktok,x] [--preview] [--keep-frames]
// 必要なもの: Node.js 18+, ffmpeg, `npm install` と `npx playwright install chromium`
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync, createReadStream } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');            // リポジトリ直下
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// ---------- 引数 ----------
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const slug = opt('theme', 'cafe');
const platforms = String(opt('platform', 'instagram,tiktok,x')).split(',');
const preview = !!opt('preview', false);       // 5fps の確認用(速い)
const keep = !!opt('keep-frames', false);

// ---------- 設定の読み込み ----------
const common = JSON.parse(readFileSync(join(HERE, '../themes/_common.json'), 'utf8'));
const theme = JSON.parse(readFileSync(join(HERE, `../themes/${slug}.json`), 'utf8'));
const timeFile = join(ROOT, `works/${slug}/measured_time.txt`);
const m = readFileSync(timeFile, 'utf8').match(/^hook_minutes:\s*(\d+)/m);
if (!m) throw new Error(`${timeFile} に hook_minutes がありません`);
const minutes = Number(m[1]);
const fill = (s) => s.replaceAll('{theme}', theme.theme).replaceAll('{keyword}', theme.keyword).replaceAll('{minutes}', minutes);

const fps = preview ? 5 : common.fps;
const duration = common.timeline.closing[1];
if (duration < 61 || duration > 75) throw new Error(`尺 ${duration}s は 61〜75 秒の範囲外です`);
const totalFrames = Math.round(duration * fps);
const closingStart = Math.round(common.timeline.closing[0] * fps);

const config = {
  ...common,
  ...theme,
  minutes,
  hook: fill(common.hookTemplate),
  urlNotice: common.urlNotice,
  closingText: '',
  pages: {
    final: `/works/${slug}/`,
    step1: `/works/${slug}/step1/`,
    step2: `/works/${slug}/step2/`,
  },
};

// ---------- 静的サーバー(リポジトリ直下を配信) ----------
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream' });
  createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------- レンダリング ----------
const outDir = join(HERE, '../out');
const frameRoot = join(outDir, `frames_${slug}`);
rmSync(frameRoot, { recursive: true, force: true });
const dirs = Object.fromEntries(platforms.map((p) => [p, join(frameRoot, p)]));
Object.values(dirs).forEach((d) => mkdirSync(d, { recursive: true }));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: common.width, height: common.height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.warn('[page error]', e.message));
await page.clock.install({ time: 0 });          // setTimeout / rAF / Date を動画の時刻に固定
await page.goto(`${base}/video/render/stage.html`, { waitUntil: 'load' });
await page.evaluate((c) => window.setup(c), config);
await page.waitForTimeout(500);

const pad = (n) => String(n).padStart(5, '0');
let clockMs = 0;
const t0 = Date.now();
for (let f = 0; f < totalFrames; f++) {
  const target = Math.round((f * 1000) / fps);
  if (target > clockMs) { await page.clock.runFor(target - clockMs); clockMs = target; }
  await page.evaluate((t) => window.renderFrame(t), f / fps);
  if (f < closingStart) {
    // 共通部分:1回撮って全媒体にコピー
    const buf = await page.screenshot({ type: 'png' });
    for (const p of platforms) writeFileSync(join(dirs[p], `${pad(f)}.png`), buf);
  } else {
    // 締め:媒体ごとに文言を差し替えて撮る
    for (const p of platforms) {
      await page.evaluate(([html]) => { const el = document.getElementById('closing'); el.innerHTML = html; window.fitText(el, 60); }, [closingHtml(p)]);
      await page.screenshot({ path: join(dirs[p], `${pad(f)}.png`), type: 'png' });
    }
  }
  if (f % fps === 0) process.stdout.write(`\r  ${(f / fps).toFixed(0)}s / ${duration}s  (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
}
process.stdout.write('\n');
await browser.close();
server.close();

function closingHtml(p) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const kw = `『${theme.keyword}』`;
  return esc(fill(common.closing[p])).split(esc(kw)).join(`<em>${esc(kw)}</em>`);
}

// ---------- 書き出し(ffmpeg) ----------
for (const p of platforms) {
  const out = join(outDir, `${slug}_${p}${preview ? '_preview' : ''}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(fps), '-i', join(dirs[p], '%05d.png'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-r', String(fps), '-an', '-movflags', '+faststart',
    out,
  ], { stdio: 'inherit' });
  console.log('  ->', out);
}
if (!keep) rmSync(frameRoot, { recursive: true, force: true });
