"""テーマ曲のテンポ・拍・小節の頭・曲の区切りを調べる(numpy だけ)。
使い方: python3 analyze_song.py <曲.mp3> <出力.json>"""
import sys, json, subprocess, numpy as np
src, dst = sys.argv[1], sys.argv[2]
SR = 22050
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.float32).astype(float)
dur = len(x) / SR
H, N = 256, 1024
fr = SR / H
nF = (len(x) - N) // H
win = np.hanning(N)
S = np.abs(np.fft.rfft(np.stack([x[i * H:i * H + N] * win for i in range(nF)]), axis=1))
freqs = np.fft.rfftfreq(N, 1 / SR)
L = np.log1p(S * 10)
flux = np.maximum(0, np.diff(L, axis=0)).sum(1); flux = np.r_[0, flux]
low = np.maximum(0, np.diff(L[:, freqs < 150], axis=0)).sum(1); low = np.r_[0, low]
def norm(a): a = a - np.convolve(a, np.ones(32) / 32, 'same'); return np.maximum(a, 0)
on = norm(flux); onl = norm(low)
# テンポ:自己相関(70〜180BPM)
ac = np.correlate(on, on, 'full')[len(on) - 1:]
bpms = np.arange(70, 180.01, 0.05)
score = []
for b in bpms:
    lag = 60 / b * fr
    s = sum(np.interp(lag * k, np.arange(len(ac)), ac) for k in (1, 2, 4))
    score.append(s)
score = np.array(score); top = bpms[np.argsort(score)[::-1][:8]]
# 細かく:拍の位置に onset が乗る強さで BPM と位相を合わせる
t = np.arange(len(on)) / fr
best = None
for b in np.arange(top[0] - 1.5, top[0] + 1.5, 0.005):
    P = 60 / b
    ph = np.arange(0, P, 0.005)
    vals = [np.interp(np.arange(p, dur, P), t, on).sum() for p in ph]
    k = int(np.argmax(vals))
    if best is None or vals[k] > best[0]: best = (vals[k], b, ph[k])
_, bpm, phase = best
P = 60 / bpm
beats = np.arange(phase, dur, P)
# 小節の頭:4拍のどれが低音のアクセント(キック・太鼓)が強いか
acc = [np.interp(beats[k::4], t, onl).sum() for k in range(4)]
d0 = int(np.argmax(acc))
downs = beats[d0::4]
# 小節ごとの音量(RMS)と低音の強さ → 区切り
rms = np.sqrt(np.convolve(x * x, np.ones(H) / H, 'same')[::H][:len(t)])
bars = []
for i, a in enumerate(downs):
    b = a + 4 * P
    m = (t >= a) & (t < b)
    if m.sum() == 0: continue
    bars.append(dict(i=i, t=round(float(a), 3), rms=round(float(20 * np.log10(rms[m].mean() + 1e-9)), 1), low=round(float(onl[m].mean()), 2), bright=round(float((S[m][:, freqs > 3000].sum() / (S[m].sum() + 1e-9))), 3)))
out = dict(dur=round(dur, 3), bpm=round(float(bpm), 3), beat=round(P, 5), phase=round(float(phase), 4), downbeat0=round(float(downs[0]), 4), beatsPerBar=4,
           tempoCandidates=[round(float(b), 2) for b in top[:5]], accentByBeat=[round(float(a), 1) for a in acc], bars=bars)
json.dump(out, open(dst, 'w'), ensure_ascii=False, indent=1)
print('dur', out['dur'], 'bpm', out['bpm'], 'first downbeat', out['downbeat0'], 'cands', out['tempoCandidates'], 'acc', out['accentByBeat'])
for b in bars: print(f"bar {b['i']:3d} {b['t']:7.2f}s  {b['rms']:6.1f}dB low {b['low']:5.2f} bright {b['bright']:.3f}")
