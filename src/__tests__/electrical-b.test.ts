import { describe, expect, it } from 'vitest';
import { shortCircuitCurrent } from '../tools/el-06-short-circuit-current';
import { transformerCapacity } from '../tools/el-07-transformer-capacity';
import { lumenMethod } from '../tools/el-09-lumen-method';
import { emergencyLighting } from '../tools/el-10-emergency-lighting';
import { conduitFill } from '../tools/el-16-conduit-fill';
import { checkTool, expectExcelMatches, run, value } from './helpers';

const TOOLS = [shortCircuitCurrent, transformerCapacity, lumenMethod, emergencyLighting, conduitFill];

describe('electrical-b 共通検査', () => {
  it.each(TOOLS.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    expect(t.category).toBe('electrical');
    checkTool(t);
  });
});

describe('EL-06 三相短絡電流', () => {
  const t = shortCircuitCurrent;
  it('スカラー和：受電点 100 MVA、変圧器 500 kVA・5 %、210 V', () => {
    const r = run(t);
    expect(value(r, 'Zs')).toBeCloseTo(10);
    expect(value(r, 'Ztb')).toBeCloseTo(100);
    expect(value(r, 'Z')).toBeCloseTo(110);
    expect(value(r, 'In')).toBeCloseTo(27492.87, 1);
    expect(value(r, 'Is')).toBeCloseTo(24.994, 2);
    expect(value(r, 'Psc')).toBeCloseTo(9.0909, 3);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('遮断器の判定の切り替わり', () => {
    expect(value(run(t, { Ib: '25' }), 'ok')).toBe('OK');
    const ng = run(t, { Ib: '24' });
    expect(value(ng, 'ok')).toBe('NG');
    expect(ng.warnings.length).toBe(1);
  });
  it('受電点（変圧器なし）6.6 kV、％Z 10 %', () => {
    const r = run(t, { src: 'pz', Zs: '10', tr: 'no', V: '6600', Ib: '12.5' });
    expect(value(r, 'Z')).toBeCloseTo(10);
    expect(value(r, 'In')).toBeCloseTo(874.77, 1);
    expect(value(r, 'Is')).toBeCloseTo(8.7477, 3);
    expect(value(r, 'Psc')).toBeCloseTo(100);
  });
  it('R・X 分離：ケーブル 0.24 + j0.08 Ω/km × 30 m を含む', () => {
    const r = run(t, { method: 'rx', cable: 'ohm', r: '0.24', x: '0.08', L: '30', Rt: '1.2' });
    expect(value(r, 'Rm')).toBeCloseTo(7.2);
    expect(value(r, 'pRc')).toBeCloseTo(163.265, 2);
    expect(value(r, 'pXc')).toBeCloseTo(54.422, 2);
    expect(value(r, 'Xt')).toBeCloseTo(4.85386, 4);
    expect(value(r, 'R')).toBeCloseTo(187.265, 2);
    expect(value(r, 'X')).toBeCloseTo(161.499, 2);
    expect(value(r, 'Z')).toBeCloseTo(247.29, 1);
    expect(value(r, 'Is')).toBeCloseTo(11.118, 2);
  });
  it('スカラー和でケーブルを含むと注意を出し、R・X 分離より短絡電流が小さい', () => {
    const z = run(t, { cable: 'ohm' });
    const rx = run(t, { method: 'rx', cable: 'ohm' });
    expect(z.warnings.some((w) => w.includes('スカラー和'))).toBe(true);
    expect(value(z, 'Is') as number).toBeLessThan(value(rx, 'Is') as number);
  });
  it('選択肢の組み合わせでも Excel 式が一致する', () => {
    for (const method of ['z', 'rx'])
      for (const src of ['mva', 'pz'])
        for (const tr of ['yes', 'no'])
          for (const cable of ['none', 'ohm', 'pz']) {
            const r = run(t, { method, src, tr, cable });
            expectExcelMatches(r, `${method}/${src}/${tr}/${cable}`);
          }
    const r = run(t, { method: 'rx', tr: 'no', cable: 'none' });
    expect(value(r, 'R')).toBe(0);
    expect(value(r, 'Z')).toBeCloseTo(10);
  });
  it('変圧器の％R が％Z 以上ならエラー', () => {
    expect(() => run(t, { method: 'rx', Rt: '5', Zt: '5' })).toThrow();
  });
});

describe('EL-07 変圧器容量', () => {
  const t = transformerCapacity;
  it('3 負荷、不等率 1.2、力率 0.85、余裕 10 %', () => {
    const r = run(t);
    expect(value(r, 'sumP')).toBeCloseTo(290);
    expect(value(r, 'sumPD')).toBeCloseTo(206);
    expect(value(r, 'Pmax')).toBeCloseTo(171.667, 2);
    expect(value(r, 'S')).toBeCloseTo(201.961, 2);
    expect(value(r, 'Sr')).toBeCloseTo(222.157, 2);
    expect(value(r, 'Ss')).toBe(300);
  });
  it('標準容量ちょうどはその容量、超えれば次の容量', () => {
    const base = { n: '1', P1: '300', D1: '100', F: '1', pf: '1', a: '0' };
    expect(value(run(t, base), 'Ss')).toBe(300);
    expect(value(run(t, { ...base, P1: '301' }), 'Ss')).toBe(500);
  });
  it('単相は 500 kVA を超えると範囲外', () => {
    const r = run(t, { phase: '1p', n: '1', P1: '600', D1: '100', F: '1', pf: '1', a: '0' });
    expect(value(r, 'Ss')).toBe('範囲外');
    expect(r.warnings.length).toBe(1);
  });
  it('6 行すべてを使う', () => {
    const r = run(t, { n: '6' });
    expect(value(r, 'sumP')).toBeCloseTo(350);
    expect(value(r, 'sumPD')).toBeCloseTo(206 + 18 + 10 + 10);
  });
});

describe('EL-09 照度計算（光束法）', () => {
  const t = lumenMethod;
  it('事務室 750 lx、12 m × 8 m、H 2 m、5,000 lm、U 0.7、M 0.8', () => {
    const r = run(t);
    expect(value(r, 'A')).toBeCloseTo(96);
    expect(value(r, 'K')).toBeCloseTo(2.4);
    expect(value(r, 'Nr')).toBeCloseTo(25.714, 2);
    expect(value(r, 'N')).toBe(26);
    expect(value(r, 'E')).toBeCloseTo(758.33, 1);
  });
  it('計算値が整数ちょうどなら切り上げない', () => {
    const r = run(t, { room: 'custom', Em: '700' });
    expect(value(r, 'Nr')).toBeCloseTo(24);
    expect(value(r, 'N')).toBe(24);
  });
  it('台数から照度：24 台は 700 lx で NG、27 台は 787.5 lx で OK', () => {
    const ng = run(t, { method: 'E', N: '24' });
    expect(value(ng, 'E')).toBeCloseTo(700);
    expect(value(ng, 'ok')).toBe('NG');
    const ok = run(t, { method: 'E', N: '27' });
    expect(value(ok, 'E')).toBeCloseTo(787.5);
    expect(value(ok, 'ok')).toBe('OK');
  });
  it('室の種類で目標照度が入る（JIS Z 9110 表9）', () => {
    expect(value(run(t, { room: 'meeting' }), 'Em')).toBe(500);
    expect(value(run(t, { room: 'corridor' }), 'Em')).toBe(100);
    expect(value(run(t, { room: 'toilet' }), 'Em')).toBe(200);
  });
});

describe('EL-10 非常用照明の照度（逐点法）', () => {
  const t = emergencyLighting;
  it('LED 2 台：2.7 m、2 m・30 cd と 4 m・25 cd', () => {
    const r = run(t);
    expect(value(r, 'th1')).toBeCloseTo(36.529, 2);
    expect(value(r, 'E1')).toBeCloseTo(2.1352, 3);
    expect(value(r, 'th2')).toBeCloseTo(55.98, 1);
    expect(value(r, 'E2')).toBeCloseTo(0.6006, 3);
    expect(value(r, 'E')).toBeCloseTo(2.7358, 3);
    expect(value(r, 'Emin')).toBe(2);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('真下の点：E = I ÷ h²、光源の種類で基準値が切り替わる', () => {
    const base = { n: '1', h1: '2', d1: '0' };
    expect(value(run(t, { ...base, I1: '4', src: 'inc' }), 'ok')).toBe('OK');
    expect(value(run(t, { ...base, I1: '4', src: 'inc' }), 'E')).toBeCloseTo(1);
    expect(value(run(t, { ...base, I1: '3.99', src: 'inc' }), 'ok')).toBe('NG');
    expect(value(run(t, { ...base, I1: '4', src: 'fl' }), 'ok')).toBe('NG');
    expect(value(run(t, { ...base, I1: '8', src: 'fl' }), 'ok')).toBe('OK');
  });
  it('3 台の合計', () => {
    const r = run(t, { n: '3' });
    const e3 = (20 * Math.cos(Math.atan(6 / 2.7)) ** 3) / 2.7 ** 2;
    expect(value(r, 'E3')).toBeCloseTo(e3, 6);
    expect(value(r, 'E')).toBeCloseTo(2.7358 + e3, 3);
  });
});

describe('EL-16 電線管の太さ（占積率）', () => {
  const t = conduitFill;
  it('外径 5 mm × 6 本を C25 に入れる', () => {
    const r = run(t);
    expect(value(r, 'Aw')).toBeCloseTo(117.81, 1);
    expect(value(r, 'D')).toBeCloseTo(22.2);
    expect(value(r, 'Ac')).toBeCloseTo(387.08, 1);
    expect(value(r, 'ratio')).toBeCloseTo(30.436, 2);
    expect(value(r, 'ok')).toBe('OK');
    expect(value(r, 'Dreq')).toBeCloseTo(17.678, 2);
  });
  it('内径 20 mm で占積率 37.5 %（上限との境界）', () => {
    const r = run(t, { conduit: 'custom', D: '20' });
    expect(value(r, 'ratio')).toBeCloseTo(37.5);
    expect(value(run(t, { conduit: 'custom', D: '20', lim: '37.5' }), 'ok')).toBe('OK');
    expect(value(run(t, { conduit: 'custom', D: '20', lim: '37.4' }), 'ok')).toBe('NG');
  });
  it('異なる太さ：上限 32 % が入り、超過で NG', () => {
    const r = run(t, { mode: 'diff', k: '2' });
    expect(value(r, 'lim')).toBe(32);
    expect(value(r, 'Aw')).toBeCloseTo((Math.PI / 4) * (6 * 25 + 3 * 49), 6);
    expect(value(r, 'ratio')).toBeCloseTo(60.26, 1);
    expect(value(r, 'ok')).toBe('NG');
  });
  it('同一太さなのに外径が異なると注意を出す', () => {
    expect(run(t, { k: '2' }).warnings.some((w) => w.includes('外径の異なる'))).toBe(true);
  });
  it('厚鋼電線管 G16 の内径は 21.0 − 2 × 2.3 = 16.4 mm', () => {
    expect(value(run(t, { conduit: 'G16' }), 'D')).toBeCloseTo(16.4);
  });
  it('本数がすべて 0 ならエラー', () => {
    expect(() => run(t, { n1: '0' })).toThrow();
  });
});
