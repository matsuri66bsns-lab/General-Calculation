import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { el09Beginner, el09Doc } from './docs/el-09';

/** JIS Z 9110:2010 表9（事務所）の推奨維持照度 Em [lx] */
export const OFFICE_ROOMS: { value: string; label: string; Em: number }[] = [
  { value: 'design', label: '設計室，製図室', Em: 750 },
  { value: 'office', label: '事務室', Em: 750 },
  { value: 'exec', label: '役員室', Em: 750 },
  { value: 'computer', label: '電子計算機室', Em: 500 },
  { value: 'control', label: '集中監視室，制御室', Em: 500 },
  { value: 'reception', label: '受付', Em: 300 },
  { value: 'meeting', label: '会議室，集会室', Em: 500 },
  { value: 'guest', label: '応接室', Em: 500 },
  { value: 'dining', label: '食堂', Em: 300 },
  { value: 'lounge', label: '喫茶室，オフィスラウンジ，湯沸室', Em: 200 },
  { value: 'rest', label: '休憩室', Em: 100 },
  { value: 'archive', label: '書庫', Em: 200 },
  { value: 'storage', label: '倉庫', Em: 100 },
  { value: 'locker', label: '更衣室', Em: 200 },
  { value: 'toilet', label: '便所，洗面所', Em: 200 },
  { value: 'elec', label: '電気室，機械室', Em: 200 },
  { value: 'stairs', label: '階段', Em: 150 },
  { value: 'corridor', label: '廊下，エレベータ', Em: 100 },
  { value: 'evhall', label: 'エレベータホール', Em: 300 },
  { value: 'entrance-day', label: '玄関ホール（昼間）', Em: 750 },
  { value: 'entrance-night', label: '玄関ホール（夜間），玄関（車寄せ）', Em: 100 },
];

const ROOM_LABEL: Record<string, string> = Object.fromEntries(OFFICE_ROOMS.map((r) => [r.value, r.label]));
const isE = (v: RawValues) => v.method === 'E';

