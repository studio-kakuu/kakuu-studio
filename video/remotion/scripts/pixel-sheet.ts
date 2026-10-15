// 作品006 v2:キャラデザイン案(A・B・C)を PNG に書き出す(確認用)。
// 使い方: npx esbuild scripts/pixel-sheet.ts --bundle --platform=node --format=esm --outfile=out/pixel-sheet.mjs && node out/pixel-sheet.mjs <出力フォルダ>
import { writeFileSync, mkdirSync } from "node:fs";
import { png } from "./pixel-png";
import { drawHuman, drawWolf, humanDesign, wolfDesign, HSTAND, hp, WSTAND, wp, type Variant } from "../src/pixel-mv/chars";

const out = process.argv[2] ?? "out/sheet";
mkdirSync(out, { recursive: true });
const V: Variant[] = ["A", "B", "C"];
for (const v of V) {
  for (const kind of ["knight", "mage"] as const) {
    const d = humanDesign(kind, v);
    const pose = kind === "knight" ? hp({ fa1: 30, fa2: 70, w: 150 }) : hp({ fa1: 25, fa2: 15, w: 175, cape: 0.25 });
    writeFileSync(`${out}/${kind}_${v}.png`, png(drawHuman(d, pose).buf));
  }
  writeFileSync(`${out}/wolf_${v}.png`, png(drawWolf(wolfDesign(v), WSTAND).buf));
  writeFileSync(`${out}/wingwolf_${v}.png`, png(drawWolf(wolfDesign(v), wp({ wing: 0.6 }), { winged: true }).buf));
}
void HSTAND;
console.log("ok", out);
