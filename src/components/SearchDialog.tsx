import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchTools } from '../tools/registry';
import { Icon } from './Icon';
import { CategoryTag } from './CategoryTag';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const results = useMemo(() => searchTools(q), [q]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const go = (slug: string) => {
    onClose();
    navigate(`/tools/${slug}`);
  };

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="ツールを検索"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === 'Enter' && results[active]) go(results[active].slug);
        }}
      >
        <div className="dialog__search">
          <Icon name="search" />
          <input
            // 開いた直後のキー入力を取りこぼさないよう、描画と同時にフォーカスする
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ツール名・キーワード・IDで検索（例：電圧降下、受水槽、HV-01）"
            aria-label="検索語"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="dialog__results" role="listbox">
          {results.length === 0 && <li className="dialog__empty">該当するツールがありません</li>}
          {results.map((t, i) => (
            <li
              key={t.id}
              role="option"
              aria-selected={i === active}
              className={`dialog__item ${i === active ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(t.slug)}
            >
              <span className="dialog__id mono">{t.id}</span>
              <span className="dialog__title">{t.title}</span>
              <CategoryTag id={t.category} size="sm" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
