# 004 MOTION 100 — 使った道具とスキル

アニメーションの技100種の名前が歌われる曲に合わせて、その技の動きで巨大な文字を出すMV(約126秒)と、100種を押して試せる Web の「モーション図鑑」。
台本は `video/storyboards/motion-mv.md`。動画は `videos/motion-mv/`(instagram / tiktok / x)。

## 道具
| 用途 | 道具 | メモ |
|---|---|---|
| 曲 | 音楽生成AI(ユーザーが作成) | `the_motion_command.mp3`(120秒・120 BPM)。前の曲は使っていない |
| キャラクターの絵 | 画像生成AI(Gemini アプリ・ユーザーが作成) | 設定画+絵1〜11(`art/`)。プロンプトは台本7章 |
| 時刻合わせ | Python(numpy だけ) | 拍の格子と、左右の差から取り出した中央の声の立ち上がり。確定した時刻は `videos/motion-mv/timing.json` |
| 動きの定義 | 素のJS `motions.js` | 100種の動きを「進み p と経過秒 t → スタイル」の関数で書き、動画と Web で共用 |
| 動画 | Remotion(`video/remotion/src/motion-mv/`) | composition `MotionMV-instagram / tiktok / x`。書き出しは `node scripts/render-mv.mjs` |
| Web 図鑑 | GSAP 3.15.0(`vendor/`) | 1作品1ライブラリ。p と t を進めるだけに使う |
| 切り抜き | Python(PIL) | 背景のグレーと、体に囲まれたすき間のグレーを消す/黒い地用のオフホワイトの縁取り版/白黒反転版 |
| フォント | Anton(英語)・Zen Kaku Gothic New Black(日本語) | Google Fonts(OFL)。Anton はこの作品だけの例外 |

## スキル
- `remotion-best-practices`(動画)
- `frontend-design`(Web 図鑑)
- `gsap-core`(Web 図鑑の再生)

## 使っていないもの
- 有料の生成(画像・音声・動画)は使っていない。ナレーションはない
- 音声認識(Whisper)は使っていない(モデルの配布元がネットワークの設定で止められていた。拍と声の立ち上がり、ユーザーの聞き取りで時刻を確定)
