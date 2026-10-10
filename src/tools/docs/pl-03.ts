import type { BeginnerDoc, SymbolDoc, ToolDoc } from '../../core/types';

/** ヘーゼン・ウィリアムス式の記号（PL-02 でも使う） */
export const HW_SYMBOLS = {
  C: { symbol: 'C', origin: 'ヘーゼン・ウィリアムス式の記号。coefficient（係数）の頭文字', meaning: '流速係数。管内面が滑らかなほど大きく、損失は小さくなる', unit: '—' },
  i: { symbol: 'i', origin: '動水勾配（hydraulic gradient）を表す慣用記号 i を、本サイトでは圧力で表した単位摩擦損失に使用', meaning: '管長 1 m 当たりの摩擦損失', unit: 'kPa/m' },
  v: { symbol: 'v', origin: 'velocity（速度）の頭文字', meaning: '管内の平均流速', unit: 'm/s' },
} satisfies Record<string, SymbolDoc>;

export function pl03Doc(): ToolDoc {
  return {
    formulas: [
      { title: '単位の換算', expr: 'Q′ = Q ÷ 60000、 D′ = D ÷ 1000', body: 'SI 単位のヘーゼン・ウィリアムス式は、流量を m³/s、内径を m で使います。1 m³ = 1000 L、1 分 = 60 秒なので、L/min を 60000 で割ると m³/s になります。' },
      { title: '摩擦損失水頭（ヘーゼン・ウィリアムス式）', expr: 'hf = 10.67 × L × Q′^1.85 ÷ (C^1.85 × D′^4.87)', body: '水が管を流れるときに管壁との摩擦で失われるエネルギーを、水柱の高さ（m）で表します。流量の 1.85 乗に比例し、内径の 4.87 乗に反比例するので、管径を1サイズ上げると損失は大きく減ります。' },
      { title: '圧力への換算', expr: 'Δp = hf × 9.80665', body: '水柱 1 m は約 9.81 kPa です（ρg = 1000 kg/m³ × 9.80665 m/s² = 9.80665 kPa/m）。' },
      { title: '単位摩擦損失', expr: 'i = Δp ÷ L', body: '管長 1 m 当たりの損失です。給水管の管径は、この値が設計の目安以内に収まるように選ぶことが多いです。' },
      { title: '管内流速', expr: 'v = Q′ ÷ (π × D′² ÷ 4)', body: '流量を管の断面積で割ります。給水管では一般に 2.0 m/s 以下とします。' },
    ],
    symbols: [
      { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '流量（入力値）', unit: 'L/min' },
      { symbol: 'Q′', origin: 'Q にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '流量（m³/s に換算した値）', unit: 'm³/s' },
      { symbol: 'D', origin: 'Diameter（直径）の頭文字', meaning: '管の内径（入力値）', unit: 'mm' },
      { symbol: 'D′', origin: 'D にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '管の内径（m に換算した値）', unit: 'm' },
      { symbol: 'L', origin: 'Length（長さ）の頭文字', meaning: '管長（直管長）', unit: 'm' },
      HW_SYMBOLS.C,
      { symbol: 'hf', origin: 'h（head：水頭）に f（friction：摩擦）を添えた慣用記号', meaning: '摩擦損失水頭', unit: 'm' },
      { symbol: 'Δp', origin: 'Δ（デルタ：差）と p（pressure：圧力）。圧力の差＝損失を表す慣用記号', meaning: '摩擦による圧力損失', unit: 'kPa' },
      HW_SYMBOLS.i,
      HW_SYMBOLS.v,
    ],
  };
}

export const pl03Beginner: BeginnerDoc = {
  purpose: [
    '給水管の中を水が流れると、管壁との摩擦で圧力が少しずつ失われます。その失われる量（摩擦損失）を求める計算です。',
    '実施設計で給水管の管径を決めるときや、ポンプの全揚程・水道直結で末端の圧力が足りるかを確かめるときに使います。',
  ],
  terms: [
    { term: '摩擦損失水頭（m）', desc: '摩擦で失われるエネルギーを水柱の高さで表したもの。1 m ≒ 9.81 kPa です。' },
    { term: '単位摩擦損失（kPa/m）', desc: '管長 1 m 当たりの摩擦損失。区間の長さを掛ければその区間の損失になります。' },
    { term: '流速係数 C', desc: '管の内面の滑らかさを表す係数。樹脂管やライニング鋼管は 130〜150 程度、古い鋼管は 100 程度が目安です。' },
    { term: '内径', desc: '管の内側の直径。呼び径（20A、25A など）とは一致しないので、寸法表で確認します。' },
  ],
  example: {
    title: '流量 100 L/min、内径 40 mm、管長 50 m、C = 130 の場合',
    steps: [
      'Q′ = 100 ÷ 60000 ≒ 0.001667 m³/s、 D′ = 40 ÷ 1000 = 0.04 m',
      'Q′^1.85 ≒ 7.251 × 10⁻⁶、 C^1.85 ≒ 8143、 D′^4.87 ≒ 1.556 × 10⁻⁷',
      'hf = 10.67 × 50 × 7.251 × 10⁻⁶ ÷ (8143 × 1.556 × 10⁻⁷) ≒ 3.05 m',
      'Δp = 3.05 × 9.80665 ≒ 29.9 kPa、 i = 29.9 ÷ 50 ≒ 0.60 kPa/m',
      'v = 0.001667 ÷ (π × 0.04² ÷ 4) ≒ 1.33 m/s',
    ],
  },
  pitfalls: [
    '流量の単位を間違える。この式の Q は m³/s です。L/min のまま入れると桁違いの結果になります。',
    '内径に呼び径を使ってしまう。ライニング鋼管などは呼び径より内径がかなり小さいことがあります。',
    '継手・弁の局部損失を忘れる。直管の損失だけではポンプの揚程が不足します。',
    '流速係数を新管の値のまま使う。長く使うと内面が粗くなり C は下がります。',
  ],
};
