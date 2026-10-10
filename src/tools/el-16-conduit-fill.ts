import type { Field, RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { el16Beginner, el16Doc } from './docs/el-16';

/** JIS C 8305:2019 鋼製電線管の外径と厚さ（表2 厚鋼、表3 薄鋼、表4 ねじなし） */
export const CONDUITS: { value: string; kind: string; table: string; OD: number; t: number }[] = [
  ...(
    [
      ['G16', 21.0, 2.3], ['G22', 26.5, 2.3], ['G28', 33.3, 2.5], ['G36', 41.9, 2.5], ['G42', 47.8, 2.5],
      ['G54', 59.6, 2.8], ['G70', 75.2, 2.8], ['G82', 87.9, 2.8], ['G92', 100.7, 3.5], ['G104', 113.4, 3.5],
    ] as const
  ).map(([value, OD, t]) => ({ value, kind: '厚鋼電線管', table: '表2', OD, t })),
  ...(
    [
      ['C19', 19.1, 1.6], ['C25', 25.4, 1.6], ['C31', 31.8, 1.6], ['C39', 38.1, 1.6], ['C51', 50.8, 1.6],
      ['C63', 63.5, 2.0], ['C75', 76.2, 2.0],
    ] as const
  ).map(([value, OD, t]) => ({ value, kind: '薄鋼電線管', table: '表3', OD, t })),
  ...(
    [
      ['E19', 19.1, 1.2], ['E25', 25.4, 1.2], ['E31', 31.8, 1.4], ['E39', 38.1, 1.4], ['E51', 50.8, 1.4],
      ['E63', 63.5, 1.6], ['E75', 76.2, 1.8],
    ] as const
  ).map(([value, OD, t]) => ({ value, kind: 'ねじなし電線管', table: '表4', OD, t })),
];

export const MAX_WIRE_TYPES = 4;
const SUB = ['', '₁', '₂', '₃', '₄'];
const typeVisible = (i: number) => (v: RawValues) => Number(v.k) >= i;

const wireFields: Field[] = [];
for (let i = 1; i <= MAX_WIRE_TYPES; i++) {
  wireFields.push(
    { type: 'number', key: `n${i}`, label: `電線${i} 本数`, unit: '本', min: 0, visible: typeVisible(i) },
    {
      type: 'number',
      key: `d${i}`,
      label: `電線${i} 仕上がり外径`,
      unit: 'mm',
      min: 0,
      exclusiveMin: true,
      visible: typeVisible(i),
      help: i === 1 ? '絶縁体（被覆）を含む外径です。電線・ケーブルのメーカー資料の値を入れます。' : undefined,
    },
  );
}

export const conduitFill: ToolDef = {
  id: 'EL-16',
  slug: 'conduit-fill',
  category: 'electrical',
  title: '電線管の太さ（占積率）',
  summary: '電線の仕上がり外径と本数から電線管の占積率を求め、上限との比較と必要な管内径を示します。',
  keywords: ['電線管', '占積率', '管の太さ', '金属管', '厚鋼', '薄鋼', 'ねじなし', '48%', '32%', '内線規程', 'JIS C 8305'],
  references: [
    '内線規程 JEAC 8001（金属管配線・合成樹脂管配線における管の太さの選定。同一太さ 48 %、異なる太さ 32 % とされる占積率の上限は原文で確認）',
    'JIS C 8305:2019 鋼製電線管 表2（厚鋼電線管）・表3（薄鋼電線管）・表4（ねじなし電線管）の外径・厚さ',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'mode',
      label: '電線の太さ',
      display: 'segmented',
      options: [
        { value: 'same', label: '同一太さ', apply: { lim: '48' } },
        { value: 'diff', label: '異なる太さ', apply: { lim: '32' } },
      ],
      help: '選ぶと占積率の上限に一般的な値（同一太さ 48 %、異なる太さ 32 %）が入ります。内線規程で確認してください。',
    },
    {
      type: 'number',
      key: 'lim',
      label: '占積率の上限',
      unit: '%',
      min: 0,
      exclusiveMin: true,
      max: 100,
      help: '内線規程の管の太さの選定に関する規定で確認した値を入れます。',
    },
    {
      type: 'select',
      key: 'k',
      label: '電線の種類数',
      display: 'segmented',
      options: [
        { value: '1', label: '1種類' },
        { value: '2', label: '2種類' },
        { value: '3', label: '3種類' },
        { value: '4', label: '4種類' },
      ],
    },
    ...wireFields,
    {
      type: 'select',
      key: 'conduit',
      label: '電線管（JIS C 8305 の呼び）',
      options: [
        { value: 'custom', label: '内径を直接入力（合成樹脂管など）' },
        ...CONDUITS.map((c) => ({ value: c.value, label: `${c.kind} ${c.value}（外径 ${c.OD.toFixed(1)} mm、厚さ ${c.t.toFixed(1)} mm）` })),
      ],
      help: '鋼製電線管は JIS C 8305 の外径と厚さから内径（外径 − 2 × 厚さ）を求めます。合成樹脂管などはメーカー資料の内径を直接入力してください。',
    },
    { type: 'number', key: 'D', label: '電線管の内径', unit: 'mm', min: 0, exclusiveMin: true, visible: (v) => v.conduit === 'custom' },
  ],
  defaults: {
    mode: 'same',
    lim: '48',
    k: '1',
    n1: '6',
    d1: '5',
    n2: '3',
    d2: '7',
    n3: '2',
    d3: '9',
    n4: '1',
    d4: '12',
    conduit: 'C25',
    D: '22',
  },
  notes: [
    '占積率 = 電線の断面積（被覆を含む）の合計 ÷ 管の内断面積 × 100 で求めます。',
    '占積率の上限（同一太さ 48 %、異なる太さ 32 %）は内線規程で一般的とされる値を既定値にしています。適用条件（電線の本数、管の屈曲、ケーブルの場合など）を含め、内線規程の原文で確認してください。',
    '鋼製電線管の内径は JIS C 8305 の外径と厚さの基準寸法から求めた値です。許容差は考慮していません。',
    '管の太さは占積率のほか、屈曲の数・こう長、電線の許容電流の低減（同一管内の本数）も考えて決めます。',
  ],
  doc: el16Doc,
  beginner: el16Beginner,
  build(v) {
    const mode = str(v, 'mode');
    const lim = num(v, 'lim');
    const k = Number(str(v, 'k'));
    const conduit = str(v, 'conduit');

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('mode', '電線の太さ', mode === 'diff' ? '異なる太さ' : '同一太さ')
      .input('lim', '占積率の上限', lim, { symbol: 'εa', unit: '%', note: '内線規程で確認した値' })
      .section('電線');

    let Aw = 0;
    const terms: string[] = [];
    const exprTerms: string[] = [];
    const ds: number[] = [];
    let totalN = 0;
    for (let i = 1; i <= k; i++) {
      const n = num(v, `n${i}`);
      const d = num(v, `d${i}`);
      Aw += (n * Math.PI * d * d) / 4;
      totalN += n;
      if (n > 0) ds.push(d);
      s.input(`n${i}`, `電線${i} 本数`, n, { symbol: `n${SUB[i]}`, unit: '本', digits: 0 })
        .input(`d${i}`, `電線${i} 仕上がり外径`, d, { symbol: `d${SUB[i]}`, unit: 'mm', digits: 1 });
      terms.push(`{n${i}}*{d${i}}^2`);
      exprTerms.push(`{n${i}} × {d${i}}²`);
    }
    if (totalN <= 0) throw new CalcError('電線の本数を1本以上入力してください。');

    s.calc('Aw', '電線の断面積の合計', {
      symbol: 'Aw',
      unit: 'mm²',
      value: Aw,
      expr: `π ÷ 4 × (${exprTerms.join(' + ')})`,
      formula: `PI()/4*(${terms.join('+')})`,
      digits: 1,
    });

    s.section('電線管');
    if (conduit === 'custom') {
      s.input('D', '電線管の内径', num(v, 'D'), { symbol: 'D', unit: 'mm', digits: 1, note: 'メーカー資料の値' });
    } else {
      const c = CONDUITS.find((x) => x.value === conduit)!;
      s.input('conduit', '電線管', `${c.kind} ${c.value}`)
        .input('OD', '外径', c.OD, { symbol: 'Do', unit: 'mm', digits: 1, note: `JIS C 8305 ${c.table}` })
        .input('t', '厚さ', c.t, { symbol: 't', unit: 'mm', digits: 1, note: `JIS C 8305 ${c.table}` })
        .calc('D', '電線管の内径', { symbol: 'D', unit: 'mm', value: c.OD - 2 * c.t, expr: '{OD} − 2 × {t}', formula: '{OD}-2*{t}', digits: 1 });
    }
    const D = Number(s.get('D'));
    const Ac = (Math.PI * D * D) / 4;
    const ratio = (Aw / Ac) * 100;
    const Dreq = Math.sqrt((4 * Aw) / (Math.PI * (lim / 100)));
    s.calc('Ac', '管の内断面積', { symbol: 'Ac', unit: 'mm²', value: Ac, expr: 'π ÷ 4 × {D}²', formula: 'PI()/4*{D}^2', digits: 1 })
      .section('占積率')
      .calc('ratio', '占積率', { symbol: 'ε', unit: '%', value: ratio, expr: '{Aw} ÷ {Ac} × 100', formula: '{Aw}/{Ac}*100', digits: 1 })
      .judge('ok', '判定', ratio <= lim, { expr: '{ratio} ≤ {lim}', formula: 'IF({ratio}<={lim},"OK","NG")' })
      .calc('Dreq', '上限に収まる最小の管内径', {
        symbol: 'Dr',
        unit: 'mm',
        value: Dreq,
        expr: '√(4 × {Aw} ÷ (π × {lim} ÷ 100))',
        formula: 'SQRT(4*{Aw}/(PI()*{lim}/100))',
        digits: 1,
        note: 'この内径以上の管を選ぶ',
      })
      .highlight('ratio', 'ok', 'Dreq');

    if (ratio > lim) s.warn(`占積率が上限 ${lim} % を超えています。内径 ${Dreq.toFixed(1)} mm 以上の電線管を選ぶか、管を分けてください。`);
    if (mode === 'same' && new Set(ds).size > 1) s.warn('外径の異なる電線が含まれています。「異なる太さ」を選び、上限を確認してください。');
    return s.result();
  },
};
