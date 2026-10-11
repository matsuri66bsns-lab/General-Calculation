import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const S = {
  q: { symbol: 'q', origin: '熱量を表す慣用記号（小文字の q は単位時間当たりの熱量）', meaning: '室内の発熱量（換気で除去する熱量）', unit: 'kW' },
  S: { symbol: 'S', origin: '皮相電力（apparent power）を表す電気の慣用記号', meaning: '変圧器容量の合計', unit: 'kVA' },
  r: { symbol: 'r', origin: 'rate（率）の頭文字。本サイトの表記', meaning: '変圧器の損失率（容量に対する損失の割合）', unit: '%' },
  qo: { symbol: 'qo', origin: 'q に o（other：その他）を添えた本サイトの表記', meaning: '変圧器以外の発熱量（盤類・照明など）', unit: 'kW' },
  ti: { symbol: 'ti', origin: 't（temperature：温度）に i（inside：室内）を添えたもの', meaning: '室温の上限（許容室温）', unit: '℃' },
  to: { symbol: 'to', origin: 't に o（outside：外気）を添えたもの', meaning: '設計用外気温度', unit: '℃' },
  dt: { symbol: 'Δt', origin: 'Δ（デルタ）は差を表す記号。t は temperature（温度）', meaning: '許容温度上昇（室温の上限と給気温度の差）', unit: 'K' },
  rho: { symbol: 'ρ', origin: 'ギリシャ文字ロー。密度を表す慣用記号', meaning: '空気の密度', unit: 'kg/m³' },
  cp: { symbol: 'cp', origin: 'c（比熱 specific heat の慣用記号）に p（pressure：定圧）を添えたもの', meaning: '空気の定圧比熱', unit: 'kJ/(kg·K)' },
  Q: { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '必要換気量', unit: 'm³/h' },
  Qd: { symbol: 'Q′', origin: 'Q にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '必要換気量（毎分）', unit: 'm³/min' },
} satisfies Record<string, SymbolDoc>;

export function hv06Doc(v: Values): ToolDoc {
  const trans = String(v.qmode) === 'trans';
  const temps = String(v.dtmode) !== 'dt';
  const formulas: ToolDoc['formulas'] = [];
  if (trans) {
    formulas.push({
      title: '変圧器の損失による発熱量',
      expr: 'q = S × r ÷ 100 + qo',
      body: '変圧器は電力を変換するときに一部を熱として失います。容量 S に損失率 r を掛けて損失（発熱量）とみなし、盤類・照明などその他の発熱 qo を足します。損失率は負荷率で変わるため、メーカー資料で確認した値を使います。',
    });
  }
  if (temps) {
    formulas.push({
      title: '許容温度上昇',
      expr: 'Δt = ti − to',
      body: '取り入れた外気（温度 to）が室内で温まり、上限の室温 ti で排出されると考えます。この温度差が、空気1 m³ が運び出せる熱の大きさを決めます。',
    });
  }
  formulas.push(
    {
      title: '必要換気量（建築設備設計基準の発熱量による換気量）',
      expr: 'Q = 3600 × q ÷ (ρ × cp × Δt)',
      body: '空気 1 kg を Δt だけ温めるのに必要な熱は cp × Δt [kJ] です。発熱量 q [kJ/s] をこれで割ると必要な空気の質量流量 [kg/s] になり、密度 ρ で割って体積に、3600 を掛けて毎時に直します。ρ × cp ÷ 3600 ≒ 0.335 なので、q を W で表せば Q ≒ q ÷ (0.335 × Δt) とも書けます。',
    },
    { title: '毎分の換気量', expr: 'Q′ = Q ÷ 60', body: '送風機・換気扇のカタログは m³/min 表記も多いため、60 で割って換算します。' },
  );
  const symbols: SymbolDoc[] = [S.q];
  if (trans) symbols.push(S.S, S.r, S.qo);
  if (temps) symbols.push(S.ti, S.to);
  symbols.push(S.dt, S.rho, S.cp, S.Q, S.Qd);
  return { formulas, symbols };
}

export const hv06Beginner: BeginnerDoc = {
  purpose: [
    '変圧器や電動機は運転中に熱を出し、閉じた室ではその熱で室温が上がり続けます。外気を取り入れて熱を外へ運び出し、室温を機器の許容温度以下に保つための換気量を求める計算です。',
    '電気室・機械室・エレベーター機械室の換気設備（送風機・ガラリ）を計画する段階で使います。結果の換気量で送風機を選び、ダクトやガラリの大きさを決めます。',
  ],
  terms: [
    { term: '発熱量（kW）', desc: '機器が1秒間に出す熱の量。1 kW = 1 kJ/s。変圧器では「損失」（電力のうち熱になる分）が発熱量にあたります。' },
    { term: '許容温度上昇（K）', desc: '室温の上限から外気温度を引いた温度差。温度の差は K（ケルビン）で表し、1 K = 1 ℃ の差です。' },
    { term: '空気の密度（kg/m³）', desc: '空気 1 m³ の質量。20 ℃ 付近で約 1.2 kg/m³ です。' },
    { term: '定圧比熱（kJ/(kg·K)）', desc: '空気 1 kg の温度を 1 K 上げるのに必要な熱量。空気は約 1.006 kJ/(kg·K) です。' },
    { term: '損失率（%）', desc: '変圧器容量に対する損失の割合。無負荷損（常に出る損失）と負荷損（負荷の2乗に比例）を合わせたものです。' },
  ],
  example: {
    title: '変圧器 1,000 kVA、損失率 1.5 %、その他 3 kW、室温上限 40 ℃、外気 35 ℃ の電気室',
    steps: [
      '発熱量 q = 1,000 × 1.5 ÷ 100 + 3 = 18 kW',
      '許容温度上昇 Δt = 40 − 35 = 5 K',
      '必要換気量 Q = 3600 × 18 ÷ (1.2 × 1.006 × 5) = 64,800 ÷ 6.036 ≒ 10,736 m³/h',
      '毎分に直すと Q′ = 10,736 ÷ 60 ≒ 178.9 m³/min',
    ],
  },
  pitfalls: [
    '発熱量の W と kW を混同する。この式の q は kW です（W なら 1000 で割ってから入れます）。',
    '変圧器容量（kVA）をそのまま発熱量にしてしまう。発熱するのは容量のごく一部（損失分）です。',
    '外気温度を低く見込み過ぎる。夏の設計用外気温度で計算しないと、真夏に室温が上限を超えます。',
    '温度差が小さいと換気量が急に大きくなります。Δt が数 K しか取れない場合は冷房との併用を検討します。',
  ],
};
