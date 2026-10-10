import type { Field, RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';

interface Unit {
  id: string;
  label: string;
  /** 基準単位への換算：基準値 = 値 × a + b */
  a: number;
  b?: number;
}

interface Quantity {
  id: string;
  name: string;
  baseLabel: string;
  units: Unit[];
}

const F_A = 5 / 9;
const F_B = 273.15 - 32 * F_A;

export const QUANTITIES: Quantity[] = [
  {
    id: 'pressure',
    name: '圧力',
    baseLabel: 'Pa',
    units: [
      { id: 'Pa', label: 'Pa', a: 1 },
      { id: 'kPa', label: 'kPa', a: 1e3 },
      { id: 'MPa', label: 'MPa', a: 1e6 },
      { id: 'hPa', label: 'hPa', a: 100 },
      { id: 'bar', label: 'bar', a: 1e5 },
      { id: 'mmAq', label: 'mmAq（mmH₂O）', a: 9.80665 },
      { id: 'mAq', label: 'mAq（mH₂O）', a: 9806.65 },
      { id: 'kgfcm2', label: 'kgf/cm²', a: 98066.5 },
      { id: 'atm', label: 'atm', a: 101325 },
      { id: 'mmHg', label: 'mmHg', a: 133.322387415 },
      { id: 'psi', label: 'psi', a: 6894.757293168 },
    ],
  },
  {
    id: 'flow',
    name: '流量・風量',
    baseLabel: 'm³/s',
    units: [
      { id: 'm3h', label: 'm³/h', a: 1 / 3600 },
      { id: 'm3min', label: 'm³/min', a: 1 / 60 },
      { id: 'm3s', label: 'm³/s', a: 1 },
      { id: 'Lmin', label: 'L/min', a: 1e-3 / 60 },
      { id: 'Ls', label: 'L/s', a: 1e-3 },
      { id: 'Lh', label: 'L/h', a: 1e-3 / 3600 },
      { id: 'cfm', label: 'CFM（ft³/min）', a: 0.028316846592 / 60 },
      { id: 'gpm', label: 'US gpm', a: 0.003785411784 / 60 },
    ],
  },
  {
    id: 'heat',
    name: '熱量・動力',
    baseLabel: 'W',
    units: [
      { id: 'W', label: 'W', a: 1 },
      { id: 'kW', label: 'kW', a: 1e3 },
      { id: 'kcalh', label: 'kcal/h', a: 1.163 },
      { id: 'Mcalh', label: 'Mcal/h', a: 1163 },
      { id: 'USRT', label: '冷凍トン（USRT）', a: 3516.853 },
      { id: 'JRT', label: '日本冷凍トン（JRT）', a: 3860 },
      { id: 'BTUh', label: 'BTU/h', a: 0.29307107 },
      { id: 'PS', label: '仏馬力（PS）', a: 735.49875 },
    ],
  },
  {
    id: 'energy',
    name: 'エネルギー',
    baseLabel: 'J',
    units: [
      { id: 'J', label: 'J', a: 1 },
      { id: 'kJ', label: 'kJ', a: 1e3 },
      { id: 'MJ', label: 'MJ', a: 1e6 },
      { id: 'GJ', label: 'GJ', a: 1e9 },
      { id: 'Wh', label: 'Wh', a: 3600 },
      { id: 'kWh', label: 'kWh', a: 3.6e6 },
      { id: 'kcal', label: 'kcal', a: 4186.8 },
      { id: 'BTU', label: 'BTU', a: 1055.05585262 },
    ],
  },
  {
    id: 'temp',
    name: '温度',
    baseLabel: 'K',
    units: [
      { id: 'C', label: '℃', a: 1, b: 273.15 },
      { id: 'K', label: 'K', a: 1, b: 0 },
      { id: 'F', label: '℉', a: F_A, b: F_B },
    ],
  },
];

const fromField = (q: Quantity): Field => ({
  type: 'select',
  key: `from_${q.id}`,
  label: '換算元の単位',
  options: q.units.map((u) => ({ value: u.id, label: u.label })),
  visible: (v: RawValues) => v.q === q.id,
});

/** Excel 式に埋め込む数値。浮動小数の表現をそのまま使う */
const lit = (x: number) => String(x);

export const unitConvert: ToolDef = {
  id: 'CM-01',
  slug: 'unit-convert',
  category: 'common',
  title: '単位換算（圧力・流量・熱量・温度）',
  summary: '圧力・流量・熱量・エネルギー・温度について、設備設計でよく使う単位を一括で換算します。',
  keywords: ['単位換算', '圧力', 'mmAq', 'kPa', '流量', '風量', 'CMH', '熱量', 'kcal', '冷凍トン', 'RT', 'BTU', '温度', '華氏'],
  references: ['計量法、JIS Z 8000（量及び単位）。kcal は国際蒸気表カロリー（1 kcal = 4.1868 kJ）'],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'q',
      label: '量の種類',
      display: 'segmented',
      options: QUANTITIES.map((q) => ({ value: q.id, label: q.name })),
    },
    { type: 'number', key: 'x', label: '値' },
    ...QUANTITIES.map(fromField),
  ],
  defaults: {
    q: 'pressure',
    x: '100',
    from_pressure: 'kPa',
    from_flow: 'm3h',
    from_heat: 'kW',
    from_energy: 'kWh',
    from_temp: 'C',
  },
  notes: ['冷凍トンは USRT = 3.5169 kW、日本冷凍トン JRT = 3.86 kW として換算します。'],
  build(v) {
    const q = QUANTITIES.find((q) => q.id === str(v, 'q')) ?? QUANTITIES[0];
    const from = q.units.find((u) => u.id === str(v, `from_${q.id}`)) ?? q.units[0];
    const x = num(v, 'x');
    const b = from.b ?? 0;
    const base = x * from.a + b;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('x', `値（${from.label}）`, x, { symbol: 'x', unit: from.label })
      .input('a', `換算係数（1 ${from.label} あたりの ${q.baseLabel}）`, from.a, { symbol: 'a', unit: q.baseLabel })
    if (from.b !== undefined) s.input('b', '換算の加算項', b, { symbol: 'b', unit: q.baseLabel });
    s.section('基準単位')
      .calc('base', `基準単位での値（${q.baseLabel}）`, {
        symbol: 'X',
        unit: q.baseLabel,
        value: base,
        expr: from.b !== undefined ? '{x} × {a} + {b}' : '{x} × {a}',
        formula: from.b !== undefined ? '{x}*{a}+{b}' : '{x}*{a}',
      })
      .section('換算結果');

    const keys: string[] = [];
    q.units.forEach((u, i) => {
      const key = `u${i}`;
      keys.push(key);
      const hasB = u.b !== undefined;
      const ub = u.b ?? 0;
      s.calc(key, u.label, {
        unit: u.label,
        value: (base - ub) / u.a,
        expr: hasB ? `({base} − ${ub}) ÷ ${u.a === 1 ? '1' : '5/9'}` : `{base} ÷ ${u.a.toPrecision(6).replace(/\.?0+$/, '')}`,
        formula: hasB ? `({base}-${lit(ub)})/${lit(u.a)}` : `{base}/${lit(u.a)}`,
      });
    });
    s.highlight(...keys);
    return s.result();
  },
};
