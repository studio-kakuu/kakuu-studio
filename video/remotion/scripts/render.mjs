// 3媒体分の動画を書き出す。 使い方: node scripts/render.mjs --theme cafe [--platform instagram,tiktok,x]
// 出力: リポジトリ直下 videos/<slug>/<platform>.mp4(H.264 / yuv420p / faststart / 音声なし)
import { readFileSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const ROOT = resolve(PROJECT, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
const slug = opt('theme', 'cafe');
const platforms = opt('platform', 'instagram,tiktok,x').split(',');
const crf = opt('crf', '20');

const theme = JSON.parse(readFileSync(join(ROOT, `video/themes/${slug}.json`), 'utf8'));
const m = readFileSync(join(ROOT, `works/${slug}/measured_time.txt`), 'utf8').match(/^hook_minutes:\s*(\d+)/m);
if (!m) throw new Error('measured_time.txt に hook_minutes がありません');
const outDir = join(ROOT, 'videos', slug);
mkdirSync(outDir, { recursive: true });
const browser = process.env.CHROMIUM_PATH ? [`--browser-executable=${process.env.CHROMIUM_PATH}`] : [];

for (const platform of platforms) {
  const props = { slug, theme: theme.theme, keyword: theme.keyword, minutes: Number(m[1]), platform };
  const tmp = join(PROJECT, 'out', `${slug}_${platform}.mp4`);
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', `Process-${platform}`, tmp,
    `--props=${JSON.stringify(props)}`, '--codec=h264', `--crf=${crf}`, '--pixel-format=yuv420p', '--muted', ...browser],
    { cwd: PROJECT, stdio: 'inherit' });
  const out = join(outDir, `${platform}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-c', 'copy', '-an', '-movflags', '+faststart', out]);
  const mb = statSync(out).size / 1024 / 1024;
  console.log(`  -> videos/${slug}/${platform}.mp4  ${mb.toFixed(1)}MB`);
  if (mb > 50) console.warn('  !! 50MB を超えています。--crf を上げて書き出し直してください(例: --crf 23)');
}
