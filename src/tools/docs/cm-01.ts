import type { BeginnerDoc, ToolDoc, Values } from '../../core/types';

export function cm01Doc(v: Values): ToolDoc {
  const temp = v.q === 'temp';
  return {
    formulas: [
      temp
        ? { title: '基準単位（K）への換算', expr: 'X = x × a + b', body: '温度は目盛りの0点が単位ごとに違うため、掛け算に加えて足し算（b）が必要です。℃ → K は +273.15、℉ → K は × 5/9 + 255.372… です。' }
        : { title: '基準単位への換算', expr: 'X = x × a', body: '入力した値に、その単位1つが基準単位でいくつにあたるか（a）を掛けます。基準単位は圧力 Pa、流量 m³/s、熱量・動力 W、エネルギー J です。' },
      temp
        ? { title: '各単位への換算', expr: '値 = (X − b) ÷ a', body: '基準単位の値から、各単位の加算項 b を引き、係数 a で割ります。' }
        : { title: '各単位への換算', expr: '値 = X ÷ a', body: '基準単位の値を、各単位の係数 a で割ります。' },
    ],
    symbols: [
      { symbol: 'x', origin: '変数を表す慣用記号', meaning: '換算元の値', unit: '換算元の単位' },
      { symbol: 'a', origin: '係数を表す慣用記号', meaning: '換算係数（換算元の単位1つが基準単位でいくつか）', unit: '基準単位' },
      ...(temp ? [{ symbol: 'b', origin: '一次式 y = ax + b の切片を表す慣用記号', meaning: '換算の加算項（目盛りの0点のずれ）', unit: 'K' }] : []),
      { symbol: 'X', origin: '大文字で基準単位の値を表す本サイトの表記', meaning: '基準単位での値', unit: '基準単位' },
    ],
  };
}

export const cm01Beginner: BeginnerDoc = {
  purpose: [
    'メーカーの資料や古い図面・文献で使われる単位（mmAq、kcal/h、冷凍トンなど）を、SI 単位（Pa、kW など）にそろえるための換算です。',
    '計算の途中で単位が混ざると大きな誤りにつながるため、計算に入る前に単位をそろえる場面で使います。',
  ],
  terms: [
    { term: 'SI 単位', desc: '国際単位系。計量法でも原則としてこの単位を使います（Pa、W、J、m³/s など）。' },
    { term: 'mmAq（mmH₂O）', desc: '水柱ミリメートル。水を何 mm 押し上げる圧力かで表す、送風機やダクトの静圧でよく使われた単位。1 mmAq ≒ 9.80665 Pa。' },
    { term: 'kcal/h', desc: '1時間当たりのキロカロリー。1 kcal/h = 1.163 W。古い空調機器の能力表示に見られます。' },
    { term: '冷凍トン', desc: '冷凍能力の単位。米国冷凍トン（USRT）は約 3.517 kW、日本冷凍トン（JRT）は約 3.86 kW で、値が異なります。' },
  ],
  example: {
    title: '送風機の静圧 50 mmAq を Pa に、冷凍機 100 USRT を kW に換算する',
    steps: [
      '50 mmAq × 9.80665 ≒ 490 Pa',
      '100 USRT × 3.5169 ≒ 351.7 kW',
    ],
  },
  pitfalls: [
    '米国冷凍トン（USRT）と日本冷凍トン（JRT）を混同する。約 10 % 違います。',
    'kcal は定義が複数あります。本サイトは国際蒸気表カロリー（1 kcal = 4.1868 kJ）を使っています。',
    '圧力のゲージ圧（大気圧を0とする）と絶対圧を混同する。換算しても基準の違いは残ります。',
  ],
};
