# 003 くものこ もこ — 使った道具とスキル

ちいさな くもの こ「もこ」が、まよいながらも、げんきのない おはなの ために あめに なる、よみきかせ付きの えほん。
**v3(2026-10-09・公開版)**:画像生成AIの絵 13枚を、コードで動かし(ゆっくり寄る・引く・横に流す)、ひらがなの文字を声に合わせて乗せた「うごく えほんスライド」。
前の版は `v2/`(コードで描いた絵+文ごとに録った声。公開しない・保管のみ)。台本は `video/storyboards/moko-v3.md`。

| 項目 | 内容 |
|---|---|
| ジャンル | ANIMATION(よみきかせ えほん) |
| 棚0「考える」 | **frontend-design** |
| 棚1「作る」 | **GSAP 3.15.0**(本体のみ)— 動きのライブラリはこれだけ。`vendor/` に版固定で同梱 |
| 棚2「見せる」 | **Remotion 4.0.534**(`video/remotion/`、scenes 方式の全画面モード)+ Playwright(撮影 540×960 × 2倍 = 1080×1920)+ ffmpeg |
| 棚3「届ける」 | プレゼントあり:Instagram のコメント『もこ』→ URL を届ける |
| スキル | frontend-design / gsap-core / gsap-timeline / remotion-best-practices / remotion-render |
| 絵 | ユーザーが Gemini のアプリで作った 14枚(設定画+13カット)。`art/*.jpg`(各 1116×2000)。プロンプトは台本 7章。透かしを消す加工はしていない(カメラの動きで端が切れるだけ) |
| フォント | Zen Maru Gothic(丸ゴシック、Google Fonts)。使う文字を先に全部読みこんでから始める。動画の締めの文字だけは KAKUU STUDIO の枠なので Zen Kaku Gothic New |
| 色 | 絵から取った クリーム #FFF6E6・こげ茶 #6A564C・水色 #BFE5F4・金 #F6C65B・ピンク #F6A6BA |

## えほんの仕組み(`index.html` / `style.css` / `main.js` / `book.js`)
- `book.js` は `voice/build.py` が作る:画面の文字(承認版のひらがな)・1文字ずつの時刻・カットの切り替え・ページの音声
- 1ページ=絵1枚(2・5・6・7ページは2カット。声の区切りで 0.5 秒の重ねで切り替え)。カメラはカットごとに決めた寄り・引き・横/縦の流し(`main.js` の CAM)
- 重ねる演出は控えめ:光の粒と雨粒(キャンバス)だけ。背景いっぱいの擬音は3か所(びゅうっ・ポツポツ・キラキラ)
- 文字の大きさ・位置は絵の枠を基準(cqw / cqh)。縦は全面、横は まん中に絵、左右は同じ絵をぼかして広げる
- 操作:タップ/クリック/→キー/左スワイプで つぎ、右スワイプ/←キーで まえ。下のバーに「よみきかせ」「つぎへ」(最後は「もういちど よむ」)
- 「よみきかせ」:1回通しの声(テイク3)をページごとに切り出した `voice/pages/p00〜p09.mp3`。押したときだけ鳴る・めくると止まる
- `?demo=video`:動画の撮影用(動画の時刻表どおりに自動でめくる。音は鳴らさない)/`?page=N`
- `prefers-reduced-motion` のときは、カメラ・光の粒・雨を止めて、文字はすぐ出す

## ナレーション(v3・ElevenLabs)
- 声:**Shizuka - Natural & Soft**(Voice ID `WQz3clzUdMqvBf0jswZQ`)/モデル **`eleven_v4`**/stability 0.9/similarity 0.75/**seed 20261009**/speed なし/`with-timestamps`
- 話し方の指示(文頭のタグ):`[寝る前の絵本の読み聞かせのように、やさしく、あたたかく、間をたっぷりとって]`
- 全体を1回通しで生成。テイク1(272字・30クレジット)→ テイク2(「ふわふわ」→「フワフワ」・30)→ **テイク3(締めの一文を追加・291字・32)を採用**。録り比べのテスト(19)を含め、v3 の消費は合計 111 クレジット
- ファイル:`voice/narration_take3.mp3` / `.json`(テイク1・2 も保管)。同じ内容で再生成しない

