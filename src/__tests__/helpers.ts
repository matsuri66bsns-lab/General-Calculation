/**
 * ツールのテストで共通に使う部品。各分類のテストファイルから import して使う。
 * （ファイル名が *.test.ts ではないので、これ自体はテストとして実行されない）
 */
import { expect } from 'vitest';
import { HyperFormula } from 'hyperformula';
import { EXPR_COL, layoutRows, VALUE_COL } from '../core/layout';
import { parseValues, rawTableRows } from '../core/values';
import { placeholders } from '../core/formula';
import { isValueRow } from '../core/types';
import type { CalcResult, RawValues, ToolDef, Values } from '../core/types';

/** 既定値に上書きを加えて計算する。select の apply も画面と同じように反映する */
export function runWithValues(tool: ToolDef, overrides: RawValues = {}): { result: CalcResult; values: Values } {
  const raw = { ...tool.defaults, ...overrides };
  for (const f of tool.fields) {
    if (f.type === 'select' && overrides[f.key] !== undefined) {
      const opt = f.options.find((o) => o.value === overrides[f.key]);
      Object.assign(raw, opt?.apply ?? {}, overrides);
    }
  }
  const { values, errors } = parseValues(tool.fields, raw);
  expect(errors, `${tool.id} 入力エラー ${JSON.stringify(overrides)}`).toEqual({});
  return { result: tool.build(values), values };
}

export function run(tool: ToolDef, overrides: RawValues = {}): CalcResult {
  return runWithValues(tool, overrides).result;
}

/** 計算書の行の値を key で取り出す */
export function value(result: CalcResult, key: string): number | string {
  const row = result.rows.find((r) => isValueRow(r) && r.key === key);
  if (!row || !isValueRow(row)) throw new Error(`no row ${key}`);
  return row.value;
}

/**
 * Excel に出力するのと同じ配置でシートを組み、式を Excel 互換の計算エンジンで評価して、
 * 画面（JavaScript）の計算値と一致することを確かめる。
 */
export function expectExcelMatches(result: CalcResult, label = '') {
  const laid = layoutRows(result.rows);
  const last = Math.max(...laid.map((l) => l.excelRow));
  const V = VALUE_COL.charCodeAt(0) - 65;
  const X = EXPR_COL.charCodeAt(0) - 65;
  const lastRow = Math.max(last, ...laid.map((l) => l.table?.lastRow ?? 0));
  const grid: (string | number | null)[][] = Array.from({ length: lastRow }, () => Array(9).fill(null));
  const col = (letter: string) => letter.charCodeAt(0) - 65;
  for (const l of laid) {
    if (l.row.kind === 'table' && l.table) {
      const t = l.table;
      l.row.columns.forEach((c, ci) => (grid[t.headerRow - 1][col(t.colLetters[ci])] = c.label));
      l.row.rows.forEach((vals, ri) =>
        vals.forEach((v, ci) => {
          const f = t.formulas[ri][ci];
          grid[t.firstRow + ri - 1][col(t.colLetters[ci])] = f ? `=${f}` : v;
        }),
      );
    }
    if (l.row.kind === 'input') grid[l.excelRow - 1][l.cell.charCodeAt(0) - 65] = l.row.value;
    if (l.row.kind === 'calc') {
      grid[l.excelRow - 1][V] = `=${l.formula}`;
      // 代入式の列。HyperFormula の TEXT は桁区切りの書式に対応しないので、検算では外す
      const f = l.substitution?.formula;
      if (f && !f.includes('E+00')) grid[l.excelRow - 1][X] = `=${f.replace(/#,##0/g, '0')}`;
    }
  }
  const hf = HyperFormula.buildFromArray(grid, { licenseKey: 'gpl-v3', precisionRounding: 12 });
  try {
    for (const l of laid) {
      if (l.row.kind === 'table' && l.table) {
        const t = l.table;
        const tr = l.row;
        tr.rows.forEach((vals, ri) =>
          vals.forEach((_v, ci) => {
            const f = t.formulas[ri][ci];
            if (!f) return;
            const want = t.values[ri][ci];
            const got = hf.getCellValue({ sheet: 0, row: t.firstRow + ri - 1, col: col(t.colLetters[ci]) });
            const msg = `${label} ${tr.key}[${ri}].${tr.columns[ci].key}: ${f} → ${JSON.stringify(got)}（画面の値 ${JSON.stringify(want)}）`;
            if (typeof want === 'number') expect(got as number, msg).toBeCloseTo(want, 6);
            else expect(got, msg).toBe(want);
          }),
        );
        continue;
      }
      if (l.row.kind !== 'calc') continue;
      const got = hf.getCellValue({ sheet: 0, row: l.excelRow - 1, col: V });
      const want = l.cellValue;
      const msg = `${label} ${l.row.key}: ${l.formula} → ${JSON.stringify(got)}（画面の値 ${JSON.stringify(want)}）`;
      if (typeof want === 'number') {
        expect(typeof got, msg).toBe('number');
        expect(got as number, msg).toBeCloseTo(want, Math.max(0, 9 - Math.ceil(Math.log10(Math.abs(want) + 1))));
      } else {
        expect(got, msg).toBe(want);
      }
      // 代入式は画面の表示（桁区切りを除く）と同じ文字になる
      const sub = l.substitution;
      if (sub?.formula && !sub.formula.includes('E+00')) {
        const text = hf.getCellValue({ sheet: 0, row: l.excelRow - 1, col: X });
        expectSameText(String(text), sub.text, `${label} ${l.row.key} の代入式: ${sub.formula}`);
      }
    }
  } finally {
    hf.destroy();
  }
}

