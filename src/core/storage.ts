import { useCallback, useSyncExternalStore } from 'react';

/**
 * localStorage の読み書き。プライベートブラウズなどで使えない場合も落ちないよう、
 * すべて try/catch で包み、失敗時は既定値を返す。
 */
const PREFIX = 'gc:';
const listeners = new Set<() => void>();

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s === null ? fallback : (JSON.parse(s) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* 保存できなくても動作は続ける */
  }
  cache.delete(key);
  listeners.forEach((l) => l());
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
  cache.delete(key);
  listeners.forEach((l) => l());
}

// useSyncExternalStore は同じ参照を返す必要があるので、読み出し結果をキャッシュする
const cache = new Map<string, unknown>();
function snapshot<T>(key: string, fallback: T): T {
  if (!cache.has(key)) cache.set(key, readJSON(key, fallback));
  return cache.get(key) as T;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStored<T>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useSyncExternalStore(subscribe, () => snapshot(key, fallback));
  const set = useCallback((v: T) => writeJSON(key, v), [key]);
  return [value, set];
}

/* ---- 閲覧履歴・お気に入り ---- */

const HISTORY_MAX = 30;

export interface HistoryEntry {
  id: string;
  at: number;
}

export function recordVisit(id: string): void {
  const list = readJSON<HistoryEntry[]>('history', []).filter((h) => h.id !== id);
  list.unshift({ id, at: Date.now() });
  writeJSON('history', list.slice(0, HISTORY_MAX));
}

export function useHistory() {
  return useStored<HistoryEntry[]>('history', []);
}

export function useFavorites() {
  const [favs, setFavs] = useStored<string[]>('favorites', []);
  const toggle = useCallback(
    (id: string) => setFavs(favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]),
    [favs, setFavs],
  );
  return { favorites: favs, toggle, isFavorite: (id: string) => favs.includes(id) };
}
