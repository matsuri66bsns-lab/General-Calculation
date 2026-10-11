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
  /** Excel のセルに入れる値（計算結果のキャッシュ）。判定は「適合／不適合」に置き換える */
  cellValue: number | string;
}

/** 判定の表記。画面と同じく、計算書でも「適合／不適合」で表す */
export const JUDGE_TEXT = { OK: '適合', NG: '不適合' } as const;

/** 判定の式の "OK" / "NG" を、計算書の表記に置き換える */
function judgeFormula(formula: string): string {
  return formula.replace(/"OK"/g, `"${JUDGE_TEXT.OK}"`).replace(/"NG"/g, `"${JUDGE_TEXT.NG}"`);
}

function judgeValue(v: number | string): number | string {
  return v === 'OK' ? JUDGE_TEXT.OK : v === 'NG' ? JUDGE_TEXT.NG : v;
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
  return placed.map((p) => {
    if (p.row.kind === 'section') return { ...p, cellValue: '' };
    if (p.row.kind === 'input') return { ...p, cellValue: p.row.value };
    const isJudge = p.row.format === 'judge';
    const formula = resolveFormula(p.row.formula, cellOf);
    return {
      ...p,
      formula: isJudge ? judgeFormula(formula) : formula,
      cellValue: isJudge ? judgeValue(p.row.value) : p.row.value,
    };
  });
}
