# STATUS — いまの状態(作業の最初に読み、終わりに更新する)

最終更新:2026-10-27

## 作品一覧
| No | 作品 | フォルダ | 状態 |
|---|---|---|---|
| 001 | YUGE(架空のカフェのサイト) | `works/cafe/` | 公開・SNS投稿済み |
| 002 | KAKUU OS | `works/kakuu-os/` | 公開・SNS投稿済み |
| 003 | MOKO(くものこ もこ) | `works/moko/` | 公開・SNS投稿済み |
| 004 | MOTION 100(モーション図鑑) | `works/motion-zukan/` | 公開・SNS投稿済み |
| 005 | KAKUU GAMES(ピクトグラム図鑑) | `works/kakuu-games/` | **完了**:公開・ManyChat『ゲームズ』設定・全SNS投稿済み |
| 006 | 制作記録 02 工程・シフト管理(ガイドページ) | `works/koutei/` | 公開。動画 `videos/koutei/`(3媒体)・投稿文 `captions/koutei/`。全SNS投稿済み・ManyChat『工程』LIVE(001 カフェの自動返信は停止) |
| 007 | ドットアニメ(アニメ戦闘MV) | ブランチ `claude/006-anime-battle-mv` | **保留中**(main には未取り込み。ブランチ名は旧番号のまま) |
| 009 | スタンプ工房(LINEスタンプ半自動ツール)の紹介ページ | `works/stamp-kobo/` | 公開(一覧の日付は配布日 10/26)。ツール本体は別リポジトリ yuji2110n-web/stamp-kobo(合言葉つき・10/26 21:00〜23:59 配布)。受け取りは Instagram リールのコメント『スタンプ』→ オープンチャットで合言葉発表。合言葉と参加コードはこのリポジトリに書かない |
| 010 | LINEスタンプ(ストア 37544900)の紹介ショート | 企画案 `video/storyboards/line-stamp-ideas.md` | **企画中**:3案を提案済み・未承認。スタンプ名・個数などが未確認(LINE のページがこの環境から開けない) |
| 008 | モーション図鑑の LP と紹介動画 | `works/zukan-intro/` | LP 公開。動画 `videos/zukan-intro/`(3媒体)・投稿文 `captions/zukan-intro.md`。受け取りは MV 投稿のコメント『モーション』(004 の ManyChat)。投稿時に右下へ MV を重ねる。**未投稿** |

公開URL:https://studio-kakuu.github.io/kakuu-studio/

## 2026-10-17 動線見直し
- サイト:トップのナビに X・TikTok・Instagram、noscript に 001〜005。各作品ページの最後にフォロー案内(kakuu-os は `npm run build:page` で再ビルド)
- ManyChat:フォロー確認は無料プランで使えないため、opening DM とコメント返信でやわらかくお願い(`captions/posting-checklist.md`)
- SNSプロフィール文と、TikTok 1,000人超えでリンク+締め切り替えの条件を `brand/brand.md` 3.6章・`video/spec.md` に記録
- SNSリンクを目立つボタンに変更(ライム枠・X だけ塗り)。トップの説明文の下に FOLLOW ボタン、作品ページの案内も同じ見た目

## 2026-10-26 Lemo-Opuscar 導入
- `.claude/settings.json` にマーケットプレイス lemolab とプラグイン lemo-opuscar@lemolab を登録。クラウドでは起動時フック `.claude/hooks/lemo-opuscar-setup.sh` がライブラリ `~/lemo-opuscar` と依存を自動で入れる(Node 22・ffmpeg・Python 3.12・Chromium は環境に既存)
- テスト映像(5秒・1080×1920・無音):`videos/lemo-opuscar-test/kakuu-lemo-test_1080x1920.mp4` 書き出し成功。ソースは `video/lemo-opuscar-test/`
- 007 に合うスタイル:`pixel-rpg`(16-bit Pixel RPG)

## 未対応の課題
- ElevenLabs の API キーの作り直しを検討中

## 次の作品を始めるとき
1. 新しいセッションで `STATUS.md` と `CLAUDE.md` を読んでから始める(完了済みの作業は調べ直さない)
2. 手順は `docs/production-flow.md`。番号は 010 から(007 ドットアニメは保留中)
3. 終えるときにこのファイルを更新して、コミット・プッシュ
