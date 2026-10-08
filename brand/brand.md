# KAKUU STUDIO — Brand Guide

> 毎回「架空のお店・ブランド」のWebサイトを作り、その制作過程を縦型ショート動画にして発信するスタジオ。
> このファイルは **すべての作品ページ・トップページ・動画の枠/テロップ** で共通利用する唯一の基準です。

- アカウント名:**KAKUU STUDIO**
- SNS ID:**@studio_kakuu**(Instagram / TikTok / X 共通)
- トーン:静か・上品・作品として見せる。売り込み感・煽り表現は使わない。数字(制作時間など)は盛らない。

---

## 1. カラー(この3色のみ)

| 名前 | HEX | 用途 |
|---|---|---|
| Black | `#0E0E0E` | 背景・動画の枠・基本の地色 |
| White | `#FFFFFF` | 文字・罫線 |
| Accent | `#C6FF3D` | 強調(STEP番号、案内テロップ、ロゴの角ドット、ホバー)。面積は全体の10%以下 |

- グレーなどの中間色が必要なときは **新しい色を足さず**、White の不透明度(例:`rgba(255,255,255,.6)`)で表現する。
- Accent の上に置く文字は必ず Black。
- ファイル:`brand/colors.css`(CSS変数)、`brand/colors.json`(動画ツール用)

```css
--kakuu-black:  #0E0E0E;
--kakuu-white:  #FFFFFF;
--kakuu-accent: #C6FF3D;
```

## 2. フォント(Google Fonts)

| 用途 | フォント | ウェイト |
|---|---|---|
| 日本語 | **Zen Kaku Gothic New** | 400 / 500 / 700 |
| 英字・数字 | **Space Grotesk** | 400 / 500 / 700 |

- CSS では `font-family: "Space Grotesk", "Zen Kaku Gothic New", sans-serif;` と **Space Grotesk を先に** 指定する(英数字はSpace Grotesk、日本語は自動的にZen Kaku Gothic Newで表示される)。
- 読み込み:`brand/fonts.css` を参照、または
  `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap`
- 英字の見出しは大文字+字間広め(`letter-spacing: .08em` 前後)。

## 3. ロゴ(文字ロゴ)

「KAKUU STUDIO」を Space Grotesk Bold でアウトライン化したSVG。末尾の小さな正方形(Accent)がシンボル。
フォントが無い環境でも同じ形で表示されます(テキストではなくパス)。

| ファイル | 使う場所 |
|---|---|
| `brand/logo.svg` | 黒背景の上(白文字+アクセントの角ドット、背景透明) |
| `brand/logo-on-black.svg` | 背景つき(黒地)。SNSアイコンや単体表示用 |
| `brand/logo-on-light.svg` | 白・明るい背景の上(黒一色) |
| `brand/logo-stacked.svg` | 2段組み(KAKUU / STUDIO)。正方形・円形のスペース用(黒背景の上) |

- 余白:ロゴの高さの50%以上を四方に空ける。
- 変形・色替え・影・縁取りはしない。

## 3.5 SNS用画像

| ファイル | サイズ | 用途 |
|---|---|---|
| `brand/sns/profile_1080.png` | 1080×1080 | Instagram / TikTok / X のプロフィール画像。2段ロゴを中央に配置し、円形に切り抜かれても欠けない余白をとっている |
| `brand/sns/x_header_1500x500.png` | 1500×500 | X のヘッダー。左下はプロフィール画像と重なるため空けている |

作り直すときは `brand/sns/src/*.html` を編集し、ブラウザ(Playwright)で同じサイズのスクリーンショットを撮る。

## 4. 動画の枠とテロップ(共通ルール)

- サイズ:縦 1080×1920 / 30fps
- 背景(枠):Black。中央にスマホ風フレーム(角丸、White 2px の線)
- テロップ:White、強調は Accent。日本語は Zen Kaku Gothic New 700、英数字は Space Grotesk 700
- 「完成サイトのURLは最後に」:Accent色、右下の固定位置・固定フォント(詳細は `video/spec.md`)
- 文字ロゴは冒頭か末尾に小さく(幅 320px 程度)
- 詳細は `video/spec.md` を参照

## 5. 適用範囲

- KAKUU STUDIO の世界観を使うのは **トップページ(`/index.html`)と動画の枠・テロップのみ**。
- 各作品サイト(`works/<slug>/`)の配色・フォントは、その架空ブランドに合わせて自由に決める。
- 作品サイトに写真素材・著作権のある素材は使わない(CSS / SVG / グラデーション / タイポグラフィで表現)。

## 6. フォルダ構成(全作品共通)

```
brand/                 … このガイドとロゴ・色・フォント
index.html             … KAKUU STUDIO トップ(作品一覧)
works.js               … 作品一覧データ(作品が増えたらここに1件追加)
works/<slug>/          … 完成版
works/<slug>/step1/    … STEP 1 構成(ワイヤーフレーム)
works/<slug>/step2/    … STEP 2 デザイン
works/<slug>/measured_time.txt … 実測の制作時間
captions/<slug>/       … 投稿本文(instagram / tiktok / x)
video/spec.md          … 動画の設計書
```
