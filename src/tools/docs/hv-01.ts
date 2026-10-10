import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const S = {
  A: { symbol: 'A', origin: 'Area（面積）の頭文字', meaning: '床面積', unit: 'm²' },
  H: { symbol: 'H', origin: 'Height（高さ）の頭文字', meaning: '天井高', unit: 'm' },
  V: { symbol: 'V', origin: 'Volume（体積）の頭文字', meaning: '室容積', unit: 'm³' },
  n: { symbol: 'n', origin: 'number（回数）の頭文字', meaning: '換気回数。1時間に室の空気が何回入れ替わるか', unit: '回/h' },
  Q: { symbol: 'Q', origin: '流量・熱量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '必要換気量', unit: 'm³/h' },
  Qd: { symbol: 'Q′', origin: 'Q にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '必要換気量（毎分）', unit: 'm³/min' },
} satisfies Record<string, SymbolDoc>;

export function hv01Doc(v: Values): ToolDoc {
  const method = String(v.method);
  if (method === 'person') {
    return {
      formulas: [
        { title: '有効換気量（建築基準法施行令第20条の2）', expr: 'V = 20 × Af ÷ N′', body: '20 は「在室者1人当たり毎時 20 m³ の換気が必要」という意味です。Af ÷ N′ が在室人数にあたるので、V = 20 × 在室人数 と同じ形です。' },
        { title: '占有面積の上限', expr: 'N′ = min(N, Nmax)', body: '1人当たりの占有面積 N には上限があり、特殊建築物の居室は 3 m²/人、その他の居室は 10 m²/人 を超えるときはその値とします。実況が広くても在室人数を少なく見積もり過ぎないための規定です。' },
        { title: '換気回数への換算', expr: 'n = V ÷ (Af × H)', body: '求めた換気量が室容積の何回分にあたるかを示します。換気回数の目安と比べる確認用です。' },
      ],
      symbols: [
        { symbol: 'V', origin: '条文の記号。Volume（体積）に由来し、ここでは1時間あたりの体積＝換気量', meaning: '有効換気量（機械換気設備の必要量）', unit: 'm³/h' },
        { symbol: 'Af', origin: 'A（Area：面積）に f（floor：床）を添えた条文の記号', meaning: '居室の床面積', unit: 'm²' },
        { symbol: 'N', origin: '条文の記号。人数ではなく「1人当たりの占有面積」を表す点に注意', meaning: '実況に応じた1人当たりの占有面積', unit: 'm²/人' },
        { symbol: 'Nmax', origin: 'N に max（maximum：最大）を添えた本サイトの表記', meaning: '占有面積の上限（特殊建築物の居室 3、その他 10）', unit: 'm²/人' },
        { symbol: 'N′', origin: '上限で頭打ちにした N を表す本サイトの表記', meaning: '計算に用いる占有面積', unit: 'm²/人' },
        { symbol: 'P', origin: 'Person（人）の頭文字。本サイトの表記', meaning: '想定在室人数（Af ÷ N′）', unit: '人' },
        S.H,
        S.n,
      ],
    };
  }
  if (method === 'co2') {
    return {
      formulas: [
        { title: 'CO₂ 発生量', expr: 'M = P × k', body: '在室人数に1人当たりの CO₂ 発生量を掛けます。発生量は作業の強さで変わり、事務作業で 0.02 m³/(h·人) 程度です。' },
        { title: '必要換気量（ザイデル式）', expr: 'Q = M ÷ ((C − C₀) × 10⁻⁶)', body: '室内で発生する CO₂ と、換気で外へ出ていく CO₂ が釣り合う「定常状態」の式です。(C − C₀) は換気で薄められる濃度の差で、10⁻⁶ は ppm（百万分の1）を体積の比に直す係数です。許容濃度 1,000 ppm は建築物衛生法の空気環境の基準値です。' },
        { title: '1人当たり換気量・換気回数', expr: 'q = Q ÷ P、 n = Q ÷ (A × H)', body: '1人当たりに直すと、法定の 20 m³/(h·人) との比較ができます。' },
      ],
      symbols: [
        { symbol: 'P', origin: 'Person（人）の頭文字。本サイトの表記', meaning: '在室人数', unit: '人' },
        { symbol: 'k', origin: '係数（coefficient）を表す慣用記号', meaning: '1人当たりの CO₂ 発生量', unit: 'm³/(h·人)' },
        { symbol: 'M', origin: '汚染物質の発生量を表す慣用記号（Mass：量に由来するとされる）', meaning: '室内の CO₂ 発生量', unit: 'm³/h' },
        { symbol: 'C', origin: 'Concentration（濃度）の頭文字', meaning: '室内の CO₂ 許容濃度', unit: 'ppm' },
        { symbol: 'C₀', origin: 'C に添字 0（外気・基準の意）', meaning: '外気の CO₂ 濃度', unit: 'ppm' },
        S.Q,
        { symbol: 'q', origin: '小文字の q は「単位当たりの量」を表す慣用', meaning: '1人当たりの換気量', unit: 'm³/(h·人)' },
        S.A,
        S.H,
        S.n,
      ],
    };
  }
  if (method === 'fire') {
    return {
      formulas: [
        { title: '有効換気量（昭和45年建設省告示第1826号）', expr: 'V = N × K × Q', body: '燃焼器具から出る廃ガスの量（K × Q）に、廃ガスを確実に排出するための倍率 N を掛けます。排気フードが廃ガスを効率よく捕えるほど N は小さくなります（フードなし 40、Ⅰ型 30、Ⅱ型 20、煙突 2）。' },
        { title: '毎分の換気量', expr: 'V′ = V ÷ 60', body: '換気扇のカタログ値（m³/min）と比べるための換算です。' },
      ],
      symbols: [
        { symbol: 'V', origin: '告示の記号。Volume（体積）に由来し、ここでは1時間あたりの体積＝換気量', meaning: '有効換気量', unit: 'm³/h' },
        { symbol: 'N', origin: '告示の記号', meaning: '排気の方式（フードの有無・形式、煙突）で決まる係数', unit: '—' },
        { symbol: 'K', origin: '告示の記号', meaning: '理論廃ガス量。燃料が完全燃焼したときに出るガスの量', unit: 'm³/kWh（灯油は m³/kg）' },
        { symbol: 'Q', origin: '告示の記号', meaning: '燃料消費量（器具の合計）', unit: 'kW（灯油は kg/h）' },
        { symbol: 'V′', origin: 'V にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '有効換気量（毎分）', unit: 'm³/min' },
      ],
    };
  }
  return {
    formulas: [
      { title: '室容積', expr: 'V = A × H', body: '床面積に天井高を掛けて室の容積を求めます。' },
      { title: '必要換気量', expr: 'Q = n × V', body: '換気回数 n は「1時間に室の空気が何回入れ替わるか」を表します。室容積に掛けると1時間あたりの換気量になります。換気回数は室用途ごとの目安値（空気調和・衛生工学便覧など）から選びます。' },
      { title: '毎分の換気量', expr: 'Q′ = Q ÷ 60', body: '換気扇・送風機のカタログは m³/min 表記も多いため、60 で割って換算します。' },
    ],
    symbols: [S.A, S.H, S.V, S.n, S.Q, S.Qd],
  };
}

export const hv01Beginner: BeginnerDoc = {
  purpose: [
    '室内の空気を、どれだけの量だけ外気と入れ替えればよいかを求める計算です。結果は換気扇や送風機の能力（風量）を選ぶ根拠になります。',
    '基本設計で各室の必要換気量を出し、実施設計で機器選定・ダクトの太さの決定に進みます。居室は建築基準法の在室人員法、便所や機械室は換気回数法、厨房など火を使う室は火気使用室の式を使うのが一般的です。',
  ],
  terms: [
    { term: '換気量（m³/h）', desc: '1時間に入れ替える空気の体積。m³/min（毎分）で表すこともあり、60倍・60分の1で換算します。' },
    { term: '換気回数（回/h）', desc: '換気量を室容積で割った値。「1時間に室の空気が何回入れ替わるか」を表します。' },
    { term: 'ppm', desc: 'parts per million（百万分の1）。CO₂ 濃度 1,000 ppm は空気の 0.1 % が CO₂ という意味です。' },
    { term: '居室', desc: '居住・執務・作業・集会などのために継続的に使う室（建築基準法第2条）。廊下や便所は居室ではありません。' },
    { term: '特殊建築物', desc: '劇場・病院・学校・百貨店など、不特定多数の人が使う建築物（建築基準法第2条、別表第1）。' },
  ],
  example: {
    title: '事務室 50 m²、1人当たり占有面積 5 m²/人（その他の居室）の場合',
    steps: [
      '占有面積の上限は 10 m²/人。N = 5 は上限以下なので N′ = 5',
      '在室人数 = 50 ÷ 5 = 10 人',
      '有効換気量 V = 20 × 50 ÷ 5 = 200 m³/h',
      '天井高 2.7 m なら室容積 135 m³、換気回数 n = 200 ÷ 135 ≒ 1.5 回/h',
    ],
  },
  pitfalls: [
    '在室人員法の N は「人数」ではなく「1人当たりの占有面積（m²/人）」です。人数を入れると結果が大きく狂います。',
    'm³/h と m³/min の取り違え。カタログ値と比べるときは単位をそろえます。',
    '換気回数の目安は法令の値ではありません。電気室など発熱のある室は、換気回数ではなく排熱量から換気量を求めます。',
    '火気使用室の Q は「燃料消費量（kW）」で、器具の能力（出力）とは異なる場合があります。器具の表示を確認します。',
  ],
};
