import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { fp04Beginner, fp04Doc } from './docs/fp-04';

type Height = 'lt4' | '4to8' | '8to15' | '15to20';

export const HEIGHT_LABEL: Record<Height, string> = {
  lt4: '4 m 未満',
  '4to8': '4 m 以上 8 m 未満',
  '8to15': '8 m 以上 15 m 未満',
  '15to20': '15 m 以上 20 m 未満',
};

/**
 * 施行規則第23条第4項第3号ロ（熱感知器）・第7号ホ（煙感知器）の感知面積の表（m²）。
 * heat は [耐火構造, その他の構造]、smoke は構造によらない値。キーがない高さは表に値がない（第2号の表で使えない）高さ。
 */
interface Detector {
  label: string;
  kind: 'heat' | 'smoke';
  area: Partial<Record<Height, [number, number] | number>>;
}

export const DETECTORS: Record<string, Detector> = {
  diff1: { label: '差動式スポット型 1種', kind: 'heat', area: { lt4: [90, 50], '4to8': [45, 30] } },
  diff2: { label: '差動式スポット型 2種', kind: 'heat', area: { lt4: [70, 40], '4to8': [35, 25] } },
  comp1: { label: '補償式スポット型 1種', kind: 'heat', area: { lt4: [90, 50], '4to8': [45, 30] } },
  comp2: { label: '補償式スポット型 2種', kind: 'heat', area: { lt4: [70, 40], '4to8': [35, 25] } },
  fixS: { label: '定温式スポット型 特種', kind: 'heat', area: { lt4: [70, 40], '4to8': [35, 25] } },
  fix1: { label: '定温式スポット型 1種', kind: 'heat', area: { lt4: [60, 30], '4to8': [30, 15] } },
  fix2: { label: '定温式スポット型 2種', kind: 'heat', area: { lt4: [20, 15] } },
  photo1: { label: '光電式スポット型 1種', kind: 'smoke', area: { lt4: 150, '4to8': 75, '8to15': 75, '15to20': 75 } },
  photo2: { label: '光電式スポット型 2種', kind: 'smoke', area: { lt4: 150, '4to8': 75, '8to15': 75 } },
  photo3: { label: '光電式スポット型 3種', kind: 'smoke', area: { lt4: 50 } },
  ion1: { label: 'イオン化式スポット型 1種', kind: 'smoke', area: { lt4: 150, '4to8': 75, '8to15': 75, '15to20': 75 } },
  ion2: { label: 'イオン化式スポット型 2種', kind: 'smoke', area: { lt4: 150, '4to8': 75, '8to15': 75 } },
  ion3: { label: 'イオン化式スポット型 3種', kind: 'smoke', area: { lt4: 50 } },
};

const isHeat = (v: RawValues) => DETECTORS[v.det]?.kind === 'heat';

/** 使えない高さのときに、その高さで使える種別を案内する */
function usableAt(h: Height): string {
  const names = Object.values(DETECTORS)
    .filter((d) => d.area[h] !== undefined)
    .map((d) => d.label);
  return names.join('、');
}

