"""作品006 v2.1:タイトル画面の文字をドット絵(文字の地図)にする。
Zen Kaku Gothic New Black(OFL)を小さい大きさで白黒に描き、video/remotion/src/pixel-mv/glyphs.ts に書き出す。
既存のゲームのフォントやロゴは使わない。使い方: python3 make-glyphs.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FONT = os.path.join(ROOT, "video/remotion/public/fonts/ZenKakuGothicNew-Black.ttf")
OUT = os.path.join(ROOT, "video/remotion/src/pixel-mv/glyphs.ts")
TEXTS = {"title": ("影狼の森", 34, 3), "menu": ("はじめから", 15, 1)}


def raster(text, size, gap):
    f = ImageFont.truetype(FONT, size * 4)
    rows_all = None
    cells = []
    for ch in text:
        im = Image.new("L", (size * 5, size * 5), 0)
        ImageDraw.Draw(im).text((size // 2, 0), ch, font=f, fill=255)
        small = im.resize((im.width // 4, im.height // 4), Image.BOX)
        cells.append(small)
    # 縦の範囲は全体でそろえる
    h = cells[0].height
    ys = [y for c in cells for y in range(h) for x in range(c.width) if c.getpixel((x, y)) > 150]
    y0, y1 = min(ys), max(ys)
    out = [""] * (y1 - y0 + 1)
    for c in cells:
        xs = [x for y in range(y0, y1 + 1) for x in range(c.width) if c.getpixel((x, y)) > 150]
        x0, x1 = min(xs), max(xs)
        for j, y in enumerate(range(y0, y1 + 1)):
            out[j] += "".join("#" if c.getpixel((x, y)) > 150 else "." for x in range(x0, x1 + 1)) + "." * gap
    return [r[:-gap] if gap else r for r in out]


with open(OUT, "w") as fo:
    fo.write("// 作品006 v2.1:タイトル画面の文字(works/anime-battle/scripts/make-glyphs.py で生成。手で直さない)\n")
    for k, (t, s, g) in TEXTS.items():
        rows = raster(t, s, g)
        fo.write(f"// {t}\nexport const {k.upper()} = [\n" + "".join(f'  "{r}",\n' for r in rows) + "];\n")
        print(k, len(rows[0]), "x", len(rows))
        print("\n".join(rows))
