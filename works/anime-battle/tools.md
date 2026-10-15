# 006 アニメ戦闘MV — 使った道具とスキル

魔法使い・騎士・影狼のアニメ戦闘MV。**動画生成AIは使わず**、ユーザーが用意した素材画像(24枚)をコードで動かすモーションコミック。
縦 1080×1920・24fps・64秒(8シーン × 8秒)。セリフ・音楽・文字・ロゴなし、効果音のみ。台本は `video/storyboards/anime-battle.md`。

## 道具
| 用途 | 道具 | メモ |
|---|---|---|
| 素材画像 | ユーザーが画像生成AIで作成(24枚) | `assets/raw/`(騎士7・魔法使い4・影狼5・翼の狼3・背景5)。JPG で届いたものを PNG に変換 |
| 切り抜き | Python(numpy・scipy・PIL)`scripts/cut.py` | 画面の端からつながる白を背景とみなし「白を抜く」計算で透明に → `assets/cut/`。光や煙のふちは半透明で残る。狼は尾の内側の白も抜く。騎士の目は黒帯を落とし、魔法使いの目は3段の真ん中だけ切り取る。背景は切り抜かない |
| 動画用の軽い画像 | `scripts/web-assets.py` | 切り抜きと背景を WebP にして `video/remotion/public/battle-mv/` へ。翼の狼が氷の粒になる場面の粒の位置も画像の形から拾う(`meta.json`) |
| 動き・演出 | Remotion 4.0.534(composition `BattleMV`)`video/remotion/src/battle-mv/BattleMV.tsx` | キャラは手足を動かさず、移動・拡大・回転・残像(3枚)・モーションブラー(SVG の一方向ぼかし)・集中線でスピードを出す。エフェクト(バリア・斬撃・魔法陣・鎖・氷・ビーム・破片)はすべて SVG で描く。剣の長さは画像ごとに測った値(`SWORD`)で表示の大きさをそろえる |
| 効果音 | Python(numpy・scipy)`video/remotion/scripts/make-sfx-battle.py` | すべて合成(外部の音源・有料APIなし)。風・雨・氷が割れる音・杖を突く音・剣の衝撃音・結晶が砕ける音・鎖の音・魔法のうなり・狼の咆哮・石が崩れる音+風切り音・低い衝撃音・ビーム・きらめき。鳴らす位置を1本に混ぜて `sfx_mix.wav` |
| 書き出し | `node scripts/render-battle.mjs`(`video/remotion/` で) | 本番画質で描画 → ffmpeg で -14 LUFS・30MB 以内に圧縮 → `videos/anime-battle/anime-battle.mp4`。確認用の静止画 `works/anime-battle/review/scene1〜8.jpg` |

## スキル
- `remotion-best-practices`(動画)。UI はないので `frontend-design` は使わない
- 動きのライブラリは Remotion の `interpolate` だけ(GSAP などは使わない)

## 書き出しの実測(この環境:CPU 4、GPU なし)
- 確認用(0.4倍の大きさ・音なし):6分33秒
- 試作版(本番画質・音あり・crf 23):約16分。27.2MB
- v2 ドット絵(文字あり・文字なしの2本・crf 20):2本で約8分。各26.4MB。Node だけで 96 コマの確認画像を書き出すのは約1秒

---

# v2 — ドット絵アクション(2026-10-15)
画像素材・動画生成AIは使わず、キャラ・背景・エフェクト・効果音をすべてコードで作る。

| 用途 | 道具 | メモ |
|---|---|---|
| ドット絵の描画の芯 | TypeScript(React なし)`video/remotion/src/pixel-mv/px.ts` | 180×320 の小さな絵(色の配列)に、四角・線・多角形・円・文字の地図で描く。半透明は間引き(ディザ)。輪郭線・ふちの光もここ |
| キャラ | `chars.ts`(体のつくりと A〜C のデザイン)/`poses.ts`(選んだ騎士B・精霊術師B・影狼C・翼の影狼C と全ポーズ) | 頭は文字の地図で手描き、体は関節の角度から組み立てる。急降下は描いたあと 180° 回す |
| 背景 | `bg.ts` | 霧の森と遺跡/雲の上/雲の切れ間から見下ろす森/光の差す森の全景。奥・中・手前の層で動く速さを変える |
| エフェクト | `fx.ts` | 剣の軌跡(12コマで消える)・集中線・流線・破片・六角形バリア・氷のブロック・ビーム・魔法陣・鎖・雪 |
| 8シーンと拡大 | `scenes.ts`(drawFrame / compose)・`PixelMV.tsx`(Remotion。composition `PixelMV-text` / `PixelMV-notext`) | カメラ(位置・ズーム・揺れ)で切り取ってぼかさず 1080×1920 に。白フラッシュ・黒帯・暗転もここ。Node でも同じ絵を PNG に書き出せる(`scripts/pixel-frames.ts`) |
| デザイン案・ポーズの一覧 | `scripts/pixel-sheet.ts`・`pixel-poses.ts` → `works/anime-battle/scripts/design-sheet.py` | `works/anime-battle/v2/design/` |
| 効果音 | Python(numpy・scipy)`video/remotion/scripts/make-sfx-pixel.py` | 矩形波・三角波・ゲーム機風ノイズだけで合成(外部の音源・有料APIなし) |
| 書き出し | `node scripts/render-pixel.mjs`(`video/remotion/` で) | 文字あり・文字なしの2本 → `videos/anime-battle/v2/`(-14 LUFS・各30MB以内)。確認用 `works/anime-battle/v2/review/scene1〜8.png` |
