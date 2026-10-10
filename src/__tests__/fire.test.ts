import { describe, expect, it } from 'vitest';
import { checkTool, run, value } from './helpers';
import { indoorHydrant } from '../tools/fp-01-indoor-hydrant';
import { sprinkler } from '../tools/fp-02-sprinkler';
import { extinguisher } from '../tools/fp-03-extinguisher';
import { heatSmokeDetector } from '../tools/fp-04-heat-smoke-detector';
import { exitSignRange } from '../tools/fp-05-exit-sign-range';
import { mechanicalSmokeExhaust } from '../tools/fp-06-mechanical-smoke-exhaust';
import { naturalSmokeVent } from '../tools/fp-07-natural-smoke-vent';
import { CalcError } from '../core/errors';

const TOOLS = [indoorHydrant, sprinkler, extinguisher, heatSmokeDetector, exitSignRange, mechanicalSmokeExhaust, naturalSmokeVent];

describe('消防（fire）共通検査', () => {
  it.each(TOOLS.map((t) => [t.id, t] as const))('%s：共通検査', (_id, t) => {
    expect(t.category).toBe('fire');
    checkTool(t);
  });
});

describe('FP-01 屋内消火栓', () => {
  it('1号 3個 → 2個で計算', () => {
    const r = run(indoorHydrant, { type: 'no1', N: '3', h1: '4', h2: '10', h3: '20' });
    expect(value(r, 'Nc')).toBe(2);
    expect(value(r, 'Vw')).toBeCloseTo(5.2);
    expect(value(r, 'Qp')).toBe(300);
    expect(value(r, 'H')).toBeCloseTo(51);
  });
  it('2号 1個（全揚程の定数 25 m）', () => {
    const r = run(indoorHydrant, { type: 'no2', N: '1', h1: '5', h2: '8', h3: '12' });
    expect(value(r, 'Vw')).toBeCloseTo(1.2);
    expect(value(r, 'Qp')).toBe(70);
    expect(value(r, 'H')).toBeCloseTo(50);
  });
  it('広範囲型2号 2個', () => {
    const r = run(indoorHydrant, { type: 'wide2', N: '2', h1: '5', h2: '8', h3: '12' });
    expect(value(r, 'Vw')).toBeCloseTo(3.2);
    expect(value(r, 'Qp')).toBe(180);
    expect(value(r, 'H')).toBeCloseTo(42);
  });
  it('設置個数が整数でなければエラー', () => {
    expect(() => run(indoorHydrant, { N: '1.5' })).toThrow(CalcError);
  });
});

describe('FP-02 スプリンクラー', () => {
  it('一般10階以下・標準型・湿式 → 10個', () => {
    const r = run(sprinkler, { use: 'general', head: 'std', valve: 'wet', Ni: '50' });
    expect(value(r, 'N')).toBe(10);
    expect(value(r, 'Vw')).toBeCloseTo(16);
    expect(value(r, 'Qp')).toBe(900);
  });
  it('11階以上・高感度型2.6 → 12個、百貨店・高感度型2.8 → 11個', () => {
    expect(value(run(sprinkler, { use: 'high', head: 'hs26' }), 'N')).toBe(12);
    expect(value(run(sprinkler, { use: 'dept', head: 'hs28' }), 'N')).toBe(11);
  });
  it('乾式・予作動式は1.5倍を切り上げ（7 × 1.5 = 10.5 → 11）', () => {
    const r = run(sprinkler, { use: 'general', head: 'hs28', valve: 'dry', Ni: '50' });
    expect(value(r, 'Nk')).toBe(11);
    expect(value(r, 'Vw')).toBeCloseTo(17.6);
    expect(value(run(sprinkler, { use: 'high', head: 'std', valve: 'dry' }), 'N')).toBe(23);
  });
  it('設置個数が表の個数より少なければ設置個数', () => {
    const r = run(sprinkler, { use: 'general', head: 'std', valve: 'dry', Ni: '12' });
    expect(value(r, 'Nk')).toBe(15);
    expect(value(r, 'N')).toBe(12);
    expect(value(r, 'Qp')).toBe(1080);
    expect(r.warnings.length).toBe(1);
  });
});

describe('FP-03 消火器', () => {
  it('事務所 1,500 m²・耐火内装難燃 → 4単位・A-3 で2本', () => {
    const r = run(extinguisher, { use: '15', A: '1500', fr: 'yes', u: '3' });
    expect(value(r, 'S')).toBe(400);
    expect(value(r, 'Nr')).toBeCloseTo(3.75);
    expect(value(r, 'Nu')).toBe(4);
    expect(value(r, 'n')).toBe(2);
  });
  it('劇場 500 m²・非該当 → ちょうど割り切れる 10 単位', () => {
    const r = run(extinguisher, { use: '1i', A: '500', fr: 'no' });
    expect(value(r, 'Nu')).toBe(10);
  });
  it('飲食店 101 m²・非該当 → 2 単位（切り上げ）', () => {
    expect(value(run(extinguisher, { use: '3', A: '101', fr: 'no' }), 'Nu')).toBe(2);
  });
});

