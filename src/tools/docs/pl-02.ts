import type { BeginnerDoc, SymbolDoc, ToolDoc } from '../../core/types';
import { HW_SYMBOLS } from './pl-03';

export interface FixtureDef {
  key: string;
  label: string;
  /** 個数の初期値 */
  n: string;
  /** 負荷単位の初期値（目安） */
  u: string;
  /** 目安の候補 */
  hints: { label: string; value: number }[];
}

const SUBS = ['₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₁₀', '₁₁', '₁₂'];
export const sub = (i: number) => SUBS[i];

/** 器具の行。負荷単位の値は SHASE-S 206 の表から利用者が入力する（ここの値は目安の初期値） */
export const PL02_FIXTURES: FixtureDef[] = [
  { key: 'wcv', label: '大便器（洗浄弁）', n: '4', u: '10', hints: [{ label: '公衆用 目安 10', value: 10 }, { label: '私室用 目安 6', value: 6 }] },
  { key: 'wct', label: '大便器（洗浄タンク）', n: '0', u: '5', hints: [{ label: '公衆用 目安 5', value: 5 }, { label: '私室用 目安 3', value: 3 }] },
  { key: 'ur', label: '小便器', n: '3', u: '5', hints: [{ label: '洗浄弁 目安 5', value: 5 }, { label: '洗浄タンク 目安 3', value: 3 }] },
  { key: 'lav', label: '洗面器', n: '4', u: '2', hints: [{ label: '公衆用 目安 2', value: 2 }, { label: '私室用 目安 1', value: 1 }] },
  { key: 'hw', label: '手洗器', n: '0', u: '1', hints: [{ label: '公衆用 目安 1', value: 1 }, { label: '私室用 目安 0.5', value: 0.5 }] },
  { key: 'osink', label: '事務室用流し', n: '1', u: '3', hints: [{ label: '目安 3', value: 3 }] },
  { key: 'ssink', label: '掃除流し', n: '1', u: '4', hints: [{ label: '公衆用 目安 4', value: 4 }, { label: '私室用 目安 3', value: 3 }] },
  { key: 'bath', label: '浴槽', n: '0', u: '4', hints: [{ label: '公衆用 目安 4', value: 4 }, { label: '私室用 目安 2', value: 2 }] },
  { key: 'shower', label: 'シャワー', n: '0', u: '4', hints: [{ label: '公衆用 目安 4', value: 4 }, { label: '私室用 目安 2', value: 2 }] },
];

function fixtureSymbols(list: FixtureDef[], unitName: string, unitOrigin: string): SymbolDoc[] {
  return list.flatMap((f, i) => [
    { symbol: `n${sub(i)}`, origin: `number（数）の頭文字 n に器具の番号を添えた本サイトの表記`, meaning: `${f.label}の個数`, unit: '個' },
    { symbol: `u${sub(i)}`, origin: `unit（単位）の頭文字 u に器具の番号を添えた本サイトの表記（${unitOrigin}）`, meaning: `${f.label}の${unitName}`, unit: '—' },
  ]);
}

export { fixtureSymbols };

