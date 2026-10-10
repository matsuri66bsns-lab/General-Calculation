/**
 * ツールID（XX-01）の書体の試用切替（仮の機能）。
 * 書体が決まったら、このファイルと components/FontTrial.tsx を削除し、
 * global.css の --f-id と index.html の読み込みを決まった書体に書き換える。
 */
import { readJSON, writeJSON } from './storage';

export interface FontOption {
  id: string;
  label: string;
  /** CSS の font-family の先頭に置く名前 */
  family: string;
  /** Google Fonts の family パラメーター。既定で読み込み済みなら null */
  query: string | null;
}

const ID_FALLBACK = "'Noto Sans Mono', ui-monospace, Menlo, Consolas, monospace";

export const ID_FONTS: FontOption[] = [
  { id: 'roboto-mono', label: 'Roboto Mono（現在）', family: 'Roboto Mono', query: null },
  { id: 'plex-mono', label: 'IBM Plex Mono', family: 'IBM Plex Mono', query: 'IBM+Plex+Mono:wght@400;500' },
  { id: 'jetbrains', label: 'JetBrains Mono', family: 'JetBrains Mono', query: 'JetBrains+Mono:wght@400;500' },
  { id: 'noto-mono', label: 'Noto Sans Mono', family: 'Noto Sans Mono', query: 'Noto+Sans+Mono:wght@400;500' },
  { id: 'noto-jp', label: 'Noto Sans JP（本文と同じ）', family: 'Noto Sans JP', query: null },
];

export const DEFAULT_ID_FONT = ID_FONTS[0].id;
export const ID_FONT_KEY = 'fonts:id';

function find(id: string): FontOption {
  return ID_FONTS.find((f) => f.id === id) ?? ID_FONTS[0];
}

/** 選んだ書体を Google Fonts から読み込む（同じものは一度だけ） */
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

/** CSS 変数 --f-id に反映する。既定の書体なら上書きを外して global.css の値に戻す */
export function applyIdFont(fontId: string): void {
  if (typeof document === 'undefined') return;
  const f = find(fontId);
  load(f);
  const root = document.documentElement.style;
  if (f.id === DEFAULT_ID_FONT) root.removeProperty('--f-id');
  else root.setProperty('--f-id', `'${f.family}', ${ID_FALLBACK}`);
}

export function readIdFont(): string {
  return readJSON<string>(ID_FONT_KEY, DEFAULT_ID_FONT);
}

export function saveIdFont(fontId: string): void {
  writeJSON(ID_FONT_KEY, fontId);
  applyIdFont(fontId);
}
