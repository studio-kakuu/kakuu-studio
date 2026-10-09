"""くものこ もこ v2 — ナレーションの時刻から、絵本の「よみきかせ」と動画の時刻表を作る。

入力 : audio/lines/<id>.json(ElevenLabs の with-timestamps の結果。文ごと)
出力 : narration.js                       … 絵本が読む(画面の文字・1文字ずつの時刻・動画モードの時刻表)
       ../../video/themes/moko-v2.json      … 動画(Remotion)のテーマ
       ../../video/remotion/public/moko-v2/voice/<id>.mp3 … 動画で使う声(コピー)

決まり(toolbox/narration-rules.md):
  - 文と文の間は 1.5 秒(「ぽつ、ぽつ、ぽつ。」のあとだけ 1.2 秒)。声が終わったあとの見せ場の分だけ間を延ばす
  - 場面の切り替えは、前の声の終わりと次の声の始まりの中間
  - 画面の文字はひらがな(承認版)。1文字ずつ、読まれるのと同時に出す
使い方: python3 works/moko/audio/build-narration.py
"""
import json
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(WORK))

# ---- 画面の文字(承認版・video/storyboards/moko-v2.md 2章。改行も同じ) ----
# lines: [声のファイル, その声で読む画面の文字]
PAGES = [
    {"id": "cover", "lines": [["01", "くものこもこ"]]},  # 題字は最初から出ている(文字は出し直さない)
    {"id": "sanpo", "lines": [["02", "ちいさな くもの こ、もこは、\nきょうも そらを ふわふわ。"]]},
    {"id": "kaze", "lines": [["03", "ある ひ、びゅうっと かぜが ふいて、\nもこは とおくへ とばされた。"]]},
    {"id": "karakara", "lines": [["04", "ついた のはらは、からから。\nおはなが、げんきなく うつむいて いた。"]]},
    {"id": "mayou", "lines": [["05", "あめに なったら、\nぼくは ちいさく なっちゃう。\nもこは、すこし まよった。"]]},
    {"id": "kimeta", "lines": [["06", "でも……\nぼくが、\nあめに なる!"]]},
    {"id": "ame", "lines": [["07a", "ぽつ、ぽつ、ぽつ。\n"], ["07b", "もこは、あめに なって ふった。"]]},
    {"id": "warau", "lines": [["08", "おはなが にこっと わらった。\n「ありがとう、もこ!」"]]},
    {"id": "modoru", "lines": [["09", "おひさまが ぽかぽか てらすと、\nもこは また ふわふわに もどった。"]]},
    {"id": "owari", "lines": [["10", "おしまい"]]},
]

# ---- 間(秒) ----
LEAD = 1.0          # 表紙:題字と鈴のあと、声が始まるまで
GAP = 1.5           # 文と文の間
GAP_AFTER = {"07a": 1.2}
# 声が終わったあとの見せ場(間に足す秒):風・雨が降り続く・花が次々ひらく・虹がかかる
SHOW = {"03": 1.5, "07b": 2.0, "08": 1.5, "09": 2.0}
TAIL = 1.5          # おしまい の声のあと、光があふれる
CLOSING = 6.0       # 締め(媒体別の文字+ロゴ)

PUNCT = set(" \n、。!!?「」…・")


def content(s):
    return [c for c in s if c not in PUNCT and not c.isascii()]


def kana(c):
    """カタカナ → ひらがな、読ませる文の書きかえ(わ←は/え←へ、ー←う)を同じ文字とみなす"""
    o = ord(c)
    if 0x30A1 <= o <= 0x30F6:
        c = chr(o - 0x60)
    return {"わ": "は", "え": "へ", "ー": "う"}.get(c, c)


def load(line_id):
    d = json.load(open(os.path.join(HERE, "lines", f"{line_id}.json"), encoding="utf-8"))
    a = d["alignment"]
    chars = [(c, s, e) for c, s, e in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"])
             if c not in PUNCT and not c.isascii()]
    return d["request"]["text"], chars


def screen_times(screen, read_chars, line_id):
    """画面の文字1文字ずつに、読まれる時刻(秒・その声の頭から)を割り当てる"""
    sc = content(screen)
    if len(sc) != len(read_chars):
        raise SystemExit(f"{line_id}: 画面の文字({len(sc)})と読ませる文({len(read_chars)})の文字数が合いません")
    for a, (b, _, _) in zip(sc, read_chars):
        if kana(a) != kana(b) and not (a == "は" and kana(b) == "は"):
            print(f"  ! {line_id}: 「{a}」と「{b}」が対応(読みの書きかえ)")
    times, k, last = [], 0, 0.0
    for c in screen:
        if c in PUNCT or c.isascii():
            times.append(round(last, 3))   # 記号・空白は直前の文字と同時
        else:
            last = read_chars[k][1]
            times.append(round(last, 3))
            k += 1
    return times