export function pl02Doc(): ToolDoc {
  return {
    formulas: [
      { title: '給水負荷単位の合計（SHASE-S 206）', expr: 'ΣFU = Σ(n × u)', body: '器具ごとに「個数 × 器具給水負荷単位」を求めて合計します。器具給水負荷単位は、器具の使用頻度と1回の水量をもとに、洗面器などを基準にした重みです。値は SHASE-S 206 の表（公衆用・私室用の別）から入力します。' },
      { title: '同時使用流量', expr: 'Qp = 線図から読み取った値', body: 'すべての器具が同時に使われることはないため、ΣFU から SHASE-S 206 の同時使用流量線図で流量を読み取ります。洗浄弁の多い系統と少ない系統で曲線が異なります。' },
      { title: '必要内径', expr: 'Dr = √(4 × Qp ÷ 60000 ÷ (π × va)) × 1000', body: '流速を目標流速 va 以下にするための最小の内径です。流量 Qp（L/min）を m³/s に直し、断面積 = 流量 ÷ 流速 から直径を逆算しています。' },
      { title: '流速の確認', expr: 'v = (Qp ÷ 60000) ÷ (π × (D ÷ 1000)² ÷ 4)、 判定 v ≤ va', body: '選んだ管の内径で実際の流速を求め、目標流速以下なら OK とします。' },
      { title: '単位摩擦損失（ヘーゼン・ウィリアムス式）', expr: 'i = 10.67 × Q′^1.85 ÷ (C^1.85 × D′^4.87) × 9.80665', body: '選んだ管の 1 m 当たりの摩擦損失です。Q′ は m³/s、D′ は m に直した値です（PL-03 と同じ式）。' },
    ],
    symbols: [
      { symbol: 'n', origin: 'number（数）の頭文字', meaning: '器具の個数（明細の各行）', unit: '個' },
      { symbol: 'u', origin: 'unit（単位）の頭文字。本サイトの表記', meaning: '器具給水負荷単位（明細の各行。SHASE-S 206 の表の値）', unit: '—' },
      { symbol: 'FU', origin: 'fixture unit（器具単位）の略。SHASE-S 206 の用語', meaning: '明細の各行の給水負荷単位（n × u）', unit: '—' },
      { symbol: 'ΣFU', origin: 'Σ（シグマ：合計）と FU（fixture unit：器具単位）。SHASE-S 206 の用語', meaning: '給水負荷単位の合計', unit: '—' },
      { symbol: 'Qp', origin: 'Q（流量の慣用記号）に p（peak：ピーク）を添えた本サイトの表記', meaning: '同時使用流量（線図から読み取った値）', unit: 'L/min' },
      { symbol: 'va', origin: 'v（velocity：速度）に a（allowable：許容）を添えた本サイトの表記', meaning: '目標とする最大流速', unit: 'm/s' },
      { symbol: 'Dr', origin: 'D（Diameter：直径）に r（required：必要）を添えた本サイトの表記', meaning: '必要内径', unit: 'mm' },
      { symbol: 'D', origin: 'Diameter（直径）の頭文字', meaning: '選んだ管の内径', unit: 'mm' },
      HW_SYMBOLS.v,
      HW_SYMBOLS.C,
      HW_SYMBOLS.i,
    ],
  };
}

export const pl02Beginner: BeginnerDoc = {
  purpose: [
    '建物内の給水管の太さを決める計算です。つながる器具の数と種類から同時に流れる水量を見積もり、流速が速くなり過ぎない内径を選びます。',
    '実施設計で、給水管の各区間（枝管・立て管・主管）の管径を決める段階で使います。末端の区間から順に、上流へ器具を足しながら計算します。',
  ],
  terms: [
    { term: '器具給水負荷単位（FU）', desc: '器具の使用頻度・水量を考えた重み。同じ器具でも、不特定多数が使う「公衆用」と住宅などの「私室用」で値が違います。' },
    { term: '同時使用流量（L/min）', desc: '器具が一斉には使われないことを考えに入れた、実際に同時に流れる流量。ΣFU から線図で読み取ります。' },
    { term: '洗浄弁（フラッシュバルブ）', desc: '給水管の圧力で直接便器を洗う弁。瞬間的に大きな流量が必要なので、負荷単位が大きくなります。' },
    { term: '流速（m/s）', desc: '管内を水が進む速さ。速過ぎるとウォーターハンマー（水撃）や騒音の原因になるため、一般に 2.0 m/s 以下とします。' },
  ],
  example: {
    title: '事務所の1系統（大便器 洗浄弁 4、小便器 3、洗面器 4、事務室用流し 1、掃除流し 1）',
    steps: [
      'ΣFU = 4 × 10 + 3 × 5 + 4 × 2 + 1 × 3 + 1 × 4 = 70（負荷単位は公衆用の目安値）',
      '線図から同時使用流量 Qp = 200 L/min を読み取ったとする',
      '必要内径 Dr = √(4 × 200 ÷ 60000 ÷ (π × 2.0)) × 1000 ≒ 46.1 mm',
      '内径 50 mm の管を選ぶと v = (200 ÷ 60000) ÷ (π × 0.05² ÷ 4) ≒ 1.70 m/s ≦ 2.0 m/s なので OK',
      'C = 130 のとき単位摩擦損失 i ≒ 0.73 kPa/m',
    ],
  },
  pitfalls: [
    'ΣFU をそのまま流量（L/min）と思ってしまう。負荷単位は重みなので、必ず線図で流量に換算します。',
    '公衆用と私室用の負荷単位を混同する。事務所・学校などは公衆用、住宅は私室用を使います。',
    '内径に呼び径（50A など）を入れる。管種によって内径が違うので寸法表で確認します。',
    '洗浄弁の多い系統なのに、洗浄弁の少ない系統の曲線で流量を読むと、流量を小さく見積もります。',
  ],
};
