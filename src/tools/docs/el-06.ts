import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const S = {
  Pb: { symbol: 'Pb', origin: 'P（Power：電力・容量）に b（base：基準）を添えた慣用の表記', meaning: '基準容量。各要素の％インピーダンスをそろえるときの基準にする容量', unit: 'kVA' },
  V: { symbol: 'V', origin: 'Voltage（電圧）の頭文字', meaning: '短絡点の線間電圧（基準電圧）', unit: 'V' },
  Ps: { symbol: 'Ps', origin: 'P（Power：容量）に s（source：電源）を添えた本サイトの表記', meaning: '受電点の三相短絡容量（電力会社から示される値）', unit: 'MVA' },
  Zs: { symbol: '%Zs', origin: '%Z（パーセントインピーダンス。Z は impedance の慣用記号）に s（source：電源）を添えた表記', meaning: '電源側（受電点より上流）の％インピーダンスを基準容量で表した値', unit: '%' },
  Pt: { symbol: 'Pt', origin: 'P（Power：容量）に t（transformer：変圧器）を添えた表記', meaning: '変圧器の定格容量', unit: 'kVA' },
  Zt: { symbol: '%Zt', origin: '%Z に t（transformer：変圧器）を添えた表記', meaning: '変圧器の％インピーダンス（変圧器自身の定格容量が基準。銘板の値）', unit: '%' },
  Ztb: { symbol: '%Zt′', origin: '%Zt にダッシュ（′）を付け、基準容量に換算した値を表す本サイトの表記', meaning: '変圧器の％インピーダンス（基準容量換算）', unit: '%' },
  Rt: { symbol: '%Rt', origin: '%R（パーセント抵抗。R は Resistance：抵抗）に t（transformer）を添えた表記', meaning: '変圧器の％抵抗（自己容量基準）。負荷損 ÷ 定格容量 × 100 に等しい', unit: '%' },
  Xt: { symbol: '%Xt', origin: '%X（パーセントリアクタンス。X は reactance の慣用記号）に t を添えた表記', meaning: '変圧器の％リアクタンス（自己容量基準）', unit: '%' },
  Rtb: { symbol: '%Rt′', origin: '%Rt にダッシュ（′）を付けた本サイトの表記', meaning: '変圧器の％抵抗（基準容量換算）', unit: '%' },
  Xtb: { symbol: '%Xt′', origin: '%Xt にダッシュ（′）を付けた本サイトの表記', meaning: '変圧器の％リアクタンス（基準容量換算）', unit: '%' },
  r: { symbol: 'r', origin: 'resistance（抵抗）の頭文字。小文字で単位長さ当たりの値を表す慣用記号', meaning: 'ケーブルの 1 km 当たりの交流導体抵抗', unit: 'Ω/km' },
  x: { symbol: 'x', origin: 'reactance（リアクタンス）の慣用記号 X の小文字。単位長さ当たりの値', meaning: 'ケーブルの 1 km 当たりのリアクタンス', unit: 'Ω/km' },
  L: { symbol: 'L', origin: 'Length（長さ）の頭文字', meaning: 'ケーブルのこう長（片道）', unit: 'm' },
  Rc: { symbol: 'Rc', origin: 'R（Resistance：抵抗）に c（cable：ケーブル）を添えた本サイトの表記', meaning: 'ケーブル1相分の抵抗', unit: 'mΩ' },
  Xc: { symbol: 'Xc', origin: 'X（reactance）に c（cable）を添えた本サイトの表記', meaning: 'ケーブル1相分のリアクタンス', unit: 'mΩ' },
  pRc: { symbol: '%Rc', origin: '%R に c（cable：ケーブル）を添えた本サイトの表記', meaning: 'ケーブルの％抵抗（基準容量換算）', unit: '%' },
  pXc: { symbol: '%Xc', origin: '%X に c（cable）を添えた本サイトの表記', meaning: 'ケーブルの％リアクタンス（基準容量換算）', unit: '%' },
  pZc: { symbol: '%Zc', origin: '%Z に c（cable）を添えた本サイトの表記', meaning: 'ケーブルの％インピーダンス（基準容量換算）', unit: '%' },
  Z: { symbol: '%Z', origin: 'パーセントインピーダンス（percent impedance）。Z はインピーダンスの慣用記号', meaning: '電源から短絡点までの合成％インピーダンス（基準容量換算）', unit: '%' },
  R: { symbol: '%R', origin: 'パーセント抵抗。R は Resistance（抵抗）の頭文字', meaning: '合成％抵抗', unit: '%' },
  X: { symbol: '%X', origin: 'パーセントリアクタンス。X はリアクタンスの慣用記号', meaning: '合成％リアクタンス', unit: '%' },
  In: { symbol: 'In', origin: 'I（電流の慣用記号。フランス語 intensité に由来）に n（nominal：定格・基準）を添えた表記', meaning: '基準電流。基準容量を短絡点の電圧で流したときの電流', unit: 'A' },
  Is: { symbol: 'Is', origin: 'I（電流）に s（short-circuit：短絡）を添えた表記', meaning: '三相短絡電流（交流対称分の実効値）', unit: 'kA' },
  Psc: { symbol: 'Psc', origin: 'P（Power：容量）に sc（short-circuit：短絡）を添えた本サイトの表記', meaning: '短絡点の三相短絡容量', unit: 'MVA' },
  Ib: { symbol: 'Ib', origin: 'I（電流）に b（breaking：遮断）を添えた本サイトの表記', meaning: '遮断器の定格遮断電流（交流対称値）', unit: 'kA' },
} satisfies Record<string, SymbolDoc>;

