// KAKUU STUDIO の世界観(brand/brand.md)。色はこの3つだけ。中間色は白の不透明度で表す。
// フォントは public/fonts に同梱(Google Fonts 由来・OFL)。レンダリング時にネットへ取りに行かない。
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const BLACK = "#0E0E0E";
export const WHITE = "#FFFFFF";
export const ACCENT = "#C6FF3D";
export const white = (a: number) => `rgba(255,255,255,${a})`;

loadFont({ family: "Space Grotesk", url: staticFile("fonts/SpaceGrotesk-Medium.ttf"), weight: "500" });
loadFont({ family: "Space Grotesk", url: staticFile("fonts/SpaceGrotesk-Bold.ttf"), weight: "700" });
loadFont({ family: "Zen Kaku Gothic New", url: staticFile("fonts/ZenKakuGothicNew-Bold.ttf"), weight: "700" });

export const FONT = `"Space Grotesk", "Zen Kaku Gothic New", sans-serif`;
export const FONT_JA = `"Zen Kaku Gothic New", sans-serif`;
export const FONT_EN = `"Space Grotesk", sans-serif`;
