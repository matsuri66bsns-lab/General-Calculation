import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { hv10Beginner, hv10Doc } from './docs/hv-10';

const MODE_LABEL: Record<string, string> = {
  load: '冷温水（熱量を入力）',
  cond: '冷却水（冷凍能力 ＋ 圧縮機入力）',
  cop: '冷却水（冷凍能力と成績係数）',
};

const is = (...modes: string[]) => (v: RawValues) => modes.includes(v.mode);

export const chilledWaterFlow: ToolDef = {
  id: 'HV-10',
  slug: 'chilled-water-flow',
  category: 'hvac',
  title: '冷温水量・冷却水量',
  summary: '熱量と往還温度差から冷温水・冷却水の必要水量（L/min、m³/h）を求めます。',
  keywords: ['冷水', '温水', '冷温水', '冷却水', '水量', '流量', '温度差', '往還', 'COP', '冷凍機', '冷却塔', 'L/min'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」熱源・配管（冷温水量・冷却水量の算定）',
    '水の比熱・密度：理科年表、空気調和・衛生工学便覧（4.186 kJ/(kg·K)、1000 kg/m³）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'mode',
      label: '計算の対象',
      display: 'segmented',
      options: [
        { value: 'load', label: '冷温水', apply: { dt: '5' } },
        { value: 'cond', label: '冷却水（入力から）', apply: { dt: '5' } },
        { value: 'cop', label: '冷却水（COPから）', apply: { dt: '5' } },
      ],
      help: '冷却水は、冷凍機が冷水から奪った熱と圧縮機の入力の合計を冷却塔へ運ぶ水です。',
    },
    { type: 'number', key: 'q', label: '熱量（冷房能力・暖房能力など）', unit: 'kW', min: 0, exclusiveMin: true, visible: is('load') },
    { type: 'number', key: 'qe', label: '冷凍機の冷却能力', unit: 'kW', min: 0, exclusiveMin: true, visible: is('cond', 'cop') },
    {
      type: 'number',
      key: 'W',
      label: '圧縮機の入力（消費電力）',
      unit: 'kW',
      min: 0,
      visible: is('cond'),
      help: '吸収冷凍機の場合は、加熱量（入熱）を入力します。',
    },
    {
      type: 'number',
      key: 'cop',
      label: '成績係数 COP（冷却能力 ÷ 入力）',
      min: 0,
      exclusiveMin: true,
      visible: is('cop'),
      help: 'メーカー資料の定格値を入力します。',
      suggestions: [
        { label: '3', value: 3 },
        { label: '4', value: 4 },
        { label: '5', value: 5 },
        { label: '6', value: 6 },
      ],
    },
    {
      type: 'number',
      key: 'dt',
      label: '往還温度差',
      unit: 'K',
      min: 0,
      exclusiveMin: true,
      help: '冷水は 5 K（7 → 12 ℃）、冷却水は 5 K（32 → 37 ℃）とすることが多いです（目安）。大温度差 7〜10 K の計画もあります。',
      suggestions: [
        { label: '5K', value: 5 },
        { label: '7K', value: 7 },
        { label: '10K', value: 10 },
      ],
    },
    { type: 'number', key: 'c', label: '水の比熱', unit: 'kJ/(kg·K)', min: 0, exclusiveMin: true, help: '水は約 4.186 kJ/(kg·K) です。' },
    { type: 'number', key: 'rho', label: '水の密度', unit: 'kg/m³', min: 0, exclusiveMin: true, help: '水は約 1000 kg/m³ です。' },
  ],
  defaults: { mode: 'load', q: '100', qe: '100', W: '25', cop: '4', dt: '5', c: '4.186', rho: '1000' },
  notes: [
    '水の比熱と密度は温度でわずかに変わります。通常は既定値（4.186 kJ/(kg·K)、1000 kg/m³）で十分です。不凍液（ブライン）を使う場合はその物性値を入力してください。',
    '冷却水の放熱量は、冷凍機の冷却能力に圧縮機の入力（吸収式は加熱量）を足した値です。',
  ],
  doc: hv10Doc,
  beginner: hv10Beginner,
  build(v) {
    const mode = str(v, 'mode');
    const dt = num(v, 'dt');
    const c = num(v, 'c');
    const rho = num(v, 'rho');

    const s = new SheetBuilder();
    s.section('計算条件').input('mode', '計算の対象', MODE_LABEL[mode]);

    s.section('熱量');
    let q: number;
    if (mode === 'cond') {
      const qe = num(v, 'qe');
      const W = num(v, 'W');
      q = qe + W;
      s.input('qe', '冷凍機の冷却能力', qe, { symbol: 'qe', unit: 'kW', digits: 1 })
        .input('W', '圧縮機の入力', W, { symbol: 'W', unit: 'kW', digits: 1 })
        .calc('q', '冷却水の放熱量', { symbol: 'qc', unit: 'kW', value: q, expr: '{qe} + {W}', formula: '{qe}+{W}', digits: 1 });
    } else if (mode === 'cop') {
      const qe = num(v, 'qe');
      const cop = num(v, 'cop');
      q = qe * (1 + 1 / cop);
      s.input('qe', '冷凍機の冷却能力', qe, { symbol: 'qe', unit: 'kW', digits: 1 })
        .input('cop', '成績係数', cop, { symbol: 'COP', digits: 2 })
        .calc('W', '圧縮機の入力', { symbol: 'W', unit: 'kW', value: qe / cop, expr: '{qe} ÷ {cop}', formula: '{qe}/{cop}', digits: 1 })
        .calc('q', '冷却水の放熱量', { symbol: 'qc', unit: 'kW', value: q, expr: '{qe} + {W}', formula: '{qe}+{W}', digits: 1 });
    } else {
      q = num(v, 'q');
      s.input('q', '熱量', q, { symbol: 'q', unit: 'kW', digits: 1 });
    }

    const G = (60000 * q) / (c * rho * dt);
    s.section('水量')
      .input('dt', '往還温度差', dt, { symbol: 'Δt', unit: 'K', digits: 1 })
      .input('c', '水の比熱', c, { symbol: 'c', unit: 'kJ/(kg·K)', digits: 3 })
      .input('rho', '水の密度', rho, { symbol: 'ρ', unit: 'kg/m³', digits: 0 })
      .calc('G', '必要水量', {
        symbol: 'G',
        unit: 'L/min',
        value: G,
        expr: '60000 × {q} ÷ ({c} × {rho} × {dt})',
        formula: '60000*{q}/({c}*{rho}*{dt})',
        digits: 1,
        note: '密度 1000 kg/m³ のとき 60 × q ÷ (c × Δt) と同じ',
      })
      .calc('Gh', '必要水量（毎時）', { symbol: 'G′', unit: 'm³/h', value: (G * 60) / 1000, expr: '{G} × 60 ÷ 1000', formula: '{G}*60/1000', digits: 2 })
      .highlight('q', 'G', 'Gh');
    return s.result();
  },
};
