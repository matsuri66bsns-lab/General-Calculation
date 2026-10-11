import type { NumberField, RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { hv05Beginner, hv05Doc } from './docs/hv-05';
import { dewPoint, dewPointFormula, pwsFormula, pwsTetens } from './hv-04-psychrometrics';

/** 層の数 */
export const LAYERS = [1, 2, 3, 4, 5] as const;

/**
 * 部位ごとの表面熱伝達抵抗 [m²K/W]。
 * 出典：国立研究開発法人建築研究所「平成28年省エネルギー基準に準拠したエネルギー消費性能の評価に関する技術情報（住宅）」
 * 第三章 第三節 熱貫流率及び線熱貫流率 付録A 表3.1 表面熱伝達抵抗（Ver.27, 2026.10 で確認）
 */
const PARTS: Record<string, { label: string; Rsi?: number; Rse?: number }> = {
  wall: { label: '外壁（外気に直接接する）', Rsi: 0.11, Rse: 0.04 },
  wall_v: { label: '外壁（通気層等に接する）', Rsi: 0.11, Rse: 0.11 },
  roof: { label: '屋根（外気に直接接する）', Rsi: 0.09, Rse: 0.04 },
  roof_v: { label: '屋根（通気層等に接する）', Rsi: 0.09, Rse: 0.09 },
  ceiling: { label: '天井（小屋裏等に接する）', Rsi: 0.09, Rse: 0.09 },
  floor: { label: '床（外気に直接接する）', Rsi: 0.15, Rse: 0.04 },
  floor_u: { label: '床（床裏等に接する）', Rsi: 0.15, Rse: 0.15 },
  custom: { label: '任意入力' },
};

const LAMBDA_SUGGESTIONS = [
  { label: 'コンクリート 1.6', value: 1.6 },
  { label: 'モルタル 1.5', value: 1.5 },
  { label: '押出法PSF 3種 0.028', value: 0.028 },
  { label: '高性能GW 16K 0.038', value: 0.038 },
  { label: '合板 0.16', value: 0.16 },
  { label: '天然木材 0.12', value: 0.12 },
];

const layerFields = LAYERS.flatMap((i): NumberField[] => [
  {
    type: 'number',
    key: `d${i}`,
    label: `第${i}層 厚さ`,
    unit: 'mm',
    min: 0,
    help: i === 1 ? '使わない層は 0 にします。層の順番は熱貫流率に影響しません。' : undefined,
  },
  {
    type: 'number',
    key: `l${i}`,
    label: `第${i}層 熱伝導率`,
    unit: 'W/(m·K)',
    min: 0,
    exclusiveMin: true,
    visible: (v: RawValues) => Number(v[`d${i}`]) > 0,
    help: i === 1 ? '候補は建築研究所「外皮性能の計算方法」付録A 表1 の値です。製品の値（JIS 表示品の値など）があればそれを使ってください。' : undefined,
    suggestions: LAMBDA_SUGGESTIONS,
  },
]);

export const uValueCondensation: ToolDef = {
  id: 'HV-05',
  slug: 'u-value-condensation',
  category: 'hvac',
  title: '熱貫流率と表面結露の判定',
  summary: '壁・屋根・床の層構成から熱貫流率を求め、室内側表面温度と露点を比べて表面結露を判定します。',
  keywords: ['熱貫流率', 'U値', 'K値', '熱抵抗', '熱伝導率', '表面熱伝達抵抗', '表面結露', '露点', '断熱', 'JIS A 2101'],
  references: [
    'JIS A 2101 建築構成要素及び建築部位－熱抵抗及び熱貫流率－計算方法',
    '国立研究開発法人建築研究所「平成28年省エネルギー基準に準拠したエネルギー消費性能の評価に関する技術情報（住宅）」第三章 第三節 熱貫流率及び線熱貫流率 5.1.4 式(4)(5)、付録A 表1（建材等の熱物性値）・表3.1（表面熱伝達抵抗）・表4（空気層の熱抵抗）',
    '空気調和・衛生工学便覧（表面結露の判定）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'part',
      label: '部位（表面熱伝達抵抗の既定値）',
      options: Object.entries(PARTS).map(([value, p]) => ({
        value,
        label: p.Rsi === undefined ? p.label : `${p.label} Rsi=${p.Rsi}・Rse=${p.Rse}`,
        apply: p.Rsi === undefined ? undefined : { Rsi: String(p.Rsi), Rse: String(p.Rse) },
      })),
      help: '建築研究所「外皮性能の計算方法」付録A 表3.1 の値が入ります。界壁・界床や非住宅で別の値を使う場合は「任意入力」を選んでください。',
    },
    { type: 'number', key: 'Rsi', label: '室内側表面熱伝達抵抗 Rsi', unit: 'm²·K/W', min: 0, exclusiveMin: true },
    { type: 'number', key: 'Rse', label: '外気側表面熱伝達抵抗 Rse', unit: 'm²·K/W', min: 0 },
    ...layerFields,
    {
      type: 'number',
      key: 'Ra',
      label: '中空層（空気層）の熱抵抗 Ra',
      unit: 'm²·K/W',
      min: 0,
      help: '中空層がなければ 0。他の空間と連通している空気層も 0 とします（建築研究所 付録A 表4）。',
      suggestions: [
        { label: 'なし 0', value: 0 },
        { label: '面材で密閉 0.09', value: 0.09 },
      ],
    },
    { type: 'number', key: 'ti', label: '室温', unit: '°C', min: -30, max: 50, suggestions: [{ label: '20', value: 20 }, { label: '22', value: 22 }] },
    { type: 'number', key: 'to', label: '外気温（床裏・小屋裏などはその温度）', unit: '°C', min: -40, max: 50 },
    {
      type: 'number',
      key: 'phii',
      label: '室内相対湿度',
      unit: '%',
      min: 0,
      exclusiveMin: true,
      max: 100,
      suggestions: [
        { label: '40%', value: 40 },
        { label: '50%', value: 50 },
        { label: '60%', value: 60 },
      ],
    },
  ],
  defaults: {
    part: 'wall',
    Rsi: '0.11',
    Rse: '0.04',
    d1: '20',
    l1: '1.5',
    d2: '150',
    l2: '1.6',
    d3: '25',
    l3: '0.028',
    d4: '0',
    l4: '0.04',
    d5: '0',
    l5: '0.04',
    Ra: '0',
    ti: '20',
    to: '0',
    phii: '50',
  },
  notes: [
    '熱貫流率は U = 1 ÷ (Rsi + Σd/λ + Ra + Rse) です（JIS A 2101、建築研究所「外皮性能の計算方法」式(4)(5)）。熱橋（柱・梁・下地材など）の影響は含みません。',
    '表面熱伝達抵抗の既定値は、建築研究所「外皮性能の計算方法」付録A 表3.1 の値です。住宅の外皮性能の評価用の値なので、案件の基準に別の値があればそれを入力してください。',
    '家具の裏や出隅などでは室内側の表面熱伝達抵抗が大きくなり、表面温度が下がります。結露の検討では Rsi を大きめに設定して確認することもあります。',
    'この判定は室内側表面の結露（表面結露）だけです。壁の内部で起こる内部結露は、透湿抵抗を使った別の検討が必要です。',
    '露点は Tetens の式から求めています（HV-04 と同じ式）。',
  ],
  doc: hv05Doc,
  beginner: hv05Beginner,
  build(v) {
    const part = PARTS[str(v, 'part')];
    const Rsi = num(v, 'Rsi');
    const Rse = num(v, 'Rse');
    const Ra = num(v, 'Ra');
    const ti = num(v, 'ti');
    const to = num(v, 'to');
    const phii = num(v, 'phii');
    const tableNote = part.Rsi === undefined ? '任意入力' : `${part.label}（建築研究所 付録A 表3.1）`;

    const s = new SheetBuilder();
    s.section('部位と表面熱伝達抵抗')
      .input('part', '部位', part.label)
      .input('Rsi', '室内側表面熱伝達抵抗', Rsi, { symbol: 'Rsi', unit: 'm²·K/W', digits: 2, note: tableNote })
      .input('Rse', '外気側表面熱伝達抵抗', Rse, { symbol: 'Rse', unit: 'm²·K/W', digits: 2, note: tableNote })
      .section('各層の熱抵抗');

    const used: number[] = [];
    let sumR = 0;
    for (const i of LAYERS) {
      const d = num(v, `d${i}`);
      if (d <= 0) continue;
      const l = num(v, `l${i}`);
      const R = d / 1000 / l;
      sumR += R;
      used.push(i);
      s.input(`d${i}`, `第${i}層 厚さ`, d, { symbol: `d${i}`, unit: 'mm', digits: 1 })
        .input(`l${i}`, `第${i}層 熱伝導率`, l, { symbol: `λ${i}`, unit: 'W/(m·K)', digits: 3 })
        .calc(`R${i}`, `第${i}層 熱抵抗`, { symbol: `R${i}`, unit: 'm²·K/W', value: R, expr: `{d${i}} ÷ 1000 ÷ {l${i}}`, formula: `{d${i}}/1000/{l${i}}`, digits: 4 });
    }
    s.input('Ra', '中空層の熱抵抗', Ra, { symbol: 'Ra', unit: 'm²·K/W', digits: 2 });

    const RT = Rsi + sumR + Ra + Rse;
    if (!(RT > 0)) throw new CalcError('熱抵抗の合計が 0 です。室内側表面熱伝達抵抗か層の厚さを入力してください。');
    const U = 1 / RT;
    const layerSumExpr = used.map((i) => `{R${i}}`);
    s.section('熱貫流率')
      .calc('RT', '熱貫流抵抗', {
        symbol: 'RT',
        unit: 'm²·K/W',
        value: RT,
        expr: ['{Rsi}', ...layerSumExpr, '{Ra}', '{Rse}'].join(' + '),
        formula: ['{Rsi}', ...layerSumExpr, '{Ra}', '{Rse}'].join('+'),
        digits: 3,
      })
      .calc('U', '熱貫流率', { symbol: 'U', unit: 'W/(m²·K)', value: U, expr: '1 ÷ {RT}', formula: '1/{RT}', digits: 3 });

    const ths = ti - U * Rsi * (ti - to);
    const pwi = (phii / 100) * pwsTetens(ti);
    const tdi = dewPoint(pwi);
    const phiLim = Math.min(100, (pwsTetens(ths) / pwsTetens(ti)) * 100);
    s.section('表面結露の判定')
      .input('ti', '室温', ti, { symbol: 'θi', unit: '°C', digits: 1 })
      .input('to', '外気温', to, { symbol: 'θo', unit: '°C', digits: 1 })
      .input('phii', '室内相対湿度', phii, { symbol: 'φi', unit: '%', digits: 1 })
      .calc('ths', '室内側表面温度', { symbol: 'θs', unit: '°C', value: ths, expr: '{ti} − {U} × {Rsi} × ({ti} − {to})', formula: '{ti}-{U}*{Rsi}*({ti}-{to})', digits: 1 })
      .calc('pwi', '室内の水蒸気分圧', {
        symbol: 'pw',
        unit: 'kPa',
        value: pwi,
        expr: '{phii} ÷ 100 × 0.61078 × 10^(7.5 × {ti} ÷ ({ti} + 237.3))',
        formula: `{phii}/100*${pwsFormula('{ti}')}`,
        digits: 4,
        note: '飽和水蒸気圧は Tetens の式',
      })
      .calc('tdi', '室内空気の露点温度', { symbol: 'td', unit: '°C', value: tdi, expr: '237.3 × log₁₀({pwi} ÷ 0.61078) ÷ (7.5 − log₁₀({pwi} ÷ 0.61078))', formula: dewPointFormula('{pwi}'), digits: 1 })
      .calc('dth', '表面温度と露点の差', { symbol: 'Δθ', unit: 'K', value: ths - tdi, expr: '{ths} − {tdi}', formula: '{ths}-{tdi}', digits: 1 })
      .judge('ok', '表面結露の判定', ths > tdi, { expr: '{ths} > {tdi}', formula: 'IF({ths}>{tdi},"OK","NG")', note: 'θs ≤ td なら結露のおそれ（NG）' })
      .calc('phiLim', '結露しない室内相対湿度の上限', {
        symbol: 'φlim',
        unit: '%',
        value: phiLim,
        expr: 'min(pws({ths}) ÷ pws({ti}) × 100, 100)',
        formula: `MIN(${pwsFormula('{ths}')}/(${pwsFormula('{ti}')})*100,100)`,
        digits: 1,
        note: 'この相対湿度以上で表面結露',
      })
      .highlight('U', 'ths', 'tdi', 'ok');

    if (ths <= tdi) s.warn('室内側表面温度が露点以下です。断熱を厚くする（熱貫流率を下げる）か、室内の湿度を下げる対策を検討してください。');
    if (used.length === 0) s.warn('層がありません（すべての層の厚さが 0）。表面熱伝達抵抗と中空層だけで計算しています。');
    return s.result();
  },
};