export const heatSmokeDetector: ToolDef = {
  id: 'FP-04',
  slug: 'heat-smoke-detector',
  category: 'fire',
  title: '感知器の必要個数',
  summary: '自動火災報知設備のスポット型感知器について、感知面積から感知区域ごとの必要個数を求めます。',
  keywords: ['自動火災報知設備', '自火報', '感知器', '差動式', '定温式', '補償式', '光電式', 'イオン化式', '煙感知器', '熱感知器', '感知面積', '感知区域', '取付け面の高さ'],
  references: [
    '消防法施行規則 第23条第4項第2号（取付け面の高さと感知器の種別）',
    '消防法施行規則 第23条第4項第3号ロ（熱感知器の感知面積の表）',
    '消防法施行規則 第23条第4項第7号ホ（煙感知器の感知面積の表）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'det',
      label: '感知器の種類',
      options: Object.entries(DETECTORS).map(([value, d]) => ({ value, label: d.label })),
      help: '炎感知器、分布型、光電式分離型、熱煙複合式は対象外です。',
    },
    {
      type: 'select',
      key: 'struct',
      label: '構造',
      display: 'segmented',
      visible: isHeat,
      options: [
        { value: 'fire', label: '耐火構造' },
        { value: 'other', label: 'その他の構造' },
      ],
      help: '特定主要構造部を耐火構造とした防火対象物（またはその部分）かどうかで選びます。煙感知器は構造によりません。',
    },
    {
      type: 'select',
      key: 'h',
      label: '取付け面の高さ',
      options: (Object.keys(HEIGHT_LABEL) as Height[]).map((k) => ({ value: k, label: HEIGHT_LABEL[k] })),
      help: '感知器を取り付ける天井の室内側の面（または上階の床・屋根の下面）の床からの高さです。',
    },
    {
      type: 'number',
      key: 'A',
      label: '感知区域の面積',
      unit: 'm²',
      min: 0,
      exclusiveMin: true,
      help: '壁、または取付け面から 0.4 m（煙感知器は 0.6 m）以上突き出したはりで区切られた部分の床面積です。',
    },
  ],
  defaults: { det: 'photo1', struct: 'fire', h: 'lt4', A: '300' },
  notes: [
    '必要個数は感知区域ごとに「感知区域の面積 ÷ 感知面積」を切り上げて求めます。区域が複数あるときは区域ごとに計算して合計します。',
    '煙感知器の廊下・通路は歩行距離 30 m（3種は 20 m）につき1個、階段・傾斜路は垂直距離 15 m（3種は 10 m）につき1個で設けます。このツールの面積による計算は、それ以外の感知区域に使います。',
    '取付け面の高さが 20 m 以上の場所には、炎感知器以外の感知器は設けられません。',
    '個数は最低限の値です。はり・吸気口・間仕切りの位置など、火災を有効に感知できる配置になるよう平面図で確認してください。',
    '消防用設備等は、所轄消防署の指導によって取扱いが異なる場合があります。設計の前に所轄消防と協議してください。',
  ],
  doc: fp04Doc,
  beginner: fp04Beginner,
  build(v) {
    const d = DETECTORS[str(v, 'det')] ?? DETECTORS.photo1;
    const h = str(v, 'h') as Height;
    const fireproof = str(v, 'struct') !== 'other';
    const A = num(v, 'A');
    const entry = d.area[h];
    if (entry === undefined) {
      throw new CalcError(
        `${d.label}は取付け面の高さ ${HEIGHT_LABEL[h]} では使えません（施行規則第23条第4項第2号）。この高さで使える種別（${usableAt(h)}）を選んでください。`,
      );
    }
    const Sd = typeof entry === 'number' ? entry : entry[fireproof ? 0 : 1];
    const structNote = d.kind === 'heat' ? (fireproof ? '耐火構造' : 'その他の構造') : '煙感知器は構造によらない';

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('det', '感知器の種類', d.label)
      .input('h', '取付け面の高さ', HEIGHT_LABEL[h])
      .input('Sd', '感知器1個当たりの感知面積', Sd, {
        symbol: 'Sd',
        unit: 'm²',
        note: `${structNote}。施行規則第23条第4項${d.kind === 'heat' ? '第3号ロ' : '第7号ホ'}の表`,
      })
      .section('入力値')
      .input('A', '感知区域の面積', A, { symbol: 'A', unit: 'm²', digits: 2 })
      .section('計算')
      .calc('Nr', '個数の計算値', { symbol: 'Nr', unit: '個', value: A / Sd, expr: '{A} ÷ {Sd}', formula: '{A}/{Sd}', digits: 2 })
      .calc('N', '必要個数', { symbol: 'N', unit: '個', value: Math.ceil(A / Sd), expr: '{Nr} を切り上げ', formula: 'ROUNDUP({Nr},0)', digits: 0 })
      .highlight('N');
    return s.result();
  },
};