## 効果音(動画のみ)
- すべて自作:`video/remotion/scripts/make-sfx.py` の絵本用の音(ehon_title / ehon_wind / ehon_sparkle / ehon_gust / ehon_tap / ehon_soft / ehon_burst / ehon_rain / ehon_bloom)+締めの close。BGM なし。声が鳴っている間は効果音を約 −10dB 下げ、全体を −16 LUFS にそろえる

---

# v2 の記録(保管)

ちいさな くもの こ「もこ」が、げんきのない おはなの ために あめに なる、さわれる えほん。
参考:Gemini の演出指示書「絵本風インタラクティブ・ストーリーモーション」。CLAUDE.md のルールに従い、真似はせず技法だけを取り入れた(3層パララックス/光の粒であふれる場面転換/1文字ずつにじむ文字/背景いっぱいの擬音/静と動の緩急)。絵・物語・キャラクターは KAKUU STUDIO のオリジナル。

| 項目 | 内容 |
|---|---|
| ジャンル | ANIMATION(さわれる絵本 → v2 は よみきかせ付きの えほん) |
| 棚0「考える」 | **frontend-design** |
| 棚1「作る」 | **GSAP 3.15.0**(SplitText / DrawSVGPlugin)— 動きのライブラリはこれだけ。`vendor/` に版固定で同梱 |
| 棚2「見せる」 | **Remotion 4.0.534**(`video/remotion/`、scenes 方式の **全画面モード**)+ Playwright(撮影 540×960 × 2倍 = 1080×1920)+ ffmpeg |
| 棚3「届ける」 | プレゼントあり:Instagram のコメント『もこ』→ ManyChat で URL を自動 DM |
| スキル | frontend-design / gsap-core / gsap-timeline / gsap-plugins / remotion-best-practices / remotion-markup / remotion-render |
| 絵 | すべて SVG をコードで描画(写真・画像生成なし)。フラットな塗り+やさしい茶色の輪郭線+クレヨンのゆらぎ(feTurbulence / feDisplacementMap)+紙の質感 |
| フォント | Zen Maru Gothic(丸ゴシック、ひらがな中心。Google Fonts から読みこむ。えほんで使う文字を先に全部読みこんでから始めるので、あとから出る文字が別の字体で出ない)。動画の締めの文字だけは KAKUU STUDIO の枠なので Zen Kaku Gothic New |
| 色 | クリーム #FFF6E6・水色 #BFE5F4 が基調、金 #F6C65B とピンク #F6A6BA の光が差し色、輪郭線 #6A564C |

## 絵本の仕組み(`index.html` / `style.css` / `main.js`)
- 1つの「世界」(空・遠くの雲・丘と町・野原・花・もこ・雨・虹・光の粒)を、ページごとに状態を変えて見せる
- 3層パララックス:遠くの雲(-5%)・丘(-10%)・野原(-16%)が別の速さで流れる。前景は光の粒と花びら(Canvas)
- **縦・横の組み替え**:CSS の `orientation` で、もこ・花・太陽・虹・文章の位置と大きさを切り替える(縦:文章は下/横:文章は左、もこと花は右寄り)。背景は `preserveAspectRatio="xMidYMin slice"` で常に画面を埋め、丘の上辺は切れない
- 操作:タップ/クリック/→キー/左スワイプでめくる。最後に「もういちど よむ」
- 撮影用:`?demo=1`(自動再生)/`?demo=touch`(タップしてめくる様子)/`?page=N&style=line|flat`(線だけ・色だけで止める。メイキング用)
- `prefers-reduced-motion` のときは光の粒と擬音を止め、各ページは完成した状態で表示

