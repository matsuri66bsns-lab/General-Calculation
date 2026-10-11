import type { Field, RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { PL02_FIXTURES, pl02Beginner, pl02Doc, sub } from './docs/pl-02';
import { C_HELP, PIPE_C_OPTIONS, RHO_G, hazenWilliamsHead } from './pl-03-hazen-williams';

const PIPE_LABEL: Record<string, string> = Object.fromEntries(PIPE_C_OPTIONS.map((o) => [o.value, o.label]));

const fixtureFields: Field[] = PL02_FIXTURES.flatMap((f): Field[] => [
  { type: 'number', key: `n_${f.key}`, label: `${f.label}の個数`, unit: '個', min: 0 },
  {
    type: 'number',
    key: `u_${f.key}`,
    label: `${f.label}の器具給水負荷単位`,
    min: 0,
    help: '候補の値は目安です。SHASE-S 206 の表で確認して入力してください。',
    suggestions: f.hints,
  },
]);

const fixtureDefaults: RawValues = Object.fromEntries(PL02_FIXTURES.flatMap((f) => [[`n_${f.key}`, f.n], [`u_${f.key}`, f.u]]));

export const waterSupplyPipe: ToolDef = {
  id: 'PL-02',
  slug: 'water-supply-pipe',
  category: 'plumbing',
  title: '給水負荷単位と給水管径',
  summary: '器具給水負荷単位の合計と同時使用流量から、給水管の必要内径と流速を確認します。',
  keywords: ['給水負荷単位', '器具給水負荷単位', 'FU', '同時使用流量', '給水管径', '管径', '流速', 'SHASE-S 206', '洗浄弁'],
  references: [
    'SHASE-S 206「給排水衛生設備規準・同解説」（器具給水負荷単位、同時使用流量線図）',
    '国土交通省大臣官房官庁営繕部 監修「建築設備設計基準」（給水管の管径・流速）',
    'ヘーゼン・ウィリアムス式（単位摩擦損失）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    ...fixtureFields,
    {
      type: 'number',
      key: 'Qp',
      label: '同時使用流量（線図から読み取った値）',
      unit: 'L/min',
      min: 0,
      exclusiveMin: true,
      help: '上の ΣFU をもとに、SHASE-S 206 の同時使用流量線図から読み取って入力します。洗浄弁の多い系統と少ない系統で曲線が異なります。',
    },
    {
      type: 'number',
      key: 'va',
      label: '目標とする最大流速',
      unit: 'm/s',
      min: 0,
      exclusiveMin: true,
      help: '給水管では一般に 2.0 m/s 以下とします（ウォーターハンマー・騒音の防止）。',
      suggestions: [
        { label: '1.5 m/s', value: 1.5 },
        { label: '2.0 m/s', value: 2 },
      ],
    },
    {
      type: 'number',
      key: 'D',
      label: '選んだ管の内径',
      unit: 'mm',
      min: 0,
      exclusiveMin: true,
      help: '必要内径以上の管を選び、その実際の内径を入力します。呼び径ではなく、メーカーの寸法表の内径です。',
    },
    { type: 'select', key: 'pipe', label: '管種（流速係数の目安）', options: PIPE_C_OPTIONS, help: C_HELP },
    { type: 'number', key: 'C', label: '流速係数 C', min: 0, exclusiveMin: true },
  ],
  defaults: { ...fixtureDefaults, Qp: '200', va: '2', D: '50', pipe: 'lined', C: '130' },
  notes: [
    '器具給水負荷単位と同時使用流量は SHASE-S 206 の表・線図から入力します。本ツールは表・線図を内蔵していません。候補の値は目安で、原文で確認してください。',
    '管径は末端から上流へ、区間ごとに接続する器具を足しながら決めます。区間ごとにこの計算を行ってください。',
    '流速のほか、末端の器具で必要な圧力が確保できるか（摩擦損失の合計）も確認してください。',
  ],
  doc: pl02Doc,
  beginner: pl02Beginner,
  build(v) {
    const s = new SheetBuilder();
    s.section('器具給水負荷単位');
    const terms: { e: string; f: string }[] = [];
    let sumFU = 0;
    PL02_FIXTURES.forEach((fx, idx) => {
      const n = num(v, `n_${fx.key}`);
      if (n <= 0) return;
      const u = num(v, `u_${fx.key}`);
      sumFU += n * u;
      s.input(`n_${fx.key}`, `${fx.label}の個数`, n, { symbol: `n${sub(idx)}`, unit: '個' }).input(
        `u_${fx.key}`,
        `${fx.label}の器具給水負荷単位`,
        u,
        { symbol: `u${sub(idx)}`, note: 'SHASE-S 206 の表の値' },
      );
      terms.push({ e: `{n_${fx.key}} × {u_${fx.key}}`, f: `{n_${fx.key}}*{u_${fx.key}}` });
    });
    s.calc('FU', '給水負荷単位の合計', {
      symbol: 'ΣFU',
      value: sumFU,
      expr: terms.length ? terms.map((t) => t.e).join(' + ') : '0',
      formula: terms.length ? terms.map((t) => t.f).join('+') : '0',
      digits: 1,
    });
    if (terms.length === 0) s.warn('器具の個数がすべて 0 です。接続する器具の個数を入力してください。');

    const Qp = num(v, 'Qp');
    const va = num(v, 'va');
    const D = num(v, 'D');
    const C = num(v, 'C');
    const Qs = Qp / 60000;
    const Dr = Math.sqrt((4 * Qs) / (Math.PI * va)) * 1000;
    const vel = Qs / ((Math.PI * (D / 1000) ** 2) / 4);
    const i = hazenWilliamsHead(Qs, D / 1000, 1, C) * RHO_G;

    s.section('必要内径')
      .input('Qp', '同時使用流量', Qp, { symbol: 'Qp', unit: 'L/min', note: 'ΣFU から SHASE-S 206 の線図で読み取った値' })
      .input('va', '目標とする最大流速', va, { symbol: 'va', unit: 'm/s' })
      .calc('Dr', '必要内径', {
        symbol: 'Dr',
        unit: 'mm',
        value: Dr,
        expr: '√(4 × {Qp} ÷ 60000 ÷ (π × {va})) × 1000',
        formula: 'SQRT(4*{Qp}/60000/(PI()*{va}))*1000',
        digits: 1,
      })
      .section('選んだ管の確認')
      .input('D', '選んだ管の内径', D, { symbol: 'D', unit: 'mm' })
      .input('C', '流速係数', C, { symbol: 'C', note: PIPE_LABEL[str(v, 'pipe')] })
      .calc('v', '管内流速', {
        symbol: 'v',
        unit: 'm/s',
        value: vel,
        expr: '({Qp} ÷ 60000) ÷ (π × ({D} ÷ 1000)² ÷ 4)',
        formula: '({Qp}/60000)/(PI()*({D}/1000)^2/4)',
        digits: 2,
      })
      .judge('ok', '流速の判定', vel <= va, { expr: '{v} ≤ {va}', formula: 'IF({v}<={va},"OK","NG")' })
      .calc('i', '単位摩擦損失', {
        symbol: 'i',
        unit: 'kPa/m',
        value: i,
        expr: '10.67 × ({Qp} ÷ 60000)^1.85 ÷ ({C}^1.85 × ({D} ÷ 1000)^4.87) × 9.80665',
        formula: '10.67*({Qp}/60000)^1.85/({C}^1.85*({D}/1000)^4.87)*9.80665',
        digits: 3,
        note: 'ヘーゼン・ウィリアムス式',
      })
      .highlight('FU', 'Dr', 'v', 'ok', 'i');
    if (D < Dr) s.warn(`選んだ管の内径 ${D} mm が必要内径 ${Dr.toFixed(1)} mm より小さく、流速が目標を超えます。1サイズ太い管を選んでください。`);
    return s.result();
  },
};
