import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const S = {
  t: { symbol: 't', origin: 'temperature（温度）の頭文字', meaning: '乾球温度。ふつうの温度計で測った空気の温度', unit: '°C' },
  phi: { symbol: 'φ', origin: 'ギリシャ文字ファイ。相対湿度を表す慣用記号', meaning: '相対湿度。水蒸気分圧が、同じ温度の飽和水蒸気圧の何 % かを表す', unit: '%' },
  tw: { symbol: 'tw', origin: 't に w（wet-bulb：湿球）を添えた本サイトの表記', meaning: '湿球温度（熱力学的湿球温度＝断熱飽和温度として扱う）', unit: '°C' },
  td: { symbol: 'td', origin: 't に d（dew point：露点）を添えた本サイトの表記', meaning: '露点温度。空気を冷やしていったとき、水蒸気が結露し始める温度', unit: '°C' },
  P: { symbol: 'P', origin: 'Pressure（圧力）の頭文字', meaning: '大気圧（湿り空気の全圧）', unit: 'kPa' },
  pws: { symbol: 'pws', origin: 'p（pressure：圧力）に w（water vapour：水蒸気）と s（saturation：飽和）を添えたもの', meaning: '乾球温度での飽和水蒸気圧。その温度で空気が含める水蒸気の上限を圧力で表した値', unit: 'kPa' },
  pwsw: { symbol: 'pws(tw)', origin: 'pws を湿球温度 tw で求めたことを表す本サイトの表記', meaning: '湿球温度での飽和水蒸気圧', unit: 'kPa' },
  xs: { symbol: 'xs(tw)', origin: 'x に s（saturation：飽和）を添え、湿球温度で求めたことを表す本サイトの表記', meaning: '湿球温度で飽和した空気の絶対湿度', unit: 'kg/kg(DA)' },
  pw: { symbol: 'pw', origin: 'p（pressure：圧力）に w（water vapour：水蒸気）を添えたもの', meaning: '水蒸気分圧。湿り空気の圧力のうち水蒸気が受け持つ分', unit: 'kPa' },
  x: { symbol: 'x', origin: '日本の空気調和分野で絶対湿度に使う慣用記号（ASHRAE では W：humidity ratio）', meaning: '絶対湿度。乾き空気 1 kg と一緒にある水蒸気の質量', unit: 'kg/kg(DA)' },
  h: { symbol: 'h', origin: '比エンタルピーを表す慣用記号（heat content に由来するとされる）', meaning: '比エンタルピー。0 °C の乾き空気と 0 °C の水を基準にした、乾き空気 1 kg 当たりの湿り空気の熱量', unit: 'kJ/kg(DA)' },
  v: { symbol: 'v', origin: 'specific volume（比容積）の頭文字', meaning: '比容積。乾き空気 1 kg 当たりの湿り空気の体積', unit: 'm³/kg(DA)' },
} satisfies Record<string, SymbolDoc>;

const F = {
  pws: { title: '飽和水蒸気圧（Tetens の式）', expr: 'pws = 0.61078 × 10^(7.5t ÷ (t + 237.3))', body: '温度 t の空気が含むことのできる水蒸気の上限を圧力で表します。Tetens（1930）の近似式で、水面上の値です。精密式（ASHRAE Handbook の Hyland-Wexler の式）との差は 0〜50 °C で約 0.12 % 以内です。' },
  x: { title: '絶対湿度', expr: 'x = 0.622 × pw ÷ (P − pw)', body: '0.622 は水蒸気と乾き空気の分子量の比（18.015 ÷ 28.966）です。P − pw は乾き空気の分圧にあたります。' },
  dew: { title: '露点温度（Tetens の式の逆関数）', expr: 'td = 237.3 × log₁₀(pw ÷ 0.61078) ÷ (7.5 − log₁₀(pw ÷ 0.61078))', body: '飽和水蒸気圧がちょうど pw になる温度です。Tetens の式は解析的に逆に解けるので、反復計算をせずに Excel でも同じ値になります。' },
  rh: { title: '相対湿度', expr: 'φ = pw ÷ pws × 100', body: '水蒸気分圧が、同じ温度の飽和水蒸気圧の何 % かを表します。' },
  h: { title: '比エンタルピー', expr: 'h = 1.006t + x × (2501 + 1.805t)', body: '1.006 は乾き空気の定圧比熱、2501 は 0 °C の水の蒸発潜熱、1.805 は水蒸気の定圧比熱（いずれも kJ/(kg·K) または kJ/kg）です。乾き空気の顕熱と、水蒸気の潜熱・顕熱の和です。' },
  v: { title: '比容積', expr: 'v = 0.287042 × (t + 273.15) × (1 + 1.607858x) ÷ P', body: '湿り空気を理想気体とみなした式です。0.287042 は乾き空気の気体定数 kJ/(kg·K)、1.607858 は 1 ÷ 0.622 にあたる係数です。' },
};

