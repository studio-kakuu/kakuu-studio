// リポジトリの履歴とファイルから、ダッシュボードに出す数字を集計して src/stats.json に書く。
// 数字は盛らない:ここで数えられないものは出さない。
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const SELF = 'kakuu-os';
const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
const ls = (p) => (existsSync(join(ROOT, p)) ? readdirSync(join(ROOT, p)) : []);
const walk = (p, test, acc = []) => {
  for (const name of ls(p)) {
    const rel = join(p, name);
    if (name === 'node_modules' || name === 'source') continue;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, test, acc);
    else if (test(rel)) acc.push(rel);
  }
  return acc;
};

// 公開中の作品(works.js)。自分自身(制作中)は除く
const worksJs = readFileSync(join(ROOT, 'works.js'), 'utf8');
const slugs = [...worksJs.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]).filter((s) => s !== SELF);

// 動画(videos/<slug>/*.mp4)
const videos = ls('videos').flatMap((d) => ls(`videos/${d}`).filter((f) => f.endsWith('.mp4')).map((f) => `videos/${d}/${f}`));
const videoSlugs = new Set(videos.map((v) => v.split('/')[1]));

// 投稿文(captions/<slug>/*.txt)と媒体
const captions = ls('captions').filter((d) => statSync(join(ROOT, 'captions', d)).isDirectory())
  .flatMap((d) => ls(`captions/${d}`).filter((f) => f.endsWith('.txt')).map((f) => `captions/${d}/${f}`));
const platforms = [...new Set(captions.map((c) => c.split('/').pop().replace('.txt', '')))];

// 作ったページ(works 配下の index.html。自分自身は除く)
const pages = walk('works', (p) => p.endsWith('index.html') && !p.startsWith(`works/${SELF}`));
const designs = pages.filter((p) => p.includes('/step2/'));

// サイト制作の実測時間
const measured = slugs.flatMap((s) => {
  const f = join(ROOT, `works/${s}/measured_time.txt`);
  if (!existsSync(f)) return [];
  const t = readFileSync(f, 'utf8');
  const sec = Number(t.match(/^elapsed_seconds:\s*(\d+)/m)?.[1]);
  return Number.isFinite(sec) ? [{ slug: s, seconds: sec }] : [];
});

// 導入した公式スキル
const skills = ls('.claude/skills').filter((d) => existsSync(join(ROOT, '.claude/skills', d, 'SKILL.md')));

// マージしたプルリクエストとコミット(main)
const mainRef = (() => { try { git('rev-parse --verify origin/main'); return 'origin/main'; } catch { return 'HEAD'; } })();
const merges = git(`log ${mainRef} --merges --format=%s`).split('\n').filter((s) => /^Merge pull request #\d+/.test(s));
const prNums = merges.map((s) => Number(s.match(/#(\d+)/)[1])).sort((a, b) => a - b);
const commits = Number(git(`rev-list --count ${mainRef}`));
const firstDay = git(`log ${mainRef} --reverse --format=%ad --date=short`).split('\n')[0];
const today = git(`log ${mainRef} -1 --format=%ad --date=short`);
const day = Math.round((new Date(today) - new Date(firstDay)) / 86400000) + 1;
const mergedToday = git(`log ${mainRef} --merges --format=%ad --date=short`).split('\n').filter((d) => d === today).length;

const stats = {
  asOf: today,
  ref: `${mainRef} @ ${git(`rev-parse --short ${mainRef}`)}`,
  day,
  works: slugs.length,
  inProgress: 1,               // この作品(KAKUU OS)
  videos: videos.length,
  worksWithoutVideo: 1 + slugs.filter((s) => !videoSlugs.has(s)).length, // この作品 + 動画のない公開作品
  platforms: platforms.length,
  platformNames: platforms,
  captions: captions.length,
  pages: pages.length,
  designs: designs.length,
  measured,
  skills: skills.length,
  mergedPRs: merges.length,
  prRange: prNums.length ? `#${prNums[0]}–#${prNums[prNums.length - 1]}` : '',
  mergedToday,
  commits,
  sources: {
    works: 'works.js(この作品を除く)',
    videos: 'videos/<作品>/*.mp4',
    captions: 'captions/<作品>/*.txt',
    pages: 'works/**/index.html(この作品を除く)',
    measured: 'works/<作品>/measured_time.txt の elapsed_seconds',
    skills: '.claude/skills/*/SKILL.md',
    mergedPRs: `git log ${mainRef} --merges(Merge pull request)`,
    commits: `git rev-list --count ${mainRef}`,
  },
};
writeFileSync(join(HERE, '../src/stats.json'), JSON.stringify(stats, null, 2) + '\n');
console.log(stats);
