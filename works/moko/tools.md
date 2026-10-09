# 003 くものこ もこ — 使った道具とスキル

ちいさな くもの こ「もこ」が、げんきのない おはなの ために あめに なる、さわれる えほん。
参考:Gemini の演出指示書「絵本風インタラクティブ・ストーリーモーション」。CLAUDE.md のルールに従い、真似はせず技法だけを取り入れた(3層パララックス/光の粒であふれる場面転換/1文字ずつにじむ文字/背景いっぱいの擬音/静と動の緩急)。絵・物語・キャラクターは KAKUU STUDIO のオリジナル。

| 項目 | 内容 |
|---|---|
| ジャンル | ANIMATION(さわれる絵本) |
| 棚0「考える」 | **frontend-design** |
| 棚1「作る」 | **GSAP 3.15.0**(SplitText / DrawSVGPlugin)— 動きのライブラリはこれだけ。`vendor/` に版固定で同梱 |
| 棚2「見せる」 | **Remotion 4.0.534**(`video/remotion/`、scenes 方式の **全画面モード**)+ Playwright(撮影 540×960 × 2倍 = 1080×1920)+ ffmpeg |
| 棚3「届ける」 | プレゼントあり:Instagram のコメント『もこ』→ ManyChat で URL を自動 DM |
| スキル | frontend-design / gsap-core / gsap-timeline / gsap-plugins / remotion-best-practices / remotion-markup / remotion-render |
| 絵 | すべて SVG をコードで描画(写真・画像生成なし)。フラットな塗り+やさしい茶色の輪郭線+クレヨンのゆらぎ(feTurbulence / feDisplacementMap)+紙の質感 |
| フォント | Zen Maru Gothic(丸ゴシック、ひらがな中心) |
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
- モデル `eleven_multilingual_v2`/speed 0.9/stability 0.9/similarity 0.75/style 0.2/**seed 20261009**/`with-timestamps`
- 全10文を1回で生成(2026-10-09)。送った文字数 263(読ませる文は `video/storyboards/moko-v2.md` 12章)。決まりは `toolbox/narration-rules.md`
- ファイル:`audio/narration.mp3`(41.6秒)/`audio/narration.timestamps.json`(文字ごとの時刻と、送った設定)。同じ内容で再生成しない
