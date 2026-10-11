import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** 画面下の状態バーに出す項目。各ページが useStatusBar で設定する */
export interface StatusItem {
  text: string;
  tone?: 'ok' | 'ng' | 'muted';
}

const Ctx = createContext<{ items: StatusItem[]; set: (items: StatusItem[]) => void }>({ items: [], set: () => {} });

export function StatusProvider({ children }: { children: ReactNode }) {
  const [items, set] = useState<StatusItem[]>([]);
  return <Ctx.Provider value={{ items, set }}>{children}</Ctx.Provider>;
}

export function useStatusItems() {
  return useContext(Ctx).items;
}

/** items は描画ごとに作り直されるので、内容が変わったときだけ反映する */
export function useStatusBar(items: StatusItem[]) {
  const { set } = useContext(Ctx);
  const key = JSON.stringify(items);
  useEffect(() => {
    set(JSON.parse(key) as StatusItem[]);
  }, [key, set]);
  useEffect(() => () => set([]), [set]);
}
