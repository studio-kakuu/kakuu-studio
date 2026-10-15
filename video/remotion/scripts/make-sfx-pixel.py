"""作品006 v2「ドット絵アクション」の効果音を、レトロゲーム風にコードで合成して1本にまとめる(外部の音源・有料APIなし)。

音のもと:矩形波(デューティ比つき)・三角波・ノイズ(ゲーム機風の擬似乱数ノイズ)だけ。音程はなめらかに動かさず、段々に動かす所もある。
種類:斬撃・衝撃・バリア・ビーム・鎖・咆哮・氷が砕ける音・着地(+ジャンプ・羽ばたき・溜め・きらめき・足音)
鳴らす位置 CUES は scenes.ts の動きに合わせたコマ番号(24fps)。

使い方: python3 scripts/make-sfx-pixel.py → public/pixel-mv/sfx_mix.wav(48kHz / 16bit / ステレオ / 64秒)
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 48000
FPS = 24
TOTAL = 64.0
S = 192
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "pixel-mv", "sfx_mix.wav")
rng = np.random.default_rng(6)


def t_(d):
    return np.arange(int(SR * d)) / SR


def square(freq, d, duty=0.5):
    f = freq if callable(freq) else (lambda t: np.full_like(t, float(freq)))
    t = t_(d)
    ph = np.cumsum(f(t)) / SR
    return np.where((ph % 1.0) < duty, 1.0, -1.0)


def tri(freq, d):
    f = freq if callable(freq) else (lambda t: np.full_like(t, float(freq)))
    t = t_(d)
    ph = np.cumsum(f(t)) / SR
    return 4 * np.abs((ph % 1.0) - 0.5) - 1


def noise(d, rate=12000):
    """ゲーム機風のノイズ:rate ごとに値が変わる(低いほど「ザー」が粗い)"""
    n = int(SR * d)
    step = max(1, int(SR / rate))
    v = rng.choice([-1.0, 1.0], size=n // step + 2)
    return np.repeat(v, step)[:n]


def env(d, a=0.003, decay=0.2, hold=0.0):
    t = t_(d)
    return np.minimum(t / max(a, 1e-4), 1) * np.where(t < a + hold, 1, np.exp(-(t - a - hold) / max(decay, 1e-4)))


def steps(vals, d):
    """音程を段々に(ファミコンのアルペジオ風)"""
    n = len(vals)
    return lambda t: np.array(vals)[np.minimum((t / d * n).astype(int), n - 1)]


def lp(x, f):
    return signal.sosfilt(signal.butter(2, f, btype="low", fs=SR, output="sos"), x)


def echo(x, delay=0.09, fb=0.35, n=3):
    out = np.concatenate([x, np.zeros(int(SR * delay * n))])
    for k in range(1, n + 1):
        i = int(SR * delay * k)
        out[i : i + len(x)] += x * (fb ** k)
    return out


def norm(x, g=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * g


# ---------------- 音 ----------------
def slash(g=0.8):
    d = 0.22
    x = noise(d, 9000) * env(d, 0.002, 0.07)
    x = x * 0.7 + square(lambda t: 1800 - t * 6000, d, 0.125) * env(d, 0.001, 0.04) * 0.5
    return norm(echo(x, 0.05, 0.25, 2), g)


def impact(g=1.0, big=False):
    d = 0.6 if big else 0.4
    x = noise(d, 4000 if big else 6000) * env(d, 0.001, 0.12 if big else 0.08)
    x += square(lambda t: np.maximum(40, (160 if big else 220) - t * 500), d, 0.5) * env(d, 0.001, 0.15) * 0.8
    return norm(x, g)


def boom(g=1.0):
    d = 1.2
    x = noise(d, 1800) * env(d, 0.002, 0.35) + tri(lambda t: np.maximum(30, 90 - t * 60), d) * env(d, 0.002, 0.4)
    return norm(x, g)


def barrier_up(g=0.6):
    d = 0.42
    x = square(steps([523, 659, 784, 1047, 1319, 1568], d), d, 0.25) * env(d, 0.002, 0.3, 0.2)
    return norm(echo(x, 0.07, 0.3, 3), g)


def barrier_hit(g=0.7):
    d = 0.35
    x = square(steps([1568, 1175, 1568, 1175], d), d, 0.125) * env(d, 0.001, 0.12) + noise(d, 14000) * env(d, 0.001, 0.03) * 0.6
    return norm(echo(x, 0.06, 0.3, 2), g)


def barrier_burst(g=0.9):
    d = 0.8
    x = square(lambda t: 300 + t * 2400, d, 0.25) * env(d, 0.002, 0.3) * 0.6 + noise(d, 8000) * env(d, 0.002, 0.25)
    return norm(x, g)


def beam(g=0.7):
    d = 0.75
    t = t_(d)
    x = square(lambda t: 900 + 120 * np.sign(np.sin(2 * np.pi * 30 * t)), d, 0.5) * env(d, 0.005, 0.35, 0.25)
    x += noise(d, 16000) * env(d, 0.005, 0.2) * 0.4
    return norm(x, g)


def charge_short(g=0.4, d=0.25):
    return norm(square(lambda t: 300 + t * 3000, d, 0.25) * env(d, 0.005, 0.2, d * 0.6), g)


def chain(g=0.6):
    d = 0.45
    x = np.zeros(int(SR * d))
    for k, (tt, f) in enumerate([(0, 2093), (0.06, 1760), (0.12, 2349), (0.2, 1976), (0.28, 2093)]):
        i = int(tt * SR)
        l = int(0.05 * SR)
        x[i : i + l] += square(f, 0.05, 0.25)[: len(x[i : i + l])] * np.exp(-np.arange(l)[: len(x[i : i + l])] / SR / 0.015)
    return norm(x + noise(d, 10000) * env(d, 0.002, 0.08) * 0.3, g)


def roar(g=0.9, d=1.1, base=110):
    t = t_(d)
    pitch = lambda t: base * (1 + 0.5 * np.sin(np.pi * t / d)) * (1 + 0.06 * np.sign(np.sin(2 * np.pi * 14 * t)))
    x = square(pitch, d, 0.25) * 0.6 + noise(d, 3000) * 0.7
    e = np.minimum(t / 0.05, 1) * np.where(t < d * 0.6, 1, np.exp(-(t - d * 0.6) / (d * 0.15)))
    return norm(lp(x * e, 3500), g)


def ice_break(g=0.7, big=False):
    d = 0.7 if big else 0.45
    x = noise(d, 16000) * env(d, 0.001, 0.08)
    notes = [2637, 2093, 2349, 1760, 1976, 1568] if big else [2637, 2093, 1760]
    x += square(steps(notes, d * 0.7), d, 0.125) * env(d, 0.001, d * 0.4) * 0.6
    return norm(echo(x, 0.06, 0.3, 2), g)


def ice_form(g=0.5):
    d = 0.4
    x = tri(steps([1319, 1568, 1976, 2637], d), d) * env(d, 0.002, 0.25, 0.1) + noise(d, 16000) * env(d, 0.001, 0.03) * 0.3
    return norm(echo(x, 0.05, 0.3, 2), g)


def land(g=0.6):
    d = 0.22
    x = noise(d, 2500) * env(d, 0.001, 0.05) + tri(lambda t: np.maximum(50, 140 - t * 600), d) * env(d, 0.001, 0.06)
    return norm(x, g)


def jump(g=0.5):
    d = 0.18
    return norm(square(lambda t: 260 + t * 3200, d, 0.5) * env(d, 0.002, 0.12, 0.06), g)


def whoosh(g=0.6, d=0.5, up=True):
    x = noise(d, 7000) * np.sin(np.pi * t_(d) / d) ** 2
    x = lp(x, 4000)
    x += square(lambda t: (400 + t / d * 900) if up else (1300 - t / d * 900), d, 0.125) * np.sin(np.pi * t_(d) / d) ** 2 * 0.2
    return norm(x, g)


def flap(g=0.4):
    d = 0.16
    return norm(noise(d, 2200) * env(d, 0.01, 0.05), g)


def step_(g=0.25):
    d = 0.06
    return norm(noise(d, 3000) * env(d, 0.001, 0.015), g)


def hum(d=2.0, g=0.5, f0=70, f1=180):
    t = t_(d)
    x = square(lambda t: f0 + (f1 - f0) * t / d, d, 0.25) * 0.6 + square(lambda t: (f0 + (f1 - f0) * t / d) * 1.01, d, 0.5) * 0.4
    e = np.minimum(1, t / (d * 0.5)) * np.minimum(1, (d - t) / 0.15)
    return norm(lp(x, 2500) * e, g)


def charge_long(d=4.2, g=0.45):
    t = t_(d)
    notes = []
    for k in range(int(d * 14)):
        notes.append(440 * 2 ** ((k % 4) * 4 / 12 + (k // 4) * 1 / 12))
    x = square(steps(notes, d), d, 0.25) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.1)
    return norm(x, g)


def shing(g=0.6):
    d = 0.9
    x = square(steps([2637, 3136, 3951], 0.12), d, 0.125) * env(d, 0.001, 0.35)
    return norm(echo(x, 0.08, 0.35, 3), g)


def sparkle(d=3.0, g=0.3):
    x = np.zeros(int(SR * d))
    for k in range(int(d * 7)):
        i = int(rng.uniform(0, d - 0.2) * SR)
        f = rng.choice([2093, 2349, 2637, 3136, 3520])
        l = int(0.12 * SR)
        x[i : i + l] += square(f, 0.12, 0.25) * np.exp(-np.arange(l) / SR / 0.04) * rng.uniform(0.3, 1)
    x *= np.minimum(1, (d - t_(d)) / 0.8)
    return norm(echo(x, 0.1, 0.3, 2), g)


def blip(g=0.4):
    d = 0.12
    return norm(square(steps([1568, 2093], d), d, 0.5) * env(d, 0.001, 0.06, 0.04), g)


def sheathe(g=0.5):
    d = 0.5
    x = noise(d, 9000) * env(d, 0.01, 0.06) * 0.6
    i = int(0.2 * SR)
    x[i:] += square(steps([1760, 2637], 0.15), d - 0.2, 0.125)[: len(x) - i] * env(d - 0.2, 0.001, 0.12)[: len(x) - i]
    return norm(x, g)


def rewind(g=0.8):
    # 巻き戻し:音程が速く下がりながら震える+ざらついたノイズ
    d = 0.36
    t = t_(d)
    x = square(lambda t: 1800 * (1 - t / d) ** 2 + 120 + 80 * np.sign(np.sin(2 * np.pi * 45 * t)), d, 0.25) * 0.6
    x += noise(d, 5000) * 0.5
    return norm(x * np.minimum(1, (d - t) / 0.05), g)


def title_in(g=0.5):
    d = 0.5
    x = tri(steps([392, 523, 659, 784, 1047], 0.3), d) * env(d, 0.002, 0.25, 0.2)
    return norm(echo(x, 0.08, 0.3, 2), g)


def tick(g=0.3):
    d = 0.04
    return norm(square(1047, d, 0.5) * env(d, 0.001, 0.015), g)


def piko(g=0.8):
    # 決定音「ピコッ」:高い2音を短く
    d = 0.14
    x = square(steps([1760, 2637], d), d, 0.5) * env(d, 0.001, 0.05, 0.06)
    return norm(x, g)


# ---------------- 鳴らす位置(コマ, 音, 音量, 左右) ----------------
CUES = []
add = lambda f, x, g=1.0, pan=0.0: CUES.append((f, x, g, pan))
# 0. 冒頭:決め技(シーン7の縦一閃)→ 巻き戻し → タイトル画面(「はじめから」でピコッ)
add(0, whoosh(0.8, 0.6, up=False), 0.9, 0)
add(12, slash(), 1.0, 0)
add(14, impact(big=True), 1.0, 0)
add(14, boom(), 1.0, 0)
add(16, ice_break(big=True), 0.9, 0)
add(29, rewind(), 1.0, 0)
add(38, title_in(), 0.8, 0)
for k in (44, 50):
    add(k, tick(), 0.5, 0)
add(52, piko(), 1.0, 0)
# 1. 奇襲(60コマから)
O = 60
add(O + 1, blip(0.35), 0.6, 0.5)
for k in range(O + 8, O + 36, 4):
    add(k, step_(), 0.6, -0.4)
add(O + 44, whoosh(0.7, 0.45), 0.9, 0.4)
add(O + 58, impact(big=True), 1.0, 0.2)
add(O + 58, boom(), 0.6, 0)
add(O + 60, roar(d=1.3, base=95), 1.0, 0.2)
add(O + 70, ice_break(0.3), 0.2, 0.3)
for k in range(O + 110, 192, 4):
    add(k, step_(0.4), 0.6, 0.3)
add(O + 116, impact(0.6), 0.6, 0)
# 2. 防御
add(S + 8, land(0.5), 0.7, -0.3)
add(S + 10, barrier_up(), 0.9, -0.2)
add(S + 30, impact(big=True), 1.0, 0.1)
add(S + 30, barrier_hit(), 0.9, 0)
for h in (48, 66, 82):
    add(S + h, barrier_hit(), 0.7, 0.1)
    add(S + h, impact(0.5), 0.5, 0.1)
add(S + 96, barrier_burst(), 1.0, 0)
add(S + 100, roar(0.7, 0.6, 140), 0.7, 0.4)
add(S + 104, ice_form(), 0.9, -0.2)
for k in range(S + 130, S + 150, 5):
    add(k, step_(), 0.6, -0.3)
add(S + 150, jump(), 0.8, -0.1)
add(S + 162, land(), 0.8, 0)
add(S + 178, ice_break(big=True), 0.8, 0)
# 3. 跳躍斬り
add(2 * S + 0, jump(), 0.9, 0)
add(2 * S + 2, whoosh(0.6, 0.5), 0.7, 0)
add(2 * S + 24, charge_short(), 0.7, 0)
add(2 * S + 44, slash(), 1.0, 0.2)
add(2 * S + 46, impact(big=True), 1.0, 0.2)
add(2 * S + 46, ice_break(0.6, big=True), 0.6, 0.3)
add(2 * S + 50, roar(0.8, 0.9, 150), 0.8, 0.3)
add(2 * S + 64, land(), 0.9, 0)
add(2 * S + 176, ice_break(0.7), 0.7, 0)
# 4. 並走3連撃
for k in range(3 * S, 4 * S, 6):
    add(k, step_(0.25), 0.5, -0.3)
for k in range(3 * S + 2, 4 * S, 8):
    add(k, step_(0.3), 0.4, 0.4)
for i, h in enumerate((40, 90, 140)):
    add(3 * S + h - 8, jump(0.4), 0.6, -0.2)
    add(3 * S + h - 2, slash(), 1.0, 0)
    add(3 * S + h, impact(big=(i == 2)), 1.0, 0.2)
    add(3 * S + h, ice_break(0.5, big=(i == 2)), 0.5, 0.3)
add(3 * S + 150, roar(0.7, 0.8, 150), 0.7, 0.3)
add(3 * S + 164, hum(1.4, 0.5, 60, 140), 0.8, 0)
# 5. 変身・上昇・氷の階段とビーム
add(4 * S, hum(2.0, 0.6, 50, 220), 0.9, 0)
add(4 * S + 24, roar(d=1.2, base=90), 0.9, 0)
add(4 * S + 48, boom(), 1.0, 0)
add(4 * S + 48, ice_break(0.7, big=True), 0.7, 0)
for k in range(4 * S + 52, 4 * S + 80, 8):
    add(k, flap(), 0.8, 0)
add(4 * S + 70, whoosh(0.8, 0.8), 0.9, 0)
for i in range(7):
    add(4 * S + 86 + i * 6, ice_form(0.4), 0.5, -0.4 + i * 0.13)
for bt in (120, 150):
    add(4 * S + bt - 8, jump(0.4), 0.6, -0.2)
    add(4 * S + bt - 6, charge_short(0.4, 0.25), 0.6, 0.4)
    add(4 * S + bt, beam(), 0.9, 0.3)
    add(4 * S + bt + 3, ice_break(big=True), 0.8, -0.2)
for k in range(4 * S + 100, 4 * S + 186, 5):
    add(k, step_(0.25), 0.5, -0.1)
for k in range(4 * S + 92, 5 * S, 10):
    add(k, flap(0.25), 0.5, 0.4)
# 6. 拘束・溜め
add(5 * S + 6, barrier_up(0.6), 0.8, 0)
add(5 * S + 20, hum(4.0, 0.35, 90, 110), 0.6, 0)
for i in range(6):
    add(5 * S + 30 + i * 6, chain(), 0.85, [-0.6, 0.6, -0.5, 0.5, -0.3, 0.3][i])
add(5 * S + 80, roar(d=1.3, base=100), 0.8, 0.2)
add(5 * S + 100, chain(0.4), 0.5, -0.3)
add(5 * S + 70, charge_long(), 0.7, 0.3)
add(5 * S + 158, shing(), 0.8, 0.2)
# 7. 決着
add(6 * S, shing(0.5), 0.8, 0)
add(6 * S + 14, whoosh(0.9, 1.9, up=False), 1.0, 0)
add(6 * S + 58, slash(), 1.0, 0)
add(6 * S + 60, impact(big=True), 1.0, 0)
add(6 * S + 60, boom(), 1.0, 0)
add(6 * S + 62, ice_break(big=True), 1.0, 0)
add(6 * S + 70, sparkle(4.0, 0.4), 0.8, 0)
# 8. 余韻
add(7 * S, sparkle(5.5, 0.25), 0.6, 0)
add(7 * S + 24, land(), 0.9, 0)
add(7 * S + 70, sheathe(), 0.9, 0)
add(7 * S + 100, blip(0.3), 0.5, -0.3)


def main():
    n = int(SR * TOTAL)
    mix = np.zeros((n, 2))
    for frame, x, g, pan in CUES:
        i = int(frame / FPS * SR)
        x = x[: max(0, n - i)] * g
        mix[i : i + len(x), 0] += x * np.sqrt((1 - pan) / 2) * 1.414
        mix[i : i + len(x), 1] += x * np.sqrt((1 + pan) / 2) * 1.414
    t = np.arange(n) / SR
    mix *= np.minimum(1, (TOTAL - t) / 2.0)[:, None]
    mix = mix / np.max(np.abs(mix)) * 0.89
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with wave.open(OUT, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype("<i2").tobytes())
    print("wrote", OUT, len(CUES), "cues")


if __name__ == "__main__":
    main()
