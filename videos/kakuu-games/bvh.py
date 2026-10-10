"""CMU BVH(cgspeed 版)を読んで、関節の世界座標と向きを求める(numpy だけ)。"""
import numpy as np


class Joint:
    def __init__(self, name, parent):
        self.name, self.parent = name, parent
        self.offset = np.zeros(3)
        self.channels = []
        self.ch0 = 0
        self.children = []


def load(path):
    toks = open(path).read().split()
    i = 0
    joints, stack = [], []
    ch = 0
    while toks[i] != 'MOTION':
        t = toks[i]
        if t in ('ROOT', 'JOINT'):
            j = Joint(toks[i + 1], stack[-1] if stack else None)
            if j.parent: j.parent.children.append(j)
            joints.append(j); i += 2
        elif t == 'End':
            j = Joint(stack[-1].name + '_end', stack[-1])
            stack[-1].children.append(j); joints.append(j); i += 2
        elif t == '{':
            stack.append(joints[-1]); i += 1
        elif t == '}':
            stack.pop(); i += 1
        elif t == 'OFFSET':
            stack[-1].offset = np.array([float(x) for x in toks[i + 1:i + 4]]); i += 4
        elif t == 'CHANNELS':
            n = int(toks[i + 1]); stack[-1].channels = toks[i + 2:i + 2 + n]; stack[-1].ch0 = ch; ch += n; i += 2 + n
        else:
            i += 1
    nf = int(toks[i + 2]); ft = float(toks[i + 5])
    data = np.array(toks[i + 6:i + 6 + nf * ch], dtype=float).reshape(nf, ch)
    return joints, data, ft


def _rot(axis, deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a)
    n = len(a); R = np.zeros((n, 3, 3)); R[:, 0, 0] = R[:, 1, 1] = R[:, 2, 2] = 1
    if axis == 'X': R[:, 1, 1] = c; R[:, 1, 2] = -s; R[:, 2, 1] = s; R[:, 2, 2] = c
    if axis == 'Y': R[:, 0, 0] = c; R[:, 0, 2] = s; R[:, 2, 0] = -s; R[:, 2, 2] = c
    if axis == 'Z': R[:, 0, 0] = c; R[:, 0, 1] = -s; R[:, 1, 0] = s; R[:, 1, 1] = c
    return R


def fk(joints, data):
    """各関節の世界座標 pos[name] (F,3) と世界回転 rot[name] (F,3,3)。"""
    F = len(data); pos, rot = {}, {}
    for j in joints:
        R = np.tile(np.eye(3), (F, 1, 1)); tr = np.zeros((F, 3))
        for k, c in enumerate(j.channels):
            v = data[:, j.ch0 + k]
            if c.endswith('rotation'): R = R @ _rot(c[0], v)
            else: tr[:, 'XYZ'.index(c[0])] = v
        if j.parent is None:
            pos[j.name] = j.offset + tr; rot[j.name] = R
        else:
            pr = rot[j.parent.name]
            pos[j.name] = pos[j.parent.name] + pr @ j.offset
            rot[j.name] = pr @ R
    return pos, rot
