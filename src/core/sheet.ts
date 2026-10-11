import { isValueRow } from './types';
import type { CalcResult, CalcRow, InputRow, SheetRow, SheetTableColumn } from './types';

type InputOpts = Omit<InputRow, 'kind' | 'key' | 'label' | 'value'>;
type CalcOpts = Omit<CalcRow, 'kind' | 'key' | 'label'>;

/**
 * 計算書の行を組み立てるヘルパー。
 * 各ツールの build はこれで行を積み上げ、最後に result() を返す。
 */
export class SheetBuilder {
  private rows: SheetRow[] = [];
  private highlightKeys: string[] = [];
  private warningList: string[] = [];

  section(label: string): this {
    this.rows.push({ kind: 'section', label });
    return this;
  }

  input(key: string, label: string, value: number | string, opts: InputOpts = {}): this {
    this.assertNewKey(key);
    this.rows.push({ kind: 'input', key, label, value, ...opts });
    return this;
  }

  calc(key: string, label: string, opts: CalcOpts): this {
    this.assertNewKey(key);
    this.rows.push({ kind: 'calc', key, label, ...opts });
    return this;
  }

  /** 合否判定の行。value は "OK" / "NG" */
  judge(key: string, label: string, ok: boolean, opts: { expr: string; formula: string; note?: string }): this {
    return this.calc(key, label, {
      value: ok ? 'OK' : 'NG',
      format: 'judge',
      ...opts,
    });
  }

  /**
   * 明細表。columns の順に rows の値を並べる。計算列は expr・formula を持ち、同じ行の列を {@列} で参照する。
   * 表の列全体は、後ろの calc 行の formula から {表のkey:列のkey} で参照できる（例: "SUM({fx:fu})"）
   */
  table(key: string, label: string, columns: SheetTableColumn[], rows: (number | string)[][], opts: { note?: string } = {}): this {
    this.assertNewKey(key);
    this.rows.push({ kind: 'table', key, label, columns, rows, ...opts });
    return this;
  }

  highlight(...keys: string[]): this {
    this.highlightKeys.push(...keys);
    return this;
  }

  warn(message: string): this {
    this.warningList.push(message);
    return this;
  }

  /** 計算済みの値を key で取り出す */
  get(key: string): number | string {
    const row = this.rows.find((r) => isValueRow(r) && r.key === key);
    if (!row || !isValueRow(row)) throw new Error(`未定義のキー: ${key}`);
    return row.value;
  }

  result(): CalcResult {
    return { rows: this.rows, highlights: this.highlightKeys, warnings: this.warningList };
  }

  private assertNewKey(key: string) {
    if (this.rows.some((r) => r.kind !== 'section' && r.key === key)) {
      throw new Error(`キーが重複しています: ${key}`);
    }
  }
}

/**
 * 昇順の規格値リストから「x 以上で最小の値」を選ぶ。超える場合は null。
 */
export function stepUp(x: number, sizes: readonly number[]): number | null {
  for (const s of sizes) if (x <= s) return s;
  return null;
}

/**
 * stepUp と同じ処理を Excel 式で表す（入れ子の IF）。
 * 配列定数や INDEX/MATCH を避け、どの Excel でも同じ結果になるようにしている。
 */
export function stepUpFormula(xExpr: string, sizes: readonly number[], overflow = '"範囲外"'): string {
  return sizes.reduceRight<string>((acc, s) => `IF(${xExpr}<=${s},${s},${acc})`, overflow);
}
