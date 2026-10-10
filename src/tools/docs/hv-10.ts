import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

export function hv10Doc(v: Values): ToolDoc {
  const mode = String(v.mode);
  const cooling = mode === 'cond' || mode === 'cop';
  const formulas: ToolDoc['formulas'] = [];
  if (mode === 'cop') {
    formulas.push({ title: '圧縮機の入力', expr: 'W = qe ÷ COP', body: '成績係数 COP は「冷却能力 ÷ 入力」です。冷却能力を COP で割ると圧縮機の入力（消費電力）になります。' });
  }
  if (cooling) {
    formulas.push({
      title: '冷却水の放熱量',
      expr: 'qc = qe + W',
      body: '冷凍機は冷水から奪った熱（冷却能力 qe）に、圧縮機に加えた入力 W を足した熱を冷却水へ捨てます。冷却水が冷却塔へ運ぶ熱はこの合計です。',
    });
  }
  const qs = cooling ? 'qc' : 'q';
  formulas.push(
    {
      title: '必要水量',
      expr: `G = 60000 × ${qs} ÷ (c × ρ × Δt)`,
      body: `熱量 ${qs} [kJ/s] を、水 1 kg が運べる熱 c × Δt [kJ/kg] で割ると質量流量 [kg/s] になります。密度 ρ で割って体積 [m³/s] にし、1000 L/m³ と 60 s/min を掛けて L/min にします。ρ = 1000 なら G = 60 × ${qs} ÷ (c × Δt) ≒ 14.3 × ${qs} ÷ Δt です。`,
    },
    { title: '毎時の水量', expr: 'G′ = G × 60 ÷ 1000', body: 'ポンプや配管の資料で使う m³/h に換算します。' },
  );

  const symbols: SymbolDoc[] = [];
  if (cooling) {
    symbols.push({ symbol: 'qe', origin: 'q（熱量の慣用記号）に e（evaporator：蒸発器）を添えたもの', meaning: '冷凍機の冷却能力（冷水から奪う熱量）', unit: 'kW' });
    if (mode === 'cop') symbols.push({ symbol: 'COP', origin: 'Coefficient Of Performance（成績係数）の略', meaning: '冷却能力 ÷ 入力。大きいほど省エネルギー', unit: '—' });
    symbols.push(
      { symbol: 'W', origin: 'Work（仕事）の頭文字。圧縮機の入力を表す慣用記号', meaning: '圧縮機の入力（消費電力）。吸収式では加熱量', unit: 'kW' },
      { symbol: 'qc', origin: 'q に c（condenser：凝縮器）を添えたもの', meaning: '冷却水の放熱量（冷却塔へ運ぶ熱量）', unit: 'kW' },
    );
  } else {
    symbols.push({ symbol: 'q', origin: '熱量を表す慣用記号（小文字の q は単位時間当たりの熱量）', meaning: '冷温水で運ぶ熱量（冷房能力・暖房能力など）', unit: 'kW' });
  }
  symbols.push(
    { symbol: 'Δt', origin: 'Δ（デルタ）は差、t は temperature（温度）', meaning: '往還温度差（往き温度と還り温度の差）', unit: 'K' },
    { symbol: 'c', origin: '比熱（specific heat capacity）を表す慣用記号', meaning: '水の比熱', unit: 'kJ/(kg·K)' },
    { symbol: 'ρ', origin: 'ギリシャ文字ロー。密度を表す慣用記号', meaning: '水の密度', unit: 'kg/m³' },
    { symbol: 'G', origin: '水量を表す慣用記号（空調・衛生分野で流量に用いる）', meaning: '必要水量', unit: 'L/min' },
    { symbol: 'G′', origin: 'G にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '必要水量（毎時）', unit: 'm³/h' },
  );
  return { formulas, symbols };
}

export const hv10Beginner: BeginnerDoc = {
  purpose: [
    '空調機に送る冷水・温水や、冷凍機から冷却塔へ熱を運ぶ冷却水が、毎分どれだけ必要かを求める計算です。水が運べる熱は「水量 × 比熱 × 温度差」で決まるので、熱量と温度差から水量が決まります。',
    '空調負荷から熱源機器の能力を決めたあと、ポンプの流量や配管の太さを決める段階で使います。',
  ],
  terms: [
    { term: '往還温度差（K）', desc: '機器へ送る水（往き）と戻ってくる水（還り）の温度差。冷水 7 ℃ で送り 12 ℃ で戻れば 5 K です。' },
    { term: '比熱（kJ/(kg·K)）', desc: '1 kg の物質を 1 K 温めるのに必要な熱量。水は約 4.186 kJ/(kg·K) です。' },
    { term: '冷却水', desc: '冷凍機の凝縮器で熱を受け取り、冷却塔で大気へ捨てるための水。' },
    { term: '成績係数 COP', desc: '冷却能力を入力（消費電力）で割った値。COP 4 なら 1 kW の電力で 4 kW の冷却ができます。' },
    { term: 'L/min と m³/h', desc: '1 m³/h = 1000 L ÷ 60 min ≒ 16.7 L/min。' },
  ],
  example: {
    title: '冷房能力 100 kW、往還温度差 5 K の冷水',
    steps: [
      '必要水量 G = 60000 × 100 ÷ (4.186 × 1000 × 5) = 6,000,000 ÷ 20,930 ≒ 286.7 L/min',
      '毎時に直すと G′ = 286.7 × 60 ÷ 1000 ≒ 17.2 m³/h',
      '冷却水の場合（冷却能力 100 kW、圧縮機入力 25 kW）は、放熱量 qc = 100 + 25 = 125 kW',
      '冷却水量 = 60000 × 125 ÷ (4.186 × 1000 × 5) ≒ 358.3 L/min',
    ],
  },
  pitfalls: [
    '冷却水量を冷却能力だけで計算してしまう。圧縮機の入力（吸収式は加熱量）も冷却水で捨てるので、放熱量は冷却能力より大きくなります。',
    '温度差を大きく取ると水量とポンプ動力は減りますが、コイルや熱源機の能力が下がることがあります。機器が対応する温度差を確認します。',
    'kW と W、L/min と m³/h を取り違える。この式の熱量は kW、結果は L/min です。',
    '不凍液（エチレングリコールなど）を使う系統で水の比熱をそのまま使う。不凍液は比熱が小さく、必要水量が増えます。',
  ],
};
