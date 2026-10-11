import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

export function pl16Doc(v: Values): ToolDoc {
  const simple = String(v.mode) === 'simple';
  const formulas: ToolDoc['formulas'] = [];
  const symbols: SymbolDoc[] = [];
  if (simple) {
    formulas.push({
      title: '循環流量（簡易な方法、手引 様式 機-117）',
      expr: 'W = a × q',
      body: '給湯量（同時使用流量）の一定割合を循環流量とする概算です。手引の様式では a = 0.2 としています。系統が大きい場合は配管の熱損失から求めてください。',
    });
    symbols.push(
      { symbol: 'q', origin: '流量を表す慣用記号。手引の様式の記号', meaning: '給湯量（同時使用流量）', unit: 'L/min' },
      { symbol: 'a', origin: '割合（allowance）を表す本サイトの表記', meaning: '循環流量の割合（給湯量に対して）', unit: '—' },
    );
  } else {
    formulas.push(
      {
        title: '区間の熱損失（建築設備設計基準 第5編 第3章 第7節）',
        expr: 'Φ = ℓ × Qℓ × (th − tr)',
        body: '区間の管長に、温度差 1 ℃・管長 1 m 当たりの熱損失を掛け、給湯温度と周囲温度の差を掛けます。設計基準の本文は、循環湯量を給湯管の単位長さ当たりの熱損失等に基づいて算定するとしています。',
      },
      {
        title: '循環流量',
        expr: 'W = 60 × ΣΦ ÷ (1000 × c × ρ × Δt)',
        body: '配管から逃げる熱 ΣΦ（W）を、湯の温度が Δt だけ下がる分でまかなうのに必要な流量です。1000 × c（J/(kg·K)）× ρ（kg/L）× Δt で割ると L/s になり、60 を掛けて L/min にします。手引の様式の係数 0.86 は kcal 単位の名残で、0.86 ÷ 60 ≒ 60 ÷ 4186 なので同じ結果になります。',
      },
    );
    symbols.push(
      { symbol: 'th', origin: 't（temperature：温度）に h（hot：湯）を添えたもの。手引の様式の記号', meaning: '給湯温度', unit: '℃' },
      { symbol: 'tr', origin: 't（temperature：温度）に r（room：周囲）を添えたもの。手引の様式の記号', meaning: '配管の周囲温度', unit: '℃' },
      { symbol: 'ℓ', origin: 'length（長さ）の頭文字。手引の様式の記号', meaning: '区間の管長（明細の各行）', unit: 'm' },
      { symbol: 'Qℓ', origin: '手引の様式の記号 Q（単位長さ当たり熱損失）に ℓ（長さ当たり）を添えた本サイトの表記', meaning: '管と周囲の温度差 1 ℃・管長 1 m 当たりの熱損失（明細の各行）', unit: 'W/(m·K)' },
      { symbol: 'Φ', origin: 'ギリシャ文字ファイ。熱流量を表す慣用記号', meaning: '区間の熱損失（明細の各行）', unit: 'W' },
      { symbol: 'Σℓ', origin: 'Σ（シグマ：合計）と ℓ（長さ）', meaning: '循環配管の管長の合計', unit: 'm' },
      { symbol: 'ΣΦ', origin: 'Σ（シグマ：合計）と Φ（熱流量）', meaning: '循環配管の熱損失の合計', unit: 'W' },
      { symbol: 'Δt', origin: 'Δ（デルタ：差）と t（temperature：温度）。手引の様式の記号', meaning: '給湯と返湯の温度差', unit: '℃' },
      { symbol: 'c', origin: '比熱（specific heat capacity）を表す慣用記号', meaning: '水の比熱', unit: 'kJ/(kg·K)' },
      { symbol: 'ρ', origin: 'ギリシャ文字ロー。密度を表す慣用記号', meaning: '水の密度', unit: 'kg/L' },
    );
  }
  formulas.push(
    {
      title: '局部抵抗相当長',
      expr: "L' = k × L",
      body: '継手・弁の局部抵抗を、同じ損失になる直管の長さに置き換えたものです。配管長に対する割合で見込みます。',
    },
    {
      title: '循環ポンプの揚程（手引 様式 機-117）',
      expr: "h = r × (L + L') ÷ 9.80665",
      body: '循環の最遠点を通る経路の摩擦損失（kPa）を水頭（m）に直します。給湯配管は満水で循環するだけなので、高さ（実揚程）は入りません。',
    },
  );
  symbols.push(
    { symbol: 'W', origin: '手引の様式の記号（循環湯量）', meaning: '循環流量（循環ポンプの吐出量）', unit: 'L/min' },
    { symbol: 'L', origin: 'Length（長さ）の頭文字。手引の様式の ℓ に当たる本サイトの表記', meaning: '貯湯槽から最遠の湯栓までの配管長（往復）', unit: 'm' },
    { symbol: 'k', origin: '係数（coefficient）を表す慣用記号。本サイトの表記', meaning: '局部抵抗相当長の割合（配管長に対して）', unit: '—' },
    { symbol: "L'", origin: "L（長さ）にダッシュを付けたもの。手引の様式の ℓ' に当たる本サイトの表記", meaning: '局部抵抗相当長の合計', unit: 'm' },
    { symbol: 'r', origin: '抵抗（resistance）の頭文字。手引の様式の記号', meaning: '循環流量での単位摩擦損失（各主配管の平均）', unit: 'kPa/m' },
    { symbol: 'Δp', origin: 'Δ（デルタ：差）と p（pressure：圧力）', meaning: '循環経路の摩擦損失', unit: 'kPa' },
    { symbol: 'h', origin: 'head（水頭）の頭文字。手引の様式の記号', meaning: '循環ポンプの揚程（循環水頭）', unit: 'm' },
  );
  return { formulas, symbols };
}

