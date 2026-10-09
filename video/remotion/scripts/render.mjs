// 3媒体分の動画を書き出す。 使い方: node scripts/render.mjs --theme cafe [--platform instagram,tiktok,x]
// 出力: リポジトリ直下 videos/<slug>/<platform>.mp4(H.264 / yuv420p / faststart。効果音があれば AAC、なければ音声なし)
import { readFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, '..');
const ROOT = resolve(PROJECT, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
const slug = opt('theme', 'cafe');
const platforms = opt('platform', 'instagram,tiktok,x').split(',');
const crf = opt('crf', '20');   // 最終の画質(大きいほど軽い)
const frames = opt('frames', null); // 確認用:指定したコマだけ PNG で書き出す(例 --frames 0,300,900)

const theme = JSON.parse(readFileSync(join(ROOT, `video/themes/${slug}.json`), 'utf8'));
// 制作時間(フックに {minutes} を使うテーマだけ必須)
const timeFile = join(ROOT, `works/${slug}/measured_time.txt`);
const m = existsSync(timeFile) ? readFileSync(timeFile, 'utf8').match(/^hook_minutes:\s*(\d+)/m) : null;
if (!m && theme.hook === undefined) throw new Error('measured_time.txt に hook_minutes がありません');

// 効果音:撮影時に記録したページのイベント(public/<slug>/<clip>.sfx.json)を動画の時刻へ並べ、sfxExtra を足す
const sfx = [];
for (const c of theme.clips ?? []) {
  const f = join(PROJECT, 'public', slug, `${c.id}.sfx.json`);
  if (!existsSync(f)) continue;
  const tb = c.trimBefore ?? 0;
  const rate = c.playbackRate ?? 1;          // 早送りした区間は音の時刻も縮める
  const skip = new Set(c.sfxSkip ?? []);     // 早送りで重なる音・使い回しで二重になる音は間引く('*' で全部)
  for (const e of JSON.parse(readFileSync(f, 'utf8'))) {
    if (skip.has('*') || skip.has(e.type)) continue;
    if (e.t >= tb && e.t < tb + c.seconds * rate) sfx.push({ type: (theme.sfxPrefix ?? '') + e.type, at: +(c.from + (e.t - tb) / rate).toFixed(3) });
  }
}
for (const e of theme.sfxExtra ?? []) sfx.push(e);
sfx.sort((a, b) => a.at - b.at);
const hasAudio = sfx.length > 0;
const { _comment, capture, sfxExtra, output, sfxPrefix, loudness, ...themeProps } = theme;
// 締めが全媒体で同じテーマは1本だけ書き出す(output.single にファイル名)
const targets = output?.single ? [{ platform: 'instagram', file: output.single }] : platforms.map((p) => ({ platform: p, file: `${p}.mp4` }));
themeProps.clips = themeProps.clips?.map(({ sfxSkip, ...c }) => c);
const outDir = join(ROOT, 'videos', slug);
mkdirSync(outDir, { recursive: true });
const browser = process.env.CHROMIUM_PATH ? [`--browser-executable=${process.env.CHROMIUM_PATH}`] : [];

for (const { platform, file } of targets) {
  const props = { ...themeProps, minutes: m ? Number(m[1]) : 0, platform, ...(hasAudio ? { sfx } : {}) };
  if (frames) {
    execFileSync('npx', ['remotion', 'render', 'src/index.ts', `Process-${platform}`, join(PROJECT, 'out', `frames_${slug}_${platform}`),
      `--props=${JSON.stringify(props)}`, `--frames=${frames}`, '--image-format=png', '--sequence', ...browser], { cwd: PROJECT, stdio: 'inherit' });
    continue;
  }
  const tmp = join(PROJECT, 'out', `${slug}_${platform}.mp4`);
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', `Process-${platform}`, tmp,
    `--props=${JSON.stringify(props)}`, '--codec=h264', '--crf=14', '--pixel-format=yuv420p', ...(hasAudio ? ['--audio-codec=aac'] : ['--muted']), ...browser],
    { cwd: PROJECT, stdio: 'inherit' });
  const out = join(outDir, file);
  // 音量をそろえる(loudness があるテーマだけ):いったん測ってから、その差だけ上げ下げする(ピークは -1.5dBFS で止める)
  let af = [];
  if (hasAudio && loudness) {
    const log = spawnSync('ffmpeg', ['-hide_banner', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;   // 測った値は stderr に出る
    const I = Number([...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
    af = ['-af', `volume=${(loudness - I).toFixed(2)}dB,alimiter=limit=0.84:level=false`];
    console.log(`  loudness ${I} LUFS -> ${loudness} LUFS`);
  }
  // Remotion の出力はフルレンジ(yuvj420p)になることがあるため、iPhone 等で確実に再生できる標準の yuv420p に変換し直す
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-profile:v', 'high', '-level', '4.2', '-color_range', 'tv',
    '-r', '30', ...af, ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : ['-an']), '-movflags', '+faststart', out]);
  const mb = statSync(out).size / 1024 / 1024;
  console.log(`  -> videos/${slug}/${file}  ${mb.toFixed(1)}MB`);
  if (mb > 50) console.warn('  !! 50MB を超えています。--crf を上げて書き出し直してください(例: --crf 23)');
}
