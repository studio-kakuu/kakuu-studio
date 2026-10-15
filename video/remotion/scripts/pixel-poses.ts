// 作品006 v2:ポーズの一覧を PNG に書き出す(確認用)
import { writeFileSync, mkdirSync } from "node:fs";
import { png } from "./pixel-png";
import { K, M, W, WW, knight, mage, wolf } from "../src/pixel-mv/poses";
const out = process.argv[2] ?? "out/poses";
mkdirSync(out, { recursive: true });
const save = (n: string, s: { buf: import("../src/pixel-mv/px").Buf }) => writeFileSync(`${out}/${n}.png`, png(s.buf));
for (const [n, p] of Object.entries(K)) (Array.isArray(p) ? p : [p]).forEach((q, i) => save(`k_${n}${Array.isArray(p) ? i : ""}`, knight(q)));
for (const [n, p] of Object.entries(M)) save(`m_${n}`, mage(p));
for (const [n, p] of Object.entries(W)) (Array.isArray(p) ? p : [p]).forEach((q, i) => save(`w_${n}${Array.isArray(p) ? i : ""}`, wolf(q)));
for (const [n, p] of Object.entries(WW)) (Array.isArray(p) ? p : [p]).forEach((q, i) => save(`ww_${n}${Array.isArray(p) ? i : ""}`, wolf(q, { winged: true })));
console.log("ok");
