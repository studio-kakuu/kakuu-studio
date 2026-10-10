"""くものこ もこ v3 — 1回通しのナレーション(テイク3)から、動画と Web の えほんの時刻表を作る。

入力 : voice/narration_take3.mp3 / .json(ElevenLabs v4 の with-timestamps の結果)
出力 : book.js                                   … Web の えほん(画面の文字・1文字ずつの時刻・カット・動画モードの時刻表)
       voice/pages/p00〜p09.mp3                  … 「よみきかせ」ボタン用(ページごとに切り出し)
       ../../video/remotion/public/moko-v3/voice/s00〜s10.mp3 … 動画に置く声(ページごと。おしまいは2つ)
       ../../video/themes/moko-v3.json            … 動画(Remotion)のテーマ
決まり(toolbox/narration-rules.md・台本 video/storyboards/moko-v3.md 11章):
  - 前の声の終わりから次の声の始まりまで 4.0 秒。ページの切り替えはその中間。おしまいの一文と「おしまい」の間は 1.5 秒
  - 声は録り直さず、無音のところで切り分けて置く
  - 画面の文字はひらがな(承認版)。読ませる文の時刻を、句読点で区切ったまとまりごとに画面の文字へ割り当てる
使い方: python3 works/moko/voice/build.py
"""
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(WORK))
SRC = os.path.join(HERE, "narration_take3")
VOUT = os.path.join(ROOT, "video/remotion/public/moko-v3/voice")

LEAD, GAP, GAP_END, TAIL, CLOSING = 1.0, 4.0, 1.5, 2.0, 6.0

# ---- ページ(承認版の画面の文字と読ませる文。台本 2章・3章) ----
# parts: 画面に出す文字のまとまり。kind = box(文字の箱)/ title(表紙の題字)/ burst(大きな文字)/ end(おしまい)
# read : そのまとまりで読まれる文(音声と同じ)
# cut  : ページ内で2カット目に切り替える目印(この言葉を読み終えたあとの間)
PAGES = [
    {"id": "cover", "cuts": ["p00"], "parts": [{"kind": "title", "screen": "くものこ\nもこ", "read": "くものこ、もこ。"}]},
    {"id": "sanpo", "cuts": ["p01"], "parts": [{"kind": "box", "screen": "ちいさな くもの こ、もこは、\nきょうも そらを ふわふわ。", "read": "小さな雲の子、もこは、今日も空をフワフワ。"}]},
    {"id": "kaze", "cuts": ["p02a", "p02b"], "cut": "吹いて、", "word": "びゅうっ",
     "parts": [{"kind": "box", "screen": "ある ひ、びゅうっと かぜが ふいて、\nもこは とおくへ とばされた。", "read": "ある日、びゅうっと風が吹いて、もこは遠くへ飛ばされた。"}]},
    {"id": "karakara", "cuts": ["p03"], "parts": [{"kind": "box", "screen": "ついた のはらは、からから。\nおはなが、げんきなく うつむいて いた。", "read": "着いた野原は、からから。お花が、元気なくうつむいていた。"}]},
    {"id": "mayou", "cuts": ["p04"], "parts": [{"kind": "box", "screen": "あめに なったら、\nぼくは ちいさく なっちゃう。\nもこは、すこし まよった。", "read": "雨になったら、ぼくは小さくなっちゃう。もこは、少し迷った。"}]},
    {"id": "kimeta", "cuts": ["p05a", "p05b"], "cut": "でも……",
     "parts": [{"kind": "burst", "screen": "でも……\nぼくが、\nあめに なる!", "read": "でも……ぼくが、雨になる!"}]},
    {"id": "ame", "cuts": ["p06a", "p06b"], "cut": "ぽつ、ぽつ、ぽつ。", "word": "ポツポツ",
     "parts": [{"kind": "box", "screen": "ぽつ、ぽつ、ぽつ。\nもこは、ちいさく なりながら、\nあめに なって ふった。", "read": "ぽつ、ぽつ、ぽつ。もこは、小さくなりながら、雨になって降った。"}]},
    {"id": "warau", "cuts": ["p07a", "p07b"], "cut": "笑った。", "word": "キラキラ",
     "parts": [{"kind": "box", "screen": "おはなが にこっと わらった。\n「ありがとう、もこ!」", "read": "お花が、にこっと笑った。「ありがとう、もこ!」"}]},
    {"id": "modoru", "cuts": ["p08"], "parts": [{"kind": "box", "screen": "おひさまが ぽかぽか てらすと、\nもこは また ふわふわに もどった。", "read": "お日さまがぽかぽか照らすと、もこはまた、フワフワに戻った。"}]},
    {"id": "owari", "cuts": ["p08"], "parts": [
        {"kind": "box", "screen": "もこと おはなは、\nにっこり わらいあった。", "read": "もことお花は、にっこり笑い合った。"},
        {"kind": "end", "screen": "おしまい", "read": "おしまい。"}]},
]
PUNCT = set(" \n、。!!?「」『』…・")
ENDERS = "。!!?…」"


