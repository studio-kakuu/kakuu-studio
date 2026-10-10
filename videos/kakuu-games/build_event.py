"""1競技ぶんのモーションを、120BPM の拍に合わせてつなぎ、Remotion 用の JSON に書き出す。

- 骨格は 124_05 の人の骨の長さに統一(どのクリップも同じコマの体で動かす)
- クリップごとに「出力の秒 → 元データの秒」のキーで速さを合わせる(ドリブルの手の一番低い所=拍、シュートの頂点=小節の1拍目)
- 同じ秒のキーを2つ置いた所が「止め(ヒットストップ)」
- つなぎ目は関節の回転を球面補間で混ぜる
使い方: python3 build_event.py basketball
"""
import json, sys, math
import numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from bvh import load, _rot

HERE = Path(__file__).parent
FPS, BPM = 30, 120
H_KOMA = 1.62          # 足〜頭の骨の高さ(m)。モニターの頭はこの上に乗る

# ── 回転の道具 ──
def m2q(R):
    """(N,3,3) → (N,4) [x,y,z,w]"""
    q = np.zeros((len(R), 4))
    tr = R[:, 0, 0] + R[:, 1, 1] + R[:, 2, 2]
    for i, m in enumerate(R):
        if tr[i] > 0:
            s = math.sqrt(tr[i] + 1) * 2; q[i] = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, s / 4]
        elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
            s = math.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; q[i] = [s / 4, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
        elif m[1, 1] > m[2, 2]:
            s = math.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; q[i] = [(m[0, 1] + m[1, 0]) / s, s / 4, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
        else:
            s = math.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; q[i] = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, s / 4, (m[1, 0] - m[0, 1]) / s]
    return q / np.linalg.norm(q, axis=1, keepdims=True)

def q2m(q):
    x, y, z, w = q[..., 0], q[..., 1], q[..., 2], q[..., 3]
    return np.stack([np.stack([1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], -1),
                     np.stack([2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], -1),
                     np.stack([2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)], -1)], -2)

def slerp(a, b, t):
    d = np.sum(a * b, -1, keepdims=True); b = np.where(d < 0, -b, b); d = np.abs(d)
    t = np.asarray(t, float)[..., None] if np.ndim(t) else t
    lin = d > 0.9995
    th = np.arccos(np.clip(d, -1, 1)); s = np.sin(th) + 1e-9
    r = np.where(lin, a + (b - a) * t, (np.sin((1 - t) * th) * a + np.sin(t * th) * b) / s)
    return r / np.linalg.norm(r, axis=-1, keepdims=True)

def yaw_mat(deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])

# ── 骨格(124_05 の骨を基準に、背丈を H_KOMA にそろえる)──
CANON, _, _ = load(HERE / 'mocap/124_05.bvh')
names = [j.name for j in CANON]
rest = {}
for j in CANON:
    rest[j.name] = j.offset.copy() if j.parent is None else rest[j.parent.name] + j.offset
foot_y = min(rest['LeftToeBase'][1], rest['RightToeBase'][1])
SCALE = H_KOMA / (rest['Head_end'][1] - foot_y)
LEG = lambda J: sum(np.linalg.norm(j.offset) for j in J if j.name in ('LeftUpLeg', 'LeftLeg', 'LeftFoot'))
CANON_LEG = LEG(CANON)

class Clip:
    def __init__(self, name):
        J, data, ft = load(HERE / f'mocap/{name}.bvh')
        assert [j.name for j in J] == names, name
        self.ft, self.F = ft, len(data)
        k = CANON_LEG / LEG(J)
        self.root = data[:, :3] * k          # 背丈の違いを合わせる
        self.q = {}
        for j in J:
            if not j.channels: continue
            R = np.tile(np.eye(3), (self.F, 1, 1))
            for c, ch in enumerate(j.channels):
                if ch.endswith('rotation'): R = R @ _rot(ch[0], data[:, j.ch0 + c])
            self.q[j.name] = m2q(R)
    def sample(self, s):
        """元データの秒 s の姿勢(1フレーム目はTポーズなので使わない)"""
        x = np.clip(s / self.ft, 1, self.F - 1.001); i = int(x); f = x - i
        return {n: slerp(q[i], q[i + 1], f) for n, q in self.q.items()}, self.root[i] * (1 - f) + self.root[i + 1] * f

