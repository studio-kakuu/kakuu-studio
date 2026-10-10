// motions.js の型(動画の Remotion から読むため)
export type Style = Record<string, string | number | undefined>;
export type Ctx = { n: number; ink: string; paper: string; lime: string; paperAlt: string; dim: string };
export type Out = {
  box?: Style; ch?: (i: number, n: number) => Style; fx?: Style[]; under?: Style[]; cover?: Style[];
  text?: string | null; ghost?: Style; twin?: Style; prev?: Style; art?: Style; pixel?: number; shine?: number;
  slats?: number; slatRotate?: boolean; kaleido?: { spin: number; open: number }; echoes?: Style[];
  marquee?: boolean; filmText?: boolean; onLime?: boolean;
};
export type Motion = { kind: 'in' | 'out' | 'loop' | 'tr'; d: number; f: (p: number, t: number, c: Ctx, word: string) => Out };
export const C: { black: string; off: string; lime: string };
export const M: Record<string, Motion>;
export const EXTRA: Record<string, Motion>;
export const ease: Record<string, (...a: number[]) => number>;
