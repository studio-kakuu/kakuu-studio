# KAKUU STUDIO — 制作過程ショート動画 設計書(spec)v2

このファイルは、**別のPCの Claude Code がこれだけを読んで動画を制作できる** ことを目的にした仕様書です。
v2 からは **Remotion 版(`video/remotion/`)が正式** です。旧版(`video/render/`、Playwright だけで合成)は参考として残しています。

- 有料API(画像・音声・動画の生成など)は **原則使わない**。素材はリポジトリ内のサイトをブラウザで撮影したもの+テキスト。例外はナレーション付きの作品の声(ElevenLabs)だけで、使い方は下の「有料クレジットを使う生成」に従う。
- 依存:Node.js 18 以上、ffmpeg、Remotion 4(`video/remotion/package.json` で版固定)、Playwright(撮影用)。すべて無料・ローカル。Remotion は個人・3人以下の会社は無料。
- 使うスキル:`remotion-best-practices`(入口)→ `remotion-create` / `remotion-markup` / `remotion-render`。

---

## 0. 制作前の確認(台本案)— 必ず最初に

動画や作品の依頼を受けたら、**制作に入る前に台本案だけを提示して止まり、承認を待つ。** 承認・修正の返事を受けてから撮影・書き出しを始める。台本案は `video/storyboards/<slug>.md` に保存する。

**台本案には、画面に出る文字・ナレーション原稿・テロップをすべて一字一句入れる。** 「…」で省略したり「例」として書いたりしない。ユーザーが全文を読んで OK を出すまで制作しない(文言を変えたら出し直して再び OK をもらう)。

台本案の書式:
1. **方針**:プレゼントの有無、ねらい、尺(61〜75秒)
2. **構成**:場面ごとの「秒数/画面に映るもの/画面の文字(全文)/ナレーション原稿(全文。ない作品は「なし」)/カメラ/テロップ(全文)/効果音」の表。ナレーションのある場面の秒数は、読み終えるのに必要な長さ(前0.5秒+読む時間+後0.8秒前後)に合わせる。読み終わる前に切り替えない・間延びさせない
3. **全体の雰囲気**:テンポ、色、音の方向
4. **テロップ一覧**:フック、場面ラベル、右下の表示、締め
5. **効果音一覧**:どの音をどこで鳴らすか(`scripts/make-sfx.py` の音)
6. **締め方**:次のどちらかを **必ず質問する**
   - **プレゼントあり**:コメントのキーワードで URL やプロンプトを配る(例「コメントで『OS』と送ってね」)。右下に「〇〇のURLは最後に」を出す
   - **プレゼントなし**:次回予告などで締める。右下の URL 予告は出さない
7. **投稿文の方針**:3媒体の締めの一言
8. **確認したいこと**:迷っている点を箇条書きで

### 有料クレジットを使う生成(ElevenLabs など)
- APIキーは環境変数から読むだけ。**値を表示・保存・コミットしない。**
- **ナレーションの本番以外**(声の試し録り・効果音・音楽など)は、**使う前にクレジット量の目安(文字数 × 本数+リテイク分)を示して確認を取る。**
- ナレーションの本番は、OK をもらった台本の原稿どおりに生成する。台本案に原稿の文字数とクレジットの目安を書いておく。
- 生成した音声の長さを測って、場面の秒数を最終調整する(読み終わる前に切り替えない)。
- 使った声の名前と ID は `works/<slug>/tools.md` に記録する。

### テンポのルール
- 同じような動き(読み込み・カウントアップ・待ち時間など)が続く部分は、早送り(`playbackRate`)・カット・場面転換で **数秒にまとめる**。早送り中は右上などに「×3」を小さく出す(見る人に正直に)。
- 61秒以上の条件は、削った分を **完成品をじっくり見せる・ビフォーアフター・数字の出どころ** など別の見どころで満たす。待ち時間を伸ばして埋めない。
- 早送りした区間の効果音は、間引いて重ならないようにする。