export const lumenMethod: ToolDef = {
  id: 'EL-09',
  slug: 'lumen-method',
  category: 'electrical',
  title: '照度計算（光束法）',
  summary: '光束法で、目標照度に必要な照明器具の台数、または台数から平均照度を求めます。室指数も示します。',
  keywords: ['照度', '光束法', '照明器具', '台数', '室指数', '照明率', '保守率', 'ルクス', 'lx', 'JIS Z 9110', '維持照度'],
  references: [
    'JIS Z 9110:2010 照明基準総則 表9（事務所）推奨維持照度',
    '光束法の基本式 E = N × F × U × M ÷ A（照明率 U は器具の照明率表による）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'method',
      label: '計算方式',
      display: 'segmented',
      options: [
        { value: 'N', label: '必要台数を求める' },
        { value: 'E', label: '台数から照度を求める' },
      ],
    },
    {
      type: 'select',
      key: 'room',
      label: '室の種類（JIS Z 9110 表9 事務所）',
      options: [
        { value: 'custom', label: '任意入力' },
        ...OFFICE_ROOMS.map((r) => ({ value: r.value, label: `${r.label}（${r.Em} lx）`, apply: { Em: String(r.Em) } })),
      ],
      help: 'JIS Z 9110:2010 表9 の推奨維持照度です。事務所以外の用途は同規格の表10〜表22 を確認して目標照度に入力してください。',
    },
    { type: 'number', key: 'Em', label: '目標照度（維持照度）', unit: 'lx', min: 0, exclusiveMin: true },
    { type: 'number', key: 'X', label: '室の間口', unit: 'm', min: 0, exclusiveMin: true },
    { type: 'number', key: 'Y', label: '室の奥行', unit: 'm', min: 0, exclusiveMin: true },
    {
      type: 'number',
      key: 'H',
      label: '作業面から光源までの高さ',
      unit: 'm',
      min: 0,
      exclusiveMin: true,
      help: '天井直付け・埋込み器具なら「天井高 − 作業面の高さ」です。事務所の作業面は床上 0.7〜0.85 m 程度とすることが多いです。',
    },
    {
      type: 'number',
      key: 'F',
      label: '器具1台の光束',
      unit: 'lm',
      min: 0,
      exclusiveMin: true,
      help: 'LED 器具はカタログの器具光束を入れます。ランプ交換型は「ランプ1本の光束 × 本数」です。',
    },
    {
      type: 'number',
      key: 'U',
      label: '照明率',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '器具メーカーの照明率表から、室指数と天井・壁・床の反射率に合う値を読み取って入力します。',
    },
    {
      type: 'number',
      key: 'M',
      label: '保守率',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '光源の光束低下と器具・室の汚れによる低下を見込む係数です。器具の種類・使用環境・清掃間隔で異なるため、メーカー資料で確認してください。',
    },
    { type: 'number', key: 'N', label: '器具の台数', unit: '台', min: 1, visible: isE },
  ],
  defaults: { method: 'N', room: 'office', Em: '750', X: '12', Y: '8', H: '2', F: '5000', U: '0.7', M: '0.8', N: '24' },
  notes: [
    '光束法は室全体の平均照度を求める方法です。器具の配置が偏る場合や、局部的な照度・均斉度が必要な場合は、逐点法などで確認してください。',
    '照明率は器具ごとに異なり、室指数と天井・壁・床の反射率で決まります。必ず使用する器具の照明率表から読み取ってください。',
    '目標照度は JIS Z 9110:2010 の推奨維持照度です。維持照度は、保守期間の終わりでも下回らないようにする平均照度です。',
  ],
  doc: el09Doc,
  beginner: el09Beginner,
  build(v) {
    const method = str(v, 'method');
    const room = str(v, 'room');
    const Em = num(v, 'Em');
    const X = num(v, 'X');
    const Y = num(v, 'Y');
    const H = num(v, 'H');
    const F = num(v, 'F');
    const U = num(v, 'U');
    const M = num(v, 'M');
    const A = X * Y;
    const K = (X * Y) / (H * (X + Y));

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('method', '計算方式', method === 'E' ? '台数から平均照度を求める' : '必要台数を求める')
      .input('Em', '目標照度（維持照度）', Em, {
        symbol: 'Em',
        unit: 'lx',
        digits: 0,
        note: room === 'custom' ? '任意入力' : `JIS Z 9110:2010 表9 ${ROOM_LABEL[room]}`,
      })
      .section('室の寸法')
      .input('X', '室の間口', X, { symbol: 'X', unit: 'm', digits: 2 })
      .input('Y', '室の奥行', Y, { symbol: 'Y', unit: 'm', digits: 2 })
      .input('H', '作業面から光源までの高さ', H, { symbol: 'H', unit: 'm', digits: 2 })
      .calc('A', '床面積', { symbol: 'A', unit: 'm²', value: A, expr: '{X} × {Y}', formula: '{X}*{Y}', digits: 2 })
      .calc('K', '室指数', {
        symbol: 'K',
        value: K,
        expr: '{X} × {Y} ÷ ({H} × ({X} + {Y}))',
        formula: '{X}*{Y}/({H}*({X}+{Y}))',
        digits: 2,
        note: '照明率表を読むときに使う',
      })
      .section('器具')
      .input('F', '器具1台の光束', F, { symbol: 'F', unit: 'lm', digits: 0 })
      .input('U', '照明率', U, { symbol: 'U', digits: 2, note: '器具の照明率表から' })
      .input('M', '保守率', M, { symbol: 'M', digits: 2 });

    if (method === 'E') {
      const N = num(v, 'N');
      const E = (N * F * U * M) / A;
      s.section('平均照度')
        .input('N', '器具の台数', N, { symbol: 'N', unit: '台', digits: 0 })
        .calc('E', '平均照度', { symbol: 'E', unit: 'lx', value: E, expr: '{N} × {F} × {U} × {M} ÷ {A}', formula: '{N}*{F}*{U}*{M}/{A}', digits: 0 })
        .judge('ok', '目標照度との比較', E >= Em, { expr: '{E} ≥ {Em}', formula: 'IF({E}>={Em},"OK","NG")' })
        .highlight('K', 'E', 'ok');
      if (E < Em) s.warn(`平均照度が目標照度 ${Em} lx を下回っています。台数を増やすか、光束の大きい器具を選んでください。`);
      return s.result();
    }

    const Nr = (Em * A) / (F * U * M);
    const Nc = Math.ceil(Math.round(Nr * 1e9) / 1e9);
    const E = (Nc * F * U * M) / A;
    s.section('必要台数')
      .calc('Nr', '必要台数（計算値）', { symbol: 'Nr', unit: '台', value: Nr, expr: '{Em} × {A} ÷ ({F} × {U} × {M})', formula: '{Em}*{A}/({F}*{U}*{M})', digits: 2 })
      .calc('N', '必要台数（切り上げ）', { symbol: 'N', unit: '台', value: Nc, expr: '{Nr} を切り上げ', formula: 'ROUNDUP(ROUND({Nr},9),0)', digits: 0 })
      .calc('E', 'その台数での平均照度', { symbol: 'E', unit: 'lx', value: E, expr: '{N} × {F} × {U} × {M} ÷ {A}', formula: '{N}*{F}*{U}*{M}/{A}', digits: 0 })
      .highlight('K', 'N', 'E');
    return s.result();
  },
};
