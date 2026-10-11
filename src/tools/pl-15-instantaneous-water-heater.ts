import type { ToolDef } from '../core/types';
import { SheetBuilder, stepUp, stepUpFormula } from '../core/sheet';
import { num, tableRows } from '../core/values';
import { CalcError } from '../core/errors';
import { GOSU_SERIES, pl15Beginner, pl15Doc } from './docs/pl-15';

const fixtureDefaults = JSON.stringify([
  { name: '湯沸室の流し', n: '1', qp: '8', th: '40' },
  { name: '洗面器', n: '1', qp: '5', th: '40' },
]);

const OVER = `${GOSU_SERIES[GOSU_SERIES.length - 1]}号超`;

export const instantaneousWaterHeater: ToolDef = {
  id: 'PL-15',
  slug: 'instantaneous-water-heater',
  category: 'plumbing',
  title: '瞬間湯沸器の号数',
  summary: '同時に使う器具の湯量と出湯温度から、瞬間湯沸器（ガス給湯器）の必要な号数と加熱能力を求めます。',
  keywords: ['瞬間湯沸器', 'ガス湯沸器', 'ガス給湯器', '号数', '給湯能力', '加熱能力', '器具種別給湯量', '同時使用率', '25℃上昇'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」令和6年版 第5編 第3章 第2節 湯沸器等（ガス湯沸器は洗い物用とし瞬間湯沸器を選定、給湯量は器具種別給湯量に基づき算定）',
    '号数の定義：1号は、水 1 L/min の温度を 25 ℃ 上げる能力（約 1.744 kW）。ガス給湯器の業界で用いられる能力表示（給湯器メーカー各社の資料で確認）',
    '建築設備設計計算書作成の手引（公共建築協会）様式 機-111（計算項目の参考）',
    '水の比熱 4.186 kJ/(kg·K)、密度 1 kg/L として計算',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'number',
      key: 'tc',
      label: '給水温度',
      unit: '℃',
      help: '冬期の給水温度を使うと安全側になります。地域によって異なります。',
      suggestions: [
        { label: '5℃', value: 5 },
        { label: '10℃', value: 10 },
      ],
    },
    {
      type: 'table',
      key: 'fx',
      label: '同時に使う器具の明細',
      columns: [
        { key: 'name', label: '器具', type: 'text', width: 'wide' },
        { key: 'n', label: '個数', type: 'number', unit: '個', min: 0, width: 'narrow' },
        { key: 'qp', label: '1個当たりの湯量', type: 'number', unit: 'L/min', min: 0, width: 'narrow' },
        { key: 'th', label: '出湯温度', type: 'number', unit: '℃', width: 'narrow' },
      ],
      newRow: { name: '', n: '1', qp: '5', th: '40' },
      maxRows: 30,
      help: '1台の湯沸器から湯を出す器具を並べます。1個当たりの湯量（器具種別給湯量）は設計基準・便覧の表やメーカー資料から入力します。目安：洗面器・手洗器 5 L/min 程度、流し 5〜10 L/min 程度、シャワー 8〜12 L/min 程度（いずれも目安。原文で確認）。',
    },
    {
      type: 'number',
      key: 'eta',
      label: '器具の同時使用率',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '明細の器具が同時に使われる割合です。器具が少ないとき（1〜2個）は 1.0（全数同時）とするのが安全側です。器具が多い場合の値は設計基準・便覧の表で確認してください。',
      suggestions: [{ label: '全数同時 1.0', value: 1 }],
    },
    {
      type: 'number',
      key: 'K',
      label: '加熱能力の余裕係数',
      min: 1,
      help: '加熱能力（kW）に掛ける余裕です。号数の計算には掛けません。採用値は設計基準の原文で確認してください。',
      suggestions: [
        { label: '1.0', value: 1 },
        { label: '1.1', value: 1.1 },
      ],
    },
  ],
  defaults: { tc: '5', fx: fixtureDefaults, eta: '1', K: '1' },
  notes: [
    '号数は、水 1 L/min を 25 ℃ 上げる能力を 1号 とする能力の表し方です。号数 = 出湯量（L/min）× 温度上昇（℃）÷ 25 で、1号 は 4.186 × 25 ÷ 60 ≒ 1.744 kW に当たります。',
    '号数の目安は、家庭用・小形業務用のガス給湯器によくある号数（5・10・13・16・20・24・32号）から、計算値以上で最小のものを示しています。製品の系列はメーカーごとに違うので、カタログで確認してください。',
    '建築設備設計基準（第5編 第3章 第2節）では、ガス湯沸器は洗い物用とし瞬間湯沸器を選び、給湯量は器具種別給湯量に基づいて算定します。器具種別給湯量・同時使用率は本ツールに内蔵していないので、原文の表で確認して入力してください。',
    '浴槽への湯張りは、浴槽の有効貯湯量 ÷ 湯張り時間 で湯量を求め、明細の1行として入力してください。',
    '冬期は給水温度が下がるので、同じ号数でも出せる湯量が減ります。冬期の給水温度で計算してください。',
  ],
  doc: pl15Doc,
  beginner: pl15Beginner,
  build(v) {
    const tc = num(v, 'tc');
    const eta = num(v, 'eta');
    const K = num(v, 'K');
    const fx = tableRows(v, 'fx');
    for (const r of fx) {
      if (Number(r.n) > 0 && Number(r.th) <= tc) {
        throw new CalcError(`「${String(r.name) || '名称なし'}」の出湯温度が給水温度 ${tc} ℃ 以下です。出湯温度は給水温度より高くしてください。`);
      }
    }
    const rows = fx.map((r) => {
      const n = Number(r.n);
      const qp = Number(r.qp);
      const th = Number(r.th);
      return [String(r.name), n, qp, th, n * qp, n * qp * (th - tc)];
    });
    const SQ = rows.reduce((a, r) => a + (r[4] as number), 0);
    const SD = rows.reduce((a, r) => a + (r[5] as number), 0);
    const Q = eta * SQ;
    const G = (eta * SD) / 25;
    const c = 4.186;
    const H = (K * c * eta * SD) / 60;
    const Gs = stepUp(G, GOSU_SERIES) ?? OVER;

    const s = new SheetBuilder();
    s.section('給湯量')
      .input('tc', '給水温度', tc, { symbol: 'tc', unit: '℃' })
      .table(
        'fx',
        '同時に使う器具の明細',
        [
          { key: 'name', label: '器具' },
          { key: 'n', label: '個数', symbol: 'N', unit: '個' },
          { key: 'qp', label: '1個当たりの湯量', symbol: 'qp', unit: 'L/min', digits: 1 },
          { key: 'th', label: '出湯温度', symbol: 'th', unit: '℃' },
          { key: 'qn', label: '湯量', symbol: 'qp·N', unit: 'L/min', digits: 1, expr: '{@n} × {@qp}', formula: '{@n}*{@qp}' },
          { key: 'qd', label: '湯量 × 温度上昇', symbol: 'qp·N·Δt', unit: 'L·℃/min', digits: 0, expr: '{@n} × {@qp} × ({@th} − {tc})', formula: '{@n}*{@qp}*({@th}-{tc})' },
        ],
        rows,
        { note: 'qp は設計基準・便覧の表、メーカー資料の値' },
      )
      .calc('SQ', '湯量の合計', { symbol: 'Σ(qp·N)', unit: 'L/min', value: SQ, expr: 'Σ(qp × N)', formula: 'SUM({fx:qn})', digits: 1 })
      .calc('SD', '湯量 × 温度上昇 の合計', { symbol: 'Σ(qp·N·Δt)', unit: 'L·℃/min', value: SD, expr: 'Σ(qp × N × (th − tc))', formula: 'SUM({fx:qd})', digits: 0 })
      .input('eta', '器具の同時使用率', eta, { symbol: 'η', digits: 2 })
      .calc('Q', '給湯量', { symbol: 'Q', unit: 'L/min', value: Q, expr: '{eta} × {SQ}', formula: '{eta}*{SQ}', digits: 1 })
      .section('号数')
      .calc('G', '必要な号数', { symbol: 'G', unit: '号', value: G, expr: '{eta} × {SD} ÷ 25', formula: '{eta}*{SD}/25', digits: 1, note: '1号 = 水 1 L/min を 25 ℃ 上げる能力' })
      .calc('Gs', '号数の目安（よくある号数から選んだ値）', {
        symbol: 'Gs',
        unit: '号',
        value: Gs,
        expr: '{G} 以上で最小の号数',
        formula: stepUpFormula('{G}', GOSU_SERIES, `"${OVER}"`),
        note: `${GOSU_SERIES.join('・')}号から選択。製品の系列はメーカーで確認`,
      })
      .section('加熱能力')
      .input('K', '余裕係数', K, { symbol: 'K', digits: 2 })
      .input('c', '水の比熱', c, { symbol: 'c', unit: 'kJ/(kg·K)', digits: 3, note: '密度 1 kg/L として L = kg で扱う' })
      .calc('H', '加熱能力', { symbol: 'H', unit: 'kW', value: H, expr: '{K} × {c} × {eta} × {SD} ÷ 60', formula: '{K}*{c}*{eta}*{SD}/60', digits: 1 })
      .highlight('Q', 'G', 'Gs', 'H');
    if (SQ <= 0) s.warn('湯量の合計が 0 です。同時に使う器具の個数と湯量を入力してください。');
    if (Gs === OVER) s.warn(`必要な号数が ${GOSU_SERIES[GOSU_SERIES.length - 1]}号を超えます。複数台に分けるか、業務用の機種・貯湯式を検討してください。`);
    return s.result();
  },
};