export function el06Doc(v: Values): ToolDoc {
  const isRx = String(v.method) === 'rx';
  const src = String(v.src);
  const hasTr = String(v.tr) === 'yes';
  const cable = String(v.cable);

  const formulas: ToolDoc['formulas'] = [];
  const symbols: SymbolDoc[] = [S.Pb, S.V];

  if (src === 'mva') {
    formulas.push({ title: '電源側の％インピーダンス', expr: '%Zs = Pb ÷ (Ps × 1000) × 100', body: '受電点の短絡容量 Ps は「受電点で三相短絡したときに流れる容量」です。基準容量との比から、電源側の％インピーダンスが求まります。1000 は MVA を kVA に直す係数です。' });
    symbols.push(S.Ps);
  }
  symbols.push(S.Zs);

  if (hasTr) {
    symbols.push(S.Pt, S.Zt);
    if (!isRx) {
      formulas.push({ title: '変圧器の％インピーダンスの換算', expr: '%Zt′ = %Zt × Pb ÷ Pt', body: '銘板の％インピーダンスは変圧器自身の定格容量が基準です。％インピーダンスは基準容量に比例するので、Pb ÷ Pt を掛けて基準容量にそろえます。' });
      symbols.push(S.Ztb);
    } else {
      formulas.push({ title: '変圧器の％リアクタンス', expr: '%Xt = √(%Zt² − %Rt²)', body: '％インピーダンスは％抵抗と％リアクタンスを直角に合成した大きさです。％Z と％R から、ピタゴラスの定理で％X を求めます。' });
      formulas.push({ title: '変圧器の基準容量への換算', expr: '%Rt′ = %Rt × Pb ÷ Pt、 %Xt′ = %Xt × Pb ÷ Pt', body: '抵抗分・リアクタンス分のそれぞれに Pb ÷ Pt を掛けて基準容量にそろえます。' });
      symbols.push(S.Rt, S.Xt, S.Rtb, S.Xtb);
    }
  }

  if (cable === 'ohm') {
    formulas.push({ title: 'ケーブルの抵抗・リアクタンス', expr: 'Rc = r × L、 Xc = x × L', body: '1 km 当たりの値（Ω/km）にこう長（m）を掛けると、単位は mΩ になります。三相短絡では1相分の値を使うので、往復の 2 倍はしません。' });
    formulas.push({ title: 'オーム値から％値への換算', expr: '%Rc = 100 × Rc × Pb ÷ V²', body: '基準インピーダンス V² ÷ (Pb × 1000) に対する割合です。Rc を mΩ、Pb を kVA、V を V で入れると係数が 100 になります（%Xc も同じ式）。ケーブルの電圧と短絡点の電圧 V が同じであることが前提です。' });
    symbols.push(S.r, S.x, S.L, S.Rc, S.Xc, S.pRc, S.pXc);
    if (!isRx) {
      formulas.push({ title: 'ケーブルの％インピーダンス', expr: '%Zc = √(%Rc² + %Xc²)', body: 'ケーブル単体の抵抗分とリアクタンス分を直角に合成します。' });
      symbols.push(S.pZc);
    }
  } else if (cable === 'pz') {
    symbols.push(isRx ? S.pRc : S.pZc);
    if (isRx) symbols.push(S.pXc);
  }

  if (!isRx) {
    formulas.push({ title: '合成％インピーダンス（スカラー和）', expr: '%Z = %Zs + %Zt′ + %Zc', body: '直列につながる要素の％インピーダンスの大きさを足し合わせる簡易法です。抵抗分とリアクタンス分の位相差を無視するため、実際より大きめの値になり、短絡電流は小さめに出ます。' });
  } else {
    formulas.push({ title: '合成％インピーダンス（R・X 分離）', expr: '%R = %Rt′ + %Rc、 %X = %Zs + %Xt′ + %Xc、 %Z = √(%R² + %X²)', body: '抵抗分どうし、リアクタンス分どうしを別々に足してから直角に合成します。電源側の％インピーダンスはリアクタンス分として扱います。' });
    symbols.push(S.R, S.X);
  }
  symbols.push(S.Z);

  formulas.push(
    { title: '基準電流', expr: 'In = Pb × 1000 ÷ (√3 × V)', body: '基準容量を三相の線間電圧 V で流したときの電流です。1000 は kVA を VA に直す係数です。' },
    { title: '三相短絡電流（高圧受電設備規程・内線規程の資料）', expr: 'Is = In × 100 ÷ %Z ÷ 1000', body: '％インピーダンスは「基準電流を流したときの電圧降下が定格電圧の何 % か」を表します。短絡時は電圧全体がインピーダンスにかかるので、基準電流の 100 ÷ %Z 倍の電流が流れます。1000 で割って kA にします。' },
    { title: '短絡容量', expr: 'Psc = Pb × 100 ÷ %Z ÷ 1000', body: '短絡点の三相短絡容量（MVA）です。上流の設備を選ぶときの目安になります。' },
    { title: '判定', expr: 'Is ≤ Ib', body: '短絡電流が遮断器の定格遮断電流以下なら適合（OK）です。' },
  );
  symbols.push(S.In, S.Is, S.Psc, S.Ib);
  return { formulas, symbols };
}

