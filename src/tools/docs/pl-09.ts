import type { BeginnerDoc, ToolDoc } from '../../core/types';

export function pl09Doc(): ToolDoc {
  return {
    formulas: [
      { title: '集水面積', expr: 'At = A + Aw × β ÷ 100', body: '屋根の水平投影面積に、屋根へ雨が流れ込む壁面の面積を割合 β だけ加えます。壁に横から吹き付けた雨も屋根の排水口に集まるためです。' },
      { title: '雨水流量', expr: 'Q = r × At ÷ 3600', body: '降雨強度 r mm/h の雨が面積 At m² に降ると、1時間に r × At リットルの雨水になります（1 mm × 1 m² = 1 L）。3600 で割って毎秒の流量にします。' },
      { title: '降雨強度 100 mm/h 換算の屋根面積', expr: 'A′ = At × r ÷ 100、 A′₁ = A′ ÷ N', body: 'SHASE-S 206 の許容最大屋根面積の表は 100 mm/h を基準にしています。降雨強度が 120 mm/h なら、面積を 1.2 倍にして表と比べます。雨水管が複数あるときは1本当たりに分けます。' },
      { title: '判定', expr: 'A′₁ ≤ Aa', body: '1本当たりの換算屋根面積が、選んだ管径の許容最大屋根面積以下なら OK です。' },
    ],
    symbols: [
      { symbol: 'A', origin: 'Area（面積）の頭文字', meaning: '屋根の水平投影面積', unit: 'm²' },
      { symbol: 'Aw', origin: 'A に w（wall：壁）を添えた本サイトの表記', meaning: '屋根に雨水が流れ込む壁面の面積', unit: 'm²' },
      { symbol: 'β', origin: 'ギリシャ文字ベータ。割合として本サイトで使用', meaning: '壁面積を加算する割合', unit: '%' },
      { symbol: 'At', origin: 'A に t（total：合計）を添えた本サイトの表記', meaning: '集水面積（屋根面積 + 壁面の加算分）', unit: 'm²' },
      { symbol: 'r', origin: 'rainfall（降雨）の頭文字', meaning: '最大降雨強度', unit: 'mm/h' },
      { symbol: 'N', origin: 'Number（数）の頭文字', meaning: '雨水管の本数', unit: '本' },
      { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '雨水流量', unit: 'L/s' },
      { symbol: 'Q′', origin: 'Q にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '雨水流量（毎分）', unit: 'L/min' },
      { symbol: 'A′', origin: 'A にダッシュ（′）を付けた本サイトの表記', meaning: '降雨強度 100 mm/h に換算した屋根面積', unit: 'm²' },
      { symbol: 'A′₁', origin: 'A′ に添字 1（1本当たり）を付けた本サイトの表記', meaning: '雨水管1本当たりの換算屋根面積', unit: 'm²' },
      { symbol: 'D', origin: 'Diameter（直径）の頭文字', meaning: '選んだ雨水管の呼び径', unit: 'mm' },
      { symbol: 'Aa', origin: 'A に a（allowable：許容）を添えた本サイトの表記', meaning: '選んだ管径の許容最大屋根面積（100 mm/h 基準、SHASE-S 206 の表の値）', unit: 'm²' },
    ],
  };
}

export const pl09Beginner: BeginnerDoc = {
  purpose: [
    '屋根に降った雨を流す雨水管（ルーフドレンからの立て管・横管）の太さが足りるかを確かめる計算です。',
    '実施設計で、ルーフドレンの数と位置、雨水立て管の本数と管径を決める段階で使います。',
  ],
  terms: [
    { term: '降雨強度（mm/h）', desc: '1時間に降る雨の深さ。100 mm/h は非常に強い雨で、地域ごとの記録をもとに設計値を決めます。' },
    { term: '水平投影面積（m²）', desc: '屋根を真上から見たときの面積。勾配屋根でも斜面の長さではなく、平面図上の面積を使います。' },
    { term: '許容最大屋根面積（m²）', desc: 'その管径の雨水管1本で受け持てる屋根の面積。SHASE-S 206 の表は 100 mm/h を基準にしています。' },
    { term: 'mm × m² = L', desc: '深さ 1 mm の雨が 1 m² に降ると 1 L。降雨強度と面積を掛けるとそのまま L/h になります。' },
  ],
  example: {
    title: '屋根 500 m²、流れ込む壁面 100 m²（50 % 加算）、降雨強度 120 mm/h、立て管 2 本',
    steps: [
      '集水面積 At = 500 + 100 × 50 ÷ 100 = 550 m²',
      '雨水流量 Q = 120 × 550 ÷ 3600 ≒ 18.33 L/s（1,100 L/min）',
      '100 mm/h 換算の面積 A′ = 550 × 120 ÷ 100 = 660 m²、1本当たり 330 m²',
      '表から 100 mm の立て管の許容最大屋根面積を読み取る（例では 425 m² と入力）。330 ≤ 425 なので OK',
    ],
  },
  pitfalls: [
    '降雨強度を 100 mm/h 以外にしたのに、表の面積と直接比べてしまう。必ず 100 mm/h に換算してから比べます。',
    '勾配屋根で斜面の面積を使ってしまう。雨は鉛直に降るので水平投影面積を使います。',
    '屋根より高い壁から流れ込む雨を忘れる。塔屋の壁などは加算します。',
    'ルーフドレン1か所が詰まったときの対策（オーバーフロー管など）を考えない。',
  ],
};
