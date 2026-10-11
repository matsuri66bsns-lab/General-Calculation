import { describe, expect, it } from 'vitest';
import { checkTool, expectExcelMatches, run, runWithValues, value } from './helpers';
import { parseValues } from '../core/values';
import { CalcError } from '../core/errors';
import { drainagePump } from '../tools/pl-10-drainage-pump';
import { instantaneousWaterHeater } from '../tools/pl-15-instantaneous-water-heater';
import { hotWaterCirculationPump } from '../tools/pl-16-hot-water-circulation-pump';
import type { RawValues, ToolDef } from '../core/types';

const TOOLS = [drainagePump, instantaneousWaterHeater, hotWaterCirculationPump];

/** 入力の組み合わせが不正なとき CalcError になることを確かめる */
function expectCalcError(tool: ToolDef, overrides: RawValues) {
  const { values } = parseValues(tool.fields, { ...tool.defaults, ...overrides });
  expect(() => tool.build(values)).toThrow(CalcError);
}

describe('給排水衛生（新規 a）：共通検査', () => {
  it.each(TOOLS.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    expect(t.category).toBe('plumbing');
    checkTool(t);
  });
});

describe('PL-10 排水槽の容量・排水ポンプ', () => {
  it('既定値：Vr = 3.0 m³、Q = 200 L/min、H = 11.22 m、Pm ≒ 0.734 kW', () => {
    const r = run(drainagePump);
    expect(value(r, 'Qa')).toBeCloseTo(3, 10);
    expect(value(r, 'Vr')).toBeCloseTo(3, 10);
    expect(value(r, 'okV')).toBe('OK');
    expect(value(r, 'Qv')).toBeCloseTo(200, 10);
    expect(value(r, 'Q')).toBeCloseTo(200, 10);
    expect(value(r, 'SH')).toBeCloseTo(10.2, 10);
    expect(value(r, 'H')).toBeCloseTo(11.22, 10);
    expect(value(r, 'Ps')).toBeCloseTo(0.7335374, 6);
    expect(value(r, 'Pm')).toBeCloseTo(0.7335374, 6);
    expect(r.warnings).toEqual([]);
  });
  it('有効容量が必要有効容量より小さいと NG と注意', () => {
    const r = run(drainagePump, { V: '2.9' });
    expect(value(r, 'okV')).toBe('NG');
    expect(r.warnings.length).toBe(1);
  });
  it('最大流入量が大きいときは最大流入量を吐出量にする', () => {
    const r = run(drainagePump, { Qin: '300' });
    expect(value(r, 'Q')).toBe(300);
    expectExcelMatches(r);
  });
  it('最大流入量 0 のときは比べずに 1000V/T', () => {
    const { result, values } = runWithValues(drainagePump, { Qin: '0', V: '4', T: '20' });
    expect(value(result, 'Q')).toBeCloseTo(200, 10);
    expect(() => value(result, 'Qv')).toThrow();
    expectExcelMatches(result);
    expect(drainagePump.doc(values).symbols.some((d) => d.symbol === 'Qv')).toBe(false);
  });
});

describe('PL-15 瞬間湯沸器の号数', () => {
  it('既定値：流し 8 + 洗面器 5 L/min、40 ℃・給水 5 ℃ → 18.2 号、目安 20号、31.7 kW', () => {
    const r = run(instantaneousWaterHeater);
    expect(value(r, 'SQ')).toBe(13);
    expect(value(r, 'SD')).toBe(455);
    expect(value(r, 'Q')).toBe(13);
    expect(value(r, 'G')).toBeCloseTo(18.2, 10);
    expect(value(r, 'Gs')).toBe(20);
    expect(value(r, 'H')).toBeCloseTo(31.74383, 4);
    expect(r.warnings).toEqual([]);
  });
  it('1号 = 1 L/min を 25 ℃ 上げる能力：ちょうど 20 号なら目安も 20号', () => {
    const fx = JSON.stringify([{ name: 'シャワー', n: '1', qp: '20', th: '30' }]);
    const r = run(instantaneousWaterHeater, { fx, tc: '5' });
    expect(value(r, 'G')).toBeCloseTo(20, 10);
    expect(value(r, 'Gs')).toBe(20);
    expect(value(r, 'H')).toBeCloseTo(20 * 4.186 * 25 / 60, 8);
  });
  it('同時使用率と余裕係数を反映する', () => {
    const r = run(instantaneousWaterHeater, { eta: '0.5', K: '1.1' });
    expect(value(r, 'Q')).toBeCloseTo(6.5, 10);
    expect(value(r, 'G')).toBeCloseTo(9.1, 10);
    expect(value(r, 'Gs')).toBe(10);
    expect(value(r, 'H')).toBeCloseTo(1.1 * 4.186 * 0.5 * 455 / 60, 8);
  });
  it('32号を超えると範囲外の表示と注意', () => {
    const fx = JSON.stringify([{ name: '業務用流し', n: '1', qp: '40', th: '45' }]);
    const r = run(instantaneousWaterHeater, { fx });
    expect(value(r, 'G')).toBeCloseTo(64, 10);
    expect(value(r, 'Gs')).toBe('32号超');
    expect(r.warnings.length).toBe(1);
    expectExcelMatches(r);
  });
  it('出湯温度が給水温度以下なら計算しない', () => {
    expectCalcError(instantaneousWaterHeater, { fx: JSON.stringify([{ name: '流し', n: '1', qp: '5', th: '5' }]) });
  });
});

describe('PL-16 給湯循環ポンプ', () => {
  it('既定値：熱損失 2376 W、循環流量 6.81 L/min、揚程 4.89 m', () => {
    const r = run(hotWaterCirculationPump);
    expect(value(r, 'SL')).toBe(160);
    expect(value(r, 'SP')).toBeCloseTo(2376, 8);
    expect(value(r, 'W')).toBeCloseTo(6.811276, 5);
    expect(value(r, 'Le')).toBe(120);
    expect(value(r, 'dp')).toBeCloseTo(48, 10);
    expect(value(r, 'h')).toBeCloseTo(4.894638, 5);
    expect(r.warnings).toEqual([]);
  });
  it('0.86 を使う手引の式と同じ結果になる', () => {
    const r = run(hotWaterCirculationPump);
    expect(value(r, 'W') as number).toBeCloseTo((0.86 * 2376) / 5 / 60, 2);
  });
  it('簡易な方法：給湯量 100 L/min × 0.2 = 20 L/min', () => {
    const r = run(hotWaterCirculationPump, { mode: 'simple' });
    expect(value(r, 'W')).toBeCloseTo(20, 10);
    expect(value(r, 'h')).toBeCloseTo(4.894638, 5);
  });
  it('区間が空なら熱損失 0 で注意', () => {
    const r = run(hotWaterCirculationPump, { sec: '[]' });
    expect(value(r, 'W')).toBe(0);
    expect(r.warnings.length).toBe(1);
  });
  it('給湯温度が周囲温度以下なら計算しない', () => {
    expectCalcError(hotWaterCirculationPump, { th: '15' });
  });
});
