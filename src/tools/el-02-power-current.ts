import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';

const SYS_LABEL: Record<string, string> = { dc: '直流', '1p': '単相交流', '3p': '三相交流' };
const notDc = (v: RawValues) => v.sys !== 'dc';

export const powerCurrent: ToolDef = {
  id: 'EL-02',
  slug: 'power-current',
  category: 'electrical',
  title: '電力⇔電流換算',
  summary: '直流・単相・三相について、電力（kW）と電流（A）を相互に換算し、皮相電力（kVA）も求めます。',
  keywords: ['電力', '電流', '換算', 'kW', 'kVA', 'アンペア', '力率', '効率', '三相', '単相', '√3'],
  references: ['電気設備の基本式 P = k × V × I × cosφ（k：直流・単相 1、三相 √3）'],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'sys',
      label: '電気方式',
      display: 'segmented',
      options: [
        { value: '3p', label: '三相交流', apply: { V: '200' } },
        { value: '1p', label: '単相交流', apply: { V: '100' } },
        { value: 'dc', label: '直流', apply: { V: '48' } },
      ],
    },
    {
      type: 'select',
      key: 'mode',
      label: '換算の向き',
      display: 'segmented',
      options: [
        { value: 'p2i', label: '電力 → 電流' },
        { value: 'i2p', label: '電流 → 電力' },
      ],
    },
    {
      type: 'number',
      key: 'V',
      label: '電圧（三相は線間電圧）',
      unit: 'V',
      min: 0,
      exclusiveMin: true,
      suggestions: [
        { label: '100V', value: 100 },
        { label: '200V', value: 200 },
        { label: '400V', value: 400 },
        { label: '6,600V', value: 6600 },
      ],
    },
    { type: 'number', key: 'P', label: '消費電力（負荷が電動機なら定格出力）', unit: 'kW', min: 0, exclusiveMin: true, visible: (v) => v.mode === 'p2i' },
    { type: 'number', key: 'I', label: '電流', unit: 'A', min: 0, exclusiveMin: true, visible: (v) => v.mode === 'i2p' },
    {
      type: 'number',
      key: 'pf',
      label: '力率 cosφ',
      min: 0,
      exclusiveMin: true,
      max: 1,
      visible: notDc,
      suggestions: [
        { label: '1.0', value: 1 },
        { label: '0.9', value: 0.9 },
        { label: '0.85', value: 0.85 },
        { label: '0.8', value: 0.8 },
      ],
    },
    {
      type: 'number',
      key: 'eta',
      label: '効率 η',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '電動機の定格出力から入力電流を求める場合に入力します。不要なら 1 のままにします。',
      visible: (v) => v.mode === 'p2i',
    },
  ],
  defaults: { sys: '3p', mode: 'p2i', V: '200', P: '11', I: '40', pf: '0.85', eta: '0.9' },
  notes: [
    '三相の電圧は線間電圧、電流は線電流です。',
    '電動機の実際の電流は、極数・メーカーによって異なります。分岐回路の設計には内線規程やメーカーの定格電流を用いてください。',
  ],
  build(v) {
    const sysKey = str(v, 'sys');
    const isDc = sysKey === 'dc';
    const is3p = sysKey === '3p';
    const mode = str(v, 'mode');
    const V = num(v, 'V');
    const pf = isDc ? 1 : num(v, 'pf');
    const k = is3p ? Math.sqrt(3) : 1;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('sys', '電気方式', SYS_LABEL[sysKey])
      .input('V', '電圧', V, { symbol: 'V', unit: 'V' })
      .input('pf', '力率', pf, { symbol: 'cosφ', digits: 2, note: isDc ? '直流のため 1' : undefined });

    if (mode === 'p2i') {
      const P = num(v, 'P');
      const eta = num(v, 'eta');
      const Pin = P / eta;
      s.input('P', '消費電力・定格出力', P, { symbol: 'P', unit: 'kW' })
        .input('eta', '効率', eta, { symbol: 'η', digits: 2 })
        .section('計算')
        .calc('k', '方式による係数', {
          symbol: 'k',
          value: k,
          expr: is3p ? '√3' : '1',
          formula: is3p ? 'SQRT(3)' : '1',
          digits: 3,
        })
        .calc('Pin', '入力電力', { symbol: 'Pi', unit: 'kW', value: Pin, expr: '{P} ÷ {eta}', formula: '{P}/{eta}', digits: 2 })
        .calc('S', '皮相電力', { symbol: 'S', unit: 'kVA', value: Pin / pf, expr: '{Pin} ÷ {pf}', formula: '{Pin}/{pf}', digits: 2 })
        .calc('Iout', '電流', {
          symbol: 'I',
          unit: 'A',
          value: (Pin * 1000) / (k * V * pf),
          expr: '{Pin} × 1000 ÷ ({k} × {V} × {pf})',
          formula: '{Pin}*1000/({k}*{V}*{pf})',
          digits: 1,
        })
        .highlight('Iout', 'S', 'Pin');
      return s.result();
    }

    const I = num(v, 'I');
    const S = (k * V * I) / 1000;
    s.input('I', '電流', I, { symbol: 'I', unit: 'A' })
      .section('計算')
      .calc('k', '方式による係数', { symbol: 'k', value: k, expr: is3p ? '√3' : '1', formula: is3p ? 'SQRT(3)' : '1', digits: 3 })
      .calc('S', '皮相電力', { symbol: 'S', unit: 'kVA', value: S, expr: '{k} × {V} × {I} ÷ 1000', formula: '{k}*{V}*{I}/1000', digits: 2 })
      .calc('Pout', '有効電力', { symbol: 'P', unit: 'kW', value: S * pf, expr: '{S} × {pf}', formula: '{S}*{pf}', digits: 2 })
      .highlight('Pout', 'S');
    return s.result();
  },
};
