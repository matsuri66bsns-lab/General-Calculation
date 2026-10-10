import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import './styles/global.css';
import { applyIdFont, readIdFont } from './core/fonts';

// IDの書体の試用の選択を描画前に反映し、表示のちらつきを防ぐ
applyIdFont(readIdFont());

// HashRouter を使い、GitHub Pages などの静的ホスティングでも各ページを直接開けるようにする
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
