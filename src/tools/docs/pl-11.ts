import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

/** 算定単位（n = k × X の X にあたる量） */
export type BasisId = 'A' | 'P' | 'Pc' | 'Pk' | 'R' | 'Ss' | 'Sc' | 'L' | 'H' | 'C' | 'G';

export const BASIS: Record<BasisId, { label: string; unit: string; symbol: string; origin: string }> = {
  A: { label: '延べ面積', unit: 'm²', symbol: 'A', origin: 'JIS A 3302 の記号。Area（面積）の頭文字' },
  P: { label: '定員', unit: '人', symbol: 'P', origin: 'JIS A 3302 の記号。Person（人）に由来' },
  Pc: { label: '収容人員', unit: '人', symbol: 'P', origin: 'JIS A 3302 の記号。Person（人）に由来' },
  Pk: { label: '駐車ます数', unit: 'ます', symbol: 'P', origin: 'JIS A 3302 の記号（表では駐車ます数も P で表す）' },
  R: { label: '客室数', unit: '室', symbol: 'R', origin: 'JIS A 3302 の記号。Room（客室）の頭文字' },
  Ss: { label: '打席数', unit: '席', symbol: 'S', origin: 'JIS A 3302 の記号（表では打席数を S で表す）' },
  Sc: { label: 'コート面数', unit: '面', symbol: 'S', origin: 'JIS A 3302 の記号（表ではコート面数も S で表す）' },
  L: { label: 'レーン数', unit: 'レーン', symbol: 'L', origin: 'JIS A 3302 の記号。Lane（レーン）の頭文字' },
  H: { label: 'ホール数', unit: 'ホール', symbol: 'H', origin: 'JIS A 3302 の記号。Hole（ホール）の頭文字' },
  C: { label: '総便器数（大便器・小便器・両用便器の合計）', unit: '個', symbol: 'C', origin: 'JIS A 3302 の記号（表の注(1)により大便器・小便器・両用便器の合計）' },
  G: { label: '営業所数', unit: '営業所', symbol: 'G', origin: '本サイトの表記（gas station の G）。JIS A 3302 は「1営業所当たり n = 20」と定める' },
};

export type UseKind = 'linear' | 'house' | 'apt' | 'hospital' | 'station' | 'cut' | 'custom';

export interface UseDef {
  value: string;
  /** 類似用途別番号と記号（例：9 イ） */
  no: string;
  label: string;
  kind: UseKind;
  k?: number;
  basis?: BasisId;
  /** 病院：300床未満の係数、300床以上の係数と定数 */
  hosp?: { k1: number; k2: number; c2: number };
  /** 便器数方式：t の範囲 */
  tRange?: [number, number];
}

