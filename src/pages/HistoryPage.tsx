import { Link } from 'react-router-dom';
import { findToolById } from '../tools/registry';
import { useFavorites, useHistory } from '../core/storage';
import { ToolCard } from '../components/ToolCard';
import { CATEGORY_ICON, Icon } from '../components/Icon';

function timeAgo(at: number): string {
  const min = Math.floor((Date.now() - at) / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  return new Date(at).toLocaleDateString('ja-JP');
}

export function HistoryPage() {
  const { favorites } = useFavorites();
  const [history, setHistory] = useHistory();
  const favTools = favorites.map((id) => findToolById(id)).filter((t) => t !== undefined);
  const entries = history.flatMap((h) => {
    const t = findToolById(h.id);
    return t ? [{ tool: t, at: h.at }] : [];
  });

  return (
    <div className="container">
      <h1 className="page-title">履歴・お気に入り</h1>
      <p className="muted">履歴とお気に入りは、このブラウザの中だけに保存されます。会員登録は不要です。</p>

      <section className="section">
        <div className="section__head">
          <h2>
            <Icon name="star" /> お気に入り
          </h2>
        </div>
        {favTools.length === 0 ? (
          <p className="empty">ツールのカードや計算画面の ☆ を押すと、ここに表示されます。</p>
        ) : (
          <div className="grid">
            {favTools.map((t) => (
              <ToolCard key={t.id} tool={t} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2>
            <Icon name="clock" /> 閲覧履歴
          </h2>
          {entries.length > 0 && (
            <button type="button" className="btn btn--text" onClick={() => setHistory([])}>
              履歴を消去
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="empty">まだ閲覧したツールはありません。</p>
        ) : (
          <ul className="card list">
            {entries.map(({ tool, at }) => (
              <li key={tool.id}>
                <Link to={`/tools/${tool.slug}`} className={`list__item cat-${tool.category}`}>
                  <span className="tool-card__icon">
                    <Icon name={CATEGORY_ICON[tool.category]} size={16} />
                  </span>
                  <span className="recent__id">{tool.id}</span>
                  <span className="list__title">{tool.title}</span>
                  <span className="muted small">{timeAgo(at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
