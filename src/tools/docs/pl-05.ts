import type { BeginnerDoc, ToolDoc } from '../../core/types';

export function pl05Doc(): ToolDoc {
  return {
    formulas: [
      { title: '1日給湯量', expr: 'Qd = N × qd', body: '使用人員に1人1日当たりの給湯量を掛けます。給湯量の原単位は建物用途ごとの目安（便覧）から選びます。' },
      { title: '時間最大給湯量', expr: 'Qh = Qd × qh', body: '1日のうち最も多く使う1時間の給湯量です。加熱能力と貯湯容量はこの値を基準に決めます。' },
      { title: '加熱能力', expr: 'H = Qh × c × (th − tc) ÷ 3600', body: '時間最大給湯量を、給水温度から給湯温度まで1時間で温めるのに必要な熱量です。L/h に比熱 kJ/(kg·K) と温度差を掛けると kJ/h になり、3600 で割ると kW（kJ/s）になります。水の密度は 1 kg/L としています。' },
      { title: '貯湯容量', expr: 'V = Qh × k', body: 'ピーク時に加熱が追いつかない分を貯湯槽でまかないます。時間最大給湯量の何時間分を貯めるかを係数 k で決めます。' },
    ],
    symbols: [
      { symbol: 'N', origin: 'Number（数）の頭文字', meaning: '使用人員', unit: '人' },
      { symbol: 'qd', origin: '小文字の q（単位当たりの量）に d（day：日）を添えた本サイトの表記', meaning: '1人1日当たり給湯量', unit: 'L/(人·日)' },
      { symbol: 'qh', origin: 'q に h（hour：時間）を添えた本サイトの表記', meaning: '1日給湯量に対する時間最大給湯量の割合', unit: '—' },
      { symbol: 'th', origin: 't（temperature：温度）に h（hot：湯）を添えた本サイトの表記', meaning: '給湯温度', unit: '℃' },
      { symbol: 'tc', origin: 't（temperature：温度）に c（cold：水）を添えた本サイトの表記', meaning: '給水温度', unit: '℃' },
      { symbol: 'c', origin: '比熱（specific heat capacity）を表す慣用記号', meaning: '水の比熱（4.186）', unit: 'kJ/(kg·K)' },
      { symbol: 'k', origin: '係数（coefficient）を表す慣用記号。本サイトの表記', meaning: '貯湯時間係数（時間最大給湯量の何時間分を貯めるか）', unit: 'h' },
      { symbol: 'Qd', origin: 'Q（流量の慣用記号）に d（day：日）を添えたもの', meaning: '1日給湯量', unit: 'L/日' },
      { symbol: 'Qh', origin: 'Q に h（hour：時間）を添えたもの', meaning: '時間最大給湯量', unit: 'L/h' },
      { symbol: 'H', origin: 'Heat（熱）の頭文字。本サイトの表記', meaning: '加熱能力', unit: 'kW' },
      { symbol: 'V', origin: 'Volume（体積）の頭文字', meaning: '貯湯容量', unit: 'L' },
    ],
  };
}

export const pl05Beginner: BeginnerDoc = {
  purpose: [
    '中央式給湯設備で、ボイラー・給湯器の加熱能力と貯湯槽の大きさを決める計算です。',
    '基本設計で給湯方式（局所式・中央式）を決めたあと、実施設計で熱源機器と貯湯槽を選ぶ段階で使います。',
  ],
  terms: [
    { term: '時間最大給湯量（L/h）', desc: '1日のうち最も多く湯を使う1時間の量。機器は平均ではなくこの値に合わせます。' },
    { term: '加熱能力（kW）', desc: '1秒当たりに水へ与える熱量。1 kW = 1 kJ/s = 3600 kJ/h です。' },
    { term: '比熱（kJ/(kg·K)）', desc: '1 kg の物質を 1 K（1 ℃）上げるのに必要な熱量。水は約 4.186 kJ/(kg·K) です。' },
    { term: '貯湯槽', desc: '温めた湯をためておくタンク。ピーク時の不足分をまかないます。' },
  ],
  example: {
    title: '事務所 200人、10 L/(人·日)、時間最大の割合 1/5、60 ℃ / 5 ℃、貯湯 1 時間分',
    steps: [
      '1日給湯量 Qd = 200 × 10 = 2,000 L/日',
      '時間最大給湯量 Qh = 2,000 × 0.2 = 400 L/h',
      '加熱能力 H = 400 × 4.186 × (60 − 5) ÷ 3600 ≒ 25.6 kW',
      '貯湯容量 V = 400 × 1 = 400 L',
    ],
  },
  pitfalls: [
    '3600 で割り忘れて kJ/h のまま kW と思ってしまう。kJ/h ÷ 3600 = kW です。',
    '夏の給水温度で計算する。冬は給水温度が低く、必要な加熱能力が大きくなります。',
    '給湯量の原単位が、どの給湯温度を前提にした値かを確認しない。温度が違えば量も変わります。',
    '循環配管の熱損失を見込まない。中央式で循環させる場合は配管からの放熱分を加えます。',
  ],
};
