import { describe, expect, it } from 'vitest';
import { heatRemovalVentilation } from '../tools/hv-06-heat-removal-ventilation';
import { sickHouseVentilation } from '../tools/hv-07-sick-house-ventilation';
import { ductSizing, equivalentDiameter } from '../tools/hv-08-duct-sizing';
import { fanStaticPressure } from '../tools/hv-09-fan-static-pressure';
import { chilledWaterFlow } from '../tools/hv-10-chilled-water-flow';
import { circulationPumpHead } from '../tools/hv-11-circulation-pump-head';
import { supplyAirVolume } from '../tools/hv-13-supply-air-volume';
import { checkTool, expectExcelMatches, run, value } from './helpers';

const TOOLS = [heatRemovalVentilation, sickHouseVentilation, ductSizing, fanStaticPressure, chilledWaterFlow, circulationPumpHead, supplyAirVolume];

describe('空調（hvac-b）共通検査', () => {
  it.each(TOOLS.map((t) => [t.id, t] as const))('%s：計算・Excel 式・記号の説明・初学者向け解説', (_id, t) => {
    checkTool(t);
    expect(t.category).toBe('hvac');
    expect(t.publishedAt).toBe('2026-10-10');
  });
});

describe('HV-06 発熱除去の換気量', () => {
  const t = heatRemovalVentilation;
  it('変圧器 1000kVA × 1.5% + 3kW、40℃ / 35℃', () => {
    const r = run(t);
    expect(value(r, 'q')).toBeCloseTo(18);
    expect(value(r, 'dt')).toBeCloseTo(5);
    // 3600 × 18 ÷ (1.2 × 1.006 × 5) = 64800 ÷ 6.036
    expect(value(r, 'Qv')).toBeCloseTo(10735.586, 2);
    expect(value(r, 'Qm')).toBeCloseTo(178.926, 2);
  });
  it('発熱量・温度上昇を直接入力', () => {
    const r = run(t, { qmode: 'direct', q: '10', dtmode: 'dt', dt: '10' });
    expect(value(r, 'Qv')).toBeCloseTo(36000 / 12.072, 3);
    expectExcelMatches(r);
  });
  it('外気温度が室温上限以上ならエラー', () => {
    expect(() => run(t, { ti: '35', to: '35' })).toThrow();
  });
  it('温度上昇が小さいと警告', () => {
    expect(run(t, { dtmode: 'dt', dt: '2' }).warnings.length).toBe(1);
  });
});

