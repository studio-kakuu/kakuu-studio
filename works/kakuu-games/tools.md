# 005 KAKUU GAMES — 使った道具とスキル

キューブの粒でできたアンドロイド「コマ」が、本物の人の動きのデータで14競技に挑戦する、架空のスポーツ大会のシリーズ(全4話)。
台本は `video/storyboards/kakuu-games.md`。動画は `videos/kakuu-games/`。出典と利用条件は `SOURCES.md`。

## 道具
| 用途 | 道具 | メモ |
|---|---|---|
| 動きのデータ | CMU Graphics Lab Motion Capture Database(BVH 版:`Shriinivas/cmubvh`) | 研究・商用とも無料。謝辞:The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217. |
| データの読み込み・拍合わせ | Python(numpy だけ) | `videos/kakuu-games/bvh.py`(BVH を読んで関節の位置と回転を出す)/`build_event.py`(骨の長さをそろえる・拍に合わせて速さを変える・つなぎ目を混ぜる・ボールの位置)→ `video/remotion/src/kakuu-games/data/<競技>.json` |
| 確認用の棒人間 | Python(PIL) | `inspect_clips.py`(元のデータ)/`preview_sheet.py`(書き出した JSON) |
| コマの3Dモデル | TypeScript(`video/remotion/src/kakuu-games/koma.ts`) | 骨のまわりに格子状にキューブを置く。体 5,909 粒・ボール 367 粒 |
| 3D | Three.js 0.180.0 + @react-three/fiber 9.3.0 | 1作品1ライブラリ(動きのライブラリは Three.js だけ) |
| 動画 | Remotion 4.0.534 + @remotion/three 4.0.534 | composition `KakuuGames-<競技>`。書き出しは `node scripts/render-kg.mjs <競技>`(ヘッドレスの Chromium の WebGL `--gl=angle`) |
| 仮の音 | Python(numpy だけ) | `videos/kakuu-games/temp_drums.py`。曲(ユーザーが Gemini で作る)が届いたら差し替える |
| フォント | Anton(英語)・Zen Kaku Gothic New Black(日本語) | Google Fonts(OFL) |

## スキル
- `remotion-best-practices`(動画)
- `frontend-design`(Web 版を作るとき)

## 書き出しの実測(この環境:CPU 4、GPU なし、WebGL はソフトウェア描画)
- バスケ 18 秒(540 コマ・2026-10-10):**合計 7 分 28 秒**(Remotion の描画 416 秒+仕上げの圧縮 32 秒。1コマ約 0.77 秒、同時に4コマ)。出来上がり 13.2MB
- 全4話の見込み(1話 66 秒=1,980 コマ × 4話=7,920 コマ):描画だけで約 1 時間 45 分(1話あたり約 26 分)

## 使っていないもの
- AI動画・有料の生成(画像・音声・動画)は使っていない
- 参考動画はリポジトリに入れていない
