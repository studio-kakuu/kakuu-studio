"""作品006 v2:キャラデザイン案(騎士・精霊術師・影狼・翼の影狼 × A〜C)を1枚にまとめる。
上半分=暗い背景、下半分=明るい背景。ドットはぼかさずに拡大する。
使い方: python3 design-sheet.py <pixel-sheet.mjs の出力フォルダ> <出力PNG>
"""
import sys
from PIL import Image, ImageDraw, ImageFont

src, dst = sys.argv[1], sys.argv[2]
FONT = ImageFont.truetype(__file__.rsplit("/", 4)[0] + "/video/remotion/public/fonts/ZenKakuGothicNew-Black.ttf", 30)
ROWS = [("knight", "騎士", 6), ("mage", "精霊術師", 6), ("wolf", "影狼", 4), ("wingwolf", "翼の影狼", 4)]
V = "ABC"


def crop(im):
    bb = im.getbbox()
    return im.crop(bb) if bb else im


cells = []
for key, label, s in ROWS:
    row = []
    for v in V:
        im = crop(Image.open(f"{src}/{key}_{v}.png").convert("RGBA"))
        row.append((f"{label}{v}", im.resize((im.width * s, im.height * s), Image.NEAREST), im.size))
    cells.append(row)
CW = max(c[1].width for r in cells for c in r) + 40
RH = [max(c[1].height for c in r) + 70 for r in cells]
W = CW * 3
half = sum(RH)
sheet = Image.new("RGB", (W, half * 2), "#000")
for bgi, (bg, fg) in enumerate([("#1b1a26", "#f2f0e9"), ("#e9eef2", "#1b1a26")]):
    d = ImageDraw.Draw(sheet)
    y0 = bgi * half
    d.rectangle([0, y0, W, y0 + half], fill=bg)
    y = y0
    for r, row in enumerate(cells):
        for i, (lab, im, size) in enumerate(row):
            x = i * CW
            d.text((x + 16, y + 10), f"{lab}  ({size[1]}ドット)", font=FONT, fill=fg)
            sheet.paste(im, (x + (CW - im.width) // 2, y + 56 + (RH[r] - 70 - im.height)), im)
        y += RH[r]
sheet.save(dst)
print(dst, sheet.size)
