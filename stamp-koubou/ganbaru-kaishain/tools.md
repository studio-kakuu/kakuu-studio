# がんばる会社員 — 使った道具

## ナレーション(ElevenLabs)
- 声:**Riku - Deep & Calm Male Voice**(Voice ID `KJje3wzepLiSIQjVGCB6`)/モデル `eleven_v4`/stability 0.9/similarity 0.75/**seed 20261027**/speed なし/`with-timestamps`
- 読ませた文:`voice/narration.txt`(全体を1回で生成)。送った文字数 164 字、消費 42 クレジット
- 冒頭の話し方の指示(角かっこのタグ)が約7秒ぶん声に出て読まれてしまった。録り直さず、`narration_raw.mp3` の先頭 7.55 秒を切り落として `narration.mp3`(約19.5秒)にした。時刻も同じだけずらして `narration.timestamps.json` に保存
- 次回の教訓:長いタグは読まれることがある。タグは短く(例 `[落ち着いた低い声で、淡々と]`)
