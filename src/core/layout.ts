import type { SheetRow, SheetTableRow, ValueRow } from './types';
import { exprSymbolic, placeholders, resolveFormula } from './formula';
import { autoDigits, excelNumFmt, formatValue } from './format';

/**
 * 計算書シートの列構成（A4 縦に収まる幅）。
 * 公的な計算書にならい、左から「項目 → 記号 → 計算式と代入 → 値 → 単位 → 根拠・備考」と読めるように並べる。
 * 明細表の列を多く取れるよう、計算式と根拠・備考は2列ずつの結合にしている（Excel の列は A〜I の9列）。
 */
export const SHEET_WIDTHS = [4.5, 19, 6.5, 13.25, 13.25, 11, 9.5, 8, 8] as const;

export const COLUMNS = [
  { header: 'No.', from: 1, to: 1 },
  { header: '項目', from: 2, to: 2 },
  { header: '記号', from: 3, to: 3 },
  { header: '計算式・代入', from: 4, to: 5 },
  { header: '値', from: 6, to: 6 },
  { header: '単位', from: 7, to: 7 },
  { header: '根拠・備考', from: 8, to: 9 },
] as const;

/** 列の幅の合計（列見出しの番号で指定。結合した列は合計する） */
export function columnWidth(i: number): number {
  const c = COLUMNS[i];
  let w = 0;
  for (let k = c.from; k <= c.to; k++) w += SHEET_WIDTHS[k - 1];
  return w;
}

/** 値を置く列 */
export const VALUE_COL = 'F';
/** 計算式と代入を置く列（E 列と結合） */
export const EXPR_COL = 'D';
/** 列見出しの行番号（1〜4行目は表題欄）。データ行はこの次の行から並ぶ */
export const HEADER_ROW = 5;

export interface LaidOutRow {
  row: SheetRow;
  /** Excel 上の行番号（1始まり） */
  excelRow: number;
  /**
   * 値を置くセルの番地。ふつうは値の列。
   * 文字の入力値（用途や方式の名前）は長いので、計算式の列から値の列までを結合して置く（番地は計算式の列）
   */
  cell: string;
  /** calc 行のみ。セル番地に置き換え済みの Excel 式（先頭の = は付けない） */
  formula?: string;
  /** Excel のセルに入れる値（計算結果のキャッシュ）。判定は「適合／不適合」に置き換える */
  cellValue: number | string;
  /**
   * calc 行のみ。計算式の列に入れる内容。
   * 1行目は記号の式、2行目は数値を代入した式。2行目は値のセルを参照する Excel の式で作り、
   * Excel 上で入力値を変えると代入式の数値も変わる。
   */
  substitution?: { formula?: string; text: string };
  /** table 行のみ。見出しの行・データの行の範囲と、列の位置・計算列の Excel 式 */
  table?: TableLayout;
}

export interface TableLayout {
  /** 表の名前の行は LaidOutRow.excelRow。列見出しの行はその次 */
  headerRow: number;
  /** データの最初と最後の行（データがなければ first > last） */
  firstRow: number;
  lastRow: number;
  /** 列ごとの列記号（B〜G） */
  colLetters: string[];
  /** 行ごと・列ごとの Excel 式（計算列のみ。先頭の = は付けない） */
  formulas: (string | undefined)[][];
  /** 行ごと・列ごとのセルの値（判定の列は「適合／不適合」に置き換える） */
  values: (number | string)[][];
}

