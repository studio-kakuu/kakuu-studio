import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 書き出し先は作品フォルダ直下(works/kakuu-os/)。GitHub Pages の相対パスで動くよう base は './'
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: '..', emptyOutDir: false, assetsDir: 'assets' },
});
