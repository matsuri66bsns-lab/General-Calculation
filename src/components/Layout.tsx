import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../core/theme';
import { StatusProvider, useStatusItems } from '../core/status';
import { Icon } from './Icon';
import { SearchDialog } from './SearchDialog';
import { SITE_NAME, Sidebar } from './Sidebar';
import { TabStrip } from './TabStrip';

export { SITE_NAME };

function StatusBar() {
  const items = useStatusItems();
  return (
    <footer className="statusbar" aria-label="状態">
      {items.map((it) => (
        <span key={it.text} className={it.tone ? `is-${it.tone}` : ''}>
          {it.tone === 'ok' && <span aria-hidden="true">● </span>}
          {it.text}
        </span>
      ))}
      <span className="statusbar__right">計算結果は設計検討の目安です</span>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <StatusProvider>
      <Shell>{children}</Shell>
    </StatusProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className={`shell ${drawerOpen ? 'drawer-open' : ''}`}>
      <a href="#main" className="skip">
        本文へ移動
      </a>
      <aside className="shell__side" id="sidebar" aria-label="サイドバー">
        <Sidebar
          theme={theme}
          onToggleTheme={toggleTheme}
          onSearch={() => {
            setDrawerOpen(false);
            setSearchOpen(true);
          }}
          onNavigate={() => setDrawerOpen(false)}
          isMac={isMac}
        />
      </aside>
      {drawerOpen && <div className="shell__scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <div className="shell__main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn"
            aria-label="メニューを開く"
            aria-expanded={drawerOpen}
            aria-controls="sidebar"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <Link to="/" className="topbar__brand">
            {SITE_NAME}
          </Link>
          <button type="button" className="icon-btn" aria-label="ツールを検索" onClick={() => setSearchOpen(true)}>
            <Icon name="search" />
          </button>
        </header>
        <TabStrip />
        <main id="main" className="content" tabIndex={-1}>
          {children}
        </main>
        <StatusBar />
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
