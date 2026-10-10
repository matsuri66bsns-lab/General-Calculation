import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const SUB = ['', '₁', '₂', '₃', '₄'];

export function el16Doc(v: Values): ToolDoc {
  const k = Number(v.k) || 1;
  const custom = String(v.conduit) === 'custom';
  const symbols: SymbolDoc[] = [
    { symbol: 'εa', origin: 'ε（イプシロン。比率を表す記号として本サイトで使用）に a（allowable：許容）を添えた本サイトの表記', meaning: '占積率の上限（内線規程で確認した値）', unit: '%' },
  ];
  for (let i = 1; i <= k; i++) {
    symbols.push(
      { symbol: `n${SUB[i]}`, origin: `number（数）の頭文字に電線の番号 ${i} を添えた表記`, meaning: `電線${i} の本数`, unit: '本' },
      { symbol: `d${SUB[i]}`, origin: `diameter（直径）の頭文字に電線の番号 ${i} を添えた表記`, meaning: `電線${i} の仕上がり外径（被覆を含む）`, unit: 'mm' },
    );
  }
  symbols.push({ symbol: 'Aw', origin: 'A（Area：面積）に w（wire：電線）を添えた本サイトの表記', meaning: '電線の断面積（被覆を含む）の合計', unit: 'mm²' });
  if (!custom) {
    symbols.push(
      { symbol: 'Do', origin: 'D（Diameter：直径）に o（outside：外側）を添えた本サイトの表記', meaning: '電線管の外径（JIS C 8305 の基準寸法）', unit: 'mm' },
      { symbol: 't', origin: 'thickness（厚さ）の頭文字。JIS C 8305 の表でも使われる記号', meaning: '電線管の厚さ（JIS C 8305 の基準寸法）', unit: 'mm' },
    );
  }
  symbols.push(
    { symbol: 'D', origin: 'Diameter（直径）の頭文字', meaning: '電線管の内径', unit: 'mm' },
    { symbol: 'Ac', origin: 'A（Area：面積）に c（conduit：電線管）を添えた本サイトの表記', meaning: '電線管の内断面積', unit: 'mm²' },
    { symbol: 'ε', origin: 'ギリシャ文字イプシロン。比率を表す記号として本サイトで使用', meaning: '占積率', unit: '%' },
    { symbol: 'Dr', origin: 'D に r（required：必要）を添えた本サイトの表記', meaning: '占積率の上限に収まる最小の管内径', unit: 'mm' },
  );

  const formulas: ToolDoc['formulas'] = [
    { title: '電線の断面積の合計', expr: 'Aw = π ÷ 4 × (n₁ × d₁² + n₂ × d₂² + …)', body: '電線を被覆まで含めた円とみなし、1本の断面積 π × d² ÷ 4 に本数を掛けて合計します。' },
  ];
  if (!custom) {
    formulas.push({ title: '電線管の内径（JIS C 8305 の寸法から）', expr: 'D = Do − 2 × t', body: 'JIS C 8305 の表に示された外径と厚さの基準寸法から内径を求めます。許容差は考慮していません。' });
  }
  formulas.push(
    { title: '管の内断面積', expr: 'Ac = π ÷ 4 × D²', body: '電線管の内側の円の面積です。' },
    { title: '占積率（内線規程）', expr: 'ε = Aw ÷ Ac × 100', body: '管の内側の面積のうち、電線が占める割合です。大き過ぎると電線を引き入れにくく、被覆を傷めたり放熱が悪くなったりします。' },
    { title: '判定', expr: 'ε ≤ εa', body: '占積率が上限以下なら適合（OK）です。上限は内線規程で、同一太さの電線は 48 %、異なる太さの電線は 32 % とされるのが一般的です（原文で確認してください）。' },
    { title: '上限に収まる最小の管内径', expr: 'Dr = √(4 × Aw ÷ (π × εa ÷ 100))', body: '占積率がちょうど上限になる内径です。この値以上の内径の電線管を選びます。' },
  );
  return { formulas, symbols };
}

export const el16Beginner: BeginnerDoc = {
  purpose: [
    '電線管の中に電線を何本まで入れられるか、または何本かの電線を入れるのに必要な管の太さを確かめる計算です。電線が管の断面に占める割合（占積率）が上限以下になるようにします。',
    '実施設計で幹線・分岐回路の配管の太さを決めるときに使います。電線の太さと本数が決まった後に行います。',
  ],
  terms: [
    { term: '占積率（%）', desc: '電線の断面積（被覆を含む）の合計 ÷ 管の内断面積 × 100。管の中がどれだけ埋まっているかを表します。' },
    { term: '仕上がり外径', desc: '導体の上に絶縁体（被覆）をかぶせた完成品の外径です。導体の太さ（mm²）とは別の値です。' },
    { term: '電線管の呼び', desc: '電線管の太さを表す記号です。JIS C 8305 では厚鋼電線管は G、薄鋼電線管は C、ねじなし電線管は E の後に数字を付けて表します。' },
    { term: '内径（mm）', desc: '電線管の内側の直径です。外径から厚さの2倍を引いて求めます。' },
  ],
  example: {
    title: '外径 5.0 mm の電線 6 本を薄鋼電線管 C25 に入れる場合（同一太さ、上限 48 %）',
    steps: [
      '電線の断面積の合計 Aw = π ÷ 4 × 6 × 5.0² ≒ 117.8 mm²',
      'C25 の内径 D = 25.4 − 2 × 1.6 = 22.2 mm（JIS C 8305 表3 の外径と厚さから）',
      '管の内断面積 Ac = π ÷ 4 × 22.2² ≒ 387.1 mm²',
      '占積率 ε = 117.8 ÷ 387.1 × 100 ≒ 30.4 % で、上限 48 % 以下なので適合です。',
      '上限ちょうどの内径は √(4 × 117.8 ÷ (π × 0.48)) ≒ 17.7 mm',
    ],
  },
  pitfalls: [
    '電線の外径に導体の直径や公称断面積を使う。被覆を含む仕上がり外径を使います。',
    '電線管の呼びの数字を内径として使う。呼びの数字は内径とは一致しないので、外径と厚さから内径を求めます。',
    '太さの違う電線が混ざっているのに同一太さの上限（48 %）で判定する。異なる太さの電線を入れる場合は上限が小さくなります。',
    '占積率だけで管を決める。屈曲が多い区間や長い区間では、引き入れやすさを考えて余裕のある太さにします。',
  ],
};