/**
 * 代入式の文字の比較。桁区切りは無視し、数値は最後の桁の ±1 まで許す
 * （HyperFormula の TEXT は 17.15 のような値の丸めが Excel と異なるため）
 */
function expectSameText(got: string, want: string, msg: string) {
  const NUM = /-?\d+(?:\.\d+)?/g;
  const norm = (s: string) => s.replace(/,/g, '');
  const g = norm(got);
  const w = norm(want);
  expect(g.replace(NUM, '#'), msg).toBe(w.replace(NUM, '#'));
  const gn = g.match(NUM) ?? [];
  const wn = w.match(NUM) ?? [];
  wn.forEach((n, i) => {
    const step = 10 ** -(n.split('.')[1]?.length ?? 0);
    expect(Math.abs(Number(gn[i]) - Number(n)), `${msg}（${got} / ${want}）`).toBeLessThanOrEqual(step * 1.0001);
  });
}

/** 既定値と、select のすべての選択肢の組み合わせ（1項目ずつ切り替えたもの） */
export function selectCases(tool: ToolDef): RawValues[] {
  const cases: RawValues[] = [{}];
  for (const f of tool.fields) if (f.type === 'select') for (const o of f.options) cases.push({ [f.key]: o.value });
  // 明細表は、行を1行足した場合と、空にした場合（最低行数がなければ）も確かめる
  for (const f of tool.fields) {
    if (f.type !== 'table') continue;
    const rows = rawTableRows(tool.defaults[f.key]);
    cases.push({ [f.key]: JSON.stringify([...rows, f.newRow]) });
    if (!f.minRows) cases.push({ [f.key]: '[]' });
  }
  return cases;
}

/**
 * どのツールにも当てはまる検査をまとめて行う。
 * - 既定値とすべての選択肢で計算でき、Excel 式が画面の値と一致する
 * - 式の {key} は先に定義された行だけを参照する
 * - 結果カードに指定した key が存在する
 * - 計算書に出る記号が、すべて記号の説明（何の略か・意味）に載っている
 * - 計算式の解説と、初学者向け解説の4項目がそろっている
 */
export function checkTool(tool: ToolDef) {
  expect(tool.id, 'ID の形式').toMatch(/^(HV|PL|EL|FP|CM)-\d{2}$/);
  for (const c of selectCases(tool)) {
    const label = `${tool.id} ${JSON.stringify(c)}`;
    const { result, values } = runWithValues(tool, c);
    expectExcelMatches(result, label);

    const seen = new Set<string>();
    const RANGE_REF = /\{([A-Za-z_][A-Za-z0-9_]*):[A-Za-z_][A-Za-z0-9_]*\}/g;
    for (const r of result.rows) {
      if (r.kind === 'section') continue;
      const templates =
        r.kind === 'calc' ? [r.formula, r.expr] : r.kind === 'table' ? r.columns.flatMap((c) => [c.formula ?? '', c.expr ?? '']) : [];
      for (const t of templates) {
        for (const k of placeholders(t)) expect(seen.has(k), `${label} ${r.key} が未定義の ${k} を参照`).toBe(true);
        for (const m of t.matchAll(RANGE_REF)) expect(seen.has(m[1]), `${label} ${r.key} が未定義の明細表 ${m[1]} を参照`).toBe(true);
      }
      if (r.kind === 'table') {
        for (const row of r.rows) expect(row.length, `${label} ${r.key} の列数`).toBe(r.columns.length);
      }
      seen.add(r.key);
    }
    for (const k of result.highlights) expect(seen.has(k), `${label} 結果カードの ${k} がない`).toBe(true);

    const doc = tool.doc(values);
    expect(doc.formulas.length, `${label} 計算式の解説`).toBeGreaterThan(0);
    const documented = new Set(doc.symbols.map((d) => d.symbol));
    const symbols = result.rows.flatMap((r) =>
      r.kind === 'table' ? r.columns.map((c) => c.symbol) : r.kind === 'section' ? [] : [r.symbol],
    );
    for (const sym of symbols) {
      if (!sym) continue;
      expect(documented.has(sym), `${label}：記号 ${sym} の説明がない`).toBe(true);
    }
    for (const d of doc.symbols) {
      expect(d.origin.length, `${label} ${d.symbol} の由来`).toBeGreaterThan(0);
      expect(d.meaning.length, `${label} ${d.symbol} の意味`).toBeGreaterThan(0);
    }
  }
  const b = tool.beginner;
  expect(b.purpose.length, `${tool.id} 初学者向け：目的`).toBeGreaterThan(0);
  expect(b.terms.length, `${tool.id} 初学者向け：用語`).toBeGreaterThan(0);
  expect(b.example.steps.length, `${tool.id} 初学者向け：計算例`).toBeGreaterThan(0);
  expect(b.pitfalls.length, `${tool.id} 初学者向け：注意点`).toBeGreaterThan(0);
  expect(tool.references.length, `${tool.id} 根拠`).toBeGreaterThan(0);
}
