import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { hv06Beginner, hv06Doc } from './docs/hv-06';

const ROOM_LABEL: Record<string, string> = {
  elec: '電気室（変電設備）',
  mech: '機械室',
  ev: 'エレベーター機械室',
};

const isTrans = (v: RawValues) => v.qmode === 'trans';
const isDirect = (v: RawValues) => v.qmode !== 'trans';
const isTemps = (v: RawValues) => v.dtmode !== 'dt';
const isDt = (v: RawValues) => v.dtmode === 'dt';

export const heatRemovalVentilation: ToolDef = {
  id: 'HV-06',
  slug: 'heat-removal-ventilation',
  category: 'hvac',
  title: '発熱除去の換気量',
  summary: '電気室・機械室などの発熱量と許容温度上昇から、熱を外へ逃がすのに必要な換気量を求めます。',
  keywords: ['発熱', '排熱', '換気量', '電気室', '変電室', '機械室', 'エレベーター機械室', 'EV機械室', '変圧器', '損失', '温度上昇'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」換気設備（発熱量による換気量の算定）',
    '空気の密度・定圧比熱：空気調和・衛生工学便覧（標準空気 1.2 kg/m³、1.006 kJ/(kg·K)）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'room',
      label: '室の種類',
      display: 'segmented',
      options: [
        { value: 'elec', label: '電気室' },
        { value: 'mech', label: '機械室' },
        { value: 'ev', label: 'EV機械室' },
      ],
      help: '計算書に記載する室名です。計算式はどの室も同じです。',
    },
    {
      type: 'select',
      key: 'qmode',
      label: '発熱量の入力方法',
      display: 'segmented',
      options: [
        { value: 'direct', label: '発熱量を直接入力' },
        { value: 'trans', label: '変圧器容量 × 損失率' },
      ],
    },
    {
      type: 'number',
      key: 'q',
      label: '室内の発熱量（合計）',
      unit: 'kW',
      min: 0,
      exclusiveMin: true,
      visible: isDirect,
      help: '変圧器の損失、盤類・電動機・照明などの発熱を合計して入力します。',
    },
    {
      type: 'number',
      key: 'S',
      label: '変圧器容量（合計）',
      unit: 'kVA',
      min: 0,
      exclusiveMin: true,
      visible: isTrans,
      suggestions: [
        { label: '300', value: 300 },
        { label: '500', value: 500 },
        { label: '1,000', value: 1000 },
        { label: '2,000', value: 2000 },
      ],
    },
    {
      type: 'number',
      key: 'r',
      label: '変圧器の損失率（容量に対する割合）',
      unit: '%',
      min: 0,
      exclusiveMin: true,
      max: 100,
      visible: isTrans,
      help: '目安 1〜3 %。メーカー資料の無負荷損と負荷損（想定負荷率で補正）から求めた値を入れるのが確実です。',
      suggestions: [
        { label: '1.5%', value: 1.5 },
        { label: '2%', value: 2 },
        { label: '3%', value: 3 },
      ],
    },
    {
      type: 'number',
      key: 'qo',
      label: 'その他の発熱量（盤類・照明など）',
      unit: 'kW',
      min: 0,
      visible: isTrans,
      help: 'なければ 0 にします。',
    },
    {
      type: 'select',
      key: 'dtmode',
      label: '温度条件の入力方法',
      display: 'segmented',
      options: [
        { value: 'temps', label: '室温上限と外気温度' },
        { value: 'dt', label: '許容温度上昇' },
      ],
    },
    {
      type: 'number',
      key: 'ti',
      label: '室温の上限（許容室温）',
      unit: '℃',
      visible: isTemps,
      help: '機器の使用温度の上限から決めます。電気室・EV機械室は 40 ℃ とすることが多いです（目安）。',
      suggestions: [
        { label: '35℃', value: 35 },
        { label: '40℃', value: 40 },
      ],
    },
    {
      type: 'number',
      key: 'to',
      label: '外気温度（設計用）',
      unit: '℃',
      visible: isTemps,
      help: '夏期の設計用外気温度を入力します。',
      suggestions: [
        { label: '33℃', value: 33 },
        { label: '35℃', value: 35 },
      ],
    },
    {
      type: 'number',
      key: 'dt',
      label: '許容温度上昇（室温 − 給気温度）',
      unit: 'K',
      min: 0,
      exclusiveMin: true,
      visible: isDt,
      suggestions: [
        { label: '5K', value: 5 },
        { label: '7K', value: 7 },
        { label: '10K', value: 10 },
      ],
    },
    {
      type: 'number',
      key: 'rho',
      label: '空気の密度',
      unit: 'kg/m³',
      min: 0,
      exclusiveMin: true,
      help: '標準空気（20 ℃、1 気圧付近）で 1.2 kg/m³ です。',
    },
    {
      type: 'number',
      key: 'cp',
      label: '空気の定圧比熱',
      unit: 'kJ/(kg·K)',
      min: 0,
      exclusiveMin: true,
      help: '乾き空気で 1.006 kJ/(kg·K) です。',
    },
  ],
  defaults: {
    room: 'elec',
    qmode: 'trans',
    q: '15',
    S: '1000',
    r: '1.5',
    qo: '3',
    dtmode: 'temps',
    ti: '40',
    to: '35',
    dt: '5',
    rho: '1.2',
    cp: '1.006',
  },
  notes: [
    '外気を取り入れて室内の熱を押し出す換気量です。外気温度が室温の上限に近いと必要換気量が非常に大きくなるため、その場合は冷房設備の併用を検討してください。',
    '変圧器の損失は負荷率で変わります（負荷損は負荷率の2乗に比例）。損失率は想定する負荷状態に合わせて入力してください。',
    '給気口・排気口の位置は、外気が発熱機器を通って排気口へ抜けるように計画してください。',
  ],
  doc: hv06Doc,
  beginner: hv06Beginner,
  build(v) {
    const s = new SheetBuilder();
    const trans = str(v, 'qmode') === 'trans';
    const temps = str(v, 'dtmode') !== 'dt';
    const rho = num(v, 'rho');
    const cp = num(v, 'cp');

    s.section('計算条件').input('room', '室の種類', ROOM_LABEL[str(v, 'room')]);

    s.section('発熱量');
    let q: number;
    if (trans) {
      const S = num(v, 'S');
      const r = num(v, 'r');
      const qo = num(v, 'qo');
      q = (S * r) / 100 + qo;
      s.input('S', '変圧器容量（合計）', S, { symbol: 'S', unit: 'kVA' })
        .input('r', '変圧器の損失率', r, { symbol: 'r', unit: '%', digits: 2 })
        .input('qo', 'その他の発熱量', qo, { symbol: 'qo', unit: 'kW', digits: 2 })
        .calc('q', '室内の発熱量', {
          symbol: 'q',
          unit: 'kW',
          value: q,
          expr: '{S} × {r} ÷ 100 + {qo}',
          formula: '{S}*{r}/100+{qo}',
          digits: 2,
          note: '変圧器容量 kVA を損失 kW に換算（力率は考えず容量に損失率を掛ける）',
        });
    } else {
      q = num(v, 'q');
      s.input('q', '室内の発熱量', q, { symbol: 'q', unit: 'kW', digits: 2 });
    }

    s.section('温度条件');
    let dt: number;
    if (temps) {
      const ti = num(v, 'ti');
      const to = num(v, 'to');
      if (ti <= to) {
        throw new CalcError('外気温度が室温の上限以上のため、外気による換気では熱を除去できません。温度条件を見直すか、冷房設備で処理してください。');
      }
      dt = ti - to;
      s.input('ti', '室温の上限', ti, { symbol: 'ti', unit: '℃' })
        .input('to', '外気温度', to, { symbol: 'to', unit: '℃' })
        .calc('dt', '許容温度上昇', { symbol: 'Δt', unit: 'K', value: dt, expr: '{ti} − {to}', formula: '{ti}-{to}', digits: 1 });
    } else {
      dt = num(v, 'dt');
      s.input('dt', '許容温度上昇', dt, { symbol: 'Δt', unit: 'K', digits: 1 });
    }
    s.input('rho', '空気の密度', rho, { symbol: 'ρ', unit: 'kg/m³', digits: 3 })
      .input('cp', '空気の定圧比熱', cp, { symbol: 'cp', unit: 'kJ/(kg·K)', digits: 3 });

    const Q = (3600 * q) / (rho * cp * dt);
    s.section('必要換気量')
      .calc('Qv', '必要換気量', {
        symbol: 'Q',
        unit: 'm³/h',
        value: Q,
        expr: '3600 × {q} ÷ ({rho} × {cp} × {dt})',
        formula: '3600*{q}/({rho}*{cp}*{dt})',
        digits: 0,
      })
      .calc('Qm', '必要換気量（毎分）', { symbol: 'Q′', unit: 'm³/min', value: Q / 60, expr: '{Qv} ÷ 60', formula: '{Qv}/60', digits: 1 })
      .highlight('q', 'Qv', 'Qm');

    if (dt < 3) s.warn('許容温度上昇が 3 K 未満のため、換気量が非常に大きくなっています。冷房設備の併用を検討してください。');
    return s.result();
  },
};
