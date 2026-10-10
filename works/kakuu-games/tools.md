# 005 KAKUU GAMES — 使った道具とスキル

アニメ調の3Dのアンドロイド「コマ」が、本物の人の動きのデータで14競技に挑戦する、架空のスポーツ大会のシリーズ(全4話)。
台本は `video/storyboards/kakuu-games.md`。動画は `videos/kakuu-games/`。出典と利用条件は `SOURCES.md`。

## 道具
| 用途 | 道具 | メモ |
|---|---|---|
| 動きのデータ | CMU Graphics Lab Motion Capture Database(BVH 版:`Shriinivas/cmubvh`) | 研究・商用とも無料。謝辞:The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217. |
| データの読み込み・拍合わせ | Python(numpy だけ) | `videos/kakuu-games/bvh.py`(BVH を読んで関節の位置と回転を出す)/`build_event.py`(骨の長さをそろえる・拍に合わせて速さを変える・つなぎ目を混ぜる・ボールの位置)→ `video/remotion/src/kakuu-games/data/<競技>.json` |
| テーマ曲の解析 | Python(numpy だけ) | `videos/kakuu-games/analyze_song.py` → `song_analysis.json`(130.0BPM・1小節目の頭 0.09 秒・第1話の切り出し 14.86〜81.32 秒) |
| 確認用の棒人間 | Python(PIL) | `inspect_clips.py`(元のデータ)/`preview_sheet.py`(書き出した JSON) |
| コマの3Dモデル | TypeScript(`video/remotion/src/kakuu-games/koma3d.ts`) | 角の丸い箱・太さの変わるカプセル・輪を骨ごとにくっつける。3段のトゥーン(MeshToonMaterial)+裏面をふくらませた黒い輪郭線。最初の版(キューブの粒)はユーザーの確認で取りやめ |
| 3D | Three.js 0.180.0 + @react-three/fiber 9.3.0 | 1作品1ライブラリ(動きのライブラリは Three.js だけ) |
| 動画 | Remotion 4.0.534 + @remotion/three 4.0.534 | composition `KakuuGames-<競技>`。書き出しは `node scripts/render-kg.mjs <競技>`(ヘッドレスの Chromium の WebGL `--gl=angle`) |
| 曲 | 音楽生成AI(ユーザーが Gemini で作成) | テーマ曲 `strike_at_the_summit.mp3`(103.7 秒・130BPM)。`video/remotion/public/kakuu-games/` に置く。最初の版の仮の音は `temp_drums.py`(今は使っていない) |
| フォント | Anton(英語)・Zen Kaku Gothic New Black(日本語) | Google Fonts(OFL) |

## スキル
- `remotion-best-practices`(動画)
- `frontend-design`(Web 版を作るとき)

## 書き出しの実測(この環境:CPU 4、GPU なし、WebGL はソフトウェア描画)
- 最初の版(キューブの粒)バスケ 18 秒(540 コマ):**合計 7 分 28 秒**(Remotion の描画 416 秒+仕上げの圧縮 32 秒。1コマ約 0.77 秒、同時に4コマ)。出来上がり 13.2MB
- **2回目(なめらかなモデル)バスケ 18.46 秒(553 コマ・2026-10-10):合計 4 分 51 秒**(描画 263 秒+圧縮 28 秒。1コマ約 0.48 秒)。出来上がり 7.5MB
- 全4話の見込み(1話 66.46 秒=1,994 コマ × 4話=約 7,980 コマ):描画だけで約 1 時間 05 分(1話あたり約 16 分)

## 使っていないもの
- AI動画・有料の生成(画像・音声・動画)は使っていない
- 参考動画はリポジトリに入れていない
