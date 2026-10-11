import { describe, expect, it } from 'vitest';
import { checkTool, expectExcelMatches, run, value } from './helpers';
import { waterSupplyPipe } from '../tools/pl-02-water-supply-pipe';
import { hazenWilliams } from '../tools/pl-03-hazen-williams';
import { boosterPumpHead } from '../tools/pl-04-booster-pump-head';
import { hotWaterSupply } from '../tools/pl-05-hot-water-supply';
import { drainagePipe } from '../tools/pl-06-drainage-pipe';
import { roofRainwater } from '../tools/pl-09-roof-rainwater';
import { septicTankPopulation } from '../tools/pl-11-septic-tank-population';
import { toiletFixtureCount } from '../tools/pl-12-toilet-fixture-count';
import { USES } from '../tools/docs/pl-11';

const TOOLS = [waterSupplyPipe, hazenWilliams, boosterPumpHead, hotWaterSupply, drainagePipe, roofRainwater, septicTankPopulation, toiletFixtureCount];

describe('給排水衛生：共通検査', () => {
  it.each(TOOLS.map((t) => [t.id, t] as const))('%s', (_id, t) => {
    expect(t.category).toBe('plumbing');
    checkTool(t);
  });
});

describe('PL-03 給水管の摩擦損失', () => {
  it('100 L/min、内径 40 mm、50 m、C = 130', () => {
    const r = run(hazenWilliams, { Q: '100', D: '40', L: '50', C: '130' });
    expect(value(r, 'hf')).toBeCloseTo(3.053, 3);
    expect(value(r, 'dp')).toBeCloseTo(29.94, 2);
    expect(value(r, 'i')).toBeCloseTo(0.5988, 4);
    expect(value(r, 'v')).toBeCloseTo(1.3263, 4);
    expect(r.warnings).toEqual([]);
  });
  it('流速が 2.0 m/s を超えると注意を出す', () => {
    const r = run(hazenWilliams, { Q: '200', D: '40' });
    expect(value(r, 'v') as number).toBeGreaterThan(2);
    expect(r.warnings.length).toBe(1);
  });
});

describe('PL-02 給水負荷単位と給水管径', () => {
  it('既定値：ΣFU = 70、必要内径 46.1 mm、内径 50 mm で OK', () => {
    const r = run(waterSupplyPipe);
    expect(value(r, 'FU')).toBe(70);
    expect(value(r, 'Dr')).toBeCloseTo(46.066, 2);
    expect(value(r, 'v')).toBeCloseTo(1.6977, 3);
    expect(value(r, 'ok')).toBe('OK');
    expect(value(r, 'i')).toBeCloseTo(0.7282, 3);
  });
  it('内径 40 mm では流速超過で NG', () => {
    const r = run(waterSupplyPipe, { D: '40' });
    expect(value(r, 'ok')).toBe('NG');
    expect(r.warnings.length).toBe(1);
  });
  it('器具がすべて 0 個でも計算でき、注意を出す', () => {
    const r = run(waterSupplyPipe, { fx: JSON.stringify([{ name: '洗面器', n: '0', u: '2' }]) });
    expect(value(r, 'FU')).toBe(0);
    expect(r.warnings.length).toBe(1);
    expectExcelMatches(r);
  });
});

describe('PL-04 給水ポンプの全揚程', () => {
  it('加圧給水ポンプ（直管長から計算）', () => {
    const r = run(boosterPumpHead, { mode: 'booster', hfm: 'calc', ha: '30', Lp: '60', ip: '0.3', kl: '50', p: '70', mg: '10', Q: '200', eta: '0.55' });
    expect(value(r, 'hfk')).toBeCloseTo(27);
    expect(value(r, 'hf')).toBeCloseTo(2.7532, 4);
    expect(value(r, 'hp')).toBeCloseTo(7.1380, 4);
    expect(value(r, 'H')).toBeCloseTo(43.880, 3);
    expect(value(r, 'Pw')).toBeCloseTo(1.4344, 4);
    expect(value(r, 'Ps')).toBeCloseTo(2.6080, 4);
  });
  it('揚水ポンプ（損失を直接入力）は器具の圧力を加えない', () => {
    const r = run(boosterPumpHead, { mode: 'lift', hfm: 'direct', ha: '35', hf: '5', mg: '20', Q: '0' });
    expect(value(r, 'H0')).toBeCloseTo(40);
    expect(value(r, 'H')).toBeCloseTo(48);
    expect(() => value(r, 'hp')).toThrow();
    expect(() => value(r, 'Ps')).toThrow();
    expectExcelMatches(r);
  });
});

