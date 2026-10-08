// 動画の設定。尺・タイムライン・文言の型は video/themes/_common.json(全作品共通)から読む。
// 作品ごとに変わるのは props(slug / theme / keyword / minutes / platform)だけ。
import common from "../../themes/_common.json";
import { z } from "zod";

export const COMMON = common;
export type Seg = readonly [number, number];
export const TL = common.timeline as unknown as Record<
  "hook" | "intro" | "step1" | "step2" | "step3" | "complete" | "closing" | "urlNotice",
  Seg
>;

export const processSchema = z.object({
  slug: z.string(),
  theme: z.string(),
  keyword: z.string(),
  minutes: z.number().int().nonnegative(),
  platform: z.enum(["instagram", "tiktok", "x"]),
  // ↓ ここから下は scenes 方式のテーマだけが使う(省くとカフェ版の STEP 1〜3 構成)
  hook: z.string().optional(),
  hookAccent: z.string().optional(),
  hookEnd: z.number().optional(),
  urlNotice: z.string().optional(),
  urlNoticeAt: z.array(z.number()).optional(),
  closingStart: z.number().optional(),
  closing: z.record(z.string(), z.string()).optional(),
  finale: z.object({ from: z.number(), to: z.number(), big: z.string(), small: z.string(), sub: z.string().optional() }).optional(),
  clips: z.array(z.object({ id: z.string(), from: z.number(), seconds: z.number(), trimBefore: z.number().optional(), playbackRate: z.number().optional() })).optional(),
  badges: z.array(z.object({ from: z.number(), to: z.number(), text: z.string() })).optional(),
  notes: z.array(z.object({ from: z.number(), to: z.number(), text: z.string(), size: z.enum(["small", "caption"]).optional() })).optional(),
  closingSub: z.string().optional(),
  scenes: z.array(z.object({ from: z.number(), to: z.number(), chip: z.string(), title: z.string(), camera: z.any() })).optional(),
  sfx: z.array(z.object({ type: z.string(), at: z.number() })).optional(),
});
export type ProcessProps = z.infer<typeof processSchema>;

export const fill = (s: string, p: ProcessProps) =>
  s.replaceAll("{theme}", p.theme).replaceAll("{keyword}", p.keyword).replaceAll("{minutes}", String(p.minutes));
