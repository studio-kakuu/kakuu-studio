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
  minutes: z.number().int().positive(),
  platform: z.enum(["instagram", "tiktok", "x"]),
});
export type ProcessProps = z.infer<typeof processSchema>;

export const fill = (s: string, p: ProcessProps) =>
  s.replaceAll("{theme}", p.theme).replaceAll("{keyword}", p.keyword).replaceAll("{minutes}", String(p.minutes));
