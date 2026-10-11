import type { RawValues, ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str, tableRows } from '../core/values';
import { CalcError } from '../core/errors';
import { pl16Beginner, pl16Doc } from './docs/pl-16';

const isLoss = (v: RawValues) => v.mode !== 'simple';
const isSimple = (v: RawValues) => v.mode === 'simple';

const sectionDefaults = JSON.stringify([
  { name: '給湯主管 40A', L: '60', q: '0.4' },
  { name: '給湯枝管 25A', L: '40', q: '0.3' },
  { name: '返湯管 20A', L: '60', q: '0.28' },
]);

export const hotWaterCirculationPump: ToolDef = {
  id: 'PL-16',
  slug: 'hot-water-circulation-pump',
  category: 'plumbing',
  title: '給湯循環ポンプ',
  summary: '循環配管の熱損失から給湯の循環流量を求め、摩擦損失から循環ポンプの揚程を計算します。',
  keywords: ['給湯循環ポンプ', '循環ポンプ', '循環湯量', '循環流量', '返湯管', '熱損失', '中央式給湯', '循環水頭', '揚程'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」令和6年版 第5編 第3章 第7節 給湯用循環ポンプ（循環湯量は給湯管の単位長さ当たりの熱損失等に基づき算定）',
    '建築設備設計計算書作成の手引（公共建築協会）様式 機-117（計算項目の参考）',
    '空気調和・衛生工学便覧（管径・保温別の単位長さ当たり熱損失の目安）',
    '水の比熱 4.186 kJ/(kg·K)、密度 1 kg/L として計算',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'mode',
      label: '循環流量の求め方',
      display: 'segmented',
      options: [
        { value: 'loss', label: '配管の熱損失から' },
        { value: 'simple', label: '給湯量の割合から（簡易）' },
      ],
      help: '設計基準の本文は、循環湯量を給湯管の単位長さ当たりの熱損失等に基づいて算定するとしています。簡易な方法は小規模な系統の概算に使います。',
    },
    {
      type: 'number',
      key: 'th',
      label: '給湯温度',
      unit: '℃',
      visible: isLoss,
      help: '貯湯槽（加熱装置）出口の給湯温度です。レジオネラ属菌対策として貯湯槽内を 60 ℃ 以上に保つのが一般的です。',
      suggestions: [
        { label: '60℃', value: 60 },
        { label: '55℃', value: 55 },
      ],
    },
    {
      type: 'number',
      key: 'tr',
      label: '配管の周囲温度',
      unit: '℃',
      visible: isLoss,
      help: '配管が通る天井内・パイプシャフトの温度です。手引の様式では 15 ℃ 程度としています（目安）。',
      suggestions: [{ label: '目安 15℃', value: 15 }],
    },
    {
      type: 'table',
      key: 'sec',
      label: '循環配管の区間（熱損失）',
      columns: [
        { key: 'name', label: '区間・管径', type: 'text', width: 'wide' },
        { key: 'L', label: '管長', type: 'number', unit: 'm', min: 0, width: 'narrow' },
        { key: 'q', label: '単位長さ当たり熱損失', type: 'number', unit: 'W/(m·K)', min: 0, width: 'narrow' },
      ],
      newRow: { name: '', L: '10', q: '0.3' },
      maxRows: 40,
      visible: isLoss,
      help: '給湯管と返湯管を、管径・保温の別ごとに区間に分けて入力します（往きと返りの両方）。単位長さ当たり熱損失は、管と周囲の温度差 1 ℃・管長 1 m 当たりの値で、便覧の表やメーカー資料から入れます。目安：保温あり（20〜50A、保温厚 20〜25 mm）0.2〜0.5 W/(m·K) 程度、保温なし 1〜2 W/(m·K) 程度（いずれも目安。原文で確認）。',
    },
    {
      type: 'number',
      key: 'dt',
      label: '給湯と返湯の温度差',
      unit: '℃',
      min: 0,
      exclusiveMin: true,
      visible: isLoss,
      help: '貯湯槽を出た湯が、循環して戻るまでに下がってよい温度です。小さくすると循環流量が増えます。手引の様式では 5 ℃ 程度としています（目安）。',
      suggestions: [{ label: '目安 5℃', value: 5 }],
    },
    {
      type: 'number',
      key: 'qs',
      label: '給湯量（同時使用流量）',
      unit: 'L/min',
      min: 0,
      exclusiveMin: true,
      visible: isSimple,
      help: '系統の給湯管の同時使用流量です。',
    },
    {
      type: 'number',
      key: 'a',
      label: '循環流量の割合（給湯量に対して）',
      min: 0,
      exclusiveMin: true,
      max: 1,
      visible: isSimple,
      help: '手引の様式の簡易な式では給湯量の 0.2 倍としています（目安。採用は設計基準の原文で確認）。',
      suggestions: [{ label: '目安 0.2', value: 0.2 }],
    },
    {
      type: 'number',
      key: 'Lh',
      label: '最遠の湯栓までの配管長（往復）',
      unit: 'm',
      min: 0,
      exclusiveMin: true,
      help: '貯湯槽から最も遠い湯栓（循環の最遠点）まで行って戻る、往き管と返湯管の長さの合計です。',
    },
    {
      type: 'number',
      key: 'kl',
      label: '局部抵抗相当長の割合（配管長に対して）',
      min: 0,
      help: '継手・弁の局部抵抗を、配管長に対する相当長の割合で見込みます。手引の様式では配管長と同じ（1.0）としてもよいとしています（目安）。',
      suggestions: [
        { label: '0.5', value: 0.5 },
        { label: '目安 1.0', value: 1 },
      ],
    },
    {
      type: 'number',
      key: 'r',
      label: '循環流量での単位摩擦損失（平均）',
      unit: 'kPa/m',
      min: 0,
      exclusiveMin: true,
      help: '各配管に循環流量を流したときの 1 m 当たりの摩擦損失の平均です。「給水管の摩擦損失」（PL-03）などで、循環流量と管径から求めて入れます。',
    },
  ],
  defaults: { mode: 'loss', th: '60', tr: '15', sec: sectionDefaults, dt: '5', qs: '100', a: '0.2', Lh: '120', kl: '1', r: '0.2' },
  notes: [
    '循環流量 W（L/min）= 60 × 熱損失 Φ（W）÷（1000 × c × ρ × Δt）で、c = 4.186 kJ/(kg·K)、ρ = 1 kg/L です。手引の様式の W = 0.86 × Q × ℓ × (th − tr) ÷ Δt × 1/60 は、0.86 kcal/(W·h) を使った同じ式（0.86 ÷ 60 ≒ 60 ÷ 4186）です。',
    '配管の熱損失は、管と周囲の温度差を給湯温度と周囲温度の差 (th − tr) で近似しています。返湯管は実際には少し低い温度なので、やや安全側の値になります。',
    '単位長さ当たり熱損失は便覧の表・メーカー資料の値で、本ツールには内蔵していません。help の値は目安なので、原文で確認してください。',
    '循環ポンプの揚程は、循環の最遠点を通る経路の摩擦損失で決めます。給湯は開放系ではなく循環するだけなので、実揚程（高さ）は入りません。',
    '循環流量を流したときに、各枝の流量が偏らないよう、返湯管に定流量弁・バランス弁を設けて調整します。',
  ],
  doc: pl16Doc,
  beginner: pl16Beginner,
  build(v) {
    const s = new SheetBuilder();
    let W: number;
    if (str(v, 'mode') === 'simple') {
      const qs = num(v, 'qs');
      const a = num(v, 'a');
      W = a * qs;
      s.section('循環流量（簡易）')
        .input('qs', '給湯量（同時使用流量）', qs, { symbol: 'q', unit: 'L/min' })
        .input('a', '循環流量の割合', a, { symbol: 'a', digits: 2 })
        .calc('W', '循環流量', { symbol: 'W', unit: 'L/min', value: W, expr: '{a} × {qs}', formula: '{a}*{qs}', digits: 1 });
    } else {
      const th = num(v, 'th');
      const tr = num(v, 'tr');
      const dt = num(v, 'dt');
      if (th <= tr) throw new CalcError('給湯温度は配管の周囲温度より高くしてください。');
      const rows = tableRows(v, 'sec').map((r) => {
        const L = Number(r.L);
        const q = Number(r.q);
        return [String(r.name), L, q, L * q * (th - tr)];
      });
      const SL = rows.reduce((acc, r) => acc + (r[1] as number), 0);
      const SP = rows.reduce((acc, r) => acc + (r[3] as number), 0);
      const c = 4.186;
      const rho = 1;
      W = (60 * SP) / (1000 * c * rho * dt);
      s.section('循環配管の熱損失')
        .input('th', '給湯温度', th, { symbol: 'th', unit: '℃' })
        .input('tr', '配管の周囲温度', tr, { symbol: 'tr', unit: '℃' })
        .table(
          'sec',
          '循環配管の区間',
          [
            { key: 'name', label: '区間・管径' },
            { key: 'L', label: '管長', symbol: 'ℓ', unit: 'm' },
            { key: 'q', label: '単位長さ当たり熱損失', symbol: 'Qℓ', unit: 'W/(m·K)', digits: 2 },
            { key: 'phi', label: '熱損失', symbol: 'Φ', unit: 'W', digits: 0, expr: '{@L} × {@q} × ({th} − {tr})', formula: '{@L}*{@q}*({th}-{tr})' },
          ],
          rows,
          { note: 'Qℓ は便覧の表・メーカー資料の値' },
        )
        .calc('SL', '管長の合計', { symbol: 'Σℓ', unit: 'm', value: SL, expr: 'Σℓ', formula: 'SUM({sec:L})', digits: 1 })
        .calc('SP', '熱損失の合計', { symbol: 'ΣΦ', unit: 'W', value: SP, expr: 'ΣΦ', formula: 'SUM({sec:phi})', digits: 0 })
        .section('循環流量')
        .input('dt', '給湯と返湯の温度差', dt, { symbol: 'Δt', unit: '℃' })
        .input('c', '水の比熱', c, { symbol: 'c', unit: 'kJ/(kg·K)', digits: 3 })
        .input('rho', '水の密度', rho, { symbol: 'ρ', unit: 'kg/L', digits: 2 })
        .calc('W', '循環流量', {
          symbol: 'W',
          unit: 'L/min',
          value: W,
          expr: '60 × {SP} ÷ (1000 × {c} × {rho} × {dt})',
          formula: '60*{SP}/(1000*{c}*{rho}*{dt})',
          digits: 2,
        });
      if (SP <= 0) s.warn('熱損失の合計が 0 です。循環配管の区間（管長と単位長さ当たり熱損失）を入力してください。');
    }

    const Lh = num(v, 'Lh');
    const kl = num(v, 'kl');
    const r = num(v, 'r');
    const Le = kl * Lh;
    const h = (r * (Lh + Le)) / 9.80665;
    s.section('循環ポンプの揚程')
      .input('Lh', '最遠の湯栓までの配管長（往復）', Lh, { symbol: 'L', unit: 'm' })
      .input('kl', '局部抵抗相当長の割合', kl, { symbol: 'k', digits: 2 })
      .calc('Le', '局部抵抗相当長', { symbol: "L'", unit: 'm', value: Le, expr: '{kl} × {Lh}', formula: '{kl}*{Lh}', digits: 1 })
      .input('r', '単位摩擦損失（平均）', r, { symbol: 'r', unit: 'kPa/m', digits: 3 })
      .calc('dp', '循環経路の摩擦損失', { symbol: 'Δp', unit: 'kPa', value: r * (Lh + Le), expr: '{r} × ({Lh} + {Le})', formula: '{r}*({Lh}+{Le})', digits: 1 })
      .calc('h', '循環ポンプの揚程', { symbol: 'h', unit: 'm', value: h, expr: '{dp} ÷ 9.80665', formula: '{dp}/9.80665', digits: 2 })
      .highlight('W', 'h');
    return s.result();
  },
};
