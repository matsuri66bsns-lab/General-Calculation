import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { el03Beginner, el03Doc } from './docs/el-03';

/**
 * 絶縁電線（軟銅線）の基準の許容電流（周囲温度30℃以下）。電気設備の技術基準の解釈 第146条第2項の表。
 * 単線 1.6〜8 mm² は複数の解説資料、14〜325 mm² は電線メーカーの技術資料（内線規程・JCS 0168 による表）と照合した値。
 */
export const WIRES: { value: string; label: string; short: string; I0: number }[] = [
  { value: 's1.6', label: '単線 直径 1.6 mm（27 A）', short: '直径 1.6 mm', I0: 27 },
  { value: 's2.0', label: '単線 直径 2.0 mm（35 A）', short: '直径 2.0 mm', I0: 35 },
  { value: 's2.6', label: '単線 直径 2.6 mm（48 A）', short: '直径 2.6 mm', I0: 48 },
  { value: 's3.2', label: '単線 直径 3.2 mm（62 A）', short: '直径 3.2 mm', I0: 62 },
  { value: 'y2', label: 'より線 2 mm²（27 A）', short: '2 mm²', I0: 27 },
  { value: 'y3.5', label: 'より線 3.5 mm²（37 A）', short: '3.5 mm²', I0: 37 },
  { value: 'y5.5', label: 'より線 5.5 mm²（49 A）', short: '5.5 mm²', I0: 49 },
  { value: 'y8', label: 'より線 8 mm²（61 A）', short: '8 mm²', I0: 61 },
  { value: 'y14', label: 'より線 14 mm²（88 A）', short: '14 mm²', I0: 88 },
  { value: 'y22', label: 'より線 22 mm²（115 A）', short: '22 mm²', I0: 115 },
  { value: 'y38', label: 'より線 38 mm²（162 A）', short: '38 mm²', I0: 162 },
  { value: 'y60', label: 'より線 60 mm²（217 A）', short: '60 mm²', I0: 217 },
  { value: 'y100', label: 'より線 100 mm²（298 A）', short: '100 mm²', I0: 298 },
  { value: 'y150', label: 'より線 150 mm²（395 A）', short: '150 mm²', I0: 395 },
  { value: 'y200', label: 'より線 200 mm²（469 A）', short: '200 mm²', I0: 469 },
  { value: 'y250', label: 'より線 250 mm²（556 A）', short: '250 mm²', I0: 556 },
  { value: 'y325', label: 'より線 325 mm²（650 A）', short: '325 mm²', I0: 650 },
];

export function findWire(value: string) {
  const w = WIRES.find((x) => x.value === value);
  if (!w) throw new CalcError('電線の太さを選び直してください。');
  return w;
}

/** 絶縁体の材料と許容最高温度（第146条第2項の許容電流補正係数の式に使う値） */
const INSULATIONS: Record<string, string> = {
  '60': 'ビニル混合物（耐熱性を有するものを除く）・天然ゴム混合物',
  '75': 'ビニル混合物（耐熱性を有するもの）・ポリエチレン混合物（架橋したものを除く）・スチレンブタジエンゴム混合物',
  '80': 'エチレンプロピレンゴム混合物',
  custom: 'その他（許容最高温度を入力）',
};

/** 同一管内の電線数による電流減少係数（第146条第2項） */
const CONDUITS: Record<string, { label: string; k2: number }> = {
  none: { label: '管などに収めない（がいし引き配線など）', k2: 1 },
  '3': { label: '3本以下', k2: 0.7 },
  '4': { label: '4本', k2: 0.63 },
  '6': { label: '5本または6本', k2: 0.56 },
  '15': { label: '7本以上15本以下', k2: 0.49 },
  '40': { label: '16本以上40本以下', k2: 0.43 },
  '60': { label: '41本以上60本以下', k2: 0.39 },
  '61': { label: '61本以上', k2: 0.34 },
};

