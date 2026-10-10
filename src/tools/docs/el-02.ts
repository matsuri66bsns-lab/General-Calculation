import type { BeginnerDoc, ToolDoc, Values } from '../../core/types';

export function el02Doc(v: Values): ToolDoc {
  const p2i = v.mode !== 'i2p';
  const formulas = [
    { title: '基本式', expr: 'P = k × V × I × cosφ ÷ 1000', body: '有効電力（実際に仕事をする電力）は、電圧 × 電流 × 力率です。三相交流は3本の電線で送るため √3（約 1.732）倍になり、直流と単相交流は k = 1 です。1000 で割って W を kW にしています。' },
    ...(p2i
      ? [
          { title: '入力電力', expr: 'Pi = P ÷ η', body: '電動機は軸の出力より多くの電力を受け取ります。定格出力を効率 η で割って、電源から受け取る入力電力を求めます。' },
          { title: '皮相電力', expr: 'S = Pi ÷ cosφ', body: '電圧 × 電流そのものの大きさです。変圧器や発電機の容量（kVA）はこの値で選びます。' },
          { title: '電流', expr: 'I = Pi × 1000 ÷ (k × V × cosφ)', body: '基本式を電流について解いた式です。電線や遮断器の選定に使います。' },
        ]
      : [
          { title: '皮相電力', expr: 'S = k × V × I ÷ 1000', body: '電圧 × 電流そのものの大きさです。' },
          { title: '有効電力', expr: 'P = S × cosφ', body: '皮相電力に力率を掛けると、実際に仕事をする電力になります。' },
        ]),
  ];
  return {
    formulas,
    symbols: [
      { symbol: 'k', origin: '係数（coefficient）を表す慣用記号', meaning: '電気方式による係数（直流・単相 1、三相 √3）', unit: '—' },
      { symbol: 'V', origin: 'Voltage（電圧）の頭文字', meaning: '電圧（三相は線間電圧）', unit: 'V' },
      { symbol: 'I', origin: 'フランス語 intensité du courant（電流の強さ）に由来する電流の慣用記号', meaning: '電流（三相は線電流）', unit: 'A' },
      { symbol: 'cosφ', origin: 'φ（ファイ）は電圧と電流の位相差（ずれの角度）、cos はその余弦', meaning: '力率。電流のうち仕事に使われる割合', unit: '—' },
      { symbol: 'P', origin: 'Power（電力）の頭文字', meaning: p2i ? '消費電力（電動機は定格出力）' : '有効電力', unit: 'kW' },
      ...(p2i
        ? [
            { symbol: 'η', origin: 'ギリシャ文字イータ。効率を表す慣用記号', meaning: '効率（出力 ÷ 入力）', unit: '—' },
            { symbol: 'Pi', origin: 'P に i（input：入力）を添えた本サイトの表記', meaning: '入力電力', unit: 'kW' },
          ]
        : []),
      { symbol: 'S', origin: '皮相電力の慣用記号（ドイツ語 Scheinleistung（見かけの電力）に由来するとされる）', meaning: '皮相電力', unit: 'kVA' },
    ],
  };
}

export const el02Beginner: BeginnerDoc = {
  purpose: [
    '機器の消費電力（kW）から電流（A）を求めたり、測った電流から電力を求めたりする計算です。電線の太さ、遮断器、変圧器の容量を決める出発点になります。',
    '設計の初期に負荷の一覧（負荷表）を作る段階で、各機器の電流や容量を出すのに使います。',
  ],
  terms: [
    { term: 'kW と kVA', desc: 'kW は実際に仕事をする電力（有効電力）、kVA は電圧 × 電流の大きさ（皮相電力）。力率が 1 なら同じ値です。' },
    { term: '力率（cosφ）', desc: '電流のうち仕事に使われる割合。電動機は 0.8〜0.9 程度、ヒーターや LED 電源などはほぼ 1 です。' },
    { term: '効率（η）', desc: '入力に対する出力の割合。電動機の定格出力 11 kW、効率 0.9 なら、入力は約 12.2 kW です。' },
    { term: '線間電圧', desc: '三相の電線2本の間の電圧。三相 200 V というときはこの値です。' },
  ],
  example: {
    title: '三相 200 V、電動機の定格出力 11 kW、効率 0.9、力率 0.85 の場合',
    steps: [
      '入力電力 Pi = 11 ÷ 0.9 ≒ 12.22 kW',
      '皮相電力 S = 12.22 ÷ 0.85 ≒ 14.38 kVA',
      '電流 I = 12.22 × 1000 ÷ (1.732 × 200 × 0.85) ≒ 41.5 A',
    ],
  },
  pitfalls: [
    '三相で √3 を掛け忘れる（電流が約 1.7 倍に見積もられます）。',
    '電動機の定格出力（軸出力）を入力電力と取り違える。効率で割って入力に直します。',
    'kW と kVA の混同。変圧器や発電機は kVA で選びます。',
    '実際の電動機の電流は極数やメーカーで異なります。分岐回路の設計には、メーカーの定格電流や内線規程の値を使います。',
  ],
};
