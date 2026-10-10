import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { pl04Beginner, pl04Doc } from './docs/pl-04';

const isBooster = (v: RawValues) => v.mode === 'booster';
const hfCalc = (v: RawValues) => v.hfm === 'calc';

export const boosterPumpHead: ToolDef = {
  id: 'PL-04',
  slug: 'booster-pump-head',
  category: 'plumbing',
  title: '給水ポンプの全揚程',
  summary: '揚水ポンプ・加圧給水ポンプの全揚程を、実揚程・摩擦損失・器具の必要圧力から求め、軸動力も示します。',
  keywords: ['全揚程', '揚程', '揚水ポンプ', '加圧給水ポンプ', 'ブースターポンプ', '実揚程', '摩擦損失', '器具の必要圧力', '軸動力'],
  references: [
    '国土交通省大臣官房官庁営繕部 監修「建築設備設計基準」（給水ポンプの全揚程）',
    '空気調和・衛生工学便覧（器具の最低必要圧力の目安、局部損失）',
    'ポンプの水動力 Pw = ρ × g × Q × H',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'mode',
      label: 'ポンプの方式',
      display: 'segmented',
      options: [
        { value: 'booster', label: '加圧給水ポンプ' },
        { value: 'lift', label: '揚水ポンプ' },
      ],
      help: '揚水ポンプは受水槽から高置水槽へ、加圧給水ポンプは受水槽から最上階・最遠の器具へ直接送ります。',
    },
    {
      type: 'number',
      key: 'ha',
      label: '実揚程',
      unit: 'm',
      min: 0,
      help: '受水槽の低水位から、揚水ポンプは高置水槽の吐出口まで、加圧給水ポンプは最上階・最遠の器具までの高さです。',
    },
    {
      type: 'select',
      key: 'hfm',
      label: '配管の摩擦損失の入れ方',
      display: 'segmented',
      options: [
        { value: 'calc', label: '直管長から計算' },
        { value: 'direct', label: '損失水頭を直接入力' },
      ],
    },
    { type: 'number', key: 'hf', label: '配管の摩擦損失水頭（局部損失を含む）', unit: 'm', min: 0, visible: (v) => v.hfm === 'direct' },
    { type: 'number', key: 'Lp', label: '直管長（ポンプから最遠の器具・吐出口まで）', unit: 'm', min: 0, visible: hfCalc },
    {
      type: 'number',
      key: 'ip',
      label: '単位摩擦損失',
      unit: 'kPa/m',
      min: 0,
      visible: hfCalc,
      help: '「給水管の摩擦損失」（PL-03）で求めた値などを入力します。区間ごとに異なる場合は平均的な値か、区間ごとの合計を直接入力してください。',
    },
    {
      type: 'number',
      key: 'kl',
      label: '局部損失の割合（直管損失に対して）',
      unit: '%',
      min: 0,
      visible: hfCalc,
      help: '継手・弁などの局部損失を、直管の損失に対する割合で見込みます。採用する割合は設計基準・便覧で確認してください。',
      suggestions: [
        { label: '30%', value: 30 },
        { label: '50%', value: 50 },
        { label: '100%', value: 100 },
      ],
    },
    {
      type: 'number',
      key: 'p',
      label: '器具の必要圧力',
      unit: 'kPa',
      min: 0,
      visible: isBooster,
      help: '最も条件の厳しい器具の必要圧力です。目安（便覧）：一般水栓 30 kPa、大便器洗浄弁 70 kPa、シャワー 70 kPa。器具メーカーの資料で確認してください。',
      suggestions: [
        { label: '一般水栓 目安 30', value: 30 },
        { label: '洗浄弁 目安 70', value: 70 },
        { label: 'シャワー 目安 70', value: 70 },
      ],
    },
    {
      type: 'number',
      key: 'mg',
      label: '余裕率',
      unit: '%',
      min: 0,
      suggestions: [
        { label: '0%', value: 0 },
        { label: '10%', value: 10 },
        { label: '20%', value: 20 },
      ],
    },
    {
      type: 'number',
      key: 'Q',
      label: '吐出量（軸動力を求める場合）',
      unit: 'L/min',
      min: 0,
      help: '0 にすると軸動力は計算しません。',
    },
    {
      type: 'number',
      key: 'eta',
      label: 'ポンプ効率',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: 'メーカーの性能曲線の値を入力します。小形の給水ポンプは 0.4〜0.6 程度のことが多いです（目安）。',
    },
  ],
  defaults: { mode: 'booster', ha: '30', hfm: 'calc', hf: '5', Lp: '60', ip: '0.3', kl: '50', p: '70', mg: '10', Q: '200', eta: '0.55' },
  notes: [
    '全揚程 H = (実揚程 + 摩擦損失水頭 + 器具の必要圧力の水頭) × (1 + 余裕率) です。揚水ポンプでは器具の必要圧力は入れません。',
    '圧力と水頭の換算は ρg = 9.80665 kPa/m（水の密度 1000 kg/m³）としています。',
    '吐出口での速度水頭（v² ÷ 2g）は小さいため省略しています。必要なら余裕率に含めるか、損失水頭に加えてください。',
    '加圧給水ポンプの吐出量は瞬時最大流量（同時使用流量）、揚水ポンプは時間最大予想給水量を基準にします（PL-01 参照）。',
    '器具の必要圧力の目安値は原文（便覧・メーカー資料）で確認してください。',
  ],
  doc: pl04Doc,
  beginner: pl04Beginner,
  build(v) {
    const booster = str(v, 'mode') === 'booster';
    const ha = num(v, 'ha');
    const mg = num(v, 'mg');
    const Q = num(v, 'Q');
    const eta = num(v, 'eta');

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('mode', 'ポンプの方式', booster ? '加圧給水ポンプ（最上階・最遠の器具まで）' : '揚水ポンプ（受水槽 → 高置水槽）')
      .input('ha', '実揚程', ha, { symbol: 'ha', unit: 'm' });

    let hf: number;
    s.section('配管の摩擦損失');
    if (str(v, 'hfm') === 'calc') {
      const Lp = num(v, 'Lp');
      const ip = num(v, 'ip');
      const kl = num(v, 'kl');
      const hfk = Lp * ip * (1 + kl / 100);
      hf = hfk / 9.80665;
      s.input('Lp', '直管長', Lp, { symbol: 'L', unit: 'm' })
        .input('ip', '単位摩擦損失', ip, { symbol: 'i', unit: 'kPa/m', digits: 3 })
        .input('kl', '局部損失の割合', kl, { symbol: 'k', unit: '%' })
        .calc('hfk', '摩擦損失（圧力）', { symbol: 'Δpf', unit: 'kPa', value: hfk, expr: '{Lp} × {ip} × (1 + {kl} ÷ 100)', formula: '{Lp}*{ip}*(1+{kl}/100)', digits: 2 })
        .calc('hf', '摩擦損失水頭', { symbol: 'hf', unit: 'm', value: hf, expr: '{hfk} ÷ 9.80665', formula: '{hfk}/9.80665', digits: 2 });
    } else {
      hf = num(v, 'hf');
      s.input('hf', '摩擦損失水頭', hf, { symbol: 'hf', unit: 'm', note: '局部損失を含めた値' });
    }

    let H0: number;
    s.section('全揚程');
    if (booster) {
      const p = num(v, 'p');
      const hp = p / 9.80665;
      H0 = ha + hf + hp;
      s.input('p', '器具の必要圧力', p, { symbol: 'p', unit: 'kPa' })
        .calc('hp', '器具の必要圧力の水頭', { symbol: 'hp', unit: 'm', value: hp, expr: '{p} ÷ 9.80665', formula: '{p}/9.80665', digits: 2 })
        .calc('H0', '所要揚程（余裕なし）', { symbol: 'H₀', unit: 'm', value: H0, expr: '{ha} + {hf} + {hp}', formula: '{ha}+{hf}+{hp}', digits: 2 });
    } else {
      H0 = ha + hf;
      s.calc('H0', '所要揚程（余裕なし）', { symbol: 'H₀', unit: 'm', value: H0, expr: '{ha} + {hf}', formula: '{ha}+{hf}', digits: 2 });
    }
    const H = H0 * (1 + mg / 100);
    s.input('mg', '余裕率', mg, { symbol: 'α', unit: '%' })
      .calc('H', '全揚程', { symbol: 'H', unit: 'm', value: H, expr: '{H0} × (1 + {mg} ÷ 100)', formula: '{H0}*(1+{mg}/100)', digits: 1 })
      .calc('PH', '全揚程（圧力換算）', { symbol: 'pH', unit: 'kPa', value: H * 9.80665, expr: '{H} × 9.80665', formula: '{H}*9.80665', digits: 0 })
      .highlight('H', 'PH');

    if (Q > 0) {
      const Pw = 9.80665 * (Q / 60000) * H;
      s.section('軸動力')
        .input('Q', '吐出量', Q, { symbol: 'Q', unit: 'L/min' })
        .input('eta', 'ポンプ効率', eta, { symbol: 'η', digits: 2 })
        .calc('Pw', '水動力', { symbol: 'Pw', unit: 'kW', value: Pw, expr: '9.80665 × {Q} ÷ 60000 × {H}', formula: '9.80665*{Q}/60000*{H}', digits: 2 })
        .calc('Ps', '軸動力', { symbol: 'Ps', unit: 'kW', value: Pw / eta, expr: '{Pw} ÷ {eta}', formula: '{Pw}/{eta}', digits: 2 })
        .highlight('Ps');
    }
    return s.result();
  },
};
