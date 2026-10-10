import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num } from '../core/values';
import { CalcError } from '../core/errors';
import { hv09Beginner, hv09Doc } from './docs/hv-09';

export const fanStaticPressure: ToolDef = {
  id: 'HV-09',
  slug: 'fan-static-pressure',
  category: 'hvac',
  title: '送風機の静圧・軸動力',
  summary: 'ダクトの摩擦・局部抵抗・機器抵抗を合計して送風機の全圧と静圧を求め、軸動力を算定します。',
  keywords: ['送風機', 'ファン', '静圧', '全圧', '動圧', '軸動力', '圧力損失', '局部抵抗', '抵抗係数', 'ζ', '余裕率', '全圧効率'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」送風機（静圧・軸動力の算定）',
    'JIS B 8330（送風機の試験及び検査方法）：全圧・静圧・動圧、全圧効率の定義',
    '空気調和・衛生工学便覧（局部抵抗係数・機器抵抗の目安）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'number',
      key: 'Q',
      label: '風量',
      unit: 'm³/min',
      min: 0,
      exclusiveMin: true,
      help: 'm³/h の場合は 60 で割って入力します。',
    },
    { type: 'number', key: 'L', label: '直管の長さ（最遠経路）', unit: 'm', min: 0 },
    {
      type: 'number',
      key: 'R',
      label: '単位摩擦損失',
      unit: 'Pa/m',
      min: 0,
      help: 'ダクト寸法を決めたときの値（HV-08）。目安 0.8〜1.5 Pa/m。',
      suggestions: [
        { label: '0.8', value: 0.8 },
        { label: '1.0', value: 1 },
        { label: '1.5', value: 1.5 },
      ],
    },
    {
      type: 'number',
      key: 'zeta',
      label: '局部抵抗係数の合計 Σζ',
      min: 0,
      help: 'エルボ・分岐・ダンパーなどの抵抗係数を、便覧やメーカー資料で調べて合計します。',
    },
    {
      type: 'number',
      key: 'v',
      label: '局部抵抗の代表風速',
      unit: 'm/s',
      min: 0,
      help: '局部抵抗が生じる箇所のダクト内風速を入力します。',
    },
    {
      type: 'number',
      key: 'Pe',
      label: '機器抵抗の合計',
      unit: 'Pa',
      min: 0,
      help: 'フィルター・コイル・吹出口・吸込口・ガラリなどの抵抗の合計（メーカー資料の値）。',
    },
    {
      type: 'number',
      key: 'vd',
      label: '送風機の吐出口風速',
      unit: 'm/s',
      min: 0,
      help: '送風機の吐出口の風量 ÷ 吐出口面積。メーカー資料で確認します。',
    },
    { type: 'number', key: 'rho', label: '空気の密度', unit: 'kg/m³', min: 0, exclusiveMin: true, help: '20 ℃ 付近で 1.2 kg/m³ です。' },
    {
      type: 'number',
      key: 'eta',
      label: '送風機の全圧効率',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '小数で入力します。送風機の形式・大きさで異なるため、メーカー資料の値を使います。',
      suggestions: [
        { label: '0.4', value: 0.4 },
        { label: '0.5', value: 0.5 },
        { label: '0.6', value: 0.6 },
        { label: '0.7', value: 0.7 },
      ],
    },
    {
      type: 'number',
      key: 'ap',
      label: '静圧の余裕率',
      unit: '%',
      min: 0,
      help: '施工時の経路変更などに備えて見込む割合です（目安 10〜20 %）。',
      suggestions: [
        { label: '10%', value: 10 },
        { label: '15%', value: 15 },
        { label: '20%', value: 20 },
      ],
    },
    {
      type: 'number',
      key: 'am',
      label: '電動機出力の余裕率',
      unit: '%',
      min: 0,
      help: '軸動力に対して電動機の出力に見込む割合です（目安 10〜20 %）。',
      suggestions: [
        { label: '10%', value: 10 },
        { label: '15%', value: 15 },
        { label: '20%', value: 20 },
      ],
    },
  ],
  defaults: { Q: '100', L: '80', R: '1', zeta: '6', v: '8', Pe: '250', vd: '10', rho: '1.2', eta: '0.5', ap: '10', am: '15' },
  notes: [
    '全圧は最も抵抗の大きい経路（一般に最遠の吹出口まで）について合計してください。吸込側のダクト・機器の抵抗も含めます。',
    '静圧 = 全圧 − 吐出口の動圧 は、送風機のカタログ（静圧表示）と比べるための値です。',
    '電動機出力は、余裕を見込んだ軸動力以上の標準出力から選んでください。',
  ],
  doc: hv09Doc,
  beginner: hv09Beginner,
  build(v) {
    const Q = num(v, 'Q');
    const L = num(v, 'L');
    const R = num(v, 'R');
    const zeta = num(v, 'zeta');
    const vel = num(v, 'v');
    const Pe = num(v, 'Pe');
    const vd = num(v, 'vd');
    const rho = num(v, 'rho');
    const eta = num(v, 'eta');
    const ap = num(v, 'ap');
    const am = num(v, 'am');

    const Pf = R * L;
    const Pvl = (rho * vel * vel) / 2;
    const Pz = zeta * Pvl;
    const Pt = Pf + Pz + Pe;
    const Pvd = (rho * vd * vd) / 2;
    const Ps = Pt - Pvd;
    if (Pt <= 0) throw new CalcError('全圧が 0 になっています。直管の長さ・局部抵抗・機器抵抗のいずれかを入力してください。');
    const Ptd = Pt * (1 + ap / 100);
    const Psd = Ps * (1 + ap / 100);
    const P = (Q * Ptd) / (60 * 1000 * eta);
    const Pm = P * (1 + am / 100);

    const s = new SheetBuilder();
    s.section('入力値')
      .input('Q', '風量', Q, { symbol: 'Q', unit: 'm³/min', digits: 1 })
      .input('L', '直管の長さ', L, { symbol: 'L', unit: 'm', digits: 1 })
      .input('R', '単位摩擦損失', R, { symbol: 'R', unit: 'Pa/m', digits: 2 })
      .input('zeta', '局部抵抗係数の合計', zeta, { symbol: 'Σζ', digits: 2 })
      .input('v', '局部抵抗の代表風速', vel, { symbol: 'v', unit: 'm/s', digits: 1 })
      .input('Pe', '機器抵抗の合計', Pe, { symbol: 'Pe', unit: 'Pa', digits: 0 })
      .input('vd', '吐出口風速', vd, { symbol: 'vd', unit: 'm/s', digits: 1 })
      .input('rho', '空気の密度', rho, { symbol: 'ρ', unit: 'kg/m³', digits: 3 })
      .input('eta', '全圧効率', eta, { symbol: 'η', digits: 2 })
      .input('ap', '静圧の余裕率', ap, { symbol: 'αp', unit: '%', digits: 0 })
      .input('am', '電動機出力の余裕率', am, { symbol: 'αm', unit: '%', digits: 0 })
      .section('全圧・静圧')
      .calc('Pf', '直管の摩擦損失', { symbol: 'Pf', unit: 'Pa', value: Pf, expr: '{R} × {L}', formula: '{R}*{L}', digits: 1 })
      .calc('Pvl', '代表風速の動圧', { symbol: 'Pv', unit: 'Pa', value: Pvl, expr: '{rho} × {v}² ÷ 2', formula: '{rho}*{v}^2/2', digits: 1 })
      .calc('Pz', '局部抵抗', { symbol: 'Pz', unit: 'Pa', value: Pz, expr: '{zeta} × {Pvl}', formula: '{zeta}*{Pvl}', digits: 1 })
      .calc('Pt', '送風機全圧', { symbol: 'Pt', unit: 'Pa', value: Pt, expr: '{Pf} + {Pz} + {Pe}', formula: '{Pf}+{Pz}+{Pe}', digits: 0 })
      .calc('Pvd', '吐出口の動圧', { symbol: 'Pvd', unit: 'Pa', value: Pvd, expr: '{rho} × {vd}² ÷ 2', formula: '{rho}*{vd}^2/2', digits: 1 })
      .calc('Ps', '送風機静圧', { symbol: 'Ps', unit: 'Pa', value: Ps, expr: '{Pt} − {Pvd}', formula: '{Pt}-{Pvd}', digits: 0 })
      .section('余裕を見込んだ値')
      .calc('Ptd', '設計全圧', { symbol: 'Pt′', unit: 'Pa', value: Ptd, expr: '{Pt} × (1 + {ap} ÷ 100)', formula: '{Pt}*(1+{ap}/100)', digits: 0 })
      .calc('Psd', '設計静圧', { symbol: 'Ps′', unit: 'Pa', value: Psd, expr: '{Ps} × (1 + {ap} ÷ 100)', formula: '{Ps}*(1+{ap}/100)', digits: 0 })
      .calc('P', '軸動力', {
        symbol: 'P',
        unit: 'kW',
        value: P,
        expr: '{Q} × {Ptd} ÷ (60 × 1000 × {eta})',
        formula: '{Q}*{Ptd}/(60*1000*{eta})',
        digits: 2,
        note: '余裕を見込んだ設計全圧で計算',
      })
      .calc('Pm', '電動機出力の目安', { symbol: 'Pm', unit: 'kW', value: Pm, expr: '{P} × (1 + {am} ÷ 100)', formula: '{P}*(1+{am}/100)', digits: 2 })
      .highlight('Pt', 'Ps', 'Psd', 'P', 'Pm');

    if (Ps <= 0) s.warn('吐出口の動圧が全圧以上になっています。吐出口風速の値を確認してください。');
    return s.result();
  },
};