export const pl16Beginner: BeginnerDoc = {
  purpose: [
    '中央式給湯では、湯を使わない間に配管の湯が冷めないよう、貯湯槽と配管の間で湯を循環させます。その循環ポンプの流量と揚程を求める計算です。',
    '実施設計で給湯・返湯の配管ルートと管径が決まった段階で、循環ポンプの選定と返湯管の管径の確認に使います。',
  ],
  terms: [
    { term: '返湯管', desc: '給湯管の末端から貯湯槽へ湯を戻す管。給湯管と返湯管で循環の輪をつくります。' },
    { term: '単位長さ当たり熱損失（W/(m·K)）', desc: '管 1 m から、管と周囲の温度差 1 ℃ 当たりに逃げる熱。管径と保温の有無・厚さで変わります。' },
    { term: '給湯と返湯の温度差（℃）', desc: '循環して戻るまでに下がる湯の温度。小さくするほど循環流量は増えます。' },
    { term: '循環流量（L/min）', desc: '配管から逃げる熱を補うために循環させる湯の量。循環ポンプの吐出量になります。' },
    { term: '局部抵抗相当長（m）', desc: '継手・弁の損失を、同じ損失の直管の長さに置き換えたもの。' },
  ],
  example: {
    title: '給湯 60 ℃、周囲 15 ℃、給湯主管 60 m（0.4）、枝管 40 m（0.3）、返湯管 60 m（0.28 W/(m·K)）、温度差 5 ℃',
    steps: [
      '熱損失 Φ = 60 × 0.4 × 45 + 40 × 0.3 × 45 + 60 × 0.28 × 45 = 1080 + 540 + 756 = 2376 W',
      '循環流量 W = 60 × 2376 ÷ (1000 × 4.186 × 1 × 5) ≒ 6.81 L/min',
      '最遠の湯栓まで往復 120 m、局部抵抗相当長 = 1.0 × 120 = 120 m',
      '単位摩擦損失 0.2 kPa/m のとき 摩擦損失 = 0.2 × (120 + 120) = 48 kPa',
      '揚程 h = 48 ÷ 9.80665 ≒ 4.89 m',
    ],
  },
  pitfalls: [
    '返湯管の熱損失を入れ忘れる。往きの給湯管と返りの返湯管の両方から熱が逃げます。',
    '単位長さ当たり熱損失（温度差 1 ℃ 当たり）に、さらに温度差を掛け忘れる、または二重に掛ける。表の値の単位を確認します。',
    '揚程に建物の高さ（実揚程）を足してしまう。循環配管は満水なので、高さは打ち消し合います。',
    '循環流量が小さいからと返湯管を細くし過ぎる。単位摩擦損失が大きくなり、揚程が増えます。',
  ],
};
