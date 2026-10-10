import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const common = [
  { symbol: 'η', origin: 'ギリシャ文字イータ。効率を表す慣用記号', meaning: '効率（ポンプ効率、または送風機の全圧効率）。0〜1 の小数', unit: '—' },
  { symbol: 'P', origin: 'Power（動力）の頭文字', meaning: '軸動力。電動機が機器の軸に伝える必要のある動力', unit: 'kW' },
  { symbol: 'α', origin: 'ギリシャ文字アルファ。余裕率を表す慣用記号', meaning: '余裕率（0.15 なら 15 % の余裕）', unit: '—' },
  { symbol: 'PM', origin: 'P に M（Motor：電動機）を添えた記号', meaning: '余裕率を見込んだ電動機出力', unit: 'kW' },
  { symbol: 'PR', origin: 'P に R（Rated：定格）を添えた本サイトの表記', meaning: '選定した電動機の定格出力（JIS の系列から PM 以上で最小のもの）', unit: 'kW' },
] satisfies SymbolDoc[];

const motorFormulas = [
  { title: '電動機出力', expr: 'PM = P × (1 + α)', body: '軸動力に余裕を見込んだ値です。運転点のずれ、配管・ダクト抵抗の見込み違い、電動機の発熱などに備えるためで、余裕率は 0.1〜0.2 程度を目安とします。' },
  { title: '定格出力の選定（JIS C 4210・JIS C 4212）', expr: 'PR = PM 以上で最小の定格出力', body: '電動機は決まった定格出力の系列（0.4、0.75、1.5、2.2、3.7、5.5 kW …）で作られています。計算した電動機出力以上で最小のものを選びます。' },
];

export function cm03Doc(v: Values): ToolDoc {
  if (String(v.kind) === 'fan') {
    return {
      formulas: [
        { title: '送風機の軸動力', expr: 'P = Q × Pt ÷ (60 × 1000 × η)', body: '風量（m³/s）× 全圧（Pa）が、送風機が空気に与える動力（空気動力、W）です。風量が m³/min なので 60 で割り、1000 で割って kW にします。これを全圧効率で割ると軸動力になります。' },
        ...motorFormulas,
      ],
      symbols: [
        { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '送風機の風量', unit: 'm³/min' },
        { symbol: 'Pt', origin: 'P（Pressure：圧力）に t（total：全）を添えた記号', meaning: '送風機の全圧（静圧と動圧の和）', unit: 'Pa' },
        ...common,
      ],
    };
  }
  return {
    formulas: [
      { title: 'ポンプの軸動力', expr: 'P = ρ × g × Q × H ÷ (60 × 1000 × η)', body: 'ρ × g × H は揚程 H を圧力に直した値で、流量（m³/s）を掛けると水に与える動力（水動力、W）になります。流量が m³/min なので 60 で割り、1000 で割って kW にします。これをポンプ効率で割ると軸動力になります。' },
      ...motorFormulas,
    ],
    symbols: [
      { symbol: 'ρ', origin: 'ギリシャ文字ロー。密度を表す慣用記号', meaning: '流体の密度', unit: 'kg/m³' },
      { symbol: 'g', origin: 'gravity（重力）の頭文字', meaning: '重力加速度（標準重力加速度 9.80665）', unit: 'm/s²' },
      { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: 'ポンプの吐出量', unit: 'm³/min' },
      { symbol: 'H', origin: 'Head（揚程）の頭文字', meaning: '全揚程（実揚程 ＋ 配管の摩擦損失 ＋ 末端の必要圧力などを水の高さで表したもの）', unit: 'm' },
      ...common,
    ],
  };
}

export const cm03Beginner: BeginnerDoc = {
  purpose: [
    'ポンプや送風機を回すのに必要な動力（軸動力）を求め、取り付ける電動機（モーター）の大きさを決める計算です。',
    '実施設計で機器を選ぶ段階で使います。電動機の出力は、電源設備（幹線・ブレーカー）の容量を決める元にもなるので、電気設備の設計者にも渡す値です。',
  ],
  terms: [
    { term: '全揚程（m）', desc: 'ポンプが水を押し上げる高さに、配管の摩擦損失や末端で必要な圧力を加え、水の高さで表したもの。' },
    { term: '全圧（Pa）', desc: '送風機が空気に与える圧力。静圧と動圧の和で、ダクトや機器の抵抗の合計に見合う値を選びます。' },
    { term: '効率', desc: '機器が受け取った動力のうち、流体に伝わる割合。0.6 なら 6 割が流体に伝わり、残りは損失になります。' },
    { term: '軸動力（kW）', desc: '電動機が機器の軸に伝える必要のある動力。電動機の定格出力はこれ以上にします。' },
    { term: '定格出力（kW）', desc: '電動機が連続して出せる機械的な出力。0.4、0.75、1.5、2.2、3.7 kW のように決まった系列があります。' },
  ],
  example: {
    title: 'ポンプ：吐出量 0.5 m³/min、全揚程 30 m、効率 0.6、余裕率 0.15 の場合',
    steps: [
      '軸動力 P = 1000 × 9.80665 × 0.5 × 30 ÷ (60 × 1000 × 0.6) ≒ 4.09 kW',
      '電動機出力 PM = 4.09 × (1 + 0.15) ≒ 4.70 kW',
      'JIS C 4210 の系列で 4.70 kW 以上の最小は 5.5 kW',
      '送風機なら、風量 300 m³/min、全圧 600 Pa、効率 0.6 で P = 300 × 600 ÷ (60 × 1000 × 0.6) = 5.0 kW',
    ],
  },
  pitfalls: [
    '流量の単位を混同する。この式は m³/min です。L/min や m³/h のままでは値が大きく狂います。',
    '効率を % のまま入れてしまう（60 ではなく 0.6）。',
    '送風機の静圧だけで計算してしまう。この式は全圧（静圧＋動圧）を使います。',
    '余裕率を二重に見込む。揚程や全圧の段階ですでに余裕を見込んでいる場合は、重ねすぎに注意します。',
  ],
};
