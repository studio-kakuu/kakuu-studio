# stamp-koubou STATUS

## 今の状態(2026-10-27)
- フォルダ作成済み(`README.md`)
- ElevenLabs の APIキー:使用可(starter プラン・有効)
- 声の試聴音声を作成済み(`voice-test/`、各声1回だけ生成)

| ファイル | 声 | Voice ID | 特徴 |
|---|---|---|---|
| `voice-test/1_Riku.mp3` | Riku - Deep & Calm Male Voice | `KJje3wzepLiSIQjVGCB6` | 中年・低く落ち着いた語りかけ調。マイボイスに登録済み |
| `voice-test/2_Enishi.mp3` | Enishi - Deep Japanese Storyteller | `7arouBAZXrSnH9IwDlWQ` | 中年・深く地に足のついた物語ナレーター調 |
| `voice-test/3_Takashi.mp3` | Takashi - Calm Narrator | `ok4ERsdqy0XfV8XdOi3U` | 中年・低く成熟した、落ち着きと自信のあるナレーター調 |

- 生成設定:モデル `eleven_v4` / stability 0.9 / similarity 0.75 / seed 20261027 / speed なし
- 読ませた文:`[落ち着いた低めの声で、淡々と、少し間をとって]会社員の、建前と本音。`(角かっこは話し方の指示で読み上げない)

## 次の作業
- 声を選んだらナレーション全文を生成
