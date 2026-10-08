# 002 KAKUU OS — 使った道具とスキル

KAKUU STUDIO を実際に動かしている制作システムを、SF映画のHUD風ダッシュボードとして可視化した作品。制作記録シリーズ 01(DAY 1)。
参考にした他者作品はあるが、名前・配置・部署構成はすべて KAKUU STUDIO の実際の流れから作ったオリジナル。

| 項目 | 内容 |
|---|---|
| ジャンル | WEB |
| 棚0「考える」 | **frontend-design**(1作品1スキル) |
| 棚1「作る」 | **React 19.2.3 + Motion(旧 Framer Motion)12.43.0**(動きのライブラリはこれだけ)。ビルドは Vite 7.3.7 |
| 棚2「見せる」 | **Remotion 4.0.534**(`video/remotion/`、scenes 方式)+ Playwright 1.56.1(撮影)+ ffmpeg。書き出し v2:`videos/kakuu-os/kakuu-os.mp4`(3媒体共通・プレゼントなし)、H.264 / yuv420p / 30fps / 62.0秒 / 効果音 AAC / 16.8MB |
| 棚3「届ける」 | 手動投稿(本文は `captions/kakuu-os/`)。ManyChat(Instagram のコメント→自動DM)を実際に使用し、画面のログにも記載。動画 v2 はプレゼントなしのため、この作品ではコメント配布はしない |
| スキル | frontend-design / remotion-best-practices / remotion-create / remotion-markup / remotion-render |
| 依存パッケージ | `works/kakuu-os/source/` の中だけ(`package.json`、`node_modules` は git 管理外) |
| 公開ファイル | `works/kakuu-os/index.html` と `assets/`(`source/` で `npm run build` すると書き出される) |

## 作り方
```bash
cd works/kakuu-os/source
npm install
npm run build      # = 数字の集計(scripts/collect-stats.mjs)→ vite build → ../index.html と ../assets/
```
- `?demo=1`:「架空のカフェのサイトを作って」の入力から承認まで自動再生(撮影用。約35秒)
- `prefers-reduced-motion` のときは回転・明滅を止める

## 画面の数字と根拠(盛らない。`src/stats.json` に集計結果と出どころを保存)
2026-10-08 時点、`origin/main @ 28f0937` から集計。この作品自身は数に入れていない。

