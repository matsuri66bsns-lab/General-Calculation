import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

export function pl04Doc(v: Values): ToolDoc {
  const booster = String(v.mode) === 'booster';
  const calc = String(v.hfm) === 'calc';
  const formulas: ToolDoc['formulas'] = [];
  const symbols: SymbolDoc[] = [
    { symbol: 'ha', origin: 'h（head：水頭）に a（actual：実際の）を添えた慣用記号', meaning: '実揚程（受水槽の低水位から送り先までの高さ）', unit: 'm' },
    { symbol: 'hf', origin: 'h（head：水頭）に f（friction：摩擦）を添えた慣用記号', meaning: '配管の摩擦損失水頭（局部損失を含む）', unit: 'm' },
  ];
  if (calc) {
    formulas.push(
      { title: '配管の摩擦損失（圧力）', expr: 'Δpf = L × i × (1 + k ÷ 100)', body: '直管長に単位摩擦損失を掛けて直管の損失を求め、継手・弁などの局部損失を割合 k で上乗せします。' },
      { title: '摩擦損失水頭', expr: 'hf = Δpf ÷ 9.80665', body: '圧力（kPa）を水柱の高さ（m）に直します。水柱 1 m は 9.80665 kPa です。' },
    );
    symbols.push(
      { symbol: 'L', origin: 'Length（長さ）の頭文字', meaning: 'ポンプから最遠の器具（吐出口）までの直管長', unit: 'm' },
      { symbol: 'i', origin: '動水勾配（hydraulic gradient）を表す慣用記号 i を、本サイトでは圧力で表した単位摩擦損失に使用', meaning: '単位摩擦損失', unit: 'kPa/m' },
      { symbol: 'k', origin: '係数（coefficient）を表す慣用記号。本サイトの表記', meaning: '局部損失の割合（直管損失に対する百分率）', unit: '%' },
      { symbol: 'Δpf', origin: 'Δp（圧力差）に f（friction：摩擦）を添えた本サイトの表記', meaning: '配管の摩擦損失（圧力）', unit: 'kPa' },
    );
  }
  if (booster) {
    formulas.push(
      { title: '器具の必要圧力の水頭', expr: 'hp = p ÷ (ρg) = p ÷ 9.80665', body: '最も条件の厳しい器具（最上階・最遠）で必要な圧力を水頭に直します。洗浄弁やシャワーは一般水栓より高い圧力が必要です。' },
      { title: '所要揚程', expr: 'H₀ = ha + hf + hp', body: '水を器具の高さまで押し上げ（ha）、配管の損失に打ち勝ち（hf）、さらに器具で必要な圧力（hp）を残すのに必要な揚程です。' },
    );
    symbols.push(
      { symbol: 'p', origin: 'pressure（圧力）の頭文字', meaning: '器具の必要圧力', unit: 'kPa' },
      { symbol: 'hp', origin: 'h（head：水頭）に p（pressure：圧力）を添えた本サイトの表記', meaning: '器具の必要圧力を水頭に換算した値', unit: 'm' },
    );
  } else {
    formulas.push({ title: '所要揚程', expr: 'H₀ = ha + hf', body: '揚水ポンプは高置水槽へ水を落とし込むだけなので、器具の必要圧力は加えません。水槽の吐出口から出る水の速度水頭は小さいので省略しています。' });
  }
  formulas.push(
    { title: '全揚程', expr: 'H = H₀ × (1 + α ÷ 100)', body: '配管の経年劣化や計算の誤差を考えて余裕を見込みます。' },
    { title: '圧力換算', expr: 'pH = H × 9.80665', body: '全揚程をポンプの吐出圧力の目安（kPa）に直したものです。' },
  );
  symbols.push(
    { symbol: 'H₀', origin: 'H（Head：揚程）に添字 0（余裕を含まない基準値）を付けた本サイトの表記', meaning: '所要揚程（余裕なし）', unit: 'm' },
    { symbol: 'α', origin: 'ギリシャ文字アルファ。割増しの割合として本サイトで使用', meaning: '余裕率', unit: '%' },
    { symbol: 'H', origin: 'Head（揚程・水頭）の頭文字', meaning: 'ポンプの全揚程', unit: 'm' },
    { symbol: 'pH', origin: 'p（pressure：圧力）に H（揚程）を添えた本サイトの表記', meaning: '全揚程を圧力に換算した値', unit: 'kPa' },
  );
  if (Number(v.Q) > 0) {
    formulas.push(
      { title: '水動力', expr: 'Pw = ρ × g × Q × H = 9.80665 × Q ÷ 60000 × H', body: '水に与える正味の仕事率です。ρ = 1000 kg/m³、g = 9.80665 m/s² とし、Q を m³/s に直すと kW で求まります。' },
      { title: '軸動力', expr: 'Ps = Pw ÷ η', body: 'ポンプの軸に加える動力です。電動機の出力はこれに余裕を見て選びます。' },
    );
    symbols.push(
      { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: 'ポンプの吐出量', unit: 'L/min' },
      { symbol: 'η', origin: 'ギリシャ文字イータ。効率を表す慣用記号', meaning: 'ポンプ効率', unit: '—' },
      { symbol: 'Pw', origin: 'P（Power：動力）に w（water：水）を添えた慣用記号', meaning: '水動力', unit: 'kW' },
      { symbol: 'Ps', origin: 'P（Power：動力）に s（shaft：軸）を添えた慣用記号', meaning: '軸動力', unit: 'kW' },
    );
  }
  if (!calc) formulas.unshift({ title: '配管の摩擦損失水頭', expr: 'hf（直接入力）', body: '区間ごとに求めた摩擦損失と局部損失の合計を、水頭（m）で入力します。' });
  return { formulas, symbols };
}

