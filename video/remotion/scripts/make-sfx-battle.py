"""作品006「アニメ戦闘MV」の効果音を、すべてコードで合成して1本の音声にまとめる(外部の音源・有料APIは使わない)。

音の種類:風・雨・氷が割れる音・杖を突く音・剣の衝撃音・結晶が砕ける音・鎖の音・魔法のうなり・狼の咆哮・石が崩れる音
(つなぎとして風切り音・低い衝撃音・ビーム・きらめきも足す)
鳴らす位置は CUES(24fps のコマ番号)。BattleMV.tsx の動きと合わせてある。

使い方: python3 scripts/make-sfx-battle.py → public/battle-mv/sfx_mix.wav(48kHz / 16bit / ステレオ / 64秒)
音量は書き出し(render-battle.mjs)で -14 LUFS にそろえる。
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 48000
FPS = 24
TOTAL = 64.0
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "battle-mv", "sfx_mix.wav")
rng = np.random.default_rng(20261015)


def t_(d):
    return np.arange(int(SR * d)) / SR


def noise(d):
    return rng.standard_normal(int(SR * d))


def env(d, a=0.005, decay=0.3):
    t = t_(d)
    e = np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) / max(decay, 1e-4))
    return e


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def sweep(f0, f1, d, kind="sin"):
    t = t_(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    return np.sin(ph)


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def verb(x, room=0.35, tail=1.2):
    """簡単な残響(減衰するノイズの畳み込み)"""
    ir = noise(tail) * np.exp(-t_(tail) / (tail / 5))
    ir = lp(ir, 5000)
    ir[0] = 0
    wet = signal.fftconvolve(x, ir)[: len(x) + int(SR * tail)]
    dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
    return dry + norm(wet, np.max(np.abs(x)) * room)


# ---------------- 音づくり ----------------
def wind(d=8.0, bright=1.0):
    n = noise(d)
    t = t_(d)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + 1) * np.sin(2 * np.pi * 0.11 * t)
    x = bp(n, 250 * bright, 1400 * bright) * gust + 0.4 * lp(n, 300)
    fade = np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 1.2)
    return norm(x * fade, 0.35)


def rain(d=6.0):
    x = hp(noise(d), 2500) * 0.25
    drops = np.zeros(len(x))
    for _ in range(int(d * 90)):
        i = rng.integers(0, len(x) - 600)
        drops[i : i + 600] += bp(noise(0.0125), 3000, 8000) * np.exp(-t_(0.0125) / 0.002) * rng.uniform(0.2, 1)
    t = t_(d)
    fade = np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 1.5)
    return norm((x + drops) * fade, 0.3)


def whoosh(d=0.45, up=True, gain=0.6):
    t = t_(d)
    f = np.linspace(400, 2600, len(t)) if up else np.linspace(2600, 400, len(t))
    n = noise(d)
    # 中心周波数が動くバンドパスを短い区間ごとにかける
    out = np.zeros(len(n))
    seg = 960
    for s in range(0, len(n), seg):
        c = f[s]
        out[s : s + seg] = bp(n[max(0, s - 2000) : s + seg], c * 0.6, min(c * 1.6, 20000))[-len(n[s : s + seg]) :]
    e = np.sin(np.pi * t / d) ** 2
    return norm(out * e, gain)


def boom(d=1.4, gain=1.0, f0=95):
    x = sweep(f0, 32, d) * env(d, 0.004, 0.35) + 0.5 * lp(noise(d), 400) * env(d, 0.002, 0.12)
    return norm(verb(x, 0.25, 1.0), gain)


def ice_crack(d=0.9, gain=0.7):
    x = np.zeros(int(SR * d))
    for k in range(14):
        i = int(rng.uniform(0, 0.35) * SR * (1 if k else 0))
        f = rng.uniform(2200, 6500)
        l = 0.12
        ping = np.sin(2 * np.pi * f * t_(l)) * np.exp(-t_(l) / 0.025)
        click = hp(noise(0.01), 2000) * np.exp(-t_(0.01) / 0.0015) * 2
        x[i : i + len(ping)] += ping * rng.uniform(0.3, 1)
        x[i : i + len(click)] += click
    x += lp(noise(d), 600) * env(d, 0.002, 0.08) * 0.8  # 割れる瞬間の低い鳴り
    return norm(verb(x, 0.3, 0.8), gain)


def staff_tap(gain=0.8):
    d = 1.2
    knock = np.sin(2 * np.pi * 170 * t_(d)) * env(d, 0.001, 0.06) + 0.6 * np.sin(2 * np.pi * 410 * t_(d)) * env(d, 0.001, 0.03)
    click = np.zeros(len(knock))
    click[:480] = bp(noise(0.01), 800, 4000) * np.exp(-t_(0.01) / 0.002)
    shimmer = sum(np.sin(2 * np.pi * f * t_(d)) for f in (1320, 1980, 2640)) * env(d, 0.05, 0.4) * 0.15
    return norm(verb(knock + click + shimmer, 0.4, 1.4), gain)


def sword_hit(gain=0.9, big=False):
    d = 2.0 if big else 1.4
    parts = [(520, 1.0), (1243, 0.7), (2011, 0.5), (3157, 0.35), (4490, 0.2)]
    ring = sum(a * np.sin(2 * np.pi * f * t_(d) + rng.uniform(0, 6)) * env(d, 0.001, 0.25 + 0.5 / (i + 1)) for i, (f, a) in enumerate(parts))
    trans = hp(noise(d), 1500) * env(d, 0.0005, 0.02) * 2
    thump = np.sin(2 * np.pi * 70 * t_(d)) * env(d, 0.001, 0.12) * (1.5 if big else 0.8)
    return norm(verb(ring * 0.5 + trans + thump, 0.45 if big else 0.3, 1.6), gain)


def crystal_shatter(gain=0.75, d=0.9):
    x = np.zeros(int(SR * (d + 0.2)))
    for k in range(40):
        i = int(rng.beta(1.2, 4) * d * SR)
        f = rng.uniform(1800, 7500)
        l = rng.uniform(0.05, 0.2)
        ping = np.sin(2 * np.pi * f * t_(l)) * np.exp(-t_(l) / (l / 4))
        x[i : i + len(ping)] += ping * rng.uniform(0.2, 1)
    x[: int(SR * 0.3)] += hp(noise(0.3), 3000) * np.exp(-t_(0.3) / 0.05)
    x[: int(SR * 0.4)] += lp(noise(0.4), 500) * np.exp(-t_(0.4) / 0.06) * 0.8
    return norm(verb(x, 0.35, 1.0), gain)


def chain(gain=0.6):
    d = 0.8
    x = np.zeros(int(SR * d))
    for k in range(rng.integers(5, 8)):
        i = int(rng.uniform(0, 0.5) * SR)
        l = 0.15
        tt = t_(l)
        clink = sum(np.sin(2 * np.pi * f * tt) for f in rng.uniform([900, 2100, 3700], [1200, 2600, 4400])) * np.exp(-tt / 0.03)
        x[i : i + len(clink)] += clink * rng.uniform(0.4, 1)
    x += bp(noise(d), 400, 1500) * env(d, 0.01, 0.25) * 0.4  # じゃらっと擦れる音
    return norm(verb(x, 0.3, 0.8), gain)


def magic_hum(d=2.0, f0=82, rise=1.0, gain=0.5, bright=1.0):
    t = t_(d)
    f = f0 * rise ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.zeros(len(t))
    for det in (0.995, 1.0, 1.006):
        x += 2 * ((ph * det / (2 * np.pi)) % 1.0) - 1
    x = lp(x, 900 * bright) * (1 + 0.25 * np.sin(2 * np.pi * 6 * t))
    x += 0.2 * np.sin(ph * 4) * np.sin(np.pi * t / d)
    fade = np.minimum(1, t / (d * 0.35)) * np.minimum(1, (d - t) / (d * 0.25))
    return norm(x * fade, gain)


def roar(d=1.5, gain=0.9, f0=95):
    t = t_(d)
    f = f0 * (1 + 0.25 * np.sin(np.pi * t / d)) * (0.8 + 0.2 * (1 - t / d))
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = (2 * ((ph / (2 * np.pi)) % 1.0) - 1) + 0.8 * noise(d)
    growl = 1 + 0.6 * np.sin(2 * np.pi * 28 * t + 3 * np.sin(2 * np.pi * 3 * t))
    x = bp(src, 250, 520) * 1.0 + bp(src, 700, 1300) * 0.7 + bp(src, 2000, 3200) * 0.25
    e = np.minimum(1, t / 0.08) * np.exp(-np.maximum(t - d * 0.55, 0) / (d * 0.2))
    return norm(verb(x * growl * e, 0.35, 1.4), gain)


def stone_crumble(d=1.4, gain=0.8):
    x = lp(noise(d), 900) * env(d, 0.005, 0.4) * 0.5
    for k in range(60):
        i = int(rng.beta(1.3, 3) * (d - 0.1) * SR)
        l = 0.06
        tt = t_(l)
        g = (np.sin(2 * np.pi * rng.uniform(80, 240) * tt) + bp(noise(l), 300, 2500) * 0.8) * np.exp(-tt / 0.012)
        x[i : i + len(g)] += g * rng.uniform(0.2, 1)
    return norm(verb(x, 0.3, 1.0), gain)


def beam(d=0.9, gain=0.7):
    t = t_(d)
    x = sweep(1400, 220, d, "saw") * 0.6 + bp(noise(d), 2000, 6000) * 0.4
    x = lp(x, 5000) * (1 + 0.4 * np.sin(2 * np.pi * 40 * t))
    e = np.minimum(1, t / 0.02) * np.exp(-t / 0.35)
    return norm(verb(x * e, 0.3, 0.9), gain)


def shimmer(d=3.0, gain=0.35):
    x = np.zeros(int(SR * d))
    for k in range(70):
        i = int(rng.uniform(0, d - 0.4) * SR)
        f = rng.uniform(2500, 8000)
        l = 0.35
        p = np.sin(2 * np.pi * f * t_(l)) * np.exp(-t_(l) / 0.08)
        x[i : i + len(p)] += p * rng.uniform(0.2, 1)
    t = t_(d)
    x *= np.minimum(1, (d - t) / 1.0)
    return norm(verb(x, 0.5, 1.5), gain)


def shing(gain=0.6):
    d = 1.6
    t = t_(d)
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dd) for f, dd in ((2350, 0.6), (3520, 0.4), (4700, 0.3), (1170, 0.8)))
    x[: int(SR * 0.15)] += hp(noise(0.15), 4000) * np.exp(-t_(0.15) / 0.03)
    return norm(verb(x, 0.4, 1.4), gain)


# ---------------- 鳴らす位置(コマ, 音, 音量, 左右 -1〜1) ----------------
S = 192
CUES = [
    # 1. 奇襲
    (0, wind(8.0), 0.8, 0), *[(f, whoosh(0.18, i % 2 == 0, 0.5), 0.6, (-0.4 if i % 2 else 0.4)) for i, f in enumerate([0, 10, 19, 26, 32, 37])],
    (44, rain(6.2), 0.9, 0), (104, whoosh(0.5, True), 0.8, 0), (110, roar(1.6), 1.0, 0), (112, boom(1.4, 1.0), 0.9, 0),
    (124, stone_crumble(1.4), 0.9, -0.2), (162, stone_crumble(1.2), 0.9, 0.2), (176, whoosh(0.4, False), 0.6, 0),
    # 2. 防御
    (S + 6, whoosh(0.6, False), 0.7, 0), (S + 16, staff_tap(), 1.0, 0), (S + 18, magic_hum(1.6, 98, 1.5, 0.5, 1.4), 0.7, 0),
    (S + 44, boom(1.6, 1.0, 110), 1.0, 0), (S + 44, sword_hit(0.7), 0.6, 0), (S + 44, crystal_shatter(0.5, 0.5), 0.5, 0.2),
    (S + 96, boom(1.0, 0.6, 120), 0.7, 0), (S + 108, ice_crack(1.0), 1.0, 0), (S + 128, roar(1.0, 0.7, 120), 0.6, 0.2),
    (S + 140, whoosh(0.5, True), 0.7, 0), (S + 170, crystal_shatter(0.6, 0.6), 0.6, 0),
    # 3. 跳躍斬り
    (2 * S + 2, whoosh(0.6, True), 0.9, 0), (2 * S + 40, whoosh(0.35, True), 0.7, 0.3), (2 * S + 62, sword_hit(1.0, True), 1.0, 0),
    (2 * S + 62, crystal_shatter(0.9), 0.9, 0.3), (2 * S + 62, boom(1.2, 0.7), 0.7, 0), (2 * S + 68, roar(1.3, 0.8, 120), 0.7, 0.4),
    (2 * S + 172, crystal_shatter(0.6, 0.6), 0.6, 0),
    # 4. 並走連撃
    (3 * S, wind(8.0, 1.8), 0.9, 0), (3 * S, ice_crack(0.6, 0.4), 0.5, -0.5),
    *[(3 * S + h - 3, whoosh(0.25, True, 0.7), 0.8, -0.3) for h in (34, 84, 134)],
    *[(3 * S + h + 3, sword_hit(0.9), 0.85, 0.2) for h in (34, 84, 134)],
    *[(3 * S + h + 3, crystal_shatter(0.7, 0.6), 0.7, 0.4) for h in (34, 84, 134)],
    (3 * S + 166, magic_hum(1.4, 70, 1.6, 0.5), 0.7, 0),
    # 5. 変身・上昇
    (4 * S, magic_hum(2.6, 62, 2.2, 0.6, 1.2), 0.9, 0), (4 * S + 38, roar(1.8, 1.0, 85), 1.0, 0), (4 * S + 56, boom(1.6, 1.0, 80), 1.0, 0),
    (4 * S + 56, crystal_shatter(0.8), 0.8, 0), (4 * S + 62, whoosh(1.0, True), 0.9, 0), (4 * S + 72, wind(4.8, 1.3), 0.7, 0),
    *[(4 * S + 96 + i * 8, ice_crack(0.5, 0.35), 0.45, (-0.3 if i % 2 else 0.3)) for i in range(8)],
    *[(4 * S + b - 6, whoosh(0.3, False, 0.6), 0.7, 0.3) for b in (128, 158)],
    *[(4 * S + b, beam(), 0.9, -0.2) for b in (128, 158)],
    *[(4 * S + b + 3, ice_crack(0.7, 0.6), 0.7, -0.3) for b in (128, 158)],
    # 6. 拘束
    (5 * S + 2, staff_tap(), 0.9, -0.3), (5 * S + 4, magic_hum(4.0, 78, 1.3, 0.5, 1.6), 0.8, 0),
    *[(5 * S + 30 + i * 7, chain(), 0.85, [-0.6, 0.6, -0.4, 0.4, -0.2, 0.2][i]) for i in range(6)],
    (5 * S + 80, roar(1.6, 0.9, 105), 0.9, 0), (5 * S + 60, magic_hum(5.5, 196, 2.0, 0.4, 3.0), 0.6, 0.3),
    (5 * S + 100, chain(), 0.6, -0.3), (5 * S + 122, chain(), 0.5, 0.3),
    # 7. 決着
    (6 * S, shing(), 0.9, 0), (6 * S + 14, whoosh(1.9, True, 0.8), 1.0, 0), (6 * S + 14, wind(2.0, 2.0), 0.6, 0),
    (6 * S + 58, sword_hit(1.0, True), 1.0, 0), (6 * S + 58, boom(2.0, 1.0, 70), 1.0, 0), (6 * S + 58, crystal_shatter(1.0, 1.2), 0.9, 0),
    (6 * S + 60, ice_crack(1.0), 0.8, 0), (6 * S + 62, shimmer(4.0), 0.7, 0),
    # 8. 余韻
    (7 * S, wind(8.0, 0.8), 0.6, 0), (7 * S, shimmer(6.0, 0.3), 0.5, 0),
]


def main():
    n = int(SR * TOTAL)
    mix = np.zeros((n, 2))
    for frame, x, g, pan in CUES:
        i = int(frame / FPS * SR)
        x = x[: max(0, n - i)] * g
        l = np.sqrt((1 - pan) / 2)
        r = np.sqrt((1 + pan) / 2)
        mix[i : i + len(x), 0] += x * l * 1.414
        mix[i : i + len(x), 1] += x * r * 1.414
    # 最後はゆっくり消える(映像のフェードアウトに合わせる)
    t = np.arange(n) / SR
    mix *= np.minimum(1, (TOTAL - t) / 2.0)[:, None]
    mix = mix / np.max(np.abs(mix)) * 0.89
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with wave.open(OUT, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype("<i2").tobytes())
    print("wrote", OUT, f"{len(CUES)} cues")


if __name__ == "__main__":
    main()
