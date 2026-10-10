import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { findToolById } from '../tools/registry';
import { useTabs } from '../core/tabs';
import { Icon } from './Icon';

/** 開いているツールのタブ。入力値はツールごとに保存されるので、切り替えても値は残る */
export function TabStrip() {
  const { tabs, close } = useTabs();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeId = tabs.find((id) => pathname === `/tools/${findToolById(id)?.slug}`) ?? null;

  const onClose = (id: string) => {
    const next = close(id, activeId);
    if (activeId === id) {
      const t = next ? findToolById(next) : undefined;
      navigate(t ? `/tools/${t.slug}` : '/');
    }
  };

  return (
    <div className="tabstrip" role="navigation" aria-label="開いているツール">
      <NavLink to="/" end className="tab tab--home">
        <Icon name="list" size={14} />
        ツール一覧
      </NavLink>
      {tabs.map((id) => {
        const t = findToolById(id);
        if (!t) return null;
        return (
          <div key={id} className={`tab ${activeId === id ? 'is-active' : ''}`}>
            <NavLink to={`/tools/${t.slug}`} className="tab__link" aria-current={activeId === id ? 'page' : undefined}>
              <span className="mono tab__id">{t.id}</span>
              {t.title}
            </NavLink>
            <button type="button" className="tab__close" aria-label={`${t.title}のタブを閉じる`} onClick={() => onClose(id)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