## 1. 出力仕様(必須)

| 項目 | 値 |
|---|---|
| 解像度 | **1080 × 1920**(縦型 9:16) |
| フレームレート | **30fps**(固定) |
| 尺 | **64.0 秒**(要件:61秒以上75秒以内) |
| 音声 | **効果音のみ**(自作の合成音、AAC 192kbps)。BGM は入れない(BGMは各アプリで付ける)。ナレーションは台本で OK をもらった作品だけ入れる。効果音もナレーションも使わないテーマは音声トラックなし |
| 形式 | MP4 / H.264 / yuv420p / `+faststart`(iPhone で保存・投稿できる)。CRF 20 |
| サイズ | **1本 50MB 以下**(超えたら `--crf 23` で書き出し直す) |
| 本数 | プレゼントあり:**3本**(`instagram` / `tiktok` / `x`、違いは締めテロップのみ)/プレゼントなし:締めが共通なので **1本**(`videos/<slug>/<slug>.mp4` を3媒体で使う) |
| 出力先 | リポジトリ直下 `videos/<slug>/instagram.mp4` / `tiktok.mp4` / `x.mp4`(GitHub Pages で公開。作品一覧からはリンクしない) |
| 公開URL | `https://studio-kakuu.github.io/kakuu-studio/videos/<slug>/<platform>.mp4` |

---

## 1.5 2つの作り方

| 方式 | 使う作品 | テーマJSONに書くもの |
|---|---|---|
| **STEP 方式**(既定) | Webサイトの制作過程(構成 → デザイン → 動き)。例:`cafe` | `slug` / `theme` / `keyword` の3つだけ |
| **scenes 方式** | 決まった型に当てはまらない作品。例:`kakuu-os`(ダッシュボードのデモ) | 上の3つ+ `hook` / `urlNotice` / `urlNoticeAt` / `closing` / `finale` / `capture.clips` / `clips` / `scenes` / `sfxExtra` |

scenes 方式の書き方(`video/themes/kakuu-os.json` が見本):
- `capture.clips`:撮影する画面。`url`(例 `/works/kakuu-os/?demo=1`)、`seconds`、スクロール、`sfx: true` でページの効果音イベントも記録
- `clips`:スマホ画面に流す素材の並び(`from` 秒から `seconds` 秒、`trimBefore` で素材の途中から)
- `scenes`:場面ごとの左上ラベル(`chip` / `title`)とカメラ。`camera.to` = `[傾きX, 傾きY, 回転, 倍率, 上下位置, 暗さ]`、`move` 秒で移動、`drift` で残り時間にゆっくり流す
- `finale`:全面の黒幕に大きな文字(例「DAY 1 / COMPLETE」)
- `sfxExtra`:ページ以外で鳴らす効果音(場面転換の whoosh など)
- `clips[].playbackRate`:早送り(例 3 = 3倍速)。`clips[].sfxSkip`:その区間で鳴らさない音(`["tick"]`、全部止めるなら `["*"]`)。早送り・使い回しで音が二重にならないようにする
- `badges`:右上の小さな表示(例「×3」)/`notes`:画面下の一言(`size: "small"`)や字幕(`size: "caption"`、「←」以降はアクセント色)
- カメラの `to` は7番目に左右位置 `tx` も書ける(数字に寄るときなど)
- `closingSub`:締めの下の小さな1行(例「NEXT WORK — COMING SOON」)
- `output.single`:締めが全媒体で同じとき、1本だけ書き出す(例 `kakuu-os.mp4`)。プレゼントなしの作品はこれを使う
- 効果音ファイルは `scripts/make-sfx.py` で合成(`public/sfx/*.wav`)。外部の音源は使わない

## 2. 使い回しの仕組み(テーマを変えるだけ)

