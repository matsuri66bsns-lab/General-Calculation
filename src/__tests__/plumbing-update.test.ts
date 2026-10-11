import { describe, expect, it } from 'vitest';
import { checkTool, expectExcelMatches, run, value } from './helpers';
import { waterTank } from '../tools/pl-01-water-tank';

describe('PL-01 受水槽・高置水槽容量（瞬時最大予想給水量の方式）', () => {
  it('共通検査', () => {
    checkTool(waterTank);
  });
  it('既定（便覧の方式）：Qp = 4 × 2.222 × 1000 ÷ 60 ≒ 148.1 L/min', () => {
    const r = run(waterTank);
    expect(value(r, 'Qp')).toBeCloseTo(148.148, 2);
    expect(value(r, 'k2')).toBe(4);
    expect(() => value(r, 'k2m')).toThrow();
    expect(value(r, 'Qpu')).toBeCloseTo(74.074, 2);
  });
  it('設計基準の方式：Qp = K₂ × Qm × 1000 ÷ 60', () => {
    const r = run(waterTank, { qpm: 'kijun', k2m: '1.5' });
    // Qm = 2 × 20 ÷ 9 = 4.444 m³/h → Qp = 1.5 × 4.444 × 1000 ÷ 60 = 111.1 L/min
    expect(value(r, 'Qm')).toBeCloseTo(4.4444, 3);
    expect(value(r, 'Qp')).toBeCloseTo(111.111, 2);
    expect(() => value(r, 'k2')).toThrow();
    // 水槽・揚水ポンプは方式によらない
    expect(value(r, 'Vs')).toBeCloseTo(10);
    expect(value(r, 'Qpu')).toBeCloseTo(74.074, 2);
    expectExcelMatches(r);
  });
  it('k₁ = 2、K₂ = 2 なら便覧の k₂ = 4 と同じ値になる', () => {
    const a = value(run(waterTank, { qpm: 'kijun', k2m: '2' }), 'Qp') as number;
    const b = value(run(waterTank, { qpm: 'binran', k2: '4' }), 'Qp') as number;
    expect(a).toBeCloseTo(b, 9);
  });
  it('計算書の解説が方式で切り替わる', () => {
    const kijun = waterTank.doc({ ...waterTank.defaults, qpm: 'kijun' });
    expect(kijun.formulas.some((f) => f.expr === 'Qp = K₂ × Qm × 1000 ÷ 60')).toBe(true);
    expect(kijun.symbols.some((d) => d.symbol === 'K₂')).toBe(true);
    const binran = waterTank.doc({ ...waterTank.defaults });
    expect(binran.formulas.some((f) => f.expr === 'Qp = k₂ × Qh × 1000 ÷ 60')).toBe(true);
  });
});
