import { describe, expect, it } from 'vitest';
import { checkTool, expectExcelMatches, run, value } from './helpers';
import { coolingHeatingLoad } from '../tools/hv-02-cooling-heating-load';
import { outdoorAirLoad } from '../tools/hv-03-outdoor-air-load';
import { psychrometrics, dewPoint, pwsTetens } from '../tools/hv-04-psychrometrics';
import { uValueCondensation } from '../tools/hv-05-u-value-condensation';

const TOOLS = [coolingHeatingLoad, outdoorAirLoad, psychrometrics, uValueCondensation];

describe('空調（hv-a）共通検査', () => {
  it.each(TOOLS.map((t) => [t.id, t] as const))('%s：計算・Excel 式・記号の説明・初学者向け解説', (_id, t) => {
    expect(t.category).toBe('hvac');
    checkTool(t);
  });
});

describe('HV-02 室の冷暖房負荷', () => {
  const t = coolingHeatingLoad;
  it('冷房（既定値の事務室 50 m²）', () => {
    const r = run(t);
    expect(value(r, 'qw')).toBeCloseTo(240);
    expect(value(r, 'qr')).toBeCloseTo(500);
    expect(value(r, 'qgc')).toBeCloseTo(240);
    expect(value(r, 'qgs')).toBeCloseTo(2000);
    expect(value(r, 'qi')).toBeCloseTo(120);
    expect(value(r, 'qis')).toBeCloseTo(79.2);
    expect(value(r, 'qil')).toBeCloseTo(212.67, 2);
    expect(value(r, 'qS')).toBeCloseTo(5129.2);
    expect(value(r, 'qL')).toBeCloseTo(812.67, 2);
    expect(value(r, 'qT')).toBeCloseTo(5941.87, 2);
    expect(value(r, 'SHF')).toBeCloseTo(0.86323, 4);
    expect(value(r, 'qD')).toBeCloseTo(6536.057, 2);
    expect(value(r, 'qA')).toBeCloseTo(130.721, 2);
  });
  it('暖房は日射・人体・照明・機器を見込まない', () => {
    const r = run(t, { mode: 'heat' });
    // 外気 0 °C・室内 22 °C（Δt = 22）、Δx = 0.0065 − 0.0020 = 0.0045、隣室との温度差 5
    expect(value(r, 'dt')).toBeCloseTo(22);
    expect(value(r, 'qw')).toBeCloseTo(660);
    expect(value(r, 'qr')).toBeCloseTo(550);
    expect(value(r, 'qgc')).toBeCloseTo(660);
    expect(value(r, 'qi')).toBeCloseTo(200);
    expect(value(r, 'qS')).toBeCloseTo(2287.8);
    expect(value(r, 'qL')).toBeCloseTo(112.59);
    expect(value(r, 'qD')).toBeCloseTo(2640.429, 2);
    expect(() => value(r, 'qgs')).toThrow();
    expect(() => value(r, 'qhs')).toThrow();
  });
  it('負荷が 0 ならエラー', () => {
    expect(() =>
      run(t, { mode: 'heat', Aw: '0', Ar: '0', Ag: '0', Ai: '0', Qinf: '0' }),
    ).toThrow();
  });
});

describe('HV-03 外気負荷・すきま風負荷', () => {
  const t = outdoorAirLoad;
  it('絶対湿度で入力', () => {
    const r = run(t, { Q: '500', to: '33', ti: '26', xo: '0.0180', xi: '0.0105' });
    expect(value(r, 'qs')).toBeCloseTo(1155);
    expect(value(r, 'qL')).toBeCloseTo(3127.5);
    expect(value(r, 'qT')).toBeCloseTo(4282.5);
  });
  it('全熱交換器あり', () => {
    const r = run(t, { hex: 'yes', et: '70', ex: '60' });
    expect(value(r, 'qs2')).toBeCloseTo(346.5);
    expect(value(r, 'qL2')).toBeCloseTo(1251);
    expect(value(r, 'qT2')).toBeCloseTo(1597.5);
    expect(value(r, 'qR')).toBeCloseTo(2685);
    expectExcelMatches(r);
  });
  it('相対湿度で入力（HV-04 と同じ絶対湿度になる）', () => {
    const r = run(t, { hmode: 'rh', to: '26', ti: '26', phio: '50', phii: '50', P: '101.325' });
    expect(value(r, 'xo')).toBeCloseTo(0.0104904, 6);
    expect(value(r, 'qL')).toBeCloseTo(0);
  });
  it('冬は負の値になり注意が出る', () => {
    const r = run(t, { to: '0', ti: '22', xo: '0.0020', xi: '0.0065' });
    expect(value(r, 'qs')).toBeCloseTo(-3630);
    expect(r.warnings.length).toBe(1);
  });
});

