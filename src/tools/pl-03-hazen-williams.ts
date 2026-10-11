import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { pl03Beginner, pl03Doc } from './docs/pl-03';

/** 水の単位体積重量 ρg（kPa/m）。ρ = 1000 kg/m³、g = 9.80665 m/s² */
export const RHO_G = 9.80665;

/**
 * SI 単位のヘーゼン・ウィリアムス式。
 * Q：流量（m³/s）、D：内径（m）、L：管長（m）、C：流速係数。戻り値は損失水頭（m）。
 */
export function hazenWilliamsHead(Q: number, D: number, L: number, C: number): number {
  return (10.67 * L * Q ** 1.85) / (C ** 1.85 * D ** 4.87);
}

/** 流速係数 C の目安（管種別）。値は目安で、採用値は設計基準・便覧の原文で確認する */
export const PIPE_C_OPTIONS = [
  { value: 'custom', label: '任意入力' },
  { value: 'lined', label: '硬質ポリ塩化ビニルライニング鋼管（目安 C = 130）', apply: { C: '130' } },
  { value: 'sus', label: 'ステンレス鋼管・銅管（目安 C = 130〜140）', apply: { C: '130' } },
  { value: 'resin', label: '硬質ポリ塩化ビニル管・ポリエチレン管（目安 C = 140〜150）', apply: { C: '140' } },
  { value: 'old', label: '経年した鋼管（目安 C = 100）', apply: { C: '100' } },
];

const PIPE_LABEL: Record<string, string> = Object.fromEntries(PIPE_C_OPTIONS.map((o) => [o.value, o.label]));

export const C_HELP =
  '流速係数は管内面の滑らかさを表し、大きいほど損失が小さくなります。選択肢の値は国土交通省「建築設備設計基準」や空気調和・衛生工学便覧に示される値をもとにした目安です。採用値は原文で確認し、経年による低下も考えて決めてください。';

export const hazenWilliams: ToolDef = {
  id: 'PL-03',
  slug: 'hazen-williams',
  category: 'plumbing',
  title: '給水管の摩擦損失',
  summary: 'ヘーゼン・ウィリアムス式で給水管の摩擦損失水頭・圧力損失・単位摩擦損失と流速を求めます。',
  keywords: ['ヘーゼン・ウィリアムス', 'ヘーゼンウィリアムス', 'Hazen-Williams', '摩擦損失', '圧力損失', '流速係数', '給水管', '単位摩擦損失', 'kPa/m'],
  references: [
    'ヘーゼン・ウィリアムス式（SI 単位） hf = 10.67 × L × Q^1.85 ÷ (C^1.85 × D^4.87)',
    '国土交通省大臣官房官庁営繕部 監修「建築設備設計基準」（給水管の摩擦損失、流速係数）',
    '空気調和・衛生工学便覧（管種別の流速係数）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'number',
      key: 'Q',
      label: '流量',
      unit: 'L/min',
      min: 0,
      exclusiveMin: true,
      help: '給水管の区間ごとの同時使用流量（瞬時最大流量）を入力します。',
    },
    {
      type: 'number',
      key: 'D',
      label: '管の内径',
      unit: 'mm',
      min: 0,
      exclusiveMin: true,
      help: '呼び径ではなく実際の内径を入力します。ライニング鋼管などはライニングの厚さだけ内径が小さくなるため、メーカーの寸法表で確認してください。',
    },
    { type: 'number', key: 'L', label: '管長（直管長）', unit: 'm', min: 0, exclusiveMin: true },
    { type: 'select', key: 'pipe', label: '管種（流速係数の目安）', options: PIPE_C_OPTIONS, help: C_HELP },
    {
      type: 'number',
      key: 'C',
      label: '流速係数 C',
      min: 0,
      exclusiveMin: true,
      suggestions: [
        { label: '100', value: 100 },
        { label: '130', value: 130 },
        { label: '140', value: 140 },
        { label: '150', value: 150 },
      ],
    },
  ],
  defaults: { Q: '100', D: '40', L: '50', pipe: 'lined', C: '130' },
  notes: [
    'ヘーゼン・ウィリアムス式は、常温の水が満流で流れる場合の実験式です。温水や管径の非常に小さい管では誤差が大きくなります。',
    '圧力損失は水の密度 1000 kg/m³、重力加速度 9.80665 m/s² として換算しています。',
    '継手・弁などの局部損失は含みません。直管長に相当長を加えるか、局部損失の割合を見込んで別途加算してください。',
    '流速係数の目安値は原文で確認してください。',
  ],
  doc: pl03Doc,
  beginner: pl03Beginner,
  build(v) {
    const Q = num(v, 'Q');
    const D = num(v, 'D');
    const L = num(v, 'L');
    const C = num(v, 'C');
    const Qs = Q / 60000;
    const Dm = D / 1000;
    const hf = hazenWilliamsHead(Qs, Dm, L, C);
    const dp = hf * RHO_G;
    const vel = Qs / ((Math.PI * Dm ** 2) / 4);

    const s = new SheetBuilder();
    s.section('入力値')
      .input('Q', '流量', Q, { symbol: 'Q', unit: 'L/min' })
      .input('D', '管の内径', D, { symbol: 'D', unit: 'mm' })
      .input('L', '管長', L, { symbol: 'L', unit: 'm' })
      .input('C', '流速係数', C, { symbol: 'C', note: PIPE_LABEL[str(v, 'pipe')] })
      .section('単位の換算')
      .calc('Qs', '流量（m³/s）', { symbol: 'Q′', unit: 'm³/s', value: Qs, expr: '{Q} ÷ 60000', formula: '{Q}/60000', digits: 6 })
      .calc('Dm', '内径（m）', { symbol: 'D′', unit: 'm', value: Dm, expr: '{D} ÷ 1000', formula: '{D}/1000', digits: 4 })
      .section('摩擦損失')
      .calc('hf', '摩擦損失水頭', {
        symbol: 'hf',
        unit: 'm',
        value: hf,
        expr: '10.67 × {L} × {Qs}^1.85 ÷ ({C}^1.85 × {Dm}^4.87)',
        formula: '10.67*{L}*{Qs}^1.85/({C}^1.85*{Dm}^4.87)',
        digits: 3,
      })
      .calc('dp', '摩擦損失（圧力）', { symbol: 'Δp', unit: 'kPa', value: dp, expr: '{hf} × 9.80665', formula: '{hf}*9.80665', digits: 2 })
      .calc('i', '単位摩擦損失', { symbol: 'i', unit: 'kPa/m', value: dp / L, expr: '{dp} ÷ {L}', formula: '{dp}/{L}', digits: 3 })
      .calc('v', '管内流速', {
        symbol: 'v',
        unit: 'm/s',
        value: vel,
        expr: '{Qs} ÷ (π × {Dm}² ÷ 4)',
        formula: '{Qs}/(PI()*{Dm}^2/4)',
        digits: 2,
      })
      .highlight('dp', 'i', 'hf', 'v');
    if (vel > 2) s.warn('管内流速が 2.0 m/s を超えています。給水管では一般に 2.0 m/s 以下とし、ウォーターハンマーや騒音を防ぎます。管径を見直してください。');
    return s.result();
  },
};