def fk_pose(lq, root):
    pos, rot = {}, {}
    for j in CANON:
        R = q2m(lq[j.name]) if j.name in lq else np.eye(3)
        if j.parent is None:
            pos[j.name] = root; rot[j.name] = R
        else:
            pr = rot[j.parent.name]; pos[j.name] = pos[j.parent.name] + pr @ j.offset; rot[j.name] = pr @ R
    return pos, rot

def facing(lq):
    f = q2m(lq['Hips']) @ np.array([0, 0, 1.0]); return math.degrees(math.atan2(f[0], f[2]))

def warp(keys, t):
    """出力の秒 → 元データの秒(キーの外は端の速さで延ばす)"""
    o = [k[0] for k in keys]; s = [k[1] for k in keys]
    if t <= o[0]:
        r = (s[1] - s[0]) / (o[1] - o[0]) if o[1] > o[0] else 1; return s[0] + (t - o[0]) * r
    if t >= o[-1]:
        r = (s[-1] - s[-2]) / (o[-1] - o[-2]) if o[-1] > o[-2] else 1; return s[-1] + (t - o[-1]) * r
    for a in range(len(o) - 1):
        if o[a] <= t <= o[a + 1]:
            return s[a] if o[a + 1] == o[a] else s[a] + (s[a + 1] - s[a]) * (t - o[a]) / (o[a + 1] - o[a])

def smooth(x, w):
    k = np.exp(-0.5 * (np.arange(-3 * w, 3 * w + 1) / w) ** 2); k /= k.sum()
    pad = np.pad(x, ((3 * w, 3 * w),) + ((0, 0),) * (x.ndim - 1), mode='edge')
    return np.stack([np.convolve(pad[:, c], k, 'valid') for c in range(x.shape[1])], 1) if x.ndim > 1 else np.convolve(pad, k, 'valid')

# ── 競技ごとの設計 ──
EVENTS = {
    'basketball': dict(
        dur=18.0,
        segs=[
            dict(clip='06_02', a=0.0, b=4.45, yaw=20, ref=2.5, keys=[(1.0, 1.91), (2.0, 2.78), (3.0, 3.65), (4.0, 4.53)]),
            dict(clip='124_05', a=4.1, b=8.0, yaw=35, ref=3.42, keys=[(4.5, 2.45), (6.0, 3.42), (6.1, 3.42), (7.9, 4.7)]),
            dict(clip='06_02', a=7.6, b=9.95, yaw=-15, ref=2.5, keys=[(8.0, 1.91), (9.0, 2.78), (10.0, 3.65)]),
            dict(clip='06_14', a=9.6, b=13.9, yaw=-30, ref=2.42, keys=[(10.0, 0.38), (10.5, 0.92), (11.0, 1.42), (12.0, 2.42), (12.1, 2.42), (13.8, 3.6)]),
            dict(clip='124_06', a=13.5, b=18.5, yaw=25, ref=3.43, keys=[(14.0, 1.9), (14.5, 2.35), (16.0, 3.43), (16.1, 3.43), (18.0, 4.5)]),
        ],
        # ボール:ドリブル(手の一番低い所で手に触れる)/持つ/放つ/粒から組み上がる
        ball=dict(
            dribble=[(0.0, 'R'), (1.0, 'R'), (2.0, 'R'), (3.0, 'R'), (4.0, 'R'), (4.5, 'R'),
                     (8.0, 'R'), (9.0, 'R'), (10.0, 'R'), (10.5, 'L'), (11.0, 'R'),
                     (14.0, 'R'), (14.5, 'R')],
            hold=[(4.5, 6.0), (11.0, 12.0), (14.5, 16.0)],
            form=[(7.55, 8.0), (13.55, 14.0)],
        ),
        releases=[dict(t=6.0, power=0.75, name='JUMP SHOT', jp='ジャンプシュート'),
                  dict(t=12.0, power=0.85, name='CROSSOVER SHOT', jp='クロスオーバーからシュート'),
                  dict(t=16.0, power=1.0, name='LAY-UP', jp='レイアップ')],
    ),
}

