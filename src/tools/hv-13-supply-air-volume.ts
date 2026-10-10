import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { hv13Beginner, hv13Doc } from './docs/hv-13';

const isTemps = (v: RawValues) => v.dtmode !== 'dt';
const isDt = (v: RawValues) => v.dtmode === 'dt';

export const supplyAirVolume: ToolDef = {
  id: 'HV-13',
  slug: 'supply-air-volume',
  category: 'hvac',
  title: '空調機の送風量と顕熱比',
  summary: '室の顕熱負荷と吹出し温度差から空調機の送風量を求め、顕熱比（SHF）と換気回数換算を示します。',
  keywords: ['送風量', '吹出し温度差', '顕熱', '潜熱', '顕熱比', 'SHF', '空調機', 'エアハン', '0.33', '換気回数'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」空気調和設備（送風量の算定）',
    '空気調和・衛生工学便覧（顕熱による送風量の式、顕熱比）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    { type: 'number', key: 'qs', label: '室の顕熱負荷', unit: 'W', min: 0, exclusiveMin: true, help: '温度を変える熱（日射・照明・人体の顕熱・機器など）の合計です。' },
    { type: 'number', key: 'qL', label: '室の潜熱負荷', unit: 'W', min: 0, help: '湿度を変える熱（人体の潜熱・すきま風の水分など）の合計です。' },
    {
      type: 'select',
      key: 'dtmode',
      label: '温度条件の入力方法',
      display: 'segmented',
      options: [
        { value: 'temps', label: '室温と吹出し温度' },
        { value: 'dt', label: '吹出し温度差' },
      ],
    },
    { type: 'number', key: 'tr', label: '室温', unit: '℃', visible: isTemps, suggestions: [{ label: '26℃', value: 26 }, { label: '27℃', value: 27 }] },
    {
      type: 'number',
      key: 'ts',
      label: '吹出し温度',
      unit: '℃',
      visible: isTemps,
      help: '冷房時の空調機の吹出し空気の温度です。',
      suggestions: [
        { label: '15℃', value: 15 },
        { label: '16℃', value: 16 },
        { label: '17℃', value: 17 },
      ],
    },
    {
      type: 'number',
      key: 'dt',
      label: '吹出し温度差（室温 − 吹出し温度）',
      unit: 'K',
      min: 0,
      exclusiveMin: true,
      visible: isDt,
      help: '冷房では 8〜11 K 程度が目安です。暖房の計算にはこちらを使い、吹出し温度 − 室温 を入力します。',
      suggestions: [
        { label: '8K', value: 8 },
        { label: '10K', value: 10 },
        { label: '11K', value: 11 },
      ],
    },
    {
      type: 'number',
      key: 'V',
      label: '室容積（換気回数換算に使用）',
      unit: 'm³',
      min: 0,
      help: '0 のときは換気回数換算を省略します。',
    },
  ],
  defaults: { qs: '10000', qL: '2000', dtmode: 'temps', tr: '26', ts: '16', dt: '10', V: '300' },
  notes: [
    '係数 0.33 は空気の密度 1.2 kg/m³ × 定圧比熱 1.006 kJ/(kg·K) ÷ 3.6 ≒ 0.335 を丸めた値で、W と m³/h を直接結ぶための係数です。',
    '送風量は顕熱負荷だけで決まります。潜熱負荷は顕熱比として示し、コイルの能力（除湿）の検討に使います。',
    '求めた送風量が換気・気流分布に必要な量より少ない場合は、送風量を増やし吹出し温度差を小さくしてください。',
  ],
  doc: hv13Doc,
  beginner: hv13Beginner,
  build(v) {
    const qs = num(v, 'qs');
    const qL = num(v, 'qL');
    const temps = str(v, 'dtmode') !== 'dt';
    const V = num(v, 'V');

    const s = new SheetBuilder();
    s.section('入力値')
      .input('qs', '室の顕熱負荷', qs, { symbol: 'qs', unit: 'W', digits: 0 })
      .input('qL', '室の潜熱負荷', qL, { symbol: 'qL', unit: 'W', digits: 0 });

    let dt: number;
    if (temps) {
      const tr = num(v, 'tr');
      const ts = num(v, 'ts');
      if (tr <= ts) throw new CalcError('冷房の計算のため、吹出し温度は室温より低くしてください。暖房の場合は「吹出し温度差」で入力してください。');
      dt = tr - ts;
      s.input('tr', '室温', tr, { symbol: 'tr', unit: '℃', digits: 1 })
        .input('ts', '吹出し温度', ts, { symbol: 'ts', unit: '℃', digits: 1 })
        .calc('dt', '吹出し温度差', { symbol: 'Δt', unit: 'K', value: dt, expr: '{tr} − {ts}', formula: '{tr}-{ts}', digits: 1 });
    } else {
      dt = num(v, 'dt');
      s.input('dt', '吹出し温度差', dt, { symbol: 'Δt', unit: 'K', digits: 1 });
    }

    const Q = qs / (0.33 * dt);
    s.section('送風量')
      .calc('Q', '送風量', { symbol: 'Q', unit: 'm³/h', value: Q, expr: '{qs} ÷ (0.33 × {dt})', formula: '{qs}/(0.33*{dt})', digits: 0 })
      .calc('Qm', '送風量（毎分）', { symbol: 'Q′', unit: 'm³/min', value: Q / 60, expr: '{Q} ÷ 60', formula: '{Q}/60', digits: 1 })
      .section('顕熱比')
      .calc('qt', '全熱負荷', { symbol: 'qt', unit: 'W', value: qs + qL, expr: '{qs} + {qL}', formula: '{qs}+{qL}', digits: 0 })
      .calc('SHF', '顕熱比', { symbol: 'SHF', value: qs / (qs + qL), expr: '{qs} ÷ {qt}', formula: '{qs}/{qt}', digits: 3 })
      .highlight('Q', 'Qm', 'SHF');

    if (V > 0) {
      s.section('換気回数換算')
        .input('V', '室容積', V, { symbol: 'V', unit: 'm³', digits: 1 })
        .calc('n', '換気回数換算', { symbol: 'n', unit: '回/h', value: Q / V, expr: '{Q} ÷ {V}', formula: '{Q}/{V}', digits: 1 })
        .highlight('n');
    }
    if (dt > 12) s.warn('吹出し温度差が 12 K を超えて大きめです。吹出口付近の冷えすぎ（ドラフト）や結露に注意してください。');
    return s.result();
  },
};