describe('PL-05 給湯量・加熱能力・貯湯容量', () => {
  it('事務所 200人', () => {
    const r = run(hotWaterSupply, { N: '200', qd: '10', qh: '0.2', th: '60', tc: '5', kv: '1' });
    expect(value(r, 'Qd')).toBeCloseTo(2000);
    expect(value(r, 'Qh')).toBeCloseTo(400);
    expect(value(r, 'H')).toBeCloseTo(25.581, 3);
    expect(value(r, 'V')).toBeCloseTo(400);
  });
  it('給湯温度が給水温度以下ならエラー', () => {
    expect(() => run(hotWaterSupply, { th: '10', tc: '10' })).toThrow();
  });
});

describe('PL-06 排水負荷単位と排水管径', () => {
  it('既定値：ΣDFU = 46、100 mm 横枝管で OK', () => {
    const r = run(drainagePipe);
    expect(value(r, 'DFU')).toBe(46);
    expect(value(r, 'okLoad')).toBe('OK');
    expect(value(r, 'okSize')).toBe('OK');
    expect(value(r, 'ok')).toBe('OK');
  });
  it('許容値ちょうどは OK、超えると NG', () => {
    expect(value(run(drainagePipe, { DFUa: '46' }), 'okLoad')).toBe('OK');
    const r = run(drainagePipe, { DFUa: '45.9' });
    expect(value(r, 'okLoad')).toBe('NG');
    expect(value(r, 'ok')).toBe('NG');
  });
  it('器具の排水口径より細い管は NG', () => {
    const r = run(drainagePipe, { D: '65', Do: '75' });
    expect(value(r, 'okSize')).toBe('NG');
    expectExcelMatches(r);
  });
});