/** JIS A 3302:2000 表（建築用途別処理対象人員算定基準）。原文の表で確認した値のみ */
export const USES: UseDef[] = [
  { value: 'assembly', no: '1 イ', label: '公会堂・集会場・劇場・映画館・演芸場', kind: 'linear', k: 0.08, basis: 'A' },
  { value: 'race', no: '1 ロ', label: '競輪場・競馬場・競艇場', kind: 'linear', k: 16, basis: 'C' },
  { value: 'arena', no: '1 ハ', label: '観覧場・体育館', kind: 'linear', k: 0.065, basis: 'A' },
  { value: 'house', no: '2 イ', label: '住宅', kind: 'house' },
  { value: 'apt', no: '2 ロ', label: '共同住宅', kind: 'apt', k: 0.05 },
  { value: 'lodging', no: '2 ハ', label: '下宿・寄宿舎', kind: 'linear', k: 0.07, basis: 'A' },
  { value: 'dorm', no: '2 ニ', label: '学校寄宿舎・自衛隊キャンプ宿舎・老人ホーム・養護施設', kind: 'linear', k: 1, basis: 'P' },
  { value: 'hotel_b', no: '3 イ', label: 'ホテル・旅館（結婚式場又は宴会場をもつ場合）', kind: 'linear', k: 0.15, basis: 'A' },
  { value: 'hotel', no: '3 イ', label: 'ホテル・旅館（結婚式場又は宴会場をもたない場合）', kind: 'linear', k: 0.075, basis: 'A' },
  { value: 'motel', no: '3 ロ', label: 'モーテル', kind: 'linear', k: 5, basis: 'R' },
  { value: 'hostel', no: '3 ハ', label: '簡易宿泊所・合宿所・ユースホステル・青年の家', kind: 'linear', k: 1, basis: 'P' },
  { value: 'hosp_k', no: '4 イ', label: '病院・療養所・伝染病院（業務用厨房設備又は洗濯設備を設ける場合）', kind: 'hospital', hosp: { k1: 8, k2: 11.43, c2: 2400 } },
  { value: 'hosp', no: '4 イ', label: '病院・療養所・伝染病院（業務用厨房設備又は洗濯設備を設けない場合）', kind: 'hospital', hosp: { k1: 5, k2: 7.14, c2: 1500 } },
  { value: 'clinic', no: '4 ロ', label: '診療所・医院', kind: 'linear', k: 0.19, basis: 'A' },
  { value: 'shop', no: '5 イ', label: '店舗・マーケット', kind: 'linear', k: 0.075, basis: 'A' },
  { value: 'dept', no: '5 ロ', label: '百貨店', kind: 'linear', k: 0.15, basis: 'A' },
  { value: 'rest', no: '5 ハ', label: '飲食店（一般の場合）', kind: 'linear', k: 0.72, basis: 'A' },
  { value: 'rest_h', no: '5 ハ', label: '飲食店（汚濁負荷の高い場合）', kind: 'linear', k: 2.94, basis: 'A' },
  { value: 'rest_l', no: '5 ハ', label: '飲食店（汚濁負荷の低い場合）', kind: 'linear', k: 0.55, basis: 'A' },
  { value: 'cafe', no: '5 ニ', label: '喫茶店', kind: 'linear', k: 0.8, basis: 'A' },
  { value: 'billiard', no: '6 イ', label: '玉突場・卓球場', kind: 'linear', k: 0.075, basis: 'A' },
  { value: 'pachinko', no: '6 ロ', label: 'パチンコ店', kind: 'linear', k: 0.11, basis: 'A' },
  { value: 'go', no: '6 ハ', label: '囲碁クラブ・マージャンクラブ', kind: 'linear', k: 0.15, basis: 'A' },
  { value: 'disco', no: '6 ニ', label: 'ディスコ', kind: 'linear', k: 0.5, basis: 'A' },
  { value: 'golfrange', no: '6 ホ', label: 'ゴルフ練習場', kind: 'linear', k: 0.25, basis: 'Ss' },
  { value: 'bowling', no: '6 ヘ', label: 'ボーリング場', kind: 'linear', k: 2.5, basis: 'L' },
  { value: 'batting', no: '6 ト', label: 'バッティング場', kind: 'linear', k: 0.2, basis: 'Ss' },
  { value: 'tennis_n', no: '6 チ', label: 'テニス場（ナイター設備を設ける場合）', kind: 'linear', k: 3, basis: 'Sc' },
  { value: 'tennis', no: '6 チ', label: 'テニス場（ナイター設備を設けない場合）', kind: 'linear', k: 2, basis: 'Sc' },
  { value: 'amuse', no: '6 リ', label: '遊園地・海水浴場', kind: 'linear', k: 16, basis: 'C' },
  { value: 'pool', no: '6 ヌ', label: 'プール・スケート場', kind: 'cut', tRange: [1, 2] },
  { value: 'camp', no: '6 ル', label: 'キャンプ場', kind: 'linear', k: 0.56, basis: 'Pc' },
  { value: 'golf', no: '6 ヲ', label: 'ゴルフ場', kind: 'linear', k: 21, basis: 'H' },
  { value: 'sa_wc', no: '7 イ', label: 'サービスエリア 便所（一般部）', kind: 'linear', k: 3.6, basis: 'Pk' },
  { value: 'sa_wc_t', no: '7 イ', label: 'サービスエリア 便所（観光部）', kind: 'linear', k: 3.83, basis: 'Pk' },
  { value: 'pa', no: '7 イ', label: 'サービスエリア 便所（売店なしPA）', kind: 'linear', k: 2.55, basis: 'Pk' },
  { value: 'sa_shop', no: '7 イ', label: 'サービスエリア 売店（一般部）', kind: 'linear', k: 2.66, basis: 'Pk' },
  { value: 'sa_shop_t', no: '7 イ', label: 'サービスエリア 売店（観光部）', kind: 'linear', k: 2.81, basis: 'Pk' },
  { value: 'parking', no: '7 ロ', label: '駐車場・自動車車庫', kind: 'cut', tRange: [0.4, 2] },
  { value: 'gas', no: '7 ハ', label: 'ガソリンスタンド', kind: 'linear', k: 20, basis: 'G' },
  { value: 'school', no: '8 イ', label: '保育所・幼稚園・小学校・中学校', kind: 'linear', k: 0.2, basis: 'P' },
  { value: 'hschool', no: '8 ロ', label: '高等学校・大学・各種学校', kind: 'linear', k: 0.25, basis: 'P' },
  { value: 'library', no: '8 ハ', label: '図書館', kind: 'linear', k: 0.08, basis: 'A' },
  { value: 'office_k', no: '9 イ', label: '事務所（業務用厨房設備を設ける場合）', kind: 'linear', k: 0.075, basis: 'A' },
  { value: 'office', no: '9 イ', label: '事務所（業務用厨房設備を設けない場合）', kind: 'linear', k: 0.06, basis: 'A' },
  { value: 'factory_k', no: '10 イ', label: '工場・作業所・研究所・試験所（業務用厨房設備を設ける場合）', kind: 'linear', k: 0.75, basis: 'P' },
  { value: 'factory', no: '10 イ', label: '工場・作業所・研究所・試験所（業務用厨房設備を設けない場合）', kind: 'linear', k: 0.3, basis: 'P' },
  { value: 'market', no: '11 イ', label: '市場', kind: 'linear', k: 0.02, basis: 'A' },
  { value: 'pbath', no: '11 ロ', label: '公衆浴場', kind: 'linear', k: 0.17, basis: 'A' },
  { value: 'ptoilet', no: '11 ハ', label: '公衆便所', kind: 'linear', k: 16, basis: 'C' },
  { value: 'station', no: '11 ニ', label: '駅・バスターミナル', kind: 'station' },
  { value: 'custom', no: '—', label: '表にない用途（算定係数を入力）', kind: 'custom' },
];

