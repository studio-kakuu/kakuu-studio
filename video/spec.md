# KAKUU STUDIO — 制作過程ショート動画 設計書(spec)

このファイルは、**別のPCの Claude Code がこれだけを読んで動画を制作できる** ことを目的にした仕様書です。
同じフォルダに、この仕様どおりに動く **参照実装(`video/render/`)** があります。基本はそれを実行するだけで3本の動画が出力されます。
仕様を変える場合は、この spec と `video/themes/_common.json` / `video/render/stage.html` を同時に更新してください。

- 有料API(画像生成・音声生成・動画生成など)は **一切使わない**。素材はすべてリポジトリ内のHTMLをブラウザで撮影したもの+テキスト。
- 依存:Node.js 18 以上、ffmpeg、Playwright(Chromium)。すべて無料・ローカル。

---

## 1. 出力仕様(必須)

| 項目 | 値 |
|---|---|
| 解像度 | **1080 × 1920**(縦型 9:16) |
| フレームレート | **30fps**(固定) |
| 尺 | **64.0 秒**(要件:61秒以上75秒以内。レンダラーは範囲外だとエラー終了) |
| 音声 | **なし**(BGM・ナレーション・効果音なし。音声トラック自体を入れない `-an`) |
| コーデック | H.264(libx264)/ yuv420p / CRF 18 / `+faststart` |
| 本数 | 1作品につき **3本**:`instagram` / `tiktok` / `x`(違いは締めテロップのみ) |
| ファイル名 | `video/out/<slug>_instagram.mp4`、`<slug>_tiktok.mp4`、`<slug>_x.mp4` |

---

## 2. 使い回しの仕組み(テーマ名とキーワードを変えるだけ)

```
video/
  spec.md               … この設計書
  themes/_common.json   … 全作品共通(尺・タイムライン・テロップの型・締め文言)。基本触らない
  themes/<slug>.json    … 作品ごと(slug / theme / keyword の3つだけ)
  render/stage.html     … 1080x1920 の「舞台」ページ(枠・テロップ・スマホ画面)
  render/render.mjs     … 舞台を1フレームずつ撮影して mp4 にする
  render/package.json
  out/                  … 出力先(git管理外)
```

### 次の作品を作るとき
1. サイトを `works/<slug>/`(完成版)、`works/<slug>/step1/`、`works/<slug>/step2/` に置く
2. `works/<slug>/measured_time.txt` に `hook_minutes: <分>` を書く(実測。秒は切り上げ。盛らない)
3. `video/themes/cafe.json` をコピーして `video/themes/<slug>.json` を作り、3項目を書き換える

```json
{ "slug": "bakery", "theme": "パン屋", "keyword": "パン" }
```

4. `cd video/render && node render.mjs --theme <slug>` を実行

### 差し込みルール(テンプレート)
| 置き換え文字 | 中身 | 取得元 |
|---|---|---|
| `{theme}` | テーマ名(例:カフェ) | `themes/<slug>.json` の `theme` |
| `{keyword}` | コメント用キーワード(例:カフェ) | `themes/<slug>.json` の `keyword` |
| `{minutes}` | 実測の制作時間(分) | `works/<slug>/measured_time.txt` の `hook_minutes` |

**今回(cafe)の値**:theme=カフェ / keyword=カフェ / minutes=**7**(実測 6分31秒 → 切り上げて7分)

---

## 3. タイムライン(秒)

`themes/_common.json` の `timeline` と同一。フレーム番号 = 秒 × 30。

| 区間 | 秒 | フレーム | 画面(スマホ内) | 上部ラベル | テロップ |
|---|---|---|---|---|---|
| ① フック | 0.0–2.0 | 0–59 | 完成版トップ(静止) | なし | 中央に大きく「架空の{theme}のサイトを / {minutes}分で作った」。上部に文字ロゴ |
| ② 完成サイト | 2.0–12.0 | 60–359 | 完成版をゆっくりスクロール(ページ上端 → 55%) | `COMPLETE` 完成 | なし |
| ③ STEP 1 | 12.0–24.5 | 360–734 | `step1/`(ワイヤーフレーム)を上端→下端までスクロール | `STEP 1` 構成 | 12.0–14.8秒:右下に「完成サイトのURLは最後に」 |
| ④ STEP 2 | 24.5–37.0 | 735–1109 | `step2/`(デザイン、動きなし)を上端→下端 | `STEP 2` デザイン | なし |
| ⑤ STEP 3 | 37.0–50.0 | 1110–1499 | 完成版を **読み込み直して** 上端→下端(スクロールアニメが発火する様子を見せる) | `STEP 3` 動き | なし |
| ⑥ 再表示 | 50.0–56.0 | 1500–1679 | 完成版をトップに戻して表示(上端 → 12% までわずかにスクロール) | `COMPLETE` 完成 | なし |
| ⑦ 締め | 56.0–64.0 | 1680–1919 | ⑥の画面を暗く敷いたまま | なし | 中央に媒体別の締め文言、下に文字ロゴと `@studio_kakuu` |