| 表示 | 値 | 根拠 |
|---|---|---|
| DAY | 01 | 最初のコミットの日付から数えた日数 |
| MERGED TODAY(中央) | 07 | `git log --merges` の「Merge pull request」のうち当日分(PR #1〜#7) |
| WORKS | 01 | `works.js` の作品数(カフェ) |
| VIDEOS | 03 | `videos/*/*.mp4`(カフェ3本) |
| SKILLS | 21 | `.claude/skills/*/SKILL.md`(公式スキル) |
| COMMITS | 18 | `git rev-list --count origin/main` |
| PLANNING 公開 / 制作中 | 01 / 01 | 公開作品 / この作品 |
| DESIGN 完了 | 02 | `works/**/step2/`(デザイン段階のページ:cafe と cafe-v1) |
| BUILD ページ | 06 | `works/**/index.html`(cafe 3・cafe-v1 3) |
| BUILD ログ | 7分14秒 | `works/cafe/measured_time.txt` の実測 |
| MOTION 動画 / 待機 | 03 / 01 | 書き出した動画 / 動画がまだない作品(この作品) |
| PUBLISH PR | 07 | マージしたプルリクエスト(#1〜#7) |
| REACH 投稿文 / 承認待ち | 03 / 00→01 | `captions/*/*.txt` / デモで送った依頼が承認待ちになる |
- 待機数が数えられない部署は「—」と表示。

## デザインの考え方(frontend-design)
- 指定どおり黒 `#0E0E0E` の地にライム `#C6FF3D` を発光色として主役に。それ以外は白とライムの不透明度だけ。
- 数字は JetBrains Mono(等幅)、見出しは Space Grotesk、日本語は Zen Kaku Gothic New。
- 22px の微細グリッド、半透明パネル、明滅するステータスドット、走査線。
- 見どころは一つ:**1行の依頼が中央から6部署へ光のパルスとして走り、順に稼働し、最後に人の承認を待つ**流れ。承認ボタンだけが強く光る。
- スマホ縦(390×844)で1画面に収まる配置を優先。PCではコアの左右に3部署ずつ。

## 効果音(動画のみ)— v2(2026-10-08 作り直し)
- **すべて自作。** `video/remotion/scripts/make-sfx.py`(Python + NumPy)で、サイン波・ノイズ・フィルター・包絡・簡易リバーブ(シュレーダー型)を組み合わせて合成。外部の音源・サンプル・素材サイトは使っていない。
- v1(電子音・高いビープ)は作品に合わなかったため、**SF映画のHUDのような低めで落ち着いた音**に作り直した。
  - 主成分はおよそ 40〜1,500Hz。3kHz より上のエネルギーは全種類で 0%(生成時に数値で確認)
  - サブベースだけだとスマホのスピーカーで聞こえないため、100〜300Hz の芯を少し足している
  - 素材は -6dBFS にそろえ、動画内の音量も控えめ(BGM を後から重ねる前提)
- 出力:`video/remotion/public/sfx/*.wav`(48kHz / 16bit / モノラル)

| 音 | 場面 | 中身 |
|---|---|---|
| pulse | 中央から6部署へ光が走る | 56→34Hz に下がるサブベース+低い芯+空気のうねり、ゆるやかな減衰 |
| whoosh | 場面転換 | ローパスが開いて閉じる、空気が流れるノイズ |
| key | 1文字入力 | ガラスに触れたような小さく澄んだクリック(非整数倍音が素早く消える) |
| tick | カウントアップ | 小さなガラスの刻み。数字の増え方に合わせて間隔が開いていく |
| panel | パネル出現 | 低い「フッ」+空気+かすかなガラス |
| send | 送信 | 低い空気が前へ押し出される |
| done | 部署の完了 | 低い音の上にガラスが一つ |
| alert | 承認待ち | 低い2音がふくらむパッド(ビープにしない) |
| approve | 承認 | 短く柔らかい和音(Dmaj9 を低めに)+ガラス |
| hit | DAY 1 COMPLETE | 深いサブの衝撃と長い余韻、低い和音 |
| hook | 冒頭 | 低いうねりが立ち上がって止まる |
| close | 締め | 低い5度の静かな着地 |

- タイミング:ダッシュボードが `window.__sfx` に記録した時刻を撮影時に保存し(`public/kakuu-os/demo.sfx.json`)、動画の時刻に並べる。v1 と同じ(送信 8.97秒/承認待ち 26.4秒/承認 34秒/DAY 1 COMPLETE 47.6秒)。BGM は入れない(各アプリで付ける)。

## ページの表示について
- フッターに「VISUALIZATION — 実際の制作の流れを可視化した作品です」と表示。
- 数字は 2026-10-08(DAY 1)時点のスナップショット。投稿した動画・投稿文と一致させるため、ページだけ直すときは `npm run build:page`(数字を集計し直さない)。数字を最新にしたいときは `npm run build`。

## 動画 v2(2026-10-08、プレゼントなし)
- 台本:`video/storyboards/kakuu-os.md`(承認済み)。テンポのルールに従い、6部署の稼働は3倍速(16.5秒 → 5.5秒、右上に「×3」)、承認待ちの待ち時間はカット
- 浮いた尺は「数字の出どころ」(3つ×2.5秒)と、カフェのサイトをじっくり見せる場面(10秒)で埋めた
- URL の予告・コメント配布はなし。締めは「こうやって作っています。/次の作品も、お楽しみに。」+「NEXT WORK — COMING SOON」
- 効果音は v2 をそのまま使用。早送り区間は tick を間引き、使い回した区間で承認音などが二重にならないよう止めている
