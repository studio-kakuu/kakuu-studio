// 009 スタンプ工房の紹介ページ。ライブラリは使わない。
(() => {
  // 40個の壁(押すと、そのスタンプがはねる)
  const words = ["月曜つらい","金曜最高!","寝坊した!","天才では?","尊い…","それな","秒で行く!","優勝です","神!","ご褒美タイム","ねむみ","腹ペコ","光速で返信","はて?","ドヤ","ぴえん","しんど…","癒やされたい","天気よすぎ","雨やだ〜","推しが尊い","やる気どこ?","休憩しよ","まじか","あざす!","りょ!","おけまる","今起きた","筋肉痛","帰りたい","おやすみ〜","楽しすぎ!","また遊ぼ!","了解でーす","感謝!","えらい!","ナイス!","ちょい待ち","助かる〜!","わかりみ"];
  const wall = document.getElementById("wall");
  if (wall) {
    wall.innerHTML = words.map((w, i) => {
      const n = String(i).padStart(2, "0");
      return `<li><button type="button" aria-label="スタンプ「${w}」を動かす"><img src="img/st/${n}.webp" alt="" width="185" height="160" loading="lazy"></button></li>`;
    }).join("");
    wall.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      b.classList.remove("hop"); void b.offsetWidth; b.classList.add("hop");
    });
  }

  // 受け取り方:配布の前・最中・後で一文を変える(日本時間 10/26 21:00〜23:59)
  const OPEN = Date.UTC(2026, 9, 26, 12, 0, 0), CLOSE = Date.UTC(2026, 9, 26, 15, 0, 0);
  const when = document.getElementById("getWhen");
  const now = Date.now();
  if (when && now >= OPEN && now < CLOSE) {
    when.textContent = "いま配布中です(23:59まで)。合言葉はオープンチャットで発表しています。";
    when.classList.add("now");
  } else if (when && now >= CLOSE) {
    when.textContent = "今回の配布は終わりました。次のお知らせはオープンチャットで行います。";
  }
})();