def speech_intervals(mp3):
    """無音でない区間(秒)。-40dB・0.25 秒以上の無音で区切る"""
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", mp3, "-af", "silencedetect=n=-40dB:d=0.25", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    ss = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    se = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    dur = float(re.search(r"Duration: (\d+):(\d+):([\d.]+)", log).group(3)) + 60 * int(re.search(r"Duration: (\d+):(\d+)", log).group(2))
    sil = list(zip(ss, se + [dur] * (len(ss) - len(se))))
    out, t = [], 0.0
    for a, b in sil:
        if a > t + 0.02:
            out.append((t, a))
        t = b
    if t < dur - 0.02:
        out.append((t, dur))
    return out, sil


def clauses(s, enders_only=False):
    """句読点のところで区切る(区切りの記号は前のまとまりに含める)"""
    marks = ENDERS if enders_only else ENDERS + "、"
    out, cur = [], ""
    for c in s:
        cur += c
        if c in marks:
            out.append(cur)
            cur = ""
    if cur.strip():
        out.append(cur)
    # 「……」「!」が続くときは まとめる
    merged = []
    for c in out:
        if merged and all(x in PUNCT for x in c):
            merged[-1] += c
        else:
            merged.append(c)
    return merged


def main():
    d = json.load(open(SRC + ".json", encoding="utf-8"))
    a = d["alignment"]
    ch, S, E = a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]
    txt = "".join(ch)
    pos = txt.index("]") + 1   # 話し方の指示のタグのあとから
    speech, sil = speech_intervals(SRC + ".mp3")

    def find(sub, start):
        i = txt.index(sub, start)
        idx = [k for k in range(i, i + len(sub)) if ch[k] not in PUNCT]
        return i, i + len(sub), S[idx[0]], E[idx[-1]]

    def snap(t0, t1):
        """時刻データの区間を、実際の音(無音でない区間)にあわせる"""
        iv = [(x, y) for x, y in speech if y > t0 + 0.05 and x < t1 - 0.05]
        return (min(x for x, _ in iv), max(y for _, y in iv)) if iv else (t0, t1)

    # 各まとまり(part)の音声上の区間と、まとまり内の文字の時刻(音声の秒)
    for p in PAGES:
        for part in p["parts"]:
            i, j, t0, t1 = find(part["read"], pos)
            pos = j
            part["a0"], part["a1"] = snap(t0, t1)
            # 画面の文字の時刻:句読点で区切ったまとまりごとに、読まれる時刻を均等に割り当てる
            rc, sc = clauses(part["read"]), clauses(part["screen"].replace("\n", ""))
            if len(rc) != len(sc):
                rc, sc = clauses(part["read"], True), clauses(part["screen"].replace("\n", ""), True)
            assert len(rc) == len(sc), (part["read"], rc, sc)
            k, times = i, []
            for r, s_ in zip(rc, sc):
                ii, jj, c0, c1 = find(r, k)
                k = jj
                body = [c for c in s_ if c not in PUNCT]
                n, m = len(body), 0
                for c in s_:
                    if c in PUNCT:
                        times.append(round(c0 + (c1 - c0) * max(0, m - 1) / max(1, n), 3))
                    else:
                        times.append(round(c0 + (c1 - c0) * m / max(1, n), 3))
                        m += 1
            # 改行の位置にも時刻を入れる(画面の文字と同じ並び)
            full, it = [], iter(times)
            for c in part["screen"]:
                full.append(None if c == "\n" else next(it))
            part["times_audio"] = full
        if p.get("cut"):
            _, _, _, te = find(p["cut"], txt.index(p["parts"][0]["read"]))
            gap = min(sil, key=lambda g: abs(g[0] - te))
            p["cut_audio"] = (gap[0] + gap[1]) / 2

    # ---- 動画の時刻表:声と声の間を 4.0 秒(おしまいの2つの間は 1.5 秒)に ----
    t, prev_end, voice = LEAD, None, []
    for pi, p in enumerate(PAGES):
        for k, part in enumerate(p["parts"]):
            if prev_end is not None:
                t = prev_end + (GAP_END if k > 0 else GAP)
            part["off"] = t - part["a0"]
            part["v0"], part["v1"] = t, t + part["a1"] - part["a0"]
            prev_end = part["v1"]
            voice.append({"page": pi, "part": k, "a0": part["a0"], "a1": part["a1"], "at": round(part["v0"], 3), "len": round(part["a1"] - part["a0"], 3)})
    starts = [0.0] + [round((PAGES[i - 1]["parts"][-1]["v1"] + PAGES[i]["parts"][0]["v0"]) / 2, 3) for i in range(1, len(PAGES))]
    closing = round(PAGES[-1]["parts"][-1]["v1"] + TAIL, 3)
    duration = round(closing + CLOSING, 3)

    # ---- 音声の切り出し ----
    os.makedirs(os.path.join(HERE, "pages"), exist_ok=True)
    os.makedirs(VOUT, exist_ok=True)

    def cut(a0, a1, out):
        s0 = max(0, a0 - 0.12)
        # -ss を -i の前に置いて、切り出した頭を 0 秒にする(フェードの位置がずれないように)
        d = a1 + 0.3 - s0
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{s0:.3f}", "-t", f"{d:.3f}", "-i", SRC + ".mp3",
                        "-af", f"asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st={d - 0.12:.3f}:d=0.12", "-c:a", "libmp3lame", "-b:a", "128k", out], check=True)
        return round(a0 - s0, 3)   # ファイルの頭から声までの秒
    for i, v in enumerate(voice):
        lead = cut(v["a0"], v["a1"], os.path.join(VOUT, f"s{i:02d}.mp3"))
        v["file"] = f"moko-v3/voice/s{i:02d}.mp3"
        v["at"] = round(v["at"] - lead, 3)
        v["len"] = round(v["len"] + lead + 0.3, 3)
    for pi, p in enumerate(PAGES):
        cut(p["parts"][0]["a0"], p["parts"][-1]["a1"], os.path.join(HERE, "pages", f"p{pi:02d}.mp3"))

    # ---- book.js(Web の えほん) ----
    book = {"pages": [], "video": {"duration": duration, "closing": closing}}
    for pi, p in enumerate(PAGES):
        st = starts[pi]
        en = starts[pi + 1] if pi + 1 < len(PAGES) else closing
        cuts = [{"img": p["cuts"][0], "at": 0.0}]
        if len(p["cuts"]) > 1:
            cuts.append({"img": p["cuts"][1], "at": round(p["cut_audio"] + p["parts"][0]["off"] - st, 3)})
        book["pages"].append({
            "id": p["id"], "audio": f"voice/pages/p{pi:02d}.mp3", "word": p.get("word"),
            "cuts": cuts,
            "video": {"start": st, "dur": round(en - st, 3)},
            "parts": [{"kind": part["kind"], "screen": part["screen"],
                       "v0": round(part["v0"] - st, 3), "v1": round(part["v1"] - st, 3),
                       "times": [None if x is None else round(x + part["off"] - st, 3) for x in part["times_audio"]]} for part in p["parts"]],
        })
    with open(os.path.join(WORK, "book.js"), "w", encoding="utf-8") as f:
        f.write("// 自動生成:voice/build.py(手で直さない)。画面の文字・1文字ずつの時刻(ページの頭からの秒・動画モード)・カット・音声\n")
        f.write("window.MOKO = " + json.dumps(book, ensure_ascii=False, indent=1) + ";\n")

    # ---- 動画のテーマ ----
    def word_at(pi, w):
        part = PAGES[pi]["parts"][0]
        i = part["screen"].replace("\n", "").find(w)
        tl = [x for x in part["times_audio"] if x is not None]
        return round(tl[i] + part["off"], 3)
    P = lambda i: starts[i]
    sfx = [
        {"type": "ehon_title", "at": 0.0},
        {"type": "ehon_sparkle", "at": round(P(1) - 0.3, 3)},
        {"type": "ehon_wind", "at": round(P(1) + 0.2, 3)},
        {"type": "ehon_gust", "at": round(word_at(2, "びゅうっ") - 0.15, 3)},
        {"type": "ehon_tap", "at": round(PAGES[2]["parts"][0]["v1"] + 0.6, 3)},
        {"type": "ehon_soft", "at": round(P(3) + 0.2, 3)},
        {"type": "ehon_wind", "at": round(P(4) + 0.2, 3), "volume": 0.25},
        {"type": "ehon_burst", "at": round(word_at(5, "あめ") - 0.1, 3)},
        {"type": "ehon_rain", "at": round(P(6) + 0.2, 3)},
        {"type": "ehon_rain", "at": round(P(6) + 4.5, 3)},
        {"type": "ehon_sparkle", "at": round(P(7) - 0.3, 3)},
        {"type": "ehon_bloom", "at": round(P(7) + 0.2, 3)},
        {"type": "ehon_sparkle", "at": round(P(8) - 0.3, 3)},
        {"type": "ehon_wind", "at": round(P(8) + 0.2, 3)},
        {"type": "ehon_sparkle", "at": round(P(9) - 0.3, 3)},
        {"type": "ehon_title", "at": round(PAGES[9]["parts"][1]["v0"] - 0.6, 3)},
        {"type": "close", "at": round(closing + 0.3, 3)},
    ]
    theme = {
        "_comment": "自動生成:works/moko/voice/build.py。作品 003 くものこ もこ v3(うごく えほんスライド)。台本は video/storyboards/moko-v3.md(承認済み)。",
        "slug": "moko-v3", "theme": "絵本", "keyword": "もこ", "frame": "full", "duration": duration, "hook": "",
        "urlNotice": "この えほんの URL は さいごに", "urlNoticeAt": [4.0, 6.8], "safeArea": True, "closingStart": closing,
        "closing": {"instagram": "コメントで『{keyword}』と おくってね\nえほんの URL を おとどけします",
                    "tiktok": "Instagram(@studio_kakuu)の とうこうに\n『{keyword}』と コメントすると とどきます",
                    "x": "URLは\nプロフィールの リンクから"},
        "loudness": -16,
        "capture": {"viewport": [540, 960], "deviceScaleFactor": 2,
                    "clips": [{"id": "book", "url": "/works/moko/?demo=video", "seconds": duration, "holdStart": 0, "holdEnd": 0, "scroll": [0, 0], "waitFor": "window.__mokoReady === true"}]},
        "clips": [{"id": "book", "from": 0, "seconds": duration}],
        "scenes": [{"from": 0, "to": closing, "chip": "", "title": "", "camera": {"from": [0, 0, 0, 1, 0, 0], "to": [0, 0, 0, 1, 0, 0]}},
                   {"from": closing, "to": duration, "chip": "", "title": "", "camera": {"to": [0, 0, 0, 1.06, 0, 0.62], "move": 1.2}}],
        "narration": [{"file": v["file"], "at": v["at"], "len": v["len"]} for v in voice],
        "sfxExtra": sfx,
    }
    with open(os.path.join(ROOT, "video/themes/moko-v3.json"), "w", encoding="utf-8") as f:
        json.dump(theme, f, ensure_ascii=False, indent=1)

    print("ページの切り替え:", " / ".join(f"{p['id']} {s:.2f}" for p, s in zip(PAGES, starts)))
    print("声の位置    :", " / ".join(f"{v['page']}.{v['part']} {v['at']:.2f}+{v['len']:.2f}" for v in voice))
    print("カット      :", " / ".join(f"{bp['id']} {bp['cuts'][1]['at'] + bp['video']['start']:.2f}" for bp in book["pages"] if len(bp["cuts"]) > 1))
    print(f"締め {closing:.2f} 秒から/全体 {duration:.2f} 秒")


if __name__ == "__main__":
    main()
