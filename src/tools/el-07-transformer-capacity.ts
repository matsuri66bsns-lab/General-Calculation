import type { Field, RawValues, ToolDef } from '../core/types';
import { SheetBuilder, stepUp, stepUpFormula } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { el07Beginner, el07Doc } from './docs/el-07';

/** JIS C 4304:2013 表3（定格容量の種類）単相 */
export const TR_SIZES_1P = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500] as const;
/** JIS C 4304:2013 表3（定格容量の種類）三相 */
export const TR_SIZES_3P = [20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000] as const;

export const MAX_LOADS = 6;
const rowVisible = (i: number) => (v: RawValues) => Number(v.n) >= i;

const loadFields: Field[] = [];
for (let i = 1; i <= MAX_LOADS; i++) {
  loadFields.push(
    { type: 'number', key: `P${i}`, label: `負荷${i} 設備容量`, unit: 'kW', min: 0, visible: rowVisible(i) },
    {
      type: 'number',
      key: `D${i}`,
      label: `負荷${i} 需要率`,
      unit: '%',
      min: 0,
      max: 100,
      visible: rowVisible(i),
      help: i === 1 ? '需要率 = 最大需要電力 ÷ 設備容量 × 100。値は案件の設計基準（建築設備設計基準など）で確認してください。' : undefined,
    },
  );
}

