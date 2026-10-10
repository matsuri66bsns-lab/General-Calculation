import type { ToolDef } from '../core/types';
import { SheetBuilder } from '../core/sheet';
import { num, str } from '../core/values';
import { fp03Beginner, fp03Doc } from './docs/fp-03';

/** 施行規則第6条第1項の表（令別表第一の項ごとの算定基準面積） */
export const EXTINGUISHER_USES: { value: string; label: string; S0: number }[] = [
  { value: '1i', label: '(1)項イ 劇場・映画館・演芸場・観覧場', S0: 50 },
  { value: '2', label: '(2)項 キャバレー・遊技場・性風俗店・カラオケボックス等', S0: 50 },
  { value: '16-2', label: '(16の2)項 地下街', S0: 50 },
  { value: '16-3', label: '(16の3)項 準地下街', S0: 50 },
  { value: '17', label: '(17)項 重要文化財等の建造物', S0: 50 },
  { value: '1ro', label: '(1)項ロ 公会堂・集会場', S0: 100 },
  { value: '3', label: '(3)項 待合・料理店・飲食店', S0: 100 },
  { value: '4', label: '(4)項 百貨店・マーケット・物品販売店舗・展示場', S0: 100 },
  { value: '5', label: '(5)項 旅館・ホテル・宿泊所・寄宿舎・共同住宅', S0: 100 },
  { value: '6', label: '(6)項 病院・診療所・社会福祉施設・幼稚園等', S0: 100 },
  { value: '9', label: '(9)項 公衆浴場', S0: 100 },
  { value: '12', label: '(12)項 工場・作業場・スタジオ', S0: 100 },
  { value: '13', label: '(13)項 自動車車庫・駐車場・格納庫', S0: 100 },
  { value: '14', label: '(14)項 倉庫', S0: 100 },
  { value: '7', label: '(7)項 学校', S0: 200 },
  { value: '8', label: '(8)項 図書館・博物館・美術館', S0: 200 },
  { value: '10', label: '(10)項 車両の停車場・船舶や航空機の発着場', S0: 200 },
  { value: '11', label: '(11)項 神社・寺院・教会', S0: 200 },
  { value: '15', label: '(15)項 事務所など前各項に該当しない事業場', S0: 200 },
];

export const extinguisher: ToolDef = {
  id: 'FP-03',
  slug: 'extinguisher',
  category: 'fire',
  title: '消火器の必要能力単位',
  summary: '防火対象物の用途と延べ面積から、消火器の必要能力単位と本数の目安を求めます。',
  keywords: ['消火器', '能力単位', '算定基準面積', '消火器具', '延べ面積', '耐火構造', '難燃材料', 'A-3'],
  references: [
    '消防法施行令 第10条（消火器具に関する基準）',
    '消防法施行規則 第6条第1項（算定基準面積の表）、第2項（耐火構造・内装難燃の場合の2倍）',
    '消防法施行規則 第6条第6項（歩行距離20m以下の配置）',
  ],
  publishedAt: '2026-10-10',
  fields: [
    {
      type: 'select',
      key: 'use',
      label: '防火対象物の用途（令別表第一）',
      options: EXTINGUISHER_USES.map((u) => ({ value: u.value, label: `${u.label}（${u.S0} m²）` })),
      help: '括弧内は算定基準面積です。複合用途（(16)項）は、用途ごとの部分に分けて計算します。',
    },
    { type: 'number', key: 'A', label: '延べ面積（または床面積）', unit: 'm²', min: 0, exclusiveMin: true },
    {
      type: 'select',
      key: 'fr',
      label: '耐火構造かつ内装難燃',
      display: 'segmented',
      options: [
        { value: 'yes', label: '該当する（2倍）' },
        { value: 'no', label: '該当しない' },
      ],
      help: '特定主要構造部が耐火構造で、壁と天井の室内側の仕上げが難燃材料（不燃・準不燃を含む）なら、算定基準面積を2倍にできます。',
    },
    {
      type: 'number',
      key: 'u',
      label: '消火器1本の能力単位（A火災）',
      unit: '単位',
      min: 0,
      exclusiveMin: true,
      help: '消火器の銘板に「A-3」などと表示されている数値です。製品により異なるため、使う消火器の表示を確認してください。',
      suggestions: [
        { label: 'A-1', value: 1 },
        { label: 'A-2', value: 2 },
        { label: 'A-3（目安：10型粉末）', value: 3 },
        { label: 'A-4', value: 4 },
      ],
    },
  ],
  defaults: { use: '15', A: '1500', fr: 'yes', u: '3' },
  notes: [
    '必要能力単位は「延べ面積 ÷ 算定基準面積」を切り上げた値です（施行規則第6条第1項）。消火器の設置義務の有無（施行令第10条第1項）は判定していません。',
    '消火器は各階ごとに、防火対象物の各部分から歩行距離 20 m 以下となるように配置します（施行規則第6条第6項）。配置の条件から本数が増えることがあります。',
    '少量危険物・指定可燃物、変圧器などの電気設備、ボイラー室など多量の火気を使う場所には、別途付加設置が必要です（施行規則第6条第3項〜第5項）。',
    '消防用設備等は、所轄消防署の指導によって取扱いが異なる場合があります。設計の前に所轄消防と協議してください。',
  ],
  doc: fp03Doc,
  beginner: fp03Beginner,
  build(v) {
    const use = EXTINGUISHER_USES.find((u) => u.value === str(v, 'use')) ?? EXTINGUISHER_USES[0];
    const A = num(v, 'A');
    const fr = str(v, 'fr') === 'yes';
    const u = num(v, 'u');
    const m = fr ? 2 : 1;
    const S = use.S0 * m;
    const Nr = A / S;
    const Nu = Math.ceil(Nr);

    const s = new SheetBuilder();
    s.section('計算条件')
      .input('use', '防火対象物の用途', use.label)
      .input('S0', '算定基準面積', use.S0, { symbol: 'S₀', unit: 'm²', note: '施行規則第6条第1項の表' })
      .input('m', '耐火構造・内装難燃による倍率', m, { symbol: 'm', note: fr ? '該当する（施行規則第6条第2項）' : '該当しない' })
      .section('入力値')
      .input('A', '延べ面積', A, { symbol: 'A', unit: 'm²', digits: 2 })
      .input('u', '消火器1本の能力単位', u, { symbol: 'u', unit: '単位' })
      .section('計算')
      .calc('S', '算定に用いる面積', { symbol: 'S', unit: 'm²', value: S, expr: '{S0} × {m}', formula: '{S0}*{m}', digits: 0 })
      .calc('Nr', '能力単位の計算値', { symbol: 'Nr', unit: '単位', value: Nr, expr: '{A} ÷ {S}', formula: '{A}/{S}', digits: 2 })
      .calc('Nu', '必要能力単位', { symbol: 'Nu', unit: '単位', value: Nu, expr: '{Nr} を切り上げ', formula: 'ROUNDUP({Nr},0)', digits: 0 })
      .calc('n', '消火器の本数（能力単位からの最少本数）', {
        symbol: 'n',
        unit: '本',
        value: Math.ceil(Nu / u),
        expr: '{Nu} ÷ {u} を切り上げ',
        formula: 'ROUNDUP({Nu}/{u},0)',
        digits: 0,
        note: '歩行距離 20 m 以下の配置で本数が増えることがあります',
      })
      .highlight('Nu', 'n');
    return s.result();
  },
};
