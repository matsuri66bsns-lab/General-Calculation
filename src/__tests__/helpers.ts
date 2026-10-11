/**
 * ツールのテストで共通に使う部品。各分類のテストファイルから import して使う。
 * （ファイル名が *.test.ts ではないので、これ自体はテストとして実行されない）
 */
import { expect } from 'vitest';
import { HyperFormula } from 'hyperformula';
import { layoutRows } from '../core/layout';
import { parseValues } from '../core/values';
import { placeholders } from '../core/formula';
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
  const row = result.rows.find((r) => r.kind !== 'section' && r.key === key);
  if (!row || row.kind === 'section') throw new Error(`no row ${key}`);
  return row.value;
}

/**
 * Excel に出力するのと同じ配置でシートを組み、式を Excel 互換の計算エンジンで評価して、
 * 画面（JavaScript）の計算値と一致することを確かめる。
 */
export function expectExcelMatches(result: CalcResult, label = '') {
  const laid = layoutRows(result.rows);
  const last = Math.max(...laid.map((l) => l.excelRow));
  const grid: (string | number | null)[][] = Array.from({ length: last }, () => [null, null, null]);
  for (const l of laid) {
    if (l.row.kind === 'input') grid[l.excelRow - 1][2] = l.row.value;
    if (l.row.kind === 'calc') grid[l.excelRow - 1][2] = `=${l.formula}`;
  }
  const hf = HyperFormula.buildFromArray(grid, { licenseKey: 'gpl-v3', precisionRounding: 12 });
  try {
    for (const l of laid) {
      if (l.row.kind !== 'calc') continue;
      const got = hf.getCellValue({ sheet: 0, row: l.excelRow - 1, col: 2 });
      const want = l.cellValue;
      const msg = `${label} ${l.row.key}: ${l.formula} → ${JSON.stringify(got)}（画面の値 ${JSON.stringify(want)}）`;
      if (typeof want === 'number') {
        expect(typeof got, msg).toBe('number');
        expect(got as number, msg).toBeCloseTo(want, Math.max(0, 9 - Math.ceil(Math.log10(Math.abs(want) + 1))));
      } else {
        expect(got, msg).toBe(want);
      }
    }
  } finally {
    hf.destroy();
  }
}

/** 既定値と、select のすべての選択肢の組み合わせ（1項目ずつ切り替えたもの） */
export function selectCases(tool: ToolDef): RawValues[] {
  const cases: RawValues[] = [{}];
  for (const f of tool.fields) if (f.type === 'select') for (const o of f.options) cases.push({ [f.key]: o.value });
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
    for (const r of result.rows) {
      if (r.kind === 'section') continue;
      if (r.kind === 'calc') {
        for (const k of [...placeholders(r.formula), ...placeholders(r.expr)]) {
          expect(seen.has(k), `${label} ${r.key} が未定義の ${k} を参照`).toBe(true);
        }
      }
      seen.add(r.key);
    }
    for (const k of result.highlights) expect(seen.has(k), `${label} 結果カードの ${k} がない`).toBe(true);

    const doc = tool.doc(values);
    expect(doc.formulas.length, `${label} 計算式の解説`).toBeGreaterThan(0);
    const documented = new Set(doc.symbols.map((d) => d.symbol));
    for (const r of result.rows) {
      if (r.kind === 'section' || !r.symbol) continue;
      expect(documented.has(r.symbol), `${label}：記号 ${r.symbol} の説明がない`).toBe(true);
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
