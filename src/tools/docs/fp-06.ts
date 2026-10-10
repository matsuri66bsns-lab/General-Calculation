import type { BeginnerDoc, ToolDoc, Values } from '../../core/types';

export function fp06Doc(v: Values): ToolDoc {
  const multi = String(v.zones) === 'multi';
  return {
    formulas: [
      {
        title: '床面積による排煙量（建築基準法施行令第126条の3第1項第9号）',
        expr: multi ? 'Qa = Amax × 2' : 'Qa = A × 1',
        body: multi
          ? '2以上の防煙区画を1台の排煙機で受け持つ場合は、最大の防煙区画の床面積 1 m² につき 2 m³/min とします。隣の区画へ煙が広がって排煙口が複数開く場合にも能力が足りるようにするためです。'
          : '1つの防煙区画を受け持つ場合は、床面積 1 m² につき 1 m³/min とします。',
      },
      {
        title: '必要排煙量（同号）',
        expr: 'Q = max(120, Qa)',
        body: '排煙機の能力は 120 m³/min 以上で、かつ床面積による排煙量以上とします。小さな区画でも最低 120 m³/min が必要です。',
      },
      {
        title: '毎時への換算',
        expr: 'Q′ = Q × 60',
        body: '排煙機のカタログが m³/h 表記の場合に比べやすくするための換算です。',
      },
    ],
    symbols: [
      { symbol: 'r', origin: 'rate（割合）の頭文字。本サイトの表記', meaning: '床面積 1 m² 当たりの排煙量（1つの区画 1、2以上 2）', unit: 'm³/(min·m²)' },
      { symbol: 'Qmin', origin: 'Q（流量の慣用記号）に min（minimum：最小）を添えた本サイトの表記', meaning: '排煙機の最低排煙量（120 m³/min）', unit: 'm³/min' },
      multi
        ? { symbol: 'Amax', origin: 'A（Area：面積）に max（maximum：最大）を添えた本サイトの表記', meaning: '受け持つ防煙区画のうち最大のものの床面積', unit: 'm²' }
        : { symbol: 'A', origin: 'Area（面積）の頭文字', meaning: '防煙区画の床面積', unit: 'm²' },
      { symbol: 'Qa', origin: 'Q に a（area：面積）を添えた本サイトの表記', meaning: '床面積から求めた排煙量', unit: 'm³/min' },
      { symbol: 'Q', origin: '流量を表す慣用記号（Quantity：量に由来するとされる）', meaning: '排煙機の必要排煙量', unit: 'm³/min' },
      { symbol: 'Q′', origin: 'Q にダッシュ（′）を付け、単位違いの同じ量を表す本サイトの表記', meaning: '必要排煙量（毎時）', unit: 'm³/h' },
    ],
  };
}

export const fp06Beginner: BeginnerDoc = {
  purpose: [
    '火災のときに煙を外へ出す排煙機（排煙用の送風機）に必要な能力を、建築基準法の基準で求める計算です。',
    '基本設計で排煙方式（自然排煙か機械排煙か）と防煙区画を決めた後、排煙機の大きさと排煙ダクトの太さを決める段階で使います。',
  ],
  terms: [
    { term: '防煙区画', desc: '防煙壁（天井から 50 cm 以上下がった垂れ壁など）で区切られた範囲。床面積 500 m² 以内ごとに区画します。' },
    { term: '機械排煙', desc: '排煙機で煙を強制的に吸い出す方式。窓などから直接外へ出す自然排煙に対する呼び方です。' },
    { term: '排煙口', desc: '天井や壁の上部に設ける、煙を取り込む口。火災時に手動または感知器連動で開きます。' },
    { term: 'm³/min と m³/h', desc: '1分間・1時間に排出する空気の体積。1 m³/min = 60 m³/h です。' },
  ],
  example: {
    title: '1つの防煙区画（床面積 300 m²）を受け持つ排煙機の場合',
    steps: [
      '床面積による排煙量 Qa = 300 × 1 = 300 m³/min',
      '必要排煙量 Q = max(120, 300) = 300 m³/min',
      '毎時に直すと Q′ = 300 × 60 = 18,000 m³/h',
      '同じ 300 m² が最大の区画で、2以上の区画を受け持つなら Qa = 300 × 2 = 600 m³/min',
    ],
  },
  pitfalls: [
    '2以上の防煙区画を受け持つのに、区画の床面積の合計を入れてしまう。使うのは最大の区画の床面積で、係数を 2 にします。',
    '小さな区画で 120 m³/min の最低値を忘れる。',
    'm³/min と m³/h を取り違える。カタログ値と比べるときは単位をそろえます。',
    '法令の値ぎりぎりで排煙機を選ぶ。ダクトの漏れや静圧を見込んで余裕を持たせます。',
  ],
};
