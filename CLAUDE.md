# KAKUU STUDIO — Claude Code 向けルール

「Imaginary worlds, made real. / AIでつくる、架空の世界。」— ジャンルを問わず架空の世界の作品を発表するスタジオのリポジトリ(GitHub Pagesで公開する静的サイト)。

## 作品制作の決まり
- **作品制作の最初に `toolbox/README.md` を読み、作品に合う道具とスキルを選ぶ。** 選んだ道具とスキルは `works/<作品名>/tools.md` に記録する。
- **UIを作るときは `frontend-design` スキル(`.claude/skills/frontend-design/`)に従う。**
- 世界観(色・フォント・ロゴ・トーン)は `brand/brand.md` に従う。KAKUU STUDIO の世界観はトップページと動画の枠だけに使い、各作品の見た目は作品ごとに決める。
- 作品は `works/<作品名>/` で完結させ、依存パッケージも作品フォルダ内に置く。1作品で使う動きのライブラリは1つだけ。
- UI部品キット(daisyUI 等)は原則使わない。有料API(画像・音声・動画生成など)は使わない。写真素材・著作権のある素材は使わない。
- トップページの作品一覧は `works.js` に1件追加する(`genre` に WEB / FILM / ANIMATION / CM など)。
- 制作時間を測る作品は `works/<作品名>/measured_time.txt` に実測を記録し、盛らない。
- **Geminiの演出指示書が貼られた場合は、そのまま真似せず、演出の技法を参考にして作品の世界観に合わせたオリジナルとして作る。** 進め方は `toolbox/reference-analysis.md`。

## スキル
- `.claude/skills/` に公式スキルのみを導入(出どころ・取得コミットは `.claude/skills/SOURCES.md`)。非公式のコピーは入れない。
- GSAP: `gsap-*` / Remotion: `remotion-*`(入口は `remotion-best-practices`)/ UI: `frontend-design`