```
video/
  spec.md                 … この設計書
  themes/_common.json     … 全作品共通:尺・タイムライン・テロップの型・締め文言・撮影区間(capture)
  themes/<slug>.json      … 作品ごと:slug / theme / keyword の3つだけ
  remotion/               … Remotion プロジェクト(正式)
    scripts/capture.mjs   … サイトを1コマずつ撮影 → public/<slug>/*.mp4
    scripts/render.mjs    … 3媒体を書き出し → videos/<slug>/*.mp4
    src/Root.tsx          … Composition「Process-instagram / -tiktok / -x」
    src/Process.tsx       … 動画本体(テンプレート)
    src/scenes/           … Phone(立体スマホ)/ camera(カメラワーク)/ Overlays(テロップ類)
    src/brand.ts          … 3色・2フォント(public/fonts に同梱)
    public/brand/logo.svg … 文字ロゴ(capture.mjs が brand/ からコピー)
  render/                 … 旧版(参考)
```

### 次の作品の手順
1. サイトを `works/<slug>/`(完成版)、`works/<slug>/step1/`、`works/<slug>/step2/` に置く。完成版は URL に `?capture` が付いたとき **なめらかスクロール(Lenis 等)を無効にする**(撮影でスクロール位置を直接指定するため)
2. `works/<slug>/measured_time.txt` に `hook_minutes: <分>`(実測。秒は切り上げ。盛らない)
3. `video/themes/<slug>.json` を作る:`{ "slug": "bakery", "theme": "パン屋", "keyword": "パン" }`
4. 必要なら `_common.json` の `capture.clips[].scroll`(どこまでスクロールするか)を調整
5. 実行:
   ```bash
   cd video/remotion
   npm install
   npx playwright install chromium          # 初回のみ
   node scripts/capture.mjs --theme <slug>  # 撮影(数分)
   npx remotion studio                       # 確認したいとき(任意)
   node scripts/render.mjs --theme <slug>   # 3本書き出し
   ```

### 差し込みルール
| 置き換え文字 | 中身 | 取得元 |
|---|---|---|
| `{theme}` | テーマ名 | `themes/<slug>.json` の `theme` |
| `{keyword}` | コメント用キーワード | `themes/<slug>.json` の `keyword` |
| `{minutes}` | 実測の制作時間(分) | `works/<slug>/measured_time.txt` の `hook_minutes` |

**cafe(v2)の値**:theme=カフェ / keyword=カフェ / minutes=**8**(実測 7分14秒 → 切り上げ)

---

## 3. タイムライン(秒)— `_common.json` の `timeline`

| 区間 | 秒 | スマホの中 | カメラワーク(`src/scenes/camera.ts`) | 上に重なるもの |
|---|---|---|---|---|
| ① フック | 0.0–2.0 | 完成版の読み込み直後(開幕演出) | 大きく傾いた状態(rotateX 16° / rotateY −30° / rotateZ 6°、0.84倍)、画面は暗く | 中央に大きく「架空の{theme}の / サイトを / {minutes}分で作った」(0コマ目から全文表示、{minutes}分はアクセント色で弾む)。上に文字ロゴ |
| ② 完成サイト | 2.0–12.0 | 完成版をゆっくりスクロール | 2.6秒かけて正面へ起き上がり、その後ゆっくり反対側へ回り込む | 左上に `COMPLETE` 完成 |
| ③ STEP 1 | 12.0–24.5 | `step1/`(構成) | 右から傾いて入り(rotateY 26°)、正面を通って左へ流れる | STEPカード → 左上 `STEP 1` 構成 + 進捗バー。**12.0–14.8秒 右下に「完成サイトのURLは最後に」** |
| ④ STEP 2 | 24.5–37.0 | `step2/`(デザイン) | ③の左右反転 | STEPカード → `STEP 2` デザイン |
| ⑤ STEP 3 | 37.0–50.0 | 完成版を **読み込み直して** 全体をスクロール | 1.5倍に寄って上半分(湯気)を見せ、41.2秒から引いて全体へ | STEPカード → `STEP 3` 動き |
| ⑥ 完成 | 50.0–56.0 | 完成版を再度読み込み(開幕演出をもう一度) | 右から入り、正面よりやや寄る | カード「COMPLETE 完成」→ 左上 `COMPLETE` 完成 |
| ⑦ 締め | 56.0–64.0 | ⑥の続き | 1.3秒で上へ小さく退き(0.6倍)、画面を暗く | 媒体別の締め文言(1文字ずつ)、下に文字ロゴと `@studio_kakuu` |

