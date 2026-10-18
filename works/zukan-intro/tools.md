# 008 モーション図鑑の紹介動画 — 使った道具とスキル

004 で公開した Web の「モーション図鑑」(`works/motion-zukan/`)を、実際に押しながら見せる縦型ショート動画(62.0秒・ナレーションなし)。
台本は `video/storyboards/zukan-intro.md`、設定は `video/themes/zukan-intro.json`、動画は `videos/zukan-intro/zukan-intro.mp4`(3媒体共通)。

## 道具
| 用途 | 道具 | メモ |
|---|---|---|
| 撮影 | Playwright(Chromium)+ `video/remotion/scripts/capture.mjs` | 時計を止めて1コマずつ撮影。今回 `keys`(要素の位置を目当てにスクロール)と `clicks`(t 秒に要素を押し、ライムの丸い波紋を0.5秒重ねる)を追加 |
| MV の場面 | ffmpeg | `videos/motion-mv/instagram.mp4` の 109.4〜113.0 秒(CONFETTI)を切り出し、スマホ画面の比率に切り抜き → `video/remotion/public/zukan-intro/mv.mp4` |
| 動画 | Remotion 4.0.534(scenes 方式 `ScenesProcess.tsx`) | `node scripts/capture.mjs --theme zukan-intro` → `node scripts/render.mjs --theme zukan-intro` |
| 効果音 | 既存の合成音(`video/remotion/public/sfx/`) | hook / whoosh / key / hit / close。新しく作った音はなし |

## スキル
- `remotion-best-practices`(入口)
- デザイン思考スキル:なし(新しい画面は作らず、KAKUU の動画の枠と図鑑の見た目をそのまま使う)

## 使っていないもの
- 有料の生成(画像・音声・動画)・ナレーションは使っていない
- 図鑑のページ(`works/motion-zukan/`)は変えていない
