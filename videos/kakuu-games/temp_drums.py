"""仮の音:120BPM の太鼓とエレクトロのドラム(コードで合成)。曲が届いたら差し替える。
使い方: python3 temp_drums.py <秒> <解放の秒,...> <出力.wav>"""
import sys, wave, numpy as np
SR = 44100
dur = float(sys.argv[1]); rel = [float(x) for x in sys.argv[2].split(',')] if sys.argv[2] else []; out = sys.argv[3]
N = int(dur * SR); L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
def put(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); n = min(len(sig), N - i)
    if n <= 0: return
    L[i:i + n] += sig[:n] * g * (1 - max(0, pan)); R[i:i + n] += sig[:n] * g * (1 + min(0, pan))
def env(n, d): return np.exp(-np.arange(n) / (d * SR))
def taiko(big=1.0):
    n = int(SR * (0.6 + 0.8 * big)); t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t / 0.035) - (8 * big) * t
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.22 + 0.4 * big)
    skin = rng.standard_normal(n) * env(n, 0.012) * 0.5
    return np.tanh((body + skin) * 1.6) * 0.9
def ka():
    n = int(SR * 0.08); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 820 * t) * 0.5 + rng.standard_normal(n) * 0.5) * env(n, 0.012) * 0.5
def snare():
    n = int(SR * 0.25); t = np.arange(n) / SR
    nz = rng.standard_normal(n); nz = nz - np.convolve(nz, np.ones(6) / 6, 'same')
    return (nz * env(n, 0.05) * 0.7 + np.sin(2 * np.pi * 190 * t) * env(n, 0.04) * 0.5)
def hat(open_=False):
    n = int(SR * (0.12 if open_ else 0.04)); nz = rng.standard_normal(n)
    nz = nz - np.convolve(nz, np.ones(3) / 3, 'same')
    return nz * env(n, 0.03 if open_ else 0.008) * 0.25
def swell(d):
    n = int(SR * d); x = np.linspace(0, 1, n); nz = rng.standard_normal(n)
    return nz * x ** 3 * 0.18
beat = 0.5
for b in range(int(dur / beat)):
    t = b * beat; inbar = b % 4
    if inbar in (0, 2): put(taiko(0.15 if inbar == 0 else 0.0), t, 0, 1.0 if inbar == 0 else 0.8)
    if inbar in (1, 3): put(snare(), t, 0, 0.55)
    for k in range(2): put(hat(open_=(k == 1 and inbar == 3)), t + k * 0.25, 0.3 if k else -0.3, 0.9 if k else 0.6)
    if inbar == 3: put(ka(), t + 0.25, -0.4, 0.7); put(ka(), t + 0.375, 0.4, 0.6)
for r in rel:
    put(swell(1.5), r - 1.5, 0, 1.0)
    put(taiko(1.0), r, 0, 1.25)
    n = int(SR * 1.2); put(rng.standard_normal(n) * env(n, 0.35) * 0.22, r, 0, 1.0)
mix = np.stack([L, R], 1); mix /= np.abs(mix).max() / 0.9
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
