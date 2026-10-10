import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const S = {
  Em: { symbol: 'Em', origin: 'E（照度。フランス語 éclairement に由来する慣用記号）に m（maintained：維持）を添えた JIS Z 9110 の記号（規格では Ē m）', meaning: '目標照度（推奨維持照度）', unit: 'lx' },
  X: { symbol: 'X', origin: '室の間口を表す慣用の記号（横方向の寸法）', meaning: '室の間口', unit: 'm' },
  Y: { symbol: 'Y', origin: '室の奥行を表す慣用の記号（縦方向の寸法）', meaning: '室の奥行', unit: 'm' },
  H: { symbol: 'H', origin: 'Height（高さ）の頭文字', meaning: '作業面から光源（器具）までの高さ', unit: 'm' },
  A: { symbol: 'A', origin: 'Area（面積）の頭文字', meaning: '床面積（照度を求める作業面の面積）', unit: 'm²' },
  K: { symbol: 'K', origin: '室指数（room index）の慣用記号。照明率表で使われる記号', meaning: '室の形と器具の高さで決まる指数。照明率表を読むときに使う', unit: '—' },
  F: { symbol: 'F', origin: '光束（luminous flux）の慣用記号。英語の Flux の頭文字', meaning: '器具1台の光束（LED 器具は器具光束）', unit: 'lm' },
  U: { symbol: 'U', origin: '照明率（utilization factor）の頭文字', meaning: '器具から出た光束のうち作業面に届く割合', unit: '—' },
  M: { symbol: 'M', origin: '保守率（maintenance factor）の頭文字', meaning: '光源の光束低下や汚れによる照度の低下を見込む係数', unit: '—' },
  N: { symbol: 'N', origin: 'Number（数）の頭文字', meaning: '照明器具の台数', unit: '台' },
  Nr: { symbol: 'Nr', origin: 'N に r（required：必要）を添えた本サイトの表記', meaning: '目標照度に必要な台数（切り上げ前の計算値）', unit: '台' },
  E: { symbol: 'E', origin: '照度の慣用記号（フランス語 éclairement：照らすこと に由来）', meaning: '作業面の平均照度', unit: 'lx' },
} satisfies Record<string, SymbolDoc>;

const COMMON: ToolDoc['formulas'] = [
  { title: '床面積', expr: 'A = X × Y', body: '間口と奥行を掛けて床面積を求めます。' },
  { title: '室指数', expr: 'K = X × Y ÷ (H × (X + Y))', body: '室の広さに対して器具が高いほど小さくなる指数です。室指数が小さい（細長い、天井が高い）室は、光が壁に当たって吸収される割合が多く、照明率が小さくなります。この値と天井・壁・床の反射率で、器具の照明率表から照明率 U を読み取ります。' },
];

export function el09Doc(v: Values): ToolDoc {
  if (String(v.method) === 'E') {
    return {
      formulas: [
        ...COMMON,
        { title: '平均照度（光束法）', expr: 'E = N × F × U × M ÷ A', body: '器具全体の光束 N × F のうち、作業面に届く割合が照明率 U、時間がたって低下した後の割合が保守率 M です。作業面に届く光束を面積で割ると平均照度になります。' },
        { title: '判定', expr: 'E ≥ Em', body: '平均照度が目標照度（JIS Z 9110 の推奨維持照度など）以上なら適合（OK）です。' },
      ],
      symbols: [S.Em, S.X, S.Y, S.H, S.A, S.K, S.F, S.U, S.M, S.N, S.E],
    };
  }
  return {
    formulas: [
      ...COMMON,
      { title: '必要台数（光束法）', expr: 'Nr = Em × A ÷ (F × U × M)', body: '目標照度 Em を床面積 A 全体で得るのに必要な光束 Em × A を、器具1台が作業面に届ける光束 F × U × M で割ります。' },
      { title: '台数の切り上げ', expr: 'N = Nr を切り上げた整数', body: '器具の台数は整数なので切り上げます。実際の台数は、配置の対称性（行列の並び）も考えて決めます。' },
      { title: 'その台数での平均照度', expr: 'E = N × F × U × M ÷ A', body: '切り上げた台数で得られる平均照度です。目標照度以上になります。' },
    ],
    symbols: [S.Em, S.X, S.Y, S.H, S.A, S.K, S.F, S.U, S.M, S.Nr, S.N, S.E],
  };
}

export const el09Beginner: BeginnerDoc = {
  purpose: [
    '部屋を必要な明るさにするために、照明器具が何台必要かを求める計算です。逆に、台数が決まっているときの平均の明るさも求められます。',
    '基本設計で器具の種類と概略の台数を決める段階で使います。実施設計では器具の配置を決め、必要に応じて照度分布のシミュレーションで確認します。',
  ],
  terms: [
    { term: '照度（lx：ルクス）', desc: '面に入る光の量の多さ。1 m² に 1 lm の光束が入ると 1 lx です。' },
    { term: '光束（lm：ルーメン）', desc: '光源や器具から出る光の量です。LED 器具はカタログの「器具光束」を使います。' },
    { term: '照明率', desc: '器具から出た光のうち作業面に届く割合です。器具の形と室の形・反射率で決まり、メーカーの照明率表に載っています。' },
    { term: '保守率', desc: '使っているうちに光源が暗くなったり器具が汚れたりして下がる分を見込む係数です。' },
    { term: '維持照度', desc: 'JIS Z 9110 で使う照度の考え方で、保守期間の終わりでも下回らないようにする平均照度です。' },
  ],
  example: {
    title: '事務室（750 lx）、間口 12 m・奥行 8 m、光源までの高さ 2.0 m、器具光束 5,000 lm、照明率 0.7、保守率 0.8 の場合',
    steps: [
      '床面積 A = 12 × 8 = 96 m²',
      '室指数 K = 96 ÷ (2.0 × (12 + 8)) = 2.40（この値で照明率表を読み、U = 0.7 を得たとします）',
      '必要台数 Nr = 750 × 96 ÷ (5,000 × 0.7 × 0.8) = 72,000 ÷ 2,800 ≒ 25.71 台',
      '切り上げて N = 26 台',
      'その台数での平均照度 E = 26 × 2,800 ÷ 96 ≒ 758 lx',
    ],
  },
  pitfalls: [
    '高さ H に天井高をそのまま入れる。作業面（机の高さ）から光源までの高さを使います。',
    '照明率を室指数や反射率と関係なく決める。必ず使う器具の照明率表から読み取ります。',
    '保守率を入れ忘れる（1 にする）。設置直後は明るくても、保守期間の終わりに目標照度を下回ります。',
    'ランプ交換型の器具で、ランプ1本の光束のまま計算する。器具1台に入るランプの本数を掛けます。',
    '光束法の結果は平均照度です。器具の配置が偏ると、場所によって目標照度を下回ることがあります。',
  ],
};
