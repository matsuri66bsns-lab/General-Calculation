import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const TEBIKI = '建築設備設計計算書作成の手引の様式の記号にならう';

export function pl17Doc(v: Values): ToolDoc {
  const one = v.sys === 'one';
  const tank = one
    ? [
        { title: 'タンクで確保できる水量と判定', expr: 'Va = QTW × ke、 判定 Va ≥ Qc', body: '平常時の容量のうち、災害時に残っていると見込める割合 ke を掛けた量を、飲料水と雑用水の合計と比べます。' },
        { title: '必要な受水タンクの容量', expr: 'VrA = max(QTW, Qc ÷ ke)', body: '必要水量を ke で割り戻した容量と平常時の容量の大きい方です。これ以上の容量にすれば非常時の水量を確保できます。' },
      ]
    : [
        { title: 'タンクで確保できる水量と判定', expr: 'Va = QTW × ke、 判定 Va ≥ Qa、 Vb = QTZ × ke、 判定 Vb ≥ Qb', body: '受水タンクは飲料水、雑用水タンクは雑用水について、平常時の容量に割合 ke を掛けた量と必要水量を比べます。' },
        { title: '必要なタンクの容量', expr: 'VrA = max(QTW, Qa ÷ ke)、 VrB = max(QTZ, Qb ÷ ke)', body: '必要水量を ke で割り戻した容量と平常時の容量の大きい方です。' },
      ];
  const tankSymbols: SymbolDoc[] = one
    ? [{ symbol: 'VrA', origin: 'V（Volume：容量）に r（required：必要）と A（飲料水系統）を添えた本サイトの表記', meaning: '必要な受水タンクの容量', unit: 'm³' }]
    : [
        { symbol: 'VrA', origin: 'V（Volume：容量）に r（required：必要）と A（飲料水系統）を添えた本サイトの表記', meaning: '必要な受水タンクの容量', unit: 'm³' },
        { symbol: 'QTZ', origin: '手引の記号 QTW にならい、Z（雑用水）を添えた本サイトの表記', meaning: '雑用水タンクの容量（平常時の必要容量）', unit: 'm³' },
        { symbol: 'Vb', origin: 'V（Volume：容量）に b（雑用水。qb にそろえた添字）を添えた本サイトの表記', meaning: '雑用水タンクで確保できる非常時の水量', unit: 'm³' },
        { symbol: 'VrB', origin: 'V に r（required：必要）と B（雑用水系統）を添えた本サイトの表記', meaning: '必要な雑用水タンクの容量', unit: 'm³' },
      ];
  return {
    formulas: [
      {
        title: '延べ人日',
        expr: 'N = n₁ × t₁ + n₂ × (t₂ − t₁)',
        body: '災害直後の t₁ 日は施設にいる全員が、その後外部から給水を受けられるまでの (t₂ − t₁) 日は対策活動の職員だけが水を使うと考え、人数 × 日数を足し合わせます。',
      },
      {
        title: '飲料水・雑用水の必要水量（手引 様式 機-151 の計算項目）',
        expr: 'Qa = qa × N ÷ 1000、 Qb = (qb × N + qc × t₂) ÷ 1000、 Qc = Qa + Qb',
        body: '延べ人日に1人1日当たりの水量（L）を掛け、1000 で割って m³ にします。雑用水には、災害復旧に必要な設備の補給水を t₂ 日分加えます。',
      },
      ...tank,
      {
        title: '非常用排水槽の容量（手引 様式 機-151 の計算項目）',
        expr: 'Nd = n₁ × t₁ + n₂ × (td − t₁)、 QdE = qd × Nd ÷ 1000、 判定 Vd ≥ QdE',
        body: '下水道に流せない間の排水を槽にためるための容量です。日数は、放流または汚水の搬出ができるようになるまでの td 日で数えます。',
      },
    ],
    symbols: [
      { symbol: 'n₁', origin: `number（数）の頭文字 n に番号を添えた表記。${TEBIKI}`, meaning: '在庁舎人数（職員と来庁者）', unit: '人' },
      { symbol: 'n₂', origin: `同上`, meaning: '災害応急対策活動を行う職員等の数', unit: '人' },
      { symbol: 't₁', origin: `time（時間）の頭文字 t に番号を添えた表記。${TEBIKI}`, meaning: '災害発生後、一般職員等が施設を離れるまでの日数', unit: '日' },
      { symbol: 't₂', origin: '同上', meaning: '災害発生後、外部からの給水が得られるまでの日数', unit: '日' },
      { symbol: 'N', origin: 'Number（数）の頭文字。本サイトの表記', meaning: '給水の延べ人日', unit: '人·日' },
      { symbol: 'qa', origin: `小文字の q（単位当たりの量）に a（飲料水）を添えた表記。${TEBIKI}`, meaning: '1人1日当たりの飲料水の量', unit: 'L/(人·日)' },
      { symbol: 'qb', origin: `q に b（雑用水）を添えた表記。${TEBIKI}`, meaning: '1人1日当たりの雑用水の量', unit: 'L/(人·日)' },
      { symbol: 'qc', origin: `q に c を添えた表記。${TEBIKI}`, meaning: '重要設備の機能確保に必要な補給水の1日当たりの量', unit: 'L/日' },
      { symbol: 'Qa', origin: `Q（水量の慣用記号）に a（飲料水）を添えた表記。${TEBIKI}`, meaning: '飲料水の必要水量', unit: 'm³' },
      { symbol: 'Qb', origin: `Q に b（雑用水）を添えた表記。${TEBIKI}`, meaning: '雑用水の必要水量', unit: 'm³' },
      { symbol: 'Qc', origin: `Q に c を添えた表記。${TEBIKI}`, meaning: '必要水量の合計（飲料水 + 雑用水）', unit: 'm³' },
      { symbol: 'QTW', origin: `建築設備設計計算書作成の手引の様式の記号（Q：水量に TW を添えたもの。様式に添字の由来の説明はない）`, meaning: '受水タンクの容量（平常時の必要容量）', unit: 'm³' },
      { symbol: 'ke', origin: 'k（係数の慣用記号）に e（emergency：非常時）を添えた本サイトの表記', meaning: 'タンク容量のうち非常時の水量に見込む割合', unit: '—' },
      { symbol: 'Va', origin: 'V（Volume：容量）に a（飲料水。qa にそろえた添字）を添えた本サイトの表記', meaning: '受水タンクで確保できる非常時の水量', unit: 'm³' },
      ...tankSymbols,
      { symbol: 'qd', origin: `q に d（drainage：排水）を添えた表記。${TEBIKI}`, meaning: '1人1日当たりの排水量', unit: 'L/(人·日)' },
      { symbol: 'td', origin: 't（time：時間）に d（drainage：排水）を添えた本サイトの表記（手引の様式では t₂）', meaning: '放流または汚水の搬出ができるまでの日数', unit: '日' },
      { symbol: 'Nd', origin: 'N（延べ人日）に d（drainage：排水）を添えた本サイトの表記', meaning: '排水の延べ人日', unit: '人·日' },
      { symbol: 'QdE', origin: `Q に d（drainage：排水）と E（emergency：非常時）を添えた表記。${TEBIKI}`, meaning: '非常時にためる排水量', unit: 'm³' },
      { symbol: 'Vd', origin: 'V（Volume：容量）に d（drainage：排水）を添えた本サイトの表記', meaning: '非常用排水槽の有効容量（計画値）', unit: 'm³' },
    ],
  };
}

