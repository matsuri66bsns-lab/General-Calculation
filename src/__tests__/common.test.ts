import { describe, expect, it } from 'vitest';
import { pipeVelocity } from '../tools/cm-02-pipe-velocity';
import { shaftPower } from '../tools/cm-03-shaft-power';
import { sensibleHeat } from '../tools/cm-04-sensible-heat';
import { seismicAnchor } from '../tools/cm-06-seismic-anchor';
import { checkTool, expectExcelMatches, run, value } from './helpers';

describe('共通分類の共通検査', () => {
  it.each([pipeVelocity, shaftPower, sensibleHeat, seismicAnchor].map((t) => [t.id, t] as const))('%s', (_id, t) => {
    expect(t.category).toBe('common');
    checkTool(t);
  });
});

describe('CM-02 管内流速・必要内径', () => {
  it('100 L/min・内径 40 mm → 約 1.33 m/s', () => {
    const r = run(pipeVelocity, { method: 'v', qunit: 'Lmin', QL: '100', d: '40' });
    expect(value(r, 'Qs')).toBeCloseTo(0.0016667, 6);
    expect(value(r, 'A')).toBeCloseTo(0.00125664, 7);
    expect(value(r, 'vel')).toBeCloseTo(1.3263, 3);
  });
  it('6 m³/h は 100 L/min と同じ結果', () => {
    const r = run(pipeVelocity, { method: 'v', qunit: 'm3h', Qh: '6', d: '40' });
    expect(value(r, 'vel')).toBeCloseTo(1.3263, 3);
  });
  it('目標流速 1.5 m/s → 必要内径 約 37.6 mm', () => {
    const r = run(pipeVelocity, { method: 'd', qunit: 'Lmin', QL: '100', vt: '1.5' });
    expect(value(r, 'Ar')).toBeCloseTo(0.00111111, 7);
    expect(value(r, 'dr')).toBeCloseTo(37.613, 2);
    expectExcelMatches(r);
  });
});

describe('CM-03 ポンプ・送風機の軸動力', () => {
  it('ポンプ 0.5 m³/min・30 m・η0.6・余裕 0.15 → 5.5 kW', () => {
    const r = run(shaftPower, { kind: 'pump', Qp: '0.5', H: '30', rho: '1000', eta: '0.6', alpha: '0.15' });
    expect(value(r, 'P')).toBeCloseTo(4.0861, 3);
    expect(value(r, 'PM')).toBeCloseTo(4.699, 3);
    expect(value(r, 'PR')).toBe(5.5);
  });
  it('送風機 300 m³/min・600 Pa・η0.6 → 5.0 kW、余裕 0.15 で 7.5 kW', () => {
    const r = run(shaftPower, { kind: 'fan', Qf: '300', Pt: '600', eta: '0.6', alpha: '0.15' });
    expect(value(r, 'P')).toBeCloseTo(5.0, 9);
    expect(value(r, 'PM')).toBeCloseTo(5.75, 9);
    expect(value(r, 'PR')).toBe(7.5);
  });
  it('定格出力の選定の境界（3.7 kW ちょうどは 3.7、超えると 5.5）', () => {
    expect(value(run(shaftPower, { kind: 'fan', Qf: '222', Pt: '1000', eta: '1', alpha: '0' }), 'PR')).toBe(3.7);
    expect(value(run(shaftPower, { kind: 'fan', Qf: '223', Pt: '1000', eta: '1', alpha: '0' }), 'PR')).toBe(5.5);
  });
  it('JIS C 4210 の系列は 37 kW まで。超えると範囲外、JIS C 4212 なら選べる', () => {
    const over = run(shaftPower, { kind: 'fan', Qf: '3000', Pt: '600', eta: '0.6', alpha: '0.2', series: 'c4210' });
    expect(value(over, 'PR')).toBe('範囲外');
    expect(over.warnings.length).toBe(1);
    expectExcelMatches(over);
    const ok = run(shaftPower, { kind: 'fan', Qf: '3000', Pt: '600', eta: '0.6', alpha: '0.2', series: 'c4212' });
    expect(value(ok, 'PM')).toBeCloseTo(60, 9);
    expect(value(ok, 'PR')).toBe(75);
  });
});

