import type { Field, RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { BASIS, type BasisId, USES, pl11Beginner, pl11Doc, useOf } from './docs/pl-11';

const kindIs = (...kinds: string[]) => (v: RawValues) => kinds.includes(useOf(v.use).kind);
const basisIs = (b: BasisId) => (v: RawValues) => {
  const u = useOf(v.use);
  return u.kind === 'linear' && u.basis === b;
};

function useLabel(u: (typeof USES)[number]): string {
  if (u.kind === 'custom') return u.label;
  if (u.kind === 'linear' && u.basis) {
    const k = u.k === 1 ? '' : `${u.k}`;
    return `${u.no} ${u.label}（n = ${k}${BASIS[u.basis].symbol}）`;
  }
  return `${u.no} ${u.label}`;
}

/** 算定単位ごとの入力欄（延べ面積は住宅でも使う） */
const basisFields: Field[] = (Object.keys(BASIS) as BasisId[]).map((b) => ({
  type: 'number',
  key: b,
  label: BASIS[b].label,
  unit: BASIS[b].unit,
  min: 0,
  visible: b === 'A' ? (v: RawValues) => basisIs('A')(v) || useOf(v.use).kind === 'house' || (useOf(v.use).kind === 'apt' && v.aptm === 'total') : basisIs(b),
}));

export const septicTankPopulation: ToolDef = {
  id: 'PL-11',
  slug: 'septic-tank-population',
  category: 'plumbing',
  title: '浄化槽の処理対象人員',
  summary: 'JIS A 3302 の建築用途別算定基準で、浄化槽の処理対象人員を求めます。',
  keywords: ['浄化槽', '処理対象人員', '人槽', 'JIS A 3302', '合併処理浄化槽', '共同住宅', '事務所', '延べ面積'],
  references: [
    'JIS A 3302:2000 建築物の用途別による屎尿浄化槽の処理対象人員算定基準（2. 表、3. 特殊の建築用途の適用）',
    '建築基準法施行令 第32条第1項（汚物処理性能に関する技術的基準。処理対象人員の算定方法は国土交通大臣が定める）',
    '昭和44年建設省告示第3184号（処理対象人員の算定方法。JIS A 3302 を引用）',
    '昭和55年建設省告示第1292号（屎尿浄化槽及び合併処理浄化槽の構造方法を定める件）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'use',
      label: '建築用途（JIS A 3302 の表）',
      options: USES.map((u) => ({ value: u.value, label: useLabel(u) })),
      help: '番号は JIS A 3302 の類似用途別番号です。複数の用途がある建物は、用途ごとに計算して合計してください。',
    },
    ...basisFields,
    // 共同住宅
    {
      type: 'select',
      key: 'aptm',
      label: '共同住宅の計算方法',
      display: 'segmented',
      visible: kindIs('apt'),
      options: [
        { value: 'unit', label: '戸数で計算（上下限を適用）' },
        { value: 'total', label: '延べ面積の合計で計算' },
      ],
    },
    { type: 'number', key: 'a', label: '1戸当たりの延べ面積', unit: 'm²', min: 0, exclusiveMin: true, visible: (v) => useOf(v.use).kind === 'apt' && v.aptm !== 'total' },
    { type: 'number', key: 'Nd', label: '戸数', unit: '戸', min: 0, exclusiveMin: true, visible: (v) => useOf(v.use).kind === 'apt' && v.aptm !== 'total' },
    {
      type: 'select',
      key: 'room',
      label: '住戸の居室数',
      display: 'segmented',
      visible: (v) => useOf(v.use).kind === 'apt' && v.aptm !== 'total',
      options: [
        { value: 'multi', label: '2居室以上（下限 3.5人）' },
        { value: 'one', label: '1居室だけ（下限 2人）' },
      ],
      help: '居室は建築基準法の居室です。共同住宅の台所・食事室は居室に数えません（JIS A 3302 表の注(3)）。',
    },
    // 病院
    { type: 'number', key: 'B', label: 'ベッド数', unit: '床', min: 0, visible: kindIs('hospital') },
    // 駅
    { type: 'number', key: 'Pp', label: '乗降客数', unit: '人/日', min: 0, visible: kindIs('station') },
    // 便器数方式
    { type: 'number', key: 'Cb', label: '大便器数', unit: '個', min: 0, visible: kindIs('cut') },
    { type: 'number', key: 'U', label: '小便器数', unit: '個', min: 0, visible: kindIs('cut'), help: '女子専用便所では、便器数のおおむね 1/2 を小便器とみなします（JIS A 3302 表の注(4)）。' },
    {
      type: 'number',
      key: 't',
      label: '単位便器当たり1日平均使用時間',
      unit: 'h',
      min: 0,
      exclusiveMin: true,
      visible: kindIs('cut'),
      help: 'JIS A 3302 の範囲：プール・スケート場 1.0〜2.0 h、駐車場・自動車車庫 0.4〜2.0 h。',
    },
    // 任意入力
    { type: 'number', key: 'kc', label: '算定係数 k', unit: '人/算定単位', min: 0, visible: kindIs('custom'), help: '類似用途の算定式や、特定行政庁・審査機関の指示による係数を入力します。' },
    { type: 'number', key: 'xc', label: '算定単位の数量 X（延べ面積・定員など）', min: 0, visible: kindIs('custom') },
  ],
  defaults: {
    use: 'office',
    A: '3000',
    P: '100',
    Pc: '100',
    Pk: '100',
    R: '20',
    Ss: '20',
    Sc: '4',
    L: '20',
    H: '18',
    C: '10',
    G: '1',
    aptm: 'unit',
    a: '60',
    Nd: '20',
    room: 'multi',
    B: '200',
    Pp: '50000',
    Cb: '4',
    U: '4',
    t: '1',
    kc: '0.06',
    xc: '1000',
  },
  notes: [
    '算定式は JIS A 3302:2000 の表によります。表が実情に合わない場合は、類似施設の使用水量などの資料をもとに増減できるとされています（同 2. ただし書き）。',
    '同じ建物に複数の用途がある場合、また複数の建物で共同の浄化槽を設ける場合は、用途ごとに求めて合計します（同 3.2、3.3）。',
    '住宅の 130 m² の扱い、端数の処理、増減の運用は特定行政庁・審査機関によって異なります。所管の窓口で確認してください。',
    '昭和44年建設省告示第3184号は JIS A 3302 を年版を付けずに引用しています（本ツールは現行の JIS A 3302:2000 によります）。昭和55年建設省告示第1292号は JIS A 3302 を引用していません。告示・JIS とも処理対象人員の端数処理の定めはありません。',
  ],
  doc: pl11Doc,
  beginner: pl11Beginner,
  build(v) {
    const u = useOf(str(v, 'use'));
    const s = new SheetBuilder();
    s.section('建築用途').input('use', '建築用途', u.kind === 'custom' ? u.label : `JIS A 3302 表 ${u.no} ${u.label}`);
    const tableNote = `JIS A 3302 表 ${u.no}`;

    if (u.kind === 'linear' && u.basis) {
      const b = BASIS[u.basis];
      const X = num(v, u.basis);
      s.section('計算')
        .input('k', '算定係数', u.k!, { symbol: 'k', note: tableNote })
        .input('X', b.label, X, { symbol: b.symbol, unit: b.unit })
        .calc('n', '処理対象人員', { symbol: 'n', unit: '人', value: u.k! * X, expr: '{k} × {X}', formula: '{k}*{X}', digits: 1 });
    } else if (u.kind === 'house') {
      const A = num(v, 'A');
      s.section('計算')
        .input('A', '延べ面積', A, { symbol: 'A', unit: 'm²', digits: 1 })
        .calc('n', '処理対象人員', {
          symbol: 'n',
          unit: '人',
          value: A <= 130 ? 5 : 7,
          expr: '{A} ≤ 130 なら 5、超えれば 7',
          formula: 'IF({A}<=130,5,7)',
          digits: 0,
          note: `${tableNote}（130 m² は地域の実情で増減できる値）`,
        });
    } else if (u.kind === 'apt') {
      if (str(v, 'aptm') === 'total') {
        const A = num(v, 'A');
        s.section('計算')
          .input('k', '算定係数', u.k!, { symbol: 'k', note: tableNote })
          .input('A', '延べ面積（建物全体）', A, { symbol: 'A', unit: 'm²', digits: 1 })
          .calc('n', '処理対象人員', { symbol: 'n', unit: '人', value: u.k! * A, expr: '{k} × {A}', formula: '{k}*{A}', digits: 1 });
        s.warn('延べ面積の合計で計算しているため、1戸当たりの上限（6人）・下限（3.5人、1居室は2人）を反映していません。戸数で計算する方法でも確認してください。');
      } else {
        const a = num(v, 'a');
        const Nd = num(v, 'Nd');
        const one = str(v, 'room') === 'one';
        const lo = one ? 2 : 3.5;
        const n1 = u.k! * a;
        const n1c = n1 <= 3.5 ? lo : n1 >= 6 ? 6 : n1;
        s.section('1戸当たりの人員')
          .input('k', '算定係数', u.k!, { symbol: 'k', note: tableNote })
          .input('a', '1戸当たりの延べ面積', a, { symbol: 'a', unit: 'm²', digits: 1 })
          .input('lo', '1戸当たりの下限', lo, { symbol: 'nmin', unit: '人', note: one ? '1居室だけで構成される住戸' : '2居室以上の住戸' })
          .input('hi', '1戸当たりの上限', 6, { symbol: 'nmax', unit: '人', note: `${tableNote} ただし書き` })
          .calc('n1', '1戸当たりの人員（上下限の適用前）', { symbol: 'n₁', unit: '人', value: n1, expr: '{k} × {a}', formula: '{k}*{a}', digits: 2 })
          .calc('n1c', '1戸当たりの人員', {
            symbol: 'n₁′',
            unit: '人',
            value: n1c,
            expr: '{n1} ≤ 3.5 なら {lo}、{n1} ≥ {hi} なら {hi}、それ以外は {n1}',
            formula: 'IF({n1}<=3.5,{lo},IF({n1}>={hi},{hi},{n1}))',
            digits: 2,
          })
          .section('処理対象人員')
          .input('Nd', '戸数', Nd, { symbol: 'N', unit: '戸', digits: 0 })
          .calc('n', '処理対象人員', { symbol: 'n', unit: '人', value: n1c * Nd, expr: '{n1c} × {Nd}', formula: '{n1c}*{Nd}', digits: 1 });
      }
    } else if (u.kind === 'hospital') {
      const h = u.hosp!;
      const B = num(v, 'B');
      s.section('計算')
        .input('B', 'ベッド数', B, { symbol: 'B', unit: '床', digits: 0 })
        .input('k1', '300床未満の係数', h.k1, { symbol: 'k₁', unit: '人/床', note: tableNote })
        .input('k2', '300床以上の係数', h.k2, { symbol: 'k₂', unit: '人/床', note: tableNote })
        .input('c2', '300床以上の定数', h.c2, { symbol: 'c₂', unit: '人', note: tableNote })
        .calc('n', '処理対象人員', {
          symbol: 'n',
          unit: '人',
          value: B < 300 ? h.k1 * B : h.k2 * (B - 300) + h.c2,
          expr: '{B} < 300 なら {k1} × {B}、それ以外は {k2} × ({B} − 300) + {c2}',
          formula: 'IF({B}<300,{k1}*{B},{k2}*({B}-300)+{c2})',
          digits: 1,
        });
    } else if (u.kind === 'station') {
      const P = num(v, 'Pp');
      const k = P < 100000 ? 0.008 : P < 200000 ? 0.01 : 0.013;
      s.section('計算')
        .input('Pp', '乗降客数', P, { symbol: 'P', unit: '人/日', digits: 0 })
        .calc('k', '算定係数', {
          symbol: 'k',
          value: k,
          expr: '{Pp} < 100,000 なら 0.008、200,000 未満なら 0.010、それ以上は 0.013',
          formula: 'IF({Pp}<100000,0.008,IF({Pp}<200000,0.01,0.013))',
          digits: 3,
          note: tableNote,
        })
        .calc('n', '処理対象人員', { symbol: 'n', unit: '人', value: k * P, expr: '{k} × {Pp}', formula: '{k}*{Pp}', digits: 1 });
    } else if (u.kind === 'cut') {
      const C = num(v, 'Cb');
      const U = num(v, 'U');
      const t = num(v, 't');
      const [t1, t2] = u.tRange!;
      s.section('計算')
        .input('Cb', '大便器数', C, { symbol: 'C', unit: '個', digits: 0 })
        .input('U', '小便器数', U, { symbol: 'U', unit: '個', digits: 0 })
        .input('t', '単位便器当たり1日平均使用時間', t, { symbol: 't', unit: 'h', note: `${tableNote}（${t1}〜${t2} h）` })
        .calc('n', '処理対象人員', {
          symbol: 'n',
          unit: '人',
          value: ((20 * C + 120 * U) / 8) * t,
          expr: '(20 × {Cb} + 120 × {U}) ÷ 8 × {t}',
          formula: '(20*{Cb}+120*{U})/8*{t}',
          digits: 1,
        });
      if (t < t1 || t > t2) s.warn(`単位便器当たり1日平均使用時間が JIS A 3302 の範囲（${t1}〜${t2} h）の外です。`);
    } else {
      const k = num(v, 'kc');
      const X = num(v, 'xc');
      s.section('計算')
        .input('kc', '算定係数', k, { symbol: 'k', unit: '人/算定単位', note: '利用者入力（JIS A 3302 3.1 により表に準じて算定）' })
        .input('xc', '算定単位の数量', X, { symbol: 'X' })
        .calc('n', '処理対象人員', { symbol: 'n', unit: '人', value: k * X, expr: '{kc} × {xc}', formula: '{kc}*{xc}', digits: 1 });
    }
    s.highlight('n');
    return s.result();
  },
};
