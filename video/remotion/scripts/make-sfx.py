"""KAKUU STUDIO 効果音ジェネレーター v2(すべてコードで合成。外部の音源・サンプルは使わない)

方向性:SF映画の HUD のような、低めで落ち着いた上質な音。
  - 高い「ピコピコ」や鋭いビープは使わない(主成分はおよそ 40〜1500Hz、上は柔らかく削る)
  - 立ち上がりは少しだけ丸め、残響(小さな部屋〜ホール)で空気感を足す
  - 音量は控えめ。BGM を後から重ねても邪魔にならないよう、ピークは -6dBFS 前後にそろえる

使い方: python3 scripts/make-sfx.py   → public/sfx/*.wav(48kHz / 16bit / モノラル)
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(20261009)  # 毎回同じ音になるよう乱数を固定


# ---------------- 基本の部品 ----------------
def n_(dur):
    return int(SR * dur)


def t_(dur):
    return np.arange(n_(dur)) / SR


def tone(freq, dur, phase=0.0):
    """freq は数値または時間の関数(Hz)"""
    t = t_(dur)
    f = freq(t) if callable(freq) else np.full_like(t, float(freq))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def soft_tone(freq, dur):
    """サインに2倍音を少しだけ足した、丸い音色"""
    return tone(freq, dur) + 0.18 * tone(lambda t: (freq(t) if callable(freq) else freq) * 2, dur, 0.4)


def noise(dur):
    return rng.standard_normal(n_(dur))


def adsr(n, a=0.01, d=0.2, s=0.0, r=0.3, curve=3.0):
    """立ち上がり a → 減衰 d → 持続 s → 余韻 r(指数カーブ)"""
    t = np.arange(n) / SR
    e = np.zeros(n)
    att = t < a
    e[att] = (t[att] / max(a, 1e-4)) ** 0.7
    dec = (t >= a) & (t < a + d)
    e[dec] = s + (1 - s) * np.exp(-curve * (t[dec] - a) / max(d, 1e-4))
    rel = t >= a + d
    lvl = s + (1 - s) * np.exp(-curve)
    e[rel] = lvl * np.exp(-curve * (t[rel] - a - d) / max(r, 1e-4))
    return e


def onepole_lp(x, cutoff):
    """1次ローパス(cutoff は数値または配列で時間変化)"""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def lp(x, cutoff, order=2):
    for _ in range(order):
        x = onepole_lp(x, cutoff)
    return x


def hp(x, cutoff):
    return x - onepole_lp(x, cutoff)


def bandpass(x, center, width=0.6):
    """中心周波数あたりだけを残す(ハイパス → ローパス)"""
    c = np.asarray(center, dtype=float)
    return lp(hp(x, c * (1 - width / 2)), c * (1 + width / 2), 2)


def comb(x, delay, fb, damp):
    d = int(SR * delay)
    y = np.zeros(len(x) + d)
    buf = np.zeros(len(x))
    lpst = 0.0
    out = np.zeros(len(x))
    for i in range(len(x)):
        j = i - d
        v = buf[j] if j >= 0 else 0.0
        lpst = v * (1 - damp) + lpst * damp
        buf[i] = x[i] + lpst * fb
        out[i] = v
    return out


def allpass(x, delay, g=0.5):
    d = int(SR * delay)
    buf = np.zeros(len(x))
    out = np.zeros(len(x))
    for i in range(len(x)):
        j = i - d
        v = buf[j] if j >= 0 else 0.0
        buf[i] = x[i] + v * g
        out[i] = v - buf[i] * g
    return out


def reverb(x, size=1.0, mix=0.25, tail=1.2, damp=0.45):
    """シュレーダー型の簡単な残響。tail 秒ぶん後ろに余白を足す"""
    x = np.concatenate([x, np.zeros(n_(tail))])
    combs = [0.0297, 0.0371, 0.0411, 0.0437]
    wet = sum(comb(x, d * size, 0.80 + 0.04 * size, damp) for d in combs) / len(combs)
    wet = allpass(allpass(wet, 0.005, 0.6), 0.0017, 0.6)
    wet = lp(hp(wet, 120), 2600, 2)  # 残響は低すぎず高すぎず
    return x * (1 - mix) + wet * mix * 2.2


def place(total, *parts):
    out = np.zeros(n_(total))
    for start, w in parts:
        i = n_(start)
        j = min(len(out), i + len(w))
        out[i:j] += w[: j - i]
    return out


def glass(freq=880.0, dur=0.5, level=1.0):
    """ガラスに触れたような小さく澄んだクリック:非整数倍の倍音が素早く消える"""
    parts = [(1.0, 1.0, 0.14), (2.32, 0.28, 0.06), (3.7, 0.06, 0.03)]
    w = sum(amp * tone(freq * k, dur) * adsr(n_(dur), 0.0015, dec, 0, 0.05, 4) for k, amp, dec in parts)
    touch = lp(hp(noise(0.012), 500), 1800, 3) * adsr(n_(0.012), 0.0005, 0.006, 0, 0.004, 5) * 0.25
    return place(dur, (0, w), (0, touch)) * level


# ---------------- 音の定義 ----------------
def s_key():  # 入力:ガラスを指先でそっと叩く
    return reverb(glass(784.0, 0.18, 0.55), size=0.6, mix=0.18, tail=0.25)


def s_panel():  # パネル出現:低い「フッ」と空気、最後にかすかなガラス
    d = 0.7
    body = soft_tone(lambda t: 92 - 18 * t, d) * adsr(n_(d), 0.02, 0.35, 0, 0.2, 3) * 0.55
    body += tone(lambda t: 2 * (92 - 18 * t), d) * adsr(n_(d), 0.02, 0.25, 0, 0.2, 3) * 0.3
    air = lp(noise(d), 600, 4) * adsr(n_(d), 0.04, 0.3, 0, 0.2, 3) * 0.5
    return reverb(place(d, (0, body), (0, air), (0.03, glass(784, 0.4, 0.22))), 0.8, 0.22, 0.5)


def s_send():  # 送信:低い空気が前へ押し出される
    d = 0.7
    t = t_(d)
    air = lp(hp(noise(d), 120), 200 + 700 * (t / d) ** 1.4, 4) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2 * 1.6
    sub = tone(lambda t: 58 + 20 * t, d) * adsr(n_(d), 0.03, 0.4, 0, 0.2, 3) * 0.5
    return reverb(air * 0.9 + sub, 0.9, 0.2, 0.5)


def s_pulse():  # パルス:サブベースが深く響き、ゆっくり減衰する
    d = 2.6
    sub = tone(lambda t: 34 + 22 * np.exp(-2.2 * t), d) * adsr(n_(d), 0.012, 2.2, 0, 0.3, 3.2)
    body = soft_tone(lambda t: 72 + 30 * np.exp(-4 * t), d) * adsr(n_(d), 0.008, 0.9, 0, 0.3, 4) * 0.8
    # スマホのスピーカーでも感じられるよう、100〜300Hz の芯を少し足す
    body += tone(lambda t: 3 * (72 + 30 * np.exp(-4 * t)), d) * adsr(n_(d), 0.008, 0.7, 0, 0.2, 4) * 0.55
    air = lp(noise(d), 120 + 600 * np.exp(-2.5 * t_(d)), 4) * adsr(n_(d), 0.06, 1.4, 0, 0.3, 3) * 0.9
    return reverb(sub + body + air, 1.3, 0.28, 1.4, 0.55)


def s_tick():  # カウントアップ:数字が増えるたびの、ごく小さなガラスの刻み(だんだん間隔が開く)
    d = 2.4
    parts = []
    n = 12
    for k in range(n):
        x = k / (n - 1)
        start = d * 0.92 * (1 - (1 - x) ** 0.35)
        parts.append((start, glass(659.25 + 120 * x, 0.25, 0.28 + 0.22 * x)))
    return reverb(place(d, *parts), 0.7, 0.2, 0.6)


def s_done():  # 部署の完了:低い音の上にガラスが一つ、静かに確定
    d = 1.0
    low = soft_tone(196.0, d) * adsr(n_(d), 0.015, 0.5, 0, 0.3, 3.5) * 0.4
    return reverb(place(d, (0, low), (0.01, glass(783.99, 0.6, 0.5))), 0.9, 0.25, 0.8)


def s_alert():  # 承認待ち:低い2音がふくらんで、注意をうながす(ビープにしない)
    d = 2.2
    def pad(f, dur):
        return (soft_tone(f, dur) + 0.5 * soft_tone(f * 1.003, dur)) * adsr(n_(dur), 0.18, 0.6, 0.35, 0.6, 2.5)
    w = place(d, (0, pad(110.0, 1.6) * 0.5), (0, pad(164.81, 1.6) * 0.35), (0.55, pad(146.83, 1.4) * 0.45), (0.55, pad(220.0, 1.4) * 0.3))
    w = lp(w, 1400, 1)
    return reverb(w, 1.2, 0.3, 1.0)


def s_approve():  # 承認:短く柔らかい和音(Dmaj9 を低めに)
    d = 2.0
    notes = [(0.000, 146.83, 0.5), (0.025, 220.00, 0.36), (0.050, 277.18, 0.3), (0.075, 329.63, 0.26), (0.100, 440.00, 0.18)]
    w = place(d, *[(s, soft_tone(f, d - s) * adsr(n_(d - s), 0.03, 1.1, 0, 0.4, 3) * a) for s, f, a in notes])
    w += place(d, (0, tone(lambda t: 55 + 10 * np.exp(-6 * t), 0.8) * adsr(n_(0.8), 0.01, 0.5, 0, 0.2, 3) * 0.45))
    w = lp(w, 1800, 1)
    return reverb(place(d, (0, w), (0.02, glass(880, 0.7, 0.18))), 1.3, 0.32, 1.4)


def s_whoosh():  # 場面転換:空気がゆっくり流れる
    d = 1.1
    t = t_(d)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    cut = 180 + 1500 * shape
    w = lp(noise(d), 140 + 950 * shape, 4) * shape * 2.2
    return reverb(w, 1.0, 0.2, 0.5)


def s_hit():  # DAY 1 COMPLETE:深いサブの衝撃と、長い空間の余韻
    d = 3.2
    sub = tone(lambda t: 30 + 26 * np.exp(-3 * t), d) * adsr(n_(d), 0.006, 2.8, 0, 0.3, 3)
    knock = lp(noise(0.3), 700, 4) * adsr(n_(0.3), 0.002, 0.15, 0, 0.1, 4) * 0.9
    sub = sub + soft_tone(lambda t: 3 * (30 + 26 * np.exp(-3 * t)), d) * adsr(n_(d), 0.006, 1.4, 0, 0.3, 3) * 0.7
    chord = place(d, *[(0.05, soft_tone(f, d - 0.05) * adsr(n_(d - 0.05), 0.4, 1.8, 0, 0.6, 3) * a) for f, a in ((73.42, 0.3), (110.0, 0.22), (146.83, 0.16))])
    return reverb(place(d, (0, sub), (0, knock)) + chord, 1.5, 0.32, 2.0, 0.55)


def s_hook():  # 冒頭:低いうねりが立ち上がって止まる
    d = 1.0
    t = t_(d)
    swell = lp(noise(d), 150 + 500 * (t / d), 4) * (t / d) ** 1.5 * adsr(n_(d), 0.6, 0.3, 0, 0.1, 6) * 0.6
    thud = place(d, (0.55, soft_tone(lambda t: 48 + 20 * np.exp(-6 * t), 0.45) * adsr(n_(0.45), 0.005, 0.35, 0, 0.1, 3) * 0.8
                         + tone(lambda t: 3 * (48 + 20 * np.exp(-6 * t)), 0.45) * adsr(n_(0.45), 0.005, 0.25, 0, 0.1, 3) * 0.55))
    return reverb(swell + thud, 1.0, 0.25, 0.8)


def s_close():  # 締め:静かな着地(低い5度)
    d = 2.0
    w = place(d, (0, soft_tone(196.0, d) * adsr(n_(d), 0.08, 1.2, 0, 0.4, 3) * 0.4), (0.06, soft_tone(293.66, d - 0.06) * adsr(n_(d - 0.06), 0.08, 1.1, 0, 0.4, 3) * 0.3))
    return reverb(place(d, (0, w), (0.1, glass(587.33, 0.8, 0.2))), 1.2, 0.3, 1.0)


SOUNDS = {
    "key": s_key, "panel": s_panel, "send": s_send, "pulse": s_pulse, "tick": s_tick, "done": s_done,
    "alert": s_alert, "approve": s_approve, "whoosh": s_whoosh, "hit": s_hit, "hook": s_hook, "close": s_close,
}


# ---------------- 絵本(くものこ もこ)用:やわらかく、あたたかい音 ----------------
# 高く鋭い音は避け、鈴はオルゴールのように丸く(上は 4kHz 前後で削る)
def bell(freq, dur=1.6, level=1.0):
    """オルゴール風のやわらかい鈴:基音+少しずれた倍音がゆっくり消える"""
    w = (tone(freq, dur) + 0.35 * tone(freq * 2.0, dur, 0.3) + 0.12 * tone(freq * 3.01, dur, 0.7))
    return lp(w * adsr(n_(dur), 0.004, dur * 0.7, 0, 0.3, 4), 4200, 1) * level


def s_ehon_wind():  # そよ風
    d = 2.6
    t = t_(d)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.6
    w = lp(hp(noise(d), 150), 500 + 500 * shape, 3) * shape * 1.6
    return reverb(w, 1.0, 0.2, 0.6)


def s_ehon_page():  # 紙をめくる
    d = 0.5
    t = t_(d)
    sw = lp(hp(noise(d), 500), 1300 + 700 * np.sin(np.pi * t / d), 3) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    flap = lp(noise(0.06), 900, 2) * adsr(n_(0.06), 0.002, 0.03, 0, 0.02, 4) * 0.8
    return reverb(place(d, (0, sw), (0.32, flap)), 0.7, 0.15, 0.3)


def s_ehon_sparkle():  # 光の粒があふれる(場面転換)
    d = 1.8
    notes = [(0.00, 1046.5), (0.07, 1318.5), (0.14, 1568.0), (0.21, 1760.0), (0.30, 2093.0)]
    w = place(d, *[(st, bell(f, 1.2, 0.5 - i * 0.05)) for i, (st, f) in enumerate(notes)])
    air = lp(noise(d), 1500, 2) * adsr(n_(d), 0.3, 0.8, 0, 0.4, 3) * 0.25
    return reverb(w + air, 1.1, 0.3, 1.0)


def s_ehon_title():  # タイトル・おしまい:鈴の小さなメロディ
    d = 2.8
    notes = [(0.0, 784.0), (0.22, 987.8), (0.44, 1174.7), (0.7, 1568.0)]
    w = place(d, *[(st, bell(f, 2.0, 0.6)) for st, f in notes])
    w += place(d, (0, soft_tone(196.0, 2.4) * adsr(n_(2.4), 0.05, 1.6, 0, 0.5, 3) * 0.3))
    return reverb(w, 1.2, 0.3, 1.2)


def s_ehon_soft():  # 気づき:少しさみしい、やわらかい2音
    d = 2.0
    w = place(d, (0, bell(659.25, 1.6, 0.5)), (0.35, bell(587.33, 1.6, 0.45)))
    w += soft_tone(146.83, d) * adsr(n_(d), 0.2, 1.2, 0, 0.4, 3) * 0.25
    return reverb(w, 1.1, 0.3, 1.0)


def s_ehon_burst():  # 展開:光がふわっと弾ける
    d = 2.2
    t = t_(d)
    swell = lp(noise(d), 300 + 2500 * np.exp(-3 * t), 2) * adsr(n_(d), 0.02, 0.9, 0, 0.3, 3) * 0.6
    chord = place(d, *[(0.02 + i * 0.03, bell(f, 1.8, 0.4)) for i, f in enumerate((523.25, 659.25, 783.99, 1046.5))])
    thump = tone(lambda t: 90 * np.exp(-4 * t) + 50, 0.5) * adsr(n_(0.5), 0.005, 0.3, 0, 0.1, 3) * 0.6
    return reverb(place(d, (0, swell), (0, chord), (0, thump)), 1.3, 0.3, 1.2)


def s_ehon_rain():  # 雨:ぽつぽつ → さあっと(合成した粒の集まり)
    d = 6.0
    out = np.zeros(n_(d))
    k = 0
    tt = 0.15
    while tt < d - 0.2:
        f = 900 + rng.random() * 900
        drop = tone(lambda t: f * (1 + 0.6 * np.exp(-60 * t)), 0.05) * adsr(n_(0.05), 0.001, 0.025, 0, 0.01, 5)
        amp = 0.25 + 0.35 * min(1, tt / 3)
        i = n_(tt)
        out[i:i + len(drop)] += drop[: len(out) - i] * amp
        tt += 0.22 * np.exp(-tt / 2.2) + 0.03 + rng.random() * 0.05
        k += 1
    hiss = lp(hp(noise(d), 400), 2200, 2) * np.clip(t_(d) / 3, 0, 1) * 0.18
    w = lp(out, 3500, 1) + hiss
    fade = np.clip((d - t_(d)) / 0.8, 0, 1)
    return reverb(w * fade, 1.0, 0.25, 0.8)


def s_ehon_bloom():  # 結末:花がひらく、あたたかい和音
    d = 3.2
    notes = [(0.00, 392.0), (0.08, 493.9), (0.16, 587.3), (0.24, 784.0), (0.40, 987.8), (0.55, 1174.7)]
    w = place(d, *[(st, bell(f, 2.4, 0.42)) for st, f in notes])
    w += place(d, (0, soft_tone(196.0, 2.8) * adsr(n_(2.8), 0.15, 1.8, 0, 0.5, 3) * 0.35))
    return reverb(w, 1.4, 0.32, 1.4)


def s_ehon_tap():  # タップ:やわらかい「ぽん」
    d = 0.35
    w = soft_tone(lambda t: 520 * np.exp(-8 * t) + 330, d) * adsr(n_(d), 0.003, 0.12, 0, 0.05, 4)
    return reverb(w * 0.8, 0.6, 0.15, 0.3)


def s_ehon_gust():  # 強い風:「びゅうっ」と左から右へ抜ける(そよ風より速く、音の高さが上がって下がる)
    d = 1.3
    t = t_(d)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.7) ** 1.3
    cut = 450 + 1300 * np.sin(np.pi * np.clip(t / d, 0, 1) ** 0.8)
    w = lp(hp(noise(d), 220), cut, 2) * shape * 1.8
    whistle = bandpass(noise(d), 700 + 500 * np.sin(np.pi * np.clip(t / d, 0, 1)), 0.25) * shape * 0.9
    return reverb(w + whistle, 1.0, 0.22, 0.6)


SOUNDS.update({
    "ehon_wind": s_ehon_wind, "ehon_page": s_ehon_page, "ehon_sparkle": s_ehon_sparkle, "ehon_title": s_ehon_title,
    "ehon_soft": s_ehon_soft, "ehon_burst": s_ehon_burst, "ehon_rain": s_ehon_rain, "ehon_bloom": s_ehon_bloom, "ehon_tap": s_ehon_tap,
    "ehon_gust": s_ehon_gust,  # 最後に足す(乱数の順番が変わって、ほかの音が変わらないように)
})


def write(name, x):
    x = np.asarray(x, dtype=float)
    x = x - np.mean(x)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 0.5  # -6dBFS にそろえる(大きさの差は動画側の音量で調整)
    fade = min(len(x), n_(0.03))
    x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((x * 32767).astype("<i2").tobytes())


def centroid(x):
    """エネルギーの重心(Hz)と、3kHz より上にあるエネルギーの割合"""
    p = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return float((p * f).sum() / (p.sum() or 1)), float(p[f > 3000].sum() / (p.sum() or 1))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SOUNDS.items():
        x = fn()
        write(name, x)
        c, hi = centroid(x)
        print(f"sfx: {name:8s} {len(x) / SR:4.2f}s  重心 {c:6.0f}Hz  3kHz以上 {hi * 100:4.1f}%")
