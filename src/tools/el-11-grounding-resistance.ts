import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { el11Beginner, el11Doc } from './docs/el-11';

const KIND_LABEL: Record<string, string> = {
  A: 'A種接地工事',
  B: 'B種接地工事',
  C: 'C種接地工事',
  D: 'D種接地工事',
};

/** B種：高圧側（特別高圧側）の電路の自動遮断による係数（電技解釈 第17条第2項第一号の 17-1表） */
const B_CUT: Record<string, { label: string; K: number }> = {
  none: { label: '自動遮断装置なし（下記以外）', K: 150 },
  '2s': { label: '1秒を超え2秒以内に自動遮断', K: 300 },
  '1s': { label: '1秒以内に自動遮断', K: 600 },
};

/** 接地線の最小太さ（電技解釈 第17条。B種は第2項第三号の 17-3表） */
const WIRE_TEXT: Record<string, string> = {
  A: '直径 2.6 mm 以上の軟銅線（または引張強さ 1.04 kN 以上の容易に腐食し難い金属線）',
  B: '直径 4 mm 以上の軟銅線（または引張強さ 2.46 kN 以上の容易に腐食し難い金属線）。高圧電路、または第108条に規定する特別高圧架空電線路の電路と低圧電路とを結合する変圧器の場合は、直径 2.6 mm 以上の軟銅線（または引張強さ 1.04 kN 以上の容易に腐食し難い金属線）',
  C: '直径 1.6 mm 以上の軟銅線（または引張強さ 0.39 kN 以上の容易に腐食し難い金属線）',
  D: '直径 1.6 mm 以上の軟銅線（または引張強さ 0.39 kN 以上の容易に腐食し難い金属線）',
};

const isKind = (...k: string[]) => (v: RawValues) => k.includes(v.kind);