export const allowableCurrent: ToolDef = {
  id: 'EL-03',
  slug: 'allowable-current',
  category: 'electrical',
  title: '絶縁電線の許容電流',
  summary: '電線の太さ・絶縁物・周囲温度・同一管内の本数から許容電流を求め、設計電流と比べて判定します。',
  keywords: ['許容電流', '電流減少係数', '許容電流補正係数', '周囲温度', 'IV', 'HIV', '絶縁電線', '電線管', '電技解釈', '146条'],
  references: [
    '電気設備の技術基準の解釈 第146条第2項（低圧配線に使用する絶縁電線の許容電流、許容電流補正係数、電流減少係数）',
    '内線規程 JEAC 8001（許容電流の表と端数処理）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    { type: 'select', key: 'w', label: '電線の太さ（軟銅線、括弧内は基準の許容電流）', options: WIRES.map((w) => ({ value: w.value, label: w.label })) },
    {
      type: 'select',
      key: 'ins',
      label: '絶縁体の材料（許容最高温度）',
      options: [
        { value: '60', label: 'ビニル（IV など）・天然ゴム 60℃' },
        { value: '75', label: '耐熱ビニル（HIV など）・ポリエチレン（架橋を除く）・スチレンブタジエンゴム 75℃' },
        { value: '80', label: 'エチレンプロピレンゴム 80℃' },
        { value: 'custom', label: 'その他（許容最高温度を入力）' },
      ],
      help: '架橋ポリエチレン、ふっ素樹脂、けい素ゴムなどは「その他」を選び、電気設備の技術基準の解釈の原文で許容最高温度を確認して入力してください。',
    },
    {
      type: 'number',
      key: 'Tm',
      label: '絶縁体の許容最高温度',
      unit: '℃',
      min: 30,
      exclusiveMin: true,
      visible: (v: RawValues) => v.ins === 'custom',
    },
    {
      type: 'number',
      key: 'Ta',
      label: '周囲温度',
      unit: '℃',
      help: '30℃以下の場合は 30℃として補正係数を計算します（第146条の表の備考）。',
      suggestions: [
        { label: '30℃', value: 30 },
        { label: '35℃', value: 35 },
        { label: '40℃', value: 40 },
        { label: '45℃', value: 45 },
      ],
    },
    {
      type: 'select',
      key: 'n',
      label: '同一管内の電線数（電線管・線ぴに収める場合）',
      options: Object.entries(CONDUITS).map(([value, c]) => ({ value, label: `${c.label}（${c.k2.toFixed(2)}）` })),
      help: '中性線、接地線、制御回路用の電線は本数に数えません。',
    },
    { type: 'number', key: 'Id', label: '設計電流（負荷電流）', unit: 'A', min: 0, exclusiveMin: true },
  ],
  defaults: { w: 's2.0', ins: '60', Tm: '60', Ta: '30', n: '3', Id: '20' },
  notes: [
    '基準の許容電流・許容電流補正係数・電流減少係数は電気設備の技術基準の解釈 第146条の表によります。本サイトでは複数の資料で照らし合わせた値を内蔵していますが、設計では電気設備の技術基準の解釈の原文で確認してください。',
    '電流減少係数は、電線を合成樹脂管・金属管・金属可とう電線管・線ぴなどに収める場合に掛けます。がいし引き配線などで管に収めない場合は掛けません。',
    'この表は絶縁電線用です。VVF・CV などのケーブルの許容電流は、内線規程や JCS 0168 などケーブルの表で確認してください。',
    '内線規程では、計算した許容電流の小数点以下1位を7捨8入して整数にします（電気設備の技術基準の解釈には端数処理の定めはありません）。本ツールは端数処理をしていません。',
    '許容電流のほか、電圧降下（EL-01）、過電流遮断器との組合せ（EL-04、EL-05）も確認してください。',
  ],
  doc: el03Doc,
  beginner: el03Beginner,
  build(v) {
    const wire = findWire(str(v, 'w'));
    const ins = str(v, 'ins');
    const Tm = ins === 'custom' ? num(v, 'Tm') : Number(ins);
    const Ta = num(v, 'Ta');
    const cond = CONDUITS[str(v, 'n')];
    const Id = num(v, 'Id');
    if (!cond) throw new CalcError('同一管内の電線数を選び直してください。');

    const Tc = Math.max(Ta, 30);
    if (Tc >= Tm) throw new CalcError('周囲温度が絶縁体の許容最高温度以上です。周囲温度を下げるか、許容最高温度の高い電線を選んでください。');
    const k1 = Math.sqrt((Tm - Tc) / 30);
    const k2 = cond.k2;
    const Ia = wire.I0 * k1 * k2;

    const s = new SheetBuilder();
    s.section('入力値')
      .input('wire', '電線の太さ', wire.short, { note: '軟銅線' })
      .input('I0', '基準の許容電流', wire.I0, { symbol: 'I₀', unit: 'A', note: '第146条の表（周囲温度30℃以下）' })
      .input('Tm', '絶縁体の許容最高温度', Tm, { symbol: 'θm', unit: '℃', note: INSULATIONS[ins] })
      .input('Ta', '周囲温度', Ta, { symbol: 'θ', unit: '℃' })
      .input('k2', '電流減少係数', k2, {
        symbol: 'k₂',
        digits: 2,
        note: str(v, 'n') === 'none' ? '管などに収めないので係数を掛けない（1.00）' : `同一管内の電線数 ${cond.label}（第146条の表）`,
      })
      .input('Id', '設計電流', Id, { symbol: 'Id', unit: 'A' })
      .section('許容電流')
      .calc('Tc', '補正に用いる周囲温度', {
        symbol: 'θ′',
        unit: '℃',
        value: Tc,
        expr: 'max({Ta}, 30)',
        formula: 'MAX({Ta},30)',
        note: '30℃以下は 30℃とする',
      })
      .calc('k1', '許容電流補正係数', {
        symbol: 'k₁',
        value: k1,
        expr: '√(({Tm} − {Tc}) ÷ 30)',
        formula: 'SQRT(({Tm}-{Tc})/30)',
        digits: 3,
      })
      .calc('Ia', '許容電流', { symbol: 'Ia', unit: 'A', value: Ia, expr: '{I0} × {k1} × {k2}', formula: '{I0}*{k1}*{k2}', digits: 1 })
      .judge('ok', '判定', Id <= Ia, { expr: '{Id} ≤ {Ia}', formula: 'IF({Id}<={Ia},"OK","NG")' })
      .highlight('Ia', 'k1', 'ok');

    if (Id > Ia) s.warn('設計電流が許容電流を超えています。電線を太くするか、同一管内の本数を減らしてください。');
    return s.result();
  },
};