describe('CM-04 顕熱の熱量・流量換算', () => {
  it('水 20 L/min・Δt 5 K → 約 6.98 kW', () => {
    const r = run(sensibleHeat, { fluid: 'water', method: 'q', VL: '20', dt: '5' });
    expect(value(r, 'm')).toBeCloseTo(0.33333, 5);
    expect(value(r, 'q')).toBeCloseTo(6.97667, 4);
  });
  it('空気 1000 m³/h・Δt 10 K → 約 3.35 kW', () => {
    const r = run(sensibleHeat, { fluid: 'air', method: 'q', Vh: '1000' });
    expect(value(r, 'q')).toBeCloseTo(3.35333, 4);
  });
  it('水 10 kW・Δt 5 K → 約 28.7 L/min', () => {
    const r = run(sensibleHeat, { fluid: 'water', method: 'flow', Q: '10', dt: '5' });
    expect(value(r, 'm')).toBeCloseTo(0.477783, 5);
    expect(value(r, 'V')).toBeCloseTo(28.667, 2);
  });
  it('空気 10 kW・Δt 10 K → 約 2982 m³/h', () => {
    const r = run(sensibleHeat, { fluid: 'air', method: 'flow', Q: '10' });
    expect(value(r, 'V')).toBeCloseTo(2982.1, 0);
    expectExcelMatches(r);
  });
});

describe('CM-06 設備機器の耐震（アンカーボルト）', () => {
  it('既定値：W 10 kN・KH 1.0・KV = KH/2 → Rb 3.75 kN、Q 2.5 kN、判定 OK', () => {
    const r = run(seismicAnchor);
    expect(value(r, 'KV')).toBeCloseTo(0.5);
    expect(value(r, 'FH')).toBeCloseTo(10);
    expect(value(r, 'FV')).toBeCloseTo(5);
    expect(value(r, 'Rb')).toBeCloseTo(3.75);
    expect(value(r, 'Q')).toBeCloseTo(2.5);
    expect(value(r, 'okT')).toBe('OK');
    expect(value(r, 'okQ')).toBe('OK');
    expect(r.warnings).toEqual([]);
  });
  it('判定の切り替わり（許容引抜力 3.75 は OK、3.7 は NG）', () => {
    expect(value(run(seismicAnchor, { Ta: '3.75' }), 'okT')).toBe('OK');
    const ng = run(seismicAnchor, { Ta: '3.7', Qa: '2.4' });
    expect(value(ng, 'okT')).toBe('NG');
    expect(value(ng, 'okQ')).toBe('NG');
    expect(ng.warnings.length).toBe(2);
    expectExcelMatches(ng);
  });
  it('引抜力が負なら 0 とし、その旨を表示する', () => {
    const r = run(seismicAnchor, { hG: '100' });
    expect(value(r, 'Rb0')).toBeCloseTo(-0.625);
    expect(value(r, 'Rb')).toBe(0);
    expect(r.warnings.length).toBe(1);
    expectExcelMatches(r);
  });
  it('告示第1388号（給湯設備・中間階・Z 1.0）→ KH 0.6、Rb 1.25 kN', () => {
    const r = run(seismicAnchor, { basis: 'k1388', floor: 'mid', Z: '1' });
    expect(value(r, 'Ks')).toBe(0.6);
    expect(value(r, 'KH')).toBeCloseTo(0.6);
    expect(value(r, 'Rb')).toBeCloseTo(1.25);
    expect(value(r, 'Q')).toBeCloseTo(1.5);
  });
  it('告示第1388号の区分（地階・1階 0.4、上層階・屋上 1.0）', () => {
    expect(value(run(seismicAnchor, { basis: 'k1388', floor: 'low' }), 'Ks')).toBe(0.4);
    expect(value(run(seismicAnchor, { basis: 'k1388', floor: 'top' }), 'Ks')).toBe(1.0);
  });
  it('告示第1389号（Z 0.9）→ KH 0.9', () => {
    const r = run(seismicAnchor, { basis: 'k1389', Z: '0.9' });
    expect(value(r, 'KH')).toBeCloseTo(0.9);
    expect(value(r, 'FH')).toBeCloseTo(9);
  });
  it('鉛直震度を考慮しない場合 Rb = 2.5 kN', () => {
    expect(value(run(seismicAnchor, { kvmode: 'zero' }), 'Rb')).toBeCloseTo(2.5);
    expect(value(run(seismicAnchor, { kvmode: 'input', KV: '0.25' }), 'Rb')).toBeCloseTo(3.125);
  });
  it('引張側の本数が総本数を超えるとエラー', () => {
    expect(() => run(seismicAnchor, { nt: '5', n: '4' })).toThrow();
  });
});

describe('CM-03 浮動小数点の境界', () => {
  it('50 kW × 1.1 = 55 kW は 55 kW を選ぶ', () => {
    const r = run(shaftPower, { kind: 'fan', Qf: '3000', Pt: '600', eta: '0.6', alpha: '0.1', series: 'c4212' });
    expect(value(r, 'PR')).toBe(55);
    expectExcelMatches(r);
  });
});