def main():
    lines = {}
    for p in PAGES:
        for lid, screen in p["lines"]:
            text, chars = load(lid)
            lines[lid] = {
                "file": f"audio/lines/{lid}.mp3",
                "read": text,
                "screen": screen,
                "len": round(chars[-1][2], 3),        # 声の長さ(最後の文字の終わり)
                "times": screen_times(screen, chars, lid),
            }

    # ---- 動画の時刻表 ----
    order = [lid for p in PAGES for lid, _ in p["lines"]]
    at, t = {}, LEAD
    for i, lid in enumerate(order):
        at[lid] = round(t, 3)
        t += lines[lid]["len"]
        if i + 1 < len(order):
            t += GAP_AFTER.get(lid, GAP) + SHOW.get(lid, 0)
    end_voice = t
    pages_at = [0.0]
    for p_prev, p in zip(PAGES, PAGES[1:]):
        last = p_prev["lines"][-1][0]
        first = p["lines"][0][0]
        pages_at.append(round((at[last] + lines[last]["len"] + at[first]) / 2, 3))
    closing = round(end_voice + TAIL, 3)
    duration = round(closing + CLOSING, 2)

    video = {"pages": pages_at, "voice": [{"id": k, "at": at[k], "len": lines[k]["len"]} for k in order], "closing": closing, "duration": duration}
    data = {"pages": [{"id": p["id"], "lines": [lid for lid, _ in p["lines"]]} for p in PAGES], "lines": lines, "video": video}
    with open(os.path.join(WORK, "narration.js"), "w", encoding="utf-8") as f:
        f.write("// 自動生成:audio/build-narration.py(手で直さない)。ナレーションの文字ごとの時刻と、動画モードの時刻表\n")
        f.write("window.MOKO_NARRATION = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")

    # ---- 動画で使う声をコピー ----
    vdir = os.path.join(ROOT, "video/remotion/public/moko-v2/voice")
    os.makedirs(vdir, exist_ok=True)
    for lid in order:
        shutil.copyfile(os.path.join(HERE, "lines", f"{lid}.mp3"), os.path.join(vdir, f"{lid}.mp3"))

    # ---- 効果音(10章の表。声と重ならない所だけ場面転換の光) ----
    P = dict(zip([p["id"] for p in PAGES], pages_at))
    burst = at["06"] + next(s for c, s in zip(lines["06"]["screen"], lines["06"]["times"]) if c == "ぼ")
    sfx = [
        {"type": "ehon_title", "at": 0.0},
        {"type": "ehon_wind", "at": P["sanpo"]},
        {"type": "ehon_gust", "at": round(P["kaze"] + 0.15, 3)},
        {"type": "ehon_tap", "at": round(at["03"] + lines["03"]["len"] + 0.6, 3)},
        {"type": "ehon_soft", "at": round(P["karakara"] + 0.2, 3)},
        {"type": "ehon_wind", "at": round(P["mayou"] + 0.2, 3), "volume": 0.25},
        {"type": "ehon_burst", "at": round(burst - 0.1, 3)},
        {"type": "ehon_rain", "at": round(P["ame"] + 0.15, 3)},
        {"type": "ehon_rain", "at": round(at["07b"] + 0.8, 3)},
        {"type": "ehon_bloom", "at": round(P["warau"] + 0.15, 3)},
        {"type": "ehon_wind", "at": round(P["modoru"] + 0.4, 3)},
        {"type": "ehon_title", "at": round(P["owari"] + 0.05, 3)},
        {"type": "close", "at": round(closing + 0.3, 3)},
    ]
    # 場面転換の光:転換の 0.6 秒前から鳴り始めて 1.8 秒。次の声が始まる前に鳴り終わる所だけ
    for name, t0 in P.items():
        if name == "cover":
            continue
        s = t0 - 0.6
        nxt = min((v for v in at.values() if v > t0), default=99)
        prv = max((v + lines[k]["len"] for k, v in at.items() if v < t0), default=0)
        if s >= prv and s + 1.8 <= nxt:
            sfx.append({"type": "ehon_sparkle", "at": round(s, 3)})
    sfx.sort(key=lambda e: e["at"])

    theme = {
        "_comment": "自動生成:works/moko/audio/build-narration.py。作品 003 くものこ もこ v2(ナレーション付きの えほん)。台本は video/storyboards/moko-v2.md(承認済み)。",
        "slug": "moko-v2",
        "theme": "絵本",
        "keyword": "もこ",
        "frame": "full",
        "duration": duration,
        "hook": "",
        "urlNotice": "この えほんの URL は さいごに",
        "urlNoticeAt": [4.0, 6.8],
        "safeArea": True,
        "closingStart": closing,
        "closing": {
            "instagram": "コメントで『{keyword}』と おくってね\nえほんの URL を おとどけします",
            "tiktok": "Instagram(@studio_kakuu)の とうこうに\n『{keyword}』と コメントすると とどきます",
            "x": "URLは\nプロフィールの リンクから",
        },
        "loudness": -16,
        "capture": {
            "viewport": [540, 960],
            "deviceScaleFactor": 2,
            "clips": [{"id": "book", "url": "/works/moko/?demo=video", "seconds": duration, "holdStart": 0, "holdEnd": 0, "scroll": [0, 0], "waitFor": "window.__mokoReady === true"}],
        },
        "clips": [{"id": "book", "from": 0, "seconds": duration}],
        "scenes": [
            {"from": 0, "to": closing, "chip": "", "title": "", "camera": {"from": [0, 0, 0, 1, 0, 0], "to": [0, 0, 0, 1, 0, 0]}},
            {"from": closing, "to": duration, "chip": "", "title": "", "camera": {"to": [0, 0, 0, 1.06, 0, 0.62], "move": 1.2}},
        ],
        "narration": [{"file": f"moko-v2/voice/{k}.mp3", "at": at[k], "len": lines[k]["len"]} for k in order],
        "sfxExtra": sfx,
    }
    with open(os.path.join(ROOT, "video/themes/moko-v2.json"), "w", encoding="utf-8") as f:
        json.dump(theme, f, ensure_ascii=False, indent=1)
        f.write("\n")

    print("場面の切り替え:", " / ".join(f"{p['id']} {t:.2f}" for p, t in zip(PAGES, pages_at)))
    print("声の位置    :", " / ".join(f"{k} {at[k]:.2f}-{at[k] + lines[k]['len']:.2f}" for k in order))
    print(f"締め {closing:.2f} 秒から/全体 {duration:.2f} 秒")


if __name__ == "__main__":
    main()
