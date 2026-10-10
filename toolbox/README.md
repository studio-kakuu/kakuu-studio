# KAKUU STUDIO 道具箱(toolbox)

作品を作り始める前に必ずこのファイルを読み、**作品に合う道具とスキルを1セットだけ** 選ぶ(デザイン思考スキル1つ+動きのライブラリ1つ)。
スキルは `.claude/skills/` に導入済み(出どころは `.claude/skills/SOURCES.md`)。

---

## 棚0「考える」 — デザインの考え方(デザイン思考スキル)

| スキル | 状態 | 使う作品 | 備考 |
|---|---|---|---|
| `frontend-design` | **普段使い**(導入済み) | ほぼすべての作品。個性的で、他と見間違えない見た目にしたい作品 | 「テンプレっぽい既定の見た目」を避ける考え方。毎回まず色・文字・レイアウトの計画を立て、ありがちでないか見直してから作る |
| UI UX Pro Max | **候補・未導入** | 架空のアプリ画面・EC(通販)など「使いやすさ」そのものが見どころの作品のみ | 導入する場合は、元の作者 **nextlevelbuilder の公式リポジトリ版のみ**(コピー・改変版は使わない)。導入時に出どころを確認して `.claude/skills/SOURCES.md` に記録 |

- **1作品で使うデザイン思考スキルは1つだけ。** frontend-design と UI UX Pro Max を同じ作品で混ぜない(方針がぶつかり、見た目がちぐはぐになる)。

---

## 棚1「作る」 — 作品そのものをつくる道具

### GSAP + Lenis(スクロール演出のサイト)
| 項目 | 内容 |
|---|---|
| 得意な作品 | 架空のお店・ブランドの1ページサイト、スクロールに合わせて物語が進むサイト、文字や図形が組み上がる演出、横スクロール・ピン留め・パララックス |
| 苦手なこと | 本格的な3D(→Three.js)、Reactの状態と強く結びついたUI(→Motion)、動画ファイルの書き出し(→Remotion) |
| 費用 | 無料。GSAPは2025年から全プラグイン(ScrollTrigger / SplitText / MorphSVG など)を含め無料で商用利用可。Lenis は MIT |
| 相性の悪い組み合わせ | Motion(同じ要素を2つのライブラリで動かすと競合)。CSSの `scroll-behavior: smooth` と Lenis の併用(二重スムーススクロール)。他のスムーススクロール系ライブラリ |
| 対応スキル | `gsap-core`、`gsap-timeline`、`gsap-scrolltrigger`、`gsap-plugins`、`gsap-utils`、`gsap-performance`(Reactで使う場合は `gsap-react`、Vue/Svelte等は `gsap-frameworks`)+ UIは `frontend-design` |
| 導入方法 | 静的サイトなら作品フォルダ内に `vendor/` を作り、npm から取得した版固定のファイル(`gsap.min.js`・`ScrollTrigger.min.js`・`SplitText.min.js`・`lenis.min.js` 等)を置く(CDNに依存しない。例:`works/cafe/vendor/`)。ビルドする場合は作品フォルダ内で `npm i gsap lenis` |

### Framer Motion / Motion(お気に入り紹介・アプリ風の触れる作品)
| 項目 | 内容 |
|---|---|
| 得意な作品 | 「お気に入り紹介」カード、タップ・ドラッグ・スワイプで触れるアプリ風の作品、画面遷移、レイアウトが滑らかに入れ替わるUI(layout アニメーション) |
| 苦手なこと | Reactなしの静的HTML(React前提)、長いスクロール演出の細かいタイムライン制御(→GSAP)、3D(→Three.js) |
| 費用 | 無料(MIT)。有料の Motion+(追加コンポーネント・例集)は不要なら使わない |
| 相性の悪い組み合わせ | GSAP(1作品1ライブラリのルール)。React以外の環境。Lenis との併用はスクロール連動の挙動がずれやすい |
| 対応スキル | 専用の公式スキルはなし → `frontend-design` に従い、公式ドキュメント(motion.dev)を参照 |
| 使用例 | `works/kakuu-os/`(React 19 + Motion 12 + Vite 7。`source/` で書き出して作品フォルダ直下に静的ファイルを置く) |
| 導入方法 | 作品フォルダで Vite + React を作り `npm i motion`。GitHub Pages には `vite build` の出力(`dist/`)を作品フォルダに置く |

### Three.js(3D作品)
| 項目 | 内容 |
|---|---|
| 得意な作品 | 架空の場所・建物・商品の3D展示、回せる・覗ける立体、パーティクルや光の表現、WebGLのシェーダー演出 |
| 苦手なこと | 文字主体の情報ページ、スマホの低性能端末(重くなりやすい)、SEO・読みやすさが大事なページ |
| 費用 | 無料(MIT)。3Dモデル素材は自作(コードで生成)するか、ライセンスが明確なものだけ使う |
| 相性の悪い組み合わせ | 同じキャンバスに別の3Dライブラリ(Babylon.js等)。重いポストエフェクトの多重がけ。スクロール演出で使うなら GSAP は「カメラの動き」だけに限定し、DOMの動きと混在させない |
| 対応スキル | 専用の公式スキルはなし → `frontend-design`(画面まわり)+ 公式ドキュメント(threejs.org/docs) |
| 導入方法 | `<script type="importmap">` で CDN(`three@<版>`)をバージョン固定、またはViteで `npm i three` |

---

## 棚2「見せる」 — 作品を動画にして届ける道具

