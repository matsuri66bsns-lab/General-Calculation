import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { cm04Beginner, cm04Doc } from './docs/cm-04';

const FLUID_LABEL: Record<string, string> = { water: '水', air: '空気', custom: '任意の流体' };

const isMethod = (m: string) => (v: RawValues) => v.method === m;
const flowVisible = (u: string) => (v: RawValues) => v.method === 'q' && v.funit === u;

export const sensibleHeat: ToolDef = {
  id: 'CM-04',
  slug: 'sensible-heat',
  category: 'common',
  title: '顕熱の熱量・流量換算',
  summary: '顕熱の式 q = m·c·Δt で、流量と温度差から熱量を、または熱量と温度差から必要流量を求めます。',
  keywords: ['顕熱', '熱量', '流量', '温度差', '比熱', '密度', '冷温水', '風量', 'kW', 'L/min', 'm3/h', 'q=mcΔt'],
  references: [
    '顕熱の式 q = m·c·Δt（熱量 = 質量流量 × 比熱 × 温度差）。熱力学の基本式',
    '空気調和・衛生工学便覧（水・空気の比熱と密度。常温付近の代表値）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'fluid',
      label: '流体',
      display: 'segmented',
      options: [
        { value: 'water', label: '水', apply: { c: '4.186', rho: '1000', funit: 'Lmin', dt: '5' } },
        { value: 'air', label: '空気', apply: { c: '1.006', rho: '1.2', funit: 'm3h', dt: '10' } },
        { value: 'custom', label: '任意' },
      ],
      help: '水・空気を選ぶと比熱と密度に常温付近の代表値が入ります。温度や圧力が大きく異なるときは値を直してください。',
    },
    {
      type: 'select',
      key: 'method',
      label: '計算方式',
      display: 'segmented',
      options: [
        { value: 'q', label: '熱量を求める' },
        { value: 'flow', label: '流量を求める' },
      ],
    },
    { type: 'number', key: 'c', label: '比熱', unit: 'kJ/(kg·K)', min: 0, exclusiveMin: true },
    { type: 'number', key: 'rho', label: '密度', unit: 'kg/m³', min: 0, exclusiveMin: true },
    { type: 'number', key: 'dt', label: '温度差', unit: 'K', min: 0, exclusiveMin: true, help: '出入口の温度差です。1 ℃ の差は 1 K と同じです。' },
    {
      type: 'select',
      key: 'funit',
      label: '流量の単位',
      display: 'segmented',
      options: [
        { value: 'Lmin', label: 'L/min' },
        { value: 'm3h', label: 'm³/h' },
      ],
    },
    { type: 'number', key: 'VL', label: '体積流量', unit: 'L/min', min: 0, exclusiveMin: true, visible: flowVisible('Lmin') },
    { type: 'number', key: 'Vh', label: '体積流量', unit: 'm³/h', min: 0, exclusiveMin: true, visible: flowVisible('m3h') },
    { type: 'number', key: 'Q', label: '熱量', unit: 'kW', min: 0, exclusiveMin: true, visible: isMethod('flow') },
  ],
  defaults: { fluid: 'water', method: 'q', c: '4.186', rho: '1000', dt: '5', funit: 'Lmin', VL: '20', Vh: '1000', Q: '10' },
  notes: [
    '温度変化だけを扱う顕熱の式です。空気の除湿・加湿にともなう潜熱は含みません。',
    '比熱・密度は常温付近の代表値です（水 4.186 kJ/(kg·K)・1000 kg/m³、空気 1.006 kJ/(kg·K)・1.2 kg/m³）。高温水や不凍液は実際の物性値を入力してください。',
    '熱量 kW は kJ/s と同じです。',
  ],
  doc: cm04Doc,
  beginner: cm04Beginner,
  build(v) {
    const fluid = str(v, 'fluid');
    const flowMode = str(v, 'method') === 'flow';
    const lmin = str(v, 'funit') === 'Lmin';
    const c = num(v, 'c');
    const rho = num(v, 'rho');
    const dt = num(v, 'dt');
    const fu = lmin ? 'L/min' : 'm³/h';
    const k = lmin ? 60000 : 3600;

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('fluid', '流体', FLUID_LABEL[fluid])
      .section('入力値')
      .input('c', '比熱', c, { symbol: 'c', unit: 'kJ/(kg·K)', digits: 3 })
      .input('rho', '密度', rho, { symbol: 'ρ', unit: 'kg/m³' })
      .input('dt', '温度差', dt, { symbol: 'Δt', unit: 'K' });

    if (!flowMode) {
      const V = lmin ? num(v, 'VL') : num(v, 'Vh');
      const m = (V * rho) / k;
      s.input('V', '体積流量', V, { symbol: 'V', unit: fu })
        .section('計算')
        .calc('m', '質量流量', {
          symbol: 'm',
          unit: 'kg/s',
          value: m,
          expr: lmin ? '{V} × {rho} ÷ 60000' : '{V} × {rho} ÷ 3600',
          formula: lmin ? '{V}*{rho}/60000' : '{V}*{rho}/3600',
          digits: 4,
          note: lmin ? 'L/min → m³/s は ÷ 60000' : 'm³/h → m³/s は ÷ 3600',
        })
        .calc('q', '熱量', { symbol: 'q', unit: 'kW', value: m * c * dt, expr: '{m} × {c} × {dt}', formula: '{m}*{c}*{dt}', digits: 2 })
        .highlight('q');
      return s.result();
    }

    const Q = num(v, 'Q');
    const m = Q / (c * dt);
    s.input('Q', '熱量', Q, { symbol: 'q', unit: 'kW' })
      .section('計算')
      .calc('m', '必要質量流量', { symbol: 'm', unit: 'kg/s', value: m, expr: '{Q} ÷ ({c} × {dt})', formula: '{Q}/({c}*{dt})', digits: 4 })
      .calc('V', '必要体積流量', {
        symbol: 'V',
        unit: fu,
        value: (m / rho) * k,
        expr: lmin ? '{m} ÷ {rho} × 60000' : '{m} ÷ {rho} × 3600',
        formula: lmin ? '{m}/{rho}*60000' : '{m}/{rho}*3600',
        digits: lmin ? 1 : 0,
      })
      .highlight('V');
    return s.result();
  },
};
