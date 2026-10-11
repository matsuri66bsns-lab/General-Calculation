import type { Field, RawValues, TableField, TableRowValues, Values } from './types';

export interface ParseResult {
  values: Values;
  errors: Record<string, string>;
}

export function isVisible(field: Field, raw: RawValues): boolean {
  return field.visible ? field.visible(raw) : true;
}

/** フォームの生の値を検証し、数値に変換する。非表示のフィールドは検証しない */
export function parseValues(fields: Field[], raw: RawValues): ParseResult {
  const values: Values = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === 'table') {
      const { rows, errors: e } = parseTable(f, raw[f.key], isVisible(f, raw));
      values[f.key] = JSON.stringify(rows);
      Object.assign(errors, e);
      continue;
    }
    const s = (raw[f.key] ?? '').trim();
    if (f.type === 'select') {
      values[f.key] = s || f.options[0].value;
      continue;
    }
    const visible = isVisible(f, raw);
    const x = Number(s.replace(/,/g, ''));
    if (s === '' || !Number.isFinite(x)) {
      if (visible) errors[f.key] = '数値を入力してください';
      continue;
    }
    if (visible && f.min !== undefined && (f.exclusiveMin ? x <= f.min : x < f.min)) {
      errors[f.key] = f.exclusiveMin ? `${f.min} より大きい値を入力してください` : `${f.min} 以上で入力してください`;
    } else if (visible && f.max !== undefined && x > f.max) {
      errors[f.key] = `${f.max} 以下で入力してください`;
    }
    values[f.key] = x;
  }
  return { values, errors };
}

/** 明細表の生の値（JSON 文字列）を行の配列に戻す。壊れていれば空 */
export function rawTableRows(raw: string | undefined): Record<string, string>[] {
  try {
    const rows = JSON.parse(raw ?? '[]');
    return Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : [];
  } catch {
    return [];
  }
}

/** 明細表のセルのエラーのキー（例: "fx.2.n"） */
export function tableErrorKey(field: string, row: number, col: string): string {
  return `${field}.${row}.${col}`;
}

function parseTable(f: TableField, raw: string | undefined, visible: boolean) {
  const rows: TableRowValues[] = [];
  const errors: Record<string, string> = {};
  rawTableRows(raw).forEach((r, i) => {
    const out: TableRowValues = {};
    for (const c of f.columns) {
      const s = String(r[c.key] ?? '').trim();
      if (c.type === 'text') {
        out[c.key] = s;
        continue;
      }
      const x = Number(s.replace(/,/g, ''));
      const key = tableErrorKey(f.key, i, c.key);
      if (s === '' || !Number.isFinite(x)) {
        if (visible) errors[key] = '数値を入力してください';
        out[c.key] = 0;
        continue;
      }
      if (visible && c.min !== undefined && (c.exclusiveMin ? x <= c.min : x < c.min)) {
        errors[key] = c.exclusiveMin ? `${c.min} より大きい値` : `${c.min} 以上`;
      }
      out[c.key] = x;
    }
    rows.push(out);
  });
  if (visible && f.minRows && rows.length < f.minRows) errors[f.key] = `${f.minRows} 行以上入力してください`;
  return { rows, errors };
}

/** 検証済みの明細表の行を取り出す（build から使う） */
export function tableRows(v: Values, key: string): TableRowValues[] {
  try {
    const rows = JSON.parse(String(v[key] ?? '[]'));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function num(v: Values, key: string): number {
  const x = v[key];
  if (typeof x !== 'number') throw new Error(`数値ではありません: ${key}`);
  return x;
}

export function str(v: Values, key: string): string {
  return String(v[key]);
}