### Remotion(動画全般)
| 項目 | 内容 |
|---|---|
| 得意な作品 | 縦型ショート、制作過程の紹介動画、テロップ・図形アニメーション、架空のCM・予告編風の映像、データから同じ型の動画を量産 |
| 苦手なこと | 実写素材の細かい編集(カット編集ソフトの方が早い)、生成AIの映像そのものを作ること(素材は別途用意)、Reactを使わない構成 |
| 費用 | 個人・従業員3人以下の会社・非営利は無料(商用可)。4人以上の会社は有料の Company License が必要。クラウドレンダリング(Lambda等)は使わずローカルで書き出す |
| 相性の悪い組み合わせ | 動画内で CSS アニメーション・`setTimeout` に頼る作り(Remotionは `useCurrentFrame()` で毎フレーム決定的に描く)。GSAP をRemotion内で使う場合はフレームに同期させる必要があり、基本は Remotion 標準の `interpolate` / `spring` を使う |
| 対応スキル | `remotion-best-practices`(入口)、`remotion-create`、`remotion-markup`、`remotion-render`、`remotion-studio`、`remotion-captions`、`remotion-multimedia` ほか |
| 既存の仕組みとの関係 | 制作過程動画は `video/remotion/` が正式(テンプレート化済み、仕様は `video/spec.md`)。旧 `video/render/` は参考として残す。映像作品(FILM / ANIMATION / CM)も Remotion で作る |
| この環境での注意 | Remotion の内蔵ブラウザが取得できない環境では `CHROMIUM_PATH` に Chromium のパスを渡す。フォントは `public/fonts` に同梱してネット取得に頼らない |

---

## 棚3「届ける」 — 発信・集客の道具

- リール(ショート動画)の決まり:見てほしい人・冒頭 1.5 秒のフック・キャプションの1行目・ハッシュタグ・投稿時の確認は `toolbox/reels-growth.md`(出典:リール攻略の解説動画。一クリエイターの経験則で、Instagram公式ではない)

### NoimosAI(自律型AIマーケティング) — **保留**
| 項目 | 内容 |
|---|---|
| 状態 | **保留。アカウントが育ってから検討**(目安:投稿が安定して続き、反応のデータがたまってから) |
| 得意なこと | SNS・SEO・広告などチャネル別のAIエージェントが、調査・戦略・投稿などを自動で回す |
| 苦手なこと / 注意 | 作品のトーン(静か・上品・売り込まない)とずれた投稿を自動で出すおそれ。自動投稿は必ず人が確認してから |
| 費用 | 有料(第三者の掲載情報では Pro が1ユーザー月99ドル程度。導入時に公式ページで要確認)。現時点では使わない |
| 相性の悪い組み合わせ | 他の自動投稿ツールとの同時運用(二重投稿)。`brand/brand.md` のトーン規定を守れない設定 |
| 対応スキル | なし |

---

## 参考にする・見送ったもの

| 名前 | 扱い | 理由・メモ |
|---|---|---|
| Gemini(参考動画の分析) | **採用(手作業)** | 参考動画を Gemini で分析し、出てきた「演出指示書」を Claude Code に貼る。手順と分析用プロンプトは `toolbox/reference-analysis.md` |
| 21st.dev(UIコンポーネント集) | **見送り** | 部品を探して選び、貼り付けて調整する手作業が増えるため道具箱には入れない。既製品っぽい見た目になりやすい点も運用ルール5(UI部品キットは原則使わない)と合わない |

---

## 運用ルール

1. **作品ごとにフォルダと依存パッケージを分ける。** `works/<作品名>/` の中で完結させ、`package.json` / `node_modules` も作品フォルダ内に置く。他の作品・トップページ・`video/` に影響させない。リポジトリ直下に依存を足さない。
2. **1作品で使うデザイン思考スキルは1つだけ。**(棚0参照。普段は `frontend-design`)
3. **1作品で使う動きのライブラリは1つだけ。** GSAP+Lenis / Motion / Three.js(+必要ならGSAPでカメラだけ)のどれか。CSSだけで足りるならCSSだけでよい。
4. **使った道具とスキルを記録する。** 作品ごとに `works/<作品名>/tools.md` を作り、使ったツール(バージョン)・スキル・選んだ理由・書き出し方法を書く。
5. **UI部品キット系は原則使わない。** daisyUI・Bootstrap・shadcn/ui の見た目そのまま等は既製品っぽくなるため禁止。見た目は毎回 `frontend-design` に従って作品固有に作る。
6. **バージョンは固定する。** CDNは `gsap@3.x.y` のように正確な版を書く。`latest` は使わない。
7. **有料APIは使わない。** 画像・音声・動画の生成APIは使わず、コード・SVG・CSS・ローカルレンダリングで作る。
8. **新しいツールの追加依頼が来たら**、公式情報を調べ、このファイルに「棚・得意な作品・苦手なこと・費用・相性の悪い組み合わせ・対応スキル」を追記する。公式スキルがあれば出どころを確認して `.claude/skills/` に入れ、`SOURCES.md` を更新する。
9. **参考動画は Gemini で分析し、演出指示書を技法の参考にするだけ。** そのまま真似しない(`toolbox/reference-analysis.md`)。

## 選び方の早見表

| 作りたいもの | 道具 | スキル |
|---|---|---|
| スクロールで見せる架空のお店サイト | GSAP + Lenis | gsap-* + frontend-design |
| タップして遊べる・アプリ風 | Motion(React) | frontend-design |
| 3Dで見せる架空の場所・商品 | Three.js | frontend-design |
| 静かな1ページで動きは控えめ | CSSのみ | frontend-design |
| 制作過程のショート動画(Web作品) | `video/remotion/` | remotion-* |
| 映像作品(FILM / ANIMATION / CM) | Remotion | remotion-* |