describe('PL-09 屋根雨水の排水量と管径', () => {
  it('屋根 500 m² + 壁 100 m² × 50 %、120 mm/h、2 本', () => {
    const r = run(roofRainwater, { A: '500', Aw: '100', beta: '50', r: '120', N: '2', Aal: '425' });
    expect(value(r, 'At')).toBeCloseTo(550);
    expect(value(r, 'Q')).toBeCloseTo(18.333, 3);
    expect(value(r, 'Ae')).toBeCloseTo(660);
    expect(value(r, 'Ae1')).toBeCloseTo(330);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('1 本にすると許容面積を超えて NG', () => {
    expect(value(run(roofRainwater, { N: '1' }), 'ok')).toBe('NG');
  });
});

describe('PL-11 浄化槽の処理対象人員', () => {
  it('事務所（厨房なし）3,000 m² → 180 人、厨房あり → 225 人', () => {
    expect(value(run(septicTankPopulation, { use: 'office', A: '3000' }), 'n')).toBeCloseTo(180);
    expect(value(run(septicTankPopulation, { use: 'office_k', A: '3000' }), 'n')).toBeCloseTo(225);
  });
  it('住宅：130 m² 以下は 5 人、超えると 7 人', () => {
    expect(value(run(septicTankPopulation, { use: 'house', A: '130' }), 'n')).toBe(5);
    expect(value(run(septicTankPopulation, { use: 'house', A: '130.5' }), 'n')).toBe(7);
  });
  it('共同住宅（戸数で計算）：下限 3.5 人・1居室 2 人・上限 6 人', () => {
    const base = { use: 'apt', aptm: 'unit', Nd: '20' };
    expect(value(run(septicTankPopulation, { ...base, a: '60', room: 'multi' }), 'n')).toBeCloseTo(70);
    expect(value(run(septicTankPopulation, { ...base, a: '60', room: 'one' }), 'n')).toBeCloseTo(40);
    expect(value(run(septicTankPopulation, { ...base, a: '70', room: 'multi' }), 'n')).toBeCloseTo(70);
    expect(value(run(septicTankPopulation, { ...base, a: '100', room: 'multi' }), 'n')).toBeCloseTo(100);
    const big = run(septicTankPopulation, { ...base, a: '150', room: 'multi' });
    expect(value(big, 'n1c')).toBe(6);
    expect(value(big, 'n')).toBeCloseTo(120);
    expectExcelMatches(big);
  });
  it('共同住宅（延べ面積の合計）：n = 0.05A と注意', () => {
    const r = run(septicTankPopulation, { use: 'apt', aptm: 'total', A: '2000' });
    expect(value(r, 'n')).toBeCloseTo(100);
    expect(r.warnings.length).toBe(1);
  });
  it('病院（厨房あり）：299 床 → 2,392 人、300 床 → 2,400 人、400 床 → 3,543 人', () => {
    expect(value(run(septicTankPopulation, { use: 'hosp_k', B: '299' }), 'n')).toBeCloseTo(2392);
    expect(value(run(septicTankPopulation, { use: 'hosp_k', B: '300' }), 'n')).toBeCloseTo(2400);
    expect(value(run(septicTankPopulation, { use: 'hosp_k', B: '400' }), 'n')).toBeCloseTo(3543);
    expect(value(run(septicTankPopulation, { use: 'hosp', B: '400' }), 'n')).toBeCloseTo(2214);
  });
  it('駅：乗降客数の区分の境界', () => {
    expect(value(run(septicTankPopulation, { use: 'station', Pp: '99999' }), 'k')).toBe(0.008);
    expect(value(run(septicTankPopulation, { use: 'station', Pp: '100000' }), 'n')).toBeCloseTo(1000);
    const r = run(septicTankPopulation, { use: 'station', Pp: '200000' });
    expect(value(r, 'n')).toBeCloseTo(2600);
    expectExcelMatches(r);
  });
  it('プール：(20C + 120U) ÷ 8 × t', () => {
    expect(value(run(septicTankPopulation, { use: 'pool', Cb: '4', U: '4', t: '1.5' }), 'n')).toBeCloseTo(105);
    expect(run(septicTankPopulation, { use: 'parking', t: '0.3' }).warnings.length).toBe(1);
  });
  it('面積・定員などの比例式（店舗・学校・モーテル）', () => {
    expect(value(run(septicTankPopulation, { use: 'shop', A: '200' }), 'n')).toBeCloseTo(15);
    expect(value(run(septicTankPopulation, { use: 'school', P: '500' }), 'n')).toBeCloseTo(100);
    expect(value(run(septicTankPopulation, { use: 'motel', R: '20' }), 'n')).toBeCloseTo(100);
  });
  it('すべての用途で Excel 式が一致する', () => {
    for (const u of USES) expectExcelMatches(run(septicTankPopulation, { use: u.value }), u.value);
  });
});

describe('PL-12 事業場の便所の必要個数', () => {
  it('男性 70・女性 30、独立個室型なし', () => {
    const r = run(toiletFixtureCount, { M: '70', F: '30', k: '0' });
    expect(value(r, 'wcM')).toBe(2);
    expect(value(r, 'urM')).toBe(3);
    expect(value(r, 'wcF')).toBe(2);
    expect(value(r, 'sp')).toBe('適用できない');
  });
  it('独立個室型 1 個で男女それぞれ 10 人を差し引く', () => {
    const r = run(toiletFixtureCount, { M: '70', F: '30', k: '1' });
    expect(value(r, 'Me')).toBe(60);
    expect(value(r, 'Fe')).toBe(20);
    expect(value(r, 'wcM')).toBe(1);
    expect(value(r, 'urM')).toBe(2);
    expect(value(r, 'wcF')).toBe(1);
  });
  it('境界：60 人は 1、61 人は 2（男性用大便所）、20 人は 1、21 人は 2（女性用）', () => {
    expect(value(run(toiletFixtureCount, { M: '60' }), 'wcM')).toBe(1);
    expect(value(run(toiletFixtureCount, { M: '61' }), 'wcM')).toBe(2);
    expect(value(run(toiletFixtureCount, { M: '30' }), 'urM')).toBe(1);
    expect(value(run(toiletFixtureCount, { M: '31' }), 'urM')).toBe(2);
    expect(value(run(toiletFixtureCount, { F: '20' }), 'wcF')).toBe(1);
    expect(value(run(toiletFixtureCount, { F: '21' }), 'wcF')).toBe(2);
  });
  it('差し引き後が 0 以下でも、その性別の労働者がいれば 1', () => {
    const r = run(toiletFixtureCount, { M: '15', F: '8', k: '2' });
    expect(value(r, 'Me')).toBe(0);
    expect(value(r, 'wcM')).toBe(1);
    expect(value(r, 'wcF')).toBe(1);
  });
  it('常時 10 人以内は特例を表示、0 人の性別は 0', () => {
    const r = run(toiletFixtureCount, { M: '10', F: '0', k: '0' });
    expect(value(r, 'sp')).toBe('適用できる');
    expect(value(r, 'wcF')).toBe(0);
    expect(r.warnings.length).toBe(2);
    expectExcelMatches(r);
  });
});
