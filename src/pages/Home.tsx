import { useSearchParams, Link } from 'react-router-dom';
import { CATEGORIES } from '../tools/categories';
import { TOOLS, findToolById, toolsIn } from '../tools/registry';
import { ToolCard } from '../components/ToolCard';
import { CATEGORY_ICON, Icon } from '../components/Icon';
import { useFavorites, useHistory } from '../core/storage';
import type { CategoryId } from '../core/types';

export function Home() {
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') as CategoryId | null;
  const current = CATEGORIES.find((c) => c.id === cat);
  const list = current ? toolsIn(current.id) : TOOLS;
  const { favorites } = useFavorites();
  const [history] = useHistory();
  const recent = history.map((h) => findToolById(h.id)).filter((t) => t !== undefined).slice(0, 4);
  const favTools = favorites.map((id) => findToolById(id)).filter((t) => t !== undefined);

  return (
    <div className="container">
      <section className="hero">
        <h1>
          建築設備の計算を、
          <br className="sp-only" />
          ブラウザだけで。
        </h1>
        <p>空調・換気、給排水衛生、電気設備の計算ツール集。計算根拠を表示し、関数入りの Excel 計算書として出力できます。</p>
      </section>

      {favTools.length > 0 && !current && (
        <section className="section">
          <div className="section__head">
            <h2>
              <Icon name="star" /> お気に入り
            </h2>
          </div>
          <div className="grid">
            {favTools.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && !current && (
        <section className="section">
          <div className="section__head">
            <h2>
              <Icon name="clock" /> 最近使ったツール
            </h2>
            <Link to="/history" className="link-more">
              すべて見る <Icon name="chevron" size={14} />
            </Link>
          </div>
          <div className="recent">
            {recent.map((t) => (
              <Link key={t.id} to={`/tools/${t.slug}`} className={`recent__item cat-${t.category}`}>
                <span className="tool-card__icon">
                  <Icon name={CATEGORY_ICON[t.category]} size={16} />
                </span>
                <span className="recent__id">{t.id}</span>
                <span>{t.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <h2>{current ? current.name : 'すべての計算'}</h2>
          <span className="muted">{list.length} 件</span>
        </div>
        <div className="tabs" role="tablist" aria-label="カテゴリ">
          <button role="tab" aria-selected={!current} className={!current ? 'is-on' : ''} onClick={() => setParams({})}>
            すべて <span className="tabs__count">{TOOLS.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={current?.id === c.id}
              className={`cat-${c.id} ${current?.id === c.id ? 'is-on' : ''}`}
              onClick={() => setParams({ cat: c.id })}
            >
              <Icon name={CATEGORY_ICON[c.id]} size={14} />
              {c.name} <span className="tabs__count">{toolsIn(c.id).length}</span>
            </button>
          ))}
        </div>
        {current && <p className="muted section__desc">{current.description}</p>}
        <div className="grid">
          {list.map((t) => (
            <ToolCard key={t.id} tool={t} />
          ))}
        </div>
        {list.length === 0 && <p className="empty">このカテゴリのツールは準備中です。</p>}
      </section>
    </div>
  );
}
