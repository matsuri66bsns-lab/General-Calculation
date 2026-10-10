/**
 * フォントの試用切替（仮の機能）。
 * フォントが決まったら、このファイルと components/FontTrial.tsx を削除し、
 * global.css の --f-body / --f-num と index.html の読み込みを決まったフォントに書き換える。
 */
import { readJSON, writeJSON } from './storage';

export interface FontOption {
  id: string;
  label: string;
  /** CSS の font-family の先頭に置く名前。null は本文と同じ書体を使う */
  family: string | null;
  /** Google Fonts の family パラメーター。既定で読み込み済みなら null */
  query: string | null;
}

const BODY_FALLBACK = "'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic UI', Meiryo, sans-serif";
const NUM_FALLBACK = "'Noto Sans Mono', ui-monospace, Menlo, Consolas, monospace";

export const BODY_FONTS: FontOption[] = [
  { id: 'zen-kaku', label: 'Zen Kaku Gothic New（現在）', family: 'Zen Kaku Gothic New', query: null },
  { id: 'noto-sans-jp', label: 'Noto Sans JP', family: 'Noto Sans JP', query: 'Noto+Sans+JP:wght@400;500;700' },
  { id: 'biz-udp', label: 'BIZ UDPゴシック', family: 'BIZ UDPGothic', query: 'BIZ+UDPGothic:wght@400;700' },
  { id: 'plex-jp', label: 'IBM Plex Sans JP', family: 'IBM Plex Sans JP', query: 'IBM+Plex+Sans+JP:wght@400;500;700' },
  { id: 'mplus2', label: 'M PLUS 2', family: 'M PLUS 2', query: 'M+PLUS+2:wght@400;500;700' },
];

export const NUM_FONTS: FontOption[] = [
  { id: 'roboto-mono', label: 'Roboto Mono（現在）', family: 'Roboto Mono', query: null },
  { id: 'plex-mono', label: 'IBM Plex Mono', family: 'IBM Plex Mono', query: 'IBM+Plex+Mono:wght@400;500' },
  { id: 'jetbrains', label: 'JetBrains Mono', family: 'JetBrains Mono', query: 'JetBrains+Mono:wght@400;500' },
  { id: 'noto-mono', label: 'Noto Sans Mono', family: 'Noto Sans Mono', query: 'Noto+Sans+Mono:wght@400;500' },
  { id: 'same', label: '本文と同じ書体（等幅数字）', family: null, query: null },
];

export interface FontChoice {
  body: string;
  num: string;
}

export const DEFAULT_FONTS: FontChoice = { body: BODY_FONTS[0].id, num: NUM_FONTS[0].id };

function find(list: FontOption[], id: string): FontOption {
  return list.find((f) => f.id === id) ?? list[0];
}

/** 選んだフォントを Google Fonts から読み込む（同じものは一度だけ） */
function load(f: FontOption) {
  if (!f.query || typeof document === 'undefined') return;
  const id = `font-${f.id}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${f.query}&display=swap`;
  document.head.appendChild(link);
}

/** CSS 変数に反映する。既定の組み合わせなら上書きを外して global.css の値に戻す */
export function applyFonts(choice: FontChoice): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const body = find(BODY_FONTS, choice.body);
  const num = find(NUM_FONTS, choice.num);
  load(body);
  load(num);
  const bodyStack = `'${body.family}', ${BODY_FALLBACK}`;
  if (body.id === DEFAULT_FONTS.body) root.removeProperty('--f-body');
  else root.setProperty('--f-body', bodyStack);
  if (num.family === null) root.setProperty('--f-num', bodyStack);
  else if (num.id === DEFAULT_FONTS.num) root.removeProperty('--f-num');
  else root.setProperty('--f-num', `'${num.family}', ${NUM_FALLBACK}`);
}

export function readFontChoice(): FontChoice {
  return { ...DEFAULT_FONTS, ...readJSON<Partial<FontChoice>>('fonts', {}) };
}

export function saveFontChoice(choice: FontChoice): void {
  writeJSON('fonts', choice);
  applyFonts(choice);
}
