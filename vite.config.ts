import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base を相対パスにして、GitHub Pages などのサブディレクトリにもそのまま置けるようにする
export default defineConfig({
  base: './',
  plugins: [react()],
  // exceljs は Excel 出力時にだけ遅延読み込みするため、チャンクが大きくても初期表示には影響しない
  build: { chunkSizeWarningLimit: 1000 },
});
