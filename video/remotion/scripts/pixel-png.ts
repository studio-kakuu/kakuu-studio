// PNG を書き出す小さな道具(依存なし)
import { deflateSync } from "node:zlib";
import { Buf } from "../src/pixel-mv/px";
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
export const png = (b: Buf) => {
  const raw = Buffer.alloc((b.w * 4 + 1) * b.h);
  for (let y = 0; y < b.h; y++) { raw[y * (b.w * 4 + 1)] = 0; for (let x = 0; x < b.w; x++) { const v = b.d[y * b.w + x]; const o = y * (b.w * 4 + 1) + 1 + x * 4; raw[o] = v & 255; raw[o + 1] = (v >> 8) & 255; raw[o + 2] = (v >> 16) & 255; raw[o + 3] = (v >>> 24) & 255; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(b.w, 0); ih.writeUInt32BE(b.h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
