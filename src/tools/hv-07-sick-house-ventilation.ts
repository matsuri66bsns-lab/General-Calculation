import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { hv07Beginner, hv07Doc } from './docs/hv-07';

/** 建築基準法施行令第20条の8第1項第1号イ(1) の換気回数 n */
const KIND: Record<string, { label: string; n: number }> = {
  house: { label: '住宅等の居室', n: 0.5 },
  other: { label: 'その他の居室（住宅等の居室以外）', n: 0.3 },
};

export const sickHouseVentilation: ToolDef = {
  id: 'HV-07',
  slug: 'sick-house-ventilation',
  category: 'hvac',
  title: 'シックハウス対策の換気量',
  summary: '建築基準法のシックハウス対策（令第20条の8）で居室に必要な機械換気の有効換気量を求め、計画値を判定します。',
  keywords: ['シックハウス', '24時間換気', '常時換気', 'ホルムアルデヒド', '0.5回', '0.3回', '有効換気量', '建築基準法', '令20条の8'],
  references: [
    '建築基準法 第28条の2第三号（居室内における化学物質の発散に対する衛生上の措置）',
    '建築基準法施行令 第20条の8第1項第1号イ(1)（機械換気設備の有効換気量 Vr = n × A × h）',
    '建築基準法施行令 第20条の7第1項第2号の表の備考（住宅等の居室の範囲）',
    '平成15年国土交通省告示第273号',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'kind',
      label: '居室の区分',
      display: 'segmented',
      options: [
        { value: 'house', label: '住宅等の居室（0.5回/h）' },
        { value: 'other', label: 'その他の居室（0.3回/h）' },
      ],
      help: '住宅等の居室には、住宅の居室のほか、下宿の宿泊室、寄宿舎の寝室、家具その他これに類する物品の販売業を営む店舗の売場を含みます（令第20条の7第1項第2号の表の備考）。',
    },
    { type: 'number', key: 'A', label: '居室の床面積', unit: 'm²', min: 0, exclusiveMin: true },
    {
      type: 'number',
      key: 'h',
      label: '居室の天井の高さ',
      unit: 'm',
      min: 0,
      exclusiveMin: true,
      help: '天井の高さが一様でない場合は、室の容積を床面積で割った平均の高さを入力します。',
      suggestions: [
        { label: '2.4m', value: 2.4 },
        { label: '2.5m', value: 2.5 },
        { label: '2.7m', value: 2.7 },
      ],
    },
    {
      type: 'number',
      key: 'Vp',
      label: '計画した有効換気量',
      unit: 'm³/h',
      min: 0,
      help: '換気扇・送風機の有効換気量（ダクトなどの抵抗を考慮した風量）を入力します。',
    },
  ],
  defaults: { kind: 'house', A: '20', h: '2.4', Vp: '30' },
  notes: [
    '令第20条の8第1項第1号イ(1) の機械換気設備の式です。居室ごとに計算し、換気経路でつながる複数の居室を1つの換気系統とする場合は、各居室の必要量を合計して確認してください。',
    '内装仕上げのホルムアルデヒド発散建築材料の使用面積の制限（令第20条の7）は、換気回数（0.7回/h 以上かどうか など）で係数が変わります。材料の制限は別途確認してください。',
    '天井の高い居室など、告示により換気回数の扱いが定められている場合があります。平成15年国土交通省告示第273号ほか関連告示の原文で確認してください。',
  ],
  doc: hv07Doc,
  beginner: hv07Beginner,
  build(v) {
    const kind = KIND[str(v, 'kind')];
    const A = num(v, 'A');
    const h = num(v, 'h');
    const Vp = num(v, 'Vp');
    const n = kind.n;
    const Vr = n * A * h;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('kind', '居室の区分', kind.label)
      .input('n', '必要な換気回数', n, { symbol: 'n', unit: '回/h', note: '令第20条の8第1項第1号イ(1) の表' })
      .input('A', '居室の床面積', A, { symbol: 'A', unit: 'm²', digits: 2 })
      .input('h', '居室の天井の高さ', h, { symbol: 'h', unit: 'm', digits: 2 })
      .input('Vp', '計画した有効換気量', Vp, { symbol: 'Vp', unit: 'm³/h', digits: 1 })
      .section('必要有効換気量')
      .calc('Vroom', '居室の容積', { symbol: 'V', unit: 'm³', value: A * h, expr: '{A} × {h}', formula: '{A}*{h}', digits: 2 })
      .calc('Vr', '必要有効換気量', { symbol: 'Vr', unit: 'm³/h', value: Vr, expr: '{n} × {A} × {h}', formula: '{n}*{A}*{h}', digits: 1 })
      .section('判定')
      .calc('np', '計画の換気回数', { symbol: 'np', unit: '回/h', value: Vp / (A * h), expr: '{Vp} ÷ {Vroom}', formula: '{Vp}/{Vroom}', digits: 2 })
      .judge('ok', '判定', Vp >= Vr, { expr: '{Vp} ≥ {Vr}', formula: 'IF({Vp}>={Vr},"OK","NG")' })
      .highlight('Vr', 'np', 'ok');

    if (Vp < Vr) s.warn(`計画した有効換気量が必要量 ${Vr.toFixed(1)} m³/h に足りません。換気扇の能力を上げるか、台数を増やしてください。`);
    return s.result();
  },
};
