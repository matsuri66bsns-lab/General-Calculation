import { describe, expect, it } from 'vitest';
import { checkTool, expectExcelMatches, run, value } from './helpers';
import { allowableFrictionPipe } from '../tools/pl-14-allowable-friction-pipe';
import { emergencyWater } from '../tools/pl-17-emergency-water';

describe('給排水衛生（新規 b）：共通検査', () => {
  it.each([allowableFrictionPipe, emergencyWater].map((t) => [t.id, t] as const))('%s', (_id, t) => {
    expect(t.category).toBe('plumbing');
    checkTool(t);
  });
  it('津波避難の考え方（n₂ = 0）と1タンク方式でも Excel 式が一致する', () => {
    expectExcelMatches(run(emergencyWater, { sys: 'one', n2: '0', qb: '0', qc: '0', t2: '1', td: '1' }));
  });
});

describe('PL-14 給水管の許容摩擦抵抗と管径', () => {
  it('既定値：R ≒ 1.140 kPa/m、全区間 OK、損失の合計 ≒ 51.26 kPa', () => {
    const r = run(allowableFrictionPipe);
    expect(value(r, 'P3')).toBeCloseTo(58.8399, 4);
    expect(value(r, 'dPa')).toBeCloseTo(91.1601, 4);
    expect(value(r, 'L2')).toBe(40);
    expect(value(r, 'R')).toBeCloseTo(1.13950, 5);
    expect(value(r, 'iMax')).toBeCloseTo(0.8917, 4);
    expect(value(r, 'okR')).toBe('OK');
    expect(value(r, 'sumL')).toBe(40);
    expect(value(r, 'sumDp')).toBeCloseTo(51.2575, 3);
    expect(value(r, 'okP')).toBe('OK');
    expect(value(r, 'Pm')).toBeCloseTo(39.9026, 3);
    expect(r.warnings).toEqual([]);
  });
  it('立て管を内径 40 mm にすると i ≒ 1.268 > R で NG、区間名を注意に出す', () => {
    const sec = JSON.stringify([
      { name: '引込管', Q: '200', D: '50', L: '15' },
      { name: '立て管', Q: '150', D: '40', L: '12' },
      { name: '横枝管', Q: '60', D: '32', L: '10' },
      { name: '器具までの枝管', Q: '20', D: '20', L: '3' },
    ]);
    const r = run(allowableFrictionPipe, { sec });
    expect(value(r, 'iMax')).toBeCloseTo(1.2678, 4);
    expect(value(r, 'okR')).toBe('NG');
    // 合計は 21.845 + 30.427 + 13.799 + 5.350 ≒ 71.42 kPa で、使える圧力以内
    expect(value(r, 'sumDp')).toBeCloseTo(71.4207, 3);
    expect(value(r, 'okP')).toBe('OK');
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toContain('立て管');
    // 明細表の区間ごとの判定は、立て管だけが NG
    const t = r.rows.find((x) => x.kind === 'table' && x.key === 'sec');
    if (!t || t.kind !== 'table') throw new Error('no table');
    const okCol = t.columns.findIndex((c) => c.key === 'ok');
    expect(t.rows.map((row) => row[okCol])).toEqual(['OK', 'NG', 'OK', 'OK']);
    // 立て管の流速 = 150/60000 ÷ (π × 0.04² ÷ 4) ≒ 1.989 m/s
    const vCol = t.columns.findIndex((c) => c.key === 'v');
    expect(t.rows[1][vCol] as number).toBeCloseTo(1.9894, 3);
  });
  it('高置タンク方式：起点 0 kPa、器具がタンクより 12 m 下', () => {
    // ΔPa = 0 − 30 − (−12 × 9.80665) − 0 = 87.6798、R = 87.6798 ÷ (40 × 2) = 1.09600
    const r = run(allowableFrictionPipe, { P1: '0', P2: '30', h: '-12', P4: '0' });
    expect(value(r, 'dPa')).toBeCloseTo(87.6798, 4);
    expect(value(r, 'R')).toBeCloseTo(1.09600, 5);
    expect(value(r, 'okR')).toBe('OK');
  });
  it('使える圧力が 0 以下なら NG と注意', () => {
    const r = run(allowableFrictionPipe, { P1: '150' });
    expect(value(r, 'dPa') as number).toBeLessThan(0);
    expect(value(r, 'okR')).toBe('NG');
    expect(value(r, 'okP')).toBe('NG');
    expect(r.warnings.some((w) => w.includes('0 以下'))).toBe(true);
  });
  it('区間の直管長の合計が L₁ と違うと注意を出す', () => {
    const r = run(allowableFrictionPipe, { L1: '50' });
    expect(r.warnings.some((w) => w.includes('一致しません'))).toBe(true);
  });
});

describe('PL-17 災害時の必要水量と非常用排水槽', () => {
  it('既定値：N = 600 人日、Qa = 2.4 m³、Qb = 19.4 m³、QdE = 18 m³ で全て OK', () => {
    const r = run(emergencyWater);
    expect(value(r, 'N')).toBe(600);
    expect(value(r, 'Qa')).toBeCloseTo(2.4, 10);
    expect(value(r, 'Qb')).toBeCloseTo(19.4, 10);
    expect(value(r, 'Qc')).toBeCloseTo(21.8, 10);
    expect(value(r, 'Va')).toBeCloseTo(7, 10);
    expect(value(r, 'okA')).toBe('OK');
    expect(value(r, 'VrA')).toBe(10);
    expect(value(r, 'Vb')).toBeCloseTo(21, 10);
    expect(value(r, 'okB')).toBe('OK');
    expect(value(r, 'VrB')).toBe(30);
    expect(value(r, 'Nd')).toBe(600);
    expect(value(r, 'QdE')).toBeCloseTo(18, 10);
    expect(value(r, 'okD')).toBe('OK');
    expect(r.warnings).toEqual([]);
  });
  it('雑用水タンク 20 m³ では 14 < 19.4 で NG、必要容量 19.4 ÷ 0.7 ≒ 27.71 m³', () => {
    const r = run(emergencyWater, { QTZ: '20' });
    expect(value(r, 'okB')).toBe('NG');
    expect(value(r, 'VrB')).toBeCloseTo(27.714, 3);
    expect(r.warnings.length).toBe(1);
  });
  it('境界：雑用水タンク容量 × 0.7 が必要水量と等しければ OK', () => {
    // 19.4 ÷ 0.7 = 27.7142857…
    const r = run(emergencyWater, { QTZ: String(19.4 / 0.7) });
    expect(value(r, 'okB')).toBe('OK');
  });
  it('1タンク方式：Qc = 21.8 m³ に対し 10 m³ × 0.7 = 7 m³ で NG、必要容量 ≒ 31.14 m³', () => {
    const r = run(emergencyWater, { sys: 'one' });
    expect(value(r, 'okA')).toBe('NG');
    expect(value(r, 'VrA')).toBeCloseTo(31.143, 3);
  });
  it('非常用排水槽 15 m³ は 18 m³ に足りず NG、排水の日数は給水と別に数える', () => {
    const r = run(emergencyWater, { Vd: '15', td: '10' });
    // Nd = 300 × 1 + 50 × 9 = 750、QdE = 22.5
    expect(value(r, 'Nd')).toBe(750);
    expect(value(r, 'QdE')).toBeCloseTo(22.5, 10);
    expect(value(r, 'okD')).toBe('NG');
  });
  it('t₂ < t₁ はエラー', () => {
    expect(() => run(emergencyWater, { t1: '3', t2: '2' })).toThrow('t₂');
  });
});