describe('HV-04 湿り空気の状態', () => {
  const t = psychrometrics;
  it('Tetens の式と露点の逆算が往復で一致する', () => {
    for (const x of [-10, 0, 15, 30]) expect(dewPoint(pwsTetens(x))).toBeCloseTo(x, 9);
    expect(pwsTetens(0)).toBeCloseTo(0.61078, 6);
  });
  it('26 °C・50 %', () => {
    const r = run(t, { method: 'rh', t: '26', phi: '50', P: '101.325' });
    expect(value(r, 'pws')).toBeCloseTo(3.36113, 4);
    expect(value(r, 'x')).toBeCloseTo(0.0104904, 6);
    expect(value(r, 'tdC')).toBeCloseTo(14.774, 2);
    expect(value(r, 'h')).toBeCloseTo(52.885, 2);
    expect(value(r, 'vs')).toBeCloseTo(0.86175, 4);
  });
  it('露点から：露点 = 乾球温度なら相対湿度 100 %', () => {
    const r = run(t, { method: 'dp', t: '20', td: '20' });
    expect(value(r, 'phiC')).toBeCloseTo(100);
  });
  it('湿球から：湿球 = 乾球なら飽和（100 %）', () => {
    const r = run(t, { method: 'wb', t: '25', tw: '25' });
    expect(value(r, 'phiC')).toBeCloseTo(100, 6);
    expect(value(r, 'tdC')).toBeCloseTo(25, 6);
  });
  it('湿球 19 °C・乾球 26 °C', () => {
    const r = run(t, { method: 'wb', t: '26', tw: '19' });
    expect(value(r, 'x')).toBeCloseTo(0.0108635, 6);
    expect(value(r, 'phiC')).toBeCloseTo(51.75, 1);
  });
  it('湿球・露点が乾球より高いとエラー', () => {
    expect(() => run(t, { method: 'wb', t: '20', tw: '21' })).toThrow();
    expect(() => run(t, { method: 'dp', t: '20', td: '21' })).toThrow();
  });
});

describe('HV-05 熱貫流率と表面結露の判定', () => {
  const t = uValueCondensation;
  it('RC 外壁＋断熱 25 mm（既定値）', () => {
    const r = run(t);
    expect(value(r, 'RT')).toBeCloseTo(1.14994, 4);
    expect(value(r, 'U')).toBeCloseTo(0.86961, 4);
    expect(value(r, 'ths')).toBeCloseTo(18.0869, 3);
    expect(value(r, 'tdi')).toBeCloseTo(9.2693, 3);
    expect(value(r, 'ok')).toBe('OK');
    expect(value(r, 'phiLim')).toBeCloseTo(88.75, 1);
  });
  it('断熱なしで外気 −5 °C なら結露のおそれ（NG）', () => {
    const base = { d1: '0', d2: '150', l2: '1.6', d3: '0', ti: '20', phii: '50' };
    const ok = run(t, { ...base, to: '0' });
    expect(value(ok, 'U')).toBeCloseTo(4.10256, 4);
    expect(value(ok, 'ths')).toBeCloseTo(10.974, 2);
    expect(value(ok, 'ok')).toBe('OK');
    const ng = run(t, { ...base, to: '-5' });
    expect(value(ng, 'ths')).toBeCloseTo(8.718, 2);
    expect(value(ng, 'ok')).toBe('NG');
    expect(ng.warnings.length).toBe(1);
    expectExcelMatches(ng);
  });
  it('表面温度 = 露点の境界は NG', () => {
    // 層なし：U = 1 / (0.11 + 0.04)。θs = 20 − 0.11/0.15 × 20 = 5.333…
    // φi を θs が露点ちょうどになる値にすると NG（θs ≤ td）
    const ths = 20 - (0.11 / 0.15) * 20;
    const phi = (pwsTetens(ths) / pwsTetens(20)) * 100;
    const r = run(t, { d1: '0', d2: '0', d3: '0', Ra: '0', to: '0', ti: '20', phii: String(phi + 1e-9) });
    expect(value(r, 'ok')).toBe('NG');
    const r2 = run(t, { d1: '0', d2: '0', d3: '0', Ra: '0', to: '0', ti: '20', phii: String(phi - 0.01) });
    expect(value(r2, 'ok')).toBe('OK');
  });
  it('部位を選ぶと表面熱伝達抵抗が入る（建築研究所 表3.1）', () => {
    const r = run(t, { part: 'floor' });
    expect(value(r, 'Rsi')).toBe(0.15);
    expect(value(r, 'Rse')).toBe(0.04);
    const r2 = run(t, { part: 'ceiling' });
    expect(value(r2, 'Rsi')).toBe(0.09);
    expect(value(r2, 'Rse')).toBe(0.09);
  });
});
