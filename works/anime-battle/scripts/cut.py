"""作品006:キャラ画像の白背景を透明にして assets/cut/ に保存する。

やり方(有料の切り抜きツールは使わない。numpy + scipy だけ):
  1. 画面の端からつながっている「明るい(白に近い)部分」を背景の候補にする
     (キャラの線は暗いので、線の内側の白いマントや目の白目は残る)
  2. 背景の候補には「白を抜く」計算(color to alpha)をかける
     → 真っ白は透明、光や煙のふちは白っぽさの分だけ半透明で残る
  3. 背景の候補の外(キャラ本体)はそのまま不透明
目のアップ:knight_eyes_closeup は上下の黒い帯を切り落とす。mage_eyes_closeup は3段のうち真ん中の段だけ切り取る。

使い方: python3 works/anime-battle/scripts/cut.py
"""
import glob
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "assets", "raw")
CUT = os.path.join(HERE, "..", "assets", "cut")
os.makedirs(CUT, exist_ok=True)


def cut_white(path, out, islands=False):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = im.shape
    diff = 255.0 - im.min(axis=2)  # 白からどれだけ離れているか(0=真っ白)
    # 明るい部分(光・煙のふちも含む)で、画面の端とつながっているところ
    light = diff < 120
    lab, _ = ndimage.label(light)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    edge = edge[edge > 0]
    bg = np.isin(lab, edge)
    if islands:
        # 尾の巻きの内側など、線に囲まれて端とつながらない白い部分も背景にする(狼だけ。歯など小さい白は残す)
        wl, n = ndimage.label(diff < 10)
        sizes = ndimage.sum(np.ones_like(diff), wl, range(1, n + 1))
        big = np.where(sizes > 1500)[0] + 1
        isl = ndimage.binary_dilation(np.isin(wl, big), iterations=4) & (diff < 120)
        bg = bg | isl
    # color to alpha(白を抜く)。少し強めに効かせて、うっすらした汚れは消す
    a = np.clip((diff - 6.0) / (255.0 - 6.0) * 1.6, 0, 1)
    alpha = np.where(bg, a, 1.0)
    # 背景とキャラの境目を 1px ぼかしてギザギザを抑える
    alpha = np.where(bg, alpha, ndimage.uniform_filter(np.where(bg, a, 1.0), 3))
    # 半透明部分の色は白を取り除いた色に戻す
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where(alpha[..., None] < 0.999, (im - 255.0 * (1 - safe)) / safe, im)
    rgb = np.clip(rgb, 0, 255)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    # 透明な余白を切り詰める(位置合わせのため、元の大きさとの関係は manifest に書く)
    ys, xs = np.where(alpha > 0.02)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    Image.fromarray(rgba[y0:y1, x0:x1], "RGBA").save(out, optimize=True)
    return dict(src=[w, h], box=[int(x0), int(y0), int(x1), int(y1)])


def knight_eyes(path, out):
    im = np.asarray(Image.open(path).convert("RGB"))
    rows = np.where(im.max(axis=(1, 2)) > 40)[0]  # 黒い帯でない行
    crop = im[rows.min():rows.max() + 1]
    Image.fromarray(crop).save(out, optimize=True)
    return dict(src=[im.shape[1], im.shape[0]], box=[0, int(rows.min()), im.shape[1], int(rows.max() + 1)])


def mage_eyes(path, out):
    im = np.asarray(Image.open(path).convert("RGB"))
    h = im.shape[0]
    dark = im.mean(axis=(1, 2)) < 70  # 段の区切りの黒い線
    lines = np.where(dark)[0]
    # 区切り線を上側(画面の 1/3 付近)と下側(2/3 付近)の2本に分ける
    top = lines[lines < h / 2]
    bot = lines[lines > h / 2]
    y0, y1 = int(top.max()) + 3, int(bot.min()) - 2
    Image.fromarray(im[y0:y1]).save(out, optimize=True)
    return dict(src=[im.shape[1], h], box=[0, y0, im.shape[1], y1])


if __name__ == "__main__":
    import json

    manifest = {}
    for p in sorted(glob.glob(os.path.join(RAW, "*.png"))):
        name = os.path.basename(p)
        if name.startswith("bg_"):
            continue  # 背景は切り抜かない
        out = os.path.join(CUT, name)
        if name == "knight_eyes_closeup.png":
            manifest[name] = knight_eyes(p, out)
        elif name == "mage_eyes_closeup.png":
            manifest[name] = mage_eyes(p, out)
        else:
            manifest[name] = cut_white(p, out, islands=name.startswith(("wolf_", "wingwolf_")))
        print(name, manifest[name])
    with open(os.path.join(CUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