export const el06Beginner: BeginnerDoc = {
  purpose: [
    '電線どうしが接触するなどの短絡事故が起きたときに流れる、非常に大きな電流を求める計算です。遮断器がこの電流を安全に切れるか（遮断容量が足りるか）を確かめるのが主な目的です。',
    '受変電設備の基本設計で変圧器の容量と％インピーダンスが決まった段階で行い、主幹・分岐の遮断器の定格遮断電流を選ぶ根拠にします。ケーブルの短絡時の熱的強度の確認にも使います。',
  ],
  terms: [
    { term: '％インピーダンス（%Z）', desc: '定格電流（基準電流）を流したとき、機器の中で下がる電圧が定格電圧の何 % かを表す値です。小さいほど短絡電流が大きくなります。' },
    { term: '基準容量', desc: '各機器の％インピーダンスを同じ物差しにそろえるための容量です。10,000 kVA がよく使われます。どの値を選んでも短絡電流の結果は変わりません。' },
    { term: '短絡容量（MVA）', desc: '短絡時に流れる電流と電圧から求めた容量です。受電点の値は電力会社から示されます。' },
    { term: '定格遮断電流（kA）', desc: '遮断器が安全に切ることのできる短絡電流の上限です。カタログに記載されています。' },
    { term: 'kA', desc: 'キロアンペア。1 kA = 1,000 A です。' },
  ],
  example: {
    title: '基準容量 10,000 kVA、受電点の短絡容量 100 MVA、変圧器 500 kVA・％Z 5 %、二次電圧 210 V の場合（スカラー和）',
    steps: [
      '電源側 %Zs = 10,000 ÷ (100 × 1000) × 100 = 10 %',
      '変圧器 %Zt′ = 5 × 10,000 ÷ 500 = 100 %',
      '合成 %Z = 10 + 100 = 110 %',
      '基準電流 In = 10,000 × 1000 ÷ (√3 × 210) ≒ 27,493 A',
      '短絡電流 Is = 27,493 × 100 ÷ 110 ÷ 1000 ≒ 24.99 kA。定格遮断電流 35 kA の遮断器なら適合です。',
    ],
  },
  pitfalls: [
    '変圧器の銘板の％Z を基準容量に換算し忘れる。銘板の値は変圧器自身の容量が基準です。',
    '短絡点と違う電圧のケーブルを同じ式で換算してしまう。変圧器の二次側で短絡を考えるときは、二次側のケーブルだけを入れます。',
    'ケーブルのこう長に往復の長さを入れる。三相短絡では1相分（片道）の値を使います。',
    'ケーブルを含む低圧回路で％Z をスカラー和にすると、短絡電流を小さめに見積もります。R と X を分けて合成する方式でも確認します。',
    '電動機からの寄与電流や非対称分は含んでいません。電動機の多い設備では余裕を見て遮断器を選びます。',
  ],
};
