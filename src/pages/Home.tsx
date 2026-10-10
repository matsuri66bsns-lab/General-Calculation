import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '../tools/categories';
import { TOOLS, toolsIn } from '../tools/registry';
import { ToolTable } from '../components/ToolTable';
import { useFavorites, useHistory } from '../core/storage';
import { useStatusBar } from '../core/status';
import type { CategoryId } from '../core/types';

type Filter = 'all' | 'fav' | 'recent' | CategoryId;

export function Home() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('cat') ?? params.get('f') ?? 'all') as Filter;
  const { favorites } = useFavorites();
  const [history] = useHistory();
  const usedAt = useMemo(() => Object.fromEntries(history.map((h) => [h.id, h.at])), [history]);

  const list = useMemo(() => {
    if (filter === 'fav') return TOOLS.filter((t) => favorites.includes(t.id));
    if (filter === 'recent') return history.map((h) => TOOLS.find((t) => t.id === h.id)).filter((t) => t !== undefined);
    if (CATEGORIES.some((c) => c.id === filter)) return toolsIn(filter as CategoryId);
    return TOOLS;
  }, [filter, favorites, history]);

  const current = CATEGORIES.find((c) => c.id === filter);
  useStatusBar([{ text: `${list.length} 件を表示` }, { text: 'Ctrl+K（⌘K）で検索' }]);

  const setFilter = (f: Filter) => {
    if (f === 'all') setParams({});
    else if (f === 'fav' || f === 'recent') setParams({ f });
    else setParams({ cat: f });
  };

  return (
    <>
      <section className="band band--hero">
        <div className="band__inner hero">
          <div>
            <h1>設備の計算を、系統ごとに。</h1>
            <p>空調・給排水・電気・消防の設計計算をブラウザだけで。計算根拠を表示し、関数入りの Excel 計算書として出力できます。</p>
          </div>
          <div className="pipes" role="group" aria-label="分類で絞り込む">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`pipe ${filter === c.id ? 'is-on' : ''}`}
                aria-pressed={filter === c.id}
                onClick={() => setFilter(filter === c.id ? 'all' : c.id)}
                title={`JIS Z 9102 の識別色：${c.ident}`}
              >
                <span className={`pipe__label tag--${c.id}`}>{c.name}</span>
                <span className="pipe__flow mono">{toolsIn(c.id).length} tools →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="page">
        <div className="toolbar">
          <h2>{current ? current.name : filter === 'fav' ? 'お気に入り' : filter === 'recent' ? '最近使ったツール' : 'すべてのツール'}</h2>
          <div className="chips" role="group" aria-label="表示の切り替え">
            {(
              [
                ['all', 'すべて'],
                ['recent', '最近使った'],
                ['fav', 'お気に入り'],
              ] as const
            ).map(([f, label]) => (
              <button key={f} type="button" className={`chip ${filter === f ? 'is-on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {current && <p className="muted lead">{current.description}</p>}
        {list.length > 0 ? (
          <div className="panel panel--flush">
            <ToolTable tools={list} usedAt={usedAt} />
          </div>
        ) : (
          <p className="empty">
            {filter === 'fav'
              ? '一覧の ☆ を押すと、お気に入りに追加されます。'
              : filter === 'recent'
                ? 'まだ使ったツールはありません。'
                : 'この分類のツールは準備中です。'}
          </p>
        )}
      </div>
    </>
  );
}
