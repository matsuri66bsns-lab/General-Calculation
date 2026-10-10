import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { hv04Beginner, hv04Doc } from './docs/hv-04';

/*
 * 湿り空気の計算で共通に使う式（HV-03・HV-05 からも使う）。
 * 飽和水蒸気圧は Tetens の式（水面上）とする。露点の逆算も解析的にでき、
 * JavaScript と Excel で同じ値になる。
 */

/** 飽和水蒸気圧 [kPa]（Tetens の式、水面上）。t [°C] */
export function pwsTetens(t: number): number {
  return 0.61078 * 10 ** ((7.5 * t) / (t + 237.3));
}

/** pwsTetens と同じ式の Excel 版 */
export function pwsFormula(t: string): string {
  return `0.61078*10^(7.5*${t}/(${t}+237.3))`;
}

/** 水蒸気分圧 pw [kPa] から露点温度 [°C] を求める（Tetens の式の逆関数） */
export function dewPoint(pw: number): number {
  const y = Math.log10(pw / 0.61078);
  return (237.3 * y) / (7.5 - y);
}

/** dewPoint と同じ式の Excel 版 */
export function dewPointFormula(pw: string): string {
  return `237.3*LOG10(${pw}/0.61078)/(7.5-LOG10(${pw}/0.61078))`;
}

/** 絶対湿度 [kg/kg(DA)]。pw・P [kPa] */
export function humidityRatio(pw: number, P: number): number {
  return (0.622 * pw) / (P - pw);
}

export function humidityRatioFormula(pw: string, P: string): string {
  return `0.622*${pw}/(${P}-${pw})`;
}

const METHOD_LABEL: Record<string, string> = {
  rh: '乾球温度と相対湿度から',
  wb: '乾球温度と湿球温度から',
  dp: '乾球温度と露点温度から',
};

const is = (...m: string[]) => (v: RawValues) => m.includes(v.method);

