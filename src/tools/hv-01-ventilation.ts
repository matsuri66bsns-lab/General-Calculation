import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';

const METHOD_LABEL: Record<string, string> = {
  ach: '換気回数法',
  person: '在室人員法（建築基準法）',
  co2: 'CO₂濃度基準法（ザイデル式）',
  fire: '火気使用室（建築基準法）',
};

const is = (...methods: string[]) => (v: RawValues) => methods.includes(v.method);

export const ventilation: ToolDef = {
  id: 'HV-01',
  slug: 'ventilation',
  category: 'hvac',
  title: '必要換気量',
  summary: '換気回数・在室人員・CO₂濃度・火気使用室の4方式で必要換気量を求めます。',
  keywords: ['換気', '換気回数', '外気量', 'CO2', '二酸化炭素', 'ザイデル', '火気使用室', '建築基準法', '20m3/h'],
  references: [
    '建築基準法施行令 第20条の2（居室の換気設備）',
    '建築基準法施行令 第20条の3、昭和45年建設省告示第1826号（火気使用室の換気設備）',
    '建築物における衛生的環境の確保に関する法律（CO₂含有率 1,000ppm以下）',
    '空気調和・衛生工学便覧（換気回数の目安）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'method',
      label: '計算方式',
      display: 'segmented',
      options: [
        { value: 'ach', label: '換気回数' },
        { value: 'person', label: '在室人員' },
        { value: 'co2', label: 'CO₂濃度' },
        { value: 'fire', label: '火気使用室' },
      ],
    },
    // 換気回数法
    {
      type: 'select',
      key: 'room',
      label: '室用途（換気回数の目安）',
      visible: is('ach'),
      options: [
        { value: 'custom', label: '任意入力' },
        { value: 'wc', label: '便所・洗面所（5〜15回/h）', apply: { n: '10' } },
        { value: 'bath', label: '浴室・シャワー室（3〜5回/h）', apply: { n: '5' } },
        { value: 'pantry', label: '湯沸室（6〜10回/h）', apply: { n: '8' } },
        { value: 'kitchen', label: '厨房・営業用（30〜60回/h）', apply: { n: '40' } },
        { value: 'locker', label: '更衣室（4〜6回/h）', apply: { n: '5' } },
        { value: 'storage', label: '倉庫（3〜5回/h）', apply: { n: '4' } },
        { value: 'mech', label: '機械室（4〜6回/h）', apply: { n: '5' } },
        { value: 'parking', label: '駐車場（10回/h）', apply: { n: '10' } },
      ],
      help: '目安値です。発熱のある室（電気室など）は排熱量から別途算定してください。',
    },
    { type: 'number', key: 'A', label: '床面積', unit: 'm²', min: 0, exclusiveMin: true, visible: is('ach', 'person', 'co2') },
    { type: 'number', key: 'H', label: '天井高', unit: 'm', min: 0, exclusiveMin: true, visible: is('ach', 'person', 'co2') },
    { type: 'number', key: 'n', label: '換気回数', unit: '回/h', min: 0, exclusiveMin: true, visible: is('ach') },
    // 在室人員法
    {
      type: 'number',
      key: 'N',
      label: '1人当たりの占有面積（実況）',
      unit: 'm²/人',
      min: 0,
      exclusiveMin: true,
      visible: is('person'),
      suggestions: [
        { label: '事務所 5', value: 5 },
        { label: '会議室 2', value: 2 },
        { label: '店舗 3', value: 3 },
      ],
    },
    {
      type: 'select',
      key: 'bldg',
      label: '居室の区分',
      visible: is('person'),
      options: [
        { value: 'other', label: 'その他の居室（N の上限 10）' },
        { value: 'special', label: '特殊建築物の居室（N の上限 3）' },
      ],
    },
    // CO2濃度法
    { type: 'number', key: 'P', label: '在室人数', unit: '人', min: 0, exclusiveMin: true, visible: is('co2') },
    {
      type: 'number',
      key: 'k',
      label: '1人当たりCO₂発生量',
      unit: 'm³/(h·人)',
      min: 0,
      exclusiveMin: true,
      visible: is('co2'),
      suggestions: [
        { label: '安静 0.013', value: 0.013 },
        { label: '事務作業 0.02', value: 0.02 },
        { label: '軽作業 0.024', value: 0.024 },
        { label: '中作業 0.046', value: 0.046 },
      ],
    },
    { type: 'number', key: 'C', label: '室内CO₂許容濃度', unit: 'ppm', min: 0, exclusiveMin: true, visible: is('co2') },
    { type: 'number', key: 'C0', label: '外気CO₂濃度', unit: 'ppm', min: 0, visible: is('co2') },
    // 火気使用室
    {
      type: 'select',
      key: 'fuel',
      label: '燃料の種類',
      visible: is('fire'),
      options: [
        { value: 'gas', label: '都市ガス（K = 0.93 m³/kWh）', apply: { K: '0.93' } },
        { value: 'lpg', label: 'LPガス（K = 0.93 m³/kWh）', apply: { K: '0.93' } },
        { value: 'kerosene', label: '灯油（K = 12.1 m³/kg）', apply: { K: '12.1' } },
      ],
    },
    { type: 'number', key: 'K', label: '理論廃ガス量 K', unit: 'm³/kWh・m³/kg', min: 0, exclusiveMin: true, visible: is('fire') },
    {
      type: 'number',
      key: 'Q',
      label: '燃料消費量 Q（器具の合計）',
      unit: 'kW（灯油は kg/h）',
      min: 0,
      exclusiveMin: true,
      visible: is('fire'),
    },
    {
      type: 'select',
      key: 'hood',
      label: '排気の方式',
      visible: is('fire'),
      options: [
        { value: '40', label: '換気扇等のみ（フードなし）N = 40' },
        { value: '30', label: '排気フード Ⅰ型 N = 30' },
        { value: '20', label: '排気フード Ⅱ型 N = 20' },
        { value: '2', label: '煙突 N = 2' },
      ],
    },
  ],
  defaults: {
    method: 'ach',
    room: 'wc',
    A: '20',
    H: '2.5',
    n: '10',
    N: '5',
    bldg: 'other',
    P: '10',
    k: '0.02',
    C: '1000',
    C0: '400',
    fuel: 'gas',
    K: '0.93',
    Q: '20',
    hood: '30',
  },
  notes: [
    '在室人員法は機械換気設備の有効換気量 V = 20 × Af / N（令第20条の2）です。N には上限があります。',
    'CO₂濃度基準法は定常状態のザイデル式です。外気濃度は地域・時期で異なるため実況に合わせてください。',
    '火気使用室は V = N × K × Q（昭和45年建告第1826号）です。フードの形状・寸法の要件は告示本文を確認してください。',
  ],
  build(v) {
    const s = new SheetBuilder();
    const method = str(v, 'method');
    s.section('計算条件').input('method', '計算方式', METHOD_LABEL[method]);

    if (method === 'ach') {
      const A = num(v, 'A');
      const H = num(v, 'H');
      const n = num(v, 'n');
      s.section('入力値')
        .input('A', '床面積', A, { symbol: 'A', unit: 'm²', digits: 2 })
        .input('H', '天井高', H, { symbol: 'H', unit: 'm', digits: 2 })
        .input('n', '換気回数', n, { symbol: 'n', unit: '回/h' })
        .section('計算')
        .calc('V', '室容積', { symbol: 'V', unit: 'm³', value: A * H, expr: '{A} × {H}', formula: '{A}*{H}', digits: 1 })
        .calc('Qv', '必要換気量', { symbol: 'Q', unit: 'm³/h', value: n * A * H, expr: '{n} × {V}', formula: '{n}*{V}', digits: 0 })
        .calc('Qm', '必要換気量（毎分）', { symbol: 'Q′', unit: 'm³/min', value: (n * A * H) / 60, expr: '{Qv} ÷ 60', formula: '{Qv}/60', digits: 2 })
        .highlight('Qv', 'Qm');
      return s.result();
    }

    if (method === 'person') {
      const A = num(v, 'A');
      const H = num(v, 'H');
      const N = num(v, 'N');
      const special = str(v, 'bldg') === 'special';
      const cap = special ? 3 : 10;
      const Ne = Math.min(N, cap);
      const Q = (20 * A) / Ne;
      s.section('入力値')
        .input('A', '居室の床面積', A, { symbol: 'Af', unit: 'm²', digits: 2 })
        .input('H', '天井高', H, { symbol: 'H', unit: 'm', digits: 2 })
        .input('N', '1人当たり占有面積（実況）', N, { symbol: 'N', unit: 'm²/人' })
        .input('cap', '占有面積の上限', cap, {
          symbol: 'Nmax',
          unit: 'm²/人',
          note: special ? '特殊建築物の居室' : 'その他の居室',
        })
        .section('計算')
        .calc('Ne', '計算に用いる占有面積', { symbol: 'N′', unit: 'm²/人', value: Ne, expr: 'min({N}, {cap})', formula: 'MIN({N},{cap})' })
        .calc('Pn', '想定在室人数', { symbol: 'P', unit: '人', value: A / Ne, expr: '{A} ÷ {Ne}', formula: '{A}/{Ne}', digits: 1 })
        .calc('Qv', '有効換気量', { symbol: 'V', unit: 'm³/h', value: Q, expr: '20 × {A} ÷ {Ne}', formula: '20*{A}/{Ne}', digits: 0 })
        .calc('ach', '換気回数換算', { symbol: 'n', unit: '回/h', value: Q / (A * H), expr: '{Qv} ÷ ({A} × {H})', formula: '{Qv}/({A}*{H})', digits: 2 })
        .highlight('Qv', 'ach');
      if (N > cap) s.warn(`占有面積が上限 ${cap} m²/人 を超えるため、${cap} m²/人 として計算しています。`);
      return s.result();
    }

    if (method === 'co2') {
      const A = num(v, 'A');
      const H = num(v, 'H');
      const P = num(v, 'P');
      const k = num(v, 'k');
      const C = num(v, 'C');
      const C0 = num(v, 'C0');
      if (C <= C0) throw new CalcError('室内CO₂許容濃度は外気CO₂濃度より大きくしてください。');
      const M = P * k;
      const Q = M / ((C - C0) * 1e-6);
      s.section('入力値')
        .input('A', '床面積', A, { symbol: 'A', unit: 'm²', digits: 2 })
        .input('H', '天井高', H, { symbol: 'H', unit: 'm', digits: 2 })
        .input('P', '在室人数', P, { symbol: 'P', unit: '人' })
        .input('k', '1人当たりCO₂発生量', k, { symbol: 'k', unit: 'm³/(h·人)', digits: 3 })
        .input('C', '室内CO₂許容濃度', C, { symbol: 'C', unit: 'ppm', digits: 0 })
        .input('C0', '外気CO₂濃度', C0, { symbol: 'C₀', unit: 'ppm', digits: 0 })
        .section('計算')
        .calc('M', 'CO₂発生量', { symbol: 'M', unit: 'm³/h', value: M, expr: '{P} × {k}', formula: '{P}*{k}', digits: 3 })
        .calc('Qv', '必要換気量', {
          symbol: 'Q',
          unit: 'm³/h',
          value: Q,
          expr: '{M} ÷ (({C} − {C0}) × 10⁻⁶)',
          formula: '{M}/(({C}-{C0})*0.000001)',
          digits: 0,
        })
        .calc('Qp', '1人当たり換気量', { symbol: 'q', unit: 'm³/(h·人)', value: Q / P, expr: '{Qv} ÷ {P}', formula: '{Qv}/{P}', digits: 1 })
        .calc('ach', '換気回数換算', { symbol: 'n', unit: '回/h', value: Q / (A * H), expr: '{Qv} ÷ ({A} × {H})', formula: '{Qv}/({A}*{H})', digits: 2 })
        .highlight('Qv', 'Qp', 'ach');
      return s.result();
    }

    // 火気使用室
    const K = num(v, 'K');
    const Q = num(v, 'Q');
    const N = Number(str(v, 'hood'));
    const fuelLabel: Record<string, string> = { gas: '都市ガス', lpg: 'LPガス', kerosene: '灯油' };
    const hoodLabel: Record<number, string> = { 40: '換気扇等のみ', 30: '排気フード Ⅰ型', 20: '排気フード Ⅱ型', 2: '煙突' };
    const V = N * K * Q;
    s.section('入力値')
      .input('K', '理論廃ガス量', K, { symbol: 'K', unit: str(v, 'fuel') === 'kerosene' ? 'm³/kg' : 'm³/kWh', note: fuelLabel[str(v, 'fuel')] })
      .input('Q', '燃料消費量', Q, { symbol: 'Q', unit: str(v, 'fuel') === 'kerosene' ? 'kg/h' : 'kW' })
      .input('N', '排気方式による係数', N, { symbol: 'N', note: hoodLabel[N] })
      .section('計算')
      .calc('Qv', '有効換気量', { symbol: 'V', unit: 'm³/h', value: V, expr: '{N} × {K} × {Q}', formula: '{N}*{K}*{Q}', digits: 0 })
      .calc('Qm', '有効換気量（毎分）', { symbol: 'V′', unit: 'm³/min', value: V / 60, expr: '{Qv} ÷ 60', formula: '{Qv}/60', digits: 2 })
      .highlight('Qv', 'Qm');
    return s.result();
  },
};
