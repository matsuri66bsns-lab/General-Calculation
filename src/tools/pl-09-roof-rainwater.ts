import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { pl09Beginner, pl09Doc } from './docs/pl-09';

const RAIN_SIZES = [50, 65, 75, 100, 125, 150, 200] as const;
const PART_LABEL: Record<string, string> = { stack: '雨水立て管', horiz: '雨水横管' };

export const roofRainwater: ToolDef = {
  id: 'PL-09',
  slug: 'roof-rainwater',
  category: 'plumbing',
  title: '屋根雨水の排水量と管径',
  summary: '屋根面積と降雨強度から雨水流量を求め、選んだ雨水管の許容最大屋根面積と比べて判定します。',
  keywords: ['雨水', '屋根排水', '雨水立て管', 'ルーフドレン', '降雨強度', '許容最大屋根面積', '雨水流量', 'SHASE-S 206'],
  references: [
    'SHASE-S 206「給排水衛生設備規準・同解説」（雨水排水管の管径、許容最大屋根面積（降雨強度 100 mm/h 基準）、壁面の雨水の扱い）',
    '国土交通省大臣官房官庁営繕部 監修「建築設備設計基準」（雨水排水）',
    '気象庁 各地点の観測値（最大1時間降水量）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    { type: 'number', key: 'A', label: '屋根の水平投影面積', unit: 'm²', min: 0, exclusiveMin: true },
    {
      type: 'number',
      key: 'Aw',
      label: '屋根に雨水が流れ込む壁面の面積',
      unit: 'm²',
      min: 0,
      help: '屋根より高い壁（塔屋・パラペットの立ち上がりなど）に吹き付けた雨が屋根に流れ込む場合に入力します。ない場合は 0 にします。',
    },
    {
      type: 'number',
      key: 'beta',
      label: '壁面積を加算する割合',
      unit: '%',
      min: 0,
      max: 100,
      help: '壁面積の 50 % を屋根面積に加算する扱いが一般的です。採用する割合は SHASE-S 206 などの原文で確認してください。',
      suggestions: [{ label: '50%', value: 50 }],
    },
    {
      type: 'number',
      key: 'r',
      label: '最大降雨強度',
      unit: 'mm/h',
      min: 0,
      exclusiveMin: true,
      help: 'その地域の最大1時間降水量などをもとに、設計で採用する値を入力します。',
      suggestions: [
        { label: '100 mm/h', value: 100 },
        { label: '120 mm/h', value: 120 },
        { label: '150 mm/h', value: 150 },
      ],
    },
    { type: 'number', key: 'N', label: '雨水管の本数（同じ管径で均等に分担）', unit: '本', min: 1 },
    {
      type: 'select',
      key: 'part',
      label: '管の部位',
      display: 'segmented',
      options: [
        { value: 'stack', label: '雨水立て管' },
        { value: 'horiz', label: '雨水横管' },
      ],
    },
    {
      type: 'select',
      key: 'D',
      label: '選んだ管径（呼び径）',
      options: RAIN_SIZES.map((d) => ({ value: String(d), label: `${d} mm` })),
    },
    {
      type: 'number',
      key: 'Aal',
      label: '選んだ管径の許容最大屋根面積（100 mm/h 基準）',
      unit: 'm²',
      min: 0,
      exclusiveMin: true,
      help: 'SHASE-S 206 の表から、部位・管径（横管は勾配も）に応じた値を入力します。',
    },
  ],
  defaults: { A: '500', Aw: '100', beta: '50', r: '120', N: '2', part: 'stack', D: '100', Aal: '425' },
  notes: [
    '雨水流量 Q = r × A ÷ 3600 は、降った雨がすべて流れ出るとした値です（mm × m² = L）。',
    '許容最大屋根面積の表は降雨強度 100 mm/h を基準にしているため、屋根面積を A′ = A × r ÷ 100 に換算して比べます。',
    '許容最大屋根面積・壁面の加算割合は SHASE-S 206 の原文で確認してください。本ツールは表を内蔵していません。',
    '雨水管は汚水・雑排水の管と別系統にするのが原則です。合流させる場合は SHASE-S 206 の方法で負荷を換算してください。',
  ],
  doc: pl09Doc,
  beginner: pl09Beginner,
  build(v) {
    const A = num(v, 'A');
    const Aw = num(v, 'Aw');
    const beta = num(v, 'beta');
    const r = num(v, 'r');
    const N = num(v, 'N');
    const part = str(v, 'part');
    const D = Number(str(v, 'D'));
    const Aal = num(v, 'Aal');
    const At = A + (Aw * beta) / 100;
    const Q = (r * At) / 3600;
    const Ae = (At * r) / 100;
    const Ae1 = Ae / N;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('A', '屋根の水平投影面積', A, { symbol: 'A', unit: 'm²', digits: 1 })
      .input('Aw', '流れ込む壁面の面積', Aw, { symbol: 'Aw', unit: 'm²', digits: 1 })
      .input('beta', '壁面積を加算する割合', beta, { symbol: 'β', unit: '%' })
      .input('r', '最大降雨強度', r, { symbol: 'r', unit: 'mm/h' })
      .input('N', '雨水管の本数', N, { symbol: 'N', unit: '本', digits: 0 })
      .section('雨水流量')
      .calc('At', '集水面積', { symbol: 'At', unit: 'm²', value: At, expr: '{A} + {Aw} × {beta} ÷ 100', formula: '{A}+{Aw}*{beta}/100', digits: 1 })
      .calc('Q', '雨水流量', { symbol: 'Q', unit: 'L/s', value: Q, expr: '{r} × {At} ÷ 3600', formula: '{r}*{At}/3600', digits: 2 })
      .calc('Qm', '雨水流量（毎分）', { symbol: 'Q′', unit: 'L/min', value: Q * 60, expr: '{Q} × 60', formula: '{Q}*60', digits: 0 })
      .section('管径の確認')
      .calc('Ae', '降雨強度 100 mm/h 換算の屋根面積', { symbol: 'A′', unit: 'm²', value: Ae, expr: '{At} × {r} ÷ 100', formula: '{At}*{r}/100', digits: 1 })
      .calc('Ae1', '1本当たりの換算屋根面積', { symbol: 'A′₁', unit: 'm²', value: Ae1, expr: '{Ae} ÷ {N}', formula: '{Ae}/{N}', digits: 1 })
      .input('part', '管の部位', PART_LABEL[part])
      .input('D', '選んだ管径', D, { symbol: 'D', unit: 'mm' })
      .input('Aal', '許容最大屋根面積', Aal, { symbol: 'Aa', unit: 'm²', note: `SHASE-S 206 の表（${PART_LABEL[part]}・${D} mm、100 mm/h 基準）の値` })
      .judge('ok', '判定', Ae1 <= Aal, { expr: '{Ae1} ≤ {Aal}', formula: 'IF({Ae1}<={Aal},"OK","NG")' })
      .highlight('Q', 'Ae1', 'ok');
    if (Ae1 > Aal) s.warn('換算屋根面積が許容最大屋根面積を超えています。管径を上げるか、雨水管の本数を増やしてください。');
    return s.result();
  },
};
