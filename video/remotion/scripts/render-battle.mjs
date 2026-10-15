// 作品006「アニメ戦闘MV」の試作版を書き出す。 使い方: node scripts/render-battle.mjs [--reuse] [--crf 23]
// 出力: リポジトリ直下 videos/anime-battle/anime-battle.mp4(1080×1920 / 24fps / H.264 / yuv420p / faststart / AAC。効果音は -14 LUFS。30MB 以内)
//       works/anime-battle/review/scene1〜8.jpg(各シーンの代表1コマ)
import { mkdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJECT, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
let crf = Number(opt('crf', '23'));
const reuse = args.includes('--reuse');
const outDir = join(ROOT, 'videos', 'anime-battle');
const reviewDir = join(ROOT, 'works', 'anime-battle', 'review');
mkdirSync(outDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });
const browser = process.env.CHROMIUM_PATH ? [`--browser-executable=${process.env.CHROMIUM_PATH}`] : [];

execFileSync('python3', ['scripts/make-sfx-battle.py'], { cwd: PROJECT, stdio: 'inherit' });
const tmp = join(PROJECT, 'out', 'anime-battle_master.mp4');
if (!(reuse && existsSync(tmp))) execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'BattleMV', tmp, '--codec=h264', '--crf=14', '--pixel-format=yuv420p', '--audio-codec=aac', '--concurrency=4', ...browser], { cwd: PROJECT, stdio: 'inherit' });

const log = spawnSync('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const I = Number([...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
const out = join(outDir, 'anime-battle.mp4');
for (;;) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-maxrate', '3400k', '-bufsize', '6800k', '-profile:v', 'high', '-level', '4.2', '-color_range', 'tv', '-r', '24',
    '-af', `volume=${(-14 - I).toFixed(2)}dB,alimiter=limit=0.84:level=false`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out]);
  const mb = statSync(out).size / 1024 / 1024;
  console.log(`  crf ${crf}: ${I} LUFS -> -14 LUFS / videos/anime-battle/anime-battle.mp4 ${mb.toFixed(1)}MB`);
  if (mb <= 30) break;
  crf += 2; // 30MB を超えたら圧縮を強めて書き出し直す
}
// 各シーンの代表1コマ(シーン内の見せ場)
const picks = [126, 192 + 46, 384 + 63, 576 + 87, 768 + 130, 960 + 150, 1152 + 60, 1344 + 70];
picks.forEach((f, i) => {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', (f / 24 + 0.001).toFixed(3), '-i', tmp, '-frames:v', '1', '-q:v', '3', join(reviewDir, `scene${i + 1}.jpg`)]);
});
console.log('  stills: works/anime-battle/review/scene1-8.jpg');
