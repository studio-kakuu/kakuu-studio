"""候補クリップを棒人間の連続写真にして、動きの良し悪しと解放の瞬間を見る。"""
import sys, numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from bvh import load, fk

src, out = sys.argv[1], sys.argv[2]
joints, data, ft = load(src)
pos, _ = fk(joints, data)
F = len(data)
bones = [(j.parent.name, j.name) for j in joints if j.parent and not j.name.endswith('_end')]
cols, rows = 10, 4; W, H = 160, 220
img = Image.new('RGB', (cols * W, rows * H), (235, 235, 230)); d = ImageDraw.Draw(img)
idx = np.linspace(1, F - 1, cols * rows).astype(int)
allp = np.stack([pos[n] for n in pos], 1)
ymin, ymax = allp[..., 1].min(), allp[..., 1].max(); sc = (H - 30) / (ymax - ymin + 1e-6) * 0.9
for k, f in enumerate(idx):
    ox, oy = (k % cols) * W + W / 2, (k // cols) * H + H - 15
    cx, cz = pos['Hips'][f, 0], pos['Hips'][f, 2]
    P = lambda n: (ox + (pos[n][f, 0] - cx) * sc, oy - (pos[n][f, 1] - ymin) * sc)  # 正面(Z方向から)見る
    for a, b in bones:
        c = (200, 40, 40) if 'Right' in b or b.startswith('R') else (30, 30, 30)
        d.line([P(a), P(b)], fill=c, width=2)
    d.text((ox - W / 2 + 4, oy - H + 20), f'{f} {f*ft:.2f}s', fill=(0, 0, 0))
img.save(out)
print(src.rsplit('/', 1)[1], 'frames', F, 'fps', round(1 / ft), 'dur', round(F * ft, 2), 'height-range', round(ymin, 1), round(ymax, 1))
