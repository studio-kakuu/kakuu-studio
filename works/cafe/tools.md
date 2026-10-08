# 001 YUGE 湯気と珈琲 — 使った道具とスキル(v2)

v1(2026-10-08 午前、ライブラリなし・CSS中心)は `works/cafe-v1/` に保管。以下は v2(アップグレード版)。

| 項目 | 内容 |
|---|---|
| ジャンル | WEB |
| 棚0「考える」 | **frontend-design**(1作品1スキルのルールどおりこれだけ) |
| 棚1「作る」 | **GSAP 3.15.0 + Lenis 1.3.26**(動きのライブラリはこれだけ)。プラグイン:ScrollTrigger / SplitText / DrawSVGPlugin。`vendor/` に版固定で同梱(CDN非依存) |
| 棚2「見せる」 | **Remotion 4.0.534**(`video/remotion/`)+ Playwright 1.56.1(撮影)+ ffmpeg |
| 棚3「届ける」 | なし(手動投稿。本文は `captions/cafe/`) |
| スキル | frontend-design / gsap-core / gsap-scrolltrigger / gsap-plugins / gsap-timeline / gsap-performance / remotion-best-practices / remotion-create / remotion-markup / remotion-render |
| 表現 | 写真なし。Canvas(湯気の粒子)、SVG(カップ・坂の線画・ドリッパー・見取り図・地図)、CSSグラデーション、縦書きタイポグラフィ |
| フォント | Zen Old Mincho / IBM Plex Sans JP(Google Fonts) |
| 依存パッケージ | 作品フォルダ内の `vendor/` のみ(npm から取得したファイル) |

## デザインの考え方(frontend-design に沿って)
- v1 は「クリーム地+明朝+テラコッタ」という、スキルが“生成っぽい既定の見た目”として挙げる組み合わせに近かったため、方向を変えた。
- 色:深煎りの茶 `#2A1A12`(夜明け前の店内)/ 坂の朝霧 `#E4E6E1` / 暖簾の藍 `#2F3F5E` / 真鍮 `#B4904F`。
- 主役は一つ「湯気」。ページ全体を“一杯の湯気が消えるまでの三分”として構成し、右上の「湯気 残り 3:00」がスクロールに合わせて 0:00 まで減る。
- 見出しは縦書きの明朝。ALL CAPS のラベルや「→」付きリンク、番号の飾りは使わない(番号は実際に順序のある「一杯ができるまで」だけ)。

## 動き(GSAP)
1. 開幕:湯気(Canvas)が立ちのぼり、縦書きの一行が湯気から結露するように1文字ずつ現れる(SplitText)
2. 固定スクロール:湯気が立ちこめて画面が白い霧になり、朝霧の坂へ場面転換(ScrollTrigger pin + scrub)
3. 坂の線画が描かれ、最後に暖簾が下りて灯りがともる(DrawSVG)
4. 「一杯ができるまで」を固定して4手順を順に。湯が注がれ、サーバーに珈琲がたまる
5. お品書きの木札が横に流れ、スクロールの速さで揺れる(横スクロール + quickTo)
6. 見取り図の席が一つずつ灯り、席数が 0→8 に
7. 地図の道順が描かれ、暖簾のピンが落ちる
8. 最後は「湯気が、やみました。」— 残り時間 0:00
- `prefers-reduced-motion` のときは動きを付けない。`?capture` で Lenis を無効化(動画撮影用)。

## 書き出し
- サイト:静的ファイルのみ(GitHub Pages)
- 動画:`video/remotion/scripts/capture.mjs` → `render.mjs`。出力 `videos/cafe/instagram.mp4` / `tiktok.mp4` / `x.mp4`(仕様は `video/spec.md`)
