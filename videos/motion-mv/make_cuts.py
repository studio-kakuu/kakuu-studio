# 技名の表(台本4章)と確定した時刻から、動画用の cuts.json と Web 図鑑用の data.js を作る
# 使い方: python3 videos/motion-mv/make_cuts.py <table.json>
import json, re, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
T = json.load(open(sys.argv[1]))
END_SONG = 120.06
cuts = []
for i, r in enumerate(T):
    nxt = T[i + 1]['t'] if i + 1 < len(T) else 116.6
    pics = [int(x) for x in re.findall(r'\d+', r['pic'])]
    cuts.append(dict(no=r['no'], t=round(r['t'], 3), end=round(nxt, 3), sec=r['sec'], en=r['en'], jp=None if r['jp'] == '—' else r['jp'],
                     tech=r['tech'], pics=pics, flip='反転' in r['pic'], desc=r['mot']))
json.dump(dict(cuts=cuts, song=END_SONG, closing=[120.06, 126.06]), open(os.path.join(ROOT, 'video/remotion/src/motion-mv/cuts.json'), 'w'), ensure_ascii=False, indent=0)
groups = [('in', '出る動き', 'ENTRANCE'), ('out', '消える動き', 'EXIT'), ('tr1', '切り替え', 'TRANSITION'), ('loop', 'くり返しの動き', 'LOOP'), ('tr2', '場面転換', 'SCENE CHANGE'), ('end', 'おわりの動き', 'FINALE')]
def grp(c):
    if c['sec'] == 'Verse 1': return 'in'
    if c['sec'] == 'Pre-Chorus': return 'out' if c['en'] in ('FADE OUT','SLIDE OUT','SHRINK OUT','ZOOM OUT','BLUR OUT','FLIP OUT','DROP OUT','SPIN OUT','WIPE OUT','IRIS OUT','SLICE OUT','PIXEL OUT','EVAPORATE') else 'tr1'
    if c['sec'] == 'Chorus': return 'loop'
    if c['sec'] == 'Verse 2': return 'tr2'
    return 'end'
items = [dict(no=k + 1, en=c['en'], jp=c['jp'], desc=c['desc'], g=grp(c), pic=(c['pics'] or [0])[0]) for k, c in enumerate([c for c in cuts if c['tech']])]
from collections import Counter
print(Counter(i['g'] for i in items), len(items))
js = '// 自動生成(videos/motion-mv/make_cuts.py)。100種の名前・説明・グループ\nexport const GROUPS = ' + json.dumps([dict(id=a, jp=b, en=c) for a, b, c in groups], ensure_ascii=False) + ';\nexport const ITEMS = ' + json.dumps(items, ensure_ascii=False, indent=0) + ';\n'
open(os.path.join(ROOT, 'works/motion-zukan/data.js'), 'w').write(js)
