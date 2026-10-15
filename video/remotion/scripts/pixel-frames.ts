// 作品006 v2:決めたコマを PNG に書き出す(確認用)。 node out/pixel-frames.mjs <出力フォルダ> <幅> <コマ...>
import { writeFileSync, mkdirSync } from "node:fs";
import { png } from "./pixel-png";
import { Buf } from "../src/pixel-mv/px";
import { compose, drawFrame } from "../src/pixel-mv/scenes";
const [out, w, ...fs] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const ow = Number(w);
const oh = Math.round((ow * 16) / 9);
for (const s of fs) {
  const f = Number(s);
  const b = new Buf(ow, oh);
  compose(drawFrame(f), ow, oh, b.d);
  writeFileSync(`${out}/f${String(f).padStart(4, "0")}.png`, png(b));
}
console.log("ok", fs.length);