def build(ev_name):
    E = EVENTS[ev_name]; segs = E['segs']
    clips = {s['clip']: Clip(s['clip']) for s in segs}
    N = int(round(E['dur'] * FPS)) + 1
    # 各区間の向き(yaw)と置き場所(前の区間の続きの位置から始める)
    for k, s in enumerate(segs):
        c = clips[s['clip']]
        lq, _ = c.sample(warp(s['keys'], s['ref']))
        s['R'] = yaw_mat(s['yaw'] - facing(lq))
        t0 = s['a']
        _, raw0 = c.sample(warp(s['keys'], t0))
        s['pivot'] = raw0.copy()
        if k == 0:
            s['place'] = np.zeros(3)
        else:
            p = segs[k - 1]; _, rawp = clips[p['clip']].sample(warp(p['keys'], t0))
            s['place'] = p['place'] + p['R'] @ (rawp - p['pivot'])
        s['place'][1] = 0
    def seg_pose(s, t):
        lq, raw = clips[s['clip']].sample(warp(s['keys'], t))
        lq = dict(lq); lq['Hips'] = m2q(s['R'][None] @ q2m(lq['Hips'][None]))[0]
        d = raw - s['pivot']; d[1] = 0
        root = s['place'] + s['R'] @ d; root[1] = raw[1]
        return lq, root
    frames = []
    for f in range(N):
        t = f / FPS
        act = [s for s in segs if s['a'] <= t <= s['b']] or [min(segs, key=lambda s: abs(s['a'] - t))]
        lq, root = seg_pose(act[0], t)
        if len(act) > 1:
            s2 = act[1]; w = (t - s2['a']) / (act[0]['b'] - s2['a']); w = w * w * (3 - 2 * w)
            lq2, root2 = seg_pose(s2, t)
            lq = {n: slerp(lq[n], lq2[n], w) for n in lq}; root = root * (1 - w) + root2 * w
        pos, rot = fk_pose(lq, root)
        frames.append((pos, rot))
    # 床に足をつける:区間ごとに一番低い足が 0 になる高さ(なめらかに)
    toe = np.array([min(fr[0][n][1] for n in ('LeftToeBase_end', 'RightToeBase_end', 'LeftFoot', 'RightFoot')) for fr in frames])
    ground = smooth(np.minimum.accumulate(np.ones_like(toe)) * 0 + np.array([np.percentile(toe[max(0, i - 45):i + 45], 8) for i in range(N)]), 12)
    J = [n for n in names if not n.endswith('_end')] + ['Head_end']
    out_pos = np.zeros((N, len(J), 3)); out_q = np.zeros((N, len(J), 4))
    for f, (pos, rot) in enumerate(frames):
        for k, n in enumerate(J):
            p = pos[n].copy(); p[1] -= ground[f]; out_pos[f, k] = p * SCALE
        out_q[f] = m2q(np.stack([rot[n] for n in J]))
    hips = out_pos[:, J.index('Hips')]
    # ── ボール ──
    r = 0.12
    hand = lambda f, h: out_pos[f, J.index('RightHandIndex1' if h == 'R' else 'LeftHandIndex1')]
    B = E['ball']; dr = B['dribble']
    ball = np.zeros((N, 3)); vis = np.ones(N); form = np.zeros(N)
    def held(f):
        a, b = hand(f, 'R'), hand(f, 'L')
        if np.linalg.norm(a - b) < 0.45: return (a + b) / 2 + np.array([0, 0.02, 0])
        return (b if b[1] > a[1] + 0.25 else a) + np.array([0, 0.1, 0])   # 離れているときは利き手(右)
    rel = [e['t'] for e in E['releases']]
    fr_of = lambda t: min(N - 1, max(0, int(round(t * FPS))))
    for f in range(N):
        t = f / FPS
        p = None
        for a, b in B['hold']:
            if a <= t <= b:
                w = min(1, (t - a) / 0.3); w = w * w * (3 - 2 * w)   # ドリブルの手から、構えの位置へ
                p = (hand(f, 'R') - [0, r, 0]) * (1 - w) + held(f) * w
        if p is None:
            prev = [c for c in dr if c[0] <= t]; nxt = [c for c in dr if c[0] > t]
            if prev and nxt and nxt[0][0] - prev[-1][0] <= 1.01:
                (c0, h0), (c1, h1) = prev[-1], nxt[0]
                s = (t - c0) / (c1 - c0)
                A, Bp = hand(fr_of(c0), h0) - [0, r, 0], hand(fr_of(c1), h1) - [0, r, 0]
                cur = hand(f, h0 if s < 0.5 else h1) - [0, r, 0]
                xz = (A * (1 - s) + Bp * s) * 0.4 + cur * 0.6
                y = r + ((A[1] if s < 0.5 else Bp[1]) - r) * abs(1 - 2 * s) ** 1.25
                p = np.array([xz[0], y, xz[2]])
                # 持ちに変わる直前は、手の位置へ寄せる
                for a, b in B['hold']:
                    if c1 == a and s > 0.5: w = (s - 0.5) * 2; p = p * (1 - w * w) + held(f) * w * w
        if p is None:
            # 放った後:最後に放ったボールの飛行
            past = [x for x in rel if x <= t]
            if past:
                t0 = past[-1]; f0 = fr_of(t0); p0 = held(f0)
                tt = max(0, t - t0 - 0.1)
                hq = q2m(out_q[f0, J.index('Hips')]); fd = hq @ np.array([0, 0, 1.0]); fd[1] = 0; fd /= np.linalg.norm(fd)
                p = p0 + fd * 2.2 * tt + np.array([0, 6.0 * tt - 4.9 * tt * tt, 0])
                if tt > 1.1: vis[f] = 0
            else:
                p = held(f)
        for a, b in B['form']:
            if a <= t <= b: form[f] = 1 - (t - a) / (b - a); vis[f] = 1; p = hand(f, 'R') - [0, r, 0]
        ball[f] = p
    # 放ってから 1.1 秒たったら、次に粒から組み上がるまで見せない
    for f in range(N):
        t = f / FPS
        past = [x for x in rel if x <= t]
        if past and t - past[-1] > 1.1 and not any(past[-1] < a <= t for a, _ in B['form']): vis[f] = 0
    cam = smooth(hips[:, [0, 2]], 14)
    rest_s = {n: ((rest[n] - [0, foot_y, 0]) * SCALE).round(4).tolist() for n in names}
    R4 = lambda a: np.round(a, 4).tolist()
    out = dict(fps=FPS, bpm=BPM, dur=E['dur'], joints=J, parents=[next(((j.parent.name if j.parent else None) for j in CANON if j.name == n), None) for n in J],
               rest=rest_s, pos=R4(out_pos.reshape(N, -1)), quat=R4(out_q.reshape(N, -1)),
               ball=R4(ball), ballVis=vis.tolist(), ballForm=R4(form), cam=R4(cam), hipsY=R4(hips[:, 1]),
               releases=E['releases'], ballR=r)
    dst = HERE.parent.parent / f'video/remotion/src/kakuu-games/data/{ev_name}.json'
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(out, separators=(',', ':'), ensure_ascii=False))
    print('wrote', dst, N, 'frames', round(dst.stat().st_size / 1e6, 2), 'MB', 'travel', np.round(hips[0], 2), np.round(hips[-1], 2))
    return out_pos, J, ball, vis

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'basketball')