export const useOf = (value: string): UseDef => USES.find((u) => u.value === value) ?? USES[USES.length - 1];

const N_SYM: SymbolDoc = { symbol: 'n', origin: 'JIS A 3302 の記号。number（人数）の頭文字', meaning: '処理対象人員', unit: '人' };
const K_SYM: SymbolDoc = { symbol: 'k', origin: '係数（coefficient）を表す慣用記号。JIS A 3302 の算定式の係数を本サイトでは k と表記', meaning: '算定係数（JIS A 3302 の表の値）', unit: '—' };

export function pl11Doc(v: Values): ToolDoc {
  const u = useOf(String(v.use));
  const title = `処理対象人員（JIS A 3302 表 ${u.no} ${u.label}）`;
  if (u.kind === 'linear' && u.basis) {
    const b = BASIS[u.basis];
    return {
      formulas: [{ title, expr: `n = ${u.k} × ${b.symbol}`, body: `算定単位（${b.label}）に、表の係数 ${u.k} を掛けて処理対象人員を求めます。同じ建物に複数の用途がある場合は、用途ごとに求めて合計します（JIS A 3302 3.2）。` }],
      symbols: [N_SYM, K_SYM, { symbol: b.symbol, origin: b.origin, meaning: b.label, unit: b.unit }],
    };
  }
  if (u.kind === 'house') {
    return {
      formulas: [{ title, expr: 'A ≤ 130 m² のとき n = 5、 130 m² < A のとき n = 7', body: '住宅は延べ面積で 5 人か 7 人のどちらかになります。130 m² の値は、その地域の住宅の平均的な延べ面積に応じて増減できるとされています（表の注(2)）。特定行政庁の運用を確認してください。' }],
      symbols: [N_SYM, { symbol: 'A', origin: 'JIS A 3302 の記号。Area（面積）の頭文字', meaning: '住宅の延べ面積', unit: 'm²' }],
    };
  }
  if (u.kind === 'apt') {
    if (String(v.aptm) === 'total') {
      return {
        formulas: [{ title, expr: 'n = 0.05 × A', body: '建物全体の延べ面積に 0.05 を掛けます。1戸当たりの上限・下限（3.5 人または 2 人、6 人）を反映するには「戸数で計算」を選んでください。' }],
        symbols: [N_SYM, K_SYM, { symbol: 'A', origin: 'JIS A 3302 の記号。Area（面積）の頭文字', meaning: '共同住宅の延べ面積', unit: 'm²' }],
      };
    }
    return {
      formulas: [
        { title: `1戸当たりの人員（JIS A 3302 表 ${u.no} 共同住宅）`, expr: 'n₁ = 0.05 × a', body: '1戸当たりの延べ面積に 0.05 を掛けます。' },
        { title: '1戸当たりの上限・下限（同表のただし書き）', expr: 'n₁ ≤ 3.5 のとき n₁′ = nmin（3.5 人、1居室だけの住戸は 2 人）、 n₁ ≥ 6 のとき n₁′ = 6、 それ以外は n₁′ = n₁', body: '小さな住戸でも 3.5 人（1居室だけで構成される住戸は 2 人）を下限とし、大きな住戸でも 6 人を上限とします。居室は建築基準法の居室で、共同住宅の台所・食事室は除きます（表の注(3)）。' },
        { title: '処理対象人員', expr: 'n = n₁′ × N', body: '同じ広さの住戸の数を掛けます。広さの違う住戸がある場合は、住戸の種類ごとに計算して合計してください。' },
      ],
      symbols: [
        N_SYM,
        K_SYM,
        { symbol: 'a', origin: 'area（面積）の頭文字。本サイトの表記', meaning: '1戸当たりの延べ面積', unit: 'm²' },
        { symbol: 'n₁', origin: 'n に添字 1（1戸当たり）を付けた本サイトの表記', meaning: '1戸当たりの人員（上下限を適用する前）', unit: '人' },
        { symbol: 'nmin', origin: 'n に min（minimum：最小）を添えた本サイトの表記', meaning: '1戸当たりの下限（3.5 人、1居室だけの住戸は 2 人）', unit: '人' },
        { symbol: 'nmax', origin: 'n に max（maximum：最大）を添えた本サイトの表記', meaning: '1戸当たりの上限（6 人）', unit: '人' },
        { symbol: 'n₁′', origin: 'n₁ にダッシュ（′）を付け、上下限を適用した値を表す本サイトの表記', meaning: '1戸当たりの人員（上下限を適用した値）', unit: '人' },
        { symbol: 'N', origin: 'Number（数）の頭文字。本サイトの表記', meaning: '戸数', unit: '戸' },
      ],
    };
  }
  if (u.kind === 'hospital') {
    const h = u.hosp!;
    return {
      formulas: [{ title, expr: `B < 300 のとき n = ${h.k1} × B、 B ≥ 300 のとき n = ${h.k2} × (B − 300) + ${h.c2.toLocaleString('ja-JP')}`, body: 'ベッド数で求めます。300 床以上の部分は 1 床当たりの係数が変わります。業務用厨房設備・洗濯設備の有無で式が異なります。' }],
      symbols: [
        N_SYM,
        { symbol: 'B', origin: 'JIS A 3302 の記号。Bed（ベッド）の頭文字', meaning: 'ベッド数', unit: '床' },
        { symbol: 'k₁', origin: '係数の慣用記号 k に番号を添えた本サイトの表記', meaning: '300 床未満の場合の係数', unit: '人/床' },
        { symbol: 'k₂', origin: '同上', meaning: '300 床以上の場合の、300 床を超える部分の係数', unit: '人/床' },
        { symbol: 'c₂', origin: 'constant（定数）の頭文字 c に番号を添えた本サイトの表記', meaning: '300 床以上の場合の定数（300 床分の人員）', unit: '人' },
      ],
    };
  }
  if (u.kind === 'station') {
    return {
      formulas: [
        { title: '係数（JIS A 3302 表 11 ニ）', expr: 'P < 100,000 のとき k = 0.008、 100,000 ≤ P < 200,000 のとき k = 0.010、 200,000 ≤ P のとき k = 0.013', body: '1日の乗降客数の区分で係数が決まります。' },
        { title, expr: 'n = k × P', body: '乗降客数に係数を掛けます。' },
      ],
      symbols: [N_SYM, K_SYM, { symbol: 'P', origin: 'JIS A 3302 の記号', meaning: '乗降客数', unit: '人/日' }],
    };
  }
  if (u.kind === 'cut') {
    const [t1, t2] = u.tRange!;
    return {
      formulas: [{ title, expr: 'n = (20 × C + 120 × U) ÷ 8 × t', body: `便器の数から求めます。t は単位便器当たりの1日平均使用時間で、この用途では ${t1}〜${t2} 時間です。女子専用便所では便器数のおおむね 1/2 を小便器とみなします（表の注(4)）。` }],
      symbols: [
        N_SYM,
        { symbol: 'C', origin: 'JIS A 3302 の記号', meaning: '大便器数', unit: '個' },
        { symbol: 'U', origin: 'JIS A 3302 の記号。Urinal（小便器）の頭文字', meaning: '小便器数', unit: '個' },
        { symbol: 't', origin: 'JIS A 3302 の記号。time（時間）の頭文字', meaning: '単位便器当たり1日平均使用時間', unit: 'h' },
      ],
    };
  }
  return {
    formulas: [{ title: '処理対象人員（表にない用途）', expr: 'n = k × X', body: 'JIS A 3302 の 3.1 により、特殊な用途は表に準じて算定します。類似する用途の算定式や、特定行政庁・審査機関の指示による係数を入力してください。' }],
    symbols: [
      N_SYM,
      { symbol: 'k', origin: '係数（coefficient）を表す慣用記号。本サイトの表記', meaning: '算定係数（利用者が入力）', unit: '人/算定単位' },
      { symbol: 'X', origin: '未知の量を表す慣用記号。本サイトの表記', meaning: '算定単位の数量（延べ面積・定員など）', unit: '—' },
    ],
  };
}

