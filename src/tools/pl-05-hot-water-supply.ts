import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num } from '../core/values';
import { CalcError } from '../core/errors';
import { pl05Beginner, pl05Doc } from './docs/pl-05';

export const hotWaterSupply: ToolDef = {
  id: 'PL-05',
  slug: 'hot-water-supply',
  category: 'plumbing',
  title: '給湯量・加熱能力・貯湯容量',
  summary: '使用人員と1人1日当たり給湯量から、時間最大給湯量・加熱能力・貯湯容量を求めます。',
  keywords: ['給湯量', '加熱能力', '貯湯容量', '貯湯槽', '給湯器', '時間最大給湯量', '給湯温度', 'kW', '中央式給湯'],
  references: [
    '空気調和・衛生工学便覧（建物用途別の給湯量、時間最大給湯量の割合）',
    '国土交通省大臣官房官庁営繕部 監修「建築設備設計基準」（給湯設備）',
    '水の比熱 4.186 kJ/(kg·K)、密度 1 kg/L として計算',
  ],
  publishedAt: '2026-10-10',
  fields: [
    { type: 'number', key: 'N', label: '使用人員', unit: '人', min: 0, exclusiveMin: true },
    {
      type: 'number',
      key: 'qd',
      label: '1人1日当たり給湯量',
      unit: 'L/(人·日)',
      min: 0,
      exclusiveMin: true,
      help: '用途の目安（便覧の表で確認）：住宅・集合住宅 75〜150、事務所 7〜10、ホテル客室 75〜150 L/(人·日)。給湯温度によって値が変わるので、表の前提の温度も確認してください。',
      suggestions: [
        { label: '事務所 目安 10', value: 10 },
        { label: '住宅 目安 150', value: 150 },
      ],
    },
    {
      type: 'number',
      key: 'qh',
      label: '時間最大給湯量の割合（1日給湯量に対して）',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '1日の給湯量のうち、最も多く使う1時間に使う割合を小数で入力します。目安（便覧の表で確認）：事務所 1/5、住宅 1/7 程度。',
      suggestions: [
        { label: '1/5 = 0.2', value: 0.2 },
        { label: '1/7 ≒ 0.143', value: 0.143 },
        { label: '1/10 = 0.1', value: 0.1 },
      ],
    },
    {
      type: 'number',
      key: 'th',
      label: '給湯温度',
      unit: '℃',
      help: '中央式給湯ではレジオネラ属菌対策として貯湯槽内を 60 ℃ 以上に保つのが一般的です。',
      suggestions: [
        { label: '60℃', value: 60 },
        { label: '55℃', value: 55 },
      ],
    },
    {
      type: 'number',
      key: 'tc',
      label: '給水温度',
      unit: '℃',
      help: '冬期の給水温度を使うと加熱能力が安全側になります。地域によって異なります。',
      suggestions: [
        { label: '5℃', value: 5 },
        { label: '10℃', value: 10 },
      ],
    },
    {
      type: 'number',
      key: 'kv',
      label: '貯湯時間係数（時間最大給湯量の何時間分を貯めるか）',
      unit: 'h',
      min: 0,
      help: '加熱能力との組み合わせで決めます。加熱能力を大きくすれば貯湯容量は小さくできます。採用値は便覧・設計基準で確認してください。',
      suggestions: [
        { label: '0.5 h', value: 0.5 },
        { label: '1 h', value: 1 },
        { label: '2 h', value: 2 },
      ],
    },
  ],
  defaults: { N: '200', qd: '10', qh: '0.2', th: '60', tc: '5', kv: '1' },
  notes: [
    '水の比熱 c = 4.186 kJ/(kg·K)、密度 1 kg/L として、給湯量 L を質量 kg と同じ値で扱っています。',
    '加熱能力には配管・貯湯槽からの熱損失を含みません。循環配管がある場合は熱損失分を加えてください。',
    '給湯量・時間最大の割合の目安値は原文（便覧の表）で確認してください。',
  ],
  doc: pl05Doc,
  beginner: pl05Beginner,
  build(v) {
    const N = num(v, 'N');
    const qd = num(v, 'qd');
    const qh = num(v, 'qh');
    const th = num(v, 'th');
    const tc = num(v, 'tc');
    const kv = num(v, 'kv');
    if (th <= tc) throw new CalcError('給湯温度は給水温度より高くしてください。');
    const Qd = N * qd;
    const Qh = Qd * qh;
    const H = (Qh * 4.186 * (th - tc)) / 3600;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('N', '使用人員', N, { symbol: 'N', unit: '人', digits: 0 })
      .input('qd', '1人1日当たり給湯量', qd, { symbol: 'qd', unit: 'L/(人·日)' })
      .input('qh', '時間最大給湯量の割合', qh, { symbol: 'qh', digits: 3 })
      .input('th', '給湯温度', th, { symbol: 'th', unit: '℃' })
      .input('tc', '給水温度', tc, { symbol: 'tc', unit: '℃' })
      .input('c', '水の比熱', 4.186, { symbol: 'c', unit: 'kJ/(kg·K)', digits: 3, note: '密度 1 kg/L として L = kg で扱う' })
      .input('kv', '貯湯時間係数', kv, { symbol: 'k', unit: 'h' })
      .section('給湯量')
      .calc('Qd', '1日給湯量', { symbol: 'Qd', unit: 'L/日', value: Qd, expr: '{N} × {qd}', formula: '{N}*{qd}', digits: 0 })
      .calc('Qh', '時間最大給湯量', { symbol: 'Qh', unit: 'L/h', value: Qh, expr: '{Qd} × {qh}', formula: '{Qd}*{qh}', digits: 0 })
      .section('加熱能力・貯湯容量')
      .calc('H', '加熱能力', {
        symbol: 'H',
        unit: 'kW',
        value: H,
        expr: '{Qh} × {c} × ({th} − {tc}) ÷ 3600',
        formula: '{Qh}*{c}*({th}-{tc})/3600',
        digits: 1,
      })
      .calc('V', '貯湯容量', { symbol: 'V', unit: 'L', value: Qh * kv, expr: '{Qh} × {kv}', formula: '{Qh}*{kv}', digits: 0 })
      .highlight('Qh', 'H', 'V');
    if (th < 55) s.warn('給湯温度が 55 ℃ 未満です。中央式給湯ではレジオネラ属菌対策の温度管理を確認してください。');
    return s.result();
  },
};
