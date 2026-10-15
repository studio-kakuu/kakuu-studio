"""作品006:動画(Remotion)で使う軽い画像を video/remotion/public/battle-mv/ に書き出す。
- 切り抜き(assets/cut/)と背景(assets/raw/bg_*)を WebP にする(見た目はほぼ同じで、読み込みが軽い)
- 翼の狼が氷の粒になって消える場面のために、wingwolf_slashed の形の中から粒の位置と色を拾って particles.json に保存
使い方: python3 works/anime-battle/scripts/web-assets.py
"""
import glob
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "..", "assets")
OUT = os.path.join(HERE, "..", "..", "..", "video", "remotion", "public", "battle-mv")
os.makedirs(OUT, exist_ok=True)
sizes = {}
for p in sorted(glob.glob(os.path.join(A, "cut", "*.png"))) + sorted(glob.glob(os.path.join(A, "raw", "bg_*.png"))):
    name = os.path.basename(p)[:-4]
    im = Image.open(p)
    im.save(os.path.join(OUT, name + ".webp"), quality=90, method=5)
    sizes[name] = list(im.size)

rng = np.random.default_rng(6)
im = np.asarray(Image.open(os.path.join(A, "cut", "wingwolf_slashed.png")).convert("RGBA"))
ys, xs = np.where(im[..., 3] > 200)
idx = rng.choice(len(xs), 900, replace=False)
h, w = im.shape[:2]
parts = [[round(float(xs[i]) / w, 4), round(float(ys[i]) / h, 4)] for i in idx]
json.dump({"sizes": sizes, "dissolve": parts}, open(os.path.join(OUT, "meta.json"), "w"))
print(len(sizes), "files")
