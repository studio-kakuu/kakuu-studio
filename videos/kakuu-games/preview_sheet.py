"""書き出した JSON を棒人間で並べて、つなぎ目・床・ボールを確かめる(確認用)。"""
import json, sys, numpy as np
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); out = sys.argv[2]
J = d['joints']; par = d['parents']; N = len(d['pos'])
P = np.array(d['pos']).reshape(N, len(J), 3); ball = np.array(d['ball']); cam = np.array(d['cam'])
cols, rows, W, H = 12, 4, 130, 230
img = Image.new('RGB', (cols * W, rows * H), (180, 165, 140)); g = ImageDraw.Draw(img)
fs = [int(i) for i in np.linspace(0, N - 1, cols * rows)]
for k, f in enumerate(fs):
    ox, oy = (k % cols) * W + W / 2, (k // cols) * H + H - 20; s = 95
    pr = lambda p: (ox + (p[0] - cam[f][0]) * s, oy - p[1] * s)
    g.line([(ox - 50, oy), (ox + 50, oy)], fill=(120, 105, 85))
    for j, n in enumerate(J):
        if par[j] and par[j] in J: g.line([pr(P[f, J.index(par[j])]), pr(P[f, j])], fill=(200, 255, 61) if 'Right' in n else (14, 14, 14), width=2)
    if d['ballVis'][f]: b = pr(ball[f]); rr = d['ballR'] * s; g.ellipse([b[0] - rr, b[1] - rr, b[0] + rr, b[1] + rr], outline=(242, 240, 233), width=2)
    g.text((ox - W / 2 + 3, oy - H + 24), f'{f / 30:.2f}s', fill=(0, 0, 0))
img.save(out)
