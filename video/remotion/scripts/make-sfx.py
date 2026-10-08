"""KAKUU STUDIO 効果音ジェネレーター(すべてコードで合成。外部の音源・サンプルは使わない)

使い方: python3 scripts/make-sfx.py   → public/sfx/*.wav(48kHz / 16bit / モノラル)
音の一覧は SOUNDS を参照。音色を変えたいときはここの数値をいじって作り直す。
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(20261008)  # 毎回同じ音になるよう乱数を固定


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, a=0.004, r=0.08, curve=4.0):
    """立ち上がり a 秒・指数減衰の包絡"""
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    dec = np.exp(-curve * t / max(r, 1e-4))
    return att * dec


def sine(freq, dur, phase=0.0):
    t = t_(dur)
    if callable(freq):
        f = freq(t)
        ph = 2 * np.pi * np.cumsum(f) / SR + phase
    else:
        ph = 2 * np.pi * freq * t + phase
    return np.sin(ph)


def noise(dur):
    return rng.standard_normal(int(SR * dur))


def lowpass(x, cutoff):
    """1次のローパス(cutoff は Hz、配列なら時間変化)"""
    y = np.zeros_like(x)
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def place(total, *parts):
    """(開始秒, 波形) を重ねる"""
    out = np.zeros(int(SR * total))
    for start, w in parts:
        i = int(SR * start)
        j = min(len(out), i + len(w))
        out[i:j] += w[: j - i]
    return out


def echo(x, delay=0.11, fb=0.35, taps=4):
    out = np.copy(x)
    d = int(SR * delay)
    for k in range(1, taps + 1):
        out[d * k:] += x[: len(x) - d * k] * (fb ** k) if d * k < len(x) else 0
    return out


def ping(freq, dur=0.35, r=0.12, harm=0.25):
    w = sine(freq, dur) + harm * sine(freq * 2.01, dur) + 0.08 * sine(freq * 3.0, dur)
    return w * env(len(w), 0.002, r)


# ---------------- 音の定義 ----------------
def s_key():  # キー入力:ごく短いクリック
    n = noise(0.04)
    w = highpass(n, 3000) * env(len(n), 0.0005, 0.008, 5) * 0.8 + ping(2400, 0.04, 0.01, 0) * 0.25
    return w


def s_panel():  # パネル出現:デジタルな「ピッ」+ 低いトン
    up = sine(lambda t: 900 + 2600 * t, 0.12) * env(int(SR * 0.12), 0.002, 0.05)
    thump = sine(lambda t: 140 - 60 * t, 0.15) * env(int(SR * 0.15), 0.002, 0.06) * 0.6
    return place(0.3, (0, up * 0.5), (0, thump))


def s_send():  # 送信:上がっていくチャープ
    d = 0.22
    w = sine(lambda t: 380 + 1400 * (t / d) ** 1.6, d) * env(int(SR * d), 0.01, 0.12, 2.5)
    return echo(w * 0.7, 0.07, 0.3, 3)


def s_pulse():  # パルス:中心から放たれる低い「ドゥン」+ 空気のうねり
    d = 1.2
    boom = sine(lambda t: 95 * np.exp(-2.4 * t) + 38, d) * env(int(SR * d), 0.003, 0.45, 3)
    air = lowpass(noise(d), 300 + 2600 * np.exp(-3 * t_(d))) * env(int(SR * d), 0.04, 0.5, 3) * 0.9
    shimmer = sum(ping(f, d, 0.4, 0) for f in (1320, 1980, 2640)) * 0.08
    return boom * 0.9 + air + shimmer


def s_tick():  # カウントアップ:数字の上がり方(ゆっくり止まる)に合わせた細かい刻み
    d = 2.3
    parts = []
    n = 18
    for k in range(n):
        x = k / (n - 1)
        start = d * 0.95 * (1 - (1 - x) ** 0.33)  # ease-out に合わせて間隔が広がる
        parts.append((start, ping(1700 + 500 * x, 0.05, 0.012, 0.1) * (0.55 + 0.45 * x)))
    return place(d + 0.1, *parts) * 0.6


def s_done():  # 部署の完了:やわらかい2音
    return place(0.5, (0, ping(1318.5, 0.4, 0.12)), (0.07, ping(1975.5, 0.4, 0.16))) * 0.5


def s_alert():  # 承認待ち:注意をひく2音 × 2
    a = ping(880, 0.3, 0.1, 0.35)
    b = ping(1318.5, 0.3, 0.1, 0.35)
    return echo(place(1.0, (0, a), (0.16, b), (0.42, a), (0.58, b)) * 0.55, 0.12, 0.25, 3)


def s_approve():  # 承認:明るい和音のアルペジオ
    notes = [(0, 1046.5), (0.06, 1318.5), (0.12, 1568.0), (0.18, 2093.0)]
    w = place(1.6, *[(s, ping(f, 1.2, 0.5, 0.2)) for s, f in notes])
    w += place(1.6, (0, sine(lambda t: 160 - 70 * t, 0.3) * env(int(SR * 0.3), 0.002, 0.12) * 0.7))
    return echo(w * 0.45, 0.13, 0.3, 4)


def s_whoosh():  # 場面転換:フィルターの開閉するノイズ
    d = 0.55
    t = t_(d)
    cut = 400 + 5200 * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return lowpass(noise(d), cut) * np.sin(np.pi * t / d) ** 1.5 * 0.8


def s_hit():  # DAY 1 COMPLETE:低い衝撃+きらめき
    d = 2.2
    boom = sine(lambda t: 70 * np.exp(-1.6 * t) + 30, d) * env(int(SR * d), 0.002, 0.9, 3)
    crack = highpass(noise(0.25), 1500) * env(int(SR * 0.25), 0.001, 0.05) * 0.6
    sparkle = sum(ping(f, d, 0.7, 0) * 0.07 for f in (2093, 2637, 3136, 4186))
    return place(d, (0, boom), (0, crack)) + sparkle


def s_hook():  # 冒頭:短く鋭い立ち上がり
    d = 0.6
    w = sine(lambda t: 220 + 660 * np.exp(-8 * t), d) * env(int(SR * d), 0.002, 0.18, 3) * 0.6
    return w + highpass(noise(d), 4000) * env(int(SR * d), 0.001, 0.03) * 0.3


def s_close():  # 締め:静かな着地
    return place(1.4, (0, ping(659.25, 1.3, 0.6, 0.2)), (0.1, ping(987.77, 1.2, 0.6, 0.2))) * 0.4


SOUNDS = {
    "key": s_key, "panel": s_panel, "send": s_send, "pulse": s_pulse, "tick": s_tick, "done": s_done,
    "alert": s_alert, "approve": s_approve, "whoosh": s_whoosh, "hit": s_hit, "hook": s_hook, "close": s_close,
}


def write(name, x):
    x = np.asarray(x, dtype=float)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 0.89  # -1dBFS 付近にそろえる
    fade = min(len(x), int(SR * 0.01))
    x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((x * 32767).astype("<i2").tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SOUNDS.items():
        write(name, fn())
        print("sfx:", name)
