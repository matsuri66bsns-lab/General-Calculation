import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { K2_KIJUN_HELP, QP_METHOD_LABEL, pl01Beginner, pl01Doc } from './docs/pl-01';

const isQp = (m: string) => (v: RawValues) => (v.qpm ?? 'binran') === m;

const USE_LABEL: Record<string, string> = {
  custom: '任意入力',
  house: '戸建住宅',
  apartment: '集合住宅',
  office: '事務所',
  factory: '工場',
  school: '学校',
  hotel: 'ホテル客室',
};

export const waterTank: ToolDef = {
  id: 'PL-01',
  slug: 'water-tank',
  category: 'plumbing',
  title: '受水槽・高置水槽容量',
  summary: '使用人員と単位給水量から1日使用水量を求め、受水槽・高置水槽の有効容量と揚水ポンプ吐出量を算定します。',
  keywords: ['受水槽', '高置水槽', '給水量', '1日使用水量', '時間最大', '瞬時最大', '揚水ポンプ', '水槽容量'],
  references: [
    '空気調和・衛生工学便覧（建物種類別単位給水量・使用時間）',
    '公共建築設備工事標準図・建築設備設計基準（国土交通省）',
    '建築設備設計基準 令和6年版（国土交通省大臣官房官庁営繕部）第5編 第2章 給水設備 第2節 給水量の算定・第3節 タンク・第4節 揚水用ポンプ',
    '建築設備設計計算書作成の手引（公共建築協会）様式 機-101（計算項目の参考）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'use',
      label: '建物用途（単位給水量・使用時間の目安）',
      options: [
        { value: 'custom', label: '任意入力' },
        { value: 'house', label: '戸建住宅（200〜400 L/人・日、10h）', apply: { q: '300', T: '10' } },
        { value: 'apartment', label: '集合住宅（200〜350 L/人・日、15h）', apply: { q: '250', T: '15' } },
        { value: 'office', label: '事務所（60〜100 L/人・日、9h）', apply: { q: '100', T: '9' } },
        { value: 'factory', label: '工場（60〜100 L/人・日、操業時間+1h）', apply: { q: '100', T: '9' } },
        { value: 'school', label: '学校（70〜100 L/人・日、9h）', apply: { q: '80', T: '9' } },
        { value: 'hotel', label: 'ホテル客室（350〜450 L/床・日、12h）', apply: { q: '400', T: '12' } },
      ],
      help: '便覧の範囲値に対する代表値です。案件の設計基準に合わせて単位給水量を調整してください。',
    },
    { type: 'number', key: 'N', label: '使用人員（ホテルは床数）', unit: '人', min: 0, exclusiveMin: true },
    { type: 'number', key: 'q', label: '1人1日当たり単位給水量', unit: 'L/(人·日)', min: 0, exclusiveMin: true },
    { type: 'number', key: 'T', label: '1日平均使用時間', unit: 'h', min: 0, exclusiveMin: true, max: 24 },
    {
      type: 'number',
      key: 'k1',
      label: '時間最大係数',
      min: 1,
      help: '時間最大予想給水量 = 係数 × 時間平均予想給水量（一般に 1.5〜2.0）',
      suggestions: [
        { label: '1.5', value: 1.5 },
        { label: '2.0', value: 2 },
      ],
    },
    {
      type: 'select',
      key: 'qpm',
      label: '瞬時最大予想給水量の求め方',
      display: 'segmented',
      options: [
        { value: 'binran', label: QP_METHOD_LABEL.binran },
        { value: 'kijun', label: QP_METHOD_LABEL.kijun },
      ],
      help: '便覧の方式は時間平均予想給水量に、設計基準の方式は時間最大予想給水量に係数を掛けます。係数の大きさが違うので、方式に合った値を入力してください。',
    },
    {
      type: 'number',
      key: 'k2',
      label: '瞬時最大係数 k₂（時間平均に対して）',
      min: 1,
      help: '瞬時最大予想給水量 = k₂ × 時間平均予想給水量 ÷ 60。空気調和・衛生工学便覧では一般に 3〜4 です。',
      suggestions: [
        { label: '3', value: 3 },
        { label: '4', value: 4 },
      ],
      visible: isQp('binran'),
    },
    {
      type: 'number',
      key: 'k2m',
      label: '瞬時最大使用係数 K₂（時間最大に対して）',
      min: 1,
      help: K2_KIJUN_HELP,
      suggestions: [
        { label: '目安 1.5', value: 1.5 },
        { label: '目安 2.0', value: 2 },
      ],
      visible: isQp('kijun'),
    },
    {
      type: 'number',
      key: 'rs',
      label: '受水槽容量の比率（1日使用水量に対して）',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '一般に 1日使用水量の 4/10〜6/10',
      suggestions: [
        { label: '0.4', value: 0.4 },
        { label: '0.5', value: 0.5 },
        { label: '0.6', value: 0.6 },
      ],
    },
    {
      type: 'number',
      key: 'te',
      label: '高置水槽の貯留時間（時間最大給水量に対して）',
      unit: 'h',
      min: 0,
      exclusiveMin: true,
      help: '一般に 時間最大予想給水量の 0.5〜1.0 時間分',
      suggestions: [
        { label: '0.5h', value: 0.5 },
        { label: '1.0h', value: 1 },
      ],
    },
  ],
  defaults: { use: 'office', N: '200', q: '100', T: '9', k1: '2', qpm: 'binran', k2: '4', k2m: '2', rs: '0.5', te: '0.5' },
  notes: [
    '受水槽は「1日使用水量 × 比率」、高置水槽は「時間最大予想給水量 × 貯留時間」で有効容量を求めます。',
    '揚水ポンプ吐出量は時間最大予想給水量を基準にしています（建築設備設計基準 第5編 第2章 第4節）。',
    '瞬時最大予想給水量は、時間平均に係数を掛ける便覧の方式と、時間最大に係数を掛ける建築設備設計基準（計算書作成の手引 様式 機-101）の方式から選べます。設計基準の方式の係数 K₂ の候補は目安です。設計基準の原文で確認してください。',
    '水槽の実容量は、有効容量に加えて満水面〜天井、底部の死水分を見込んで選定してください。',
  ],
  doc: pl01Doc,
  beginner: pl01Beginner,
  build(v) {
    const N = num(v, 'N');
    const q = num(v, 'q');
    const T = num(v, 'T');
    const k1 = num(v, 'k1');
    const kijun = str(v, 'qpm') === 'kijun';
    const qpm = kijun ? 'kijun' : 'binran';
    const rs = num(v, 'rs');
    const te = num(v, 'te');

    const Qd = (N * q) / 1000;
    const Qh = Qd / T;
    const Qm = k1 * Qh;
    const k2 = num(v, kijun ? 'k2m' : 'k2');
    const Qp = ((kijun ? k2 * Qm : k2 * Qh) * 1000) / 60;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('use', '建物用途', USE_LABEL[str(v, 'use')])
      .input('N', '使用人員', N, { symbol: 'N', unit: '人', digits: 0 })
      .input('q', '単位給水量', q, { symbol: 'q', unit: 'L/(人·日)' })
      .input('T', '1日平均使用時間', T, { symbol: 'T', unit: 'h' })
      .input('k1', '時間最大係数', k1, { symbol: 'k₁' })
      .input('qpm', '瞬時最大予想給水量の求め方', QP_METHOD_LABEL[qpm]);
    if (kijun) s.input('k2m', '瞬時最大使用係数', k2, { symbol: 'K₂', note: '時間最大予想給水量に対する係数。値は設計基準の原文で確認' });
    else s.input('k2', '瞬時最大係数', k2, { symbol: 'k₂', note: '時間平均予想給水量に対する係数' });
    s.input('rs', '受水槽容量の比率', rs, { symbol: 'r', digits: 2 })
      .input('te', '高置水槽の貯留時間', te, { symbol: 't', unit: 'h', digits: 2 })
      .section('予想給水量')
      .calc('Qd', '1日使用水量', { symbol: 'Qd', unit: 'm³/日', value: Qd, expr: '{N} × {q} ÷ 1000', formula: '{N}*{q}/1000', digits: 2 })
      .calc('Qh', '時間平均予想給水量', { symbol: 'Qh', unit: 'm³/h', value: Qh, expr: '{Qd} ÷ {T}', formula: '{Qd}/{T}', digits: 2 })
      .calc('Qm', '時間最大予想給水量', { symbol: 'Qm', unit: 'm³/h', value: Qm, expr: '{k1} × {Qh}', formula: '{k1}*{Qh}', digits: 2 })
      .calc('Qp', '瞬時最大予想給水量', {
        symbol: 'Qp',
        unit: 'L/min',
        value: Qp,
        expr: kijun ? '{k2m} × {Qm} × 1000 ÷ 60' : '{k2} × {Qh} × 1000 ÷ 60',
        formula: kijun ? '{k2m}*{Qm}*1000/60' : '{k2}*{Qh}*1000/60',
        digits: 0,
        note: kijun ? '建築設備設計基準の方式（時間最大 × K₂）' : '空気調和・衛生工学便覧の方式（時間平均 × k₂）',
      })
      .section('水槽・ポンプ')
      .calc('Vs', '受水槽 有効容量', { symbol: 'Vs', unit: 'm³', value: Qd * rs, expr: '{Qd} × {rs}', formula: '{Qd}*{rs}', digits: 2 })
      .calc('Ve', '高置水槽 有効容量', { symbol: 'Ve', unit: 'm³', value: Qm * te, expr: '{Qm} × {te}', formula: '{Qm}*{te}', digits: 2 })
      .calc('Qpu', '揚水ポンプ吐出量', {
        symbol: 'Qpu',
        unit: 'L/min',
        value: (Qm * 1000) / 60,
        expr: '{Qm} × 1000 ÷ 60',
        formula: '{Qm}*1000/60',
        digits: 0,
      })
      .highlight('Qd', 'Vs', 'Ve', 'Qpu');
    return s.result();
  },
};