### 動きのルール
- **スクロール**:各区間の最初と最後に 0.8 秒静止 → 間を easeInOutSine で移動。スクロール量は「ページ全体の高さ − 画面の高さ」に対する割合で指定(`scroll.intro = [0, 0.55]`、`scroll.step = [0, 1]`、`scroll.complete = [0, 0.12]`)。
- **画面の切り替え**:区間の境目で 0.35 秒のクロスフェード。
- **ラベル/テロップのフェード**:0.3 秒。フックだけは 0 フレーム目から全表示(最初の1コマで内容が読めるように)、1.7–2.0 秒でフェードアウト。締めは 0.4 秒でフェードイン。
- **STEP 進捗バー**:12.0–50.0 秒のあいだ、上部ラベルの下に3本のバーを表示し、現在のSTEPのバーが左から伸びる。
- サイト内のCSSアニメーション/トランジション/JSアニメーションは **動画の時刻に同期**(4章「撮影方法」参照)。実時間で撮るとコマ落ちするため禁止。

---

## 4. レイアウト(1080×1920 の実寸 px)

すべて `brand/brand.md` の3色・2フォントのみを使用。

| 要素 | 位置・サイズ | 見た目 |
|---|---|---|
| 背景 | 全面 | `#0E0E0E` |
| スマホ枠 | left 184 / top 262 / 712×1506、角丸 72 | 線 `#FFFFFF` 2px、内側余白 13px |
| スマホ画面 | 683×1477、角丸 58 | サイトを **幅390×高さ844(CSS px)** で表示し **1.75倍** に拡大 |
| ノッチ | 画面上端から 18px、150×40、角丸20 | `#0E0E0E` |
| 上部ラベル | left 72 / top 92 / 高さ120 | チップ:背景 `#C6FF3D`・文字 `#0E0E0E`・Space Grotesk 700・34px・字間 .06em・角丸999・padding 10/22。右に見出し:Zen Kaku Gothic New 700・60px・`#FFFFFF`・字間 .08em。間隔 24px |
| STEP 進捗バー | left 72 / right 72 / top 222、高さ4、間隔12 | 地 `rgba(255,255,255,.18)`、進捗 `#C6FF3D` |
| **URL予告** | **right 56 / bottom 56**(右下固定) | 「完成サイトのURLは最後に」Zen Kaku Gothic New 700・**34px**・`#C6FF3D`・行高1・字間 .04em。**全作品で同じ位置・同じフォント・同じ色** |
| 全面の暗幕(フック・締め) | 全面 | `rgba(14,14,14,.78)` |
| フック文字 | 左右 72px、上下中央 | Zen Kaku Gothic New 700・最大80px(1行が936pxに収まるまで自動縮小)・行高1.45・中央揃え・`#FFFFFF`。「{minutes}分」部分のみ `#C6FF3D` |
| 締め文字 | 同上 | 同上・最大60px・行高1.6。Instagramの『{keyword}』部分のみ `#C6FF3D` |
| 文字ロゴ(冒頭) | 中央、top 120、幅360 | `brand/logo.svg`(フック中のみ) |
| 文字ロゴ(末尾) | 中央、top 1560、幅360 | `brand/logo.svg`(締め中のみ) |
| ハンドル | 中央、top 1640 | `@studio_kakuu`・Space Grotesk 34px・`rgba(255,255,255,.7)`・字間 .08em |

英数字は Space Grotesk、日本語は Zen Kaku Gothic New(`font-family: "Space Grotesk", "Zen Kaku Gothic New", sans-serif`)。Google Fonts から読み込む。

---

## 5. テロップ文言(確定)

### フック(全媒体共通)
```
架空の{theme}のサイトを
{minutes}分で作った
```
→ 今回:「架空のカフェのサイトを / **7分**で作った」
※ `{minutes}` は必ず `measured_time.txt` の実測値。手で書き換えて短くしない。

### URL予告(全媒体共通)
```
完成サイトのURLは最後に
```

