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
  const total = Math.round(clip.seconds * fps);
  let clock = 0;
  const t0 = await page.evaluate(() => performance.now());
  for (let f = 0; f < total; f++) {
    const t = f / fps;
    const k = ease((t - clip.holdStart) / (clip.seconds - clip.holdStart - clip.holdEnd));
    const y = Math.round(max * (clip.scroll[0] + (clip.scroll[1] - clip.scroll[0]) * k));
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
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