describe('FP-04 感知器', () => {
  it('光電式1種・4m未満・300 m² → 2個', () => {
    const r = run(heatSmokeDetector, { det: 'photo1', h: 'lt4', A: '300' });
    expect(value(r, 'Sd')).toBe(150);
    expect(value(r, 'N')).toBe(2);
  });
  it('差動式スポット型2種：耐火 4m未満 70、その他 4〜8m 25', () => {
    const a = run(heatSmokeDetector, { det: 'diff2', struct: 'fire', h: 'lt4', A: '300' });
    expect(value(a, 'Sd')).toBe(70);
    expect(value(a, 'N')).toBe(5);
    const b = run(heatSmokeDetector, { det: 'diff2', struct: 'other', h: '4to8', A: '100' });
    expect(value(b, 'Sd')).toBe(25);
    expect(value(b, 'N')).toBe(4);
  });
  it('定温式スポット型1種・その他構造・4m未満 → 30 m²', () => {
    expect(value(run(heatSmokeDetector, { det: 'fix1', struct: 'other', h: 'lt4' }), 'Sd')).toBe(30);
  });
  it('光電式2種・4〜20m → 75 m²', () => {
    expect(value(run(heatSmokeDetector, { det: 'photo2', h: '8to15', A: '150' }), 'N')).toBe(2);
  });
  it('使えない高さの組み合わせはエラー', () => {
    expect(() => run(heatSmokeDetector, { det: 'diff2', h: '8to15' })).toThrow(CalcError);
    expect(() => run(heatSmokeDetector, { det: 'photo2', h: '15to20' })).toThrow(CalcError);
    expect(() => run(heatSmokeDetector, { det: 'fix2', h: '4to8' })).toThrow(CalcError);
    expect(() => run(heatSmokeDetector, { det: 'photo3', h: '4to8' })).toThrow(CalcError);
  });
});

describe('FP-05 誘導灯の有効範囲', () => {
  it('式：避難口シンボルなし h = 0.2 → 30 m、歩行距離 25 m は OK', () => {
    const r = run(exitSignRange, { method: 'formula', kind: 'exit', h: '0.2', judge: 'on', L: '25' });
    expect(value(r, 'D')).toBeCloseTo(30);
    expect(value(r, 'cls')).toBe('B級');
    expect(value(r, 'ok')).toBe('OK');
  });
  it('式：境界（L = D は OK、超えると NG）', () => {
    expect(value(run(exitSignRange, { method: 'formula', kind: 'exitSym', h: '0.3', L: '30' }), 'ok')).toBe('OK');
    expect(value(run(exitSignRange, { method: 'formula', kind: 'exitSym', h: '0.3', L: '30.1' }), 'ok')).toBe('NG');
  });
  it('式：通路 h = 0.4 → 20 m', () => {
    expect(value(run(exitSignRange, { method: 'formula', kind: 'aisle', h: '0.4' }), 'D')).toBeCloseTo(20);
  });
  it('等級別の距離', () => {
    expect(value(run(exitSignRange, { method: 'grade', kind: 'exit', grade: 'A' }), 'D')).toBe(60);
    expect(value(run(exitSignRange, { method: 'grade', kind: 'exitSym', grade: 'B' }), 'D')).toBe(20);
    expect(value(run(exitSignRange, { method: 'grade', kind: 'exitSym', grade: 'C' }), 'D')).toBe(15);
    expect(value(run(exitSignRange, { method: 'grade', kind: 'aisle', grade: 'C' }), 'D')).toBe(10);
  });
});

describe('FP-06 排煙機の必要排煙量', () => {
  it('1区画 300 m² → 300 m³/min、18,000 m³/h', () => {
    const r = run(mechanicalSmokeExhaust, { zones: 'one', A: '300' });
    expect(value(r, 'Q')).toBe(300);
    expect(value(r, 'Qh')).toBe(18000);
  });
  it('2以上 最大 300 m² → 600 m³/min', () => {
    expect(value(run(mechanicalSmokeExhaust, { zones: 'multi', A: '300' }), 'Q')).toBe(600);
  });
  it('小区画は最低 120 m³/min（境界 120 m²）', () => {
    expect(value(run(mechanicalSmokeExhaust, { zones: 'one', A: '80' }), 'Q')).toBe(120);
    expect(value(run(mechanicalSmokeExhaust, { zones: 'one', A: '120' }), 'Q')).toBe(120);
    expect(value(run(mechanicalSmokeExhaust, { zones: 'multi', A: '50' }), 'Q')).toBe(120);
  });
  it('500 m² 超は警告', () => {
    expect(run(mechanicalSmokeExhaust, { A: '600' }).warnings.length).toBe(1);
  });
});

describe('FP-07 自然排煙口', () => {
  it('300 m² → 6 m²、7 m² は OK', () => {
    const r = run(naturalSmokeVent, { A: '300', Ad: '7' });
    expect(value(r, 'Ae')).toBeCloseTo(6);
    expect(value(r, 'ok')).toBe('OK');
  });
  it('境界：6 m² は OK、5.99 m² は NG', () => {
    expect(value(run(naturalSmokeVent, { A: '300', Ad: '6' }), 'ok')).toBe('OK');
    const ng = run(naturalSmokeVent, { A: '300', Ad: '5.99' });
    expect(value(ng, 'ok')).toBe('NG');
    expect(ng.warnings.length).toBe(1);
  });
});
