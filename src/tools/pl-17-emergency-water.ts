import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { CalcError } from '../core/errors';
import { pl17Beginner, pl17Doc } from './docs/pl-17';

const SYS_LABEL: Record<string, string> = {
  sep: '飲料水は受水タンク、雑用水は雑用水タンクで確保',
  one: '飲料水・雑用水とも受水タンクで確保',
};

export const emergencyWater: ToolDef = {
  id: 'PL-17',
  slug: 'emergency-water',
  category: 'plumbing',
  title: '災害時の必要水量と非常用排水槽',
  summary: '災害後に施設で使う飲料水・雑用水と排水の量を求め、受水タンクと非常用排水槽の容量で足りるか確かめます。',
  keywords: ['災害時', '非常時', '必要水量', '備蓄水', '飲料水', '雑用水', '受水タンク', '非常用排水槽', '甲類', '業務継続', 'BCP', '総合耐震計画基準'],
  references: [
    '国土交通省大臣官房官庁営繕部「官庁施設の総合耐震・対津波計画基準」（平成25年制定）第2編 第2章 2.2.4.5 給水機能の確保（飲料水及び雑用水を相当期間分確保）、2.2.4.6 排水機能の確保（放流が不能となった場合でも相当期間の排水機能を確保）（p.8）',
    '国土交通省大臣官房官庁営繕部「建築設備設計基準」令和6年版 第5編 第2章 第1節(7)・第3節(5)（災害時に必要となる水量を受水タンクで確保する措置）、第4章 第1節(7)・第2節(3)（非常時の排水機能を排水槽で確保する場合の排水容量）（本文 p.18〜21）',
    '建築設備設計計算書作成の手引（公共建築協会、令和3年版）様式 機-151（甲類施設において地震等に備える場合の必要水量等）・機-152（津波等の避難に備える場合の必要水量）（計算項目の参考）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'sys',
      label: '水の確保のしかた',
      display: 'segmented',
      options: [
        { value: 'sep', label: '飲料水・雑用水を別のタンク' },
        { value: 'one', label: '受水タンク1つで両方' },
      ],
      help: '雑用水（便器の洗浄水など）を雑用水タンクで別に確保するか、受水タンクの上水で両方を賄うかを選びます。',
    },
    {
      type: 'number',
      key: 'qa',
      label: '1人1日当たりの飲料水の量',
      unit: 'L/(人·日)',
      min: 0,
      help: '手引の様式では 4 程度としています。採用値は案件の設計基準の原文で確認してください。',
      suggestions: [{ label: '目安 4', value: 4 }],
    },
    {
      type: 'number',
      key: 'qb',
      label: '1人1日当たりの雑用水の量',
      unit: 'L/(人·日)',
      min: 0,
      help: '便器の洗浄などに使う水です。手引の様式では 30 程度としています。採用値は原文で確認してください。',
      suggestions: [{ label: '目安 30', value: 30 }],
    },
    {
      type: 'number',
      key: 'qc',
      label: '重要設備の補給水の量（1日当たり）',
      unit: 'L/日',
      min: 0,
      help: '災害復旧の活動に最低限必要な設備（空調の冷却塔など）の補給水です。該当しなければ 0 とします。雑用水に加えます。',
    },
    {
      type: 'number',
      key: 'n1',
      label: '在庁舎人数（災害発生時に施設にいる人数）',
      unit: '人',
      min: 0,
      help: '原則として職員数と来庁者数の合計です。施設の使い方に合わせて決めます。',
    },
    { type: 'number', key: 'n2', label: '災害応急対策活動を行う職員等の数', unit: '人', min: 0, help: '災害後も施設に残って活動する人数です。' },
    {
      type: 'number',
      key: 't1',
      label: '一般職員等が施設を離れるまでの日数',
      unit: '日',
      min: 0,
      help: '手引の様式では 1 程度としています。',
      suggestions: [{ label: '目安 1', value: 1 }],
    },
    {
      type: 'number',
      key: 't2',
      label: '外部からの給水が得られるまでの日数',
      unit: '日',
      min: 0,
      help: '水道の復旧や給水車による補給を想定して決めます。手引の様式では、想定が難しい場合 4〜7 日程度としています。',
      suggestions: [
        { label: '目安 4', value: 4 },
        { label: '目安 7', value: 7 },
      ],
    },
    {
      type: 'number',
      key: 'QTW',
      label: '受水タンクの容量（平常時の必要容量）',
      unit: 'm³',
      min: 0,
      help: '平常時の給水量から決めた受水タンクの容量です（PL-01 などで算定）。',
    },
    {
      type: 'number',
      key: 'QTZ',
      label: '雑用水タンクの容量（平常時の必要容量）',
      unit: 'm³',
      min: 0,
      visible: (v) => v.sys !== 'one',
    },
    {
      type: 'number',
      key: 'ke',
      label: 'タンク容量のうち非常時の水量に見込む割合',
      min: 0,
      exclusiveMin: true,
      max: 1,
      help: '災害の発生がタンクの水位の低い時間帯と重なっても確保できる量として、容量に掛ける割合です。手引の様式では 0.7 としています。採用値は原文で確認してください。',
      suggestions: [{ label: '目安 0.7', value: 0.7 }],
    },
    {
      type: 'number',
      key: 'qd',
      label: '1人1日当たりの排水量',
      unit: 'L/(人·日)',
      min: 0,
      help: '手引の様式では 30 程度としています。採用値は原文で確認してください。',
      suggestions: [{ label: '目安 30', value: 30 }],
    },
    {
      type: 'number',
      key: 'td',
      label: '放流または汚水の搬出ができるまでの日数',
      unit: '日',
      min: 0,
      help: '下水道の復旧、または汚水を車で運び出せるようになるまでの日数です。手引の様式では、想定が難しい場合 7 日程度としています。',
      suggestions: [{ label: '目安 7', value: 7 }],
    },
    {
      type: 'number',
      key: 'Vd',
      label: '非常用排水槽の有効容量（計画値）',
      unit: 'm³',
      min: 0,
      help: '災害時に排水をためる槽の、実際にためられる容量です。',
    },
  ],
  defaults: {
    sys: 'sep',
    qa: '4',
    qb: '30',
    qc: '200',
    n1: '300',
    n2: '50',
    t1: '1',
    t2: '7',
    QTW: '10',
    QTZ: '30',
    ke: '0.7',
    qd: '30',
    td: '7',
    Vd: '20',
  },
  notes: [
    '必要水量は「在庁舎人数が t₁ 日、対策活動の職員が残りの (t₂ − t₁) 日」使う量として、延べ人日に1人1日当たりの水量を掛けて求めます。',
    '式と係数（飲料水 4、雑用水 30、排水 30 L/(人·日)、t₁ = 1 日、t₂ = 4〜7 日、タンク容量に掛ける 0.7）は、建築設備設計計算書作成の手引の様式 機-151 に示されたものです。公開されている官庁施設の総合耐震・対津波計画基準と建築設備設計基準の本文は「相当期間分を確保する」と定めるだけで、数値は確かめられていません。採用値は原文（建築設備設計基準の資料編など）と施設の業務継続計画で確認してください。',
    '受水タンクの容量が足りないときは、「必要なタンク容量」以上のタンクにするか、井水・雨水の利用や備蓄で補います。上水のタンクを大きくし過ぎると平常時に水が滞留するため、水質の保持にも注意してください。',
    '津波などで施設を離れる場合（様式 機-152）は、n₂ = 0、t₁ を施設を離れるまでの日数として計算できます（雑用水 0）。',
  ],
  doc: pl17Doc,
  beginner: pl17Beginner,
  build(v) {
    const sys = str(v, 'sys');
    const qa = num(v, 'qa');
    const qb = num(v, 'qb');
    const qc = num(v, 'qc');
    const n1 = num(v, 'n1');
    const n2 = num(v, 'n2');
    const t1 = num(v, 't1');
    const t2 = num(v, 't2');
    const QTW = num(v, 'QTW');
    const ke = num(v, 'ke');
    const qd = num(v, 'qd');
    const td = num(v, 'td');
    const Vd = num(v, 'Vd');
    if (t2 < t1) throw new CalcError('外部からの給水が得られるまでの日数 t₂ を、一般職員等が施設を離れるまでの日数 t₁ 以上にしてください。');
    if (td < t1) throw new CalcError('放流または汚水の搬出ができるまでの日数 td を、一般職員等が施設を離れるまでの日数 t₁ 以上にしてください。');

    const N = n1 * t1 + n2 * (t2 - t1);
    const Qa = (qa * N) / 1000;
    const Qb = (qb * N + qc * t2) / 1000;
    const Nd = n1 * t1 + n2 * (td - t1);
    const QdE = (qd * Nd) / 1000;

    const s = new SheetBuilder();
    s.section('人数と日数')
      .input('sys', '水の確保のしかた', SYS_LABEL[sys])
      .input('n1', '在庁舎人数', n1, { symbol: 'n₁', unit: '人', digits: 0 })
      .input('n2', '災害応急対策活動を行う職員等の数', n2, { symbol: 'n₂', unit: '人', digits: 0 })
      .input('t1', '一般職員等が施設を離れるまでの日数', t1, { symbol: 't₁', unit: '日' })
      .input('t2', '外部からの給水が得られるまでの日数', t2, { symbol: 't₂', unit: '日' })
      .calc('N', '延べ人日（給水）', { symbol: 'N', unit: '人·日', value: N, expr: '{n1} × {t1} + {n2} × ({t2} − {t1})', formula: '{n1}*{t1}+{n2}*({t2}-{t1})', digits: 0 })
      .section('必要水量')
      .input('qa', '1人1日当たりの飲料水の量', qa, { symbol: 'qa', unit: 'L/(人·日)', note: '手引の様式では 4 程度' })
      .input('qb', '1人1日当たりの雑用水の量', qb, { symbol: 'qb', unit: 'L/(人·日)', note: '手引の様式では 30 程度' })
      .input('qc', '重要設備の補給水の量', qc, { symbol: 'qc', unit: 'L/日' })
      .calc('Qa', '飲料水の必要水量', { symbol: 'Qa', unit: 'm³', value: Qa, expr: '{qa} × {N} ÷ 1000', formula: '{qa}*{N}/1000', digits: 2 })
      .calc('Qb', '雑用水の必要水量', { symbol: 'Qb', unit: 'm³', value: Qb, expr: '({qb} × {N} + {qc} × {t2}) ÷ 1000', formula: '({qb}*{N}+{qc}*{t2})/1000', digits: 2 })
      .calc('Qc', '必要水量の合計', { symbol: 'Qc', unit: 'm³', value: Qa + Qb, expr: '{Qa} + {Qb}', formula: '{Qa}+{Qb}', digits: 2 })
      .section('タンクによる確保')
      .input('QTW', '受水タンクの容量（平常時の必要容量）', QTW, { symbol: 'QTW', unit: 'm³' })
      .input('ke', '非常時の水量に見込む割合', ke, { symbol: 'ke', digits: 2, note: '手引の様式では 0.7' })
      .calc('Va', '受水タンクで確保できる水量', { symbol: 'Va', unit: 'm³', value: QTW * ke, expr: '{QTW} × {ke}', formula: '{QTW}*{ke}', digits: 2 });

    if (sys === 'one') {
      const ok = QTW * ke >= Qa + Qb;
      s.judge('okA', '受水タンクで必要水量を確保できるか', ok, { expr: '{Va} ≥ {Qc}', formula: 'IF({Va}>={Qc},"OK","NG")' }).calc('VrA', '必要な受水タンクの容量', {
        symbol: 'VrA',
        unit: 'm³',
        value: Math.max(QTW, (Qa + Qb) / ke),
        expr: 'max({QTW}, {Qc} ÷ {ke})',
        formula: 'MAX({QTW},{Qc}/{ke})',
        digits: 2,
      });
      if (!ok) s.warn('受水タンクの非常時の水量が必要水量に足りません。「必要な受水タンクの容量」以上にするか、雑用水を別に確保してください。');
    } else {
      const QTZ = num(v, 'QTZ');
      const okA = QTW * ke >= Qa;
      const okB = QTZ * ke >= Qb;
      s.judge('okA', '受水タンクで飲料水を確保できるか', okA, { expr: '{Va} ≥ {Qa}', formula: 'IF({Va}>={Qa},"OK","NG")' })
        .calc('VrA', '必要な受水タンクの容量', { symbol: 'VrA', unit: 'm³', value: Math.max(QTW, Qa / ke), expr: 'max({QTW}, {Qa} ÷ {ke})', formula: 'MAX({QTW},{Qa}/{ke})', digits: 2 })
        .input('QTZ', '雑用水タンクの容量（平常時の必要容量）', QTZ, { symbol: 'QTZ', unit: 'm³' })
        .calc('Vb', '雑用水タンクで確保できる水量', { symbol: 'Vb', unit: 'm³', value: QTZ * ke, expr: '{QTZ} × {ke}', formula: '{QTZ}*{ke}', digits: 2 })
        .judge('okB', '雑用水タンクで雑用水を確保できるか', okB, { expr: '{Vb} ≥ {Qb}', formula: 'IF({Vb}>={Qb},"OK","NG")' })
        .calc('VrB', '必要な雑用水タンクの容量', { symbol: 'VrB', unit: 'm³', value: Math.max(QTZ, Qb / ke), expr: 'max({QTZ}, {Qb} ÷ {ke})', formula: 'MAX({QTZ},{Qb}/{ke})', digits: 2 });
      if (!okA) s.warn('受水タンクの非常時の水量が飲料水の必要水量に足りません。「必要な受水タンクの容量」以上にするか、飲料水の備蓄で補ってください。');
      if (!okB) s.warn('雑用水タンクの非常時の水量が雑用水の必要水量に足りません。「必要な雑用水タンクの容量」以上にするか、雨水・井水の利用で補ってください。');
    }

    const okD = Vd >= QdE;
    s.section('非常用排水槽')
      .input('qd', '1人1日当たりの排水量', qd, { symbol: 'qd', unit: 'L/(人·日)', note: '手引の様式では 30 程度' })
      .input('td', '放流または汚水の搬出ができるまでの日数', td, { symbol: 'td', unit: '日' })
      .calc('Nd', '延べ人日（排水）', { symbol: 'Nd', unit: '人·日', value: Nd, expr: '{n1} × {t1} + {n2} × ({td} − {t1})', formula: '{n1}*{t1}+{n2}*({td}-{t1})', digits: 0 })
      .calc('QdE', '非常時の排水量', { symbol: 'QdE', unit: 'm³', value: QdE, expr: '{qd} × {Nd} ÷ 1000', formula: '{qd}*{Nd}/1000', digits: 2 })
      .input('Vd', '非常用排水槽の有効容量', Vd, { symbol: 'Vd', unit: 'm³' })
      .judge('okD', '非常用排水槽で排水を貯められるか', okD, { expr: '{Vd} ≥ {QdE}', formula: 'IF({Vd}>={QdE},"OK","NG")' });
    if (!okD) s.warn('非常用排水槽の有効容量が非常時の排水量に足りません。排水槽を大きくするか、汚水の搬出計画を見直してください。');

    if (sys === 'one') s.highlight('Qc', 'okA', 'VrA', 'QdE', 'okD');
    else s.highlight('Qa', 'Qb', 'okA', 'okB', 'QdE', 'okD');
    return s.result();
  },
};