export const pl11Beginner: BeginnerDoc = {
  purpose: [
    '浄化槽の大きさ（人槽）を決めるもとになる「処理対象人員」を、建物の用途と規模から求める計算です。実際にその建物を使う人数ではなく、汚水の量を人数に換算した値です。',
    '下水道のない地域で建物を計画するとき、基本設計の段階で浄化槽の規模と設置スペースを見積もるのに使います。建築確認・浄化槽の設置届でもこの値を示します。',
  ],
  terms: [
    { term: '処理対象人員（人）', desc: '浄化槽で処理する汚水の量を、1人1日当たりの量で割って人数に換算したもの。浄化槽はこの人数以上の人槽を選びます。' },
    { term: '人槽', desc: '浄化槽の処理能力を人数で表したもの。5人槽、10人槽など。' },
    { term: '延べ面積（m²）', desc: '建物の各階の床面積の合計。' },
    { term: '業務用厨房設備', desc: '社員食堂など、営業・業務のための厨房。あると汚水が増えるため係数が大きくなります。' },
    { term: '類似用途別番号', desc: 'JIS A 3302 の表で用途を分類した番号（1 集会場施設関係 〜 11 その他）。' },
  ],
  example: {
    title: '事務所（業務用厨房設備なし）、延べ面積 3,000 m² の場合',
    steps: [
      'JIS A 3302 表 9 イ の事務所（業務用厨房設備を設けない場合）の算定式は n = 0.06 A',
      'n = 0.06 × 3,000 = 180 人',
      '同じ建物に店舗 200 m² があれば、店舗の n = 0.075 × 200 = 15 人を加えて 195 人',
      '共同住宅で 1戸 60 m² の住戸が 20 戸なら、1戸当たり 0.05 × 60 = 3 人 → 下限 3.5 人を適用し、3.5 × 20 = 70 人',
    ],
  },
  pitfalls: [
    '実際の利用人数を入れてしまう。処理対象人員は表の算定式で求めます。',
    '複合用途の建物で、主な用途だけで計算する。用途ごとに求めて合計します（JIS A 3302 3.2）。',
    '共同住宅で 1戸当たりの上限（6人）・下限（3.5人、1居室は2人）を忘れる。',
    '事務所や工場で、業務用厨房設備の有無を確認しない。係数が大きく変わります。',
    '表が実情に合わない場合の増減や住宅の 130 m² の扱いは、特定行政庁ごとに運用が異なります。',
  ],
};
