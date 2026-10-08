// 書き出し前に、前回の ../assets を消す(古いファイルが残らないように)
import { rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
rmSync(join(dirname(fileURLToPath(import.meta.url)), '../../assets'), { recursive: true, force: true });
