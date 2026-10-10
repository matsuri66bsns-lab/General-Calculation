import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const S = {
  Q: { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '外気量（すきま風量）', unit: 'm³/h' },
  to: { symbol: 'to', origin: 't（temperature：温度）に o（outdoor：外気）を添えたもの', meaning: '外気の乾球温度', unit: '°C' },
  ti: { symbol: 'ti', origin: 't に i（indoor：室内）を添えたもの', meaning: '室内の乾球温度', unit: '°C' },
  xo: { symbol: 'xo', origin: '絶対湿度の慣用記号 x に o（outdoor：外気）を添えたもの', meaning: '外気の絶対湿度', unit: 'kg/kg(DA)' },
  xi: { symbol: 'xi', origin: 'x に i（indoor：室内）を添えたもの', meaning: '室内の絶対湿度', unit: 'kg/kg(DA)' },
  phio: { symbol: 'φo', origin: '相対湿度の慣用記号 φ（ファイ）に o（outdoor）を添えたもの', meaning: '外気の相対湿度', unit: '%' },
  phii: { symbol: 'φi', origin: 'φ に i（indoor）を添えたもの', meaning: '室内の相対湿度', unit: '%' },
  P: { symbol: 'P', origin: 'Pressure（圧力）の頭文字', meaning: '大気圧', unit: 'kPa' },
  pwo: { symbol: 'pwo', origin: 'p（pressure）に w（water vapour：水蒸気）と o（outdoor）を添えた本サイトの表記', meaning: '外気の水蒸気分圧', unit: 'kPa' },
  pwi: { symbol: 'pwi', origin: 'p に w（water vapour）と i（indoor）を添えた本サイトの表記', meaning: '室内の水蒸気分圧', unit: 'kPa' },
  dt: { symbol: 'Δt', origin: 'Δ（デルタ）は差を表す記号。t は temperature（温度）', meaning: '温度差（外気 − 室内）', unit: 'K' },
  dx: { symbol: 'Δx', origin: 'Δ は差を表す記号。x は絶対湿度', meaning: '絶対湿度差（外気 − 室内）', unit: 'kg/kg(DA)' },
  qs: { symbol: 'qs', origin: 'q（熱量の慣用記号）に s（sensible：顕熱）を添えたもの', meaning: '顕熱負荷。温度差による負荷', unit: 'W' },
  qL: { symbol: 'qL', origin: 'q に L（latent：潜熱）を添えたもの', meaning: '潜熱負荷。水蒸気量の差による負荷', unit: 'W' },
  q: { symbol: 'q', origin: '熱量を表す慣用記号', meaning: '全熱負荷（顕熱 + 潜熱）', unit: 'W' },
  et: { symbol: 'ηt', origin: 'η（イータ）は効率の慣用記号。t は temperature（温度）', meaning: '全熱交換器の温度交換効率', unit: '%' },
  ex: { symbol: 'ηx', origin: 'η に x（絶対湿度）を添えたもの', meaning: '全熱交換器の湿度交換効率', unit: '%' },
  qs2: { symbol: 'qs′', origin: 'qs にダッシュ（′）を付け、処理後の値を表す本サイトの表記', meaning: '全熱交換器を通した後の顕熱負荷', unit: 'W' },
  qL2: { symbol: 'qL′', origin: 'qL にダッシュ（′）を付けた本サイトの表記', meaning: '全熱交換器を通した後の潜熱負荷', unit: 'W' },
  q2: { symbol: 'q′', origin: 'q にダッシュ（′）を付けた本サイトの表記', meaning: '全熱交換器を通した後の全熱負荷', unit: 'W' },
  qr: { symbol: 'qr', origin: 'q に r（reduction：削減）を添えた本サイトの表記', meaning: '全熱交換器による負荷の削減量', unit: 'W' },
} satisfies Record<string, SymbolDoc>;