export const pl17Beginner: BeginnerDoc = {
  purpose: [
    '大地震などで水道や下水道が止まっても、庁舎などで災害対応を続けられるように、ためておく水と、ためておける排水の量を見積もる計算です。',
    '基本設計で受水タンク・雑用水タンク・非常用排水槽の大きさを決める段階で使います。平常時の容量（PL-01 など）で求めたタンクで足りるかを確かめ、足りなければ容量を増やします。',
  ],
  terms: [
    { term: '甲類の施設', desc: '官庁施設の総合耐震・対津波計画基準で、災害応急対策活動に必要な施設などに求められる設備の耐震安全性の分類。大地震の後も相当期間、設備の機能を保つことが目標です。' },
    { term: '飲料水・雑用水', desc: '飲料水は飲む・調理する水、雑用水は便器の洗浄などに使う水です。必要な量が大きく違うので分けて計算します。' },
    { term: '延べ人日（人·日）', desc: '人数 × 日数の合計。1人1日当たりの水量を掛けると総量になります。' },
    { term: '非常用排水槽', desc: '下水道に流せない間、トイレなどの排水を一時的にためる槽。災害時だけ使う槽として計画します。' },
    { term: '非常時の水量に見込む割合', desc: 'タンクはいつも満水ではないため、容量の一部（手引の様式では 7 割）を非常時に使える量とみなします。' },
  ],
  example: {
    title: '在庁舎 300 人、対策活動の職員 50 人、t₁ = 1 日、t₂ = 7 日の庁舎',
    steps: [
      '延べ人日 N = 300 × 1 + 50 × (7 − 1) = 600 人·日',
      '飲料水 Qa = 4 × 600 ÷ 1000 = 2.40 m³、 雑用水 Qb = (30 × 600 + 200 × 7) ÷ 1000 = 19.40 m³',
      '受水タンク 10 m³ × 0.7 = 7.00 m³ ≧ 2.40 m³ なので OK',
      '雑用水タンク 30 m³ × 0.7 = 21.00 m³ ≧ 19.40 m³ なので OK',
      '排水 Nd = 300 × 1 + 50 × (7 − 1) = 600 人·日、 QdE = 30 × 600 ÷ 1000 = 18.00 m³。排水槽 20 m³ ≧ 18.00 m³ なので OK',
    ],
  },
  pitfalls: [
    '全員が t₂ 日間ずっと施設にいるとして計算し、過大な容量にしてしまう。一般職員は t₁ 日で施設を離れ、その後は対策活動の職員だけで数えます。',
    'タンクの容量そのものを非常時の水量とみなす。災害時にタンクが満水とは限らないので、割合 ke を掛けます。',
    '上水の受水タンクを必要以上に大きくする。平常時に水が入れ替わらず、残留塩素が減って水質が悪くなります。',
    '重要設備（冷却塔など）の補給水を見落とす。空調を続ける計画なら雑用水に加えます。',
    '排水の日数を給水の日数と同じにしてしまう。下水道の復旧は水道より遅れることがあるため、別に決めます。',
  ],
};