### 締め(媒体別。`captions/<slug>/` の締めと同じ文言)
| 媒体 | 文言(改行位置も固定) |
|---|---|
| instagram | コメントで『{keyword}』と送ってね / URLをお届けします |
| tiktok | 完成サイトは / プロフィールのInstagramから |
| x | URLは / プロフィールのリンクから |

---

## 6. 撮影方法(参照実装の仕組み)

`render/render.mjs` がやっていること。自作する場合も同じ方式にすること。

1. Node の簡易HTTPサーバーでリポジトリ直下を配信(`file://` だと iframe の操作ができないため)。
2. Playwright(Chromium)で `video/render/stage.html` を **viewport 1080×1920 / deviceScaleFactor 1** で開く。
3. `page.clock.install()` で `setTimeout`・`requestAnimationFrame`・`Date`・`performance.now` を偽の時計にする。
4. `setup(config)` で完成版・STEP1・STEP2 を iframe に読み込む(フォント読み込み完了まで待つ)。STEP 3 用の完成版は ⑤ の開始0.5秒前に新規読み込み(リビールアニメを最初から見せるため)。
5. 各フレーム `f` で:
   - `page.clock.runFor()` で偽の時計を `f/30` 秒まで進める(JSアニメ・カウントアップ等が同期)
   - `renderFrame(t)` を呼ぶ → iframe のスクロール位置、表示切替、ラベル、テロップを時刻 `t` の状態にする
   - iframe 内の `document.getAnimations()` を全部 `pause()` し、`currentTime = 動画時刻 − そのアニメを最初に見つけた時刻` に設定(CSSアニメ・トランジションを動画の時刻に同期)
   - `page.screenshot()` で PNG を保存
6. 0–56秒の共通部分は1回撮って3媒体にコピー。56秒以降は1フレームごとに締め文言を3媒体分差し替えて撮る。
7. ffmpeg で連番PNG → mp4(`-framerate 30 -c:v libx264 -crf 18 -pix_fmt yuv420p -an -movflags +faststart`)。

iframe には撮影用に `scroll-behavior:auto` とスクロールバー非表示のCSSを注入する(サイト本体は変更しない)。

---

## 7. 実行手順(別のPCで)

```bash
# 0) 事前に必要なもの:Node.js 18+ と ffmpeg
node -v
ffmpeg -version

# 1) リポジトリを取得
git clone <このリポジトリのURL>
cd kakuu-studio/video/render

# 2) 依存のインストール(初回のみ)
npm install
npx playwright install chromium

# 3) まず確認用(5fps・数分で終わる)
node render.mjs --theme cafe --preview

# 4) 本番(30fps・3本。目安 10〜20分)
node render.mjs --theme cafe

# 媒体を絞る場合
node render.mjs --theme cafe --platform instagram
```

出力:`video/out/cafe_instagram.mp4` / `cafe_tiktok.mp4` / `cafe_x.mp4`

オプション:`--preview`(5fps確認版、ファイル名末尾 `_preview`)、`--platform a,b`、`--keep-frames`(連番PNGを残す)。

---

## 8. 完成チェックリスト(書き出し後に必ず確認)

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact video/out/cafe_instagram.mp4
```
- [ ] `width=1080 height=1920`、`r_frame_rate=30/1`
- [ ] `duration` が 61〜75 秒(今回 64.0)
- [ ] `codec_type=audio` の行が **無い**(音声なし)
- [ ] 0秒の1コマ目でフック文字が読める/分数が `measured_time.txt` と一致
- [ ] 12.0〜14.8秒に右下の「完成サイトのURLは最後に」(アクセント色)
- [ ] STEP 1 → 2 → 3 の順で、ラベルとバーが切り替わる
- [ ] STEP 3 でリビール(ふわっと出る動き)・湯気の動きが映っている
- [ ] 締め文言が媒体ごとに正しい(instagram / tiktok / x)
- [ ] 冒頭と末尾に文字ロゴ、色は `#0E0E0E` / `#FFFFFF` / `#C6FF3D` のみ(サイト画面内を除く)
- [ ] 文字が画面からはみ出していない・1行が途中で折り返していない

---

## 9. よくあるつまずき

| 症状 | 対処 |
|---|---|
| `Cannot find module 'playwright'` | `video/render` で `npm install` を実行したか確認 |
| `Executable doesn't exist` | `npx playwright install chromium` |
| `ffmpeg: command not found` | ffmpeg をインストール(Mac: `brew install ffmpeg` / Windows: `winget install ffmpeg`) |
| 文字が明朝/ゴシックの代替フォントになる | ネット接続を確認(Google Fonts を読み込むため) |
| 尺エラー | `_common.json` の `timeline.closing[1]` が 61〜75 の範囲か確認 |
