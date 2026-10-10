// 作品004「MOTION 100」の3媒体を書き出す。 使い方: node scripts/render-mv.mjs [--platform instagram,tiktok,x] [--crf 24] [--reuse]
// 出力: リポジトリ直下 videos/motion-mv/<platform>.mp4(H.264 / yuv420p / faststart / AAC。曲の音量は -14 LUFS にそろえる)
import { mkdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJECT, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
const platforms = opt('platform', 'instagram,tiktok,x').split(',');
const crf = opt('crf', '24');
const reuse = args.includes('--reuse'); // 合成済みの out/motion-mv_<platform>.mp4 から圧縮だけやり直す
const outDir = join(ROOT, 'videos', 'motion-mv');
mkdirSync(outDir, { recursive: true });
const browser = process.env.CHROMIUM_PATH ? [`--browser-executable=${process.env.CHROMIUM_PATH}`] : [];
for (const p of platforms) {
  const tmp = join(PROJECT, 'out', `motion-mv_${p}.mp4`);
  if (!(reuse && existsSync(tmp))) execFileSync('npx', ['remotion', 'render', 'src/index.ts', `MotionMV-${p}`, tmp, '--codec=h264', '--crf=14', '--pixel-format=yuv420p', '--audio-codec=aac', '--concurrency=4', ...browser], { cwd: PROJECT, stdio: 'inherit' });
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const I = Number([...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
  const out = join(outDir, `${p}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-level', '4.2', '-color_range', 'tv', '-r', '30',
    '-af', `volume=${(-14 - I).toFixed(2)}dB,alimiter=limit=0.84:level=false`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out]);
  const mb = statSync(out).size / 1024 / 1024;
  console.log(`  ${p}: ${I} LUFS -> -14 LUFS / videos/motion-mv/${p}.mp4 ${mb.toFixed(1)}MB`);
  if (mb > 50) console.warn('  !! 50MB を超えています。--crf を上げて書き出し直してください');
}
