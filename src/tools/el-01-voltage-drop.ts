import type { ToolDef } from '../core/types';
import { SheetBuilder, stepUp, stepUpFormula } from '../core/sheet';
import { num, str } from '../core/values';

/** 配電方式ごとの簡易式の係数（内線規程 資料） */
const SYSTEMS: Record<string, { label: string; K: number; note: string }> = {
  '1p2w': { label: '単相2線式', K: 35.6, note: '線間の電圧降下' },
  '3p3w': { label: '三相3線式', K: 30.8, note: '線間の電圧降下' },
  '1p3w': { label: '単相3線式・三相4線式', K: 17.8, note: '外側線（電圧線）と中性線間の電圧降下' },
};

/** より線の公称断面積（mm²） */
export const CABLE_SIZES = [2, 3.5, 5.5, 8, 14, 22, 38, 60, 100, 150, 200, 250, 325] as const;

const SIZE_OPTIONS = [
  { value: '2.01', label: '1.6mm 単線（2.01 mm²）' },
  { value: '3.14', label: '2.0mm 単線（3.14 mm²）' },
  { value: '5.31', label: '2.6mm 単線（5.31 mm²）' },
  ...CABLE_SIZES.map((s) => ({ value: String(s), label: `${s} mm²` })),
];

export const voltageDrop: ToolDef = {
  id: 'EL-01',
  slug: 'voltage-drop',
  category: 'electrical',
  title: '電圧降下',
  summary: '内線規程の簡易式で電圧降下と降下率を求め、許容値との判定と必要な電線サイズを示します。',
  keywords: ['電圧降下', '降下率', '内線規程', '幹線', '分岐回路', 'ケーブル', '電線サイズ', 'こう長', '亘長'],
  references: [
    '内線規程 JEAC 8001 1310節（電圧降下）および資料（電圧降下の計算式）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'sys',
      label: '配電方式',
      display: 'segmented',
      options: [
        { value: '1p2w', label: '単相2線', apply: { V: '100' } },
        { value: '3p3w', label: '三相3線', apply: { V: '200' } },
        { value: '1p3w', label: '単相3線・三相4線', apply: { V: '100' } },
      ],
    },
    {
      type: 'number',
      key: 'V',
      label: '基準電圧',
      unit: 'V',
      min: 0,
      exclusiveMin: true,
      help: '単相3線式・三相4線式は外側線と中性線間の電圧（100V、240V など）を入力します。',
      suggestions: [
        { label: '100V', value: 100 },
        { label: '200V', value: 200 },
        { label: '240V', value: 240 },
        { label: '400V', value: 400 },
      ],
    },
    { type: 'number', key: 'I', label: '負荷電流', unit: 'A', min: 0, exclusiveMin: true },
    { type: 'number', key: 'L', label: '電線のこう長（片道）', unit: 'm', min: 0, exclusiveMin: true },
    { type: 'select', key: 'A', label: '電線の断面積', options: SIZE_OPTIONS },
    {
      type: 'select',
      key: 'ea',
      label: '許容電圧降下率',
      options: [
        { value: '2', label: '2%（幹線・分岐回路それぞれの原則値）' },
        { value: '3', label: '3%（構内変圧器から供給する場合の幹線）' },
        { value: '4', label: '4%（こう長120m以下・電気事業者から低圧供給）' },
        { value: '5', label: '5%（こう長120m以下・構内変圧器／200m以下・低圧供給）' },
        { value: '6', label: '6%（こう長200m以下・構内変圧器／200m超・低圧供給）' },
        { value: '7', label: '7%（こう長200m超・構内変圧器）' },
      ],
      help: '4%以上は、供給点から最遠端の負荷までのこう長が60mを超える場合の幹線・分岐回路の合計値です。',
    },
  ],
  defaults: { sys: '3p3w', V: '200', I: '50', L: '40', A: '14', ea: '2' },
  notes: [
    '簡易式 e = K × L × I ÷ (1000 × A) は、力率1、導体温度を考慮しない近似式です。太い電線や力率の低い負荷では、インピーダンスを用いた計算で確認してください。',
    '電線サイズは電圧降下だけで決まりません。許容電流、遮断器との協調、短絡強度も確認してください。',
  ],
  build(v) {
    const sys = SYSTEMS[str(v, 'sys')];
    const V = num(v, 'V');
    const I = num(v, 'I');
    const L = num(v, 'L');
    const A = Number(str(v, 'A'));
    const ea = Number(str(v, 'ea'));
    const K = sys.K;

    const e = (K * L * I) / (1000 * A);
    const eps = (e / V) * 100;
    const Areq = (K * L * I) / (1000 * V * (ea / 100));
    const rec = stepUp(Areq, CABLE_SIZES);

    const s = new SheetBuilder();
    s.section('入力値')
      .input('K', '配電方式による係数', K, { symbol: 'K', note: `${sys.label}（${sys.note}）` })
      .input('V', '基準電圧', V, { symbol: 'V', unit: 'V' })
      .input('I', '負荷電流', I, { symbol: 'I', unit: 'A' })
      .input('L', 'こう長', L, { symbol: 'L', unit: 'm' })
      .input('A', '電線の断面積', A, { symbol: 'A', unit: 'mm²' })
      .input('ea', '許容電圧降下率', ea, { symbol: 'εa', unit: '%' })
      .section('電圧降下')
      .calc('e', '電圧降下', { symbol: 'e', unit: 'V', value: e, expr: '{K} × {L} × {I} ÷ (1000 × {A})', formula: '{K}*{L}*{I}/(1000*{A})', digits: 2 })
      .calc('eps', '電圧降下率', { symbol: 'ε', unit: '%', value: eps, expr: '{e} ÷ {V} × 100', formula: '{e}/{V}*100', digits: 2 })
      .judge('ok', '判定', eps <= ea, { expr: '{eps} ≤ {ea}', formula: 'IF({eps}<={ea},"OK","NG")' })
      .section('必要な電線サイズ')
      .calc('Areq', '必要断面積', {
        symbol: 'Ar',
        unit: 'mm²',
        value: Areq,
        expr: '{K} × {L} × {I} ÷ (1000 × {V} × {ea} ÷ 100)',
        formula: '{K}*{L}*{I}/(1000*{V}*{ea}/100)',
        digits: 2,
      })
      .calc('rec', '推奨サイズ（より線）', {
        symbol: 'As',
        unit: 'mm²',
        value: rec ?? '範囲外',
        expr: '{Areq} 以上の最小の公称断面積',
        formula: stepUpFormula('{Areq}', CABLE_SIZES),
        format: rec === null ? 'text' : 'number',
        note: '電圧降下のみから選んだサイズです',
      })
      .highlight('e', 'eps', 'ok', 'rec');

    if (rec === null) s.warn('必要断面積が 325 mm² を超えます。並列布設やバスダクト、配電方式の見直しを検討してください。');
    if (eps > ea) s.warn(`電圧降下率が許容値 ${ea}% を超えています。電線サイズを上げるか、こう長・配電電圧を見直してください。`);
    return s.result();
  },
};
