import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

export function hv13Doc(v: Values): ToolDoc {
  const temps = String(v.dtmode) !== 'dt';
  const withVolume = typeof v.V === 'number' && v.V > 0;
  const formulas: ToolDoc['formulas'] = [];
  if (temps) formulas.push({ title: '吹出し温度差', expr: 'Δt = tr − ts', body: '室温と吹出し温度の差です。冷たい空気が室内で温まりながら顕熱負荷を取り除くので、この差が大きいほど少ない風量で済みます。' });
  formulas.push(
    {
      title: '送風量（顕熱による送風量の式）',
      expr: 'Q = qs ÷ (0.33 × Δt)',
      body: '送風した空気が Δt だけ温まる間に運び去る熱が、顕熱負荷 qs と釣り合う風量です。0.33 は 密度 1.2 kg/m³ × 定圧比熱 1.006 kJ/(kg·K) ÷ 3.6 ≒ 0.335 を丸めた係数で、qs を W、Q を m³/h で扱えるようにしています。',
    },
    { title: '毎分の送風量', expr: 'Q′ = Q ÷ 60', body: '空調機・送風機のカタログに合わせて m³/min に換算します。' },
    {
      title: '顕熱比',
      expr: 'SHF = qs ÷ (qs + qL)',
      body: '全熱負荷のうち顕熱が占める割合です。事務所では 0.8〜0.9 程度、人の多い会議室や飲食店では小さくなります。SHF が小さいほど除湿の能力が必要で、吹出し温度を低くする必要があります。',
    },
  );
  if (withVolume) formulas.push({ title: '換気回数換算', expr: 'n = Q ÷ V', body: '送風量が室容積の何回分にあたるかを示します。極端に少ないと室内の気流が行き渡らず、温度むらの原因になります。' });

  const symbols: SymbolDoc[] = [
    { symbol: 'qs', origin: 'q（熱量の慣用記号）に s（sensible：顕熱）を添えたもの', meaning: '室の顕熱負荷', unit: 'W' },
    { symbol: 'qL', origin: 'q に L（latent：潜熱）を添えたもの', meaning: '室の潜熱負荷', unit: 'W' },
  ];
  if (temps) {
    symbols.push(
      { symbol: 'tr', origin: 't（temperature：温度）に r（room：室）を添えたもの', meaning: '室温', unit: '℃' },
      { symbol: 'ts', origin: 't に s（supply：給気・吹出し）を添えたもの', meaning: '吹出し温度', unit: '℃' },
    );
  }
  symbols.push(
    { symbol: 'Δt', origin: 'Δ（デルタ）は差、t は temperature（温度）', meaning: '吹出し温度差', unit: 'K' },
    { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '送風量', unit: 'm³/h' },
    { symbol: 'Q′', origin: 'Q にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '送風量（毎分）', unit: 'm³/min' },
    { symbol: 'qt', origin: 'q に t（total：全）を添えたもの', meaning: '全熱負荷（顕熱 ＋ 潜熱）', unit: 'W' },
    { symbol: 'SHF', origin: 'Sensible Heat Factor（顕熱比）の略', meaning: '全熱負荷に対する顕熱負荷の割合', unit: '—' },
  );
  if (withVolume) {
    symbols.push(
      { symbol: 'V', origin: 'Volume（体積）の頭文字', meaning: '室容積', unit: 'm³' },
      { symbol: 'n', origin: 'number（回数）の頭文字', meaning: '送風量の換気回数換算', unit: '回/h' },
    );
  }
  return { formulas, symbols };
}

export const hv13Beginner: BeginnerDoc = {
  purpose: [
    '空調機が室へ送る空気の量（送風量）を、室の冷房負荷と吹出し温度差から求める計算です。あわせて、負荷のうち温度を下げる分の割合（顕熱比）を求め、除湿がどの程度必要かを確かめます。',
    '室ごとの冷房負荷を計算したあと、空調機の風量やダクト・吹出口の大きさを決める段階で使います。',
  ],
  terms: [
    { term: '顕熱負荷（W）', desc: '室の温度を上げる熱。日射、照明、機器、人体から出る熱のうち温度に関わる分です。' },
    { term: '潜熱負荷（W）', desc: '室の湿度を上げる熱。人の呼吸や汗、外気の水分など。取り除くには除湿が必要です。' },
    { term: '吹出し温度差（K）', desc: '室温と吹出し空気の温度の差。冷房では 10 K 前後が多く用いられます。' },
    { term: '顕熱比 SHF', desc: '顕熱負荷 ÷ 全熱負荷。1 に近いほど温度を下げるだけで済み、小さいほど除湿が必要です。' },
  ],
  example: {
    title: '顕熱負荷 10,000 W、潜熱負荷 2,000 W、室温 26 ℃、吹出し温度 16 ℃、室容積 300 m³',
    steps: [
      '吹出し温度差 Δt = 26 − 16 = 10 K',
      '送風量 Q = 10,000 ÷ (0.33 × 10) ≒ 3,030 m³/h（≒ 50.5 m³/min）',
      '全熱負荷 = 10,000 + 2,000 = 12,000 W、顕熱比 SHF = 10,000 ÷ 12,000 ≒ 0.833',
      '換気回数換算 n = 3,030 ÷ 300 ≒ 10.1 回/h',
    ],
  },
  pitfalls: [
    '全熱負荷（顕熱 ＋ 潜熱）で送風量を計算してしまう。送風量は顕熱負荷で決まります。',
    '負荷を kW で入れる。この式は W と m³/h の組み合わせ用です（kW なら 1000 倍して入れます）。',
    '吹出し温度差を大きく取り過ぎる。送風量は減りますが、吹出口付近が冷え過ぎたり結露したりします。',
    'SHF が小さい室で吹出し温度を高めに設定する。除湿が足りず、温度は合っても湿度が高い室になります。',
  ],
};