export const transformerCapacity: ToolDef = {
  id: 'EL-07',
  slug: 'transformer-capacity',
  category: 'electrical',
  title: '変圧器容量（需要率・不等率）',
  summary: '負荷群の設備容量・需要率・不等率から最大需要電力を求め、必要な変圧器容量と標準容量を選びます。',
  keywords: ['変圧器', 'トランス', '容量', '需要率', '不等率', '最大需要電力', '力率', 'kVA', '設備容量', '受変電'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」電気設備（受変電設備：変圧器容量の算定、需要率・不等率）',
    '内線規程 JEAC 8001 資料（需要率・不等率）',
    'JIS C 4304:2013 配電用6kV油入変圧器 表3（定格容量の種類）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'phase',
      label: '変圧器の相数',
      display: 'segmented',
      options: [
        { value: '3p', label: '三相' },
        { value: '1p', label: '単相' },
      ],
      help: '標準容量の系列は JIS C 4304 表3 によります（単相 10〜500 kVA、三相 20〜2,000 kVA）。',
    },
    {
      type: 'select',
      key: 'n',
      label: '負荷の行数',
      options: Array.from({ length: MAX_LOADS }, (_, k) => ({ value: String(k + 1), label: `${k + 1} 行` })),
    },
    ...loadFields,
    {
      type: 'number',
      key: 'F',
      label: '不等率',
      min: 1,
      help: '各負荷の最大需要電力の合計 ÷ 負荷群全体の最大需要電力（1 以上）。負荷群をまとめないときは 1 とします。値は設計基準で確認してください。',
    },
    {
      type: 'number',
      key: 'pf',
      label: '総合力率 cosφ',
      min: 0,
      exclusiveMin: true,
      max: 1,
      suggestions: [
        { label: '0.8', value: 0.8 },
        { label: '0.85', value: 0.85 },
        { label: '0.9', value: 0.9 },
        { label: '0.95', value: 0.95 },
      ],
    },
    {
      type: 'number',
      key: 'a',
      label: '余裕率（将来の負荷増加など）',
      unit: '%',
      min: 0,
      suggestions: [
        { label: '0%', value: 0 },
        { label: '10%', value: 10 },
        { label: '20%', value: 20 },
      ],
    },
  ],
  defaults: {
    phase: '3p',
    n: '3',
    P1: '80',
    D1: '70',
    P2: '60',
    D2: '50',
    P3: '150',
    D3: '80',
    P4: '30',
    D4: '60',
    P5: '20',
    D5: '50',
    P6: '10',
    D6: '100',
    F: '1.2',
    pf: '0.85',
    a: '10',
  },
  notes: [
    '最大需要電力 Pmax = Σ(設備容量 × 需要率) ÷ 不等率、必要容量 = Pmax ÷ cosφ × (1 + 余裕率) で求めます。',
    '需要率・不等率は用途・規模・負荷の種類で大きく変わるため、本ツールには目安値を内蔵していません。案件の設計基準（国土交通省「建築設備設計基準」など）で確認して入力してください。',
    '電動機の始動電流による電圧降下、高調波、将来増設の計画も別途確認してください。',
  ],
  doc: el07Doc,
  beginner: el07Beginner,
  build(v) {
    const phase = str(v, 'phase');
    const n = Number(str(v, 'n'));
    const sizes: readonly number[] = phase === '1p' ? TR_SIZES_1P : TR_SIZES_3P;
    const F = num(v, 'F');
    const pf = num(v, 'pf');
    const a = num(v, 'a');

    const s = new SheetBuilder();
    s.section('計算条件').input('phase', '変圧器の相数', phase === '1p' ? '単相' : '三相');
    s.section('負荷');
    let sumP = 0;
    let sumPD = 0;
    const pTerms: string[] = [];
    const pdTerms: string[] = [];
    for (let i = 1; i <= n; i++) {
      const P = num(v, `P${i}`);
      const D = num(v, `D${i}`);
      sumP += P;
      sumPD += (P * D) / 100;
      s.input(`P${i}`, `負荷${i} 設備容量`, P, { symbol: `P${i}`, unit: 'kW' })
        .input(`D${i}`, `負荷${i} 需要率`, D, { symbol: `D${i}`, unit: '%' });
      pTerms.push(`{P${i}}`);
      pdTerms.push(`{P${i}}*{D${i}}`);
    }
    if (sumPD <= 0) throw new CalcError('設備容量と需要率の積の合計が 0 です。設備容量と需要率を入力してください。');

    const Pmax = sumPD / F;
    const S = Pmax / pf;
    const Sr = S * (1 + a / 100);
    const sel = stepUp(Sr, sizes);
    const exprPD = Array.from({ length: n }, (_, k) => `{P${k + 1}} × {D${k + 1}}`).join(' + ');

    s.input('F', '不等率', F, { symbol: 'F', digits: 2 })
      .input('pf', '総合力率', pf, { symbol: 'cosφ', digits: 2 })
      .input('a', '余裕率', a, { symbol: 'α', unit: '%' })
      .section('最大需要電力')
      .calc('sumP', '設備容量の合計', { symbol: 'ΣP', unit: 'kW', value: sumP, expr: pTerms.join(' + '), formula: pTerms.join('+'), digits: 1 })
      .calc('sumPD', '各負荷の最大需要電力の合計', {
        symbol: 'Σ(P·D)',
        unit: 'kW',
        value: sumPD,
        expr: `(${exprPD}) ÷ 100`,
        formula: `(${pdTerms.join('+')})/100`,
        digits: 1,
      })
      .calc('Pmax', '最大需要電力', { symbol: 'Pmax', unit: 'kW', value: Pmax, expr: '{sumPD} ÷ {F}', formula: '{sumPD}/{F}', digits: 1 })
      .section('変圧器容量')
      .calc('S', '最大需要電力の皮相電力', { symbol: 'S', unit: 'kVA', value: S, expr: '{Pmax} ÷ {pf}', formula: '{Pmax}/{pf}', digits: 1 })
      .calc('Sr', '必要容量（余裕込み）', { symbol: 'Sr', unit: 'kVA', value: Sr, expr: '{S} × (1 + {a} ÷ 100)', formula: '{S}*(1+{a}/100)', digits: 1 })
      .calc('Ss', '選定する標準容量', {
        symbol: 'Ss',
        unit: 'kVA',
        value: sel ?? '範囲外',
        expr: '{Sr} 以上で最小の標準容量（JIS C 4304 表3）',
        formula: stepUpFormula('{Sr}', sizes),
        format: sel === null ? 'text' : 'number',
        digits: 0,
        note: phase === '1p' ? '単相 10〜500 kVA の系列' : '三相 20〜2,000 kVA の系列',
      })
      .highlight('Pmax', 'Sr', 'Ss');

    if (sel === null) {
      s.warn(`必要容量が標準容量の最大（${sizes[sizes.length - 1]} kVA）を超えます。変圧器を複数台に分けるか、特別仕様の変圧器を検討してください。`);
    }
    return s.result();
  },
};
