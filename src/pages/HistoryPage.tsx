import { useMemo } from 'react';
import { findToolById } from '../tools/registry';
import { useFavorites, useHistory } from '../core/storage';
import { useStatusBar } from '../core/status';
import { ToolTable } from '../components/ToolTable';

export function HistoryPage() {
  const { favorites } = useFavorites();
  const [history, setHistory] = useHistory();
  const favTools = favorites.map((id) => findToolById(id)).filter((t) => t !== undefined);
  const recent = history.map((h) => findToolById(h.id)).filter((t) => t !== undefined);
  const usedAt = useMemo(() => Object.fromEntries(history.map((h) => [h.id, h.at])), [history]);
  useStatusBar([{ text: `お気に入り ${favTools.length} 件` }, { text: `履歴 ${recent.length} 件` }, { text: 'このブラウザ内に保存' }]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>履歴・お気に入り</h1>
        <p className="muted">履歴とお気に入りは、このブラウザの中だけに保存されます。会員登録は不要です。</p>
      </header>

      <section className="section">
        <div className="toolbar">
          <h2>お気に入り</h2>
        </div>
        {favTools.length === 0 ? (
          <p className="empty">一覧の ☆ を押すと、ここに表示されます。</p>
        ) : (
          <div className="panel panel--flush">
            <ToolTable tools={favTools} usedAt={usedAt} />
          </div>
        )}
      </section>

      <section className="section">
        <div className="toolbar">
          <h2>閲覧履歴</h2>
          {recent.length > 0 && (
            <button type="button" className="btn btn--text" onClick={() => setHistory([])}>
              履歴を消去する
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="empty">まだ閲覧したツールはありません。</p>
        ) : (
          <div className="panel panel--flush">
            <ToolTable tools={recent} usedAt={usedAt} />
          </div>
        )}
      </section>
    </div>
  );
}
