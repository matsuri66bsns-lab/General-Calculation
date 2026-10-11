import type { BeginnerDoc, ToolDoc, Values } from '../../core/types';

export function cm04Doc(v: Values): ToolDoc {
  const lmin = String(v.funit) !== 'm3h';
  const fu = lmin ? 'L/min' : 'm³/h';
  const k = lmin ? '60000' : '3600';
  const kBody = lmin ? 'L/min を m³/s に直す係数 60000（1000 L × 60 秒）' : 'm³/h を m³/s に直す係数 3600（3600 秒）';
  const symbols = [
    { symbol: 'q', origin: '熱量（熱流量）を表す慣用記号', meaning: '単位時間あたりの熱量（顕熱）', unit: 'kW（= kJ/s）' },
    { symbol: 'm', origin: 'mass（質量）の頭文字。ここでは毎秒の質量＝質量流量', meaning: '質量流量', unit: 'kg/s' },
    { symbol: 'c', origin: '比熱（specific heat capacity）を表す慣用記号', meaning: '比熱。1 kg を 1 K 上げるのに必要な熱量', unit: 'kJ/(kg·K)' },
    { symbol: 'ρ', origin: 'ギリシャ文字ロー。密度を表す慣用記号', meaning: '流体の密度', unit: 'kg/m³' },
    { symbol: 'Δt', origin: 'Δ（デルタ：差）と t（temperature：温度）を組み合わせた慣用記号', meaning: '出入口の温度差', unit: 'K' },
    { symbol: 'V', origin: 'Volume（体積）の頭文字。ここでは時間あたりの体積＝体積流量', meaning: '体積流量', unit: fu },
  ];
  if (String(v.method) === 'flow') {
    return {
      formulas: [
        { title: '必要質量流量（顕熱の式）', expr: 'm = q ÷ (c × Δt)', body: '顕熱の式 q = m × c × Δt を質量流量について解いたものです。同じ熱量なら、温度差を大きくとるほど流量は少なくて済みます。' },
        { title: '体積流量への換算', expr: `V = m ÷ ρ × ${k}`, body: `質量流量を密度で割ると m³/s になり、${kBody}を掛けて ${fu} にします。` },
      ],
      symbols,
    };
  }
  return {
    formulas: [
      { title: '質量流量', expr: `m = V × ρ ÷ ${k}`, body: `体積流量に密度を掛けて質量にします。${kBody}で割って、毎秒の質量 kg/s にします。` },
      { title: '熱量（顕熱の式）', expr: 'q = m × c × Δt', body: '毎秒流れる質量に、比熱と温度差を掛けると、毎秒運ばれる熱量（kJ/s = kW）になります。' },
    ],
    symbols,
  };
}

export const cm04Beginner: BeginnerDoc = {
  purpose: [
    '冷温水や空気が、温度を変えながら運ぶ熱の量（顕熱）と流量の関係を求める計算です。',
    '空調負荷（kW）から冷温水の流量や送風量を決めるとき、逆に流量と出入口の温度差から機器の能力を確かめるときに使います。ポンプの吐出量やダクトの風量の元になる値です。',
  ],
  terms: [
    { term: '顕熱', desc: '温度の変化として現れる熱。水蒸気の凝縮・蒸発にともなう潜熱とは別に扱います。' },
    { term: '比熱 kJ/(kg·K)', desc: '1 kg の物質を 1 K（1 ℃）上げるのに必要な熱量。水は約 4.186、空気は約 1.006 です。' },
    { term: '温度差 K', desc: '出口と入口の温度の差。差を表すときは ℃ と K は同じ数値になります。' },
    { term: 'kW と kJ/s', desc: '1 kW = 1 kJ/s。毎秒 1 kJ の熱を運ぶ能力です。' },
  ],
  example: {
    title: '水 20 L/min、往還の温度差 5 K の場合',
    steps: [
      '質量流量 m = 20 × 1000 ÷ 60000 ≒ 0.3333 kg/s',
      '熱量 q = 0.3333 × 4.186 × 5 ≒ 6.98 kW',
      '逆に 10 kW を温度差 5 K で運ぶには、m = 10 ÷ (4.186 × 5) ≒ 0.4778 kg/s',
      '体積流量 V = 0.4778 ÷ 1000 × 60000 ≒ 28.7 L/min',
    ],
  },
  pitfalls: [
    '流量の単位（L/min、m³/h、m³/s）を混同する。式は kg/s で計算するので換算を忘れないようにします。',
    '空気の除湿をともなう冷却では潜熱も加わります。顕熱だけで冷却能力を決めると不足します。',
    '水の比熱を空気に使う（またはその逆）。約 4 倍違います。',
    '温度差を小さく見積もると必要流量が増え、配管やポンプが過大になります。',
  ],
};