export function hv03Doc(v: Values): ToolDoc {
  const rh = String(v.hmode) === 'rh';
  const hex = String(v.hex) === 'yes';
  const formulas: ToolDoc['formulas'] = [];
  const symbols: SymbolDoc[] = [S.Q, S.to, S.ti];
  if (rh) {
    formulas.push(
      { title: '水蒸気分圧（Tetens の式）', expr: 'pw = φ ÷ 100 × 0.61078 × 10^(7.5t ÷ (t + 237.3))', body: '乾球温度での飽和水蒸気圧に相対湿度を掛けて水蒸気分圧を求めます。飽和水蒸気圧の式は HV-04（湿り空気の状態）と同じです。' },
      { title: '絶対湿度', expr: 'x = 0.622 × pw ÷ (P − pw)', body: '0.622 は水蒸気と乾き空気の分子量の比です。' },
    );
    symbols.push(S.phio, S.phii, S.P, S.pwo, S.xo, S.pwi, S.xi);
  } else {
    symbols.push(S.xo, S.xi);
  }
  formulas.push(
    { title: '顕熱負荷（建築設備設計基準・空気調和・衛生工学便覧）', expr: 'qs = 0.33 × Q × Δt', body: '0.33 は 1.2 × 1.006 ÷ 3.6 ≒ 0.335 を丸めた値です。1.2 は空気の密度 kg/m³、1.006 は乾き空気の定圧比熱 kJ/(kg·K)、3.6 は m³/h と kJ を W に直す換算（3600 s/h ÷ 1000）です。' },
    { title: '潜熱負荷', expr: 'qL = 834 × Q × Δx', body: '834 は 1.2 × 2501 ÷ 3.6 ≒ 833.7 を丸めた値です。2501 は 0 °C の水の蒸発潜熱 kJ/kg です。Δx は kg/kg(DA) で入れます（g/kg ではありません）。' },
    { title: '全熱負荷', expr: 'q = qs + qL', body: '顕熱と潜熱の和です。冷却コイルなどの容量はこの全熱で決め、顕熱と潜熱の比（SHF）は吹出し温度や除湿の検討に使います。' },
  );
  symbols.push(S.dt, S.dx, S.qs, S.qL, S.q);
  if (hex) {
    formulas.push(
      { title: '全熱交換器を通した後の負荷（JIS B 8628 の交換効率）', expr: "qs′ = (1 − ηt ÷ 100) × qs、 qL′ = (1 − ηx ÷ 100) × qL", body: '温度交換効率は、外気の温度差のうち排気との熱交換で回収できる割合です。給気と排気の風量が等しいとき、回収できなかった分が処理後の負荷になります。' },
      { title: '処理後の全熱負荷と削減量', expr: "q′ = qs′ + qL′、 qr = q − q′", body: '交換器によって空調機が処理しなくてよくなった負荷が削減量です。' },
    );
    symbols.push(S.et, S.ex, S.qs2, S.qL2, S.q2, S.qr);
  }
  return { formulas, symbols };
}

export const hv03Beginner: BeginnerDoc = {
  purpose: [
    '換気のために取り入れる外気や、すき間から入る外気（すきま風）を、室内の温度・湿度まで冷やしたり温めたりするのに必要な熱量を求める計算です。',
    '空調機の冷却・加熱コイルの容量を決める段階で使います。外気負荷は冷房負荷の中で大きな割合を占めることが多く、全熱交換器の採用を検討する根拠にもなります。',
  ],
  terms: [
    { term: '顕熱（W）', desc: '温度の変化に使われる熱。温度差に比例します。' },
    { term: '潜熱（W）', desc: '水蒸気が水になる（除湿）・水が水蒸気になる（加湿）ときの熱。絶対湿度の差に比例します。' },
    { term: '絶対湿度（kg/kg(DA)）', desc: '乾き空気 1 kg 当たりの水蒸気の質量。外気と室内の水分量の差はこの値の差で表します。' },
    { term: '全熱交換器', desc: '排気と給気の間で熱と湿気を交換し、外気負荷を減らす装置。温度交換効率と湿度交換効率で性能を表します。' },
  ],
  example: {
    title: '外気量 500 m³/h、外気 33 °C・0.0180 kg/kg(DA)、室内 26 °C・0.0105 kg/kg(DA) の場合',
    steps: [
      '温度差 Δt = 33 − 26 = 7 K、絶対湿度差 Δx = 0.0180 − 0.0105 = 0.0075 kg/kg(DA)',
      '顕熱負荷 qs = 0.33 × 500 × 7 = 1,155 W',
      '潜熱負荷 qL = 834 × 500 × 0.0075 ≒ 3,128 W',
      '全熱負荷 q = 1,155 + 3,128 ≒ 4,283 W',
      '温度交換効率 70 %・湿度交換効率 60 % の全熱交換器を通すと、qs′ = 0.3 × 1,155 ≒ 347 W、qL′ = 0.4 × 3,128 ≒ 1,251 W',
    ],
  },
  pitfalls: [
    '絶対湿度を g/kg のまま入れてしまう。18.0 g/kg は 0.0180 kg/kg です。g/kg で入れると潜熱が 1000 倍になります。',
    '夏の外気負荷は潜熱の割合が大きくなります。顕熱だけで見積もると大幅に小さくなります。',
    '冬は外気が室内より低温・低湿なので値が負になります。暖房負荷・加湿負荷として符号を反転して扱います。',
    '外気量の単位 m³/h と m³/min、L/s を混同する。係数 0.33・834 は m³/h 用です。',
  ],
};
