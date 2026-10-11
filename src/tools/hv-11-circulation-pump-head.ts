import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { hv11Beginner, hv11Doc } from './docs/hv-11';

const G_ACC = 9.80665;

const isRatio = (v: RawValues) => v.local !== 'eq';
const isEq = (v: RawValues) => v.local === 'eq';
const isOpen = (v: RawValues) => v.circuit === 'open';
const withPower = (v: RawValues) => v.pw === 'yes';

export const circulationPumpHead: ToolDef = {
  id: 'HV-11',
  slug: 'circulation-pump-head',
  category: 'hvac',
  title: '冷温水ポンプの全揚程',
  summary: '配管の摩擦損失・局部損失・機器抵抗・実揚程から冷温水ポンプの全揚程を求め、必要なら軸動力も示します。',
  keywords: ['ポンプ', '揚程', '全揚程', '冷温水ポンプ', '冷却水ポンプ', '摩擦損失', '局部損失', '相当長', '密閉回路', '開放回路', '実揚程', '軸動力'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」ポンプ（全揚程の算定）',
    '空気調和・衛生工学便覧（局部損失の割合・相当長の目安、機器抵抗）',
    'ポンプの軸動力 P = ρ g Q H ÷ η（JIS B 8301 遠心ポンプ、斜流ポンプ及び軸流ポンプ—試験方法 の水動力の定義）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'circuit',
      label: '配管回路',
      display: 'segmented',
      options: [
        { value: 'closed', label: '密閉回路' },
        { value: 'open', label: '開放回路（冷却塔など）' },
      ],
      help: '密閉回路は水が大気に触れずに循環するため、実揚程（高さの差）を考えなくてよい回路です。',
    },
    { type: 'number', key: 'L', label: '直管の長さ（最遠の機器までの往復）', unit: 'm', min: 0 },
    {
      type: 'number',
      key: 'R',
      label: '単位摩擦損失（配管 1 m 当たり）',
      unit: 'Pa/m',
      min: 0,
      help: '管径を決めたときの値です。冷温水配管では 300〜500 Pa/m 程度が目安です。',
      suggestions: [
        { label: '300', value: 300 },
        { label: '400', value: 400 },
        { label: '500', value: 500 },
      ],
    },
    {
      type: 'select',
      key: 'local',
      label: '局部損失（継手・弁類）の見込み方',
      display: 'segmented',
      options: [
        { value: 'ratio', label: '直管損失に対する割合' },
        { value: 'eq', label: '相当長で入力' },
      ],
    },
    {
      type: 'number',
      key: 'k',
      label: '局部損失の割合（直管損失に対して）',
      min: 0,
      visible: isRatio,
      help: '一般に 0.3〜0.5 程度が目安です（継手の多い機械室まわりは大きめ）。',
      suggestions: [
        { label: '0.3', value: 0.3 },
        { label: '0.4', value: 0.4 },
        { label: '0.5', value: 0.5 },
      ],
    },
    {
      type: 'number',
      key: 'Le',
      label: '継手・弁類の相当長の合計',
      unit: 'm',
      min: 0,
      visible: isEq,
      help: '継手・弁類を同じ損失になる直管の長さに置き換えた値の合計（便覧・メーカー資料の値）。',
    },
    {
      type: 'number',
      key: 'Pe',
      label: '機器の抵抗の合計（熱源・コイル・弁類）',
      unit: 'kPa',
      min: 0,
      help: '冷凍機・熱交換器・空調機コイル・制御弁などの抵抗をメーカー資料で調べて合計します。',
    },
    {
      type: 'number',
      key: 'ha',
      label: '実揚程（吸込水面から吐出し開放端までの高さ）',
      unit: 'm',
      min: 0,
      visible: isOpen,
      help: '冷却塔の場合は、冷却塔の水槽の水面から散水装置までの高さなどです。',
    },
    { type: 'number', key: 'rho', label: '水の密度', unit: 'kg/m³', min: 0, exclusiveMin: true, help: '水は約 1000 kg/m³ です。' },
    {
      type: 'number',
      key: 'a',
      label: '揚程の余裕率',
      unit: '%',
      min: 0,
      help: '一般に 10〜20 % 程度を見込みます（目安）。',
      suggestions: [
        { label: '10%', value: 10 },
        { label: '15%', value: 15 },
        { label: '20%', value: 20 },
      ],
    },
    {
      type: 'select',
      key: 'pw',
      label: '軸動力',
      display: 'segmented',
      options: [
        { value: 'yes', label: '求める' },
        { value: 'no', label: '求めない' },
      ],
    },
    { type: 'number', key: 'G', label: '流量', unit: 'L/min', min: 0, exclusiveMin: true, visible: withPower, help: '冷温水量・冷却水量（HV-10）で求めた値です。' },
    {
      type: 'number',
      key: 'eta',
      label: 'ポンプ効率',
      min: 0,
      exclusiveMin: true,
      max: 1,
      visible: withPower,
      help: '小数で入力します。メーカー資料の値を使います。',
      suggestions: [
        { label: '0.5', value: 0.5 },
        { label: '0.6', value: 0.6 },
        { label: '0.7', value: 0.7 },
      ],
    },
  ],
  defaults: { circuit: 'closed', L: '200', R: '400', local: 'ratio', k: '0.4', Le: '80', Pe: '120', ha: '3', rho: '1000', a: '10', pw: 'yes', G: '300', eta: '0.6' },
  notes: [
    '直管の長さは、ポンプから最も抵抗の大きい機器までの往き管と還り管の合計で入力してください。',
    '密閉回路では、配管の高さの差による圧力は往きと還りで打ち消し合うため、実揚程は 0 として扱います。',
    '軸動力は余裕を見込んだ全揚程で計算しています。電動機は軸動力に余裕を見込んだ標準出力から選んでください。',
  ],
  doc: hv11Doc,
  beginner: hv11Beginner,
  build(v) {
    const L = num(v, 'L');
    const R = num(v, 'R');
    const ratio = str(v, 'local') !== 'eq';
    const open = str(v, 'circuit') === 'open';
    const power = str(v, 'pw') === 'yes';
    const Pe = num(v, 'Pe');
    const rho = num(v, 'rho');
    const a = num(v, 'a');

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('circuit', '配管回路', open ? '開放回路' : '密閉回路')
      .section('入力値')
      .input('L', '直管の長さ', L, { symbol: 'L', unit: 'm', digits: 1 })
      .input('R', '単位摩擦損失', R, { symbol: 'R', unit: 'Pa/m', digits: 0 });

    let Pp: number;
    if (ratio) {
      const k = num(v, 'k');
      Pp = (R * L * (1 + k)) / 1000;
      s.input('k', '局部損失の割合', k, { symbol: 'k', digits: 2 });
    } else {
      const Le = num(v, 'Le');
      Pp = (R * (L + Le)) / 1000;
      s.input('Le', '継手・弁類の相当長', Le, { symbol: 'Le', unit: 'm', digits: 1 });
    }
    s.input('Pe', '機器の抵抗の合計', Pe, { symbol: 'Pe', unit: 'kPa', digits: 1 });
    const ha = open ? num(v, 'ha') : 0;
    if (open) s.input('ha', '実揚程', ha, { symbol: 'ha', unit: 'm', digits: 2 });
    s.input('rho', '水の密度', rho, { symbol: 'ρ', unit: 'kg/m³', digits: 0 })
      .input('g', '重力加速度', G_ACC, { symbol: 'g', unit: 'm/s²', digits: 5 })
      .input('a', '揚程の余裕率', a, { symbol: 'α', unit: '%', digits: 0 });

    s.section('全揚程');
    if (ratio) {
      s.calc('Pp', '配管の損失（直管＋局部）', { symbol: 'Pp', unit: 'kPa', value: Pp, expr: '{R} × {L} × (1 + {k}) ÷ 1000', formula: '{R}*{L}*(1+{k})/1000', digits: 1 });
    } else {
      s.calc('Pp', '配管の損失（直管＋局部）', { symbol: 'Pp', unit: 'kPa', value: Pp, expr: '{R} × ({L} + {Le}) ÷ 1000', formula: '{R}*({L}+{Le})/1000', digits: 1 });
    }
    const hp = (Pp * 1000) / (rho * G_ACC);
    const he = (Pe * 1000) / (rho * G_ACC);
    const H = hp + he + ha;
    const Hd = H * (1 + a / 100);
    s.calc('hp', '配管の損失水頭', { symbol: 'hp', unit: 'm', value: hp, expr: '{Pp} × 1000 ÷ ({rho} × {g})', formula: '{Pp}*1000/({rho}*{g})', digits: 2 })
      .calc('he', '機器の損失水頭', { symbol: 'he', unit: 'm', value: he, expr: '{Pe} × 1000 ÷ ({rho} × {g})', formula: '{Pe}*1000/({rho}*{g})', digits: 2 });
    if (open) {
      s.calc('H', '全揚程', { symbol: 'H', unit: 'm', value: H, expr: '{hp} + {he} + {ha}', formula: '{hp}+{he}+{ha}', digits: 2 });
    } else {
      s.calc('H', '全揚程', { symbol: 'H', unit: 'm', value: H, expr: '{hp} + {he}', formula: '{hp}+{he}', digits: 2, note: '密閉回路のため実揚程は 0' });
    }
    s.calc('Hd', '余裕を見込んだ全揚程', { symbol: 'H′', unit: 'm', value: Hd, expr: '{H} × (1 + {a} ÷ 100)', formula: '{H}*(1+{a}/100)', digits: 1 })
      .highlight('H', 'Hd');

    if (power) {
      const G = num(v, 'G');
      const eta = num(v, 'eta');
      const P = (rho * G_ACC * (G / 60000) * Hd) / (1000 * eta);
      s.section('軸動力')
        .input('G', '流量', G, { symbol: 'G', unit: 'L/min', digits: 1 })
        .input('eta', 'ポンプ効率', eta, { symbol: 'η', digits: 2 })
        .calc('P', '軸動力', {
          symbol: 'P',
          unit: 'kW',
          value: P,
          expr: '{rho} × {g} × ({G} ÷ 60000) × {Hd} ÷ (1000 × {eta})',
          formula: '{rho}*{g}*({G}/60000)*{Hd}/(1000*{eta})',
          digits: 2,
          note: '余裕を見込んだ全揚程で計算',
        })
        .highlight('P');
    }
    return s.result();
  },
};