export function hv04Doc(v: Values): ToolDoc {
  const method = String(v.method);
  if (method === 'wb') {
    return {
      formulas: [
        F.pws,
        { title: '湿球温度での飽和絶対湿度', expr: 'xs(tw) = 0.622 × pws(tw) ÷ (P − pws(tw))', body: '湿球温度で水蒸気が飽和したときの絶対湿度です。' },
        { title: '絶対湿度（断熱飽和の熱収支）', expr: 'x = (xs(tw) × (2501 − 2.381tw) − 1.006(t − tw)) ÷ (2501 + 1.805t − 4.186tw)', body: '空気が水と触れて湿球温度まで冷えながら飽和するとき、熱の出入りがない（断熱）として比エンタルピーの収支を立て、x について解いた式です。2.381 は 4.186（水の比熱）− 1.805（水蒸気の比熱）です。反復計算は不要です。' },
        { title: '水蒸気分圧', expr: 'pw = P × x ÷ (0.622 + x)', body: '絶対湿度の式を水蒸気分圧について解いたものです。' },
        F.rh,
        F.dew,
        F.h,
        F.v,
      ],
      symbols: [S.t, S.tw, S.P, S.pws, S.pwsw, S.xs, S.x, S.pw, S.phi, S.td, S.h, S.v],
    };
  }
  if (method === 'dp') {
    return {
      formulas: [
        F.pws,
        { title: '水蒸気分圧', expr: 'pw = 0.61078 × 10^(7.5td ÷ (td + 237.3))', body: '露点温度での飽和水蒸気圧が、その空気の水蒸気分圧に等しくなります。' },
        F.x,
        F.rh,
        F.h,
        F.v,
      ],
      symbols: [S.t, S.td, S.P, S.pws, S.pw, S.x, S.phi, S.h, S.v],
    };
  }
  return {
    formulas: [
      F.pws,
      { title: '水蒸気分圧', expr: 'pw = φ ÷ 100 × pws', body: '相対湿度の定義から、水蒸気分圧は飽和水蒸気圧に相対湿度を掛けた値です。' },
      F.x,
      F.dew,
      F.h,
      F.v,
    ],
    symbols: [S.t, S.phi, S.P, S.pws, S.pw, S.x, S.td, S.h, S.v],
  };
}

export const hv04Beginner: BeginnerDoc = {
  purpose: [
    '空気の温度と湿り具合から、空気に含まれる水蒸気の量（絶対湿度）や熱量（比エンタルピー）を求める計算です。空気線図を読む代わりに数値で求めます。',
    '空調の負荷計算で外気と室内の状態を決めるとき、コイルの能力や加湿量を出すとき、結露の検討で露点を知りたいときに使います。',
  ],
  terms: [
    { term: '乾球温度・湿球温度', desc: '乾球温度はふつうの温度計の温度。湿球温度は感温部を湿らせた温度計の温度で、空気が乾いているほど蒸発で冷えて低くなります。' },
    { term: '相対湿度（%）', desc: 'その温度で含める水蒸気の上限に対して、いま何 % 含んでいるか。温度が変わると、水蒸気の量が同じでも値が変わります。' },
    { term: '絶対湿度（kg/kg(DA)）', desc: '乾き空気 1 kg と一緒にある水蒸気の質量。(DA) は Dry Air（乾き空気）の意味です。温度が変わっても、加湿・除湿しなければ変わりません。' },
    { term: '露点温度（°C）', desc: '空気を冷やしたとき、水蒸気が水滴になり始める温度。窓や壁の表面温度がこれ以下になると結露します。' },
    { term: '比エンタルピー（kJ/kg(DA)）', desc: '乾き空気 1 kg 当たりの空気の熱量。冷却コイルの能力は、入口と出口の比エンタルピーの差に風量を掛けて求めます。' },
  ],
  example: {
    title: '乾球温度 26 °C、相対湿度 50 %、標準大気圧 101.325 kPa の場合',
    steps: [
      '飽和水蒸気圧 pws = 0.61078 × 10^(7.5 × 26 ÷ 263.3) ≒ 3.3611 kPa',
      '水蒸気分圧 pw = 50 ÷ 100 × 3.3611 ≒ 1.6806 kPa',
      '絶対湿度 x = 0.622 × 1.6806 ÷ (101.325 − 1.6806) ≒ 0.01049 kg/kg(DA)',
      '露点 td = 237.3 × log₁₀(1.6806 ÷ 0.61078) ÷ (7.5 − log₁₀(1.6806 ÷ 0.61078)) ≒ 14.8 °C',
      '比エンタルピー h = 1.006 × 26 + 0.01049 × (2501 + 1.805 × 26) ≒ 52.88 kJ/kg(DA)',
      '比容積 v = 0.287042 × 299.15 × (1 + 1.607858 × 0.01049) ÷ 101.325 ≒ 0.8618 m³/kg(DA)',
    ],
  },
  pitfalls: [
    '絶対湿度の g/kg と kg/kg を混同する。10.5 g/kg = 0.0105 kg/kg です。負荷計算の 834 × Q × Δx は kg/kg で使います。',
    '相対湿度が同じでも、温度が違えば水蒸気の量は違います。外気と室内を比べるときは絶対湿度で比べます。',
    '比容積は乾き空気 1 kg 当たりです。風量（m³/h）を質量流量（kg/h）に直すときは、比容積で割ります。',
    '標高の高い場所では大気圧が下がり、同じ相対湿度でも絶対湿度が大きくなります。',
  ],
};