export const groundingResistance: ToolDef = {
  id: 'EL-11',
  slug: 'grounding-resistance',
  category: 'electrical',
  title: '接地抵抗の基準値と判定',
  summary: 'A種〜D種の接地工事の接地抵抗の基準値を求め、測定値を判定します。接地線の最小太さも示します。',
  keywords: ['接地', 'アース', '接地抵抗', 'A種', 'B種', 'C種', 'D種', '1線地絡電流', '150/Ig', '接地線', '電技解釈', '17条'],
  references: [
    '電気設備の技術基準の解釈 第17条（接地工事の種類及び施設方法。17-1表・17-3表）',
    '電気設備の技術基準の解釈 第24条第1項第二号（B種接地工事の接地抵抗値は 5Ω未満であることを要しない）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'kind',
      label: '接地工事の種類',
      display: 'segmented',
      options: [
        { value: 'A', label: 'A種' },
        { value: 'B', label: 'B種' },
        { value: 'C', label: 'C種' },
        { value: 'D', label: 'D種' },
      ],
      help: 'A種：高圧・特別高圧の機器の外箱など。B種：高圧と低圧を結合する変圧器の低圧側の中性点など。C種：300V を超える低圧の機器の外箱など。D種：300V 以下の低圧の機器の外箱など。',
    },
    {
      type: 'number',
      key: 'Ig',
      label: '変圧器の高圧側（特別高圧側）の電路の1線地絡電流 Ig',
      unit: 'A',
      min: 0,
      exclusiveMin: true,
      help: '一般に電力会社から示される値を使います。',
      visible: isKind('B'),
    },
    {
      type: 'select',
      key: 'cut',
      label: '高圧側（特別高圧側）の電路の自動遮断',
      options: Object.entries(B_CUT).map(([value, c]) => ({ value, label: `${c.label}（${c.K} ÷ Ig）` })),
      help: '高圧または 35,000V 以下の特別高圧の電路と低圧電路を結合する変圧器で、混触により低圧電路の対地電圧が 150V を超えた場合に、高圧・特別高圧の電路を自動的に遮断する装置を設けるときに限ります（第17条の 17-1表）。それ以外は 150 ÷ Ig です。',
      visible: isKind('B'),
    },
    {
      type: 'select',
      key: 'leak',
      label: '地絡時に 0.5 秒以内に自動遮断する装置（漏電遮断器など）',
      display: 'segmented',
      options: [
        { value: 'no', label: 'なし' },
        { value: 'yes', label: 'あり（500Ω以下）' },
      ],
      visible: isKind('C', 'D'),
    },
    { type: 'number', key: 'Rm', label: '接地抵抗の測定値', unit: 'Ω', min: 0 },
  ],
  defaults: { kind: 'B', Ig: '10', cut: 'none', leak: 'no', Rm: '12' },
  notes: [
    '基準値と接地線の太さは電気設備の技術基準の解釈 第17条によります（令和7年11月20日改正の解釈で確認）。',
    'B種の 1線地絡電流 Ig は、電力会社から示される値か、電技解釈 第17条の計算式で求めた値を使います。本ツールでは計算しません。',
    'B種の接地抵抗値は、第17条の計算値にかかわらず 5Ω未満であることを要しません（電技解釈 第24条第1項第二号）。計算値が 5Ω未満の場合は注意を表示します。また、特別高圧電路と低圧電路を結合する変圧器で計算値が 10 を超える場合は、一部の例外を除き 10Ω以下とします（同第三号）。本ツールはこの扱いを判定しません。',
    '移動して使用する電気機械器具の接地線、C種・D種の接地工事を省略・緩和できる場合などには別の定めがあります。',
    '接地抵抗は季節（土の乾湿・凍結）で変わります。乾燥した時期の測定値で余裕を確認してください。',
  ],
  doc: el11Doc,
  beginner: el11Beginner,
  build(v) {
    const kind = str(v, 'kind');
    const Rm = num(v, 'Rm');
    const s = new SheetBuilder();
    s.section('入力値').input('kind', '接地工事の種類', KIND_LABEL[kind]);

    let Rs: number;
    if (kind === 'B') {
      const cut = B_CUT[str(v, 'cut')] ?? B_CUT.none;
      const Ig = num(v, 'Ig');
      Rs = cut.K / Ig;
      s.input('K', '自動遮断による係数', cut.K, { symbol: 'K', unit: 'V', note: `${cut.label}（第17条の 17-1表）` })
        .input('Ig', '1線地絡電流', Ig, { symbol: 'Ig', unit: 'A', note: '変圧器の高圧側（特別高圧側）の電路' })
        .section('基準値')
        .calc('Rs', '接地抵抗の基準値', { symbol: 'Rs', unit: 'Ω', value: Rs, expr: '{K} ÷ {Ig}', formula: '{K}/{Ig}', digits: 2 });
    } else {
      const leak = str(v, 'leak') === 'yes';
      Rs = kind === 'A' ? 10 : leak ? 500 : kind === 'C' ? 10 : 100;
      const note = kind === 'A' ? '第17条' : leak ? '0.5秒以内に自動遮断する装置あり（第17条）' : '第17条';
      s.section('基準値').input('Rs', '接地抵抗の基準値', Rs, { symbol: 'Rs', unit: 'Ω', note });
    }

    s.section('判定')
      .input('Rm', '接地抵抗の測定値', Rm, { symbol: 'Rm', unit: 'Ω', digits: 2 })
      .judge('ok', '判定', Rm <= Rs, { expr: '{Rm} ≤ {Rs}', formula: 'IF({Rm}<={Rs},"OK","NG")' })
      .section('接地線')
      .input('wire', '接地線の最小太さ', WIRE_TEXT[kind], { note: '第17条' })
      .highlight('Rs', 'ok', 'wire');

    if (kind === 'B' && Rs < 5) s.warn('計算値が 5Ω未満です。B種接地工事の接地抵抗値は 5Ω未満であることを要しません（電技解釈 第24条第1項第二号）。本ツールの判定は計算値のまま行っています。');
    if (Rm > Rs) s.warn('測定値が基準値を超えています。接地極の追加・深打ち、接地抵抗低減材の使用などを検討してください。');
    return s.result();
  },
};
