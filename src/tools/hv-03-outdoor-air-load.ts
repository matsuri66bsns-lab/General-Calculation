import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { hv03Beginner, hv03Doc } from './docs/hv-03';
import { humidityRatio, pwsFormula, pwsTetens } from './hv-04-psychrometrics';

const byRh = (v: RawValues) => v.hmode === 'rh';
const byX = (v: RawValues) => v.hmode !== 'rh';
const withHex = (v: RawValues) => v.hex === 'yes';

export const outdoorAirLoad: ToolDef = {
  id: 'HV-03',
  slug: 'outdoor-air-load',
  category: 'hvac',
  title: '外気負荷・すきま風負荷',
  summary: '外気量と室内外の温湿度差から、外気（すきま風）による顕熱・潜熱・全熱の負荷を求めます。',
  keywords: ['外気負荷', 'すきま風負荷', '顕熱', '潜熱', '全熱', '0.33', '834', '全熱交換器', '熱交換効率', '絶対湿度'],
  references: [
    '国土交通省「建築設備設計基準」（空気調和設備：熱負荷計算 外気負荷・すきま風負荷）',
    '空気調和・衛生工学便覧（外気負荷・すきま風負荷の計算式）',
    'JIS B 8628 全熱交換器（温度交換効率・湿度交換効率の定義）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    { type: 'number', key: 'Q', label: '外気量（すきま風量）', unit: 'm³/h', min: 0, exclusiveMin: true, help: '換気で取り入れる外気量、またはすきま風量を入れます。' },
    { type: 'number', key: 'to', label: '外気 乾球温度', unit: '°C', min: -30, max: 50 },
    { type: 'number', key: 'ti', label: '室内 乾球温度', unit: '°C', min: -30, max: 50, suggestions: [{ label: '冷房 26', value: 26 }, { label: '暖房 22', value: 22 }] },
    {
      type: 'select',
      key: 'hmode',
      label: '湿度の入力方法',
      display: 'segmented',
      options: [
        { value: 'x', label: '絶対湿度' },
        { value: 'rh', label: '相対湿度' },
      ],
      help: '相対湿度を選ぶと、乾球温度と相対湿度から絶対湿度を計算します（HV-04 と同じ Tetens の式）。',
    },
    { type: 'number', key: 'xo', label: '外気 絶対湿度', unit: 'kg/kg(DA)', min: 0, max: 0.05, visible: byX, help: 'g/kg の値は 1000 で割って入れます（18.0 g/kg → 0.0180）。' },
    { type: 'number', key: 'xi', label: '室内 絶対湿度', unit: 'kg/kg(DA)', min: 0, max: 0.05, visible: byX },
    { type: 'number', key: 'phio', label: '外気 相対湿度', unit: '%', min: 0, max: 100, visible: byRh },
    { type: 'number', key: 'phii', label: '室内 相対湿度', unit: '%', min: 0, max: 100, visible: byRh },
    { type: 'number', key: 'P', label: '大気圧', unit: 'kPa', min: 50, max: 120, visible: byRh, suggestions: [{ label: '標準 101.325', value: 101.325 }] },
    {
      type: 'select',
      key: 'hex',
      label: '全熱交換器',
      display: 'segmented',
      options: [
        { value: 'none', label: 'なし' },
        { value: 'yes', label: 'あり' },
      ],
    },
    {
      type: 'number',
      key: 'et',
      label: '温度交換効率',
      unit: '%',
      min: 0,
      max: 100,
      visible: withHex,
      help: '顕熱の負荷に掛けます。機器の仕様（メーカー資料）の値を入れてください。0 なら交換なしと同じです。',
    },
    {
      type: 'number',
      key: 'ex',
      label: '湿度交換効率',
      unit: '%',
      min: 0,
      max: 100,
      visible: withHex,
      help: '潜熱の負荷に掛けます。機器の仕様（メーカー資料）の値を入れてください。',
    },
  ],
  defaults: { Q: '500', to: '33', ti: '26', hmode: 'x', xo: '0.0180', xi: '0.0105', phio: '60', phii: '50', P: '101.325', hex: 'none', et: '70', ex: '60' },
  notes: [
    '温度差・湿度差は「外気 − 室内」で計算します。正の値は室へ熱・水分が入る冷房側の負荷、負の値は室から逃げる暖房・加湿側の負荷です。',
    '係数 0.33 と 834 は、空気の密度 1.2 kg/m³ を前提にした値です。標高の高い場所や温度が大きく違う場合は密度を補正してください。',
    '全熱交換器は、給気と排気の風量が等しいとして、効率を負荷に掛けて処理後の負荷を求めます。風量が違う場合や、バイパス運転・着霜防止運転の影響は考慮していません。',
    '外気の設計条件（温湿度）は、建築設備設計基準などの地域別の値を原文で確認して入れてください。',
  ],
  doc: hv03Doc,
  beginner: hv03Beginner,
  build(v) {
    const Q = num(v, 'Q');
    const to = num(v, 'to');
    const ti = num(v, 'ti');
    const s = new SheetBuilder();
    s.section('入力値')
      .input('Q', '外気量', Q, { symbol: 'Q', unit: 'm³/h', digits: 0 })
      .input('to', '外気 乾球温度', to, { symbol: 'to', unit: '°C', digits: 1 })
      .input('ti', '室内 乾球温度', ti, { symbol: 'ti', unit: '°C', digits: 1 });

    let xo: number;
    let xi: number;
    if (str(v, 'hmode') === 'rh') {
      const phio = num(v, 'phio');
      const phii = num(v, 'phii');
      const P = num(v, 'P');
      const pwo = (phio / 100) * pwsTetens(to);
      const pwi = (phii / 100) * pwsTetens(ti);
      if (pwo >= P || pwi >= P) throw new CalcError('水蒸気分圧が大気圧以上になります。大気圧の値を見直してください。');
      xo = humidityRatio(pwo, P);
      xi = humidityRatio(pwi, P);
      s.input('phio', '外気 相対湿度', phio, { symbol: 'φo', unit: '%', digits: 1 })
        .input('phii', '室内 相対湿度', phii, { symbol: 'φi', unit: '%', digits: 1 })
        .input('P', '大気圧', P, { symbol: 'P', unit: 'kPa', digits: 3 })
        .section('絶対湿度')
        .calc('pwo', '外気 水蒸気分圧', {
          symbol: 'pwo',
          unit: 'kPa',
          value: pwo,
          expr: '{phio} ÷ 100 × 0.61078 × 10^(7.5 × {to} ÷ ({to} + 237.3))',
          formula: `{phio}/100*${pwsFormula('{to}')}`,
          digits: 4,
          note: '飽和水蒸気圧は Tetens の式',
        })
        .calc('xo', '外気 絶対湿度', { symbol: 'xo', unit: 'kg/kg(DA)', value: xo, expr: '0.622 × {pwo} ÷ ({P} − {pwo})', formula: '0.622*{pwo}/({P}-{pwo})', digits: 4 })
        .calc('pwi', '室内 水蒸気分圧', {
          symbol: 'pwi',
          unit: 'kPa',
          value: pwi,
          expr: '{phii} ÷ 100 × 0.61078 × 10^(7.5 × {ti} ÷ ({ti} + 237.3))',
          formula: `{phii}/100*${pwsFormula('{ti}')}`,
          digits: 4,
        })
        .calc('xi', '室内 絶対湿度', { symbol: 'xi', unit: 'kg/kg(DA)', value: xi, expr: '0.622 × {pwi} ÷ ({P} − {pwi})', formula: '0.622*{pwi}/({P}-{pwi})', digits: 4 });
    } else {
      xo = num(v, 'xo');
      xi = num(v, 'xi');
      s.input('xo', '外気 絶対湿度', xo, { symbol: 'xo', unit: 'kg/kg(DA)', digits: 4 })
        .input('xi', '室内 絶対湿度', xi, { symbol: 'xi', unit: 'kg/kg(DA)', digits: 4 });
    }

    const dt = to - ti;
    const dx = xo - xi;
    const qs = 0.33 * Q * dt;
    const qL = 834 * Q * dx;
    const qT = qs + qL;
    s.section('外気負荷')
      .calc('dt', '温度差（外気 − 室内）', { symbol: 'Δt', unit: 'K', value: dt, expr: '{to} − {ti}', formula: '{to}-{ti}', digits: 1 })
      .calc('dx', '絶対湿度差（外気 − 室内）', { symbol: 'Δx', unit: 'kg/kg(DA)', value: dx, expr: '{xo} − {xi}', formula: '{xo}-{xi}', digits: 4 })
      .calc('qs', '顕熱負荷', { symbol: 'qs', unit: 'W', value: qs, expr: '0.33 × {Q} × {dt}', formula: '0.33*{Q}*{dt}', digits: 0 })
      .calc('qL', '潜熱負荷', { symbol: 'qL', unit: 'W', value: qL, expr: '834 × {Q} × {dx}', formula: '834*{Q}*{dx}', digits: 0 })
      .calc('qT', '全熱負荷', { symbol: 'q', unit: 'W', value: qT, expr: '{qs} + {qL}', formula: '{qs}+{qL}', digits: 0 });

    if (str(v, 'hex') === 'yes') {
      const et = num(v, 'et');
      const ex = num(v, 'ex');
      const qs2 = (1 - et / 100) * qs;
      const qL2 = (1 - ex / 100) * qL;
      s.section('全熱交換器を通した後の負荷')
        .input('et', '温度交換効率', et, { symbol: 'ηt', unit: '%', digits: 0, note: '機器の仕様値' })
        .input('ex', '湿度交換効率', ex, { symbol: 'ηx', unit: '%', digits: 0, note: '機器の仕様値' })
        .calc('qs2', '処理後の顕熱負荷', { symbol: 'qs′', unit: 'W', value: qs2, expr: '(1 − {et} ÷ 100) × {qs}', formula: '(1-{et}/100)*{qs}', digits: 0 })
        .calc('qL2', '処理後の潜熱負荷', { symbol: 'qL′', unit: 'W', value: qL2, expr: '(1 − {ex} ÷ 100) × {qL}', formula: '(1-{ex}/100)*{qL}', digits: 0 })
        .calc('qT2', '処理後の全熱負荷', { symbol: 'q′', unit: 'W', value: qs2 + qL2, expr: '{qs2} + {qL2}', formula: '{qs2}+{qL2}', digits: 0 })
        .calc('qR', '交換器による削減量', { symbol: 'qr', unit: 'W', value: qT - (qs2 + qL2), expr: '{qT} − {qT2}', formula: '{qT}-{qT2}', digits: 0 })
        .highlight('qs', 'qL', 'qT', 'qT2');
    } else {
      s.highlight('qs', 'qL', 'qT');
    }

    if (qs * qL < 0) s.warn('顕熱と潜熱の符号が逆です（一方が冷房側、もう一方が暖房・加湿側）。全熱だけで判断せず、顕熱・潜熱を分けて扱ってください。');
    else if (qT < 0) s.warn('負荷が負の値です。室から熱・水分が逃げる暖房・加湿側の負荷を表します。');
    return s.result();
  },
};
