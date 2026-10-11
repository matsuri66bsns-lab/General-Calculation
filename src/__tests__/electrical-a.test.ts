import { describe, expect, it } from 'vitest';
import { allowableCurrent } from '../tools/el-03-allowable-current';
import { mainFeeder } from '../tools/el-04-main-feeder';
import { branchCircuit } from '../tools/el-05-branch-circuit';
import { groundingResistance } from '../tools/el-11-grounding-resistance';
import { insulationResistance } from '../tools/el-12-insulation-resistance';
import { checkTool, expectExcelMatches, run, value } from './helpers';

const tools = [allowableCurrent, mainFeeder, branchCircuit, groundingResistance, insulationResistance];

describe('electrical-a 共通検査', () => {
  it.each(tools.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    expect(t.category).toBe('electrical');
    checkTool(t);
  });
});

describe('EL-03 絶縁電線の許容電流', () => {
  const t = allowableCurrent;
  it('2.0mm IV 3本 30℃：35 × 1.00 × 0.70 = 24.5 A', () => {
    const r = run(t, { w: 's2.0', ins: '60', Ta: '30', n: '3', Id: '20' });
    expect(value(r, 'k1')).toBeCloseTo(1);
    expect(value(r, 'Ia')).toBeCloseTo(24.5);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('30℃以下は 30℃として補正する', () => {
    const r = run(t, { ins: '60', Ta: '20' });
    expect(value(r, 'Tc')).toBe(30);
    expect(value(r, 'k1')).toBeCloseTo(1);
  });
  it('2.6mm 耐熱ビニル 40℃ 4本：48 × √(35/30) × 0.63', () => {
    const r = run(t, { w: 's2.6', ins: '75', Ta: '40', n: '4', Id: '30' });
    expect(value(r, 'k1')).toBeCloseTo(Math.sqrt(35 / 30));
    expect(value(r, 'Ia')).toBeCloseTo(32.663, 2);
    expectExcelMatches(r);
  });
  it('管に収めない 45℃：判定の切り替わり', () => {
    const base = { w: 's2.0', ins: '60', Ta: '45', n: 'none' };
    const r = run(t, { ...base, Id: '24' });
    expect(value(r, 'k2')).toBe(1);
    expect(value(r, 'Ia')).toBeCloseTo(24.749, 2);
    expect(value(r, 'ok')).toBe('OK');
    const ng = run(t, { ...base, Id: '25' });
    expect(value(ng, 'ok')).toBe('NG');
    expect(ng.warnings.length).toBe(1);
  });
  it('許容最高温度を入力', () => {
    expect(value(run(t, { ins: 'custom', Tm: '90', Ta: '30' }), 'k1')).toBeCloseTo(Math.SQRT2);
  });
  it('周囲温度が許容最高温度以上ならエラー', () => {
    expect(() => run(t, { ins: '60', Ta: '60' })).toThrow();
  });
});

describe('EL-04 低圧幹線', () => {
  const t = mainFeeder;
  it('ΣIM 60 A > 50 A：1.1 倍、遮断器上限 200 A', () => {
    const r = run(t, { IM: '60', IH: '20', iwMode: 'input', IW: '88', IB: '175' });
    expect(value(r, 'kM')).toBe(1.1);
    expect(value(r, 'IWr')).toBeCloseTo(86);
    expect(value(r, 'okW')).toBe('OK');
    expect(value(r, 'IB1')).toBeCloseTo(200);
    expect(value(r, 'IB2')).toBeCloseTo(220);
    expect(value(r, 'IBmax')).toBeCloseTo(200);
    expect(value(r, 'okB')).toBe('OK');
  });
  it('50 A の境界（1.25 倍 → 1.1 倍）', () => {
    expect(value(run(t, { IM: '50', IH: '10', iwMode: 'req' }), 'IWr')).toBeCloseTo(72.5);
    expect(value(run(t, { IM: '51', IH: '10', iwMode: 'req' }), 'IWr')).toBeCloseTo(66.1);
  });
  it('ΣIM ≤ ΣIH は割り増しなし', () => {
    const r = run(t, { IM: '30', IH: '30', iwMode: 'req' });
    expect(value(r, 'kM')).toBe(1);
    expect(value(r, 'IWr')).toBeCloseTo(60);
  });
  it('必要値で計算：ΣIM 40、ΣIH 20 → IW 70、上限 min(140, 175) = 140', () => {
    const r = run(t, { IM: '40', IH: '20', iwMode: 'req', IB: '150' });
    expect(value(r, 'IW')).toBeCloseTo(70);
    expect(value(r, 'IBmax')).toBeCloseTo(140);
    expect(value(r, 'okB')).toBe('NG');
  });
  it('2.5 倍で頭打ち', () => {
    const r = run(t, { IM: '100', IH: '0', iwMode: 'input', IW: '110', IB: '275' });
    expect(value(r, 'IWr')).toBeCloseTo(110);
    expect(value(r, 'IBmax')).toBeCloseTo(275);
    expect(value(r, 'okB')).toBe('OK');
  });
  it('上限は幹線の許容電流を下回らない／電動機等なしは許容電流', () => {
    expect(value(run(t, { IM: '10', IH: '100', iwMode: 'input', IW: '150' }), 'IBmax')).toBeCloseTo(150);
    const r = run(t, { IM: '0', IH: '50', iwMode: 'req' });
    expect(value(r, 'IBmax')).toBeCloseTo(50);
    expectExcelMatches(r);
  });
  it('電線が細いと NG', () => {
    expect(value(run(t, { IM: '60', IH: '20', iwMode: 'input', IW: '61' }), 'okW')).toBe('NG');
  });
  it('負荷が 0 ならエラー', () => {
    expect(() => run(t, { IM: '0', IH: '0' })).toThrow();
  });
});

describe('EL-05 低圧分岐回路', () => {
  const t = branchCircuit;
  it('20A 配線用遮断器・1.6mm・15A コンセント', () => {
    const r = run(t, { cb: '20m', w: 's1.6', o: '15' });
    expect(value(r, 'wmin')).toBe('直径 1.6 mm');
    expect(value(r, 'okW')).toBe('OK');
    expect(value(r, 'okO')).toBe('OK');
  });
  it('20A ヒューズ等は 2.0mm 以上、コンセント 20A', () => {
    expect(value(run(t, { cb: '20f', w: 's1.6', o: '20' }), 'okW')).toBe('NG');
    expect(value(run(t, { cb: '20f', w: 's2.0', o: '20' }), 'okW')).toBe('OK');
    expect(value(run(t, { cb: '20f', w: 's2.0', o: '15' }), 'okO')).toBe('NG');
  });
  it('30A：5.5mm² は 2.6mm 以上、3.5mm² は不足、コンセント 20〜30A', () => {
    expect(value(run(t, { cb: '30', w: 'y5.5', o: '30' }), 'okW')).toBe('OK');
    expect(value(run(t, { cb: '30', w: 'y3.5', o: '30' }), 'okW')).toBe('NG');
    expect(value(run(t, { cb: '30', w: 'y5.5', o: '20' }), 'okO')).toBe('OK');
    expect(value(run(t, { cb: '30', w: 'y5.5', o: '15' }), 'okO')).toBe('NG');
  });
  it('40A は 8mm²、50A は 14mm²', () => {
    expect(value(run(t, { cb: '40', w: 's3.2', o: '40' }), 'okW')).toBe('OK');
    expect(value(run(t, { cb: '40', w: 's3.2', o: '50' }), 'okO')).toBe('NG');
    expect(value(run(t, { cb: '50', w: 'y8', o: '50' }), 'okW')).toBe('NG');
    expect(value(run(t, { cb: '50', w: 'y14', o: '40' }), 'okW')).toBe('OK');
  });
  it('2mm² より線は 1.6mm と同等、コンセントなしは判定しない', () => {
    const r = run(t, { cb: '15', w: 'y2', o: 'none' });
    expect(value(r, 'okW')).toBe('OK');
    expect(() => value(r, 'okO')).toThrow();
  });
});

describe('EL-11 接地抵抗', () => {
  const t = groundingResistance;
  it('B種 Ig 10 A：150 ÷ 10 = 15Ω', () => {
    const r = run(t, { kind: 'B', Ig: '10', cut: 'none', Rm: '12' });
    expect(value(r, 'Rs')).toBeCloseTo(15);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('B種 自動遮断で 300/Ig、600/Ig', () => {
    expect(value(run(t, { kind: 'B', Ig: '5', cut: '2s' }), 'Rs')).toBeCloseTo(60);
    expect(value(run(t, { kind: 'B', Ig: '5', cut: '1s' }), 'Rs')).toBeCloseTo(120);
  });
  it('A種 10Ω（境界）', () => {
    expect(value(run(t, { kind: 'A', Rm: '10' }), 'ok')).toBe('OK');
    expect(value(run(t, { kind: 'A', Rm: '10.5' }), 'ok')).toBe('NG');
  });
  it('C種・D種と 0.5 秒以内の自動遮断', () => {
    expect(value(run(t, { kind: 'C', leak: 'no' }), 'Rs')).toBe(10);
    expect(value(run(t, { kind: 'C', leak: 'yes' }), 'Rs')).toBe(500);
    expect(value(run(t, { kind: 'D', leak: 'no' }), 'Rs')).toBe(100);
    expect(value(run(t, { kind: 'D', leak: 'yes', Rm: '300' }), 'ok')).toBe('OK');
  });
  it('接地線の太さ', () => {
    expect(String(value(run(t, { kind: 'A' }), 'wire'))).toContain('2.6 mm');
    expect(String(value(run(t, { kind: 'D' }), 'wire'))).toContain('1.6 mm');
  });
});

describe('EL-12 絶縁抵抗', () => {
  const t = insulationResistance;
  it('区分ごとの基準値', () => {
    expect(value(run(t, { cls: 'le150' }), 'Rs')).toBe(0.1);
    expect(value(run(t, { cls: 'le300' }), 'Rs')).toBe(0.2);
    expect(value(run(t, { cls: 'gt300' }), 'Rs')).toBe(0.4);
  });
  it('境界値の判定', () => {
    expect(value(run(t, { cls: 'le150', Rm: '0.1' }), 'ok')).toBe('OK');
    expect(value(run(t, { cls: 'le150', Rm: '0.09' }), 'ok')).toBe('NG');
    expect(value(run(t, { cls: 'gt300', Rm: '0.3' }), 'ok')).toBe('NG');
  });
});
