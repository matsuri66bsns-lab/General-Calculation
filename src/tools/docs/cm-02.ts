import type { BeginnerDoc, SymbolDoc, ToolDoc, Values } from '../../core/types';

const S = {
  Q: { symbol: 'Q', origin: '流量を表す慣用記号（Quantity（量）に由来するとされる）', meaning: '管を流れる流量（入力した単位のまま）', unit: 'L/min または m³/h' },
  Qs: { symbol: 'Qs', origin: 'Q に s（second：秒）を添えた本サイトの表記', meaning: '流量を毎秒の体積に直した値', unit: 'm³/s' },
} satisfies Record<string, SymbolDoc>;

export function cm02Doc(v: Values): ToolDoc {
  const lmin = String(v.qunit) !== 'm3h';
  const conv = {
    title: '流量の単位換算',
    expr: lmin ? 'Qs = Q ÷ 60000' : 'Qs = Q ÷ 3600',
    body: lmin
      ? 'L/min を m³/s に直します。1 m³ = 1000 L、1 分 = 60 秒なので、1000 × 60 = 60000 で割ります。'
      : 'm³/h を m³/s に直します。1 時間 = 3600 秒なので 3600 で割ります。',
  };
  if (String(v.method) === 'd') {
    return {
      formulas: [
        conv,
        { title: '必要断面積（連続の式）', expr: 'Ar = Qs ÷ vt', body: '連続の式 Q = A × v を断面積について解いたものです。流量を目標流速で割ると、その流速に収めるのに必要な断面積になります。' },
        { title: '必要内径', expr: 'dr = √(4 × Ar ÷ π) × 1000', body: '円の面積 A = π d² ÷ 4 を内径 d について解き、1000 を掛けて m を mm に直します。実際の管は、この値以上の実内径をもつものを選びます。' },
      ],
      symbols: [
        S.Q,
        S.Qs,
        { symbol: 'vt', origin: 'v（velocity：速度）に t（target：目標）を添えた本サイトの表記', meaning: '目標とする管内流速', unit: 'm/s' },
        { symbol: 'Ar', origin: 'A（Area：面積）に r（required：必要）を添えた本サイトの表記', meaning: '目標流速に収めるのに必要な管の断面積', unit: 'm²' },
        { symbol: 'dr', origin: 'd（diameter：直径）に r（required：必要）を添えた本サイトの表記', meaning: '必要な管内径', unit: 'mm' },
      ],
    };
  }
  return {
    formulas: [
      conv,
      { title: '管の断面積', expr: 'A = π × (d ÷ 1000)² ÷ 4', body: '内径 d（mm）を 1000 で割って m にしてから、円の面積の式で断面積を求めます。' },
      { title: '管内流速（連続の式）', expr: 'v = Qs ÷ A', body: '連続の式 Q = A × v を流速について解いたものです。同じ流量なら、管が細いほど流速は速くなります。' },
    ],
    symbols: [
      S.Q,
      S.Qs,
      { symbol: 'd', origin: 'diameter（直径）の頭文字', meaning: '管の実内径', unit: 'mm' },
      { symbol: 'A', origin: 'Area（面積）の頭文字', meaning: '管の内側の断面積', unit: 'm²' },
      { symbol: 'v', origin: 'velocity（速度）の頭文字', meaning: '管内の平均流速', unit: 'm/s' },
    ],
  };
}

export const cm02Beginner: BeginnerDoc = {
  purpose: [
    '配管の中を水などがどれくらいの速さで流れるかを求める計算です。流速が速すぎると騒音やウォーターハンマー（水撃）、管の摩耗の原因になり、遅すぎると管が必要以上に太くなります。',
    '基本設計・実施設計で管径を決めるときに、流速が目安の範囲に入っているかを確かめるために使います。必要内径から呼び径を選ぶときは、管の規格表で実内径を確認します。',
  ],
  terms: [
    { term: '連続の式', desc: '流量 Q = 断面積 A × 平均流速 v。管のどの断面でも流れる量は同じ、という関係です。' },
    { term: '実内径（mm）', desc: '管の内側の実際の直径。呼び径（20A、25A など）とは一致しないので、管の規格表で確認します。' },
    { term: 'L/min と m³/h', desc: '1 m³/h = 1000 L ÷ 60 min ≒ 16.67 L/min。給水では L/min、冷温水や大きな流量では m³/h がよく使われます。' },
    { term: '流速（m/s）', desc: '1 秒間に流体が進む距離。管内の断面で平均した値です。' },
  ],
  example: {
    title: '流量 100 L/min を内径 40 mm の管に流す場合',
    steps: [
      '流量を m³/s に直す：Qs = 100 ÷ 60000 ≒ 0.001667 m³/s',
      '断面積：A = π × 0.040² ÷ 4 ≒ 0.001257 m²',
      '流速：v = 0.001667 ÷ 0.001257 ≒ 1.33 m/s',
      '逆に目標流速 1.5 m/s とすると、必要断面積 Ar = 0.001667 ÷ 1.5 ≒ 0.001111 m²、必要内径 dr = √(4 × 0.001111 ÷ π) × 1000 ≒ 37.6 mm',
    ],
  },
  pitfalls: [
    '呼び径（40A など）の数字をそのまま内径として入れてしまう。実内径は管の種類で異なります。',
    'mm と m を混同する。断面積は m² で計算するので、内径を 1000 で割ってから 2 乗します。',
    'L/min と m³/h を混同する。約 16.7 倍違います。',
    '流速の目安は法令の基準ではありません。用途（給水、冷温水、給湯）や案件の基準で確認します。',
  ],
};
