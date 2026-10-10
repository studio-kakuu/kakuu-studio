// KAKUU GAMES の確認用の静止画をまとめて書き出す。 使い方: node scripts/stills-kg.mjs <composition> <outDir> <frame,frame,...>
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [id, outDir, list] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(PROJECT, 'src/index.ts') });
const opts = { serveUrl, browserExecutable: process.env.CHROMIUM_PATH, chromiumOptions: { gl: 'angle' } };
const composition = await selectComposition({ ...opts, id });
for (const f of list.split(',').map(Number)) {
  await renderStill({ ...opts, composition, frame: f, output: join(outDir, `f${String(f).padStart(4, '0')}.png`) });
  console.log('still', f);
}
