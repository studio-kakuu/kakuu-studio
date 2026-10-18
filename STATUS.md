# STATUS — いまの状態(作業の最初に読み、終わりに更新する)

最終更新:2026-10-18

## 作品一覧
| No | 作品 | フォルダ | 状態 |
|---|---|---|---|
| 001 | YUGE(架空のカフェのサイト) | `works/cafe/` | 公開・SNS投稿済み |
| 002 | KAKUU OS | `works/kakuu-os/` | 公開・SNS投稿済み |
| 003 | MOKO(くものこ もこ) | `works/moko/` | 公開・SNS投稿済み |
| 004 | MOTION 100(モーション図鑑) | `works/motion-zukan/` | 公開・SNS投稿済み |
| 005 | KAKUU GAMES(ピクトグラム図鑑) | `works/kakuu-games/` | **完了**:公開・ManyChat『ゲームズ』設定・全SNS投稿済み |
| 006 | アニメ戦闘MV(騎士・精霊術師・影狼/縦9:16・24fps・64秒・効果音のみ) | `works/anime-battle/` | **保留中(2026-10-18)**。最新は v2.1(ドット絵アクション・冒頭を作り直し)。作業はブランチ `claude/006-anime-battle-mv`(main に未マージ):`videos/anime-battle/v2/anime-battle-v2.1_text.mp4`(冒頭に文字)・`_notext.mp4`、確認用 `works/anime-battle/v2/review-v2.1/`(冒頭3枚+各シーン8枚)、台本 `video/storyboards/anime-battle.md` の v2.1 の章、道具 `works/anime-battle/tools.md`。コードは `video/remotion/src/pixel-mv/`、書き出しは `node scripts/render-pixel.mjs`。v2 と v1 の動画はそのまま残す。投稿文・完成パッケージ・`works.js` はまだ |

公開URL:https://studio-kakuu.github.io/kakuu-studio/

## 未対応の課題
- ElevenLabs の API キーの作り直しを検討中

## 次の作品を始めるとき
1. 新しいセッションで `STATUS.md` と `CLAUDE.md` を読んでから始める(完了済みの作業は調べ直さない)
2. 手順は `docs/production-flow.md`。番号は 007 から(006 は保留中)
3. 終えるときにこのファイルを更新して、コミット・プッシュ
