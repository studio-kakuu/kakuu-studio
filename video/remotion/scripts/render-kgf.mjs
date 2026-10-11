// 作品005「KAKUU GAMES」(ピクトグラム版)を書き出す。 使い方: node scripts/render-kgf.mjs [instagram|tiktok|x|opening] [--crf 28] [--reuse](紙のざらつきが動くので crf 28 で 50MB 以下に収める)
// 出力: リポジトリ直下 videos/kakuu-games/<名前>.mp4(H.264 / yuv420p / faststart / AAC。音量は -14 LUFS)
import { mkdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PROJECT, '../..');
const args = process.argv.slice(2);
const name = args[0] ?? 'opening';
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
const outDir = join(ROOT, 'videos', 'kakuu-games');
mkdirSync(outDir, { recursive: true });
const browser = process.env.CHROMIUM_PATH ? [`--browser-executable=${process.env.CHROMIUM_PATH}`] : [];
const tmp = join(PROJECT, 'out', `kakuu-games_${name}.mp4`);
const t0 = Date.now();
if (!(args.includes('--reuse') && existsSync(tmp))) execFileSync('npx', ['remotion', 'render', 'src/index.ts', `KakuuGames-${name}`, tmp, '--codec=h264', '--crf=14', '--pixel-format=yuv420p', '--audio-codec=aac', `--concurrency=${opt('concurrency', '4')}`, ...browser], { cwd: PROJECT, stdio: 'inherit' });
const t1 = Date.now();
const log = spawnSync('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const I = Number([...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
const out = join(outDir, `${name}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', '28'), '-profile:v', 'high', '-level', '4.2', '-color_range', 'tv', '-r', '30',
  '-af', `volume=${(-14 - I).toFixed(2)}dB,alimiter=limit=0.84:level=false`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out]);
const mb = statSync(out).size / 1024 / 1024;
if (mb > 50) console.warn('  !! 50MB を超えています。--crf を上げて書き出し直してください');
console.log(`  ${name}: render ${((t1 - t0) / 1000).toFixed(0)}s + encode ${((Date.now() - t1) / 1000).toFixed(0)}s / ${I} LUFS -> -14 LUFS / videos/kakuu-games/${name}.mp4 ${mb.toFixed(1)}MB`);
