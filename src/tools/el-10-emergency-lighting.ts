import type { Field, RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { el10Beginner, el10Doc } from './docs/el-10';

export const MAX_FIXTURES = 3;
const SUB = ['', '₁', '₂', '₃'];
const fixtureVisible = (i: number) => (v: RawValues) => Number(v.n) >= i;

const fixtureFields: Field[] = [];
for (let i = 1; i <= MAX_FIXTURES; i++) {
  fixtureFields.push(
    { type: 'number', key: `h${i}`, label: `器具${i} 取付高さ（床から光源まで）`, unit: 'm', min: 0, exclusiveMin: true, visible: fixtureVisible(i) },
    { type: 'number', key: `d${i}`, label: `器具${i} 確認点までの水平距離`, unit: 'm', min: 0, visible: fixtureVisible(i) },
    {
      type: 'number',
      key: `I${i}`,
      label: `器具${i} 確認点方向の光度 I(θ)`,
      unit: 'cd',
      min: 0,
      visible: fixtureVisible(i),
      help: i === 1 ? '計算書に表示される角度 θ（鉛直下向きからの角度）の光度を、器具の非常時の配光データから読み取って入力します。' : undefined,
    },
  );
}

export const emergencyLighting: ToolDef = {
  id: 'EL-10',
  slug: 'emergency-lighting',
  category: 'electrical',
  title: '非常用照明の照度（逐点法）',
  summary: '逐点法で非常用照明器具による床面の水平面照度を求め、告示の基準値（1 lx・2 lx）と比べて判定します。',
  keywords: ['非常用照明', '非常照明', '逐点法', '照度', '水平面照度', '光度', '配光', '1lx', '2lx', '告示1830号', '建築基準法'],
  references: [
    '建築基準法施行令 第126条の5 第1号イ（床面において1ルクス以上の照度）',
    '昭和45年建設省告示第1830号 第四 第一号（常温下で床面において水平面照度で1ルクス以上。蛍光灯又はLEDランプを用いる場合は2ルクス以上）、最終改正 平成29年国土交通省告示第600号',
    '逐点法の水平面照度の式 E = I(θ) × cos³θ ÷ h²（点光源の逆二乗則）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'src',
      label: '光源の種類',
      display: 'segmented',
      options: [
        { value: 'fl', label: '蛍光灯・LED（2 lx）' },
        { value: 'inc', label: '白熱灯など（1 lx）' },
      ],
      help: '告示第1830号 第四第一号により、蛍光灯又はLEDランプを用いる場合は 2 lx 以上、それ以外は 1 lx 以上です。',
    },
    {
      type: 'select',
      key: 'n',
      label: '確認点に光が届く器具の台数',
      display: 'segmented',
      options: [
        { value: '1', label: '1台' },
        { value: '2', label: '2台' },
        { value: '3', label: '3台' },
      ],
    },
    ...fixtureFields,
  ],
  defaults: {
    src: 'fl',
    n: '2',
    h1: '2.7',
    d1: '2',
    I1: '30',
    h2: '2.7',
    d2: '4',
    I2: '25',
    h3: '2.7',
    d3: '6',
    I3: '20',
  },
  notes: [
    '逐点法で各器具からの直接光による照度を求め、合計します。壁や天井からの反射光は含めません。',
    '光度 I(θ) は器具メーカーの非常時の配光データ（非常点灯時の値）から読み取ってください。',
    '確認点は、居室・通路などのうち照度が最も低くなる点（器具から遠い点、隅部など）を選びます。床面での照度を確認するので、取付高さは床から光源までの高さです。',
    '非常用照明の設置対象・構造・予備電源の要件は、建築基準法施行令第126条の4・第126条の5と告示第1830号の本文で確認してください。',
  ],
  doc: el10Doc,
  beginner: el10Beginner,
  build(v) {
    const src = str(v, 'src');
    const n = Number(str(v, 'n'));
    const Emin = src === 'inc' ? 1 : 2;

    const s = new SheetBuilder();
    s.section('基準値')
      .input('src', '光源の種類', src === 'inc' ? '白熱灯など' : '蛍光灯・LED')
      .input('Emin', '必要な床面の水平面照度', Emin, { symbol: 'Emin', unit: 'lx', note: '昭和45年建設省告示第1830号 第四第一号' });

    let sum = 0;
    const terms: string[] = [];
    for (let i = 1; i <= n; i++) {
      const h = num(v, `h${i}`);
      const d = num(v, `d${i}`);
      const I = num(v, `I${i}`);
      const th = Math.atan(d / h);
      const E = (I * Math.cos(th) ** 3) / (h * h);
      sum += E;
      terms.push(`{E${i}}`);
      const k = SUB[i];
      s.section(`器具${i}`)
        .input(`h${i}`, '取付高さ（床から光源まで）', h, { symbol: `h${k}`, unit: 'm', digits: 2 })
        .input(`d${i}`, '確認点までの水平距離', d, { symbol: `d${k}`, unit: 'm', digits: 2 })
        .calc(`th${i}`, '鉛直下向きからの角度', {
          symbol: `θ${k}`,
          unit: '°',
          value: (th * 180) / Math.PI,
          expr: `atan({d${i}} ÷ {h${i}})`,
          formula: `ATAN({d${i}}/{h${i}})*180/PI()`,
          digits: 1,
          note: 'この角度の光度を配光データから読む',
        })
        .input(`I${i}`, '確認点方向の光度', I, { symbol: `I${k}`, unit: 'cd', note: `θ${k} 方向の光度（非常時の配光データ）` })
        .calc(`E${i}`, '水平面照度', {
          symbol: `E${k}`,
          unit: 'lx',
          value: E,
          expr: `{I${i}} × cos³{th${i}} ÷ {h${i}}²`,
          formula: `{I${i}}*COS({th${i}}*PI()/180)^3/{h${i}}^2`,
          digits: 2,
        });
    }

    s.section('合計と判定')
      .calc('E', '確認点の水平面照度（合計）', { symbol: 'E', unit: 'lx', value: sum, expr: terms.join(' + '), formula: terms.join('+'), digits: 2 })
      .judge('ok', '判定', sum >= Emin, { expr: '{E} ≥ {Emin}', formula: 'IF({E}>={Emin},"OK","NG")' })
      .highlight('E', 'ok');

    if (sum < Emin) s.warn(`確認点の照度が基準値 ${Emin} lx を下回っています。器具を確認点に近づける、台数を増やす、配光の広い器具を選ぶなどを検討してください。`);
    return s.result();
  },
};