describe('HV-07 シックハウス対策の換気量', () => {
  const t = sickHouseVentilation;
  it('住宅等の居室 20m² × 2.4m → 24 m³/h、計画 30 m³/h は OK', () => {
    const r = run(t);
    expect(value(r, 'n')).toBe(0.5);
    expect(value(r, 'Vr')).toBeCloseTo(24);
    expect(value(r, 'np')).toBeCloseTo(0.625);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('その他の居室は 0.3 回/h', () => {
    const r = run(t, { kind: 'other', A: '100', h: '2.7', Vp: '81' });
    expect(value(r, 'Vr')).toBeCloseTo(81);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('判定の境界（必要量ちょうどは OK、下回れば NG）', () => {
    expect(value(run(t, { Vp: '24' }), 'ok')).toBe('OK');
    const ng = run(t, { Vp: '23.9' });
    expect(value(ng, 'ok')).toBe('NG');
    expect(ng.warnings.length).toBe(1);
    expectExcelMatches(ng);
  });
});

/** 検算用：コールブルック式を十分に反復した管摩擦係数（D, ε は mm） */
function colebrook(D: number, Re: number, eps: number): number {
  let x = 7;
  for (let i = 0; i < 100; i++) x = -2 * Math.log10(eps / (3.7 * D) + (2.51 * x) / Re);
  return 1 / (x * x);
}

describe('HV-08 ダクトの寸法', () => {
  const t = ductSizing;
  it('3000 m³/h、1 Pa/m：必要直径はコールブルック式とダルシー式を満たす', () => {
    const r = run(t);
    const D = value(r, 'D') as number;
    expect(D).toBeGreaterThan(410);
    expect(D).toBeLessThan(420);
    expect(value(r, 'Rc')).toBeCloseTo(1, 6);
    // 十分に反復したコールブルック式でも R ≒ 1 Pa/m になる
    const v = 3000 / 3600 / ((Math.PI * (D / 1000) ** 2) / 4);
    expect(value(r, 'v')).toBeCloseTo(v, 9);
    const lam = colebrook(D, (v * 1000 * D) / 15.1, 0.15);
    expect(value(r, 'lam')).toBeCloseTo(lam, 6);
    expect(((lam / (D / 1000)) * 1.2 * v * v) / 2).toBeCloseTo(1, 4);
    expect(value(r, 'Ds')).toBe(450);
  });
  it('アスペクト比 2：短辺 300、長辺 600', () => {
    const r = run(t);
    expect(value(r, 'br')).toBeCloseTo(273.0, 0);
    expect(value(r, 'b')).toBe(300);
    expect(value(r, 'a')).toBe(600);
    expect(value(r, 'De')).toBeCloseTo(equivalentDiameter(600, 300), 9);
    expect(value(r, 'De')).toBeCloseTo(457.0, 0);
    expect(value(r, 'vr')).toBeCloseTo(4.6296, 3);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('短辺 250 指定：円形相当径がちょうど D になる長辺を切り上げ', () => {
    const r = run(t, { rmode: 'short', b: '250' });
    const D = value(r, 'D') as number;
    const ar = value(r, 'ar') as number;
    expect(equivalentDiameter(ar, 250)).toBeCloseTo(D, 6);
    expect(value(r, 'a')).toBe(650);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('短辺が大き過ぎると正方形にして警告', () => {
    const r = run(t, { rmode: 'short', b: '600' });
    expect(value(r, 'a')).toBe(600);
    expect(r.warnings.length).toBe(1);
    expectExcelMatches(r);
  });
  it('平たい寸法は警告', () => {
    expect(run(t, { k: '5' }).warnings.length).toBe(1);
  });
});

describe('HV-09 送風機の静圧・軸動力', () => {
  const t = fanStaticPressure;
  it('100 m³/min、全圧 560.4 Pa', () => {
    const r = run(t);
    expect(value(r, 'Pf')).toBeCloseTo(80);
    expect(value(r, 'Pz')).toBeCloseTo(230.4);
    expect(value(r, 'Pt')).toBeCloseTo(560.4);
    expect(value(r, 'Pvd')).toBeCloseTo(60);
    expect(value(r, 'Ps')).toBeCloseTo(500.4);
    expect(value(r, 'Psd')).toBeCloseTo(550.44);
    // 100 × 616.44 ÷ (60 × 1000 × 0.5)
    expect(value(r, 'P')).toBeCloseTo(2.0548, 4);
    expect(value(r, 'Pm')).toBeCloseTo(2.36302, 4);
  });
  it('吐出口の動圧が全圧以上なら警告', () => {
    const r = run(t, { L: '0', zeta: '0', Pe: '50', vd: '10' });
    expect(r.warnings.length).toBe(1);
    expectExcelMatches(r);
  });
});

describe('HV-10 冷温水量・冷却水量', () => {
  const t = chilledWaterFlow;
  it('冷水 100 kW、5 K → 286.7 L/min', () => {
    const r = run(t);
    expect(value(r, 'G')).toBeCloseTo(286.67, 2);
    expect(value(r, 'Gh')).toBeCloseTo(17.2, 2);
    // 簡易式 14.3 × q ÷ Δt とほぼ一致
    expect(value(r, 'G') as number).toBeCloseTo((14.3 * 100) / 5, -1);
  });
  it('冷却水：冷却能力 100 kW ＋ 入力 25 kW', () => {
    const r = run(t, { mode: 'cond', qe: '100', W: '25' });
    expect(value(r, 'q')).toBeCloseTo(125);
    expect(value(r, 'G')).toBeCloseTo(358.34, 2);
  });
  it('冷却水：COP 4 なら入力から求めた値と同じ', () => {
    const r = run(t, { mode: 'cop', qe: '100', cop: '4' });
    expect(value(r, 'W')).toBeCloseTo(25);
    expect(value(r, 'G')).toBeCloseTo(358.34, 2);
  });
});

describe('HV-11 冷温水ポンプの全揚程', () => {
  const t = circulationPumpHead;
  it('密閉回路：直管 200 m、400 Pa/m、局部 0.4、機器 120 kPa', () => {
    const r = run(t);
    expect(value(r, 'Pp')).toBeCloseTo(112);
    expect(value(r, 'hp')).toBeCloseTo(11.4208, 3);
    expect(value(r, 'he')).toBeCloseTo(12.2366, 3);
    expect(value(r, 'H')).toBeCloseTo(23.6574, 3);
    expect(value(r, 'Hd')).toBeCloseTo(26.0231, 3);
    // 1000 × 9.80665 × 0.005 × 26.0231 ÷ 600
    expect(value(r, 'P')).toBeCloseTo(2.1267, 3);
  });
  it('開放回路は実揚程を加える。相当長でも計算できる', () => {
    const r = run(t, { circuit: 'open', ha: '3', local: 'eq', Le: '80', pw: 'no' });
    // 400 × 280 ÷ 1000 = 112 kPa（割合 0.4 と同じ損失）
    expect(value(r, 'Pp')).toBeCloseTo(112);
    expect(value(r, 'H')).toBeCloseTo(26.6574, 3);
    expect(r.rows.some((x) => x.kind !== 'section' && x.key === 'P')).toBe(false);
    expectExcelMatches(r);
  });
});

describe('HV-13 空調機の送風量と顕熱比', () => {
  const t = supplyAirVolume;
  it('顕熱 10 kW、潜熱 2 kW、26 → 16 ℃', () => {
    const r = run(t);
    expect(value(r, 'Q')).toBeCloseTo(3030.30, 1);
    expect(value(r, 'Qm')).toBeCloseTo(50.505, 2);
    expect(value(r, 'SHF')).toBeCloseTo(0.8333, 3);
    expect(value(r, 'n')).toBeCloseTo(10.101, 2);
  });
  it('室容積 0 なら換気回数換算を省略。温度差を直接入力', () => {
    const r = run(t, { dtmode: 'dt', dt: '8', V: '0' });
    expect(value(r, 'Q')).toBeCloseTo(10000 / 2.64, 6);
    expect(r.rows.some((x) => x.kind !== 'section' && x.key === 'n')).toBe(false);
    expectExcelMatches(r);
  });
  it('吹出し温度が室温以上ならエラー、温度差が大きいと警告', () => {
    expect(() => run(t, { tr: '26', ts: '26' })).toThrow();
    expect(run(t, { dtmode: 'dt', dt: '13' }).warnings.length).toBe(1);
  });
});
