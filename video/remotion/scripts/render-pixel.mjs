// 作品006 v2.1「ドット絵アクション」を書き出す(v2 の動画は残し、別名で書き出す)。 使い方: node scripts/render-pixel.mjs [--reuse]
// 出力: videos/anime-battle/v2/anime-battle-v2.1_text.mp4(冒頭に制作方法の文字あり)/ anime-battle-v2.1_notext.mp4(文字なし)
//       1080×1920 / 24fps / H.264 / yuv420p / faststart / AAC(-14 LUFS)/ 各 30MB 以内
//       確認用の静止画 works/anime-battle/v2/review-v2.1/opening1〜3.png(決め技・巻き戻し・タイトル)と scene1〜8.png
import { mkdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJECT, '../..');
const reuse = process.argv.includes('--reuse');
const outDir = join(ROOT, 'videos', 'anime-battle', 'v2');
const reviewDir = join(ROOT, 'works', 'anime-battle', 'v2', 'review-v2.1');
mkdirSync(outDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });
const browser = process.env.CHROMIUM_PATH ? [`--browser-executable=${process.env.CHROMIUM_PATH}`] : [];

execFileSync('python3', ['scripts/make-sfx-pixel.py'], { cwd: PROJECT, stdio: 'inherit' });
for (const v of ['text', 'notext']) {
  const tmp = join(PROJECT, 'out', `pixel-mv_${v}.mp4`);
  if (!(reuse && existsSync(tmp))) execFileSync('npx', ['remotion', 'render', 'src/index.ts', `PixelMV-${v}`, tmp, '--codec=h264', '--crf=12', '--pixel-format=yuv420p', '--audio-codec=aac', '--concurrency=4', ...browser], { cwd: PROJECT, stdio: 'inherit' });
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const I = Number([...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
  const out = join(outDir, `anime-battle-v2.1_${v}.mp4`);
  let crf = 20;
  for (;;) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf), '-maxrate', '3400k', '-bufsize', '6800k', '-profile:v', 'high', '-level', '4.2', '-color_range', 'tv', '-r', '24',
      '-af', `volume=${(-14 - I).toFixed(2)}dB,alimiter=limit=0.84:level=false`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out]);
    const mb = statSync(out).size / 1024 / 1024;
    console.log(`  ${v} crf ${crf}: ${I} LUFS -> -14 LUFS / ${mb.toFixed(1)}MB`);
    if (mb <= 30) break;
    crf += 2;
  }
}
// 各シーンの代表1コマ(Node で直接描く。動画と同じ絵)
execFileSync('npx', ['esbuild', 'scripts/pixel-frames.ts', '--bundle', '--platform=node', '--format=esm', '--outfile=out/pixel-frames.mjs', '--log-level=warning'], { cwd: PROJECT });
const opening = [17, 33, 45];
const picks = [60 + 62, 192 + 31, 384 + 47, 576 + 141, 768 + 152, 960 + 140, 1152 + 61, 1344 + 120];
execFileSync('node', ['out/pixel-frames.mjs', 'out/review', '1080', ...[...opening, ...picks].map(String)], { cwd: PROJECT });
const cp = (f, name) => execFileSync('cp', [join(PROJECT, 'out/review', `f${String(f).padStart(4, '0')}.png`), join(reviewDir, name)]);
opening.forEach((f, i) => cp(f, `opening${i + 1}.png`));
picks.forEach((f, i) => cp(f, `scene${i + 1}.png`));
console.log('  stills: works/anime-battle/v2/review-v2.1/');
