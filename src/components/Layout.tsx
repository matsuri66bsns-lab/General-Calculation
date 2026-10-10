import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../core/theme';
import { Icon } from './Icon';
import { SearchDialog } from './SearchDialog';

export const SITE_NAME = '設備計算ラボ';

export function Layout({ children }: { children: ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => window.scrollTo(0, 0), [pathname]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <header className="globalnav">
        <div className="globalnav__inner">
          <Link to="/" className="brand">
            <img src="./favicon.svg" alt="" width={24} height={24} />
            <span>{SITE_NAME}</span>
          </Link>
          <nav className="globalnav__links" aria-label="メイン">
            <NavLink to="/" end>
              計算一覧
            </NavLink>
            <NavLink to="/history">履歴・お気に入り</NavLink>
            <NavLink to="/about">このサイトについて</NavLink>
          </nav>
          <div className="globalnav__actions">
            <button type="button" className="search-btn" onClick={() => setSearchOpen(true)} aria-label="ツールを検索">
              <Icon name="search" size={16} />
              <span className="search-btn__text">検索</span>
              <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'ライトモードにする' : 'ダークモードにする'}
              title={theme === 'dark' ? 'ライトモードにする' : 'ダークモードにする'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </div>
        </div>
        <nav className="subnav" aria-label="メイン（モバイル）">
          <NavLink to="/" end>
            計算一覧
          </NavLink>
          <NavLink to="/history">履歴・お気に入り</NavLink>
          <NavLink to="/about">このサイトについて</NavLink>
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <div className="footer__inner">
          <p>
            本サイトの計算結果は設計検討の目安です。最終的な判断は最新の法令・規格・メーカー資料に基づき、設計者の責任で行ってください。
          </p>
          <p className="muted">
            © {new Date().getFullYear()} {SITE_NAME}　・　<Link to="/about">免責事項</Link>
          </p>
        </div>
      </footer>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
