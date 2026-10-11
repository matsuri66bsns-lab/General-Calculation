import { isValueRow } from './types';
import type { SheetRow, ValueRow } from './types';
import { formatValue } from './format';

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** テンプレート中の {key} を一覧で返す */
export function placeholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1]);
}

/** Excel 用テンプレートの {key} をセル番地に置き換える */
export function resolveFormula(template: string, cellOf: (key: string) => string): string {
  return template.replace(PLACEHOLDER, (_, key: string) => cellOf(key));
}

function rowMap(rows: SheetRow[]) {
  const map = new Map<string, ValueRow>();
  for (const r of rows) if (isValueRow(r)) map.set(r.key, r);
  return map;
}

/** 表示用の式を記号で表す（例: "{n} × {V}" → "n × V"） */
export function exprSymbolic(expr: string, rows: SheetRow[]): string {
  const map = rowMap(rows);
  return expr.replace(PLACEHOLDER, (_, key: string) => map.get(key)?.symbol ?? key);
}

/** 表示用の式に数値を代入して表す（例: "{n} × {V}" → "6 × 300.00"） */
export function exprNumeric(expr: string, rows: SheetRow[]): string {
  const map = rowMap(rows);
  return expr.replace(PLACEHOLDER, (_, key: string) => {
    const r = map.get(key);
    return r ? formatValue(r.value, r.digits) : key;
  });
}
