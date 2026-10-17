import json
from playwright.sync_api import sync_playwright
F="file:///home/claude/koutei-video/"
CSS=f"""
@font-face{{font-family:ZKB;src:url({F}ZenKakuGothicNew-Black.ttf)}}
@font-face{{font-family:ZK;src:url({F}ZenKakuGothicNew-Bold.ttf)}}
@font-face{{font-family:SG;src:url({F}SpaceGrotesk-Bold.ttf)}}
@font-face{{font-family:SGM;src:url({F}SpaceGrotesk-Medium.ttf)}}
*{{margin:0;box-sizing:border-box}}
html,body{{width:1080px;height:1920px;background:transparent;color:#fff;font-family:ZK}}
.logo{{position:absolute;left:64px;top:86px;font-family:SG;font-size:34px;letter-spacing:.04em}}
.logo i{{color:#C6FF3D;font-style:normal}}
.chip{{position:absolute;left:64px;top:170px;display:flex;gap:14px;align-items:center}}
.chip span{{font-family:SG;font-size:26px;letter-spacing:.12em;color:#0E0E0E;background:#C6FF3D;padding:8px 18px;border-radius:99px}}
.chip b{{font-size:28px;color:#C6FF3D;border:2px solid #C6FF3D;padding:6px 16px;border-radius:99px;font-weight:400}}
.title{{position:absolute;left:64px;right:64px;top:250px;font-family:ZKB;font-size:74px;line-height:1.22}}
.title em{{color:#C6FF3D;font-style:normal}}
.cap{{position:absolute;left:64px;right:64px;bottom:150px;font-size:38px;line-height:1.45;color:#E8ECEF}}
.cap em{{color:#C6FF3D;font-style:normal}}
.note{{position:absolute;left:64px;right:64px;bottom:70px;font-size:23px;color:#8A949C}}
.big{{position:absolute;left:64px;right:64px;font-family:ZKB;line-height:1.2}}
.sub{{position:absolute;left:64px;right:64px;font-size:40px;line-height:1.5;color:#D5DADF}}
.next{{position:absolute;left:64px;bottom:150px;font-family:SGM;font-size:28px;letter-spacing:.2em;color:#8A949C}}
"""
NOTE="※デモ版。名前・品番・数字はすべて架空です/AIで制作"
def page(body): return f"<html><head><style>{CSS}</style></head><body>{body}</body></html>"
scenes=json.load(open('scenes.json',encoding='utf8'))
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1080,'height':1920})
    for s in scenes:
        if s['kind']=='part':
            adm='<b>管理者のみ</b>' if s.get('admin') else ''
            body=f"<div class=logo>KAKUU STUDIO<i>.</i></div><div class=chip><span>PART {s['n']} / 8</span>{adm}</div><div class=title>{s['title']}</div><div class=cap>{s['cap']}</div><div class=note>{NOTE}</div>"
        else:
            body=s['html'].replace('{NOTE}',NOTE)
        open("tmp.html","w",encoding="utf8").write(page(body)); pg.goto(F+"tmp.html"); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(400)
        pg.evaluate("document.fonts.ready")
        pg.screenshot(path=f"ov_{s['id']}.png",omit_background=True)
    b.close()
