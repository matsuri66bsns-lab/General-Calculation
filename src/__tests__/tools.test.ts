import { describe, expect, it } from 'vitest';
import { TOOLS, findToolById, searchTools } from '../tools/registry';
import { parseValues } from '../core/values';
import { stepUp, stepUpFormula } from '../core/sheet';
import { QUANTITIES } from '../tools/cm-01-unit-convert';
import { checkTool, expectExcelMatches, run, value } from './helpers';

describe('全ツール共通', () => {
  it('ID と slug が重複しない', () => {
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(TOOLS.length);
  });

  it.each(TOOLS.map((t) => [t.id, t] as const))('%s：計算・Excel 式・記号の説明・初学者向け解説の共通検査', (_id, t) => {
    checkTool(t);
  });
});

describe('HV-01 必要換気量', () => {
  const t = findToolById('HV-01')!;
  it('換気回数法', () => {
    const r = run(t, { method: 'ach', A: '20', H: '2.5', n: '10' });
    expect(value(r, 'Qv')).toBeCloseTo(500);
  });
  it('在室人員法（上限で頭打ち）', () => {
    expect(value(run(t, { method: 'person', A: '20', N: '5' }), 'Qv')).toBeCloseTo(80);
    const capped = run(t, { method: 'person', A: '30', N: '5', bldg: 'special' });
    expect(value(capped, 'Qv')).toBeCloseTo(200);
    expect(capped.warnings.length).toBe(1);
  });
  it('CO2 濃度法', () => {
    expect(value(run(t, { method: 'co2', P: '10', k: '0.02', C: '1000', C0: '400' }), 'Qv')).toBeCloseTo(333.333, 2);
  });
  it('CO2 濃度法で許容濃度が外気以下ならエラー', () => {
    expect(() => run(t, { method: 'co2', C: '400', C0: '400' })).toThrow();
  });
  it('火気使用室', () => {
    expect(value(run(t, { method: 'fire', K: '0.93', Q: '20', hood: '30' }), 'Qv')).toBeCloseTo(558);
  });
});

describe('PL-01 受水槽・高置水槽容量', () => {
  it('事務所 200人', () => {
    const r = run(findToolById('PL-01')!, { N: '200', q: '100', T: '9', k1: '2', k2: '4', rs: '0.5', te: '0.5' });
    expect(value(r, 'Qd')).toBeCloseTo(20);
    expect(value(r, 'Vs')).toBeCloseTo(10);
    expect(value(r, 'Qm')).toBeCloseTo(4.4444, 3);
    expect(value(r, 'Ve')).toBeCloseTo(2.2222, 3);
    expect(value(r, 'Qpu')).toBeCloseTo(74.074, 2);
  });
});

describe('EL-01 電圧降下', () => {
  const t = findToolById('EL-01')!;
  it('三相3線 200V 50A 40m 14mm²', () => {
    const r = run(t, { sys: '3p3w', V: '200', I: '50', L: '40', A: '14', ea: '2' });
    expect(value(r, 'e')).toBeCloseTo(4.4);
    expect(value(r, 'eps')).toBeCloseTo(2.2);
    expect(value(r, 'ok')).toBe('NG');
    expect(value(r, 'Areq')).toBeCloseTo(15.4);
    expect(value(r, 'rec')).toBe(22);
  });
  it('必要断面積が最大サイズを超えると範囲外', () => {
    const r = run(t, { sys: '1p2w', V: '100', I: '400', L: '200', A: '325', ea: '2' });
    expect(value(r, 'rec')).toBe('範囲外');
    expectExcelMatches(r);
  });
  it('規格サイズの選定（境界値）', () => {
    const sizes = [2, 3.5, 5.5];
    expect(stepUp(2, sizes)).toBe(2);
    expect(stepUp(2.01, sizes)).toBe(3.5);
    expect(stepUp(5.6, sizes)).toBeNull();
    expect(stepUpFormula('X', sizes)).toBe('IF(X<=2,2,IF(X<=3.5,3.5,IF(X<=5.5,5.5,"範囲外")))');
  });
});

describe('EL-02 電力⇔電流換算', () => {
  const t = findToolById('EL-02')!;
  it('三相 200V 11kW 力率0.85 効率0.9', () => {
    const r = run(t, { sys: '3p', mode: 'p2i', V: '200', P: '11', pf: '0.85', eta: '0.9' });
    expect(value(r, 'Iout')).toBeCloseTo(41.51, 1);
  });
  it('単相 100V 10A → 1kVA', () => {
    const r = run(t, { sys: '1p', mode: 'i2p', V: '100', I: '10', pf: '1' });
    expect(value(r, 'S')).toBeCloseTo(1);
    expectExcelMatches(r);
  });
  it('直流は力率 1 として扱う', () => {
    const r = run(t, { sys: 'dc', mode: 'i2p', V: '48', I: '10', pf: '0.5' });
    expect(value(r, 'Pout')).toBeCloseTo(0.48);
  });
});

describe('CM-01 単位換算', () => {
  const t = findToolById('CM-01')!;
  it('100 kPa → mmAq', () => {
    const r = run(t, { q: 'pressure', x: '100', from_pressure: 'kPa' });
    expect(value(r, 'u5')).toBeCloseTo(10197.16, 1);
  });
  it('100 ℃ → 212 ℉、−40 ℃ = −40 ℉', () => {
    expect(value(run(t, { q: 'temp', x: '100', from_temp: 'C' }), 'u2')).toBeCloseTo(212);
    expect(value(run(t, { q: 'temp', x: '-40', from_temp: 'C' }), 'u2')).toBeCloseTo(-40);
  });
  it('すべての単位の組み合わせで往復換算が一致し、Excel 式も一致する', () => {
    for (const q of QUANTITIES) {
      for (const u of q.units) {
        const r = run(t, { q: q.id, x: '12.5', [`from_${q.id}`]: u.id });
        const self = q.units.findIndex((x) => x.id === u.id);
        expect(value(r, `u${self}`)).toBeCloseTo(12.5, 9);
        expectExcelMatches(r);
      }
    }
  });
});

describe('検索', () => {
  it('キーワードで絞り込める', () => {
    expect(searchTools('電圧').map((t) => t.id)).toContain('EL-01');
    expect(searchTools('el-02').map((t) => t.id)).toEqual(['EL-02']);
    expect(searchTools('存在しない語')).toEqual([]);
  });
});

describe('入力の検証', () => {
  it('空欄・範囲外をエラーにする', () => {
    const t = findToolById('EL-01')!;
    expect(parseValues(t.fields, { ...t.defaults, I: '' }).errors.I).toBeDefined();
    expect(parseValues(t.fields, { ...t.defaults, I: '0' }).errors.I).toBeDefined();
    expect(parseValues(t.fields, { ...t.defaults, I: '1,200' }).errors.I).toBeUndefined();
  });
  it('非表示のフィールドは検証しない', () => {
    const t = findToolById('HV-01')!;
    expect(parseValues(t.fields, { ...t.defaults, method: 'ach', P: '' }).errors).toEqual({});
  });
});
