# 出典と利用条件 — 005 KAKUU GAMES

## モーションキャプチャのデータ:CMU Graphics Lab Motion Capture Database
- 元のデータ:Carnegie Mellon University Graphics Lab Motion Capture Database(http://mocap.cs.cmu.edu/ 。ASF/AMC 形式)
- 使った形式:Bruce Hahne(cgspeed)による BVH 変換(MotionBuilder 向け・2010年版)を、GitHub の `Shriinivas/cmubvh`(https://github.com/Shriinivas/cmubvh)から取得
- 取得日:2026-10-10(`git clone --filter=blob:none` で、使うファイルだけ取り出した)
- 利用条件(cgspeed の READMEFIRST の USAGE RIGHTS より、原文):
  > CMU places no restrictions on the use of the original dataset, and I (Bruce) place no additional restrictions on the use of this particular BVH conversion.
  >
  > Here's the relevant paragraph from mocap.cs.cmu.edu:
  > Use this data! This data is free for use in research and commercial projects worldwide. If you publish results obtained using this data, we would appreciate it if you would send the citation to your published paper to jkh+mocap@cs.cmu.edu, and also would add this text to your acknowledgments section: "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."
- まとめ:研究・商用ともに無料で使える。論文ではないので連絡は不要だが、**謝辞の文(下)を Web 版のページと tools.md に入れる**
  - The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.
- 注意:CMU のサイト(mocap.cs.cmu.edu)は、この制作環境のネットワークからは開けなかった。利用条件は、BVH 変換に同梱の READMEFIRST.txt(上の原文)で確認した

### 使ったファイル(`videos/kakuu-games/mocap/` に置いた分)
| ファイル | 中身(元の説明) | 使った所 |
|---|---|---|
| 06_02.bvh | basketball - forward dribble | バスケ 0.0〜4.4 秒、7.6〜9.95 秒 |
| 06_14.bvh | basketball - crossover dribble, shoot | バスケ 9.6〜13.9 秒 |
| 124_05.bvh | Basketball Jump Shot | バスケ 4.1〜8.0 秒 |
| 124_06.bvh | Basketball Lay Up | バスケ 13.5〜18.0 秒 |

## フォント
- Anton(英語)・Zen Kaku Gothic New Black(日本語):Google Fonts(SIL Open Font License)。`video/remotion/public/fonts/` に同梱

## キャラクター「コマ」
- KAKUU STUDIO のオリジナル。設定画は画像生成AI(Gemini アプリ・ユーザーが作成、`works/motion-zukan/art/chara.jpg`)。3Dのモデルは、その設定画をもとにコードで作った(`video/remotion/src/kakuu-games/koma.ts`)

## 使っていないもの
- 参考動画(リポジトリに入れていない)・写真素材・実在の大会・団体・選手・ブランドのロゴや名前
