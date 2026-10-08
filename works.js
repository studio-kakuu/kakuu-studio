/*
  KAKUU STUDIO — 作品一覧データ
  新しい作品を追加するときは、この配列の「先頭」に1件コピーして書き換えるだけでOK。
  (トップページ index.html が自動で並べます)

  slug    : works/ 以下のフォルダ名
  genre   : ジャンル表記(大文字)。例:WEB / FILM / ANIMATION / CM / MV / PHOTO
  href    : (任意)リンク先。省略時は works/<slug>/。映像作品で動画ページや外部URLに飛ばす場合に指定
  name    : 架空ブランド名・作品名(英字)
  nameJa  : 日本語名
  theme   : テーマ(例:架空のカフェ、架空の映画の予告編)
  themeEn : テーマ英語
  date    : 公開日 YYYY-MM-DD
  minutes : (任意)実測の制作時間(分。measured_time.txt の hook_minutes)。無ければ省略
  palette : カード用の色3つ [背景, 文字, アクセント](作品サイトの色)
*/
window.KAKUU_WORKS = [
  {
    no: "002",
    slug: "kakuu-os",
    genre: "WEB",
    name: "KAKUU OS",
    nameJa: "制作記録 01",
    theme: "制作システムのダッシュボード",
    themeEn: "Studio OS — Making-of Series 01",
    date: "2026-10-08",
    palette: ["#C6FF3D", "#0E0E0E", "#0E0E0E"]
  },
  {
    no: "001",
    slug: "cafe",
    genre: "WEB",
    name: "YUGE",
    nameJa: "湯気と珈琲",
    theme: "架空のカフェ",
    themeEn: "Fictional Cafe",
    date: "2026-10-08",
    minutes: 8,
    palette: ["#EFE4D4", "#2A1C15", "#C0663C"]
  }
];
