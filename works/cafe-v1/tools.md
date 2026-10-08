# 001 YUGE 湯気と珈琲 — 使った道具とスキル

| 項目 | 内容 |
|---|---|
| ジャンル | WEB |
| 棚1「作る」 | ライブラリなし。HTML / CSS / 素のJavaScript(IntersectionObserver、requestAnimationFrame) |
| 動き | CSSアニメーション・トランジション(`motion.css`)+ `motion.js`(スクロール表示、文字分割、カウントアップ、進捗バー、軽いパララックス) |
| 表現 | 写真なし。SVG(カップ・湯気・店内シーン・地図・アイコン)、CSSグラデーション、SVGノイズ |
| フォント | Fraunces / Shippori Mincho B1 / Zen Maru Gothic(Google Fonts) |
| 棚2「見せる」 | `video/render/`(Playwright + ffmpeg の自作レンダラー)。仕様は `video/spec.md` |
| 棚3「届ける」 | なし(手動投稿。本文は `captions/cafe/`) |
| スキル | 制作時点(2026-10-08)はスキル導入前のため未使用。今後の改修では `frontend-design` に従う |
| 依存パッケージ | なし(作品フォルダ内で完結) |
| 選んだ理由 | 1ページで動きは控えめな作品のため、ライブラリを入れずCSS中心で軽く作った |