## 効果音(動画のみ)
- すべて自作:`video/remotion/scripts/make-sfx.py` に絵本用の音を追加して合成(外部の音源なし)
- ehon_wind(そよ風)/ehon_page(紙をめくる)/ehon_sparkle(光の粒の場面転換)/ehon_title(タイトル・おしまいの鈴)/ehon_soft(気づきのさみしい2音)/ehon_burst(光が弾ける)/ehon_rain(合成した雨粒の集まり)/ehon_bloom(花がひらく和音)/ehon_tap(タップの「ぽん」)+締めは共通の close
- 鈴はオルゴールのように丸く(高い成分は 4kHz 前後で削る)。BGM なし

## ナレーション(v2・ElevenLabs)
- 声:**Shizuka - Natural and Soft**(Voice ID `WQz3clzUdMqvBf0jswZQ`)。試し録り3候補(Orange / Shizuka / Takumi)から選定
- **採用した設定(4回目)**:モデル `eleven_multilingual_v2`/**speed 0.9**(「ぽつ、ぽつ、ぽつ。」だけ 0.95)/stability 0.9/similarity 0.75/style 0.2/**seed 20261009**/`with-timestamps`/文ごとに生成(`previous_text` / `next_text`)
- 消費クレジットの合計(試し録りを含む):試し録り 29字×3+全体1回目 263+2回目 263+3回目 267+速さの試し録り 29字×3+4回目 258 = 約 1,225
- 全10文を1回で生成(2026-10-09)。1回目 speed 0.9(速くて聞き取りにくい)→ 2回目 speed 0.8 で録り直し(上書き)。ただし 2回目も長さは 41.6 → 41.7 秒でほぼ変わらず、speed の設定が効いていない様子。送った文字数 263(読ませる文は `video/storyboards/moko-v2.md` 12章)。決まりは `toolbox/narration-rules.md`
- ファイル:`audio/narration.mp3`(41.6秒)/`audio/narration.timestamps.json`(文字ごとの時刻と、送った設定)。同じ内容で再生成しない
- **3回目(2026-10-09・採用候補)**:漢字の読み間違いと単調さのため、読ませる文をひらがな中心に戻し、**文ごとに生成**(11本。`previous_text` / `next_text` で前後の文を渡す)。speed は基本 0.8、「ぽつ、ぽつ、ぽつ。」だけ 0.95。stability 0.9・seed 20261009 は同じ。ファイルは `audio/lines/<id>.mp3`・`.json`、確認用につないだ版が `audio/narration.mp3`(74.4 秒)。送った文字数 267
- **4回目(2026-10-09・採用)**:2 の文で速さ 0.85/0.88/0.9 を試し録り(29字×3)→ 0.9 に決定。「ぽつ、ぽつ、ぽつ。」(0.95)以外の10文を 0.9 で録り直し(258字)。つないだ版 69.9 秒(ぽつ… のあとの間は 1.2 秒、ほかは 1.5 秒)

## v2 の動画(ゲート3・2026-10-09)
- 撮影:`?demo=video`(ナレーションの時刻表どおりに自動でめくり、読まれるのと同時に1文字ずつ出す。音は鳴らさない)を `capture.mjs` で 540×960 × 2倍。字体を読みこみ終えてから撮り始める(`waitFor: window.__mokoReady`)
- 合成:Remotion の全画面モード。声 11本を `video/themes/moko-v2.json` の時刻に置き、声が鳴っている間は効果音を約 −10dB 下げる。全体を −16 LUFS にそろえる
- 時刻表・テーマは `audio/build-narration.py` が作る(手で直さない)
- ゲート3で直した見た目:表紙の「もこ」の縁取り(太い茶色+外側にクリーム色のふち)/擬音(ふわふわ・びゅうっ・ポツポツ・キラキラ)を もこ・上の文章に重ならない位置へ/カメラが寄ったときの空と地面の切れ目/花・もとの もこへ の場面で もこが文章の裏に入らないように