### 動きのルール
- **STEPカード**(12.0 / 24.5 / 37.0 / 50.0 秒):黒い幕が右から0.37秒で全面を覆い(左端にアクセント色の縦線)、「STEP n」(Space Grotesk 190px)とアクセントの線、見出し(Zen Kaku Gothic New 120px)が1文字ずつばねで立ち上がる。0.57秒後から0.4秒で左へ抜ける。**幕が覆っている間に画面の素材とカメラ位置を切り替える**(切れ目を見せない)。
- **リズムのある文字**:見出し・締めはすべて1文字ずつ `spring`(damping 16 / stiffness 170 / mass 0.7)で下から立ち上がる。間隔はSTEPカード2〜3コマ、締め1コマ。
- **立体感**:スマホ枠は `perspective: 2200px` の中で `preserve-3d`。前面(白2pxの枠)の奥に2枚の面(−9px / −18px)を重ねて厚みを出す。画面にガラスの映り込み(白のグラデーション)。
- **背景**:黒地に白8%の横罫線2本、STEP中は大きな輪郭数字(01/02/03、白7%の線)がゆっくり横に流れる。
- アニメーションはすべて `useCurrentFrame()` + `interpolate()` / `spring()` で書く(CSSの transition / animation は使わない)。

---

## 4. レイアウト(1080×1920 の実寸 px)

色は `#0E0E0E` / `#FFFFFF` / `#C6FF3D` のみ(中間色は白の不透明度)。フォントは Space Grotesk(英数字)と Zen Kaku Gothic New(日本語)。

| 要素 | 位置・サイズ |
|---|---|
| スマホ画面 | 撮影素材 780×1688(=390×844 の2倍)を幅600で表示。ベゼル16、外形 632×1330、角丸78。中央配置(カメラの ty で上下) |
| 上部ラベル | left 80 / top 100。チップ:アクセント地・黒文字・Space Grotesk 700・34px・角丸999。見出し:Zen Kaku Gothic New 700・60px |
| STEP 進捗バー | left 80 / right 80 / top 232、高さ4、間隔12(12.0–50.0秒) |
| **URL予告** | **right 56 / bottom 56**「完成サイトのURLは最後に」Zen Kaku Gothic New 700・**34px**・アクセント色。**全作品で同じ位置・同じフォント・同じ色**。0.3秒フェード |
| フック文字 | 中央、最大112px(1行が920pxに収まるよう自動縮小)、行高1.42 |
| 締め文字 | top 1010、左右80、最大72px(自動縮小)、行高1.55 |
| 文字ロゴ | 冒頭:top 150・幅330/末尾:top 1560・幅360(`public/brand/logo.svg`) |
| ハンドル | top 1650、Space Grotesk 500・34px・白70% |

---

## 5. テロップ文言(確定)

- フック:`架空の{theme}の\nサイトを\n{minutes}分で作った`(`{minutes}` は必ず実測値)
- URL予告:`完成サイトのURLは最後に`
- 締め(`captions/<slug>/` と同じ文言)

| 媒体 | 文言(改行位置も固定) |
|---|---|
| instagram | コメントで『{keyword}』と送ってね / URLをお届けします(『{keyword}』はアクセント色) |
| tiktok | Instagram(@studio_kakuu)の投稿に / 『{keyword}』とコメントすると届きます(2026-10-08 変更。cafe の動画は旧文言「完成サイトは / プロフィールのInstagramから」で書き出し済み) |
| x | URLは / プロフィールのリンクから |

---

## 5.5 投稿文と投稿時のルール

