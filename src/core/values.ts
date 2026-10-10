import type { Field, RawValues, Values } from './types';

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

export function num(v: Values, key: string): number {
  const x = v[key];
  if (typeof x !== 'number') throw new Error(`数値ではありません: ${key}`);
  return x;
}

export function str(v: Values, key: string): string {
  return String(v[key]);
}
