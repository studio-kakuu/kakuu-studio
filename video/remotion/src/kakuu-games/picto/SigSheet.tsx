// 確認用:20競技の決めの動きを並べる(フレーム番号/10 = 拍)
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, Prims, SIGS, sigPrims } from "./rig";
export const SigSheet: React.FC = () => {
  const b = useCurrentFrame() / 10;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={1080} height={1920}>
        {SIGS.map((s, i) => {
          const x = 135 + (i % 4) * 270, y = 330 + Math.floor(i / 4) * 370;
          return (
            <g key={s.id}>
              <line x1={x - 120} y1={y} x2={x + 120} y2={y} stroke={C.off} opacity={0.3} />
              <g transform={`translate(${x} ${y})`}><Prims list={sigPrims(s, b, 230, C.off, C.ink)} /></g>
              <text x={x} y={y + 40} fill={C.lime} fontSize={22} textAnchor="middle" fontFamily="sans-serif">{s.en}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
