# STATUS — いまの状態(作業の最初に読み、終わりに更新する)

最終更新:2026-10-17

## 作品一覧
| No | 作品 | フォルダ | 状態 |
|---|---|---|---|
| 001 | YUGE(架空のカフェのサイト) | `works/cafe/` | 公開・SNS投稿済み |
| 002 | KAKUU OS | `works/kakuu-os/` | 公開・SNS投稿済み |
| 003 | MOKO(くものこ もこ) | `works/moko/` | 公開・SNS投稿済み |
| 004 | MOTION 100(モーション図鑑) | `works/motion-zukan/` | 公開・SNS投稿済み |
| 005 | KAKUU GAMES(ピクトグラム図鑑) | `works/kakuu-games/` | **完了**:公開・ManyChat『ゲームズ』設定・全SNS投稿済み |
| 006 | 制作記録 02 工程・シフト管理(ガイドページ) | `works/koutei/` | 公開。動画 `videos/koutei/`(3媒体)・投稿文 `captions/koutei/`。全SNS投稿済み・ManyChat『工程』LIVE(001 カフェの自動返信は停止) |

公開URL:https://studio-kakuu.github.io/kakuu-studio/

## 2026-10-17 動線見直し
- サイト:トップのナビに X・TikTok・Instagram、noscript に 001〜005。各作品ページの最後にフォロー案内(kakuu-os は `npm run build:page` で再ビルド)
- ManyChat:フォロー確認は無料プランで使えないため、opening DM とコメント返信でやわらかくお願い(`captions/posting-checklist.md`)
- SNSプロフィール文と、TikTok 1,000人超えでリンク+締め切り替えの条件を `brand/brand.md` 3.6章・`video/spec.md` に記録
- SNSリンクを目立つボタンに変更(ライム枠・X だけ塗り)。トップの説明文の下に FOLLOW ボタン、作品ページの案内も同じ見た目

## 未対応の課題
- ElevenLabs の API キーの作り直しを検討中

## 次の作品を始めるとき
1. 新しいセッションで `STATUS.md` と `CLAUDE.md` を読んでから始める(完了済みの作業は調べ直さない)
2. 手順は `docs/production-flow.md`。番号は 007 から(候補:ドット絵バトル〈魔法使い・騎士・影狼〉をシリーズ第1話として)
3. 終えるときにこのファイルを更新して、コミット・プッシュ
