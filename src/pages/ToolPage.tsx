import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findTool } from '../tools/registry';
import { categoryOf } from '../tools/categories';
import { parseValues } from '../core/values';
import { recordVisit, useFavorites, useStored } from '../core/storage';
import { openTabStored } from '../core/tabs';
import { useStatusBar } from '../core/status';
import { CalcError } from '../core/errors';
import type { CalcResult, RawValues, ToolDef } from '../core/types';
import { FieldList } from '../components/Fields';
import { CalcTable, Highlights, Warnings } from '../components/ResultView';
import { CategoryTag } from '../components/CategoryTag';
import { Icon } from '../components/Icon';
import { SITE_NAME } from '../components/Sidebar';
import { NotFound } from './NotFound';

export function ToolPage() {
  const { slug = '' } = useParams();
  const tool = findTool(slug);
  if (!tool) return <NotFound />;
  // key を付けてツールごとに状態を作り直す
  return <ToolView key={tool.id} tool={tool} />;
}

function ToolView({ tool }: { tool: ToolDef }) {
  const cat = categoryOf(tool.category);
  const [saved, setSaved] = useStored<RawValues>(`inputs:${tool.id}`, tool.defaults);
  // 保存済みの値に、後から追加されたフィールドの既定値を補う
  const raw = useMemo(() => ({ ...tool.defaults, ...saved }), [tool.defaults, saved]);
  const { isFavorite, toggle } = useFavorites();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    recordVisit(tool.id);
    openTabStored(tool.id);
    document.title = `${tool.id} ${tool.title}｜${SITE_NAME}`;
    return () => {
      document.title = SITE_NAME;
    };
  }, [tool]);

  const { errors, result, calcError } = useMemo(() => {
    const parsed = parseValues(tool.fields, raw);
    if (Object.keys(parsed.errors).length > 0) return { errors: parsed.errors, result: null, calcError: null };
    try {
      return { errors: parsed.errors, result: tool.build(parsed.values) as CalcResult, calcError: null };
    } catch (e) {
      if (e instanceof CalcError) return { errors: parsed.errors, result: null, calcError: e.message };
      throw e;
    }
  }, [tool, raw]);

  useStatusBar(
    result
      ? [{ text: '自動計算', tone: 'ok' }, { text: `根拠：${tool.references[0]}` }, { text: '入力は保存済み' }]
      : [{ text: '入力を確認してください', tone: 'ng' }, { text: `根拠：${tool.references[0]}` }],
  );

  const onExport = async () => {
    if (!result) return;
    setExporting(true);
    setExportError(null);
    try {
      const { exportExcel } = await import('../core/excel');
      await exportExcel(tool, result);
    } catch (e) {
      console.error(e);
      setExportError('Excel ファイルを作成できませんでした。時間をおいて、もう一度お試しください。');
    } finally {
      setExporting(false);
    }
  };

  const fav = isFavorite(tool.id);
  const printedAt = new Date().toLocaleString('ja-JP');

  return (
    <>
      <section className="band">
        <div className="band__inner tool-band">
          <div className="tool-band__text">
            <nav className="crumb no-print" aria-label="パンくず">
              <Link to="/">すべてのツール</Link>
              <Icon name="chevron" size={12} />
              <Link to={`/?cat=${cat.id}`}>{cat.name}</Link>
            </nav>
            <div className="tool-band__meta">
              <CategoryTag id={tool.category} />
              <span className="mono">{tool.id}</span>
            </div>
            <h1>{tool.title}</h1>
            <p className="tool-band__summary">{tool.summary}</p>
            <p className="print-only">作成日時：{printedAt}</p>
          </div>
          <div className="tool-band__actions no-print">
            <button type="button" className="btn btn--inverse" onClick={onExport} disabled={!result || exporting}>
              <Icon name="download" size={16} /> {exporting ? '作成中…' : 'Excel 出力'}
            </button>
            <button type="button" className="btn btn--outline-inverse" onClick={() => window.print()} disabled={!result}>
              <Icon name="print" size={16} /> 印刷
            </button>
            <button
              type="button"
              className={`btn btn--outline-inverse btn--icon ${fav ? 'is-fav' : ''}`}
              aria-pressed={fav}
              aria-label={fav ? 'お気に入りから外す' : 'お気に入りに追加'}
              title={fav ? 'お気に入りから外す' : 'お気に入りに追加'}
              onClick={() => toggle(tool.id)}
            >
              <Icon name="star" size={16} />
            </button>
          </div>
        </div>
      </section>

      <div className="page">
        <div className="tool-cols">
          <section className="panel no-print" aria-labelledby="inputs-h">
            <div className="panel__head">
              <h2 id="inputs-h">入力</h2>
              <button type="button" className="btn btn--text" onClick={() => setSaved(tool.defaults)}>
                <Icon name="reset" size={16} /> 初期値に戻す
              </button>
            </div>
            <FieldList fields={tool.fields} values={raw} errors={errors} onChange={(patch) => setSaved({ ...raw, ...patch })} />
          </section>

          <section className="panel tool-results" aria-labelledby="results-h" aria-live="polite">
            <div className="panel__head">
              <h2 id="results-h">計算結果</h2>
            </div>
            {exportError && <p className="alert">{exportError}</p>}
            {result ? (
              <>
                <Highlights result={result} />
                <Warnings messages={result.warnings} />
              </>
            ) : (
              <p className="alert">
                <Icon name="x" size={18} />
                {calcError ?? '入力値を確認してください。赤い枠の欄に、正しい数値を入力すると計算します。'}
              </p>
            )}
          </section>
        </div>

        {result && (
          <section className="panel section" aria-labelledby="basis-h">
            <div className="panel__head">
              <h2 id="basis-h">計算根拠</h2>
              <span className="muted small no-print">Excel 出力では、この表の計算式が関数として入ります</span>
            </div>
            <CalcTable result={result} />
          </section>
        )}

        <section className="panel section notes" aria-labelledby="notes-h">
          <h2 id="notes-h">解説・注意事項</h2>
          {tool.notes && (
            <ul>
              {tool.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <h3>参考規格・文献</h3>
          <ul>
            {tool.references.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="muted small">
            計算結果は設計検討の目安です。最終的な判断は最新の法令・規格・メーカー資料に基づき、設計者の責任で行ってください。
          </p>
        </section>
      </div>
    </>
  );
}
