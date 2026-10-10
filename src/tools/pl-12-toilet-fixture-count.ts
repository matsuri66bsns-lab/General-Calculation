import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { LAW, pl12Beginner, pl12Doc } from './docs/pl-12';

/** 第628条（第17条）・第628条の2第2項（第17条の2第2項）の表の算定。count が 0 なら 0 */
export function requiredCount(count: number, independent: number, per: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.ceil(Math.max(0, count - 10 * independent) / per));
}

export const toiletFixtureCount: ToolDef = {
  id: 'PL-12',
  slug: 'toilet-fixture-count',
  category: 'plumbing',
  title: '事業場の便所の必要個数',
  summary: '同時に就業する男女の労働者数から、労働安全衛生規則・事務所衛生基準規則による便所の必要数を求めます。',
  keywords: ['便所', '便房', '大便器', '小便器', '必要個数', '労働安全衛生規則', '事務所衛生基準規則', '独立個室型', '第628条', '第17条'],
  references: [
    '労働安全衛生規則 第628条第1項第1号〜第4号（便所）',
    '労働安全衛生規則 第628条の2第1項・第2項（独立個室型の便所の特例）',
    '事務所衛生基準規則 第17条第1項第1号〜第4号（便所）',
    '事務所衛生基準規則 第17条の2第1項・第2項（独立個室型の便所の特例）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'law',
      label: '事業場の種類（適用する規則）',
      display: 'segmented',
      options: [
        { value: 'office', label: '事務所（事務所衛生基準規則）' },
        { value: 'other', label: '事務所以外（労働安全衛生規則）' },
      ],
      help: '算定方法はどちらも同じです。根拠条文の表示が変わります。',
    },
    { type: 'number', key: 'M', label: '同時に就業する男性労働者の数', unit: '人', min: 0 },
    { type: 'number', key: 'F', label: '同時に就業する女性労働者の数', unit: '人', min: 0 },
    {
      type: 'number',
      key: 'k',
      label: '設ける独立個室型の便所の数',
      unit: '個',
      min: 0,
      help: '男女の区別のない、四方を壁等で囲まれた1個の便房で構成される便所です。1個につき10人を、男性・女性それぞれの人数から差し引いて算定できます。設けない場合は 0 にします。',
    },
  ],
  defaults: { law: 'office', M: '70', F: '30', k: '0' },
  notes: [
    '人数は「同時に就業する」労働者の数です。交替制の場合は、最も多い時間帯の人数を入れます。',
    '独立個室型の便所を設ける場合、1個につき10人を男性・女性それぞれの人数から差し引いて算定します（第628条の2第2項・第17条の2第2項の表）。',
    '同時に就業する労働者が常時10人以内なら、男女別にせず独立個室型の便所1個で足ります（第628条の2第1項・第17条の2第1項）。',
    '男性（女性）の労働者がいない場合、その性別の便所は 0 として表示しています。',
    '手洗い設備（第628条第1項第6号・第17条第1項第6号）など、個数以外の要件も確認してください。',
  ],
  doc: pl12Doc,
  beginner: pl12Beginner,
  build(v) {
    const law = LAW[str(v, 'law')];
    const M = num(v, 'M');
    const F = num(v, 'F');
    const k = num(v, 'k');
    const total = M + F;
    const Me = Math.max(0, M - 10 * k);
    const Fe = Math.max(0, F - 10 * k);
    const wcM = requiredCount(M, k, 60);
    const urM = requiredCount(M, k, 30);
    const wcF = requiredCount(F, k, 20);

    const s = new SheetBuilder();
    s.section('入力値')
      .input('law', '適用する規則', law.name)
      .input('M', '同時に就業する男性労働者の数', M, { symbol: 'M', unit: '人', digits: 0 })
      .input('F', '同時に就業する女性労働者の数', F, { symbol: 'F', unit: '人', digits: 0 })
      .input('k', '独立個室型の便所の数', k, { symbol: 'k', unit: '個', digits: 0 })
      .section(`10人以内の特例（${law.special1}）`)
      .calc('T', '同時に就業する労働者の合計', { symbol: 'T', unit: '人', value: total, expr: '{M} + {F}', formula: '{M}+{F}', digits: 0 })
      .calc('sp', '独立個室型の便所1個で足りる特例', {
        value: total <= 10 ? '適用できる' : '適用できない',
        expr: '{T} ≤ 10（常時）なら適用できる',
        formula: 'IF({T}<=10,"適用できる","適用できない")',
        format: 'text',
      })
      .section(k > 0 ? `男女別の便所（${law.special2}）` : `男女別の便所（${law.base}）`)
      .calc('Me', '算定に用いる男性の人数', { symbol: 'M′', unit: '人', value: Me, expr: 'max(0, {M} − 10 × {k})', formula: 'MAX(0,{M}-10*{k})', digits: 0 })
      .calc('Fe', '算定に用いる女性の人数', { symbol: 'F′', unit: '人', value: Fe, expr: 'max(0, {F} − 10 × {k})', formula: 'MAX(0,{F}-10*{k})', digits: 0 })
      .calc('wcM', '男性用大便所の便房の数', {
        symbol: 'Wm',
        unit: '個',
        value: wcM,
        expr: '{M} = 0 なら 0、それ以外は max(1, ⌈{Me} ÷ 60⌉)',
        formula: 'IF({M}=0,0,MAX(1,ROUNDUP({Me}/60,0)))',
        digits: 0,
      })
      .calc('urM', '男性用小便所の箇所数', {
        symbol: 'Um',
        unit: '箇所',
        value: urM,
        expr: '{M} = 0 なら 0、それ以外は max(1, ⌈{Me} ÷ 30⌉)',
        formula: 'IF({M}=0,0,MAX(1,ROUNDUP({Me}/30,0)))',
        digits: 0,
      })
      .calc('wcF', '女性用便所の便房の数', {
        symbol: 'Wf',
        unit: '個',
        value: wcF,
        expr: '{F} = 0 なら 0、それ以外は max(1, ⌈{Fe} ÷ 20⌉)',
        formula: 'IF({F}=0,0,MAX(1,ROUNDUP({Fe}/20,0)))',
        digits: 0,
      })
      .highlight('wcM', 'urM', 'wcF', 'sp');

    if (total <= 10) {
      s.warn(`同時に就業する労働者が常時10人以内なら、男女別にしない独立個室型の便所1個で足ります（${law.special1}）。下の個数は男女別に設ける場合の値です。`);
    }
    if (k > 0 && total <= 10) {
      s.warn(`常時10人以内で特例（${law.special1}）を使う場合、第2項の差し引きは適用しません。`);
    }
    if (M === 0 || F === 0) s.warn('男性または女性の労働者が 0 人の性別は、便所の数を 0 と表示しています。将来の雇用も考えて計画してください。');
    if (![M, F, k].every(Number.isInteger)) s.warn('人数・個数に整数でない値が入っています。整数で入力してください。');
    return s.result();
  },
};