export const pl04Beginner: BeginnerDoc = {
  purpose: [
    '給水ポンプがどれだけの高さ（圧力）まで水を押し上げる力を持てばよいか、つまり全揚程を求める計算です。ポンプの機種選定に使います。',
    '実施設計で配管ルートと器具の位置が決まった段階で、最も条件の厳しい器具（最上階・最遠）を対象に計算します。',
  ],
  terms: [
    { term: '全揚程（m）', desc: 'ポンプが水に与えるエネルギーを水柱の高さで表したもの。ポンプのカタログは揚程（m）と吐出量（L/min）で性能を示します。' },
    { term: '実揚程（m）', desc: '吸い込む水面から送り先までの高さの差。配管の損失を含まない、純粋な高さです。' },
    { term: '器具の必要圧力（kPa）', desc: '器具が正常に使えるための最低の水圧。洗浄弁やシャワーは一般水栓より高い圧力が必要です。' },
    { term: '水頭と圧力', desc: '水柱 1 m の重さによる圧力は約 9.81 kPa。100 kPa は水柱約 10.2 m です。' },
    { term: '軸動力（kW）', desc: 'ポンプを回すのに必要な動力。電動機はこれより大きい出力のものを選びます。' },
  ],
  example: {
    title: '加圧給水ポンプ：実揚程 30 m、直管長 60 m、単位摩擦損失 0.3 kPa/m、局部損失 50 %、洗浄弁 70 kPa、余裕 10 %',
    steps: [
      '摩擦損失 Δpf = 60 × 0.3 × (1 + 0.5) = 27 kPa → hf = 27 ÷ 9.80665 ≒ 2.75 m',
      '器具の必要圧力 hp = 70 ÷ 9.80665 ≒ 7.14 m',
      '所要揚程 H₀ = 30 + 2.75 + 7.14 ≒ 39.89 m',
      '全揚程 H = 39.89 × 1.1 ≒ 43.9 m（約 430 kPa）',
      '吐出量 200 L/min、効率 0.55 なら 水動力 Pw = 9.80665 × 200 ÷ 60000 × 43.9 ≒ 1.43 kW、軸動力 Ps = 1.43 ÷ 0.55 ≒ 2.61 kW',
    ],
  },
  pitfalls: [
    '実揚程を受水槽の満水位から測ってしまう。水位が最も下がったとき（低水位）を基準にします。',
    '局部損失（継手・弁・メーター・逆止弁など）を見込み忘れる。直管だけでは損失が過小になります。',
    '揚水ポンプに器具の必要圧力を加えてしまう。高置水槽へ落とし込むだけなら不要です。',
    'kPa と m の換算ミス。1 m ≒ 9.81 kPa で、10 倍ずれやすいので注意します。',
  ],
};
