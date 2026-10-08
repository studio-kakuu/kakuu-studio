# KAKUU STUDIO — 制作過程ショート動画(Remotion)

仕様と手順は `../spec.md` を参照。

```bash
npm install
npx playwright install chromium     # 初回のみ
node scripts/capture.mjs --theme cafe
node scripts/render.mjs --theme cafe # → ../../videos/cafe/*.mp4
```
