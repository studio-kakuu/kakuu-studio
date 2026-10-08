/*
  KAKUU STUDIO — 作品一覧データ
  新しい作品を追加するときは、この配列の「先頭」に1件コピーして書き換えるだけでOK。
  (トップページ index.html が自動で並べます)

  slug    : works/ 以下のフォルダ名
  name    : 架空ブランド名(英字)
  nameJa  : 日本語名
  theme   : テーマ(例:架空のカフェ)
  themeEn : テーマ英語
  date    : 公開日 YYYY-MM-DD
  minutes : 実測の制作時間(分。measured_time.txt の hook_minutes)
  palette : カード用の色3つ [背景, 文字, アクセント](作品サイトの色)
*/
window.KAKUU_WORKS = [
  {
    no: "001",
    slug: "cafe",
    name: "YUGE",
    nameJa: "湯気と珈琲",
    theme: "架空のカフェ",
    themeEn: "Fictional Cafe",
    date: "2026-10-08",
    minutes: 7,
    palette: ["#EFE4D4", "#2A1C15", "#C0663C"]
  }
];
