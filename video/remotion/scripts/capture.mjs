// サイトを Playwright で1コマずつ撮影し、Remotion で使う素材動画(public/<slug>/<clip>.mp4)を作る。
// 使い方: node scripts/capture.mjs --theme cafe
// 時計(setTimeout / requestAnimationFrame)を偽物に差し替え、1/30秒ずつ進めて撮るので、GSAP・Canvasの動きも欠けずに残る。
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync, createReadStream, copyFileSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const ROOT = resolve(PROJECT, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
const slug = opt('theme', 'cafe');
const only = opt('clip', null);

const common = JSON.parse(readFileSync(join(ROOT, 'video/themes/_common.json'), 'utf8'));
const theme = JSON.parse(readFileSync(join(ROOT, `video/themes/${slug}.json`), 'utf8'));
// テーマに capture.clips があればそれを使う(scenes 方式)。なければ共通の STEP 1〜3 構成
// テーマに capture.viewport / deviceScaleFactor があればそちら(全画面モードは 540x960 × 2 = 1080x1920)
const viewport = theme.capture?.viewport ?? common.capture.viewport;
const deviceScaleFactor = theme.capture?.deviceScaleFactor ?? common.capture.deviceScaleFactor;
const clips = theme.capture?.clips ?? common.capture.clips;
const fps = common.fps;
const pages = { final: `/works/${slug}/?capture`, step1: `/works/${slug}/step1/`, step2: `/works/${slug}/step2/` };

// ブランドのロゴを public へ
mkdirSync(join(PROJECT, 'public/brand'), { recursive: true });
copyFileSync(join(ROOT, 'brand/logo.svg'), join(PROJECT, 'public/brand/logo.svg'));

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  let f = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream' });
  createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const ease = (x) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;
const outDir = join(PROJECT, 'public', slug);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

for (const clip of clips) {
  if (only && clip.id !== only) continue;
  const tmp = join(outDir, `_frames_${clip.id}`);
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] }, deviceScaleFactor, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.warn('[page error]', e.message));
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);   // 時間を止める(以後は runFor で手動で進める)
  await page.goto(base + (clip.url ?? pages[clip.page]), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (clip.waitFor) await page.waitForFunction(clip.waitFor, null, { timeout: 30000 });   // ページの準備(字体の読みこみなど)が終わるまで待つ
  await page.addStyleTag({ content: 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}' });
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  // keys があれば:要素(sel)の位置を目当てにスクロールする(t 秒でその位置。間は easeInOutSine)。center: true で画面の中央、なければ上端 + top px
  const keys = clip.keys ? await page.evaluate((keys) => keys.map((k) => {
    if (k.sel == null) return { t: k.t, y: k.y ?? 0 };
    const e = document.querySelector(k.sel); const r = e.getBoundingClientRect(); const top = r.top + scrollY;
    return { t: k.t, y: Math.max(0, k.center ? top - (innerHeight - r.height) / 2 + (k.dy ?? 0) : top - (k.top ?? 0)) };
  }), clip.keys) : null;
  const scrollAt = (t) => {
    if (!keys) { const k = ease((t - clip.holdStart) / (clip.seconds - clip.holdStart - clip.holdEnd)); return max * (clip.scroll[0] + (clip.scroll[1] - clip.scroll[0]) * k); }
    let i = keys.findIndex((k) => k.t > t);
    if (i === 0) return keys[0].y;
    if (i < 0) return keys[keys.length - 1].y;
    const a = keys[i - 1], b = keys[i];
    return a.y + (b.y - a.y) * ease((t - a.t) / (b.t - a.t));
  };
  // clicks:t 秒にその要素を押す(タップの丸い波紋を 0.5 秒だけ重ねる)
  const clicks = (clip.clicks ?? []).map((c) => ({ ...c, done: false }));
  const total = Math.round(clip.seconds * fps);
  let clock = 0;
  const t0 = await page.evaluate(() => performance.now());
  for (let f = 0; f < total; f++) {
    const t = f / fps;
    const y = Math.round(Math.min(max, scrollAt(t)));
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
    for (const c of clicks) if (!c.done && t >= c.t) {
      c.done = true;
      c.at = await page.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); e.click(); return [r.left + r.width * 0.5, r.top + r.height * 0.55]; }, c.sel);
    }
    const tap = clicks.find((c) => c.done && t - c.t < 0.5);
    await page.evaluate(([at, k]) => {
      let d = document.getElementById('__tap');
      if (!d) { d = document.body.appendChild(document.createElement('div')); d.id = '__tap'; d.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;border-radius:50%;width:90px;height:90px;margin:-45px 0 0 -45px;border:5px solid #C6FF3D;background:rgba(198,255,61,.28)'; }
      d.style.display = at ? 'block' : 'none';
      if (at) { d.style.left = `${at[0]}px`; d.style.top = `${at[1]}px`; d.style.transform = `scale(${0.5 + k * 0.9})`; d.style.opacity = String(1 - k); }
    }, [tap?.at ?? null, tap ? (t - tap.t) / 0.5 : 0]);
    const target = Math.round((f + 1) * 1000 / fps);
    await page.clock.runFor(target - clock); clock = target;
    await page.screenshot({ path: join(tmp, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (f % fps === 0) process.stdout.write(`\r  ${clip.id}: ${(t).toFixed(0)}s / ${clip.seconds}s   `);
  }
  process.stdout.write('\n');
  // 効果音のタイミング(ページが window.__sfx に記録したもの)を素材の秒に直して保存
  if (clip.sfx) {
    const ev = await page.evaluate(() => window.__sfx || []);
    const list = ev.map((e) => ({ type: e.type, t: Math.max(0, (e.t - t0) / 1000 - 1 / fps) })).filter((e) => e.t < clip.seconds);
    writeFileSync(join(outDir, `${clip.id}.sfx.json`), JSON.stringify(list, null, 1));
    console.log(`  sfx events: ${list.length}`);
  }
  await ctx.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(tmp, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', join(outDir, `${clip.id}.mp4`)]);
  rmSync(tmp, { recursive: true, force: true });
  console.log('  ->', join('public', slug, `${clip.id}.mp4`));
}
await browser.close();
server.close();
