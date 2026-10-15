// 作品006 v2:キャラデザイン案(A・B・C)を PNG に書き出す(確認用)。
// 使い方: npx esbuild scripts/pixel-sheet.ts --bundle --platform=node --format=esm --outfile=out/pixel-sheet.mjs && node out/pixel-sheet.mjs <出力フォルダ>
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { Buf } from "../src/pixel-mv/px";
import { drawHuman, drawWolf, humanDesign, wolfDesign, HSTAND, hp, WSTAND, wp, type Variant } from "../src/pixel-mv/chars";

const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
export const png = (b: Buf) => {
  const raw = Buffer.alloc((b.w * 4 + 1) * b.h);
  for (let y = 0; y < b.h; y++) { raw[y * (b.w * 4 + 1)] = 0; for (let x = 0; x < b.w; x++) { const v = b.d[y * b.w + x]; const o = y * (b.w * 4 + 1) + 1 + x * 4; raw[o] = v & 255; raw[o + 1] = (v >> 8) & 255; raw[o + 2] = (v >> 16) & 255; raw[o + 3] = (v >>> 24) & 255; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(b.w, 0); ih.writeUInt32BE(b.h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
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
