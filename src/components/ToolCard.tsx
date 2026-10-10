import { Link } from 'react-router-dom';
import type { ToolDef } from '../core/types';
import { categoryOf } from '../tools/categories';
import { useFavorites } from '../core/storage';
import { CATEGORY_ICON, Icon } from './Icon';

const NEW_DAYS = 30;

export function isNew(tool: ToolDef): boolean {
  return Date.now() - new Date(tool.publishedAt).getTime() < NEW_DAYS * 86400_000;
}

export function ToolCard({ tool }: { tool: ToolDef }) {
  const cat = categoryOf(tool.category);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(tool.id);
  return (
    <div className={`tool-card cat-${tool.category}`}>
      <Link to={`/tools/${tool.slug}`} className="tool-card__link">
        <div className="tool-card__head">
          <span className="tool-card__icon">
            <Icon name={CATEGORY_ICON[tool.category]} size={20} />
          </span>
          <span className="tool-card__id">{tool.id}</span>
          {isNew(tool) && <span className="badge badge--new">New</span>}
        </div>
        <h3 className="tool-card__title">{tool.title}</h3>
        <p className="tool-card__summary">{tool.summary}</p>
        <span className="tool-card__cat">{cat.name}</span>
      </Link>
      <button
        type="button"
        className={`icon-btn tool-card__fav ${fav ? 'is-on' : ''}`}
        aria-pressed={fav}
        aria-label={fav ? 'お気に入りから外す' : 'お気に入りに追加'}
        title={fav ? 'お気に入りから外す' : 'お気に入りに追加'}
        onClick={() => toggle(tool.id)}
      >
        <Icon name="star" />
      </button>
    </div>
  );
}
