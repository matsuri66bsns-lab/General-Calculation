import { NavLink, useLocation } from 'react-router-dom';
import { CATEGORIES } from '../tools/categories';
import { toolsIn } from '../tools/registry';
import { useStored } from '../core/storage';
import type { Theme } from '../core/theme';
import { Icon } from './Icon';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onSearch: () => void;
  onNavigate: () => void;
  isMac: boolean;
}

export const SITE_NAME = '設備計算ラボ';

/** 左のサイドバー。分類ごとにツールを並べ、どの画面からでも別のツールへ移れる */
export function Sidebar({ theme, onToggleTheme, onSearch, onNavigate, isMac }: Props) {
  const [collapsed, setCollapsed] = useStored<string[]>('sidebar:collapsed', []);
  const { pathname } = useLocation();
  const toggle = (id: string) => setCollapsed(collapsed.includes(id) ? collapsed.filter((c) => c !== id) : [...collapsed, id]);

  return (
    <div className="side">
      <div className="side__brand">
        <span className="side__mark" aria-hidden="true">
          <i className="m-plumbing" />
          <i className="m-hvac" />
          <i className="m-electrical" />
        </span>
        <span>{SITE_NAME}</span>
      </div>

      <button type="button" className="side__search" onClick={onSearch}>
        <Icon name="search" size={16} />
        <span>検索</span>
        <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>

      <nav className="side__nav" aria-label="メイン">
        <NavLink to="/" end onClick={onNavigate}>
          <Icon name="list" size={16} />
          すべてのツール
        </NavLink>
        <NavLink to="/history" onClick={onNavigate}>
          <Icon name="clock" size={16} />
          履歴・お気に入り
        </NavLink>
      </nav>

      <div className="side__tree" aria-label="分類">
        <div className="side__heading">分類</div>
        {CATEGORIES.map((c) => {
          const open = !collapsed.includes(c.id);
          const tools = toolsIn(c.id);
          return (
            <div key={c.id} className="side__group">
              <button
                type="button"
                className="side__cat"
                aria-expanded={open}
                aria-controls={`side-${c.id}`}
                onClick={() => toggle(c.id)}
              >
                <Icon name="chevron" size={14} className={`side__chev ${open ? 'is-open' : ''}`} />
                <span className={`side__dot m-${c.id}`} aria-hidden="true" />
                <span className="side__catname">{c.name}</span>
                <span className="side__count">{tools.length}</span>
              </button>
              {open && (
                <ul id={`side-${c.id}`} className="side__tools">
                  {tools.map((t) => (
                    <li key={t.id}>
                      <NavLink
                        to={`/tools/${t.slug}`}
                        onClick={onNavigate}
                        className={pathname === `/tools/${t.slug}` ? 'active' : ''}
                      >
                        <span className="mono">{t.id}</span>
                        <span className="side__toolname">{t.title}</span>
                      </NavLink>
                    </li>
                  ))}
                  {tools.length === 0 && <li className="side__empty">準備中</li>}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="side__foot">
        <NavLink to="/about" onClick={onNavigate}>
          <Icon name="info" size={16} />
          このサイトについて
        </NavLink>
        <button type="button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'ライトモードにする' : 'ダークモードにする'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          {theme === 'dark' ? 'ライトモード' : 'ダークモード'}
        </button>
      </div>
    </div>
  );
}