export const psychrometrics: ToolDef = {
  id: 'HV-04',
  slug: 'psychrometrics',
  category: 'hvac',
  title: '湿り空気の状態',
  summary: '乾球温度と相対湿度・湿球温度・露点のいずれかから、絶対湿度・比エンタルピー・露点などを求めます。',
  keywords: ['湿り空気', '空気線図', '絶対湿度', '相対湿度', '湿球温度', '露点', '比エンタルピー', '比容積', '水蒸気分圧', '飽和水蒸気圧', 'Tetens'],
  references: [
    'Tetens, O. (1930) 飽和水蒸気圧の近似式（本ツールの飽和水蒸気圧と露点の逆算に使用）',
    'ASHRAE Handbook - Fundamentals, Chapter 1 Psychrometrics（絶対湿度、比エンタルピー、比容積、熱力学的湿球温度の式）',
    'JIS Z 8806 湿度－測定方法（湿度に関する用語の定義）',
    '空気調和・衛生工学便覧（湿り空気の性質）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'method',
      label: '乾球温度と組み合わせる値',
      display: 'segmented',
      options: [
        { value: 'rh', label: '相対湿度' },
        { value: 'wb', label: '湿球温度' },
        { value: 'dp', label: '露点温度' },
      ],
    },
    {
      type: 'number',
      key: 't',
      label: '乾球温度',
      unit: '°C',
      min: -30,
      max: 60,
      help: 'ふつうの温度計で測った空気の温度です。',
      suggestions: [
        { label: '冷房 26', value: 26 },
        { label: '暖房 22', value: 22 },
      ],
    },
    {
      type: 'number',
      key: 'phi',
      label: '相対湿度',
      unit: '%',
      min: 0,
      exclusiveMin: true,
      max: 100,
      visible: is('rh'),
      suggestions: [
        { label: '40%', value: 40 },
        { label: '50%', value: 50 },
        { label: '60%', value: 60 },
      ],
    },
    {
      type: 'number',
      key: 'tw',
      label: '湿球温度',
      unit: '°C',
      min: -30,
      max: 60,
      visible: is('wb'),
      help: '熱力学的湿球温度（断熱飽和温度）として扱います。乾球温度以下の値を入れてください。',
    },
    {
      type: 'number',
      key: 'td',
      label: '露点温度',
      unit: '°C',
      min: -30,
      max: 60,
      visible: is('dp'),
      help: '乾球温度以下の値を入れてください。',
    },
    {
      type: 'number',
      key: 'P',
      label: '大気圧',
      unit: 'kPa',
      min: 50,
      max: 120,
      help: '標準大気圧は 101.325 kPa です。標高が高い場所では小さくなります。',
      suggestions: [{ label: '標準 101.325', value: 101.325 }],
    },
  ],
  defaults: { method: 'rh', t: '26', phi: '50', tw: '19', td: '15', P: '101.325' },
  notes: [
    '飽和水蒸気圧は Tetens の式 pws = 0.61078 × 10^(7.5t ÷ (t + 237.3)) [kPa]（水面上）で求めます。露点はこの式を逆に解いて求めるので、反復計算は使っていません。',
    'ASHRAE Handbook の Hyland-Wexler の式（精密式）との差は、0〜50 °C で約 0.12 % 以内です（本サイトで比較した値）。0 °C 未満は過冷却の水面上の値で、氷面上の値より大きくなります。',
    '湿球温度は熱力学的湿球温度（断熱飽和温度）として扱います。アスマン通風乾湿計の読みとはわずかに異なることがあります。',
    '絶対湿度・比エンタルピー・比容積は乾き空気 1 kg 当たりの値（kg(DA) 基準）です。',
  ],
  doc: hv04Doc,
  beginner: hv04Beginner,
  build(v) {
    const method = str(v, 'method');
    const t = num(v, 't');
    const P = num(v, 'P');
    const s = new SheetBuilder();
    s.section('計算条件').input('method', '計算方式', METHOD_LABEL[method]);
    s.section('入力値').input('t', '乾球温度', t, { symbol: 't', unit: '°C', digits: 1 });

    let pw: number;
    if (method === 'rh') {
      const phi = num(v, 'phi');
      s.input('phi', '相対湿度', phi, { symbol: 'φ', unit: '%', digits: 1 })
        .input('P', '大気圧', P, { symbol: 'P', unit: 'kPa', digits: 3 })
        .section('計算')
        .calc('pws', '飽和水蒸気圧（乾球温度）', { symbol: 'pws', unit: 'kPa', value: pwsTetens(t), expr: '0.61078 × 10^(7.5 × {t} ÷ ({t} + 237.3))', formula: pwsFormula('{t}'), digits: 4 });
      pw = (phi / 100) * pwsTetens(t);
      s.calc('pw', '水蒸気分圧', { symbol: 'pw', unit: 'kPa', value: pw, expr: '{phi} ÷ 100 × {pws}', formula: '{phi}/100*{pws}', digits: 4 });
    } else if (method === 'wb') {
      const tw = num(v, 'tw');
      if (tw > t) throw new CalcError('湿球温度は乾球温度以下にしてください。');
      const pwsw = pwsTetens(tw);
      const xs = humidityRatio(pwsw, P);
      const x = (xs * (2501 - 2.381 * tw) - 1.006 * (t - tw)) / (2501 + 1.805 * t - 4.186 * tw);
      if (x <= 0) throw new CalcError('湿球温度が乾球温度に比べて低すぎ、絶対湿度が 0 以下になります。湿球温度を見直してください。');
      pw = (P * x) / (0.622 + x);
      s.input('tw', '湿球温度', tw, { symbol: 'tw', unit: '°C', digits: 1 })
        .input('P', '大気圧', P, { symbol: 'P', unit: 'kPa', digits: 3 })
        .section('計算')
        .calc('pws', '飽和水蒸気圧（乾球温度）', { symbol: 'pws', unit: 'kPa', value: pwsTetens(t), expr: '0.61078 × 10^(7.5 × {t} ÷ ({t} + 237.3))', formula: pwsFormula('{t}'), digits: 4 })
        .calc('pwsw', '飽和水蒸気圧（湿球温度）', { symbol: 'pws(tw)', unit: 'kPa', value: pwsw, expr: '0.61078 × 10^(7.5 × {tw} ÷ ({tw} + 237.3))', formula: pwsFormula('{tw}'), digits: 4 })
        .calc('xs', '湿球温度での飽和絶対湿度', { symbol: 'xs(tw)', unit: 'kg/kg(DA)', value: xs, expr: '0.622 × {pwsw} ÷ ({P} − {pwsw})', formula: humidityRatioFormula('{pwsw}', '{P}'), digits: 5 })
        .calc('x', '絶対湿度', {
          symbol: 'x',
          unit: 'kg/kg(DA)',
          value: x,
          expr: '({xs} × (2501 − 2.381 × {tw}) − 1.006 × ({t} − {tw})) ÷ (2501 + 1.805 × {t} − 4.186 × {tw})',
          formula: '({xs}*(2501-2.381*{tw})-1.006*({t}-{tw}))/(2501+1.805*{t}-4.186*{tw})',
          digits: 5,
          note: '断熱飽和の熱収支から求めた式',
        })
        .calc('pw', '水蒸気分圧', { symbol: 'pw', unit: 'kPa', value: pw, expr: '{P} × {x} ÷ (0.622 + {x})', formula: '{P}*{x}/(0.622+{x})', digits: 4 });
    } else {
      const td = num(v, 'td');
      if (td > t) throw new CalcError('露点温度は乾球温度以下にしてください。');
      pw = pwsTetens(td);
      s.input('td', '露点温度', td, { symbol: 'td', unit: '°C', digits: 1 })
        .input('P', '大気圧', P, { symbol: 'P', unit: 'kPa', digits: 3 })
        .section('計算')
        .calc('pws', '飽和水蒸気圧（乾球温度）', { symbol: 'pws', unit: 'kPa', value: pwsTetens(t), expr: '0.61078 × 10^(7.5 × {t} ÷ ({t} + 237.3))', formula: pwsFormula('{t}'), digits: 4 })
        .calc('pw', '水蒸気分圧（露点温度での飽和水蒸気圧）', { symbol: 'pw', unit: 'kPa', value: pw, expr: '0.61078 × 10^(7.5 × {td} ÷ ({td} + 237.3))', formula: pwsFormula('{td}'), digits: 4 });
    }
    if (pw >= P) throw new CalcError('水蒸気分圧が大気圧以上になります。大気圧の値を見直してください。');

    // 湿球温度から求めたときも、pw から戻した値は上の x と同じになる
    const x = humidityRatio(pw, P);
    if (method !== 'wb') {
      s.calc('x', '絶対湿度', { symbol: 'x', unit: 'kg/kg(DA)', value: x, expr: '0.622 × {pw} ÷ ({P} − {pw})', formula: humidityRatioFormula('{pw}', '{P}'), digits: 5 });
    }
    if (method !== 'rh') {
      s.calc('phiC', '相対湿度', { symbol: 'φ', unit: '%', value: (pw / pwsTetens(t)) * 100, expr: '{pw} ÷ {pws} × 100', formula: '{pw}/{pws}*100', digits: 1 });
    }
    if (method !== 'dp') {
      s.calc('tdC', '露点温度', { symbol: 'td', unit: '°C', value: dewPoint(pw), expr: '237.3 × log₁₀({pw} ÷ 0.61078) ÷ (7.5 − log₁₀({pw} ÷ 0.61078))', formula: dewPointFormula('{pw}'), digits: 1 });
    }
    s.calc('h', '比エンタルピー', {
      symbol: 'h',
      unit: 'kJ/kg(DA)',
      value: 1.006 * t + x * (2501 + 1.805 * t),
      expr: '1.006 × {t} + {x} × (2501 + 1.805 × {t})',
      formula: '1.006*{t}+{x}*(2501+1.805*{t})',
      digits: 2,
    }).calc('vs', '比容積', {
      symbol: 'v',
      unit: 'm³/kg(DA)',
      value: (0.287042 * (t + 273.15) * (1 + 1.607858 * x)) / P,
      expr: '0.287042 × ({t} + 273.15) × (1 + 1.607858 × {x}) ÷ {P}',
      formula: '0.287042*({t}+273.15)*(1+1.607858*{x})/{P}',
      digits: 4,
    });

    s.highlight('x', ...(method !== 'rh' ? ['phiC'] : []), ...(method !== 'dp' ? ['tdC'] : []), 'h', 'vs');
    if (t < 0) s.warn('乾球温度が 0 °C 未満です。飽和水蒸気圧は過冷却の水面上の値で計算しています（氷面上の値より大きくなります）。');
    return s.result();
  },
};
