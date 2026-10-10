import { Link } from 'react-router-dom';
import type { ToolDef } from '../core/types';
import { useFavorites } from '../core/storage';
import { CategoryTag } from './CategoryTag';
import { Icon } from './Icon';

const NEW_DAYS = 30;

export function isNew(tool: ToolDef): boolean {
  return Date.now() - new Date(tool.publishedAt).getTime() < NEW_DAYS * 86400_000;
}

function formatUsed(at?: number): string {
  if (!at) return '—';
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** ツールの一覧表。行全体がリンクになり、☆でお気に入りを切り替えられる */
export function ToolTable({ tools, usedAt }: { tools: ToolDef[]; usedAt?: Record<string, number> }) {
  const { isFavorite, toggle } = useFavorites();
  return (
    <div className="table-scroll">
      <table className="tool-table">
        <thead>
          <tr>
            <th scope="col" className="col-fav">
              <span className="sr-only">お気に入り</span>
            </th>
            <th scope="col">ID</th>
            <th scope="col">ツール名</th>
            <th scope="col" className="col-cat">
              分類
            </th>
            <th scope="col" className="col-desc">
              概要
            </th>
            {usedAt && (
              <th scope="col" className="col-used">
                最終利用
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {tools.map((t) => {
            const fav = isFavorite(t.id);
            return (
              <tr key={t.id}>
                <td className="col-fav">
                  <button
                    type="button"
                    className={`star ${fav ? 'is-on' : ''}`}
                    aria-pressed={fav}
                    aria-label={fav ? `${t.title}をお気に入りから外す` : `${t.title}をお気に入りに追加`}
                    onClick={() => toggle(t.id)}
                  >
                    <Icon name="star" size={16} />
                  </button>
                </td>
                <td className="mono id-cell">{t.id}</td>
                <td className="name-cell">
                  <Link to={`/tools/${t.slug}`} className="row-link">
                    {t.title}
                  </Link>
                  {isNew(t) && <span className="badge">New</span>}
                  <div className="name-cell__sub">
                    <CategoryTag id={t.category} size="sm" />
                  </div>
                </td>
                <td className="col-cat">
                  <CategoryTag id={t.category} size="sm" />
                </td>
                <td className="col-desc">{t.summary}</td>
                {usedAt && <td className="col-used mono">{formatUsed(usedAt[t.id])}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