動画と一緒に出す投稿文は `brand/brand.md` 7章のルールで `captions/<slug>/` に作る。要点:
- Instagram:ハッシュタグ5個まで(`#KAKUUSTUDIO` + シリーズ名 + 日本語1 + 英語2)。締めは動画と同じ文言
- TikTok:締めは「Instagram(@studio_kakuu)の投稿に『{keyword}』とコメントすると届きます」。ハッシュタグ5個
- X:日本語を本投稿、英語をそのリプライ。ハッシュタグは各2〜3個
- 全媒体:**投稿時は毎回AIラベルをオン**(`captions/posting-checklist.md` で確認してから投稿)

## 6. 撮影の仕組み(`scripts/capture.mjs`)

1. Node の簡易サーバーでリポジトリ直下を配信し、Playwright(Chromium)で各ページを **390×844・deviceScaleFactor 2** で開く。完成版は `?capture` 付き。
2. `page.clock.install()` → **`page.clock.pauseAt()` で時間を止める**(止めないと実時間が流れて開幕演出がずれる)。
3. 1コマごとに「スクロール位置を指定 → `clock.runFor(1/30秒)` → JPEG 撮影」。GSAP・Canvas・ScrollTrigger の scrub も時計に同期するので、コマ落ちしない。
4. スクロールは区間の最初 `holdStart` 秒と最後 `holdEnd` 秒は静止し、間を easeInOutSine で `scroll[0]→scroll[1]`(ページ全体に対する割合)。
5. ffmpeg で `public/<slug>/<clip>.mp4`(CRF 14)にする。区間:`intro` / `step1` / `step2` / `step3` / `complete`(秒数は `_common.json` の `capture.clips`)。

## 7. 書き出し(`scripts/render.mjs`)

- `npx remotion render src/index.ts Process-<platform> --props=... --codec=h264 --crf=20 --pixel-format=yuv420p --muted` → ffmpeg で `-c copy -movflags +faststart`。
- 環境によって Remotion がブラウザを取得できない場合は、環境変数 `CHROMIUM_PATH` に Chromium(headless shell)のパスを入れる(`--browser-executable` に渡される)。
- フォントは `public/fonts` の同梱ファイルを使う(書き出し中にネットへ取りに行かない)。

## 8. 完成チェックリスト

```bash
ffprobe -v error -show_entries format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt -of compact videos/cafe/instagram.mp4
```
- [ ] `h264` / `yuv420p` / `1080x1920` / `30/1`。音声は効果音のあるテーマだけ `aac`(BGM は入っていないこと)、ないテーマは `codec_type=audio` の行が無い
- [ ] 尺 61〜75秒(今回 64.0)、1本 50MB 以下
- [ ] 0コマ目でフックが全文読める/分数が `measured_time.txt` と一致
- [ ] 12.0〜14.8秒に右下の「完成サイトのURLは最後に」
- [ ] STEP 1 → 2 → 3 の順にカード・ラベル・バーが切り替わる/切れ目が見えない
- [ ] STEP 3 で開幕演出・湯気・スクロール演出が映っている
- [ ] 締め文言が媒体ごとに正しい。冒頭と末尾に文字ロゴ
- [ ] 文字のはみ出し・途中の折り返しがない

## 9. よくあるつまずき

| 症状 | 対処 |
|---|---|
| `Cannot find module 'playwright'` | `video/remotion` で `npm install` |
| `Executable doesn't exist` | `npx playwright install chromium` |
| 書き出しでブラウザのダウンロードに失敗 | `CHROMIUM_PATH` に手元の Chromium / Chrome のパスを指定 |
| 開幕演出が撮れていない・速すぎる | capture.mjs の `pauseAt` が効いているか確認 |
| 50MB を超える | `node scripts/render.mjs --theme <slug> --crf 23` |
| 尺を変えたい | `_common.json` の `timeline`(各区間)と `capture.clips[].seconds` を一緒に変える。`closing[1]` は 61〜75 |
