import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { fp06Beginner, fp06Doc } from './docs/fp-06';

export const mechanicalSmokeExhaust: ToolDef = {
  id: 'FP-06',
  slug: 'mechanical-smoke-exhaust',
  category: 'fire',
  title: '排煙機の必要排煙量',
  summary: '建築基準法の機械排煙について、防煙区画の床面積から排煙機の必要排煙量を求めます。',
  keywords: ['排煙', '機械排煙', '排煙機', '排煙量', '防煙区画', '建築基準法', '120m3/min', '排煙設備'],
  references: [
    '建築基準法施行令 第126条の3第1項第9号（排煙機の能力）',
    '建築基準法施行令 第126条の3第1項第1号（防煙区画 500 m² 以内）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'zones',
      label: '排煙機が受け持つ防煙区画',
      display: 'segmented',
      options: [
        { value: 'one', label: '1つ' },
        { value: 'multi', label: '2以上' },
      ],
      help: '1台の排煙機が2以上の防煙区画を受け持つ場合は、最大の防煙区画の床面積を入力します。',
    },
    {
      type: 'number',
      key: 'A',
      label: '防煙区画の床面積（2以上なら最大の区画）',
      unit: 'm²',
      min: 0,
      exclusiveMin: true,
    },
  ],
  defaults: { zones: 'one', A: '300' },
  notes: [
    '排煙機は 120 m³/min 以上で、かつ防煙区画の床面積 1 m² につき 1 m³/min（2以上の防煙区画を受け持つ場合は最大の防煙区画の床面積 1 m² につき 2 m³/min）以上の能力とします（建築基準法施行令第126条の3第1項第9号）。',
    '求めた値は法令上の最低能力です。排煙機の選定では、風道の漏れや静圧を見込んで余裕を持たせます。',
    '排煙口は、防煙区画の各部分から水平距離 30 m 以下となるように設けます（同項第3号）。',
    '消防法の排煙設備（施行規則第30条）や、特別避難階段の付室・非常用エレベーターの乗降ロビーの排煙は、別の基準です。',
    '排煙設備は、建築主事・指定確認検査機関や所轄消防の指導によって取扱いが異なる場合があります。設計の前に協議してください。',
  ],
  doc: fp06Doc,
  beginner: fp06Beginner,
  build(v) {
    const multi = str(v, 'zones') === 'multi';
    const A = num(v, 'A');
    const r = multi ? 2 : 1;
    const Qa = A * r;
    const Q = Math.max(120, Qa);

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('zones', '受け持つ防煙区画', multi ? '2以上（最大の防煙区画の床面積で計算）' : '1つ')
      .input('r', '床面積当たりの排煙量', r, { symbol: 'r', unit: 'm³/(min·m²)', note: '建築基準法施行令第126条の3第1項第9号' })
      .input('Qmin', '最低排煙量', 120, { symbol: 'Qmin', unit: 'm³/min', note: '同号' })
      .section('入力値')
      .input('A', multi ? '最大の防煙区画の床面積' : '防煙区画の床面積', A, { symbol: multi ? 'Amax' : 'A', unit: 'm²', digits: 2 })
      .section('計算')
      .calc('Qa', '床面積による排煙量', { symbol: 'Qa', unit: 'm³/min', value: Qa, expr: '{A} × {r}', formula: '{A}*{r}', digits: 1 })
      .calc('Q', '必要排煙量', { symbol: 'Q', unit: 'm³/min', value: Q, expr: 'max({Qmin}, {Qa})', formula: 'MAX({Qmin},{Qa})', digits: 1 })
      .calc('Qh', '必要排煙量（毎時）', { symbol: 'Q′', unit: 'm³/h', value: Q * 60, expr: '{Q} × 60', formula: '{Q}*60', digits: 0 })
      .highlight('Q', 'Qh');
    if (A > 500) s.warn('防煙区画の床面積が 500 m² を超えています。防煙区画は床面積 500 m² 以内ごとに区画します（建築基準法施行令第126条の3第1項第1号）。');
    return s.result();
  },
};
