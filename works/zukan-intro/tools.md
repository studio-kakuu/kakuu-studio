# 008 モーション図鑑の LP と紹介動画 — 使った道具とスキル

004 の Web「モーション図鑑」(`works/motion-zukan/`)でできることを、その場で動く見本で見せて受け取ってもらう LP(`works/zukan-intro/`)と、LP と図鑑を押しながら見せる縦型ショート動画(64.0秒・ナレーションなし・プレゼントあり)。
台本は `video/storyboards/zukan-intro.md`、動画の設定は `video/themes/zukan-intro.json`、動画は `videos/zukan-intro/`(instagram / tiktok / x)。

## 道具
| 用途 | 道具 | メモ |
|---|---|---|
| LP | 静的 HTML + GSAP 3(`vendor/gsap.min.js`、図鑑と同じ版。`vendor/VERSIONS.txt`) | 1作品1ライブラリ。GSAP は見本の進み p と t を進めるだけ |
| 見本の動き | `motions.js`(図鑑からの写し)+ `lp.js` | 見本の部品(Specimen)と再生は図鑑の `main.js` と同じ作り。作品フォルダの中で完結させるため写した |
| 絵 | `img/chara.png`(図鑑からの写し。もとは画像生成AI・ユーザーが作成) | |
| フォント | Anton・Zen Kaku Gothic New(図鑑と同じ)、フォロー案内だけ Space Grotesk | Google Fonts(OFL) |
| 撮影 | Playwright + `video/remotion/scripts/capture.mjs` | 今回 `keys`(要素を目当てにスクロール)と `clicks`(t 秒に要素を押し、ライムの丸い波紋を0.5秒重ねる)を追加 |
| MV の場面 | ffmpeg | `videos/motion-mv/instagram.mp4` の 109.4〜113.0 秒を切り出し → `video/remotion/public/zukan-intro/mv.mp4` |
| 動画 | Remotion 4.0.534(scenes 方式) | `node scripts/capture.mjs --theme zukan-intro` → `node scripts/render.mjs --theme zukan-intro` |
| 効果音 | 既存の合成音 | hook / whoosh / key / close |

## スキル
- `frontend-design`(LP)
- `remotion-best-practices`(動画)

## デザインの考え(frontend-design)
- 色・書体は図鑑と同じ(オフホワイト #F2F0E9・黒 #0E0E0E・ライム #C6FF3D/Anton・Zen Kaku Gothic New)。受け取った先の図鑑と見た目がつながるように
- いちばん目立たせるのは「その場で動く見本」。冒頭は見出しそのものが動く見本で、いまの動きの名前を下に出す。まわりの文字は静かに
- 番号は「受け取り方」の手順だけ(順番があるものだけに付ける)。できることの節には番号を付けない
- 自動で動くのは冒頭の見本だけ。ほかは押したときだけ動く

## 使っていないもの
- 有料の生成(画像・音声・動画)・ナレーション
- 図鑑のページ(`works/motion-zukan/`)は変えていない
