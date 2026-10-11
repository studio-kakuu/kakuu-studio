"""KAKUU GAMES 全体のチェックリスト(台本どおりか)。使い方: python3 check_film.py"""
import json, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'video/remotion/src/kakuu-games/picto'
BEAT, T0 = 60 / 130, 0.09
ok_all = True
def ck(name, ok, note=''):
    global ok_all
    ok_all &= bool(ok)
    print(('OK  ' if ok else 'NG  ') + name + (f' — {note}' if note else ''))

# 1. 3本の動画
for p in ['instagram', 'tiktok', 'x']:
    f = ROOT / f'videos/kakuu-games/{p}.mp4'
    if not f.exists(): ck(f'{p}.mp4 がある', False); continue
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=width,height,r_frame_rate,codec_type', '-of', 'json', str(f)], capture_output=True, text=True).stdout)
    v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]
    dur = float(pr['format']['duration']); mb = int(pr['format']['size']) / 1024 / 1024
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', subprocess.run(['ffmpeg', '-hide_banner', '-i', str(f), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr)[-1])
    ck(f'{p}.mp4:1080×1920・30fps・約105.3秒・-14 LUFS・50MB以下', v['width'] == 1080 and v['height'] == 1920 and v['r_frame_rate'] == '30/1' and abs(dur - 105.33) < 0.1 and abs(lufs + 14) < 0.6 and mb <= 50, f'{dur:.2f}秒 {lufs} LUFS {mb:.1f}MB')

# 2. 競技の並び・小節数・解放が小節の頭
games = (SRC / 'Games.tsx').read_text()
rel = re.findall(r'\{ B: (\d+), no: (\d+), en: "([^"]+)", jp: "([^"]+)"', games)
order = [r[2] for r in rel]
want = ['SPRINT', 'KYUDO', 'FENCING', 'KENDO', 'KARATE', 'JUDO', 'BOXING', 'GYMNASTICS', 'VOLLEYBALL', 'BASKETBALL', 'SOCCER', 'BASEBALL', 'TENNIS', 'TABLE TENNIS', 'SKATEBOARD', 'SURFING', 'SWIMMING', 'RUGBY', 'BADMINTON', 'BMX']
ck('20競技が台本の順に1回ずつ', order == want, ' / '.join(order))
ck('番号が 01〜20 の順', [int(r[1]) for r in rel] == list(range(1, 21)))
ck('競技名(解放の瞬間)はすべて小節の頭', all(int(r[0]) % 4 == 0 for r in rel), ', '.join(f'{r[2]} {T0 + int(r[0]) * BEAT:.2f}秒' for r in rel))
# 台本の小節(見せ場3小節・ほか2小節)
bars = {'SPRINT': (4, 6), 'KYUDO': (7, 8), 'FENCING': (9, 10), 'KENDO': (11, 12), 'KARATE': (13, 15), 'JUDO': (16, 17), 'BOXING': (18, 19), 'GYMNASTICS': (20, 22), 'VOLLEYBALL': (23, 24), 'BASKETBALL': (25, 27), 'SOCCER': (29, 30), 'BASEBALL': (31, 32), 'TENNIS': (33, 34), 'TABLE TENNIS': (35, 36), 'SKATEBOARD': (37, 39), 'SURFING': (40, 42), 'SWIMMING': (43, 44), 'RUGBY': (45, 46), 'BADMINTON': (47, 48), 'BMX': (49, 50)}
feat = [k for k, (a, b) in bars.items() if b - a + 1 == 3]
ck('見せ場の6競技は3小節、残り14競技は2小節', sorted(feat) == sorted(['SPRINT', 'KARATE', 'GYMNASTICS', 'BASKETBALL', 'SKATEBOARD', 'SURFING']) and sum(1 for a, b in bars.values() if b - a + 1 == 2) == 14, '見せ場:' + '・'.join(feat))
ck('競技名の拍が、その競技の小節の中', all(bars[r[2]][0] * 4 <= int(r[0]) <= bars[r[2]][1] * 4 + 4 for r in rel))
# 場面の区切り
sc = ''.join((SRC / f).read_text() for f in ['scenesA.tsx', 'scenesB.tsx', 'scenesC.tsx'])
ck('ブレイク(51.78秒・112拍)でダンクの頂点のまま止める', 'const frozen = B >= 112 && B < 116;' in sc)
ck('いちばん大きい所(68.4〜83.2秒)にスケボーとサーフィン', bars['SKATEBOARD'][0] == 37 and bars['SURFING'][1] == 42)
ck('94.24〜99.78秒に20競技が並び、99.78秒(216拍)で止まる', '{ from: 204, to: 216.6, fn: climax }' in sc and 'B >= 216 ? 2.05' in sc)
ck('締めは 99.78〜105.32秒(3,160コマ)', 'durationInFrames={3160}' in (ROOT / 'video/remotion/src/Root.tsx').read_text())

# 3. 画面の文字
ck('冒頭のフック(0コマ目から)', 'AIとコードで、<br />架空のスポーツ大会をつくった' in games and '20 SPORTS' in games and 'ピクトグラムで20競技' in games)
close = (SRC / 'scenesC.tsx').read_text()
for t in ['コメントで『ゲームズ』と送ってね', '20競技のピクトグラム図鑑の URL をお届けします', 'Instagram(@studio_kakuu)の投稿に', '『ゲームズ』とコメントすると届きます', 'ピクトグラム図鑑の URL は', 'プロフィールのリンクから', '20 SPORTS, ONE SONG.', '※AIとコードでつくった、実在の大会・団体とは関係のない架空の大会です']:
    ck(f'締めの文字「{t}」', t in close)
ck('※実在の大会・団体とは関係のない、架空の大会です(タイトル)', '※実在の大会・団体とは関係のない、架空の大会です' in games)

# 4. 使ってはいけない言葉
allsrc = games + sc + (SRC / 'rigcore.ts').read_text() + (ROOT / 'works/kakuu-games/index.html').read_text()
caps = ''.join((ROOT / f'captions/kakuu-games/{p}.txt').read_text() for p in ['instagram', 'tiktok', 'x']) + (ROOT / 'captions/threads/2026-10-10_day5.md').read_text()
bad = [w for w in ['オリンピック', '五輪', 'Olympic', 'OLYMPIC', 'パラリンピック', 'メダル', '聖火'] if w in allsrc + caps]
ck('実在の大会を思わせる言葉がない', not bad, ','.join(bad))

# 5. 投稿文
ig = (ROOT / 'captions/kakuu-games/instagram.txt').read_text()
ck('Instagram:1行目にテーマとキーワード', ig.splitlines()[0].startswith('AIとコードで、架空のスポーツ大会'))
ck('Instagram:ハッシュタグ3個まで', len(re.findall(r'#\S+', ig)) <= 3, str(len(re.findall(r'#\S+', ig))))
th = (ROOT / 'captions/threads/2026-10-10_day5.md').read_text()
lens = [len(b.strip()) for b in re.findall(r'## 案\d[^\n]*\n\n(.*?)(?=\n---|\Z)', th, re.S)]
ck('Threads 3案・各500文字以内', len(lens) == 3 and max(lens) <= 500, str(lens))

print('\n結果:', 'すべて OK' if ok_all else 'NG あり')