/** 明細表に使える列（B〜I の8列） */
export const TABLE_COLS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;
const RANGE = /\{([A-Za-z_][A-Za-z0-9_]*):([A-Za-z_][A-Za-z0-9_]*)\}/g;
const SAME_ROW = /\{@([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** 判定の表記。画面と同じく、計算書でも「適合／不適合」で表す */
export const JUDGE_TEXT = { OK: '適合', NG: '不適合' } as const;

/** 判定の式の "OK" / "NG" を、計算書の表記に置き換える */
function judgeFormula(formula: string): string {
  return formula.replace(/"OK"/g, `"${JUDGE_TEXT.OK}"`).replace(/"NG"/g, `"${JUDGE_TEXT.NG}"`);
}

function judgeValue(v: number | string): number | string {
  return v === 'OK' ? JUDGE_TEXT.OK : v === 'NG' ? JUDGE_TEXT.NG : v;
}

/** Excel の式の中の文字列定数。1つの定数は 255 文字までなので、長いものは分けてつなぐ */
function quote(s: string): string {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += 200) parts.push(`"${s.slice(i, i + 200).replace(/"/g, '""')}"`);
  return parts.length ? parts.join('&') : '""';
}


/** 代入式の中で値を文字にする Excel の式。画面の表示（formatValue）と同じ桁数にそろえる */
function valueText(r: ValueRow, cell: string): string {
  if (typeof r.value !== 'number') return cell;
  if (r.digits !== undefined) return `TEXT(${cell},"${excelNumFmt(r.digits)}")`;
  const a = Math.abs(r.value);
  if (a > 0 && a < 0.0001) return `TEXT(${cell},"0.000E+00")`;
  const d = autoDigits(r.value);
  // 桁数の指定がない値は、画面と同じく末尾の 0 を付けない
  return d === 0 ? `TEXT(${cell},"#,##0")` : `ROUND(${cell},${d})&""`;
}

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

function substitution(row: Extract<SheetRow, { kind: 'calc' }>, rows: SheetRow[], cellOf: (key: string) => string, byKey: Map<string, ValueRow>) {
  // 判定は公的な計算書にならい「確認：条件」と書き、値の列に判定を置く
  const head =
    row.format === 'judge'
      ? `確認：${exprSymbolic(row.expr, rows)}`
      : `${row.symbol ? `${row.symbol} = ` : ''}${exprSymbolic(row.expr, rows)}`;
  if (placeholders(row.expr).length === 0) return { text: head };
  // 判定は「2.20 ≤ 2.00」のように、それ以外は「= 30.8 × 40 …」のように代入式を書く
  const lead = row.format === 'judge' ? '' : '= ';
  const pieces: string[] = [quote(`${head}`), 'CHAR(10)'];
  let text = `${head}\n${lead}`;
  if (lead) pieces.push(quote(lead));
  let last = 0;
  for (const m of row.expr.matchAll(PLACEHOLDER)) {
    const lit = row.expr.slice(last, m.index);
    if (lit) pieces.push(quote(lit));
    const r = byKey.get(m[1])!;
    pieces.push(valueText(r, cellOf(m[1])));
    text += lit + formatValue(r.value, r.digits);
    last = m.index! + m[0].length;
  }
  const tail = row.expr.slice(last);
  if (tail) pieces.push(quote(tail));
  text += tail;
  return { formula: pieces.join('&'), text };
}

/** 計算式の列から値の列までを使って表示する行（文字の入力値） */
export function isWideText(row: SheetRow): boolean {
  return row.kind === 'input' && typeof row.value === 'string';
}

/**
 * 行データを Excel のシート上の行番号に割り付け、式中の {key} をセル番地に置き換える。
 * Excel 出力とテスト（式の検算）の両方から使う。
 */
export function layoutRows(rows: SheetRow[]): LaidOutRow[] {
  const cellByKey = new Map<string, string>();
  const byKey = new Map<string, ValueRow>();
  const tables = new Map<string, { row: SheetTableRow; firstRow: number; lastRow: number; headerRow: number }>();
  let r = HEADER_ROW + 1;
  const placed = rows.map((row) => {
    const excelRow = r++;
    let cell = '';
    if (row.kind === 'table') {
      if (row.columns.length > TABLE_COLS.length) throw new Error(`明細表の列は ${TABLE_COLS.length} 列までです: ${row.key}`);
      // 見出しの行の次からデータの行を並べる
      // 1行目に表の名前、2行目に列見出し、その次からデータの行を並べる
      tables.set(row.key, { row, headerRow: excelRow + 1, firstRow: excelRow + 2, lastRow: excelRow + 1 + row.rows.length });
      r += row.rows.length + 1;
    } else if (row.kind !== 'section') {
      cell = `${isWideText(row) ? EXPR_COL : VALUE_COL}${excelRow}`;
      cellByKey.set(row.key, cell);
      byKey.set(row.key, row);
    }
    return { row, excelRow, cell };
  });
  const cellOf = (key: string) => {
    const c = cellByKey.get(key);
    if (!c) throw new Error(`式が未定義のキーを参照しています: ${key}`);
    return c;
  };
  const rangeOf = (tableKey: string, colKey: string) => {
    const t = tables.get(tableKey);
    if (!t) throw new Error(`式が未定義の明細表を参照しています: ${tableKey}`);
    const i = t.row.columns.findIndex((c) => c.key === colKey);
    if (i < 0) throw new Error(`明細表 ${tableKey} に列 ${colKey} がありません`);
    const col = TABLE_COLS[i];
    // データがないときは見出しのセル（文字）を指し、SUM が 0 になるようにする
    return t.lastRow < t.firstRow ? `${col}${t.headerRow}:${col}${t.headerRow}` : `${col}${t.firstRow}:${col}${t.lastRow}`;
  };
  const resolve = (template: string) => resolveFormula(template.replace(RANGE, (_, t: string, c: string) => rangeOf(t, c)), cellOf);
  return placed.map((p) => {
    if (p.row.kind === 'section') return { ...p, cellValue: '' };
    if (p.row.kind === 'table') {
      const tr = p.row;
      const t = tables.get(tr.key)!;
      const cols = tr.columns;
      const formulas = tr.rows.map((_, ri) =>
        cols.map((c) =>
          c.formula
            ? (c.format === 'judge' ? judgeFormula : (f: string) => f)(resolve(
                c.formula.replace(SAME_ROW, (_m, k: string) => {
                  const ci = cols.findIndex((x) => x.key === k);
                  if (ci < 0) throw new Error(`明細表 ${tr.key} に列 ${k} がありません`);
                  return `${TABLE_COLS[ci]}${t.firstRow + ri}`;
                }),
              ))
            : undefined,
        ),
      );
      return {
        ...p,
        cellValue: '',
        table: {
          headerRow: t.headerRow,
          firstRow: t.firstRow,
          lastRow: t.lastRow,
          colLetters: cols.map((_, i) => TABLE_COLS[i]),
          formulas,
          values: tr.rows.map((vals) => vals.map((v, ci) => (cols[ci].format === 'judge' ? judgeValue(v) : v))),
        },
      };
    }
    if (p.row.kind === 'input') return { ...p, cellValue: p.row.value };
    const isJudge = p.row.format === 'judge';
    const formula = resolve(p.row.formula);
    return {
      ...p,
      formula: isJudge ? judgeFormula(formula) : formula,
      cellValue: isJudge ? judgeValue(p.row.value) : p.row.value,
      substitution: substitution(p.row, rows, cellOf, byKey),
    };
  });
}
