import { useCallback } from 'react';
import { readJSON, useStored, writeJSON } from './storage';

/** 同時に開いておけるツールのタブ数。超えたら古いものから閉じる */
export const MAX_TABS = 8;

/** タブを開く（既に開いていれば並びはそのまま）。上限を超えたら、開くタブ以外で最も古いものを閉じる */
export function openTab(tabs: string[], id: string, max = MAX_TABS): string[] {
  if (tabs.includes(id)) return tabs;
  const next = [...tabs, id];
  while (next.length > max) next.splice(next.findIndex((t) => t !== id), 1);
  return next;
}

/**
 * タブを閉じる。閉じたタブが表示中だった場合に次に表示するタブ（右隣、なければ左隣）も返す。
 * 残りがなければ next は null（一覧へ戻る）。
 */
export function closeTab(tabs: string[], id: string, activeId: string | null): { tabs: string[]; next: string | null } {
  const i = tabs.indexOf(id);
  if (i < 0) return { tabs, next: activeId };
  const rest = tabs.filter((t) => t !== id);
  if (activeId !== id) return { tabs: rest, next: activeId };
  return { tabs: rest, next: rest[i] ?? rest[i - 1] ?? null };
}

export function useTabs() {
  const [tabs, setTabs] = useStored<string[]>('tabs', []);
  const open = useCallback((id: string) => setTabs(openTab(tabs, id)), [tabs, setTabs]);
  const close = useCallback(
    (id: string, activeId: string | null) => {
      const r = closeTab(tabs, id, activeId);
      setTabs(r.tabs);
      return r.next;
    },
    [tabs, setTabs],
  );
  return { tabs, open, close };
}

/** 保存済みのタブ一覧に直接追加する（ツール画面を開いたときに使う）。変化がなければ書き込まない */
export function openTabStored(id: string): void {
  const tabs = readJSON<string[]>('tabs', []);
  const next = openTab(tabs, id);
  if (next !== tabs) writeJSON('tabs', next);
}
