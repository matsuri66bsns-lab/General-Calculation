import type { CalcResult, SheetRow } from '../core/types';
import { formatValue } from '../core/format';
import { exprNumeric, exprSymbolic, placeholders } from '../core/formula';
import { Icon } from './Icon';

type ValueRow = Exclude<SheetRow, { kind: 'section' }>;

function findRow(rows: SheetRow[], key: string): ValueRow | undefined {
  const r = rows.find((r) => r.kind !== 'section' && r.key === key);
  return r && r.kind !== 'section' ? r : undefined;
}


/** 判定の表示。色だけに頼らず、アイコンと文字で示す */
export function JudgeBadge({ value }: { value: number | string }) {
  const ok = value === 'OK';
  return (
    <span className={`judge ${ok ? 'is-ok' : 'is-ng'}`}>
      <Icon name={ok ? 'check' : 'x'} size={18} />
      {ok ? '適合' : '不適合'}
      <span className="judge__raw">（{String(value)}）</span>
    </span>
  );
}

/** 主要な結果。数値は計器のように2列で並べ、判定はバッジで示す */
export function Highlights({ result }: { result: CalcResult }) {
  const rows = result.highlights.map((key) => findRow(result.rows, key)).filter((r) => r !== undefined);
  const judges = rows.filter((r) => r.kind === 'calc' && r.format === 'judge');
  const values = rows.filter((r) => !(r.kind === 'calc' && r.format === 'judge'));
  return (
    <div className="highlights">
      {judges.map((row) => (
        <div key={row.key} className="highlights__judge">
          <span className="muted">{row.label}</span>
          <JudgeBadge value={row.value} />
        </div>
      ))}
      <div className="meters">
        {values.map((row) => (
          <div key={row.key} className="meter">
            <div className="meter__label">{row.label}</div>
            <div className="meter__value">
              <span className="num">{formatValue(row.value, row.digits)}</span>
              {row.unit && typeof row.value === 'number' && <span className="meter__unit">{row.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Warnings({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="warnings" role="status">
      <Icon name="warn" size={18} />
      <ul>
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

/** 計算根拠の表。入力値・計算式・代入値・結果を並べる */
export function CalcTable({ result }: { result: CalcResult }) {
  return (
    <div className="table-wrap">
      <table className="calc-table">
        <thead>
          <tr>
            <th scope="col">項目</th>
            <th scope="col">計算式</th>
            <th scope="col" className="ta-r">
              値
            </th>
            <th scope="col">単位</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => {
            if (row.kind === 'section') {
              return (
                <tr key={`s${i}`} className="calc-table__section">
                  <th colSpan={4} scope="colgroup">
                    {row.label}
                  </th>
                </tr>
              );
            }
            return (
              <tr key={row.key} className={row.kind === 'input' ? 'is-input' : ''}>
                <td>
                  <div className="calc-table__label">
                    {row.label}
                    {row.symbol && <span className="sym">{row.symbol}</span>}
                  </div>
                  {row.note && <div className="calc-table__note">{row.note}</div>}
                </td>
                <td className="calc-table__expr">
                  {row.kind === 'calc' ? (
                    <>
                      <div>
                        {row.symbol ? `${row.symbol} = ` : ''}
                        {exprSymbolic(row.expr, result.rows)}
                      </div>
                      {placeholders(row.expr).length > 0 && (
                        <div className="calc-table__subst">= {exprNumeric(row.expr, result.rows)}</div>
                      )}
                    </>
                  ) : (
                    <span className="muted">入力値</span>
                  )}
                </td>
                <td className="ta-r num calc-table__value">
                  {row.kind === 'calc' && row.format === 'judge' ? <JudgeBadge value={row.value} /> : formatValue(row.value, row.digits)}
                </td>
                <td className="calc-table__unit">{typeof row.value === 'number' ? row.unit : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
