import type { SheetRow } from './types';
import { resolveFormula } from './formula';

/** 計算書シートの列構成。値は C 列に置く */
export const COLUMNS = [
  { header: '項目', width: 30 },
  { header: '記号', width: 8 },
  { header: '値', width: 16 },
  { header: '単位', width: 12 },
  { header: '計算式', width: 40 },
  { header: '備考', width: 44 },
] as const;

export const VALUE_COL = 'C';
/** 見出しの行番号。データ行はこの次の行から並ぶ */
export const HEADER_ROW = 5;

export interface LaidOutRow {
  row: SheetRow;
  /** Excel 上の行番号（1始まり） */
  excelRow: number;
  /** calc 行のみ。セル番地に置き換え済みの Excel 式（先頭の = は付けない） */
  formula?: string;
}

/**
 * 行データを Excel のシート上の行番号に割り付け、式中の {key} をセル番地に置き換える。
 * Excel 出力とテスト（式の検算）の両方から使う。
 */
export function layoutRows(rows: SheetRow[]): LaidOutRow[] {
  const cellByKey = new Map<string, string>();
  let r = HEADER_ROW + 1;
  const placed = rows.map((row) => {
    const excelRow = r++;
    if (row.kind !== 'section') cellByKey.set(row.key, `${VALUE_COL}${excelRow}`);
    return { row, excelRow };
  });
  const cellOf = (key: string) => {
    const c = cellByKey.get(key);
    if (!c) throw new Error(`式が未定義のキーを参照しています: ${key}`);
    return c;
  };
  return placed.map((p) =>
    p.row.kind === 'calc' ? { ...p, formula: resolveFormula(p.row.formula, cellOf) } : p,
  );
}
