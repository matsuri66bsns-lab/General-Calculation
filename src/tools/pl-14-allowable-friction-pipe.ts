import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str, tableRows } from '../core/values';
import { CalcError } from '../core/errors';
import { pl14Beginner, pl14Doc } from './docs/pl-14';
import { C_HELP, PIPE_C_OPTIONS, RHO_G, hazenWilliamsHead } from './pl-03-hazen-williams';

const PIPE_LABEL: Record<string, string> = Object.fromEntries(PIPE_C_OPTIONS.map((o) => [o.value, o.label]));

/** 既定の区間（起点から最も条件の悪い器具までの経路を、上流から順に並べた例） */
const sectionDefaults = JSON.stringify([
  { name: '引込管', Q: '200', D: '50', L: '15' },
  { name: '立て管', Q: '150', D: '50', L: '12' },
  { name: '横枝管', Q: '60', D: '32', L: '10' },
  { name: '器具までの枝管', Q: '20', D: '20', L: '3' },
]);

export const allowableFrictionPipe: ToolDef = {
  id: 'PL-14',
  slug: 'allowable-friction-pipe',
  category: 'plumbing',
  title: '給水管の許容摩擦抵抗と管径',
  summary: '使える圧力から許容摩擦抵抗 R を求め、区間ごとの管径で単位摩擦損失が R 以下か確かめます。',
  keywords: ['許容摩擦抵抗', '配管許容摩擦抵抗', '給水管径', '管径算定', '摩擦抵抗', '単位摩擦損失', 'ヘーゼン・ウィリアムス', '水道直結', '高置タンク', '器具の必要最小圧力', '局部抵抗相当長'],
  references: [
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」令和6年版 第5編 第2章 給水設備 第3節(4)（高置タンクは全ての器具で必要最小圧力を満足する高さ）、第5節(3)・第6節(3)（揚程は給水器具の必要最小圧力を満足するよう算定）（本文 p.18〜19）',
    '建築設備設計計算書作成の手引（公共建築協会、令和3年版）様式 機-102（給水引込管の管径算定）・機-105（水道用直結加圧形ポンプユニット）・機-106-3（摩擦抵抗による給水配管の管径算定）（計算項目の参考）',
    'ヘーゼン・ウィリアムス式（SI 単位） hf = 10.67 × L × Q^1.85 ÷ (C^1.85 × D^4.87)',
    'SHASE-S 206「給排水衛生設備規準・同解説」（給水器具の必要最小圧力）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'number',
      key: 'P1',
      label: '起点の圧力',
      unit: 'kPa',
      min: 0,
      help: '水道直結は水道本管の水圧（水道事業者に確認した設計水圧）、ポンプ方式はポンプ出口の圧力を入れます。高置タンク方式は 0 とし、タンクとの高低差を下の欄に負の値で入れます。',
    },
    {
      type: 'number',
      key: 'P2',
      label: '末端の器具の必要最小圧力',
      unit: 'kPa',
      min: 0,
      help: '最も条件の悪い器具（最も高い・最も遠い器具）が必要とする圧力です。器具の仕様書や SHASE-S 206 の値で確認してください。',
      suggestions: [
        { label: '一般水栓 目安 30', value: 30 },
        { label: '大便器洗浄弁 目安 70', value: 70 },
        { label: 'シャワー 目安 70', value: 70 },
      ],
    },
    {
      type: 'number',
      key: 'h',
      label: '起点から末端の器具までの高さ',
      unit: 'm',
      help: '器具が起点より高いときは正の値です。高置タンクのように器具が起点より低いときは負の値（例：タンクの水面から 12 m 下の器具なら −12）を入れます。',
    },
    {
      type: 'number',
      key: 'P4',
      label: '機器類の圧力損失の合計',
      unit: 'kPa',
      min: 0,
      help: '量水器（水道メーター）、逆流防止装置、定水位調整弁、減圧弁など、経路上の機器の損失を足した値です。メーカー資料・水道事業者の基準で確認してください。',
    },
    {
      type: 'number',
      key: 'L1',
      label: '起点から末端の器具までの直管長',
      unit: 'm',
      min: 0,
      exclusiveMin: true,
      help: '最も条件の悪い器具までの経路の配管の実長です。',
    },
    {
      type: 'number',
      key: 'k',
      label: '局部損失の割増率（相当長 L2 = k × L1）',
      min: 0,
      help: '継手・弁などの局部損失を、直管長に対する割合で見込みます。手引の様式では、引込管で 0.5、建物内の配管で 1.0 としています。採用値は案件の設計基準の原文で確認してください。',
      suggestions: [
        { label: '目安 0.5（引込管）', value: 0.5 },
        { label: '目安 1.0（建物内）', value: 1 },
      ],
    },
    { type: 'select', key: 'pipe', label: '管種（流速係数の目安）', options: PIPE_C_OPTIONS, help: C_HELP },
    { type: 'number', key: 'C', label: '流速係数 C', min: 0, exclusiveMin: true },
    {
      type: 'table',
      key: 'sec',
      label: '区間ごとの流量と管の内径',
      columns: [
        { key: 'name', label: '区間', type: 'text', width: 'wide' },
        { key: 'Q', label: '流量', type: 'number', unit: 'L/min', min: 0, width: 'narrow' },
        { key: 'D', label: '内径', type: 'number', unit: 'mm', min: 0, exclusiveMin: true, width: 'narrow' },
        { key: 'L', label: '直管長', type: 'number', unit: 'm', min: 0, width: 'narrow' },
      ],
      newRow: { name: '', Q: '20', D: '20', L: '1' },
      maxRows: 30,
      help: '起点から末端の器具までの経路を、上流から区間に分けて入れます。流量は区間ごとの同時使用流量、内径は選んだ管の実際の内径（呼び径ではなく寸法表の値）です。',
    },
  ],
  defaults: { P1: '250', P2: '70', h: '6', P4: '30', L1: '40', k: '1', pipe: 'lined', C: '130', sec: sectionDefaults },
  notes: [
    '許容摩擦抵抗 R は、起点の圧力から器具の必要圧力・高低差・機器の損失を引いた「摩擦損失に使える圧力」を、直管長と局部損失の相当長の合計で割った値です。各区間の単位摩擦損失が R 以下になる管径を選びます。',
    '区間の損失は、単位摩擦損失 × 直管長 × (1 + k) として、局部損失を同じ割増率で見込んでいます。損失の合計の判定は、表の区間が起点から末端の器具まで一続きの経路であるとして行います。',
    '局部損失の割増率（引込管 0.5、建物内 1.0）は、建築設備設計計算書作成の手引の様式に示された値で、公開されている建築設備設計基準の本文では確かめられていません。採用値は原文で確認してください。',
    '器具の必要最小圧力・機器の損失・流速係数は内蔵していません。候補の値は目安です。',
    '流速の上限（一般に 2.0 m/s 以下）は PL-02 で確認してください。',
  ],
  doc: pl14Doc,
  beginner: pl14Beginner,
  build(v) {
    const P1 = num(v, 'P1');
    const P2 = num(v, 'P2');
    const h = num(v, 'h');
    const P4 = num(v, 'P4');
    const L1 = num(v, 'L1');
    const k = num(v, 'k');
    const C = num(v, 'C');
    if (L1 + k * L1 <= 0) throw new CalcError('直管長 L1 に 0 より大きい値を入れてください。');

    const P3 = h * RHO_G;
    const dPa = P1 - P2 - P3 - P4;
    const L2 = k * L1;
    const R = dPa / (L1 + L2);

    const s = new SheetBuilder();
    s.section('許容摩擦抵抗')
      .input('P1', '起点の圧力', P1, { symbol: 'P₁', unit: 'kPa' })
      .input('P2', '末端の器具の必要最小圧力', P2, { symbol: 'P₂', unit: 'kPa' })
      .input('h', '起点から末端の器具までの高さ', h, { symbol: 'h', unit: 'm', note: '器具が起点より低いときは負の値' })
      .calc('P3', '高低差に相当する圧力', { symbol: 'P₃', unit: 'kPa', value: P3, expr: '{h} × 9.80665', formula: '{h}*9.80665', digits: 2 })
      .input('P4', '機器類の圧力損失の合計', P4, { symbol: 'P₄', unit: 'kPa', note: '量水器・逆流防止装置など' })
      .calc('dPa', '摩擦損失に使える圧力', {
        symbol: 'ΔPa',
        unit: 'kPa',
        value: dPa,
        expr: '{P1} − {P2} − {P3} − {P4}',
        formula: '{P1}-{P2}-{P3}-{P4}',
        digits: 2,
      })
      .input('L1', '直管長', L1, { symbol: 'L₁', unit: 'm' })
      .input('k', '局部損失の割増率', k, { symbol: 'k', digits: 2 })
      .calc('L2', '局部損失の相当長', { symbol: 'L₂', unit: 'm', value: L2, expr: '{k} × {L1}', formula: '{k}*{L1}', digits: 1 })
      .calc('R', '許容摩擦抵抗', { symbol: 'R', unit: 'kPa/m', value: R, expr: '{dPa} ÷ ({L1} + {L2})', formula: '{dPa}/({L1}+{L2})', digits: 3 });

    const sec = tableRows(v, 'sec');
    const rows = sec.map((r) => {
      const Q = Number(r.Q);
      const D = Number(r.D);
      const L = Number(r.L);
      const i = hazenWilliamsHead(Q / 60000, D / 1000, 1, C) * RHO_G;
      const vel = Q / 60000 / ((Math.PI * (D / 1000) ** 2) / 4);
      return [String(r.name), Q, D, L, vel, i, i * L * (1 + k), i <= R ? 'OK' : 'NG'];
    });
    const iMax = rows.length ? Math.max(...rows.map((r) => r[5] as number)) : 0;
    const sumL = rows.reduce((a, r) => a + (r[3] as number), 0);
    const sumDp = rows.reduce((a, r) => a + (r[6] as number), 0);

    s.section('区間ごとの確認')
      .input('C', '流速係数', C, { symbol: 'C', note: PIPE_LABEL[str(v, 'pipe')] })
      .table(
        'sec',
        '区間ごとの摩擦損失',
        [
          { key: 'name', label: '区間' },
          { key: 'Q', label: '流量', symbol: 'Q', unit: 'L/min' },
          { key: 'D', label: '内径', symbol: 'D', unit: 'mm' },
          { key: 'L', label: '直管長', symbol: 'L', unit: 'm' },
          {
            key: 'v',
            label: '流速',
            symbol: 'v',
            unit: 'm/s',
            digits: 2,
            expr: '({@Q} ÷ 60000) ÷ (π × ({@D} ÷ 1000)² ÷ 4)',
            formula: '({@Q}/60000)/(PI()*({@D}/1000)^2/4)',
          },
          {
            key: 'i',
            label: '単位摩擦損失',
            symbol: 'i',
            unit: 'kPa/m',
            digits: 3,
            expr: '10.67 × ({@Q} ÷ 60000)^1.85 ÷ ({C}^1.85 × ({@D} ÷ 1000)^4.87) × 9.80665',
            formula: '10.67*({@Q}/60000)^1.85/({C}^1.85*({@D}/1000)^4.87)*9.80665',
          },
          { key: 'dp', label: '区間の損失', symbol: 'Δp', unit: 'kPa', digits: 2, expr: '{@i} × {@L} × (1 + {k})', formula: '{@i}*{@L}*(1+{k})' },
          { key: 'ok', label: '判定', format: 'judge', expr: '{@i} ≤ {R}', formula: 'IF({@i}<={R},"OK","NG")' },
        ],
        rows,
        { note: 'i はヘーゼン・ウィリアムス式、Δp は局部損失を割増率 k で見込んだ値。判定は i ≤ R' },
      )
      .calc('iMax', '単位摩擦損失の最大値', { symbol: 'imax', unit: 'kPa/m', value: iMax, expr: 'max(i)', formula: 'MAX({sec:i})', digits: 3 })
      .judge('okR', '全区間で単位摩擦損失が許容摩擦抵抗以下', iMax <= R, { expr: '{iMax} ≤ {R}', formula: 'IF({iMax}<={R},"OK","NG")' })
      .section('損失の合計の確認')
      .calc('sumL', '区間の直管長の合計', { symbol: 'ΣL', unit: 'm', value: sumL, expr: 'ΣL', formula: 'SUM({sec:L})', digits: 1 })
      .calc('sumDp', '区間の損失の合計', { symbol: 'ΣΔp', unit: 'kPa', value: sumDp, expr: 'ΣΔp', formula: 'SUM({sec:dp})', digits: 2 })
      .judge('okP', '損失の合計が使える圧力以内', sumDp <= dPa, { expr: '{sumDp} ≤ {dPa}', formula: 'IF({sumDp}<={dPa},"OK","NG")' })
      .calc('Pm', '末端の器具での圧力の余裕', { symbol: 'Pm', unit: 'kPa', value: dPa - sumDp, expr: '{dPa} − {sumDp}', formula: '{dPa}-{sumDp}', digits: 2 })
      .highlight('R', 'iMax', 'okR', 'sumDp', 'okP');

    if (dPa <= 0) {
      s.warn('摩擦損失に使える圧力が 0 以下です。起点の圧力が足りないため、どの管径でも末端の器具の必要圧力を確保できません。加圧ポンプの採用や高置タンクの高さを見直してください。');
    }
    const ng = rows.filter((r) => (r[5] as number) > R).map((r) => String(r[0]) || '（名称なし）');
    if (ng.length && dPa > 0) s.warn(`単位摩擦損失が許容摩擦抵抗 R を超える区間があります（${ng.join('、')}）。その区間の管径を1サイズ太くしてください。`);
    if (rows.length === 0) s.warn('区間が入力されていません。起点から末端の器具までの区間を表に入れてください。');
    else if (Math.abs(sumL - L1) > L1 * 0.005) {
      s.warn(`区間の直管長の合計 ${sumL.toFixed(1)} m が、許容摩擦抵抗の計算に使った直管長 L₁ = ${L1} m と一致しません。表には起点から末端の器具までの一続きの経路を入れてください。`);
    }
    return s.result();
  },
};
