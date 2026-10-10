import type { CalcResult, SheetRow } from '../core/types';
import { formatValue } from '../core/format';
import { exprNumeric, exprSymbolic, placeholders } from '../core/formula';

type ValueRow = Exclude<SheetRow, { kind: 'section' }>;

function findRow(rows: SheetRow[], key: string): ValueRow | undefined {
  const r = rows.find((r) => r.kind !== 'section' && r.key === key);
  return r && r.kind !== 'section' ? r : undefined;
}

function tone(row: ValueRow): string {
  if (row.kind === 'calc' && row.format === 'judge') return row.value === 'OK' ? 'is-ok' : 'is-ng';
  return '';
}

/** 結果カード（主要な値を大きく表示） */
export function Highlights({ result }: { result: CalcResult }) {
  return (
    <div className="highlights">
      {result.highlights.map((key) => {
        const row = findRow(result.rows, key);
        if (!row) return null;
        return (
          <div key={key} className={`highlight ${tone(row)}`}>
            <div className="highlight__label">{row.label}</div>
            <div className="highlight__value">
              <span className="num">{formatValue(row.value, row.digits)}</span>
              {row.unit && typeof row.value === 'number' && <span className="highlight__unit">{row.unit}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Warnings({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <ul className="warnings" role="status">
      {messages.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
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
                <td className={`ta-r num calc-table__value ${tone(row)}`}>{formatValue(row.value, row.digits)}</td>
                <td className="calc-table__unit">{typeof row.value === 'number' ? row.unit : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
