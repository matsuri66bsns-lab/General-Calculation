import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder, stepUp, stepUpFormula } from '../core/sheet';
import { num, str } from '../core/values';
import { cm03Beginner, cm03Doc } from './docs/cm-03';

/**
 * 電動機の定格出力の系列（kW）。
 * JIS C 4210（本文 2001 年版）3.2 表2 と JIS C 4212（本文 2000 年版）3.2 表2 の定格出力。
 * JIS の本文の写し（kikakurui.com の頁画像）で確認した値。
 */
export const MOTOR_SERIES: Record<string, { label: string; sizes: readonly number[] }> = {
  c4210: {
    label: 'JIS C 4210 一般用低圧三相かご形誘導電動機（0.2〜37 kW）',
    sizes: [0.2, 0.25, 0.37, 0.4, 0.55, 0.75, 1.1, 1.5, 2.2, 3.7, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37],
  },
  c4212: {
    label: 'JIS C 4212 高効率低圧三相かご形誘導電動機（0.2〜160 kW）',
    sizes: [0.2, 0.4, 0.75, 1.5, 2.2, 3.7, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160],
  },
};

/** 標準重力加速度（m/s²） */
const G = 9.80665;

const isKind = (k: string) => (v: RawValues) => v.kind === k;

export const shaftPower: ToolDef = {
  id: 'CM-03',
  slug: 'shaft-power',
  category: 'common',
  title: 'ポンプ・送風機の軸動力',
  summary: 'ポンプ・送風機の軸動力を求め、余裕率を見込んだ電動機出力と標準の定格出力を選びます。',
  keywords: ['軸動力', '電動機出力', 'モーター', 'ポンプ', '送風機', 'ファン', '全揚程', '全圧', '効率', '余裕率', 'kW', 'JIS C 4210'],
  references: [
    '軸動力の式（水動力・空気動力 ÷ 効率）。流体機械の基本式',
    'JIS C 4210 一般用低圧三相かご形誘導電動機 3.2（定格出力）表2',
    'JIS C 4212 高効率低圧三相かご形誘導電動機 3.2（定格出力）表2',
    '建築研究所 建築研究資料 第187号 第8章「電動機」（上記 JIS の定格出力表の転記。本ツールの系列はこれによる）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'kind',
      label: '機器の種類',
      display: 'segmented',
      options: [
        { value: 'pump', label: 'ポンプ' },
        { value: 'fan', label: '送風機' },
      ],
    },
    { type: 'number', key: 'Qp', label: '吐出量', unit: 'm³/min', min: 0, exclusiveMin: true, visible: isKind('pump') },
    { type: 'number', key: 'H', label: '全揚程', unit: 'm', min: 0, exclusiveMin: true, visible: isKind('pump') },
    {
      type: 'number',
      key: 'rho',
      label: '流体の密度',
      unit: 'kg/m³',
      min: 0,
      exclusiveMin: true,
      visible: isKind('pump'),
      help: '常温の水は 1000 kg/m³ としてよいです。温水やブラインは実際の密度を入力してください。',
      suggestions: [{ label: '水 1000', value: 1000 }],
    },
    { type: 'number', key: 'Qf', label: '風量', unit: 'm³/min', min: 0, exclusiveMin: true, visible: isKind('fan') },
    { type: 'number', key: 'Pt', label: '全圧', unit: 'Pa', min: 0, exclusiveMin: true, visible: isKind('fan') },
    {
      type: 'number',
      key: 'eta',
      label: '効率（ポンプ効率／送風機の全圧効率）',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '0〜1 の小数で入力します（60 % なら 0.6）。メーカーの性能曲線から運転点の効率を読み取ってください。',
    },
    {
      type: 'number',
      key: 'alpha',
      label: '余裕率',
      min: 0,
      max: 1,
      help: '目安は 0.1〜0.2（10〜20 %）です。機器や案件の基準に合わせてください。',
      suggestions: [
        { label: '0.1', value: 0.1 },
        { label: '0.15', value: 0.15 },
        { label: '0.2', value: 0.2 },
      ],
    },
    {
      type: 'select',
      key: 'series',
      label: '電動機の定格出力の系列',
      options: Object.entries(MOTOR_SERIES).map(([value, s]) => ({ value, label: s.label })),
    },
  ],
  defaults: { kind: 'pump', Qp: '0.5', H: '30', rho: '1000', Qf: '300', Pt: '600', eta: '0.6', alpha: '0.15', series: 'c4210' },
  notes: [
    '効率はメーカーの性能曲線から読み取った運転点の値を使ってください。ベルト駆動など伝達損失がある場合は、その効率も掛け合わせた値を入力します。',
    '定格出力の系列は JIS C 4210 の 3.2 表2 と JIS C 4212 の 3.2 表2 によります。現在の三相誘導電動機はトップランナー基準（JIS C 4213 など）の製品が主流のため、実際の定格はメーカー資料でも確認してください。',
    '電動機出力は運転点だけでなく、流量が増えたときの軸動力の増加（ポンプの過負荷など）も考慮して選んでください。',
  ],
  doc: cm03Doc,
  beginner: cm03Beginner,
  build(v) {
    const pump = str(v, 'kind') === 'pump';
    const eta = num(v, 'eta');
    const alpha = num(v, 'alpha');
    const series = MOTOR_SERIES[str(v, 'series')];

    const s = new SheetBuilder();
    s.section('計算条件').input('kind', '機器の種類', pump ? 'ポンプ' : '送風機').section('入力値');

    let P: number;
    if (pump) {
      const rho = num(v, 'rho');
      const Q = num(v, 'Qp');
      const H = num(v, 'H');
      P = (rho * G * Q * H) / (60 * 1000 * eta);
      s.input('rho', '流体の密度', rho, { symbol: 'ρ', unit: 'kg/m³' })
        .input('g', '重力加速度', G, { symbol: 'g', unit: 'm/s²', digits: 5, note: '標準重力加速度' })
        .input('Q', '吐出量', Q, { symbol: 'Q', unit: 'm³/min' })
        .input('H', '全揚程', H, { symbol: 'H', unit: 'm' })
        .input('eta', 'ポンプ効率', eta, { symbol: 'η', digits: 2 })
        .input('alpha', '余裕率', alpha, { symbol: 'α', digits: 2 })
        .section('軸動力')
        .calc('P', '軸動力', {
          symbol: 'P',
          unit: 'kW',
          value: P,
          expr: '{rho} × {g} × {Q} × {H} ÷ (60 × 1000 × {eta})',
          formula: '{rho}*{g}*{Q}*{H}/(60*1000*{eta})',
          digits: 2,
        });
    } else {
      const Q = num(v, 'Qf');
      const Pt = num(v, 'Pt');
      P = (Q * Pt) / (60 * 1000 * eta);
      s.input('Q', '風量', Q, { symbol: 'Q', unit: 'm³/min' })
        .input('Pt', '全圧', Pt, { symbol: 'Pt', unit: 'Pa' })
        .input('eta', '全圧効率', eta, { symbol: 'η', digits: 2 })
        .input('alpha', '余裕率', alpha, { symbol: 'α', digits: 2 })
        .section('軸動力')
        .calc('P', '軸動力', {
          symbol: 'P',
          unit: 'kW',
          value: P,
          expr: '{Q} × {Pt} ÷ (60 × 1000 × {eta})',
          formula: '{Q}*{Pt}/(60*1000*{eta})',
          digits: 2,
        });
    }

    const PM = P * (1 + alpha);
    // 浮動小数点の誤差（50 × 1.1 = 55.000…01 など）で1段上を選ばないよう、小数6桁に丸めて比べる
    const rated = stepUp(Math.round(PM * 1e6) / 1e6, series.sizes);
    const max = series.sizes[series.sizes.length - 1];
    s.section('電動機出力')
      .calc('PM', '電動機出力（余裕込み）', { symbol: 'PM', unit: 'kW', value: PM, expr: '{P} × (1 + {alpha})', formula: '{P}*(1+{alpha})', digits: 2 })
      .calc('PR', '電動機の定格出力', {
        symbol: 'PR',
        unit: 'kW',
        value: rated ?? '範囲外',
        expr: '{PM} 以上で最小の定格出力',
        formula: stepUpFormula('ROUND({PM},6)', series.sizes),
        format: rated === null ? 'text' : 'number',
        note: series.label,
      })
      .highlight('P', 'PM', 'PR');

    if (rated === null) s.warn(`電動機出力が系列の最大 ${max} kW を超えます。系列を切り替えるか、メーカー資料で電動機を選んでください。`);
    return s.result();
  },
};
